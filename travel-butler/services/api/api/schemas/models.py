"""Pydantic schemas for Travel Butler API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────

class IntentType(str, Enum):
    FLIGHT = "flight"
    HOTEL = "hotel"
    DINING = "dining"
    ITINERARY = "itinerary"
    EXPORT = "export"
    GENERAL = "general"


class BookingStatus(str, Enum):
    PENDING = "pending"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ToolStatus(str, Enum):
    OK = "ok"
    ERROR = "error"
    PENDING = "pending"


# ── Tool Traces (defined first — referenced by Chat models) ─────────

class ToolTraceEvent(BaseModel):
    tool: str
    status: ToolStatus
    latency_ms: float | None = None
    payload_hash: str | None = None
    error: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ── Chat ─────────────────────────────────────────────────────────────

class Intent(BaseModel):
    type: IntentType
    confidence: float = Field(ge=0, le=1)
    entities: dict[str, Any] = Field(default_factory=dict)


class ChatMessage(BaseModel):
    id: str | None = None
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tool_trace: list[ToolTraceEvent] | None = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    intent: Intent | None = None
    tool_trace: list[ToolTraceEvent] = Field(default_factory=list)


# ── Plans ────────────────────────────────────────────────────────────

class PlanStep(BaseModel):
    order: int
    title: str
    description: str
    location: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    travel_minutes: int | None = None
    category: str = "activity"  # flight, hotel, dining, activity, transit


class Plan(BaseModel):
    id: str | None = None
    title: str
    steps: list[PlanStep] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Bookings ─────────────────────────────────────────────────────────

class BookingStep(BaseModel):
    id: str | None = None
    tool_name: str
    payload: dict[str, Any]
    status: BookingStatus = BookingStatus.PENDING
    result: dict[str, Any] | None = None
    error: str | None = None


class BookingConfirmation(BaseModel):
    booking_id: str
    status: BookingStatus
    provider_ref: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    confirmed_at: datetime | None = None


class BookingApproval(BaseModel):
    booking_id: str
    approved: bool


# ── Exports ──────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    trip_id: str
    format: str = "default"


class WalletRequest(BaseModel):
    trip_id: str
