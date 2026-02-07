"""Itinerary JSON schema — the core data structure that flows through the entire system.

Gemini generates this → user reviews → user approves → agent dispatcher executes each step.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Step types — each maps to a specific agent ────────────────────────

class StepType(str, Enum):
    FLIGHT = "flight"
    HOTEL = "hotel"
    RESTAURANT = "restaurant"
    ACTIVITY = "activity"
    TRANSPORT = "transport"
    CALENDAR_EVENT = "calendar_event"
    UBER = "uber"
    UBER_EATS = "uber_eats"


class StepStatus(str, Enum):
    PENDING = "pending"          # Not yet acted on
    SEARCHING = "searching"      # Agent is searching for options
    FOUND = "found"              # Options found, awaiting user choice
    BOOKED = "booked"            # Confirmed booking / reservation
    FAILED = "failed"            # Agent encountered an error
    SKIPPED = "skipped"          # User chose to skip this step


class ItineraryStatus(str, Enum):
    DRAFT = "draft"              # Being built / edited via conversation
    CONFIRMED = "confirmed"      # User approved, ready to execute
    EXECUTING = "executing"      # Agents are processing steps
    COMPLETED = "completed"      # All steps resolved
    CANCELLED = "cancelled"


# ── Sub-models ────────────────────────────────────────────────────────

class Location(BaseModel):
    name: str
    address: str | None = None
    lat: float | None = None
    lng: float | None = None


# ── Itinerary Step ────────────────────────────────────────────────────

class ItineraryStep(BaseModel):
    """One action item in the itinerary (a flight, hotel, dinner, etc.)."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order: int
    type: StepType
    title: str
    description: str | None = None
    date: str                                  # YYYY-MM-DD
    start_time: str | None = None              # HH:MM (24h)
    end_time: str | None = None                # HH:MM (24h)
    location: Location | None = None
    agent: str                                 # which agent handles this
    action_payload: dict[str, Any] = Field(default_factory=dict)
    estimated_price_usd: float = 0.0             # Gemini's price estimate (0 = free)
    status: StepStatus = StepStatus.PENDING
    result: dict[str, Any] | None = None       # agent response / booking confirmation
    notes: str | None = None


# ── Full Itinerary ────────────────────────────────────────────────────

class Itinerary(BaseModel):
    """A complete travel itinerary with ordered steps."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str | None = None
    conversation_id: str | None = None
    title: str
    destination: str
    start_date: str                            # YYYY-MM-DD
    end_date: str                              # YYYY-MM-DD
    status: ItineraryStatus = ItineraryStatus.DRAFT
    steps: list[ItineraryStep] = Field(default_factory=list)
    estimated_total_usd: float = 0.0            # sum of all step prices
    created_at: str | None = None
    updated_at: str | None = None

    def recalculate_total(self) -> None:
        """Recompute estimated_total_usd from steps."""
        self.estimated_total_usd = round(sum(s.estimated_price_usd for s in self.steps), 2)


# ── Agent mapping ─────────────────────────────────────────────────────

STEP_TYPE_TO_AGENT: dict[StepType, str] = {
    StepType.FLIGHT: "flight_agent",
    StepType.HOTEL: "hotel_agent",
    StepType.RESTAURANT: "dining_agent",
    StepType.ACTIVITY: "places_agent",
    StepType.TRANSPORT: "directions_agent",
    StepType.CALENDAR_EVENT: "gcal_agent",
    StepType.UBER: "uber_agent",
    StepType.UBER_EATS: "uber_eats_agent",
}

# Maps agent name → list of MCP tools it can call
AGENT_TOOLS: dict[str, list[str]] = {
    "flight_agent": ["flight.search_offers", "flight.book_order"],
    "hotel_agent": ["hotel.search", "hotel.book"],
    "dining_agent": ["dining.search", "dining.reserve"],
    "places_agent": ["places.search", "places.details"],
    "directions_agent": ["directions.route", "directions.eta"],
    "gcal_agent": ["gcal.batch_create"],
    "uber_agent": [],       # TODO: future Uber MCP
    "uber_eats_agent": [],  # TODO: future Uber Eats MCP
}


# ── API request/response models ──────────────────────────────────────

class ItineraryUpdateRequest(BaseModel):
    """Request to update a specific step in an itinerary."""
    step_id: str
    updates: dict[str, Any]


class ItineraryExecuteRequest(BaseModel):
    """Request to execute (dispatch agents for) an itinerary."""
    itinerary_id: str


class ItineraryResponse(BaseModel):
    """Response containing the full itinerary."""
    itinerary: Itinerary
    message: str | None = None
