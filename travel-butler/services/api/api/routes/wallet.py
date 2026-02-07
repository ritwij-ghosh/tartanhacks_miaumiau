from fastapi import APIRouter, Request
from fastapi.responses import Response

from api.schemas import WalletRequest
from api.services.wallet_pass import generate_pkpass

router = APIRouter()


@router.post("/pkpass")
async def create_pkpass(body: WalletRequest, request: Request):
    user_id = getattr(request.state, "user_id", "anonymous")
    pkpass_bytes = await generate_pkpass(user_id, body.trip_id)
    return Response(
        content=pkpass_bytes,
        media_type="application/vnd.apple.pkpass",
        headers={
            "Content-Disposition": f'attachment; filename="trip-{body.trip_id}.pkpass"'
        },
    )
