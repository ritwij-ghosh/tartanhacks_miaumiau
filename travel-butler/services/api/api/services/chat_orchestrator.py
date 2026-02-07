"""Chat orchestrator — takes user message, calls tools, returns response."""

from __future__ import annotations

import uuid
import logging
from typing import Any

from api.schemas import (
    ChatRequest,
    ChatResponse,
    Intent,
    IntentType,
    ToolTraceEvent,
)
from api.services.tool_router import call_tool

logger = logging.getLogger("travel_butler.chat")

# Simple keyword-based intent detection (replace with LLM in production)
INTENT_KEYWORDS: dict[str, IntentType] = {
    "flight": IntentType.FLIGHT,
    "fly": IntentType.FLIGHT,
    "hotel": IntentType.HOTEL,
    "stay": IntentType.HOTEL,
    "dinner": IntentType.DINING,
    "restaurant": IntentType.DINING,
    "lunch": IntentType.DINING,
    "itinerary": IntentType.ITINERARY,
    "plan": IntentType.ITINERARY,
    "layover": IntentType.ITINERARY,
    "export": IntentType.EXPORT,
    "calendar": IntentType.EXPORT,
    "notion": IntentType.EXPORT,
}


def _detect_intent(message: str) -> Intent:
    """Simple keyword-based intent detection. TODO: replace with LLM."""
    lower = message.lower()
    for keyword, intent_type in INTENT_KEYWORDS.items():
        if keyword in lower:
            return Intent(type=intent_type, confidence=0.7, entities={"raw": message})
    return Intent(type=IntentType.GENERAL, confidence=0.5)


async def orchestrate_chat(user_id: str, req: ChatRequest) -> ChatResponse:
    """Process a user message, call relevant tools, and build a response."""
    conversation_id = req.conversation_id or str(uuid.uuid4())
    intent = _detect_intent(req.message)
    traces: list[ToolTraceEvent] = []
    reply_parts: list[str] = []

    try:
        if intent.type == IntentType.FLIGHT:
            result = await call_tool("flight.search_offers", {
                "query": req.message,
                "user_id": user_id,
            })
            reply_parts.append(
                f"I found {len(result.get('offers', []))} flight options for you. "
                "Here are the top picks:"
            )
            for offer in result.get("offers", [])[:3]:
                reply_parts.append(
                    f"  ✈️ {offer['airline']} {offer['flight_number']} — ${offer['price']}"
                )

        elif intent.type == IntentType.HOTEL:
            result = await call_tool("hotel.search", {
                "query": req.message,
                "user_id": user_id,
            })
            reply_parts.append(
                f"I found {len(result.get('hotels', []))} hotels. Top options:"
            )
            for h in result.get("hotels", [])[:3]:
                reply_parts.append(f"  🏨 {h['name']} — ${h['price_per_night']}/night")

        elif intent.type == IntentType.DINING:
            result = await call_tool("dining.search", {
                "query": req.message,
                "user_id": user_id,
            })
            reply_parts.append("Here are some restaurant options:")
            for r in result.get("restaurants", [])[:3]:
                reply_parts.append(f"  🍽 {r['name']} — {r['cuisine']}")

        elif intent.type == IntentType.ITINERARY:
            result = await call_tool("places.search", {
                "query": req.message,
                "user_id": user_id,
            })
            reply_parts.append(
                "I'll put together a micro-itinerary for you. Here are some spots I found:"
            )
            for p in result.get("places", [])[:3]:
                reply_parts.append(f"  📍 {p['name']} — {p.get('vicinity', '')}")

        elif intent.type == IntentType.EXPORT:
            reply_parts.append(
                "I can export your trip! Use the Export tabs to send to Google Calendar or Notion."
            )

        else:
            reply_parts.append(
                "I'm your Travel Butler! I can help with:\n"
                "  ✈️ Flights — search & book\n"
                "  🏨 Hotels — find the best stays\n"
                "  🍽 Dining — restaurant reservations\n"
                "  🗓 Itineraries — layover & trip plans\n"
                "  📤 Exports — Google Calendar & Notion\n\n"
                "Just tell me what you need!"
            )

    except Exception as exc:
        logger.error("Tool call failed: %s", exc)
        reply_parts.append(
            "I ran into a hiccup fetching that info. Let me try a different approach — "
            "could you give me a bit more detail?"
        )

    return ChatResponse(
        reply="\n".join(reply_parts),
        conversation_id=conversation_id,
        intent=intent,
        tool_trace=traces,
    )
