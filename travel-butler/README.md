# Travel Butler 🧳

A chat-first personal travel butler for business travelers and layovers.
Built with MCP (Model Context Protocol) servers via Dedalus for all external API integrations.

## Architecture

```
travel-butler/
├── apps/mobile        # Expo (React Native + TypeScript) mobile app
├── services/api       # Python FastAPI backend
├── mcp_servers/       # Local MCP tool servers (dev mode)
└── docs/              # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Expo CLI (`npm install -g expo-cli`)
- Supabase project (free tier works)

### 1. Environment Setup
```bash
cp .env.example .env
# Fill in your Supabase URL and anon key at minimum
```

### 2. Mobile App
```bash
cd apps/mobile
npm install
npx expo start
```
 
### 3. Backend API
```bash
cd services/api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

### 4. MCP Servers (Dev Mode)
```bash
cd mcp_servers
pip install -r requirements.txt
# Servers are started automatically by the tool_router in dev mode
```

## Mock Mode

By default, all MCP servers run in **mock mode** returning deterministic fake data.
Set `MCP_MODE=real` in `.env` to enable real API calls (requires provider keys).

## Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Mobile      | Expo, React Native, TypeScript    |
| Styling     | NativeWind (Tailwind for RN)      |
| Navigation  | Expo Router                       |
| Backend     | Python, FastAPI                   |
| DB / Auth   | Supabase                          |
| Tooling     | Dedalus MCP routing               |

## Key Features

- **Chat-first UX** – natural language trip planning
- **Micro-itineraries** – layover & meeting gap plans
- **Flight search/book** via Duffel
- **Hotel search/book** via Booking.com
- **Restaurant reservations** via OpenTable
- **Google Calendar sync** – export events from plans
- **Notion export** – trip summaries as Notion pages
- **Apple Wallet passes** – .pkpass trip cards
