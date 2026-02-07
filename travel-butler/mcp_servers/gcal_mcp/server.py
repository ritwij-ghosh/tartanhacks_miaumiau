"""Google Calendar MCP server.

Tools: gcal.batch_create

Mock mode: returns fake event IDs.
Real mode: creates real events in the user's Google Calendar via OAuth tokens.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

from mcp_servers.common.server import is_mock_mode, mock_response, real_response

logger = logging.getLogger("mcp_server.gcal")

GCAL_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"


async def handle_tool(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Handle gcal.batch_create."""
    if method == "batch_create":
        return await _batch_create(payload)
    raise ValueError(f"Unknown method: gcal.{method}")


async def _batch_create(payload: dict[str, Any]) -> dict[str, Any]:
    """Create calendar events for a user.

    Payload:
        user_id: str — needed to look up the user's Google OAuth tokens
        events: list[dict] — each with summary, start, end, description, location
    """
    events = payload.get("events", [])

    if is_mock_mode():
        created_ids = [f"evt_mock_{i:03d}" for i in range(len(events))]
        return mock_response({
            "created": len(events),
            "event_ids": created_ids,
            "failed": [],
        })

    # ── Real mode — call Google Calendar API ──────────────────────────
    user_id = payload.get("user_id", "")
    if not user_id:
        return {"error": "user_id required for real gcal calls", "created": 0, "failed": events}

    # Import here to avoid circular imports at module level (this MCP server
    # lives outside the FastAPI package but needs the OAuth helper at runtime).
    from api.routes.oauth import get_google_access_token

    access_token = await get_google_access_token(user_id)
    if not access_token:
        logger.warning("No Google OAuth token for user %s — calendar not connected", user_id)
        return {
            "error": "Google Calendar not connected. User must connect via /oauth/google/start first.",
            "created": 0,
            "failed": events,
        }

    created_ids: list[str] = []
    failed: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=15) as client:
        for event in events:
            body = _build_gcal_event(event)
            try:
                resp = await client.post(
                    GCAL_EVENTS_URL,
                    json=body,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                resp.raise_for_status()
                event_id = resp.json().get("id", "unknown")
                created_ids.append(event_id)
                logger.info("Created gcal event '%s' → %s", event.get("summary"), event_id)
            except httpx.HTTPStatusError as exc:
                logger.error(
                    "Google Calendar API error for '%s': %s %s",
                    event.get("summary"), exc.response.status_code, exc.response.text[:200],
                )
                failed.append({**event, "error": f"HTTP {exc.response.status_code}"})
            except Exception as exc:
                logger.error("Failed to create event '%s': %s", event.get("summary"), exc)
                failed.append({**event, "error": str(exc)})

    return real_response({
        "created": len(created_ids),
        "event_ids": created_ids,
        "failed": failed,
    })


def _build_gcal_event(event: dict[str, Any]) -> dict[str, Any]:
    """Convert our internal event dict to the Google Calendar API format."""
    start_dt = event.get("start", "")
    end_dt = event.get("end", "")
    tz = event.get("timezone", "America/New_York")

    gcal_event: dict[str, Any] = {
        "summary": event.get("summary", "Travel Butler Event"),
        "description": event.get("description", ""),
    }

    # Google Calendar expects either dateTime or date
    if "T" in start_dt:
        gcal_event["start"] = {"dateTime": start_dt, "timeZone": tz}
        gcal_event["end"] = {"dateTime": end_dt, "timeZone": tz}
    else:
        gcal_event["start"] = {"date": start_dt}
        gcal_event["end"] = {"date": end_dt}

    if event.get("location"):
        gcal_event["location"] = event["location"]

    return gcal_event
