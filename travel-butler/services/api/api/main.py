"""Travel Butler — FastAPI backend."""

import sys
from pathlib import Path

# Add project root to path so mcp_servers package is importable
_project_root = Path(__file__).resolve().parent.parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.middleware import RequestIdMiddleware, AuthMiddleware
from api.routes import health, chat, plans, bookings, exports, oauth, wallet, profiles

app = FastAPI(
    title="Travel Butler API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

# ── Middleware (order matters: outermost first) ──────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(AuthMiddleware)

# ── Routers ──────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(plans.router, prefix="/plans", tags=["plans"])
app.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
app.include_router(exports.router, prefix="/exports", tags=["exports"])
app.include_router(oauth.router, prefix="/oauth", tags=["oauth"])
app.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])


@app.on_event("startup")
async def startup():
    settings.validate_dev()
