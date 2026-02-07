"""Dedalus MCP Gateway — lightweight HTTP server that routes tool calls to local MCP servers.

This is the local equivalent of a hosted Dedalus instance. The main API server
sends HTTP POST requests to this gateway, which dispatches to the appropriate
MCP server module and returns results.

Run:   python -m mcp_servers.dedalus_gateway          (from travel-butler/)
       uvicorn mcp_servers.dedalus_gateway:app --port 9000

Endpoints:
    POST /tools/{tool_name}  — execute a tool (e.g. /tools/gcal.batch_create)
    GET  /health             — health check
    GET  /tools              — list registered tools
"""

from __future__ import annotations

import importlib
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is on the path so MCP modules resolve
PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
# Also add services/api so the gcal MCP server can import api.routes.oauth
API_ROOT = str(Path(__file__).resolve().parent.parent / "services" / "api")
if API_ROOT not in sys.path:
    sys.path.insert(0, API_ROOT)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("dedalus_gateway")

# ── Load env ─────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ── App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Dedalus MCP Gateway",
    description="Local MCP tool routing gateway for Travel Butler",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── MCP Server Registry ─────────────────────────────────────────────
# Maps tool prefix → module path (same as tool_router.LOCAL_MCP_REGISTRY)
MCP_REGISTRY: dict[str, str] = {
    "places": "mcp_servers.places_mcp.server",
    "directions": "mcp_servers.maps_mcp.server",
    "flight": "mcp_servers.duffel_mcp.server",
    "hotel": "mcp_servers.bookingcom_mcp.server",
    "dining": "mcp_servers.opentable_mcp.server",
    "gcal": "mcp_servers.gcal_mcp.server",
    "notion": "mcp_servers.notion_mcp.server",
    "wallet": "mcp_servers.wallet_mcp.server",
}

# Known tools per prefix (for the /tools listing endpoint)
TOOL_CATALOG: dict[str, list[str]] = {
    "places": ["places.search", "places.details"],
    "directions": ["directions.route", "directions.eta"],
    "flight": ["flight.search_offers", "flight.book_order"],
    "hotel": ["hotel.search", "hotel.book"],
    "dining": ["dining.search", "dining.reserve"],
    "gcal": ["gcal.batch_create"],
    "notion": ["notion.export_page"],
    "wallet": ["wallet.generate_pkpass"],
}


# ── Routes ───────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "gateway": "dedalus",
        "mcp_mode": os.getenv("MCP_MODE", "mock"),
        "registered_prefixes": list(MCP_REGISTRY.keys()),
    }


@app.get("/tools")
async def list_tools():
    """List all registered MCP tools."""
    all_tools = []
    for prefix, tools in TOOL_CATALOG.items():
        for tool in tools:
            all_tools.append({
                "name": tool,
                "prefix": prefix,
                "module": MCP_REGISTRY.get(prefix, "unknown"),
            })
    return {"tools": all_tools, "count": len(all_tools)}


@app.post("/tools/{tool_name:path}")
async def call_tool(tool_name: str, request: Request):
    """Execute an MCP tool call.

    The tool_name is dotted, e.g. "gcal.batch_create" or "places.search".
    The request body is the JSON payload for the tool.
    """
    # Parse tool name
    if "." not in tool_name:
        raise HTTPException(status_code=400, detail=f"Invalid tool name: '{tool_name}'. Expected format: 'prefix.method'")

    prefix = tool_name.split(".")[0]
    method = tool_name.split(".", 1)[1]

    module_path = MCP_REGISTRY.get(prefix)
    if not module_path:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown tool prefix: '{prefix}'. Registered: {list(MCP_REGISTRY.keys())}",
        )

    # Parse payload
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    # Import and call the MCP server
    start = time.time()
    try:
        module = importlib.import_module(module_path)
        handler = getattr(module, "handle_tool", None)
        if handler is None:
            raise HTTPException(
                status_code=500,
                detail=f"MCP server '{module_path}' has no handle_tool function",
            )

        result = await handler(method, payload)
        latency_ms = round((time.time() - start) * 1000, 1)

        logger.info(
            "✅ %s → %s.%s (%.1fms)",
            "MOCK" if result.get("mock") else "REAL",
            prefix, method, latency_ms,
        )

        return {
            "tool": tool_name,
            "result": result,
            "latency_ms": latency_ms,
        }

    except HTTPException:
        raise
    except Exception as exc:
        latency_ms = round((time.time() - start) * 1000, 1)
        logger.error("❌ %s.%s failed (%.1fms): %s", prefix, method, latency_ms, exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ── Main ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("DEDALUS_PORT", "9000"))
    logger.info("Starting Dedalus MCP Gateway on port %d", port)
    logger.info("MCP_MODE=%s", os.getenv("MCP_MODE", "mock"))
    logger.info("Registered prefixes: %s", list(MCP_REGISTRY.keys()))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
