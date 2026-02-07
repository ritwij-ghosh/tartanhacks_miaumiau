"""Tool router — dispatches tool calls to local MCP servers (dev) or Dedalus (prod).

Routing logic:
  - MCP_MODE=mock  → always call local MCP stubs (no network)
  - MCP_MODE=real + DEDALUS_URL set → forward to Dedalus gateway via HTTP
  - MCP_MODE=real + no DEDALUS_URL  → call local MCP servers directly (real mode)
"""

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
        # Decide routing: Dedalus (HTTP) vs local (in-process)
        use_dedalus = (
            settings.mcp_mode != "mock"
            and settings.dedalus_url is not None
            and settings.dedalus_url != ""
        )

        if use_dedalus:
            result = await _call_dedalus(tool_name, payload)
        else:
            result = await _call_local(tool_name, payload)

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
    """Forward tool call to Dedalus MCP gateway via HTTP.

    The Dedalus gateway returns { "tool": "...", "result": {...}, "latency_ms": ... }.
    We unwrap and return just the inner result.
    """
    logger.debug("Routing %s through Dedalus at %s", tool_name, settings.dedalus_url)

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.dedalus_api_key:
        headers["Authorization"] = f"Bearer {settings.dedalus_api_key}"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.dedalus_url}/tools/{tool_name}",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

    # Dedalus wraps result — unwrap if present
    if "result" in data:
        return data["result"]
    return data
