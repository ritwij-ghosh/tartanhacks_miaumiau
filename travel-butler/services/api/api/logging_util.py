"""Logging module — records tool latency, payload hash, success/failure."""

from __future__ import annotations

import logging
import json
from datetime import datetime

from api.schemas import ToolTraceEvent, ToolStatus

logger = logging.getLogger("travel_butler.tools")

# Configure structured logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def log_tool_call(trace: ToolTraceEvent) -> None:
    """Log a tool call trace with structured data."""
    level = logging.INFO if trace.status == ToolStatus.OK else logging.ERROR
    log_data = {
        "tool": trace.tool,
        "status": trace.status.value,
        "latency_ms": trace.latency_ms,
        "payload_hash": trace.payload_hash,
        "timestamp": trace.timestamp.isoformat(),
    }
    if trace.error:
        log_data["error"] = trace.error

    logger.log(level, "TOOL_CALL %s", json.dumps(log_data))
