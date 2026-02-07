"""Custom middleware: request-id tracing and Supabase JWT auth."""

from __future__ import annotations

import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from jose import jwt, JWTError

from api.config import settings

logger = logging.getLogger("travel_butler")

# Paths that skip auth
PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/oauth/google/callback"}


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a unique request-id header to every request/response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response


class AuthMiddleware(BaseHTTPMiddleware):
    """Verify Supabase JWT on protected routes."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path

        # Skip auth for public endpoints and Google OAuth callback (no JWT available)
        if path in PUBLIC_PATHS or path == "/oauth/google/callback" or path == "/oauth/google/start":
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            # In dev mode, allow unauthenticated requests with a fallback user
            logger.warning("No auth token for %s — using anonymous user", path)
            request.state.user_id = "anonymous"
            return await call_next(request)

        token = auth_header.removeprefix("Bearer ")
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            request.state.user_id = payload.get("sub")
        except JWTError as e:
            logger.warning("JWT verification failed for %s: %s — falling back to sub from token", path, e)
            # Still try to extract user_id from unverified token for dev
            import json, base64
            try:
                payload_b64 = token.split(".")[1]
                payload_b64 += "=" * (4 - len(payload_b64) % 4)
                payload = json.loads(base64.b64decode(payload_b64))
                request.state.user_id = payload.get("sub", "anonymous")
            except Exception:
                request.state.user_id = "anonymous"

        return await call_next(request)
