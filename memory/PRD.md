# Biz-Salama — Product Requirements & Status

## Original problem statement
React web app for Biz-Salama, a secure escrow marketplace for Tanzania, with custom-domain support. Core requirements:

- Standard marketplace with product listings
- 3-Party Escrow (Hawker ↔ Shop ↔ Buyer), HMAC-segregated views, unlimited 2-way counter-offers
- Direct 2-Party Escrow (Seller ↔ Buyer)
- Bilingual Swahili / English toggle
- Voice search + voice product listing
- PWA install + service worker
- SEO via prerendering bot-intercepts

## Tech stack
React 18 (lazy-loaded), TypeScript, Tailwind, FastAPI, MongoDB, JWT auth, brute-force rate limiting, Cloudflare/DNS, Africa's Talking SMS.

## Recent sessions

### 2026-05-31 — URL/log security audit + CI guard
**Audit findings (live, against Preview):**
- All 134 backend routes use FastAPI path parameters (`/api/.../{id}`). Zero use of `Query()` or `request.query_params` for sensitive data. (PASS)
- Magic-link tokens (`/reset-password?token=…`) are strictly single-use — verified end-to-end. (PASS)
- Path-traversal payloads (`../../etc/passwd`, null byte, overlong ids, Mongo `$ne`, 5000-char ids) all returned safe 404/400, no 500s, no file disclosure. (PASS)
- One real log leak found and fixed: `server.py:841` was logging plaintext OTP + phone into `backend.err.log`. Now logs only `user_id`.

**Hardenings shipped:**
- Removed hardcoded fallback `JWT_SECRET` in `server.py:78`; now `os.environ['JWT_SECRET']` (fail-fast at import).
- Added boot-time `_assert_prod_safety()` startup hook that refuses to launch when `ENV=production` if any of `AT_API_KEY`, `BASE_URL`, or strong (≥16 char) `JWT_SECRET` is missing.
- New CI guard: `/app/scripts/security_lint.py` — scans for log-leaks of `otp/password/token/secret/jwt/nin/pin/api_key/session_token`, `demo_*` response keys, hardcoded fallback secrets, `DEBUG=True`, leftover `# remove in production` markers.
- `/app/backend/tests/test_security_lint.py` — 8 regression tests including the exact pre-fix OTP-leak pattern.
- `/app/.github/workflows/security-lint.yml` — CI workflow on push/PR.

### 2026-04 / 2026-05 — Seller + Admin feature blitz
- Seller add-product, profile edit, send-link (iter 12)
- Seller inventory CRUD (`MyProductsPage.tsx`, `EditProductPage.tsx`, `PATCH /products/{id}`) (iter 13)
- Admin direct seller registration (`admin_sellers.py`, `AdminSellersPage.tsx`) (iter 14)
- Bulk CSV seller import (iter 15)
- Seller self-service KYC docs + admin doc-attach modal (`kyc_docs.py`, `MyDocumentsPage.tsx`) (iter 16)
- Admin onboarding queue + edit-seller modal (iter 17)
- Login brute-force tuning: 8 attempts / 15 min lockout, `POST /api/admin/auth/unlock` (iter 18)
- `.gitignore` fix so `.env` deploys correctly

## Architecture
```
/app
├── backend/
│   ├── server.py                 # monolith, 6.1k lines — to be split
│   ├── admin_sellers.py
│   ├── kyc_docs.py
│   ├── seller_onboarding.py
│   ├── security.py               # brute-force / rate limit
│   ├── ledger.py
│   ├── kyc.py
│   ├── fraud.py
│   ├── client_errors.py
│   └── tests/                    # pytest regression suite
├── frontend/src/                 # React 18 SPA
├── scripts/
│   ├── security_lint.py          # NEW — CI guard
│   └── smoke.sh
└── .github/workflows/
    └── security-lint.yml         # NEW — runs on push/PR
```

## Key endpoints (selected)
- `PATCH /api/products/{product_id}` — update product
- `POST /api/admin/sellers` — admin direct create seller
- `POST /api/admin/sellers/bulk-csv` — bulk CSV import
- `POST /api/auth/set-password-with-token` — single-use magic-link
- `POST /api/admin/auth/unlock` — force-unlock rate-limited identity
- `POST /api/escrow/three-party/{tx_id}/buyer-confirm-delivery` — buyer release
- `GET  /api/escrow/verify/{tx_id}` — supplier/buyer magic-link verify

## Production checklist
- `ENV=production` in deploy env
- `AT_API_KEY` set (Africa's Talking) — otherwise `_assert_prod_safety()` refuses boot
- `BASE_URL=https://www.biz-salama.co.tz` set
- `JWT_SECRET` rotated, ≥16 chars, deployed via secret manager
- `CORS_ORIGINS` whitelists prod domain only
- CI `security-lint.yml` green on the deploy commit

## Backlog (P0 → P3)
- **P2** — Click-Pesa / AzamPay / Selcom real SDK wiring (currently mocked in `ledger.py`)
- **P2** — Refactor `server.py` (6.1k lines) into routers: `routes/auth.py`, `routes/products.py`, `routes/escrow.py`, `routes/orders.py`
- **P3** — Ratings & reviews UI
- **P3** — Native app wrapper (Capacitor / React Native)
- **P3** — Public `/trust` page surfacing the audit results to buyers/sellers

## Credentials
See `/app/memory/test_credentials.md`. Seed admin: `+255700000001` / `AdminPass123!`.
