"""Tool router — dispatches tool calls to local MCP servers (dev) or Dedalus (prod)."""

from __future__ import annotations

import time
import hashlib
import json
import logging
from typing import Any

import httpx

from api.config import settings
from api.schemas import ToolTraceEvent, ToolStatus
from api.logging_util import log_tool_call

logger = logging.getLogger("travel_butler.tool_router")

# ── Local MCP server registry (dev mode) ────────────────────────────
# Maps tool prefix → local server module path
LOCAL_MCP_REGISTRY: dict[str, str] = {
    "places": "mcp_servers.places_mcp.server",
    "directions": "mcp_servers.maps_mcp.server",
    "flight": "mcp_servers.duffel_mcp.server",
    "hotel": "mcp_servers.bookingcom_mcp.server",
    "dining": "mcp_servers.opentable_mcp.server",
    "gcal": "mcp_servers.gcal_mcp.server",
    "notion": "mcp_servers.notion_mcp.server",
    "wallet": "mcp_servers.wallet_mcp.server",
}


async def call_tool(tool_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Route a tool call and return the result.

    Args:
        tool_name: Dotted tool name, e.g. "places.search"
        payload: Tool-specific arguments

    Returns:
        Tool result dict
    """
    start = time.time()
    payload_hash = hashlib.md5(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:12]
    trace = ToolTraceEvent(tool=tool_name, status=ToolStatus.PENDING, payload_hash=payload_hash)

    try:
        if settings.mcp_mode == "mock" or settings.dedalus_url is None:
            result = await _call_local(tool_name, payload)
        else:
            result = await _call_dedalus(tool_name, payload)

        latency = (time.time() - start) * 1000
        trace.status = ToolStatus.OK
        trace.latency_ms = round(latency, 1)
        log_tool_call(trace)
        return result

    except Exception as exc:
        latency = (time.time() - start) * 1000
        trace.status = ToolStatus.ERROR
        trace.latency_ms = round(latency, 1)
        trace.error = str(exc)
        log_tool_call(trace)
        raise


async def _call_local(tool_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Import and call a local MCP server function."""
    import importlib

    prefix = tool_name.split(".")[0]
    method = tool_name.split(".", 1)[1] if "." in tool_name else tool_name
    module_path = LOCAL_MCP_REGISTRY.get(prefix)

    if not module_path:
        raise ValueError(f"Unknown tool prefix: {prefix}")

    module = importlib.import_module(module_path)
    handler = getattr(module, "handle_tool", None)
    if handler is None:
        raise ValueError(f"MCP server {module_path} has no handle_tool function")

    return await handler(method, payload)


async def _call_dedalus(tool_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Forward tool call to hosted Dedalus MCP gateway."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.dedalus_url}/tools/{tool_name}",
            json=payload,
            headers={"Authorization": f"Bearer {settings.dedalus_api_key}"},
        )
        resp.raise_for_status()
        return resp.json()
