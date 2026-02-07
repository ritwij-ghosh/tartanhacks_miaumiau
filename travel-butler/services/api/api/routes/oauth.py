"""Google OAuth2 flows.

Two separate OAuth flows:
1. SIGN-IN: Handled client-side via expo-auth-session → Supabase signInWithIdToken.
   No backend involvement needed for sign-in.

2. CALENDAR CONNECTION: After a user is logged in, they can connect their Google
   Calendar. This flow goes through the backend to securely store refresh tokens.
   - GET  /oauth/google/start    → returns consent URL with calendar scopes
   - GET  /oauth/google/callback → exchanges code for tokens, stores in DB
"""

from __future__ import annotations

import logging
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse

from api.config import settings
from api.db.supabase import get_supabase

logger = logging.getLogger("travel_butler.oauth")

router = APIRouter()

# Scopes for Google Calendar access (NOT for sign-in — that uses OIDC scopes)
CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar.events"

# Google OAuth endpoints
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


@router.get("/google/start")
async def google_calendar_start(request: Request):
    """Start the Google Calendar OAuth flow.

    Returns a consent URL that the mobile app opens in a browser.
    The `state` param carries the user_id so the callback can associate tokens.
    """
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Must be logged in to connect Google")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": CALENDAR_SCOPES,
        "access_type": "offline",  # gets refresh_token
        "prompt": "consent",       # always show consent to get refresh_token
        "state": user_id,          # pass user_id through the flow
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_calendar_callback(code: str = "", state: str = "", error: str = ""):
    """Handle the OAuth callback from Google.

    Exchanges the authorization code for access + refresh tokens,
    then stores them in the user_oauth_tokens table.
    """
    if error:
        logger.warning("Google OAuth error: %s", error)
        return RedirectResponse(url="travelbutler://oauth/error")

    if not code:
        return RedirectResponse(url="travelbutler://oauth/error")

    user_id = state
    if not user_id:
        logger.error("No user_id in OAuth state param")
        return RedirectResponse(url="travelbutler://oauth/error")

    # Exchange authorization code for tokens
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.google_redirect_uri,
                },
            )
            resp.raise_for_status()
            tokens = resp.json()
    except Exception as exc:
        logger.error("Token exchange failed: %s", exc)
        return RedirectResponse(url="travelbutler://oauth/error")

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)
    scope = tokens.get("scope", "")

    if not access_token:
        logger.error("No access_token in response")
        return RedirectResponse(url="travelbutler://oauth/error")

    # Store tokens in Supabase (upsert — update if user already connected)
    sb = get_supabase()
    try:
        sb.table("user_oauth_tokens").upsert(
            {
                "user_id": user_id,
                "provider": "google",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "scopes": scope,
                # expires_at = now + expires_in seconds
            },
            on_conflict="user_id,provider",
        ).execute()
        logger.info("Stored Google OAuth tokens for user %s", user_id)
    except Exception as exc:
        logger.error("Failed to store tokens: %s", exc)
        return RedirectResponse(url="travelbutler://oauth/error")

    return RedirectResponse(url="travelbutler://oauth/success")


async def get_google_access_token(user_id: str) -> str | None:
    """Helper: get a valid Google access token for a user.

    Refreshes the token if expired. Returns None if user hasn't connected Google.
    """
    sb = get_supabase()
    result = (
        sb.table("user_oauth_tokens")
        .select("*")
        .eq("user_id", user_id)
        .eq("provider", "google")
        .single()
        .execute()
    )

    if not result.data:
        return None

    # TODO: Check expires_at and refresh if needed using refresh_token
    refresh_token = result.data.get("refresh_token")
    access_token = result.data.get("access_token")

    # For now, try the stored access token. If it fails, refresh it.
    if refresh_token:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    GOOGLE_TOKEN_URL,
                    data={
                        "client_id": settings.google_client_id,
                        "client_secret": settings.google_client_secret,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
                new_access_token = tokens.get("access_token", access_token)

                # Update stored access token
                sb.table("user_oauth_tokens").update(
                    {"access_token": new_access_token}
                ).eq("user_id", user_id).eq("provider", "google").execute()

                return new_access_token
        except Exception as exc:
            logger.warning("Token refresh failed for user %s: %s", user_id, exc)

    return access_token
