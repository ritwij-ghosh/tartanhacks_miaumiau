"""Duffel Flights MCP server.

Tools: flight.search_offers, flight.book_order
"""

from __future__ import annotations

import os
from typing import Any

from mcp_servers.common.server import is_mock_mode, mock_response

MOCK_OFFERS = [
    {
        "offer_id": "off_mock_001",
        "airline": "United",
        "flight_number": "UA 234",
        "origin": "SFO",
        "destination": "JFK",
        "departure": "2026-01-15T08:00:00",
        "arrival": "2026-01-15T16:30:00",
        "price": 342.00,
        "currency": "USD",
        "cabin_class": "economy",
    },
    {
        "offer_id": "off_mock_002",
        "airline": "Delta",
        "flight_number": "DL 505",
        "origin": "SFO",
        "destination": "JFK",
        "departure": "2026-01-15T10:15:00",
        "arrival": "2026-01-15T18:45:00",
        "price": 289.00,
        "currency": "USD",
        "cabin_class": "economy",
    },
    {
        "offer_id": "off_mock_003",
        "airline": "JetBlue",
        "flight_number": "B6 816",
        "origin": "SFO",
        "destination": "JFK",
        "departure": "2026-01-15T14:00:00",
        "arrival": "2026-01-15T22:20:00",
        "price": 265.00,
        "currency": "USD",
        "cabin_class": "economy",
    },
]


async def handle_tool(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Handle flight.search_offers and flight.book_order."""
    if method == "search_offers":
        return await _search_offers(payload)
    elif method == "book_order":
        return await _book_order(payload)
    raise ValueError(f"Unknown method: flight.{method}")


async def _search_offers(payload: dict[str, Any]) -> dict[str, Any]:
    if is_mock_mode():
        return mock_response({"offers": MOCK_OFFERS})

    # TODO: Real Duffel API call
    import httpx

    token = os.getenv("DUFFEL_API_TOKEN", "")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.duffel.com/air/offer_requests",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Duffel-Version": "v2",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def _book_order(payload: dict[str, Any]) -> dict[str, Any]:
    offer_id = payload.get("offer_id", "off_mock_001")

    if is_mock_mode():
        return mock_response({
            "order_id": "ord_mock_001",
            "confirmation_id": "TB-FLT-1234",
            "offer_id": offer_id,
            "status": "confirmed",
            "booking_reference": "ABC123",
        })

    # TODO: Real Duffel order creation
    import httpx

    token = os.getenv("DUFFEL_API_TOKEN", "")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.duffel.com/air/orders",
            json={"data": {"type": "instant", "selected_offers": [offer_id]}},
            headers={
                "Authorization": f"Bearer {token}",
                "Duffel-Version": "v2",
            },
        )
        resp.raise_for_status()
        return resp.json()
