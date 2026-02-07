"""Plan builder — constructs micro-itineraries using Places + Directions tools."""

from __future__ import annotations

import uuid
from typing import Any

from api.schemas import Plan, PlanStep
from api.services.tool_router import call_tool


async def build_plan(user_id: str, body: dict[str, Any]) -> Plan:
    """Build a micro-itinerary from a user request.

    Uses places.search to find points of interest, then
    directions.route to estimate travel times between them.
    """
    query = body.get("query", "things to do")
    location = body.get("location", "New York")

    # Search for places
    places_result = await call_tool("places.search", {
        "query": query,
        "location": location,
    })
    places = places_result.get("places", [])

    steps: list[PlanStep] = []
    for i, place in enumerate(places[:5]):
        # Get route to next place if not the last one
        travel_minutes = None
        if i < len(places) - 1:
            try:
                route = await call_tool("directions.route", {
                    "origin": place.get("address", ""),
                    "destination": places[i + 1].get("address", ""),
                })
                travel_minutes = route.get("duration_minutes")
            except Exception:
                travel_minutes = None

        steps.append(PlanStep(
            order=i + 1,
            title=place.get("name", f"Stop {i + 1}"),
            description=place.get("description", ""),
            location=place.get("address"),
            category="activity",
            travel_minutes=travel_minutes,
        ))

    return Plan(
        id=str(uuid.uuid4()),
        title=f"Plan for {location}",
        steps=steps,
    )


async def revise_plan(user_id: str, body: dict[str, Any]) -> Plan:
    """Revise an existing plan based on user feedback.

    TODO: Implement diff-based revision. For now, rebuilds from scratch.
    """
    return await build_plan(user_id, body)
