from fastapi import APIRouter, Request

from api.schemas import ExportRequest
from api.services.export_calendar import export_to_gcal
from api.services.tool_router import call_tool

router = APIRouter()


@router.post("/gcal")
async def export_gcal(body: ExportRequest, request: Request):
    user_id = getattr(request.state, "user_id", "anonymous")
    result = await export_to_gcal(user_id, body.trip_id)
    return {"status": "ok", "events_created": result}


@router.post("/notion")
async def export_notion(body: ExportRequest, request: Request):
    user_id = getattr(request.state, "user_id", "anonymous")
    result = await call_tool("notion.export_page", {
        "user_id": user_id,
        "trip_id": body.trip_id,
    })
    return {"status": "ok", "result": result}
