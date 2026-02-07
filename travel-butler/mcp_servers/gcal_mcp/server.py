"""Google Calendar MCP server.

Tools: gcal.batch_create
"""

from __future__ import annotations

import os
from typing import Any

from mcp_servers.common.server import is_mock_mode, mock_response


async def handle_tool(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Handle gcal.batch_create."""
    if method == "batch_create":
        return await _batch_create(payload)
    raise ValueError(f"Unknown method: gcal.{method}")


async def _batch_create(payload: dict[str, Any]) -> dict[str, Any]:
    events = payload.get("events", [])

    if is_mock_mode():
        # Simulate all events created successfully
        created_ids = [f"evt_mock_{i:03d}" for i in range(len(events))]
        return mock_response({
            "created": len(events),
            "event_ids": created_ids,
            "failed": [],
        })

    # TODO: Real Google Calendar API call using OAuth tokens
    # 1. Retrieve user's refresh token from Supabase
    # 2. Exchange for access token
    # 3. Batch insert events via Google Calendar API
    import httpx

    user_id = payload.get("user_id", "")
    # TODO: Get access token for user from stored OAuth tokens
    access_token = ""  # noqa: S105

    created = 0
    failed = []
    async with httpx.AsyncClient() as client:
        for event in events:
            try:
                resp = await client.post(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    json={
                        "summary": event.get("summary", ""),
                        "start": {"dateTime": event.get("start")},
                        "end": {"dateTime": event.get("end")},
                        "description": event.get("description", ""),
                    },
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                resp.raise_for_status()
                created += 1
            except Exception:
                failed.append(event)

    return {"created": created, "failed": failed}
