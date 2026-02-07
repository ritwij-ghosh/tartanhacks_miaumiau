"""Booking engine — executes booking steps through tool_router with confirmation gate."""

from __future__ import annotations

import uuid
import logging
from typing import Any
from datetime import datetime

from api.schemas import (
    BookingStep,
    BookingConfirmation,
    BookingApproval,
    BookingStatus,
)
from api.services.tool_router import call_tool

logger = logging.getLogger("travel_butler.booking")

# In-memory store for demo (replace with Supabase in production)
_bookings: dict[str, BookingStep] = {}
_confirmations: dict[str, BookingConfirmation] = {}


async def create_steps(user_id: str, body: dict[str, Any]) -> list[BookingStep]:
    """Create booking steps from a plan. Returns steps awaiting approval."""
    booking_type = body.get("type", "hotel")
    payload = body.get("payload", {})

    tool_map = {
        "flight": "flight.book_order",
        "hotel": "hotel.book",
        "dining": "dining.reserve",
    }
    tool_name = tool_map.get(booking_type, "hotel.book")

    step = BookingStep(
        id=str(uuid.uuid4()),
        tool_name=tool_name,
        payload=payload,
        status=BookingStatus.AWAITING_APPROVAL,
    )
    _bookings[step.id] = step

    _confirmations[step.id] = BookingConfirmation(
        booking_id=step.id,
        status=BookingStatus.AWAITING_APPROVAL,
    )

    logger.info("Booking step %s created for user %s — awaiting approval", step.id, user_id)
    return [step]


async def approve_booking(user_id: str, approval: BookingApproval) -> BookingConfirmation:
    """Approve or reject a booking, then execute if approved."""
    step = _bookings.get(approval.booking_id)
    if not step:
        return BookingConfirmation(
            booking_id=approval.booking_id,
            status=BookingStatus.FAILED,
            details={"error": "Booking step not found"},
        )

    if not approval.approved:
        step.status = BookingStatus.CANCELLED
        conf = _confirmations[step.id]
        conf.status = BookingStatus.CANCELLED
        return conf

    # Execute the booking through tool_router
    try:
        result = await call_tool(step.tool_name, step.payload)
        step.status = BookingStatus.CONFIRMED
        step.result = result

        conf = _confirmations[step.id]
        conf.status = BookingStatus.CONFIRMED
        conf.provider_ref = result.get("confirmation_id", "MOCK-REF")
        conf.details = result
        conf.confirmed_at = datetime.utcnow()

        logger.info("Booking %s confirmed for user %s", step.id, user_id)
        return conf

    except Exception as exc:
        step.status = BookingStatus.FAILED
        step.error = str(exc)
        conf = _confirmations[step.id]
        conf.status = BookingStatus.FAILED
        conf.details = {"error": str(exc)}
        logger.error("Booking %s failed: %s", step.id, exc)
        return conf


async def get_status(user_id: str, booking_id: str) -> BookingConfirmation:
    """Get current status of a booking."""
    conf = _confirmations.get(booking_id)
    if not conf:
        return BookingConfirmation(
            booking_id=booking_id,
            status=BookingStatus.FAILED,
            details={"error": "Booking not found"},
        )
    return conf
