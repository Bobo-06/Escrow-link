# Biz-Salama — Product Requirements & Status

## Original problem statement
React web app for Biz-Salama, a Tanzanian **secure commerce marketplace** (operating as a Merchant of Record / Commerce Facilitation Service, not an escrow agent — per BoT/Selcom compliance), with custom-domain support. Core requirements:

- Standard marketplace with product listings
- 3-Party Secure Commerce (Hawker ↔ Shop ↔ Buyer), HMAC-segregated views, unlimited 2-way counter-offers
- Direct 2-Party Secure Commerce (Seller ↔ Buyer)
- Bilingual Swahili / English toggle
- Voice search + voice product listing
- PWA install + service worker
- SEO via prerendering bot-intercepts

## Terminology rule (REVISED 2026-11-18 — bank-trusteed escrow is correct)
The platform legitimately operates a **true escrow service backed by an Azania Bank Trust Account** (Azania Trust Services is the trustee under a signed Trust Deed; Biz-Salama is the settlor; buyers are the beneficiaries). Because a licensed bank provides the trusteeship, no BoT PSP licence is required.

**"Escrow" IS a legitimate word to use** in user-facing copy, SMS templates, legal docs, and marketing — provided it is framed as "bank-backed escrow via Azania" or similar. The earlier Feb-10 sweep that replaced "escrow" with "Secure Commerce" was based on the incorrect Merchant-of-Record pivot and should be partially rolled back on the trust badges / Letter of Comfort.

Internal variables, API paths (`/api/escrow/*`), DB fields (`escrow_status`), and component filenames remain correct as-is.

## Tech stack
React 18 (lazy-loaded), TypeScript, Tailwind, FastAPI, MongoDB, JWT auth, brute-force rate limiting, Cloudflare/DNS, Africa's Talking SMS.

## Recent sessions

### 2026-11-19 — Bank-payment tab on Selcom hosted checkout

**Finding:** Which payment tabs render on Selcom's hosted checkout page (bank / card / mobile money) is controlled entirely by Selcom's vendor activation — NOT by the `/v1/checkout/create-order-minimal` payload.

**Probe:** Tried adding `payment_methods: "ALL"` to the signed payload → Selcom returned `resultcode 413 "Unexpected parameter payment_methods found in the payload"`. That field is only valid on the full `/v1/checkout/create-order` endpoint, which our vendor does not use. Reverted the change; `selcom_client.create_checkout_order()` left unchanged.

**Status:** User confirmed bank + card acceptance is already live on their Selcom vendor. The bank tab therefore appears automatically on the hosted page for every new order — no code change needed. Added documentation in `selcom_client.create_checkout_order()` docstring describing this constraint for future agents.

**Verified:** Fresh create-order-minimal probe returns `resultcode: 000` and a live `tza.selcom.online/paymentgw/checkout/...` URL.

### 2026-11-19 — Admin reconcile page + Selcom Wallet Cashin (automated payouts)

**New admin page `/admin/escrow/reconcile`** (`frontend/src/pages/AdminEscrowReconcilePage.tsx`):
- **Today's Position** — live cash + liability cards (Selcom clearing, Azania trust, buyer escrow liability, payables, platform revenue, liquidity shortfall with rose-red warning if positive)
- **Daily Sweep** — pending-sweep table, auto-computed total + narration, two-stage confirm dialog that posts `/admin/escrow/transfer-recorded` with Selcom + Azania bank refs
- **Payouts** — queued/disbursing/paid/failed filter tabs, two per-row actions:
  - **Pay via Selcom** → one-click `POST /admin/payouts/{id}/disburse-via-selcom` (auto-routes network by MSISDN prefix)
  - **Manual record** → modal to `POST /admin/payouts/{id}/manual-record` with Azania IB ref (fallback path)
  - For in-flight payouts: **Poll** button queries Selcom and updates status
- **Per-order Audit Trail** — load escrow_events for any order, rendered as timeline with event type, actor, meta JSON

**Selcom Wallet Cashin integration** (`backend/selcom_client.py` + `backend/server.py`):
- New client functions: `disburse_wallet()` (POST /v1/walletcashin/process), `query_disbursement()` (GET /v1/walletcashin/query), `interpret_cashin_result()` (result-code → paid/pending/failed)
- Utility codes supported: VMCASHIN (M-Pesa), TPCASHIN (Tigo/Yas), AMCASHIN (Airtel), HPCASHIN (HaloPesa), CASHIN (auto-routed)
- MSISDN normalization to 2557XXXXXXXX format + explicit prefix-based network routing helper
- New env var: `SELCOM_PIN` (float PIN) — set via platform secrets card; `_is_cashin_configured()` gate allows simulated path when unset
- New endpoints: `POST /admin/payouts/{id}/disburse-via-selcom`, `POST /admin/payouts/{id}/selcom-status`
- Idempotency: `transid` persisted in payout doc, reused on retries so Selcom never double-pays; initial "claim" update atomically flips queued→disbursing to prevent double-click
- Transport failure (timeout/5xx) does NOT mark failed — admin must poll /selcom-status to resolve
- Ledger `post_payout_paid` fires exactly once on first transition to `paid` (both via initial process and later via query)
- Audit: every disburse/query writes `payout_paid_seller`/`payout_paid_agent` or `mismatch_flagged` to `escrow_events`

**Testing:**
- Full 22-test ledger suite: still passes
- `tests/scripts/test_selcom_disburse.py` — simulated-path E2E (configured=false): dispatch works, double-click returns 400, status poll works, non-admin returns 403
- Offline cashin signing check: field order matches Selcom spec, digest non-empty, network-routing helper correctly maps all 4 Tanzanian prefixes
- Frontend smoke screenshot: all 4 sections render, auth-gated, 10 data-testids present

### 2026-11-18 — Revert to true-escrow ledger + Azania reconciliation workflow

**Trigger:** User confirmed they operate a **true trust / escrow account at Azania Bank** under a signed Trust Deed (Azania Trust Services is the trustee; Biz-Salama is the settlor; buyers are beneficiaries). The July "Merchant of Record" pivot was therefore the wrong compliance narrative. Selcom has also been told the funds-flow model (trust account at Azania).

**Reverted:**
- `backend/ledger.py` — fully rewritten to true-escrow double-entry.
  - New active accounts: `cash_clearing_selcom`, `cash_trust_azania`, `buyer_escrow_liability`, `seller_payable`, `agent_payable`, `platform_revenue`
  - Legacy accounts retained for pre-revert historical entries: `cash_clearing`, `revenue_facilitation`, `cogs_supplier`, `opex_agent_commission`, `escrow_liability`
  - `post_funds_received`: DR `cash_clearing_selcom` / CR `buyer_escrow_liability` (no revenue at receipt)
  - New `post_trust_transfer`: DR `cash_trust_azania` / CR `cash_clearing_selcom` (admin records daily sweep)
  - `post_release`: DR `buyer_escrow_liability` / CR `seller_payable` + `agent_payable` + `platform_revenue` (platform revenue recognised on release)
  - `post_payout_paid`: DR payable / CR `cash_trust_azania`
  - `post_refund`: DR `buyer_escrow_liability` / CR `cash_trust_azania`

**New admin reconciliation endpoints** (`/app/backend/server.py`):
- `GET  /api/admin/escrow/queue`              — orders pending Selcom→Azania sweep + daily total
- `POST /api/admin/escrow/transfer-recorded`  — record the bulk Selcom→Azania sweep (mismatch guard: expected_total must == system)
- `POST /api/admin/payouts/{id}/manual-record` — record manual Azania→seller payout (refuses if Azania trust balance insufficient)
- `POST /api/admin/orders/{id}/refund-recorded` — record manual Azania→buyer refund
- `GET  /api/admin/escrow/reconcile`           — daily position: cash vs liabilities, liquidity shortfall
- `GET  /api/admin/escrow/events/{order_id}`   — append-only audit trail
- `GET  /api/admin/escrow/transfers`           — recent sweep batches

**New append-only audit collection `escrow_events`:**
- Event types: `funds_received`, `trust_transfer_recorded`, `released`, `payout_paid_seller`, `payout_paid_agent`, `fee_sweep_recorded`, `refunded`, `dispute_opened`, `dispute_resolved`, `mismatch_flagged`
- Written automatically by every posting function. Immutable auditor/BoT evidence log.

**Testing:**
- Updated `tests/test_iter10_ledger_http.py` to expect the true-escrow chart & 5 release entries
- Full 22-test ledger suite: 22 passed in 9.48s
- New smoke script `tests/scripts/test_true_escrow_e2e.py`: fund → sweep → release → payout → reconcile → audit trail, all steps verified end-to-end

### 2026-02-10 — Compliance: strip "escrow" from user-facing UI
**Trigger:** Selcom / BoT compliance — the platform must not present itself as an escrow agent (which would require a PSP license). It operates as a Merchant of Record providing Commerce Facilitation.

**Files updated (24 files, ~40 user-visible strings):**
- `frontend/src/i18n/index.tsx` — all EN + SW translations for nav, hero, marketplace, product detail, registration, trust badges
- `frontend/public/index.html` + `manifest.json` — page `<title>`, meta description, Open Graph, Twitter cards, JSON-LD Organization schema, PWA name/description, `<noscript>` fallback
- `frontend/src/components/SEO.tsx` — default title + description
- `frontend/src/components/Navbar.tsx` — dropdown tooltips
- `frontend/src/components/InstallAppButton.tsx` — install prompt copy
- `frontend/src/pages/LandingPage.tsx` — hero SEO copy, 5-step flow diagram, ledger card badge
- `frontend/src/pages/Checkout.tsx`, `Marketplace.tsx`, `Register.tsx`, `Login.tsx`, `VerifyPage.tsx`, `Hawker.tsx`, `SellerDashboard.tsx`, `CreateProductPage.tsx`, `MyOrderPage.tsx` (incl. WhatsApp share text, Web Share title, status banners), `DirectBuyerOfferPage.tsx`, `DirectEscrowCreatePage.tsx`
- `frontend/src/components/three-party/EscrowVerifyPublic.tsx` — audience badge, fee label, guarantee text
- `frontend/src/components/three-party/EscrowLetterOfComfort.tsx` — supplier letter (SW + EN), footer, held-at label
- `frontend/src/components/three-party/ThreePartyTransactionCreator.tsx` — 4-step wizard step footer + supplier SMS explainer + "what happens next" list
- `frontend/src/components/three-party/constants.ts` — `TX_STATES.escrowed.en` label ("Escrowed" → "Funds Secured")

**Terminology mapping applied:**
- "escrow" (EN) → "Secure Commerce" / "Biz-Salama Protected" / "Payment Protection" / "Service Fee"
- "escrow" (SW) → "Biashara Salama" / "Malipo Salama" / "Ulinzi wa Malipo"
- "3-Party Escrow" → "3-Party Secure Commerce" / "Biashara Salama ya Watatu"
- "Escrow Licensed" → "Secure Commerce"
- "CRDB Bank PLC (Escrow Trust)" → "CRDB Bank PLC (Trust Account)"

**Left untouched (per user directive):** internal variables, component filenames (`EscrowLetterOfComfort`, `EscrowVerifyPublic`, `DirectEscrowCreatePage`), API paths (`/api/escrow/*`), DB fields (`escrow_status`), `data-testid` values, code comments, and TX_STATES data keys.

**Verification:** Landing + Marketplace pages smoke-tested in both EN + SW via automated screenshot — no "escrow" text visible.

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
- **P1** — Restore "escrow" / "bank-backed escrow via Azania" language in trust badges + Letter of Comfort (was swept out in Feb-10 compliance task; now legitimate under the Azania trust deed)
- **P1** — Nav / dashboard link to `/admin/escrow/reconcile` for admin users (currently reachable only by direct URL)
- **P2** — Daily reconciliation report job (scheduled cron) that emails the admin the sweep queue + reconcile snapshot
- **P2** — Fee-sweep endpoint (Azania trust → Biz-Salama ops) with manual-record flow + ledger posting
- **P2** — Click-Pesa / AzamPay as backup payment providers (Selcom cashin fallback)
- **P2** — Legal templates: Supplier Agreement, Sample Ledger Report PDF
- **P2** — Refactor `server.py` (now ~7k lines) into routers: `routes/auth.py`, `routes/products.py`, `routes/escrow.py`, `routes/admin_escrow.py`, `routes/orders.py`
- **P2** — Auto-poll `disbursing` payouts via scheduled task (currently manual via Poll button)
- **P3** — Ratings & reviews UI
- **P3** — Native app wrapper (Capacitor / React Native)
- **P3** — Public `/trust` page surfacing the audit results + Azania trust deed to buyers

## Credentials
See `/app/memory/test_credentials.md`. Seed admin: `+255700000001` / `AdminPass123!`.
