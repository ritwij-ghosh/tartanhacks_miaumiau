"""Google Calendar export — creates events via gcal MCP tool with retry support."""

from __future__ import annotations

import logging
from typing import Any

from api.services.tool_router import call_tool

logger = logging.getLogger("travel_butler.export_calendar")

MAX_RETRIES = 2


async def export_to_gcal(user_id: str, trip_id: str) -> int:
    """Export trip events to Google Calendar.

    Uses gcal.batch_create tool. Supports partial success and retries.
    Returns the number of successfully created events.
    """
    # TODO: Fetch actual plan steps from Supabase by trip_id
    # For now, use mock events
    events = [
        {
            "summary": "Flight: SFO → JFK",
            "start": "2026-01-15T08:00:00-08:00",
            "end": "2026-01-15T16:30:00-05:00",
            "description": "United UA 234 · Terminal 3 Gate B22",
        },
        {
            "summary": "Hotel Check-in: The Standard",
            "start": "2026-01-15T18:00:00-05:00",
            "end": "2026-01-15T19:00:00-05:00",
            "description": "The Standard, High Line · NYC",
        },
        {
            "summary": "Dinner: Le Bernardin",
            "start": "2026-01-15T19:30:00-05:00",
            "end": "2026-01-15T21:00:00-05:00",
            "description": "2 guests · Confirmation #TB-1234",
        },
    ]

    created_count = 0
    failed_events: list[dict[str, Any]] = []

    # First pass
    result = await call_tool("gcal.batch_create", {
        "user_id": user_id,
        "events": events,
    })
    created_count += result.get("created", 0)
    failed_events = result.get("failed", [])

    # Retry failed events
    for attempt in range(MAX_RETRIES):
        if not failed_events:
            break
        logger.info(
            "Retrying %d failed calendar events (attempt %d/%d)",
            len(failed_events),
            attempt + 1,
            MAX_RETRIES,
        )
        retry_result = await call_tool("gcal.batch_create", {
            "user_id": user_id,
            "events": failed_events,
        })
        created_count += retry_result.get("created", 0)
        failed_events = retry_result.get("failed", [])

    if failed_events:
        logger.warning(
            "%d events failed to export after %d retries",
            len(failed_events),
            MAX_RETRIES,
        )

    return created_count
