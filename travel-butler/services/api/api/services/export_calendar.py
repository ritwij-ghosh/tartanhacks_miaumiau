"""Google Calendar export — creates calendar events for every itinerary step.

After the user confirms an itinerary and agents are dispatched, this module
creates a Google Calendar event for each step so the user's trip is fully
reflected in their calendar. Uses the gcal MCP tool with retry support.
"""

from __future__ import annotations

import logging
from typing import Any

from api.schemas.itinerary import Itinerary, ItineraryStep, StepType
from api.services.tool_router import call_tool

logger = logging.getLogger("travel_butler.export_calendar")

MAX_RETRIES = 2

# Emoji prefixes by step type for nicer calendar event titles
_STEP_EMOJI = {
    StepType.FLIGHT: "✈️",
    StepType.HOTEL: "🏨",
    StepType.RESTAURANT: "🍽️",
    StepType.ACTIVITY: "🎯",
    StepType.TRANSPORT: "🚗",
    StepType.CALENDAR_EVENT: "📅",
    StepType.UBER: "🚕",
    StepType.UBER_EATS: "🍔",
}


def _step_to_gcal_event(step: ItineraryStep) -> dict[str, Any]:
    """Convert an itinerary step into a Google Calendar event payload."""
    emoji = _STEP_EMOJI.get(step.type, "•")
    summary = f"{emoji} {step.title}"

    description_parts = []
    if step.description:
        description_parts.append(step.description)
    description_parts.append(f"Type: {step.type.value}")
    if step.estimated_price_usd > 0:
        description_parts.append(f"Est. price: ${step.estimated_price_usd:.0f}")
    if step.agent:
        description_parts.append(f"Agent: {step.agent}")
    if step.notes:
        description_parts.append(f"Notes: {step.notes}")

    description = "\n".join(description_parts)

    # Build start/end datetime strings
    start_time = step.start_time or "09:00"
    end_time = step.end_time or "10:00"
    start = f"{step.date}T{start_time}:00"
    end = f"{step.date}T{end_time}:00"

    location = ""
    if step.location:
        location = step.location.address or step.location.name or ""

    return {
        "summary": summary,
        "description": description,
        "start": start,
        "end": end,
        "location": location,
    }


async def export_itinerary_to_gcal(user_id: str, itinerary: Itinerary) -> dict[str, Any]:
    """Create Google Calendar events for every step in the itinerary.

    Called automatically after itinerary execution completes.
    Returns a summary of created/failed events.
    """
    if not itinerary.steps:
        return {"created": 0, "failed": 0, "skipped": True}

    events = [_step_to_gcal_event(step) for step in itinerary.steps]
    logger.info(
        "Exporting %d itinerary steps to Google Calendar for user %s",
        len(events), user_id,
    )

    created_count = 0
    failed_events: list[dict[str, Any]] = []

    # First pass
    result = await call_tool("gcal.batch_create", {
        "user_id": user_id,
        "events": events,
    })

    # If user hasn't connected Google Calendar, return gracefully
    if result.get("error"):
        logger.warning("Calendar export skipped: %s", result["error"])
        return {"created": 0, "failed": len(events), "error": result["error"]}

    created_count += result.get("created", 0)
    failed_events = result.get("failed", [])

    # Retry failed events
    for attempt in range(MAX_RETRIES):
        if not failed_events:
            break
        logger.info(
            "Retrying %d failed calendar events (attempt %d/%d)",
            len(failed_events), attempt + 1, MAX_RETRIES,
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
            len(failed_events), MAX_RETRIES,
        )

    logger.info(
        "Calendar export complete: %d created, %d failed for itinerary '%s'",
        created_count, len(failed_events), itinerary.title,
    )
    return {"created": created_count, "failed": len(failed_events)}
