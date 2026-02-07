"""Chat orchestrator — takes user message, calls Gemini LLM, executes tools, returns response."""

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
)
from api.services.tool_router import call_tool  # ← Your existing router
from api.services.gemini_service import GeminiService, Message

logger = logging.getLogger("travel_butler.chat")


class ChatOrchestrator:
    """Orchestrates conversation between user, Gemini LLM, and MCP tools."""
    
    def __init__(self, gemini_service: GeminiService):
        self.gemini = gemini_service
        self.system_prompt = self._default_system_prompt()
        
    async def orchestrate_chat(self, user_id: str, req: ChatRequest) -> ChatResponse:
        """Process user message using Gemini + MCP tools."""
        conversation_id = req.conversation_id or str(uuid.uuid4())
        traces: list[ToolTraceEvent] = []
        
        # Convert request to messages
        messages = [Message(role="user", content=req.message)]
        
        try:
            # Get Gemini response with tool calling
            result = await self._process_with_tools(
                messages=messages,
                user_id=user_id,
                available_tools=self._get_available_tools(),
            )
            
            # Convert tool traces (if any were collected)
            for trace in result.get("tool_traces", []):
                traces.append(ToolTraceEvent(
                    tool=trace["tool"],
                    latency_ms=trace.get("latency_ms", 0),
                    success=trace.get("success", True),
                    payload_hash=trace.get("payload_hash", ""),
                ))
            
            # Extract intent from first tool call if any
            intent = self._extract_intent(result.get("tool_traces", []))
            
            return ChatResponse(
                reply=result["response"],
                conversation_id=conversation_id,
                intent=intent,
                tool_trace=traces,
            )
            
        except Exception as exc:
            logger.error("Chat orchestration failed: %s", exc, exc_info=True)
            return ChatResponse(
                reply="I ran into an issue. Could you rephrase that?",
                conversation_id=conversation_id,
                intent=Intent(type=IntentType.GENERAL, confidence=0.0),
                tool_trace=[],
            )
    
    async def _process_with_tools(
        self,
        messages: list[Message],
        user_id: str,
        available_tools: list[dict[str, Any]],
        max_iterations: int = 5,
    ) -> dict[str, Any]:
        """Gemini tool calling loop."""
        tool_traces = []
        iterations = 0
        
        while iterations < max_iterations:
            iterations += 1
            
            # Call Gemini
            if iterations == 1 and available_tools:
                llm_response = await self.gemini.generate_with_tools(
                    messages=messages,
                    tools=available_tools,
                    system_prompt=self.system_prompt,
                )
            else:
                response_text = await self.gemini.generate_response(
                    messages=messages,
                    system_prompt=self.system_prompt,
                )
                llm_response = {"text": response_text}
            
            # Check for tool calls
            if "tool_calls" not in llm_response or not llm_response["tool_calls"]:
                return {
                    "response": llm_response["text"],
                    "tool_traces": tool_traces,
                    "iterations": iterations,
                }
            
            # Execute tool calls via your existing tool_router
            tool_results = []
            for tool_call in llm_response["tool_calls"]:
                start_time = time.time()
                
                try:
                    # ← Uses your existing call_tool() which handles tracing
                    result = await call_tool(
                        tool_call["name"],
                        {**tool_call["arguments"], "user_id": user_id}
                    )
                    success = True
                    error = None
                except Exception as e:
                    logger.error(f"Tool call failed: {tool_call['name']}: {e}")
                    result = None
                    success = False
                    error = str(e)
                
                latency_ms = int((time.time() - start_time) * 1000)
                
                trace = {
                    "tool": tool_call["name"],
                    "arguments": tool_call["arguments"],
                    "result": result,
                    "success": success,
                    "error": error,
                    "latency_ms": latency_ms,
                    "payload_hash": self._hash_payload(tool_call["arguments"]),
                }
                tool_traces.append(trace)
                tool_results.append({
                    "name": tool_call["name"],
                    "result": result if success else f"Error: {error}",
                })
            
            # Add tool results to conversation for next iteration
            messages.append(Message(
                role="assistant",
                content=f"[Called: {', '.join(tc['name'] for tc in llm_response['tool_calls'])}]"
            ))
            messages.append(Message(
                role="user",
                content=f"Tool results:\n{self._format_tool_results(tool_results)}"
            ))
        
        return {
            "response": "Sorry, I'm having trouble completing this request. Please try rephrasing.",
            "tool_traces": tool_traces,
            "iterations": iterations,
        }
    
    def _get_available_tools(self) -> list[dict[str, Any]]:
        """Define MCP tools available to Gemini - matches your LOCAL_MCP_REGISTRY."""
        return [
            {
                "name": "places.search",
                "description": "Search for places, restaurants, cafes, attractions near a location",
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
                "description": "Get travel time and directions between two locations",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "origin": {"type": "string", "description": "Starting location"},
                        "destination": {"type": "string", "description": "Destination location"},
                        "mode": {"type": "string", "enum": ["driving", "walking", "transit"], "description": "Travel mode"},
                    },
                    "required": ["origin", "destination"],
                },
            },
            {
                "name": "flight.search_offers",
                "description": "Search for available flights",
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
                "description": "Search for hotels in a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "City or area to search"},
                        "check_in": {"type": "string", "description": "Check-in date (YYYY-MM-DD)"},
                        "check_out": {"type": "string", "description": "Check-out date (YYYY-MM-DD)"},
                        "guests": {"type": "integer", "description": "Number of guests"},
                    },
                    "required": ["location", "check_in", "check_out"],
                },
            },
            {
                "name": "dining.search",
                "description": "Search for restaurants and make reservations",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "Location to search"},
                        "cuisine": {"type": "string", "description": "Type of cuisine"},
                        "party_size": {"type": "integer", "description": "Number of people"},
                        "date_time": {"type": "string", "description": "Reservation date and time"},
                    },
                    "required": ["location"],
                },
            },
        ]
    
    def _extract_intent(self, tool_traces: list[dict]) -> Intent:
        """Extract intent from tool calls made by Gemini."""
        if not tool_traces:
            return Intent(type=IntentType.GENERAL, confidence=0.5)
        
        first_tool = tool_traces[0]["tool"]
        intent_map = {
            "flight": IntentType.FLIGHT,
            "hotel": IntentType.HOTEL,
            "dining": IntentType.DINING,
            "places": IntentType.ITINERARY,
            "gcal": IntentType.EXPORT,
            "notion": IntentType.EXPORT,
        }
        
        for key, intent_type in intent_map.items():
            if key in first_tool:
                return Intent(type=intent_type, confidence=0.9, entities={"tool": first_tool})
        
        return Intent(type=IntentType.GENERAL, confidence=0.5)
    
    def _format_tool_results(self, results: list[dict[str, Any]]) -> str:
        """Format tool results for Gemini to understand."""
        formatted = []
        for result in results:
            formatted.append(
                f"Tool: {result['name']}\n"
                f"Result: {json.dumps(result['result'], indent=2)}\n"
            )
        return "\n".join(formatted)
    
    def _hash_payload(self, payload: dict[str, Any]) -> str:
        """Create hash of payload for deduplication."""
        payload_str = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(payload_str.encode()).hexdigest()[:16]
    
    def _default_system_prompt(self) -> str:
        """System prompt for Travel Butler."""
        return """You are Travel Butler, a helpful AI assistant for business travelers.

Your role is to help users make the most of layovers and gaps between meetings by:
- Finding nearby restaurants, cafes, and attractions
- Creating micro-itineraries that fit their time constraints
- Searching and booking flights
- Finding and booking hotels
- Making restaurant reservations
- Managing trip logistics

Key principles:
1. Always consider time constraints - if a user has 2 hours, don't suggest activities that take 3 hours
2. Ask for confirmation before making any bookings that cost money
3. Provide specific, actionable recommendations with addresses and timing
4. Be concise but friendly
5. Use tools to get real-time information rather than guessing

When a user asks for help, think about what information you need and use the appropriate tools to help them."""


# Factory function for dependency injection
def create_chat_orchestrator(gemini_service: GeminiService) -> ChatOrchestrator:
    """Create a configured ChatOrchestrator instance."""
    return ChatOrchestrator(gemini_service=gemini_service)