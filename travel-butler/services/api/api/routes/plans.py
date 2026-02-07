"""Itinerary / plan routes."""

from fastapi import APIRouter, Request, HTTPException

from api.schemas.itinerary import (
    Itinerary,
    ItineraryResponse,
    ItineraryUpdateRequest,
    ItineraryExecuteRequest,
)
from api.services.itinerary_manager import (
    get_itinerary,
    get_user_itineraries,
    update_itinerary_step,
    execute_itinerary,
)

router = APIRouter()


@router.get("/", response_model=list[Itinerary])
async def list_itineraries(request: Request):
    """Get all itineraries for the current user."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await get_user_itineraries(user_id)


@router.get("/{itinerary_id}", response_model=ItineraryResponse)
async def get_itinerary_detail(itinerary_id: str, request: Request):
    """Get a single itinerary with all steps."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    itinerary = await get_itinerary(user_id, itinerary_id)
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    return ItineraryResponse(itinerary=itinerary)


@router.patch("/{itinerary_id}/steps/{step_id}")
async def update_step(
    itinerary_id: str,
    step_id: str,
    body: ItineraryUpdateRequest,
    request: Request,
):
    """Update a specific step in an itinerary."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await update_itinerary_step(user_id, itinerary_id, step_id, body.updates)
    if not result:
        raise HTTPException(status_code=404, detail="Step not found")

    return ItineraryResponse(itinerary=result, message="Step updated")


@router.post("/{itinerary_id}/execute", response_model=ItineraryResponse)
async def execute(itinerary_id: str, request: Request):
    """Execute all steps in an itinerary — dispatch agents."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await execute_itinerary(user_id, itinerary_id)
    if not result:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    return ItineraryResponse(
        itinerary=result,
        message=f"Itinerary executed — {len(result.steps)} steps processed",
    )
