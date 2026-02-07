"""Itinerary manager — CRUD operations for itineraries stored in Supabase.

Handles:
- Creating new itineraries from Gemini-generated JSON
- Updating steps (user edits via conversation)
- Persisting to / loading from Supabase
- Triggering agent execution on confirmation
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from api.db.supabase import get_supabase
from api.schemas.itinerary import (
    Itinerary,
    ItineraryStep,
    ItineraryStatus,
    StepStatus,
    StepType,
    STEP_TYPE_TO_AGENT,
)
from api.services.agent_dispatcher import dispatch_all_steps

logger = logging.getLogger("travel_butler.itinerary_manager")


# ── Create ────────────────────────────────────────────────────────────

async def create_itinerary(user_id: str, itinerary: Itinerary) -> Itinerary:
    """Save a new itinerary to Supabase.

    Called when Gemini generates an itinerary via the generate_itinerary tool.
    """
    sb = get_supabase()
    itinerary.user_id = user_id

    # Auto-assign agents to steps that don't have one
    for step in itinerary.steps:
        if not step.agent:
            step.agent = STEP_TYPE_TO_AGENT.get(step.type, "unknown_agent")

    # Insert the plan (itinerary header)
    plan_data = {
        "id": itinerary.id,
        "user_id": user_id,
        "title": itinerary.title,
        "destination": itinerary.destination,
        "start_date": itinerary.start_date,
        "end_date": itinerary.end_date,
        "estimated_total_usd": itinerary.estimated_total_usd,
        "status": itinerary.status.value,
    }

    try:
        sb.table("plans").insert(plan_data).execute()
    except Exception as e:
        logger.error("Failed to insert plan: %s", e)
        raise

    # Insert each step
    for step in itinerary.steps:
        step_data = {
            "id": step.id,
            "plan_id": itinerary.id,
            "user_id": user_id,
            "step_order": step.order,
            "title": step.title,
            "description": step.description or "",
            "date": step.date,
            "start_time": step.start_time,
            "end_time": step.end_time,
            "location": step.location.model_dump() if step.location else None,
            "step_type": step.type.value,
            "agent": step.agent,
            "action_payload": step.action_payload,
            "status": step.status.value,
            "estimated_price_usd": step.estimated_price_usd,
            "notes": step.notes,
            "category": _type_to_category(step.type),
        }
        try:
            sb.table("plan_steps").insert(step_data).execute()
        except Exception as e:
            logger.error("Failed to insert step '%s': %s", step.title, e)
            raise

    logger.info("Created itinerary '%s' with %d steps (est. $%.2f)",
                itinerary.title, len(itinerary.steps), itinerary.estimated_total_usd)
    return itinerary


# ── Read ──────────────────────────────────────────────────────────────

async def get_itinerary(user_id: str, itinerary_id: str) -> Itinerary | None:
    """Load an itinerary from Supabase."""
    sb = get_supabase()

    plan_result = (
        sb.table("plans")
        .select("*")
        .eq("id", itinerary_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not plan_result.data:
        return None

    plan = plan_result.data

    steps_result = (
        sb.table("plan_steps")
        .select("*")
        .eq("plan_id", itinerary_id)
        .order("step_order")
        .execute()
    )

    steps = []
    for s in steps_result.data or []:
        steps.append(ItineraryStep(
            id=s["id"],
            order=s["step_order"],
            type=s.get("step_type", "activity"),
            title=s["title"],
            description=s.get("description"),
            date=s.get("date", plan.get("start_date", "")),
            start_time=s.get("start_time"),
            end_time=s.get("end_time"),
            location=s.get("location"),
            agent=s.get("agent", ""),
            action_payload=s.get("action_payload", {}),
            estimated_price_usd=float(s.get("estimated_price_usd", 0)),
            status=s.get("status", "pending"),
            result=s.get("result"),
            notes=s.get("notes"),
        ))

    itinerary = Itinerary(
        id=plan["id"],
        user_id=plan["user_id"],
        title=plan["title"],
        destination=plan.get("destination", ""),
        start_date=plan.get("start_date", ""),
        end_date=plan.get("end_date", ""),
        status=plan.get("status", "draft"),
        steps=steps,
        estimated_total_usd=float(plan.get("estimated_total_usd", 0)),
        created_at=plan.get("created_at"),
        updated_at=plan.get("updated_at"),
    )
    itinerary.recalculate_total()
    return itinerary


async def get_user_itineraries(user_id: str) -> list[Itinerary]:
    """Get all itineraries for a user (headers only, no steps)."""
    sb = get_supabase()
    result = (
        sb.table("plans")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    itineraries = []
    for plan in result.data or []:
        itineraries.append(Itinerary(
            id=plan["id"],
            user_id=plan["user_id"],
            title=plan["title"],
            destination=plan.get("destination", ""),
            start_date=plan.get("start_date", ""),
            end_date=plan.get("end_date", ""),
            status=plan.get("status", "draft"),
            created_at=plan.get("created_at"),
            updated_at=plan.get("updated_at"),
        ))
    return itineraries


# ── Update ────────────────────────────────────────────────────────────

async def update_itinerary_step(
    user_id: str,
    itinerary_id: str,
    step_id: str,
    updates: dict[str, Any],
) -> ItineraryStep | None:
    """Update a specific step in an itinerary."""
    sb = get_supabase()

    # Map itinerary field names → DB column names
    db_updates = {}
    field_map = {
        "title": "title",
        "description": "description",
        "date": "date",
        "start_time": "start_time",
        "end_time": "end_time",
        "type": "step_type",
        "notes": "notes",
        "action_payload": "action_payload",
        "status": "status",
    }
    for key, val in updates.items():
        if key in field_map:
            db_updates[field_map[key]] = val
        elif key == "location" and isinstance(val, dict):
            db_updates["location"] = val

    if not db_updates:
        return None

    result = (
        sb.table("plan_steps")
        .update(db_updates)
        .eq("id", step_id)
        .eq("plan_id", itinerary_id)
        .execute()
    )

    if not result.data:
        return None

    # Return the full updated itinerary
    return await get_itinerary(user_id, itinerary_id)


async def add_step_to_itinerary(
    user_id: str,
    itinerary_id: str,
    step: ItineraryStep,
) -> Itinerary | None:
    """Add a new step to an existing itinerary."""
    sb = get_supabase()

    if not step.agent:
        step.agent = STEP_TYPE_TO_AGENT.get(step.type, "unknown_agent")

    step_data = {
        "id": step.id,
        "plan_id": itinerary_id,
        "user_id": user_id,
        "step_order": step.order,
        "title": step.title,
        "description": step.description or "",
        "date": step.date,
        "start_time": step.start_time,
        "end_time": step.end_time,
        "location": step.location.model_dump() if step.location else None,
        "step_type": step.type.value,
        "agent": step.agent,
        "action_payload": step.action_payload,
        "status": step.status.value,
        "notes": step.notes,
        "category": _type_to_category(step.type),
    }

    sb.table("plan_steps").insert(step_data).execute()
    return await get_itinerary(user_id, itinerary_id)


async def remove_step_from_itinerary(
    user_id: str,
    itinerary_id: str,
    step_id: str,
) -> Itinerary | None:
    """Remove a step from an itinerary."""
    sb = get_supabase()
    sb.table("plan_steps").delete().eq("id", step_id).eq("plan_id", itinerary_id).execute()
    return await get_itinerary(user_id, itinerary_id)


# ── Execute ───────────────────────────────────────────────────────────

async def execute_itinerary(user_id: str, itinerary_id: str) -> Itinerary | None:
    """Execute all pending steps in an itinerary by dispatching agents.

    Called when the user confirms/approves the itinerary.
    """
    itinerary = await get_itinerary(user_id, itinerary_id)
    if not itinerary:
        return None

    # Update status to executing
    sb = get_supabase()
    sb.table("plans").update({"status": "executing"}).eq("id", itinerary_id).execute()
    itinerary.status = ItineraryStatus.EXECUTING

    # Dispatch all pending steps to agents
    logger.info("Executing itinerary '%s' — %d steps", itinerary.title, len(itinerary.steps))
    updated_steps = await dispatch_all_steps(itinerary.steps)

    # Persist step results back to DB
    for step in updated_steps:
        sb.table("plan_steps").update({
            "status": step.status.value,
            "result": step.result,
        }).eq("id", step.id).execute()

    itinerary.steps = updated_steps

    # Check if all steps are resolved
    all_resolved = all(
        s.status in (StepStatus.BOOKED, StepStatus.FOUND, StepStatus.SKIPPED, StepStatus.FAILED)
        for s in updated_steps
    )
    if all_resolved:
        sb.table("plans").update({"status": "completed"}).eq("id", itinerary_id).execute()
        itinerary.status = ItineraryStatus.COMPLETED

    return itinerary


# ── Helpers ───────────────────────────────────────────────────────────

def _type_to_category(step_type: StepType) -> str:
    """Map step type to the legacy category column."""
    mapping = {
        StepType.FLIGHT: "flight",
        StepType.HOTEL: "hotel",
        StepType.RESTAURANT: "dining",
        StepType.ACTIVITY: "activity",
        StepType.TRANSPORT: "transit",
        StepType.CALENDAR_EVENT: "activity",
        StepType.UBER: "transit",
        StepType.UBER_EATS: "dining",
    }
    return mapping.get(step_type, "activity")
