"""Quick CLI to test Travel Butler chatbot in the terminal."""

import asyncio
import json
import os
import sys
from pathlib import Path

# Setup paths and env
sys.path.insert(0, str(Path(__file__).resolve().parent))
# Also add project root so mcp_servers package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from api.services.gemini_service import create_gemini_service, Message
from api.services.chat_orchestrator import _build_system_prompt, _get_all_tools
from api.services.agent_dispatcher import dispatch_all_steps
from api.services.export_calendar import export_itinerary_to_gcal
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


async def real_dispatch(it: Itinerary, user_id: str):
    """Actually dispatch agents via MCP tools and export to Google Calendar."""
    print(f"\n{G}{B}✅ CONFIRMED — dispatching agents…{X}\n")

    # 1. Call real MCP tools for every step
    updated_steps = await dispatch_all_steps(it.steps, user_id)
    it.steps = updated_steps

    for s in it.steps:
        status_icon = {
            "found": "✅", "booked": "✅", "searching": "⏳",
            "skipped": "⏭️", "failed": "❌",
        }.get(s.status.value, "•")
        tools = AGENT_TOOLS.get(s.agent, [])
        tools_str = f" → {', '.join(tools)}" if tools else ""
        result_info = ""
        if s.result:
            if "error" in s.result:
                result_info = f" ({R}{s.result['error']}{X})"
            elif "data" in s.result:
                result_info = f" {DIM}(ok){X}"
        print(f"  {status_icon} {s.agent} engaged for {B}{s.title}{X}{tools_str}{result_info}")

    print(f"\n{B}── {len(it.steps)} agents dispatched. ──{X}\n")

    # 2. Export all steps to Google Calendar
    print(f"{Y}Exporting to Google Calendar…{X}")
    try:
        gcal_result = await export_itinerary_to_gcal(user_id, it)
        created = gcal_result.get("created", 0)
        failed = gcal_result.get("failed", 0)
        error = gcal_result.get("error")
        if error:
            print(f"  {R}⚠ Calendar export skipped: {error}{X}")
        elif failed:
            print(f"  {Y}📅 {created} events created, {failed} failed{X}")
        else:
            print(f"  {G}📅 {created} events added to Google Calendar{X}")
    except Exception as exc:
        print(f"  {R}⚠ Calendar export error: {exc}{X}")

    # 3. Print raw JSON
    print(f"\n{DIM}Raw itinerary JSON:{X}")
    print(f"{DIM}{json.dumps(it.model_dump(), indent=2, default=str)}{X}\n")


# ── Main loop ──

async def main():
    # Resolve user_id for agent dispatch (needed for OAuth-dependent tools like GCal)
    user_id = os.environ.get("CLI_USER_ID", "")
    if not user_id:
        user_id = input("Enter your Supabase user_id (from auth.users): ").strip()
    if not user_id:
        print(f"{R}No user_id provided. Agents requiring OAuth (e.g. GCal) will fail.{X}")
        user_id = "cli-anonymous"

    mcp_mode = os.environ.get("MCP_MODE", "mock")
    print(f"\n🧳 Travel Butler CLI  {DIM}(MCP_MODE={mcp_mode}, user={user_id[:12]}…){X}")
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
                            await real_dispatch(current_itinerary, user_id)
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
