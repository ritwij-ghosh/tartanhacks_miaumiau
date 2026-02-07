.PHONY: install-mobile install-api install-mcp dev-mobile dev-api dev-all lint-api

# ── Install ───────────────────────────────────────────

install-mobile:
	cd apps/mobile && npm install

install-api:
	cd services/api && pip install -r requirements.txt

install-mcp:
	cd mcp_servers && pip install -r requirements.txt

install: install-mobile install-api install-mcp

# ── Development ───────────────────────────────────────

dev-mobile:
	cd apps/mobile && npx expo start

dev-api:
	cd services/api && uvicorn api.main:app --reload --port 8000

dev-all:
	@echo "Start API and mobile in separate terminals:"
	@echo "  make dev-api"
	@echo "  make dev-mobile"

# ── Lint / Format ────────────────────────────────────

lint-api:
	cd services/api && python -m ruff check api/

format-api:
	cd services/api && python -m ruff format api/

# ── Misc ─────────────────────────────────────────────

env:
	cp .env.example .env
	@echo "Created .env – fill in your secrets."
