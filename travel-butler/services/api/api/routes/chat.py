# In api/routes/chat.py
from api.services.gemini_service import create_gemini_service
from api.services.chat_orchestrator import ChatOrchestrator

# Singleton
_orchestrator: ChatOrchestrator | None = None

def get_orchestrator() -> ChatOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        gemini = create_gemini_service()
        _orchestrator = ChatOrchestrator(gemini)
    return _orchestrator

@router.post("/send")
async def send_message(req: ChatRequest, user_id: str = Depends(get_user_id)):
    orchestrator = get_orchestrator()
    return await orchestrator.orchestrate_chat(user_id, req)