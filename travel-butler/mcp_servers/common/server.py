"""MCP Server base skeleton.

Each MCP server module implements:
    async def handle_tool(method: str, payload: dict) -> dict

In mock mode (default), servers return deterministic fake data.
When MCP_MODE=real, they call the actual external API.

This base module provides helpers shared across servers.
"""

from __future__ import annotations

import os
import logging
from typing import Any

logger = logging.getLogger("mcp_server")


def is_mock_mode() -> bool:
    """Check if running in mock mode (default: True)."""
    return os.getenv("MCP_MODE", "mock").lower() != "real"


def mock_response(data: dict[str, Any]) -> dict[str, Any]:
    """Wrap data in a standard mock response envelope."""
    return {"mock": True, **data}


def real_response(data: dict[str, Any]) -> dict[str, Any]:
    """Wrap data in a standard real response envelope."""
    return {"mock": False, **data}
