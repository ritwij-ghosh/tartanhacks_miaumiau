"""Quick CLI to test Travel Butler chatbot in the terminal."""

import asyncio
import json
import sys
from pathlib import Path

# Setup paths and env
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from api.services.gemini_service import create_gemini_service, Message
from api.services.chat_orchestrator import _build_system_prompt, _get_all_tools
from api.schemas.itinerary import (
    Itinerary, ItineraryStep, StepType, Location,
    STEP_TYPE_TO_AGENT, AGENT_TOOLS,
)

# ── Colors ──
C = "\033[96m"    # cyan
Y = "\033[93m"    # yellow
G = "\033[92m"    # green
R = "\033[91m"    # red
DIM = "\033[2m"   # dim
B = "\033[1m"     # bold
X = "\033[0m"     # reset


# ── Build Itinerary from tool args ──

_TYPE_FALLBACK = {
    "lunch": "restaurant", "dinner": "restaurant", "breakfast": "restaurant",
    "coffee": "restaurant", "meal": "restaurant", "food": "restaurant",
    "sightseeing": "activity", "tour": "activity", "museum": "activity",
    "shopping": "activity", "exploration": "activity", "walk": "activity",
    "uber": "transport", "taxi": "transport", "metro": "transport",
    "drive": "transport", "transit": "transport",
}


def build_itinerary(args: dict) -> Itinerary:
    """Parse Gemini's itinerary.generate args into a real Itinerary Pydantic object."""
    steps = []
    for i, s in enumerate(args.get("steps", [])):
        raw_type = s.get("type", "activity").lower()
        resolved = _TYPE_FALLBACK.get(raw_type, raw_type)
        try:
            step_type = StepType(resolved)
        except ValueError:
            print(f"{DIM}  ⚠ Unknown type '{raw_type}' → defaulting to 'activity'{X}")
            step_type = StepType.ACTIVITY
        loc = s.get("location")
        location = Location(**loc) if isinstance(loc, dict) else None
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
        title=args.get("title", "Trip"),
        destination=args.get("destination", ""),
        start_date=args.get("start_date", ""),
        end_date=args.get("end_date", ""),
        steps=steps,
    )
    itinerary.recalculate_total()
    return itinerary


def display_itinerary(it: Itinerary):
    """Print the itinerary schema cleanly."""
    print(f"\n{B}{'─' * 50}{X}")
    print(f"{B}Itinerary:{X} {it.title}")
    print(f"{B}Destination:{X} {it.destination}")
    print(f"{B}Dates:{X} {it.start_date} → {it.end_date}")
    print(f"{'─' * 50}")

    for s in it.steps:
        emoji = {"flight": "✈️", "hotel": "🏨", "restaurant": "🍽️", "activity": "🎯",
                 "transport": "🚗", "calendar_event": "📅", "uber": "🚕", "uber_eats": "🍔"
                 }.get(s.type.value, "•")
        time_str = ""
        if s.start_time and s.end_time:
            time_str = f"{s.start_time}–{s.end_time}"
        elif s.start_time:
            time_str = s.start_time

        print(f"\n  {B}{s.order}. {emoji} {s.title}{X}")
        print(f"     type: {s.type.value}")
        if time_str:
            print(f"     time: {time_str}")
        print(f"     date: {s.date}")
        if s.location:
            print(f"     location: {s.location.name}")
        if s.description:
            print(f"     note: {s.description}")
        print(f"     price: ${s.estimated_price_usd:.0f}")
        print(f"     {DIM}agent: {s.agent}{X}")

    print(f"\n{'─' * 50}")
    print(f"  {B}Estimated Total: ${it.estimated_total_usd:.0f}{X}")
    print(f"{'─' * 50}\n")


def display_dispatch(it: Itinerary):
    """Print agent dispatch for every step."""
    print(f"\n{G}{B}✅ CONFIRMED{X}\n")
    for s in it.steps:
        tools = AGENT_TOOLS.get(s.agent, [])
        tools_str = f" → {', '.join(tools)}" if tools else ""
        print(f"{G}  {s.agent} engaged for {s.title}{tools_str}{X}")
    print(f"\n{B}── Itinerary locked. {len(it.steps)} agents dispatched. ──{X}\n")

    # Print raw JSON
    print(f"{DIM}Raw itinerary JSON:{X}")
    print(f"{DIM}{json.dumps(it.model_dump(), indent=2, default=str)}{X}\n")


# ── Main loop ──

async def main():
    print("\n🧳 Travel Butler CLI")
    print("=" * 50)
    print("Type your message and press Enter.")
    print("Type 'quit' or 'exit' to stop.")
    print("Type 'clear' to reset conversation.")
    print("=" * 50 + "\n")

    gemini = create_gemini_service()
    system_prompt = _build_system_prompt()
    tools = _get_all_tools()
    history: list[Message] = []
    current_itinerary: Itinerary | None = None

    while True:
        try:
            user_input = input(f"{C}You: {X}").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\n👋 Bye!")
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit"):
            print("\n👋 Bye!")
            break
        if user_input.lower() == "clear":
            history.clear()
            current_itinerary = None
            print("🗑️  Conversation cleared.\n")
            continue

        history.append(Message(role="user", content=user_input))

        try:
            result = await gemini.generate_with_tools(
                messages=history,
                tools=tools,
                system_prompt=system_prompt,
            )

            # Handle tool calls
            if "tool_calls" in result and result["tool_calls"]:
                for tc in result["tool_calls"]:
                    name = tc["name"]
                    args = tc["arguments"]

                    if name == "itinerary_generate":
                        # Build real Itinerary object
                        current_itinerary = build_itinerary(args)
                        display_itinerary(current_itinerary)

                        # Feed result back into conversation
                        history.append(Message(
                            role="assistant",
                            content=f"[Generated itinerary: {current_itinerary.title} — {len(current_itinerary.steps)} items, est. ${current_itinerary.estimated_total_usd:.0f}]"
                        ))
                        print(f"{Y}Butler:{X} Here's your itinerary. Shall I proceed, or would you like changes?\n")
                        history.append(Message(
                            role="assistant",
                            content="Here's your itinerary. Shall I proceed, or would you like changes?"
                        ))

                    elif name == "itinerary_execute":
                        if current_itinerary:
                            display_dispatch(current_itinerary)
                        else:
                            print(f"{R}No itinerary to execute.{X}\n")
                        break  # end conversation

                    else:
                        # Other tool call — log it
                        print(f"{DIM}[Tool call: {name}({json.dumps(args, default=str)})]{X}")
                        history.append(Message(
                            role="assistant",
                            content=f"[Called {name} with {json.dumps(args, default=str)}]"
                        ))
                else:
                    continue  # for/else: only reached if we didn't break

                break  # if we broke out of the for loop (execute), break the while loop too

            # Plain text response
            text = result.get("text", "")
            if text:
                history.append(Message(role="assistant", content=text))
                print(f"\n{Y}Butler:{X} {text}\n")

        except Exception as e:
            print(f"\n{R}Error:{X} {e}\n")


if __name__ == "__main__":
    asyncio.run(main())
