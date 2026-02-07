"""Booking.com Demand API MCP server (adapter + mock mode).

Tools: hotel.search, hotel.book
"""

from __future__ import annotations

import os
from typing import Any

from mcp_servers.common.server import is_mock_mode, mock_response

MOCK_HOTELS = [
    {
        "hotel_id": "htl_mock_001",
        "name": "The Standard, High Line",
        "location": "New York, NY",
        "price_per_night": 171.00,
        "currency": "USD",
        "rating": 4.4,
        "stars": 4,
        "amenities": ["WiFi", "Gym", "Restaurant", "Bar"],
    },
    {
        "hotel_id": "htl_mock_002",
        "name": "Pod 51",
        "location": "New York, NY",
        "price_per_night": 99.00,
        "currency": "USD",
        "rating": 4.1,
        "stars": 3,
        "amenities": ["WiFi", "Rooftop"],
    },
    {
        "hotel_id": "htl_mock_003",
        "name": "The NoMad Hotel",
        "location": "New York, NY",
        "price_per_night": 245.00,
        "currency": "USD",
        "rating": 4.6,
        "stars": 5,
        "amenities": ["WiFi", "Spa", "Restaurant", "Bar", "Gym"],
    },
]


async def handle_tool(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Handle hotel.search and hotel.book."""
    if method == "search":
        return await _search(payload)
    elif method == "book":
        return await _book(payload)
    raise ValueError(f"Unknown method: hotel.{method}")


async def _search(payload: dict[str, Any]) -> dict[str, Any]:
    if is_mock_mode():
        return mock_response({"hotels": MOCK_HOTELS})

    # TODO: Real Booking.com Demand API call
    import httpx

    api_key = os.getenv("BOOKINGCOM_API_KEY", "")
    affiliate_id = os.getenv("BOOKINGCOM_AFFILIATE_ID", "")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demandapi.booking.com/3.1/accommodations/search",
            params={
                "city": payload.get("city", "New York"),
                "checkin": payload.get("checkin", "2026-01-15"),
                "checkout": payload.get("checkout", "2026-01-17"),
                "guest_qty": payload.get("guests", 1),
            },
            headers={
                "X-Affiliate-Id": affiliate_id,
                "Authorization": f"Bearer {api_key}",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def _book(payload: dict[str, Any]) -> dict[str, Any]:
    hotel_id = payload.get("hotel_id", "htl_mock_001")

    if is_mock_mode():
        return mock_response({
            "booking_id": "bkg_mock_001",
            "confirmation_id": "TB-HTL-5678",
            "hotel_id": hotel_id,
            "status": "confirmed",
            "total_price": 342.00,
            "currency": "USD",
        })

    # TODO: Real Booking.com booking API call
    import httpx

    api_key = os.getenv("BOOKINGCOM_API_KEY", "")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://demandapi.booking.com/3.1/orders",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()
