"""Google Places MCP server.

Tools: places.search, places.details
"""

from __future__ import annotations

import os
from typing import Any

from mcp_servers.common.server import is_mock_mode, mock_response

MOCK_PLACES = [
    {
        "place_id": "ChIJN1t_tDeuEmsR",
        "name": "Central Park",
        "vicinity": "New York, NY",
        "address": "Central Park, New York, NY 10024",
        "rating": 4.8,
        "description": "Iconic 843-acre urban park with walking paths, lakes, and cultural attractions.",
    },
    {
        "place_id": "ChIJPTacEpBQwokR",
        "name": "Times Square",
        "vicinity": "Manhattan, NY",
        "address": "Times Square, Manhattan, NY 10036",
        "rating": 4.5,
        "description": "World-famous commercial intersection and entertainment center.",
    },
    {
        "place_id": "ChIJYXBiL0VYwokR",
        "name": "The High Line",
        "vicinity": "New York, NY",
        "address": "The High Line, New York, NY 10011",
        "rating": 4.7,
        "description": "Elevated linear park on a historic freight rail line.",
    },
]

MOCK_DETAILS = {
    "ChIJN1t_tDeuEmsR": {
        "name": "Central Park",
        "formatted_address": "Central Park, New York, NY 10024",
        "phone": "+1 212-310-6600",
        "website": "https://www.centralparknyc.org",
        "opening_hours": "6:00 AM – 1:00 AM",
        "rating": 4.8,
        "reviews_count": 120000,
    },
}


async def handle_tool(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Handle places.search and places.details."""
    if method == "search":
        return await _search(payload)
    elif method == "details":
        return await _details(payload)
    raise ValueError(f"Unknown method: places.{method}")


async def _search(payload: dict[str, Any]) -> dict[str, Any]:
    if is_mock_mode():
        return mock_response({"places": MOCK_PLACES})

    # TODO: Real Google Places API call
    import httpx

    api_key = os.getenv("GOOGLE_PLACES_API_KEY", "")
    query = payload.get("query", "")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            params={"query": query, "key": api_key},
        )
        resp.raise_for_status()
        data = resp.json()
    return {"places": data.get("results", [])}


async def _details(payload: dict[str, Any]) -> dict[str, Any]:
    place_id = payload.get("place_id", "")
    if is_mock_mode():
        details = MOCK_DETAILS.get(place_id, {"name": "Unknown Place"})
        return mock_response({"details": details})

    # TODO: Real Google Places Details API call
    import httpx

    api_key = os.getenv("GOOGLE_PLACES_API_KEY", "")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={"place_id": place_id, "key": api_key},
        )
        resp.raise_for_status()
        data = resp.json()
    return {"details": data.get("result", {})}
