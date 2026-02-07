"""Google Maps Directions MCP server.

Tools: directions.route, directions.eta
"""

from __future__ import annotations

import os
from typing import Any

from mcp_servers.common.server import is_mock_mode, mock_response


async def handle_tool(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Handle directions.route and directions.eta."""
    if method == "route":
        return await _route(payload)
    elif method == "eta":
        return await _eta(payload)
    raise ValueError(f"Unknown method: directions.{method}")


async def _route(payload: dict[str, Any]) -> dict[str, Any]:
    origin = payload.get("origin", "")
    destination = payload.get("destination", "")

    if is_mock_mode():
        return mock_response({
            "origin": origin,
            "destination": destination,
            "distance_km": 5.2,
            "duration_minutes": 18,
            "steps": [
                {"instruction": "Head north on Broadway", "distance": "0.3 km"},
                {"instruction": "Turn right on W 42nd St", "distance": "1.2 km"},
                {"instruction": "Continue to destination", "distance": "3.7 km"},
            ],
        })

    # TODO: Real Google Directions API call
    import httpx

    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/directions/json",
            params={"origin": origin, "destination": destination, "key": api_key},
        )
        resp.raise_for_status()
        data = resp.json()
    route = data.get("routes", [{}])[0]
    leg = route.get("legs", [{}])[0]
    return {
        "origin": origin,
        "destination": destination,
        "distance_km": leg.get("distance", {}).get("value", 0) / 1000,
        "duration_minutes": leg.get("duration", {}).get("value", 0) // 60,
    }


async def _eta(payload: dict[str, Any]) -> dict[str, Any]:
    if is_mock_mode():
        return mock_response({
            "origin": payload.get("origin", ""),
            "destination": payload.get("destination", ""),
            "eta_minutes": 18,
        })

    # Reuse route for ETA
    result = await _route(payload)
    return {"eta_minutes": result.get("duration_minutes")}
