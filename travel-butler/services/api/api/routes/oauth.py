"""Google OAuth2 flow for Calendar access."""

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from api.config import settings

router = APIRouter()


@router.get("/google/start")
async def google_oauth_start(request: Request):
    """Return the Google OAuth consent URL."""
    # TODO: Replace with real OAuth2 PKCE flow
    scopes = "https://www.googleapis.com/auth/calendar.events"
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.google_client_id}"
        f"&redirect_uri={settings.google_redirect_uri}"
        f"&response_type=code"
        f"&scope={scopes}"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_oauth_callback(code: str = "", state: str = ""):
    """Handle the OAuth callback from Google."""
    # TODO: Exchange code for tokens, store refresh token in Supabase
    if not code:
        return {"error": "No authorization code received"}

    # Placeholder: in production, exchange code for access + refresh tokens
    return RedirectResponse(url="travelbutler://oauth/success")
