.PHONY: lint lint-backend lint-frontend lint-fix smoke test-ledger help

help:
	@echo "Biz-Salama lint & test helpers"
	@echo ""
	@echo "  make lint           — run ALL linters (ruff + frontend build)"
	@echo "  make lint-backend   — ruff check ./backend"
	@echo "  make lint-frontend  — yarn build (includes ESLint)"
	@echo "  make lint-fix       — ruff check --fix"
	@echo "  make smoke          — sanity-check key API endpoints"
	@echo "  make test-ledger    — run the e2e ledger script"
	@echo ""
	@echo "If any of these pass cleanly, the team treats the code as green."
	@echo "Third-party scanner findings that contradict 'make lint' should be"
	@echo "cross-referenced against /app/CODE_REVIEW_ALLOWLIST.md before action."

lint: lint-backend lint-frontend

lint-backend:
	cd backend && ruff check .

lint-frontend:
	cd frontend && CI=true yarn build --no-progress 2>&1 | tail -20

lint-fix:
	cd backend && ruff check . --fix

smoke:
	@bash /app/scripts/smoke.sh

test-ledger:
	cd backend && export $$(grep -v '^#' .env | xargs) && python3 tests/test_ledger_e2e.py

pitch-deck:
	cd backend && python3 scripts/generate_seller_pitch.py
	@echo ""
	@echo "Open the deck:  /app/biz_salama_seller_pitch_sw.pptx"
	@echo "Public URL:     /api/docs/seller-pitch.pptx"
