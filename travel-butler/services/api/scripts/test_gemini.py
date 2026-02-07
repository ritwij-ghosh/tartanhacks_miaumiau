#!/usr/bin/env python3
"""
Test script for Gemini + Dedalus + MCP integration.
Tests the full flow: User → Gemini → Tool Router → Dedalus → gcal-mcp
"""
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv()

from api.services.gemini_service import create_gemini_service, Message
from api.services.chat_orchestrator import ChatOrchestrator
from api.schemas import ChatRequest


async def test_basic_gemini():
    """Test 1: Basic Gemini chat"""
    print("=" * 60)
    print("TEST 1: Basic Gemini Chat")
    print("=" * 60)
    
    service = create_gemini_service()
    messages = [Message(role="user", content="Hello! Can you hear me?")]
    
    response = await service.generate_response(messages)
    print(f"✅ Gemini response: {response}\n")


async def test_tool_awareness():
    """Test 2: Gemini understanding available tools"""
    print("=" * 60)
    print("TEST 2: Tool Awareness")
    print("=" * 60)
    
    service = create_gemini_service()
    
    tools = [
        {
            "name": "gcal_create_event",
            "description": "Create a new event in Google Calendar",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string", "description": "Event title"},
                    "start_time": {"type": "string", "description": "Start time (ISO format)"},
                    "end_time": {"type": "string", "description": "End time (ISO format)"},
                    "description": {"type": "string", "description": "Event description"},
                },
                "required": ["summary", "start_time", "end_time"],
            },
        }
    ]
    
    messages = [
        Message(
            role="user",
            content="I need to schedule a meeting tomorrow at 2pm for 1 hour called 'Team Sync'"
        )
    ]
    
    response = await service.generate_with_tools(messages=messages, tools=tools)
    
    print(f"Response text: {response.get('text', 'N/A')}")
    if "tool_calls" in response:
        print(f"✅ Tool calls requested: {response['tool_calls']}")
    else:
        print("❌ No tool calls - Gemini didn't recognize the need to use tools")
    print()


async def test_full_orchestrator():
    """Test 3: Full orchestrator with mock user"""
    print("=" * 60)
    print("TEST 3: Full Chat Orchestrator")
    print("=" * 60)
    
    service = create_gemini_service()
    orchestrator = ChatOrchestrator(gemini_service=service)
    
    # Simulate a chat request
    request = ChatRequest(
        message="What good things are there to do in Pittsburgh today? Consider the weather and time."
    )
    
    print(f"User message: {request.message}")
    print("\nProcessing...\n")
    
    try:
        response = await orchestrator.orchestrate_chat(
            user_id="test_user_123",
            req=request
        )
        
        print(f"🤖 Assistant reply:\n{response.reply}\n")
        print(f"📊 Intent detected: {response.intent.type} (confidence: {response.intent.confidence})")
        
        if response.tool_trace:
            print(f"\n🔧 Tools called ({len(response.tool_trace)}):")
            for trace in response.tool_trace:
                status = "✅" if trace.success else "❌"
                print(f"  {status} {trace.tool} ({trace.latency_ms}ms)")
        else:
            print("\n⚠️  No tools were called")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print()


async def test_gcal_integration():
    """Test 4: Specific gcal tool integration via Dedalus"""
    print("=" * 60)
    print("TEST 4: Google Calendar Integration (Dedalus)")
    print("=" * 60)
    
    # Check Dedalus credentials
    dedalus_key = os.getenv("DEDALUS_API_KEY")
    dedalus_url = os.getenv("DEDALUS_AS_URL")
    
    if not dedalus_key:
        print("⚠️  DEDALUS_API_KEY not set - skipping Dedalus test")
        print("   Set DEDALUS_API_KEY in .env to test full integration\n")
        return
    
    print(f"Dedalus API Key: {dedalus_key[:10]}...{dedalus_key[-4:]}")
    print(f"Dedalus URL: {dedalus_url}\n")
    
    service = create_gemini_service()
    orchestrator = ChatOrchestrator(gemini_service=service)
    
    # Test creating a calendar event
    request = ChatRequest(
        message="Create a calendar event for tomorrow at 3pm: 'Pittsburgh Tour Planning' for 2 hours"
    )
    
    print(f"User message: {request.message}")
    print("\nProcessing with Dedalus MCP...\n")
    
    try:
        response = await orchestrator.orchestrate_chat(
            user_id="test_user_123",
            req=request
        )
        
        print(f"🤖 Assistant reply:\n{response.reply}\n")
        
        if response.tool_trace:
            print(f"🔧 Tools executed:")
            for trace in response.tool_trace:
                status = "✅" if trace.success else "❌"
                print(f"  {status} {trace.tool} ({trace.latency_ms}ms)")
                if hasattr(trace, 'error') and trace.error:
                    print(f"      Error: {trace.error}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if "auth" in str(e).lower() or "oauth" in str(e).lower():
            print("\n💡 This might be an OAuth issue. You may need to:")
            print("   1. Visit the Dedalus auth URL")
            print("   2. Authorize access to Google Calendar")
            print("   3. Try again\n")
        import traceback
        traceback.print_exc()
    
    print()


async def test_intent_detection():
    """Test 5: Intent detection from various messages"""
    print("=" * 60)
    print("TEST 5: Intent Detection")
    print("=" * 60)
    
    service = create_gemini_service()
    orchestrator = ChatOrchestrator(gemini_service=service)
    
    test_messages = [
        "Find me a flight to New York tomorrow",
        "Book a hotel near Times Square for next week",
        "Find restaurants in Pittsburgh with good reviews",
        "What's good to do during a 3 hour layover at SFO?",
        "Add this to my calendar",
    ]
    
    for msg in test_messages:
        request = ChatRequest(message=msg)
        try:
            response = await orchestrator.orchestrate_chat(
                user_id="test_user_123",
                req=request
            )
            print(f"📝 '{msg}'")
            print(f"   → Intent: {response.intent.type} ({response.intent.confidence:.2f})")
            print()
        except Exception as e:
            print(f"❌ Error processing '{msg}': {e}\n")


async def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("GEMINI + DEDALUS + MCP INTEGRATION TEST SUITE")
    print("=" * 60)
    print()
    
    # Check for API keys
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        print("❌ Error: GEMINI_API_KEY not found in environment")
        print("Please create a .env file with your Gemini API key")
        return
    
    print(f"✅ Gemini API Key: {gemini_key[:8]}...{gemini_key[-4:]}")
    
    dedalus_key = os.getenv("DEDALUS_API_KEY")
    if dedalus_key:
        print(f"✅ Dedalus API Key: {dedalus_key[:10]}...{dedalus_key[-4:]}")
    else:
        print("⚠️  Dedalus API Key not set (some tests will be skipped)")
    
    print()
    
    try:
        # Run tests in sequence
        await test_basic_gemini()
        await test_tool_awareness()
        await test_intent_detection()
        await test_full_orchestrator()
        await test_gcal_integration()
        
        print("=" * 60)
        print("✅ TEST SUITE COMPLETE")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())