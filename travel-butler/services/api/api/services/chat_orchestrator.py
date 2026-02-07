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
    return """You are Travel Butler, a personal travel concierge. Introduce yourself briefly on first message.

RULES:
1. Be concise. Short sentences. Courteous. Ask 1–2 questions at a time, only what's essential (destination, dates, departure city). Infer everything else.
2. Never suggest multiple options. Suggest one plan. Change only if the user asks.
3. When you have enough info, call the itinerary.generate tool immediately. Do not describe the itinerary in text — the tool creates it. After calling the tool, ask: "Shall I proceed, or would you like changes?"
4. You are strictly a travel agent. If asked about anything non-travel, say: "I'm an expert in travel planning — happy to help with anything in that regard."

PRICING: Every step needs an estimated_price_usd. Use realistic estimates:
- flight: domestic $150–400, intl $400–1200
- hotel: $80–400/night depending on tier and city
- restaurant: $12–150/pp depending on tier, include 20% tip
- activity: $0 for parks/walks, $10–30 museums, $30–80 tours
- transport: Uber $8–40, transit $2–5, walking $0
- calendar_event: $0

FORMAT: IATA codes for airports. 24h time. YYYY-MM-DD dates. Max 2 rounds of questions before generating.
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
