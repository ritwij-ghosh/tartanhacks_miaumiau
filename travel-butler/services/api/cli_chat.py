"""Quick CLI to test Travel Butler chatbot in the terminal."""

import asyncio
import sys
from pathlib import Path

# Setup paths and env
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from api.services.gemini_service import create_gemini_service, Message
from api.services.chat_orchestrator import _build_system_prompt


async def main():
    print("\n🧳 Travel Butler CLI")
    print("=" * 50)
    print("Type your message and press Enter.")
    print("Type 'quit' or 'exit' to stop.")
    print("Type 'clear' to reset conversation.")
    print("=" * 50 + "\n")

    gemini = create_gemini_service()
    system_prompt = _build_system_prompt()
    history: list[Message] = []

    while True:
        try:
            user_input = input("\033[96mYou: \033[0m").strip()
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
            print("🗑️  Conversation cleared.\n")
            continue

        history.append(Message(role="user", content=user_input))

        try:
            reply = await gemini.generate_response(
                messages=history,
                system_prompt=system_prompt,
            )
            history.append(Message(role="assistant", content=reply))
            print(f"\n\033[93mButler:\033[0m {reply}\n")
        except Exception as e:
            print(f"\n\033[91mError:\033[0m {e}\n")


if __name__ == "__main__":
    asyncio.run(main())
