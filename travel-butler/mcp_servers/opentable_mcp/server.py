"""OpenTable Reservations MCP server (adapter + mock mode).

Tools: dining.search, dining.reserve
"""

from __future__ import annotations

import os
from typing import Any

from mcp_servers.common.server import is_mock_mode, mock_response

MOCK_RESTAURANTS = [
    {
        "restaurant_id": "rst_mock_001",
        "name": "Le Bernardin",
        "cuisine": "French Seafood",
        "location": "155 W 51st St, New York, NY",
        "rating": 4.8,
        "price_range": "$$$$",
        "available_times": ["18:00", "19:30", "21:00"],
    },
    {
        "restaurant_id": "rst_mock_002",
        "name": "Peter Luger Steak House",
        "cuisine": "Steakhouse",
        "location": "178 Broadway, Brooklyn, NY",
        "rating": 4.5,
        "price_range": "$$$$",
        "available_times": ["17:30", "19:00", "20:30"],
    },
    {
        "restaurant_id": "rst_mock_003",
        "name": "Momofuku Noodle Bar",
        "cuisine": "Asian Fusion",
        "location": "171 1st Ave, New York, NY",
        "rating": 4.3,
        "price_range": "$$",
        "available_times": ["18:30", "19:00", "20:00", "21:00"],
    },
]


async def handle_tool(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Handle dining.search and dining.reserve."""
    if method == "search":
        return await _search(payload)
    elif method == "reserve":
        return await _reserve(payload)
    raise ValueError(f"Unknown method: dining.{method}")


async def _search(payload: dict[str, Any]) -> dict[str, Any]:
    if is_mock_mode():
        return mock_response({"restaurants": MOCK_RESTAURANTS})

    # TODO: Real OpenTable API call
    import httpx

    api_key = os.getenv("OPENTABLE_API_KEY", "")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://platform.opentable.com/v1/restaurants",
            params={
                "city": payload.get("city", "New York"),
                "date": payload.get("date", "2026-01-15"),
                "time": payload.get("time", "19:00"),
                "party_size": payload.get("guests", 2),
            },
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()


async def _reserve(payload: dict[str, Any]) -> dict[str, Any]:
    restaurant_id = payload.get("restaurant_id", "rst_mock_001")

    if is_mock_mode():
        return mock_response({
            "reservation_id": "res_mock_001",
            "confirmation_id": "TB-DIN-9012",
            "restaurant_id": restaurant_id,
            "status": "confirmed",
            "time": payload.get("time", "19:30"),
            "party_size": payload.get("guests", 2),
        })

    # TODO: Real OpenTable reservation API call
    import httpx

    api_key = os.getenv("OPENTABLE_API_KEY", "")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://platform.opentable.com/v1/reservations",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()
