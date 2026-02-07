# MCP Tool Reference

All tools are called via `tool_router.call_tool(tool_name, payload)`.
In mock mode (`MCP_MODE=mock`), deterministic fake data is returned.

---

## places.search

Search for points of interest.

**Input:**
```json
{
  "query": "coffee shops near Times Square",
  "location": "New York"
}
```

**Output:**
```json
{
  "mock": true,
  "places": [
    {
      "place_id": "ChIJN1t_tDeuEmsR",
      "name": "Central Park",
      "vicinity": "New York, NY",
      "address": "Central Park, New York, NY 10024",
      "rating": 4.8,
      "description": "Iconic 843-acre urban park..."
    }
  ]
}
```

---

## places.details

Get detailed info for a place.

**Input:**
```json
{
  "place_id": "ChIJN1t_tDeuEmsR"
}
```

**Output:**
```json
{
  "mock": true,
  "details": {
    "name": "Central Park",
    "formatted_address": "Central Park, New York, NY 10024",
    "phone": "+1 212-310-6600",
    "website": "https://www.centralparknyc.org",
    "opening_hours": "6:00 AM – 1:00 AM",
    "rating": 4.8,
    "reviews_count": 120000
  }
}
```

---

## directions.route

Get route between two locations.

**Input:**
```json
{
  "origin": "Times Square, NY",
  "destination": "Central Park, NY"
}
```

**Output:**
```json
{
  "mock": true,
  "origin": "Times Square, NY",
  "destination": "Central Park, NY",
  "distance_km": 5.2,
  "duration_minutes": 18,
  "steps": [
    {"instruction": "Head north on Broadway", "distance": "0.3 km"},
    {"instruction": "Turn right on W 42nd St", "distance": "1.2 km"}
  ]
}
```

---

## directions.eta

Get estimated time of arrival.

**Input:**
```json
{
  "origin": "JFK Airport",
  "destination": "The Standard, High Line"
}
```

**Output:**
```json
{
  "mock": true,
  "origin": "JFK Airport",
  "destination": "The Standard, High Line",
  "eta_minutes": 18
}
```

---

## flight.search_offers

Search for flight offers via Duffel.

**Input:**
```json
{
  "query": "SFO to JFK on Jan 15",
  "user_id": "user_123"
}
```

**Output:**
```json
{
  "mock": true,
  "offers": [
    {
      "offer_id": "off_mock_001",
      "airline": "United",
      "flight_number": "UA 234",
      "origin": "SFO",
      "destination": "JFK",
      "departure": "2026-01-15T08:00:00",
      "arrival": "2026-01-15T16:30:00",
      "price": 342.00,
      "currency": "USD",
      "cabin_class": "economy"
    }
  ]
}
```

---

## flight.book_order

Book a flight offer.

**Input:**
```json
{
  "offer_id": "off_mock_001"
}
```

**Output:**
```json
{
  "mock": true,
  "order_id": "ord_mock_001",
  "confirmation_id": "TB-FLT-1234",
  "status": "confirmed",
  "booking_reference": "ABC123"
}
```

---

## hotel.search

Search hotels via Booking.com Demand API.

**Input:**
```json
{
  "city": "New York",
  "checkin": "2026-01-15",
  "checkout": "2026-01-17",
  "guests": 1
}
```

**Output:**
```json
{
  "mock": true,
  "hotels": [
    {
      "hotel_id": "htl_mock_001",
      "name": "The Standard, High Line",
      "location": "New York, NY",
      "price_per_night": 171.00,
      "currency": "USD",
      "rating": 4.4,
      "stars": 4,
      "amenities": ["WiFi", "Gym", "Restaurant", "Bar"]
    }
  ]
}
```

---

## hotel.book

Book a hotel.

**Input:**
```json
{
  "hotel_id": "htl_mock_001",
  "checkin": "2026-01-15",
  "checkout": "2026-01-17"
}
```

**Output:**
```json
{
  "mock": true,
  "booking_id": "bkg_mock_001",
  "confirmation_id": "TB-HTL-5678",
  "status": "confirmed",
  "total_price": 342.00
}
```

---

## dining.search

Search restaurants via OpenTable.

**Input:**
```json
{
  "city": "New York",
  "date": "2026-01-15",
  "time": "19:00",
  "guests": 2
}
```

**Output:**
```json
{
  "mock": true,
  "restaurants": [
    {
      "restaurant_id": "rst_mock_001",
      "name": "Le Bernardin",
      "cuisine": "French Seafood",
      "location": "155 W 51st St, New York, NY",
      "rating": 4.8,
      "price_range": "$$$$",
      "available_times": ["18:00", "19:30", "21:00"]
    }
  ]
}
```

---

## dining.reserve

Make a restaurant reservation.

**Input:**
```json
{
  "restaurant_id": "rst_mock_001",
  "time": "19:30",
  "guests": 2
}
```

**Output:**
```json
{
  "mock": true,
  "reservation_id": "res_mock_001",
  "confirmation_id": "TB-DIN-9012",
  "status": "confirmed",
  "time": "19:30",
  "party_size": 2
}
```

---

## gcal.batch_create

Create multiple Google Calendar events.

**Input:**
```json
{
  "user_id": "user_123",
  "events": [
    {
      "summary": "Flight: SFO → JFK",
      "start": "2026-01-15T08:00:00-08:00",
      "end": "2026-01-15T16:30:00-05:00",
      "description": "United UA 234"
    }
  ]
}
```

**Output:**
```json
{
  "mock": true,
  "created": 1,
  "event_ids": ["evt_mock_000"],
  "failed": []
}
```

---

## notion.export_page

Export trip to a Notion page (falls back to markdown).

**Input:**
```json
{
  "trip_id": "trip_001",
  "user_id": "user_123"
}
```

**Output:**
```json
{
  "mock": true,
  "page_id": "notion_mock_page_001",
  "url": "https://notion.so/mock-travel-butler-page",
  "markdown_fallback": "# NYC Business Trip\n..."
}
```

---

## wallet.generate_pkpass

Generate an Apple Wallet .pkpass file.

**Input:**
```json
{
  "trip_id": "trip_001",
  "user_id": "user_123"
}
```

**Output:**
```json
{
  "mock": true,
  "status": "generated",
  "trip_id": "trip_001",
  "pass_type": "boardingPass",
  "message": "Mock .pkpass generated. Use /wallet/pkpass endpoint to download."
}
```
