"""User profile management routes."""

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from api.db.supabase import get_supabase

router = APIRouter()


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    preferences: dict | None = None


class ProfileResponse(BaseModel):
    id: str
    email: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None
    provider: str | None = None
    preferences: dict = {}


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(request: Request):
    """Get the current user's profile."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sb = get_supabase()
    result = sb.table("profiles").select("*").eq("id", user_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return ProfileResponse(**result.data)


@router.patch("/me", response_model=ProfileResponse)
async def update_my_profile(body: ProfileUpdate, request: Request):
    """Update the current user's profile."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sb = get_supabase()
    update_data = body.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        sb.table("profiles")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return ProfileResponse(**result.data[0])
