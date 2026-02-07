from fastapi import APIRouter, Request, HTTPException

from api.schemas import ExportRequest
from api.services.export_calendar import export_itinerary_to_gcal
from api.services.itinerary_manager import get_itinerary
from api.services.tool_router import call_tool

router = APIRouter()


@router.post("/gcal")
async def export_gcal(body: ExportRequest, request: Request):
    """Export an itinerary's steps to Google Calendar.

    Requires the user to have connected Google Calendar via /oauth/google/start.
    """
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Load the itinerary
    itinerary = await get_itinerary(user_id, body.trip_id)
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    result = await export_itinerary_to_gcal(user_id, itinerary)
    return {
        "status": "ok",
        "events_created": result.get("created", 0),
        "events_failed": result.get("failed", 0),
        "error": result.get("error"),
    }


@router.post("/notion")
async def export_notion(body: ExportRequest, request: Request):
    user_id = getattr(request.state, "user_id", "anonymous")
    result = await call_tool("notion.export_page", {
        "user_id": user_id,
        "trip_id": body.trip_id,
    })
    return {"status": "ok", "result": result}
