"""Application configuration — reads from environment."""

from __future__ import annotations

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = "https://your-project.supabase.co"
    supabase_anon_key: str = "your-anon-key"
    supabase_service_role_key: str = "your-service-role-key"
    supabase_jwt_secret: str = "your-jwt-secret"

    # MCP
    mcp_mode: str = "mock"  # "mock" | "real"
    dedalus_url: str | None = None
    dedalus_api_key: str | None = None

    # Google
    google_places_api_key: str = ""
    google_maps_api_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/oauth/google/callback"

    # Providers
    duffel_api_token: str = ""
    bookingcom_api_key: str = ""
    bookingcom_affiliate_id: str = ""
    opentable_api_key: str = ""
    notion_api_key: str = ""

    # Wallet
    wallet_pass_type_id: str = "pass.com.example.travelbutler"
    wallet_team_id: str = ""
    wallet_cert_path: str = "certs/pass.pem"
    wallet_key_path: str = "certs/pass.key"
    wallet_wwdr_path: str = "certs/wwdr.pem"

    # App
    api_base_url: str = "http://localhost:8000"
    log_level: str = "DEBUG"

    # Gemini
    gemini_api_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    def validate_dev(self) -> None:
        """Warn about placeholder values in dev so nothing silently breaks."""
        import logging

        logger = logging.getLogger("travel_butler")
        if self.mcp_mode == "mock":
            logger.info("Running in MOCK mode — all MCP tools return fake data.")
        placeholders = {
            "supabase_url": "your-project",
            "supabase_anon_key": "your-anon-key",
        }
        for field, sentinel in placeholders.items():
            if sentinel in getattr(self, field):
                logger.warning(
                    "Config %s still has placeholder value — set it in .env",
                    field,
                )


settings = Settings()
