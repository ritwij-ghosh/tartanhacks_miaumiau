"""Server-side Supabase client using service role key."""

from __future__ import annotations

from functools import lru_cache
from supabase import create_client, Client

from api.config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Create and cache a Supabase client with the **service role key**.

    ⚠️  This client has full access — never expose to the mobile app.
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
