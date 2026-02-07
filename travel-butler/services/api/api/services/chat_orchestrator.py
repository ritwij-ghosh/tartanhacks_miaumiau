"""Chat orchestrator — conversation system that drives itinerary generation.

Flow:
1. User describes trip → Gemini converses to gather details
2. When Gemini has enough info → calls generate_itinerary tool → structured JSON
3. User reviews and requests changes → Gemini calls update_itinerary / add_step / remove_step
4. User approves → Gemini calls execute_itinerary → agents dispatch
"""

from __future__ import annotations

import uuid
import time
import hashlib
import json
import logging
from typing import Any

from api.schemas import (
    ChatRequest,
    ChatResponse,
    Intent,
    IntentType,
    ToolTraceEvent,
    ToolStatus,
)
from api.schemas.itinerary import (
    Itinerary,
    ItineraryStep,
    ItineraryStatus,
    StepType,
    StepStatus,
    Location,
    STEP_TYPE_TO_AGENT,
)
from api.services.tool_router import call_tool
from api.services.itinerary_manager import (
    create_itinerary,
    get_itinerary,
    get_user_itineraries,
    update_itinerary_step,
    add_step_to_itinerary,
    remove_step_from_itinerary,
    execute_itinerary,
)
from api.services.gemini_service import GeminiService, Message

logger = logging.getLogger("travel_butler.chat")


class ChatOrchestrator:
    """Orchestrates conversation between user, Gemini LLM, and MCP tools."""

    def __init__(self, gemini_service: GeminiService):
        self.gemini = gemini_service
        self.system_prompt = _build_system_prompt()
        # In-memory conversation history per user (per-session; not persistent yet)
        self._conversations: dict[str, list[Message]] = {}

    async def orchestrate_chat(self, user_id: str, req: ChatRequest) -> ChatResponse:
        """Process a user message through the full Gemini → tool → response loop."""
        conversation_id = req.conversation_id or str(uuid.uuid4())
        traces: list[ToolTraceEvent] = []

        # Get or create conversation history
        history = self._conversations.setdefault(conversation_id, [])

        # Inject current itinerary context if one exists
        context_msg = await self._build_context_message(user_id)
        if context_msg and (not history or history[-1].content != context_msg):
            # Only inject context at the start or when it changes
            if not history:
                history.append(Message(role="user", content=context_msg))
                history.append(Message(role="assistant", content="Got it — I have your current itinerary context. How can I help?"))

        # Add the user message
        history.append(Message(role="user", content=req.message))

        try:
            result = await self._process_with_tools(
                conversation_id=conversation_id,
                history=history,
                user_id=user_id,
                available_tools=_get_all_tools(),
            )

            # Collect traces
            for trace in result.get("tool_traces", []):
                traces.append(ToolTraceEvent(
                    tool=trace["tool"],
                    status=ToolStatus.OK if trace.get("success", True) else ToolStatus.ERROR,
                    latency_ms=trace.get("latency_ms", 0),
                    payload_hash=trace.get("payload_hash", ""),
                ))

            reply = result["response"]

            # Add assistant reply to history
            history.append(Message(role="assistant", content=reply))

            # Extract intent
            intent = self._extract_intent(result.get("tool_traces", []))

            return ChatResponse(
                reply=reply,
                conversation_id=conversation_id,
                intent=intent,
                tool_trace=traces,
            )

        except Exception as exc:
            logger.error("Chat orchestration failed: %s", exc, exc_info=True)
            return ChatResponse(
                reply="I ran into an issue processing that. Could you try rephrasing?",
                conversation_id=conversation_id,
                intent=Intent(type=IntentType.GENERAL, confidence=0.0),
                tool_trace=[],
            )

    async def _process_with_tools(
        self,
        conversation_id: str,
        history: list[Message],
        user_id: str,
        available_tools: list[dict[str, Any]],
        max_iterations: int = 5,
    ) -> dict[str, Any]:
        """Gemini tool-calling loop with itinerary management."""
        tool_traces = []
        iterations = 0

        while iterations < max_iterations:
            iterations += 1

            # Call Gemini with tools
            if available_tools and iterations <= 3:
                llm_response = await self.gemini.generate_with_tools(
                    messages=history,
                    tools=available_tools,
                    system_prompt=self.system_prompt,
                )
            else:
                response_text = await self.gemini.generate_response(
                    messages=history,
                    system_prompt=self.system_prompt,
                )
                llm_response = {"text": response_text}

            # No tool calls → return text response
            if "tool_calls" not in llm_response or not llm_response["tool_calls"]:
                return {
                    "response": llm_response.get("text", "I'm not sure how to help with that."),
                    "tool_traces": tool_traces,
                    "iterations": iterations,
                }

            # Execute each tool call
            tool_results = []
            for tool_call in llm_response["tool_calls"]:
                start_time = time.time()
                tool_name = tool_call["name"]
                tool_args = tool_call["arguments"]

                try:
                    # Handle itinerary management tools internally
                    if tool_name.startswith("itinerary."):
                        result = await self._handle_itinerary_tool(
                            tool_name, tool_args, user_id, conversation_id
                        )
                    else:
                        # Regular MCP tool call
                        result = await call_tool(
                            tool_name,
                            {**tool_args, "user_id": user_id},
                        )
                    success = True
                    error = None
                except Exception as e:
                    logger.error("Tool call failed: %s: %s", tool_name, e)
                    result = None
                    success = False
                    error = str(e)

                latency_ms = int((time.time() - start_time) * 1000)

                trace = {
                    "tool": tool_name,
                    "arguments": tool_args,
                    "result": result,
                    "success": success,
                    "error": error,
                    "latency_ms": latency_ms,
                    "payload_hash": _hash_payload(tool_args),
                }
                tool_traces.append(trace)
                tool_results.append({
                    "name": tool_name,
                    "result": result if success else f"Error: {error}",
                })

            # Feed tool results back to Gemini for next iteration
            history.append(Message(
                role="assistant",
                content=f"[Called: {', '.join(tc['name'] for tc in llm_response['tool_calls'])}]",
            ))
            history.append(Message(
                role="user",
                content=f"Tool results:\n{_format_tool_results(tool_results)}",
            ))

        return {
            "response": "I'm still working on this but ran out of steps. Could you simplify your request?",
            "tool_traces": tool_traces,
            "iterations": iterations,
        }

    async def _handle_itinerary_tool(
        self,
        tool_name: str,
        args: dict[str, Any],
        user_id: str,
        conversation_id: str,
    ) -> dict[str, Any]:
        """Handle itinerary management tool calls from Gemini."""
        match tool_name:
            case "itinerary.generate":
                return await self._tool_generate_itinerary(args, user_id, conversation_id)
            case "itinerary.update_step":
                return await self._tool_update_step(args, user_id)
            case "itinerary.add_step":
                return await self._tool_add_step(args, user_id)
            case "itinerary.remove_step":
                return await self._tool_remove_step(args, user_id)
            case "itinerary.execute":
                return await self._tool_execute_itinerary(args, user_id)
            case _:
                raise ValueError(f"Unknown itinerary tool: {tool_name}")

    async def _tool_generate_itinerary(
        self, args: dict[str, Any], user_id: str, conversation_id: str,
    ) -> dict[str, Any]:
        """Handle itinerary.generate tool call — create a new itinerary from Gemini's JSON."""
        steps = []
        for i, s in enumerate(args.get("steps", [])):
            step_type = StepType(s.get("type", "activity"))
            location_data = s.get("location")
            location = Location(**location_data) if isinstance(location_data, dict) else None

            steps.append(ItineraryStep(
                order=i + 1,
                type=step_type,
                title=s.get("title", f"Step {i+1}"),
                description=s.get("description"),
                date=s.get("date", args.get("start_date", "")),
                start_time=s.get("start_time"),
                end_time=s.get("end_time"),
                location=location,
                agent=STEP_TYPE_TO_AGENT.get(step_type, "unknown_agent"),
                action_payload=s.get("action_payload", {}),
                estimated_price_usd=float(s.get("estimated_price_usd", 0)),
                notes=s.get("notes"),
            ))

        itinerary = Itinerary(
            title=args.get("title", "My Trip"),
            destination=args.get("destination", ""),
            start_date=args.get("start_date", ""),
            end_date=args.get("end_date", ""),
            conversation_id=conversation_id,
            steps=steps,
        )
        itinerary.recalculate_total()

        created = await create_itinerary(user_id, itinerary)
        return {
            "status": "created",
            "itinerary_id": created.id,
            "title": created.title,
            "estimated_total_usd": created.estimated_total_usd,
            "step_count": len(created.steps),
            "steps_summary": [
                {
                    "order": s.order,
                    "type": s.type.value,
                    "title": s.title,
                    "date": s.date,
                    "time": s.start_time,
                    "estimated_price_usd": s.estimated_price_usd,
                }
                for s in created.steps
            ],
        }

    async def _tool_update_step(self, args: dict[str, Any], user_id: str) -> dict[str, Any]:
        """Handle itinerary.update_step — modify a step."""
        itinerary_id = args.get("itinerary_id", "")
        step_id = args.get("step_id", "")
        updates = args.get("updates", {})

        result = await update_itinerary_step(user_id, itinerary_id, step_id, updates)
        if result:
            return {"status": "updated", "itinerary_id": itinerary_id, "step_id": step_id}
        return {"status": "error", "message": "Step not found"}

    async def _tool_add_step(self, args: dict[str, Any], user_id: str) -> dict[str, Any]:
        """Handle itinerary.add_step — add a new step."""
        itinerary_id = args.get("itinerary_id", "")
        step_data = args.get("step", {})
        step_type = StepType(step_data.get("type", "activity"))

        location_data = step_data.get("location")
        location = Location(**location_data) if isinstance(location_data, dict) else None

        step = ItineraryStep(
            order=step_data.get("order", 99),
            type=step_type,
            title=step_data.get("title", "New Step"),
            description=step_data.get("description"),
            date=step_data.get("date", ""),
            start_time=step_data.get("start_time"),
            end_time=step_data.get("end_time"),
            location=location,
            agent=STEP_TYPE_TO_AGENT.get(step_type, "unknown_agent"),
            action_payload=step_data.get("action_payload", {}),
            notes=step_data.get("notes"),
        )

        result = await add_step_to_itinerary(user_id, itinerary_id, step)
        if result:
            return {"status": "added", "itinerary_id": itinerary_id, "step_count": len(result.steps)}
        return {"status": "error", "message": "Itinerary not found"}

    async def _tool_remove_step(self, args: dict[str, Any], user_id: str) -> dict[str, Any]:
        """Handle itinerary.remove_step — remove a step."""
        itinerary_id = args.get("itinerary_id", "")
        step_id = args.get("step_id", "")

        result = await remove_step_from_itinerary(user_id, itinerary_id, step_id)
        if result:
            return {"status": "removed", "itinerary_id": itinerary_id, "step_count": len(result.steps)}
        return {"status": "error", "message": "Not found"}

    async def _tool_execute_itinerary(self, args: dict[str, Any], user_id: str) -> dict[str, Any]:
        """Handle itinerary.execute — dispatch agents for all steps."""
        itinerary_id = args.get("itinerary_id", "")

        result = await execute_itinerary(user_id, itinerary_id)
        if not result:
            return {"status": "error", "message": "Itinerary not found"}

        step_results = []
        for s in result.steps:
            step_results.append({
                "title": s.title,
                "type": s.type.value,
                "status": s.status.value,
                "result_summary": s.result.get("data", {}) if s.result else None,
            })

        return {
            "status": result.status.value,
            "itinerary_id": itinerary_id,
            "steps": step_results,
        }

    async def _build_context_message(self, user_id: str) -> str | None:
        """Build a context message with the user's current itineraries."""
        try:
            itineraries = await get_user_itineraries(user_id)
            drafts = [it for it in itineraries if it.status == ItineraryStatus.DRAFT]
            if not drafts:
                return None

            # Load the most recent draft with full steps
            latest = await get_itinerary(user_id, drafts[0].id)
            if not latest:
                return None

            steps_json = [
                {
                    "id": s.id,
                    "order": s.order,
                    "type": s.type.value,
                    "title": s.title,
                    "date": s.date,
                    "start_time": s.start_time,
                    "end_time": s.end_time,
                    "status": s.status.value,
                }
                for s in latest.steps
            ]

            return (
                f"[CONTEXT] The user has an active draft itinerary:\n"
                f"Itinerary ID: {latest.id}\n"
                f"Title: {latest.title}\n"
                f"Destination: {latest.destination}\n"
                f"Dates: {latest.start_date} to {latest.end_date}\n"
                f"Steps: {json.dumps(steps_json, indent=2)}\n"
                f"Use itinerary.update_step, itinerary.add_step, or itinerary.remove_step to modify it. "
                f"Use itinerary.execute when the user approves."
            )
        except Exception:
            return None

    def _extract_intent(self, tool_traces: list[dict]) -> Intent:
        """Extract intent from tool calls."""
        if not tool_traces:
            return Intent(type=IntentType.GENERAL, confidence=0.5)

        first_tool = tool_traces[0]["tool"]
        intent_map = {
            "flight": IntentType.FLIGHT,
            "hotel": IntentType.HOTEL,
            "dining": IntentType.DINING,
            "places": IntentType.ITINERARY,
            "itinerary": IntentType.ITINERARY,
            "gcal": IntentType.EXPORT,
            "notion": IntentType.EXPORT,
        }

        for key, intent_type in intent_map.items():
            if key in first_tool:
                return Intent(type=intent_type, confidence=0.9, entities={"tool": first_tool})

        return Intent(type=IntentType.GENERAL, confidence=0.5)


# ── System Prompt ─────────────────────────────────────────────────────

def _build_system_prompt() -> str:
    return """You are **Travel Butler**, a personal AI concierge for business travelers, layover explorers, and anyone who wants a hassle-free trip.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 1 · YOUR CORE JOB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Have a natural conversation to understand the traveler's needs, then produce a **structured itinerary** (via the `itinerary.generate` tool) with every step priced, timed, and ready to execute.

You are NOT just a search engine. You are a thoughtful planner who:
- Considers logistics (travel time between venues, check-in windows, jet lag)
- Respects the user's budget and flags when the total is getting high
- Proactively suggests things the user might not think of (power adapters, time-zone shifts, tipping norms)
- Sequences the day efficiently — no zig-zagging across the city

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 2 · CONVERSATION FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. **Gather info** — Ask about: destination, dates, purpose (business / leisure / layover), time constraints, budget range, food preferences, mobility needs, existing bookings.
2. **Generate itinerary** — Once you have destination + dates + at least a rough idea of preferences, call `itinerary.generate`. Don't over-ask — two rounds of questions max, then generate a draft.
3. **Present & price** — After generating, present the itinerary in a clean readable format showing each step with its time, location, and **estimated price**. Show the **total estimated cost** at the bottom.
4. **Refine** — User says "make dinner cheaper" or "swap the museum for a walking tour" → use `itinerary.update_step`, `itinerary.add_step`, `itinerary.remove_step`. Always re-present the updated plan with new prices.
5. **Execute** — User says "looks good", "book it", "go ahead" → call `itinerary.execute`. NEVER auto-execute without explicit approval.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 3 · ITINERARY STEP TYPES (one per agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ✈️ `flight` — Flight search & booking
- Agent: flight_agent → Duffel API
- Payload: `{"origin": "SFO", "destination": "PIT", "departure_date": "2026-02-08", "passengers": 1}`
- Pricing tips: Economy domestic US = $150-$400, international economy = $400-$1200, business = 2-4×. Red-eyes and Tuesday departures are cheapest. Use airport IATA codes.

### 🏨 `hotel` — Hotel search & booking
- Agent: hotel_agent → Booking.com API
- Payload: `{"location": "Pittsburgh", "check_in": "2026-02-08", "check_out": "2026-02-10", "guests": 1}`
- Pricing tips: Budget = $80-$120/night, mid-range = $120-$200, upscale = $200-$400, luxury = $400+. Prices vary dramatically by city (NYC 2× vs. Pittsburgh). Weekend rates often differ from weekday.

### 🍽️ `restaurant` — Restaurant search & reservation
- Agent: dining_agent → OpenTable API
- Payload: `{"location": "Pittsburgh", "cuisine": "Italian", "party_size": 2, "date_time": "2026-02-09T19:00"}`
- Pricing tips: Fast casual = $10-$20/person, mid-range sit-down = $25-$50, fine dining = $75-$150+, with drinks. Tipping in the US: 18-22%. Always include tip in the estimate.

### 🎯 `activity` — Attractions, tours, sightseeing, experiences
- Agent: places_agent → Google Places API
- Payload: `{"query": "museums in Pittsburgh", "location": "Pittsburgh"}`
- Pricing tips: Free activities exist (parks, walking tours, neighborhoods). Museum admission = $10-$30. Guided tours = $30-$80. Adventure activities = $50-$200. Always check if the place is free before pricing. Walking in a park = $0.

### 🚗 `transport` — Ground transportation directions & ETA
- Agent: directions_agent → Google Maps API
- Payload: `{"origin": "Pittsburgh Airport", "destination": "Carnegie Mellon University", "mode": "driving"}`
- Pricing tips: Uber/Lyft rides = $1-$2/mile + base fare (estimate $15-$40 for airport transfers, $8-$15 for in-city). Public transit = $2-$5. Walking = $0. Rental car = $40-$80/day + parking.

### 📅 `calendar_event` — Add to Google Calendar
- Agent: gcal_agent → Google Calendar API
- Payload: `{"summary": "Team meeting", "start": "2026-02-09T09:00:00", "end": "2026-02-09T10:00:00"}`
- Price: Always $0.

### 🚕 `uber` — Ride hailing [coming soon]
- Agent: uber_agent
- Price: Estimate $1.50-$2.50/mile + $2-$5 base

### 🍔 `uber_eats` — Food delivery [coming soon]
- Agent: uber_eats_agent
- Price: Meal + $5-$10 delivery/service fees

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 4 · BUDGET & PRICING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Every step MUST have an `estimated_price_usd`** — your best estimate in USD. Use 0 for free activities (walking tours, parks, calendar events).
- Base estimates on the destination city's cost of living. A dinner in Manhattan ≠ dinner in Boise.
- If the user mentions a budget, keep the total under it. If the total exceeds their budget, proactively suggest cheaper alternatives.
- When presenting the itinerary, always show per-item prices AND the total.
- If the user says "cheaper" or "budget-friendly", swap for lower-cost alternatives and explain the savings.
- If the user says "treat myself" or "splurge", upgrade selections and note the premium.
- Prices are ESTIMATES. Tell the user: "These are estimated prices — actual costs will be confirmed when we book."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 5 · PRESENTATION FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After calling `itinerary.generate`, present the plan like this:

```
📋 **[Trip Title]** — [Destination]
📅 [Start Date] → [End Date]

Day 1 · [Date]
─────────────
1. ✈️ 08:00–10:30  Flight SFO → PIT .............. $250
2. 🚗 10:45–11:15  Airport → Hotel (Uber) ......... $25
3. 🏨 11:30        Check in · Hilton Downtown ...... $180/night
4. 🍽️ 12:30–13:30  Lunch · Primanti Brothers ....... $18
5. 🎯 14:00–16:00  Andy Warhol Museum .............. $20
6. 🍽️ 19:00–21:00  Dinner · Altius (fine dining) ... $85

Day 2 · [Date]
─────────────
...

💰 Estimated Total: $XXX
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 6 · DIRECT TOOLS (no itinerary, quick lookups)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For one-off questions that don't need a full itinerary:
- `places.search` — "any good coffee near me?"
- `directions.get_eta` — "how far is X from Y?"
- `flight.search_offers` — "what flights go SFO→PIT tomorrow?"
- `hotel.search` — "hotels near Times Square under $200?"
- `dining.search` — "Italian restaurants in Pittsburgh?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 7 · PERSONALITY & TONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Concise but warm.** Business travelers don't want essays. Short paragraphs, bullet points.
- **Proactive.** Don't just answer — anticipate. "Since your meeting ends at 3 PM and your flight is at 7 PM, you have a 3-hour window. Here's what I'd suggest…"
- **Honest about estimates.** "This is my best guess at pricing — we'll get exact numbers when we search."
- **Respectful of time.** Never suggest activities that won't fit. If they have 90 minutes, don't suggest a 2-hour museum visit.
- **Travel-savvy.** Know that check-in is usually 3 PM, check-out 11 AM. Airport security takes 30-60 min. International flights need 2-3 hours before departure.
- Use emoji sparingly for step types (✈️🏨🍽️🎯🚗📅) to make the itinerary scannable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 8 · HARD RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Use airport IATA codes for flights (SFO, JFK, PIT, LHR, NRT).
2. Use 24-hour time format (14:00, not 2 PM).
3. Dates in YYYY-MM-DD format in tool calls.
4. NEVER execute without explicit user approval.
5. ALWAYS include `estimated_price_usd` on every step — 0 if free.
6. ALWAYS show the total price when presenting an itinerary.
7. If a user says "that's too expensive", suggest specific cheaper swaps — don't just say "I can find cheaper options."
8. Two clarifying questions max, then generate a draft. You can always refine after.
"""


# ── Tool Definitions ──────────────────────────────────────────────────

def _get_all_tools() -> list[dict[str, Any]]:
    """All tools available to Gemini — itinerary management + direct MCP tools."""
    return [
        # ── Itinerary Management Tools ────────────────────────
        {
            "name": "itinerary.generate",
            "description": "Generate a complete travel itinerary. Call this when you have enough information about the user's trip (destination, dates, preferences). This creates a structured plan with ordered steps.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Trip title (e.g., 'Pittsburgh Business Trip')"},
                    "destination": {"type": "string", "description": "Main destination city/area"},
                    "start_date": {"type": "string", "description": "Trip start date (YYYY-MM-DD)"},
                    "end_date": {"type": "string", "description": "Trip end date (YYYY-MM-DD)"},
                    "steps": {
                        "type": "array",
                        "description": "Ordered list of itinerary steps",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string", "description": "Step type: flight, hotel, restaurant, activity, transport, calendar_event, uber, uber_eats"},
                                "title": {"type": "string", "description": "Short title for this step"},
                                "description": {"type": "string", "description": "Longer description or notes"},
                                "date": {"type": "string", "description": "Date for this step (YYYY-MM-DD)"},
                                "start_time": {"type": "string", "description": "Start time (HH:MM, 24h)"},
                                "end_time": {"type": "string", "description": "End time (HH:MM, 24h)"},
                                "location": {
                                    "type": "object",
                                    "description": "Location details",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "address": {"type": "string"},
                                    },
                                },
                                "action_payload": {
                                    "type": "object",
                                    "description": "Parameters for the agent that will handle this step (e.g., flight origin/destination, hotel check-in/out dates)",
                                },
                                "estimated_price_usd": {"type": "number", "description": "Estimated cost in USD (0 if free, e.g. walking in a park)"},
                                "notes": {"type": "string", "description": "Additional preferences or constraints"},
                            },
                            "required": ["type", "title", "date", "estimated_price_usd"],
                        },
                    },
                },
                "required": ["title", "destination", "start_date", "end_date", "steps"],
            },
        },
        {
            "name": "itinerary.update_step",
            "description": "Update a specific step in an existing itinerary. Use when the user wants to change details of a step (time, location, type, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "itinerary_id": {"type": "string", "description": "ID of the itinerary to modify"},
                    "step_id": {"type": "string", "description": "ID of the step to update"},
                    "updates": {
                        "type": "object",
                        "description": "Fields to update (title, description, date, start_time, end_time, type, location, action_payload, notes)",
                    },
                },
                "required": ["itinerary_id", "step_id", "updates"],
            },
        },
        {
            "name": "itinerary.add_step",
            "description": "Add a new step to an existing itinerary.",
            "parameters": {
                "type": "object",
                "properties": {
                    "itinerary_id": {"type": "string", "description": "ID of the itinerary"},
                    "step": {
                        "type": "object",
                        "description": "The new step to add",
                        "properties": {
                            "type": {"type": "string"},
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "date": {"type": "string"},
                            "start_time": {"type": "string"},
                            "end_time": {"type": "string"},
                            "order": {"type": "integer"},
                            "location": {"type": "object", "properties": {"name": {"type": "string"}, "address": {"type": "string"}}},
                            "action_payload": {"type": "object"},
                            "notes": {"type": "string"},
                        },
                        "required": ["type", "title", "date"],
                    },
                },
                "required": ["itinerary_id", "step"],
            },
        },
        {
            "name": "itinerary.remove_step",
            "description": "Remove a step from an existing itinerary.",
            "parameters": {
                "type": "object",
                "properties": {
                    "itinerary_id": {"type": "string", "description": "ID of the itinerary"},
                    "step_id": {"type": "string", "description": "ID of the step to remove"},
                },
                "required": ["itinerary_id", "step_id"],
            },
        },
        {
            "name": "itinerary.execute",
            "description": "Execute the itinerary — dispatch agents to search/book for each step. Only call this after the user explicitly approves the plan.",
            "parameters": {
                "type": "object",
                "properties": {
                    "itinerary_id": {"type": "string", "description": "ID of the itinerary to execute"},
                },
                "required": ["itinerary_id"],
            },
        },
        # ── Direct MCP Tools (for quick lookups) ──────────────
        {
            "name": "places.search",
            "description": "Search for places, restaurants, cafes, attractions near a location. Use for quick lookups without creating an itinerary.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "What to search for (e.g., 'coffee near SFO')"},
                    "location": {"type": "string", "description": "Location to search near"},
                    "radius": {"type": "integer", "description": "Search radius in meters"},
                },
                "required": ["query"],
            },
        },
        {
            "name": "directions.get_eta",
            "description": "Get travel time and directions between two locations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string", "description": "Starting location"},
                    "destination": {"type": "string", "description": "Destination location"},
                    "mode": {"type": "string", "description": "Travel mode: driving, walking, transit"},
                },
                "required": ["origin", "destination"],
            },
        },
        {
            "name": "flight.search_offers",
            "description": "Search for available flights between airports.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string", "description": "Departure airport code"},
                    "destination": {"type": "string", "description": "Arrival airport code"},
                    "departure_date": {"type": "string", "description": "Departure date (YYYY-MM-DD)"},
                    "passengers": {"type": "integer", "description": "Number of passengers"},
                },
                "required": ["origin", "destination", "departure_date"],
            },
        },
        {
            "name": "hotel.search",
            "description": "Search for hotels in a location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City or area"},
                    "check_in": {"type": "string", "description": "Check-in date (YYYY-MM-DD)"},
                    "check_out": {"type": "string", "description": "Check-out date (YYYY-MM-DD)"},
                    "guests": {"type": "integer", "description": "Number of guests"},
                },
                "required": ["location", "check_in", "check_out"],
            },
        },
        {
            "name": "dining.search",
            "description": "Search for restaurants.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Location to search"},
                    "cuisine": {"type": "string", "description": "Type of cuisine"},
                    "party_size": {"type": "integer", "description": "Number of people"},
                    "date_time": {"type": "string", "description": "Date and time for reservation"},
                },
                "required": ["location"],
            },
        },
    ]


# ── Helpers ───────────────────────────────────────────────────────────

def _hash_payload(payload: dict[str, Any]) -> str:
    payload_str = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(payload_str.encode()).hexdigest()[:16]


def _format_tool_results(results: list[dict[str, Any]]) -> str:
    formatted = []
    for result in results:
        formatted.append(
            f"Tool: {result['name']}\n"
            f"Result: {json.dumps(result['result'], indent=2, default=str)}\n"
        )
    return "\n".join(formatted)


# ── Factory ───────────────────────────────────────────────────────────

def create_chat_orchestrator(gemini_service: GeminiService) -> ChatOrchestrator:
    return ChatOrchestrator(gemini_service=gemini_service)
