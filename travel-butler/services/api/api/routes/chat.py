from fastapi import APIRouter, Request

from api.schemas import ChatRequest, ChatResponse
from api.services.chat_orchestrator import orchestrate_chat

router = APIRouter()


@router.post("/send", response_model=ChatResponse)
async def chat_send(body: ChatRequest, request: Request):
    user_id = getattr(request.state, "user_id", "anonymous")
    return await orchestrate_chat(user_id, body)
