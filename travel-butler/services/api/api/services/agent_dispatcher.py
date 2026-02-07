"""Agent dispatcher — routes each itinerary step to the appropriate MCP tool.

Each step type maps to an agent, and each agent knows which MCP tool(s) to call.
The dispatcher handles the search → result → book flow for each step.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from api.schemas.itinerary import (
    ItineraryStep,
    StepType,
    StepStatus,
    AGENT_TOOLS,
    STEP_TYPE_TO_AGENT,
)
from api.services.tool_router import call_tool

logger = logging.getLogger("travel_butler.agent_dispatcher")


async def dispatch_step(step: ItineraryStep) -> ItineraryStep:
    """Execute a single itinerary step by calling the appropriate MCP tool.

    1. Determines the right agent and tool
    2. Builds the payload
    3. Calls the MCP tool
    4. Updates the step with results

    Returns:
        Updated step with status and result.
    """
    agent = step.agent or STEP_TYPE_TO_AGENT.get(step.type, "")
    tools = AGENT_TOOLS.get(agent, [])

    if not tools:
        logger.warning("No MCP tools registered for agent %s (step: %s)", agent, step.title)
        step.status = StepStatus.SKIPPED
        step.result = {"message": f"Agent '{agent}' has no tools configured yet."}
        return step

    step.status = StepStatus.SEARCHING
    logger.info("Dispatching step '%s' → agent=%s", step.title, agent)

    try:
        # Pick the right tool and build payload based on step type
        tool_name, payload = _build_tool_call(step)
        start = time.time()
        result = await call_tool(tool_name, payload)
        latency_ms = int((time.time() - start) * 1000)

        step.status = StepStatus.FOUND
        step.result = {
            "tool": tool_name,
            "data": result,
            "latency_ms": latency_ms,
        }
        logger.info("Step '%s' completed — tool=%s, latency=%dms", step.title, tool_name, latency_ms)

    except Exception as exc:
        step.status = StepStatus.FAILED
        step.result = {"error": str(exc)}
        logger.error("Step '%s' failed: %s", step.title, exc)

    return step


async def dispatch_all_steps(steps: list[ItineraryStep]) -> list[ItineraryStep]:
    """Execute all itinerary steps sequentially.

    Sequential because some steps may depend on results of earlier ones
    (e.g., hotel location affects restaurant search).
    """
    results = []
    for step in steps:
        if step.status in (StepStatus.BOOKED, StepStatus.SKIPPED):
            results.append(step)
            continue
        updated = await dispatch_step(step)
        results.append(updated)
    return results


def _build_tool_call(step: ItineraryStep) -> tuple[str, dict[str, Any]]:
    """Build the MCP tool name and payload for a given step.

    Uses step.action_payload if provided, otherwise constructs
    a reasonable default from step metadata.
    """
    # If the step already has a custom action_payload, use it
    if step.action_payload:
        # Determine the search tool for this step type
        tool_name = _get_search_tool(step.type)
        return tool_name, step.action_payload

    # Otherwise, build payload from step fields
    match step.type:
        case StepType.FLIGHT:
            return "flight.search_offers", {
                "origin": step.action_payload.get("origin", ""),
                "destination": step.action_payload.get("destination", ""),
                "departure_date": step.date,
                "passengers": step.action_payload.get("passengers", 1),
            }

        case StepType.HOTEL:
            location_name = step.location.name if step.location else ""
            return "hotel.search", {
                "location": location_name,
                "check_in": step.action_payload.get("check_in", step.date),
                "check_out": step.action_payload.get("check_out", step.date),
                "guests": step.action_payload.get("guests", 1),
            }

        case StepType.RESTAURANT:
            location_name = step.location.name if step.location else ""
            return "dining.search", {
                "location": location_name,
                "cuisine": step.action_payload.get("cuisine", ""),
                "party_size": step.action_payload.get("party_size", 1),
                "date_time": f"{step.date}T{step.start_time or '19:00'}",
            }

        case StepType.ACTIVITY:
            location_name = step.location.name if step.location else ""
            return "places.search", {
                "query": step.title,
                "location": location_name,
            }

        case StepType.TRANSPORT:
            return "directions.route", {
                "origin": step.action_payload.get("origin", ""),
                "destination": step.action_payload.get("destination", ""),
                "mode": step.action_payload.get("mode", "driving"),
            }

        case StepType.CALENDAR_EVENT:
            return "gcal.batch_create", {
                "events": [{
                    "summary": step.title,
                    "description": step.description or "",
                    "start": f"{step.date}T{step.start_time or '09:00'}:00",
                    "end": f"{step.date}T{step.end_time or '10:00'}:00",
                    "location": step.location.address if step.location else "",
                }],
            }

        case _:
            raise ValueError(f"No tool mapping for step type: {step.type}")


def _get_search_tool(step_type: StepType) -> str:
    """Get the primary search tool for a step type."""
    tool_map = {
        StepType.FLIGHT: "flight.search_offers",
        StepType.HOTEL: "hotel.search",
        StepType.RESTAURANT: "dining.search",
        StepType.ACTIVITY: "places.search",
        StepType.TRANSPORT: "directions.route",
        StepType.CALENDAR_EVENT: "gcal.batch_create",
    }
    tool = tool_map.get(step_type)
    if not tool:
        raise ValueError(f"No search tool for step type: {step_type}")
    return tool
