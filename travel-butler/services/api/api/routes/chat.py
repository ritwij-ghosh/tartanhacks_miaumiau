"""Chat route — sends user messages through the Gemini-powered orchestrator."""

from fastapi import APIRouter, Request, HTTPException

from api.schemas import ChatRequest, ChatResponse
from api.services.gemini_service import create_gemini_service
from api.services.chat_orchestrator import ChatOrchestrator

router = APIRouter()

# ── Singleton orchestrator ────────────────────────────────────────────
_orchestrator: ChatOrchestrator | None = None


def get_orchestrator() -> ChatOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        gemini = create_gemini_service()
        _orchestrator = ChatOrchestrator(gemini)
    return _orchestrator


@router.post("/send", response_model=ChatResponse)
async def send_message(req: ChatRequest, request: Request):
    """Process a user message through the chat orchestrator."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    orchestrator = get_orchestrator()
    return await orchestrator.orchestrate_chat(user_id, req)
