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

        # Skip auth for public endpoints
        if path in PUBLIC_PATHS or path.startswith("/oauth/"):
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse({"detail": "Missing auth token"}, status_code=401)

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
            logger.warning("JWT verification failed: %s", e)
            return JSONResponse({"detail": "Invalid token"}, status_code=401)

        return await call_next(request)
