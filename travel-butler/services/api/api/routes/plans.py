from fastapi import APIRouter, Request

from api.schemas import Plan
from api.services.plan_builder import build_plan, revise_plan

router = APIRouter()


@router.post("/generate", response_model=Plan)
async def generate_plan(request: Request):
    body = await request.json()
    user_id = getattr(request.state, "user_id", "anonymous")
    return await build_plan(user_id, body)


@router.post("/revise", response_model=Plan)
async def revise_existing_plan(request: Request):
    body = await request.json()
    user_id = getattr(request.state, "user_id", "anonymous")
    return await revise_plan(user_id, body)
