from fastapi import APIRouter, Request

from api.schemas import BookingStep, BookingConfirmation, BookingApproval
from api.services.booking_engine import create_steps, approve_booking, get_status

router = APIRouter()


@router.post("/create_steps", response_model=list[BookingStep])
async def create_booking_steps(request: Request):
    body = await request.json()
    user_id = getattr(request.state, "user_id", "anonymous")
    return await create_steps(user_id, body)


@router.post("/approve", response_model=BookingConfirmation)
async def approve(body: BookingApproval, request: Request):
    user_id = getattr(request.state, "user_id", "anonymous")
    return await approve_booking(user_id, body)


@router.get("/status/{booking_id}", response_model=BookingConfirmation)
async def booking_status(booking_id: str, request: Request):
    user_id = getattr(request.state, "user_id", "anonymous")
    return await get_status(user_id, booking_id)
