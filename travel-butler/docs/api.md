# API Endpoint Reference

Base URL: `http://localhost:8000`

All protected endpoints require `Authorization: Bearer <supabase_jwt>` header.

---

## Health

### GET /health

```json
// Response 200
{ "status": "ok", "service": "travel-butler-api" }
```

---

## Chat

### POST /chat/send

Send a message and get a response with tool traces.

**Request:**
```json
{
  "message": "Find me a flight from SFO to JFK on Jan 15",
  "conversation_id": "optional-uuid"
}
```

**Response 200:**
```json
{
  "reply": "I found 3 flight options for you...",
  "conversation_id": "uuid",
  "intent": {
    "type": "flight",
    "confidence": 0.7,
    "entities": { "raw": "..." }
  },
  "tool_trace": [
    {
      "tool": "flight.search_offers",
      "status": "ok",
      "latency_ms": 42.1,
      "payload_hash": "abc123"
    }
  ]
}
```

---

## Plans

### POST /plans/generate

Generate a micro-itinerary.

**Request:**
```json
{
  "query": "3 hour layover activities",
  "location": "JFK Airport"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "title": "Plan for JFK Airport",
  "steps": [
    {
      "order": 1,
      "title": "TWA Hotel Lounge",
      "description": "Retro-chic lounge with pool",
      "location": "JFK Terminal 5",
      "category": "activity",
      "travel_minutes": 5
    }
  ],
  "created_at": "2026-01-15T00:00:00"
}
```

### POST /plans/revise

Revise an existing plan with user feedback.

**Request:**
```json
{
  "plan_id": "uuid",
  "feedback": "Skip the museum, add a coffee shop instead",
  "location": "New York"
}
```

---

## Bookings

### POST /bookings/create_steps

Create booking steps for approval.

**Request:**
```json
{
  "type": "hotel",
  "payload": {
    "hotel_id": "htl_mock_001",
    "checkin": "2026-01-15",
    "checkout": "2026-01-17"
  }
}
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "tool_name": "hotel.book",
    "payload": { "hotel_id": "htl_mock_001" },
    "status": "awaiting_approval",
    "result": null,
    "error": null
  }
]
```

### POST /bookings/approve

Approve or reject a booking.

**Request:**
```json
{
  "booking_id": "uuid",
  "approved": true
}
```

**Response 200:**
```json
{
  "booking_id": "uuid",
  "status": "confirmed",
  "provider_ref": "TB-HTL-5678",
  "details": { "total_price": 342.00 },
  "confirmed_at": "2026-01-15T12:00:00"
}
```

### GET /bookings/status/{booking_id}

Get booking status.

**Response 200:**
```json
{
  "booking_id": "uuid",
  "status": "confirmed",
  "provider_ref": "TB-HTL-5678",
  "details": {},
  "confirmed_at": "2026-01-15T12:00:00"
}
```

---

## Exports

### POST /exports/gcal

Export trip events to Google Calendar.

**Request:**
```json
{
  "trip_id": "current",
  "format": "default"
}
```

**Response 200:**
```json
{
  "status": "ok",
  "events_created": 3
}
```

### POST /exports/notion

Export trip to Notion page.

**Request:**
```json
{
  "trip_id": "current",
  "format": "default"
}
```

**Response 200:**
```json
{
  "status": "ok",
  "result": {
    "page_id": "notion_mock_page_001",
    "url": "https://notion.so/mock-page"
  }
}
```

---

## OAuth

### GET /oauth/google/start

Returns Google OAuth consent URL.

**Response 200:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### GET /oauth/google/callback?code=xxx

Handles OAuth callback. Redirects to `travelbutler://oauth/success`.

---

## Wallet

### POST /wallet/pkpass

Generate and download an Apple Wallet .pkpass file.

**Request:**
```json
{
  "trip_id": "current"
}
```

**Response 200:**
- Content-Type: `application/vnd.apple.pkpass`
- Binary .pkpass ZIP file
