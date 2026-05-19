# Biz-Salama - Secure Escrow Marketplace for Tanzania

## Original Problem Statement
Recreate the Biz-Salama escrow marketplace as a **React web app** (not Expo mobile) so that
custom domain `www.biz-salama.co.tz` can be linked and the app can be deployed natively on Emergent.
Source code previously built and saved at: https://github.com/Bobo-06/Escrow-link

## User Choices (Apr 23, 2026 re-setup)
- **1a** Clone & restore from GitHub `Bobo-06/Escrow-link`
- **2a** Payments: Stripe + ClickPesa + Selcom + NALA (environment-variable driven; keys optional)
- **3c** Auth: Custom JWT (phone/email + password) AND Emergent-managed Google OAuth
- **4a–f** All features: Marketplace, Seller Dashboard, Buyer Escrow Checkout, Dispute Resolution, Admin, Ratings/Reviews
- **5b** Design preserved exactly from GitHub (dark + gold Biz-Salama theme)

## Tech Stack
- **Frontend**: React 19 + TypeScript, Tailwind v3.4, Framer Motion, Zustand, Axios, Lucide, React Router v6, react-helmet-async
- **Backend**: FastAPI, MongoDB (motor), JWT + bcrypt, emergentintegrations (Claude), Stripe SDK
- **Payments**: Selcom, M-Pesa Daraja, Stripe, NALA, Click-Pesa (env-key driven, graceful fallback)
- **AI**: Claude Sonnet 4 + OpenAI Whisper + TTS via Emergent LLM key

## Completed Features

### SEO + Link Previews (Apr 23, 2026)
- [x] Branded 1200×630 OG image at `/public/og-image.png`
- [x] Full Open Graph + Twitter + JSON-LD schema in `index.html`
- [x] `react-helmet-async` wired for per-route dynamic tags via `<SEO>` component
- [x] `robots.txt` + `sitemap.xml` published
- [x] (Deferred) `react-snap` removed due to K8s 502 at CI rollout — will re-solve via bot-UA prerender shim

### Three-Party Escrow (Hawker ↔ Supplier ↔ Buyer)
- [x] 5 React components in `src/components/three-party/`: Creator wizard, Letter of Comfort, Public Verify, Supplier Confirmation, Supplier Portal
- [x] Routes: `/hawker/new`, `/verify/:txId`, `/supplier-confirm/:txId`, `/supplier/portal`, `/hawker/edit/:txId`
- [x] **Fee split**: 2% supply-side (from supplier payout) + 3% buyer-side (from buyer price). Invariant enforced by `_compute_three_party_split()`
- [x] **HMAC signed role tokens** (`_sign_verify_token`) — scoped views for Public / Supplier / Buyer on `/api/escrow/verify/{tx_id}`
- [x] **Counter-offer flow** + hawker edit + immutable approval snapshot (Swahili terms accepted)
- [x] Landing page showcase updated with live fee breakdown example

### Auth + Login (Apr 23, 2026 — phone normalization fix)
- [x] `normalize_tz_phone()` accepts `+255XXXXXXXXX`, `255…`, `07…`, `71…`, spaced forms — all normalized to `+255XXXXXXXXX`
- [x] Last-9-digit regex fallback for legacy DB records
- [x] All 5 phone formats verified to authenticate same user (15/15 backend tests PASS)
- [x] Custom JWT session (`session_token` in HttpOnly cookie + `Authorization: Bearer` header) + Emergent Google OAuth

### PWA / Install App (Apr 23, 2026)
- [x] `manifest.json` rewritten: name="Biz-Salama", gold theme (#F59E0B), ink background (#0F172A)
- [x] `InstallAppButton.tsx` with **emerald "Why install?"** + **amber "Seeing React App?"** uninstall-and-reinstall warning (fixes cached-manifest confusion)
- [x] Install button in Navbar + landing page CTA section

## In Progress / Next Up (Apr 24, 2026)
- [x] **P1a** SEO prerender shim — `/api/seo/render/{landing,marketplace,product/:id}` endpoints return full HTML with Open Graph + JSON-LD for bots. Deployment-safe Cloudflare Worker snippet included below (rewrites bot User-Agents to these API paths; humans still get the React SPA). (Apr 24, 2026)
- [ ] **P1b** Click-Pesa integration — DEFERRED pending API credentials from client
- [x] **P1c** Marketplace seed — 29 realistic Tanzanian products across fashion/electronics/home/beauty/food/agriculture via `/app/backend/scripts/seed_marketplace.py`. Idempotent upsert; seed seller `Biz-Salama Verified Collective`. (Apr 24, 2026)
- [x] **P1d** Voice features — Whisper STT via Emergent LLM key. `/api/voice/transcribe` backend endpoint; `<VoiceRecorder>` mic on Marketplace search; `<VoiceProductListingModal>` on SellerDashboard transcribes seller's spoken description, heuristic-parses name/price/category, and publishes via `/api/products`. Supports Swahili + English auto-detect. (Apr 24, 2026)

### Cloudflare Worker — Bot Prerender (deploy after attaching `www.biz-salama.co.tz`)
```js
// Rewrites bot UA requests to the backend SEO render endpoints.
const BOT_UA = /(facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|Googlebot|Bingbot|DuckDuckBot|Applebot|Embedly)/i;
const BACKEND = "https://salama-secure.preview.emergentagent.com";
export default {
  async fetch(req) {
    const url = new URL(req.url);
    const ua = req.headers.get("user-agent") || "";
    if (!BOT_UA.test(ua)) return fetch(req); // human → React SPA
    let target = null;
    if (url.pathname === "/" || url.pathname === "") target = "/api/seo/render/landing";
    else if (url.pathname === "/marketplace") target = "/api/seo/render/marketplace";
    else if (url.pathname.startsWith("/product/")) target = "/api/seo/render/product/" + url.pathname.split("/")[2];
    if (!target) return fetch(req);
    return fetch(BACKEND + target, { headers: { "accept": "text/html" } });
  },
};
```

## Backlog (P2–P3)
- Discovery UI layer — related products, trending sellers, compare drawer, "lowest price" badge on search
- Admin moderator panel + user role `admin`
- Ratings / reviews surfaced on SellerProfile + ProductDetail
- Voice AI assistant loop (STT → Claude → Web Speech API TTS) for in-app support
- Tighten CORS (replace `*` with explicit origins when `allow_credentials=True`)
- Add Pydantic `min_length=6` validator on `UserCreate.password`
- Refactor `server.py` (~3,800 lines) into routers (`auth.py`, `escrow_2p.py`, `escrow_3p.py`, `voice.py`, `seo.py`, `payments.py`, `audit.py`)
- Native app wrapper (Capacitor → Play Store / App Store)
- Optional category dropdown inside voice-listing modal (currently auto-detected, defaults to 'general')

## Shipped Apr 24, 2026 (post-iter2)
- [x] **Buyer Order Page** `/my-orders/:orderId` — dual-mode (supports traditional `order_*` and 3-party `3P_*` IDs); stepper UI; big emerald "📦 Nimepokea bidhaa / Confirm Delivery" button; auto-detects completed state; Swahili+English confirm dialog.
- [x] **Public 3-party buyer confirm-delivery** endpoint `POST /api/escrow/three-party/{tx_id}/buyer-confirm-delivery?token=<hmac>` — no login, HMAC-authed, releases escrow to supplier+hawker+platform.
- [x] **Voice engagement strip** on landing page — `GET /api/products/voice-listed` returns 3 latest voice-created products; `<VoiceListedStrip>` renders cards with "VOICE" mic badges + "Try voice listing" CTA → `/dashboard`. Hides gracefully when empty.
- [x] **Category support** on `ProductCreate` (default `'general'`) + backfilled on all existing products so marketplace filters stay sane for future voice listings.

## Key API Endpoints
- **Auth**: `/api/auth/{register,login,forgot-password,reset-password,session,me,profile,logout}`
- **Products**: `/api/products` (CRUD seller), `/api/products/public`, `/api/products/detail/{id}`, `/api/pay/{code}`
- **Orders**: `/api/orders`, `/api/orders/{id}`, `/api/seller/orders`, `/orders/{id}/status`, `/orders/{id}/confirm-delivery`, `/rate`, `/dispute`
- **3-Party Escrow**: `/api/escrow/three-party/{create,pending,approve,pay,release,my-transactions,edit}`, `/api/escrow/three-party/{tx_id}/supplier-response`
- **Verify**: `/api/escrow/verify/{tx_id}` (public / buyer / supplier via HMAC `?t=&r=`)
- **Payments**: `/api/payments/simulate`, Selcom, M-Pesa, Stripe, NALA routes
- **AI**: `/api/ai/{support,dispute}`, fraud check
- **Dashboard**: `/api/seller/stats`, `/api/seller/trade-history`, `/api/currencies`, `/api/export-categories`

## Key DB Schemas (MongoDB)
- `users`: {user_id, email, phone (+255…), password_hash, name, business_name}
- `user_sessions`: {session_token, user_id, expires_at}
- `three_party_transactions`: {tx_id, hawker_id, hawker_name, supplier_cost, buyer_price, commission, supply_fee, buyer_fee, platform_fee, status, approval_snapshot, supplier_phone}
- `escrow_transactions`, `products`, `orders`

## Environment Variables
### /app/backend/.env
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="biz_salama_db"
CORS_ORIGINS="*"
JWT_SECRET="biz-salama-secret-change-in-prod-2026"
EMERGENT_LLM_KEY="sk-emergent-…"
BASE_URL="https://salama-secure.preview.emergentagent.com"
```
### /app/frontend/.env
```
REACT_APP_BACKEND_URL=https://salama-secure.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

## Live URLs
- Preview: https://salama-secure.preview.emergentagent.com
- Production custom domain: https://www.biz-salama.co.tz (Cloudflare + Emergent native deployment)

## Mocked / Fallback Behaviour
- **MOCKED** SMS sending (Africa's Talking) — OTPs returned as `demo_otp` when key missing
- **MOCKED** Mobile Money → falls back to `/api/payments/simulate` when real keys missing
- **NOT YET IMPLEMENTED** Click-Pesa (scheduled P1)
- Exchange rates static (USD=2500, GBP=3200, EUR=2700, KES=18, UGX=0.67, TZS=1)

## Test Results
- **Iter 2 (Apr 24, 2026)**: 23/23 backend PASS (8 new + 15 regression); 100% critical frontend flows. No critical bugs. Minor: Whisper BadRequestError now mapped → HTTP 400 (fixed post-test). See `/app/test_reports/iteration_2.json`.
- **Iter 1 (Apr 23, 2026)**: 15/15 backend PASS. See `/app/test_reports/iteration_1.json`.

## ⚠️ CRITICAL — Production vs Preview Discrepancy (Apr 24, 2026)
When users report "sign in still failing" or "PWA still shows React atom icon", **check which URL they are using before assuming a code bug**:
- `salama-secure.preview.emergentagent.com` = preview env, has all current fixes
- `www.biz-salama.co.tz` = production custom domain; only has whatever build was last deployed from Emergent → Deployments
- Production backend URL = `https://salama-secure.emergent.host` (different from preview)
- Quick sanity check (preview): `curl -s https://salama-secure.preview.emergentagent.com/logo192.png | python3 -c "from PIL import Image; import sys, io; px=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGBA').getpixel((96,96)); print('Gold ✓' if px[0]>200 and px[1]>150 and px[2]<100 else 'Stale React atom ✗')"`

## 🔥 CRITICAL — CORS Origin Whitelist (MUST NEVER BREAK)
**Root cause of "Network Error" when users register/login on `www.biz-salama.co.tz`**:
Production backend previously had `CORS_ORIGINS="*"` in its env var. Our code filters `*` out (combining `*` with `allow_credentials=True` is invalid per CORS spec) → empty allow-list → every browser request from the custom domain hit `HTTP 400 "Disallowed CORS origin"` and users saw a generic "Network Error" toast.

**Permanent fix (Apr 24, 2026, server.py)**: `_BASELINE_CORS_ORIGINS` is now hardcoded in the backend and ALWAYS includes:
  - `https://www.biz-salama.co.tz`
  - `https://biz-salama.co.tz`
  - `http://localhost:3000`
Env var `CORS_ORIGINS` is additive on top of these baselines. A misset env var can no longer lock out the custom domain. Verified by `grep "CORS allowed origins" /var/log/supervisor/backend.err.log`.

**For any agent touching CORS**: the baseline set MUST include `www.biz-salama.co.tz` and `biz-salama.co.tz`. Do not remove these. Do not let `allow_origins=["*"]` + `allow_credentials=True` coexist — that combination is invalid CORS and some upstream proxies return 400.

## Shipped Apr 24, 2026 (post-iter3) — PWA Icon Rebranding
- [x] **Branded PWA icons** — generated gold shield + white checkmark on dark ink navy via `/app/backend/scripts/generate_icons.py`. Replaces default CRA React atom (RGB cyan `97,218,251`) with brand gold (RGB `251,191,36`). Outputs: `favicon.ico` (multi-res 16/32/48/64), `logo192.png`, `logo512.png`, new `apple-touch-icon.png` (180).
- [x] **Cache-bust** applied via `?v=2` query string in `index.html` + `manifest.json` so browsers and OS install flows force-refresh icons.
- [x] **manifest.json** — added `purpose: "any maskable"` for Android adaptive icons, `description`, `categories`, `scope`, `orientation` for better install experience.
- [x] Verified login on preview works for all 5 phone formats (`+255712345678`, `255712345678`, `0712345678`, `712345678`, spaced) → redirects to `/dashboard`. Issue reported by user was on production domain which still runs a pre-fix build.

## Shipped Apr 25, 2026 (post-iter5) — Bilingual rollout + Discovery UI Layer
- [x] **i18n expansion** — `TRANSLATIONS` dictionary in `/app/frontend/src/i18n/index.tsx` extended with full keys for Hero card, How It Works, 3-Party showcase, Trust section, CTA, Footer, Login, Register, Marketplace (incl. category labels and sort options), Compare drawer, Trending sellers strip, and Product Detail. `biz_lang` localStorage key is the single source of truth.
- [x] **Bilingual wiring** — `Footer.tsx`, `Login.tsx`, `Register.tsx`, `Marketplace.tsx`, `ProductDetail.tsx`, plus the LandingPage `How It Works` / `Three-Party showcase` / `Trust` / `CTA` sections all switch between Swahili and English when the navbar pill is toggled.
- [x] **Discovery — Trending Sellers strip** (`/app/frontend/src/components/TrendingSellersStrip.tsx`) — backed by new `GET /api/sellers/trending?limit=` aggregation endpoint that ranks by active product count. Renders horizontal scroll of seller cards above the marketplace grid; hides gracefully when empty.
- [x] **Discovery — Lowest Price badge** — `/api/products/public` now tags the cheapest product per category as `is_lowest_price: true` (only when ≥2 items in the category and there's actual price differentiation). Marketplace card surfaces a green pill `Tag · Lowest Price` and recolors the price as emerald.
- [x] **Discovery — Compare drawer** — new `compareStore.ts` (zustand persisted, max 4 items) + `<CompareDrawer/>` mounted globally in `App.tsx`. Each marketplace card and PDP exposes a `Scale` toggle. A floating Compare FAB appears once any item is queued; opens a side-by-side drawer that auto-highlights the cheapest item.
- [x] **Discovery — Real ProductDetail + Related Products** — `ProductDetail.tsx` now fetches `/api/products/detail/{id}` (replaces hardcoded "Kitenge Fabric" sample) and renders a Related Products grid powered by new `GET /api/products/related/{id}?limit=` endpoint (same category, sorted by absolute price distance, excludes the original).
- [x] **Test coverage** — `/app/backend/tests/test_iter5_discovery.py` and `/app/test_reports/iteration_5.json`. 8/8 backend + 11/11 frontend PASS. Zero critical or minor issues.

## Shipped Apr 25, 2026 (post-iter6) — Watch / Price-Drop Alerts
- [x] **Backend** — new `product_watches` collection + endpoints: `POST /api/watches`, `GET /api/watches`, `GET /api/watches/check/{product_id}`, `DELETE /api/watches/{watch_id}`. Idempotent watch creation (one per user/product).
- [x] **Price-drop fan-out** — `POST /api/products` schedules `_trigger_price_drop_alerts()` via `asyncio.create_task` (fire-and-forget). When a new product is listed in a watched category at a strictly lower price than the watcher's anchor, an alert is appended to every matching watch (capped to 25 most recent), `last_alerted_at` is bumped, and a bilingual SMS is dispatched via the existing `send_sms()` helper (simulated when `AFRICASTALKING_API_KEY` missing).
- [x] **`<WatchBell/>`** (`/app/frontend/src/components/WatchBell.tsx`) — bell toggle with two variants (`card` for marketplace tiles, `pdp` for product detail). Anonymous click → bilingual "Sign in to watch" toast.
- [x] **`/my-watches`** page (`MyWatchesPage.tsx`) — lists every watch with the cheapest current same-category alternative as a green "View cheaper option · You'd save TZS X" CTA, plus a collapsible alerts history. Empty state directs back to marketplace.
- [x] **Navbar** — desktop bell icon (`desktop-watches-link`) + mobile menu link (`mobile-watches-link`) → `/my-watches`.
- [x] **i18n** — `watch.*`, `watches.*`, `nav.watches` keys (SW + EN).
- [x] **Tests** — `/app/backend/tests/test_iter6_watches.py` and `/app/test_reports/iteration_6.json`. 15/15 backend + 10/10 frontend PASS.

## Shipped Apr 25, 2026 (post-iter7) — Public Seller Profile
- [x] **Backend** — new public `GET /api/sellers/{seller_id}` endpoint returning seller meta (name, badges, location, bio, joined date, products_count, orders_completed) plus the seller's active product list. Route declared *after* `/api/sellers/trending` so FastAPI's literal-first matcher resolves correctly.
- [x] **`SellerProfile.tsx` rewrite** — replaced hardcoded "Mama Biashara" stub with a real fetcher. Header shows verified + women-owned badges, joined date, real stats grid (rating · orders completed · products count). Products grid (`seller-products-grid`) is interactive with per-card test IDs and links to PDP. Loading + 404 states are i18n-aware.
- [x] **Hamburger testid** — `data-testid="navbar-mobile-toggle"` + ARIA attributes added to the mobile menu button (test agent feedback from iter6).
- [x] **Tests** — `/app/test_reports/iteration_7.json`. 8/8 new backend + 23/23 iter5/iter6 regression + 9/9 frontend acceptance criteria PASS. Zero critical or minor issues.

## Shipped Apr 29, 2026 (post-iter10) — Financial Ledger (Double-Entry on Mongo)
User shared a PostgreSQL ledger schema and asked us to implement it. Decision: refactor on Mongo with **1:1 schema mapping**, keep all guarantees (immutable entries, idempotent webhooks, double-entry invariants enforced in code).

- [x] **`/app/backend/ledger.py` — new module**:
  - `calculate_split(mode, deal_value, supplier_cost?)` — canonical fee math. Locked-in fee model: **2% supply + 2% hawker + 3% buyer**. For deal=100k direct → gross=103k, seller=98k, platform=5k. For 3-party deal=100k / supplier=80k → gross=103k, seller=78.4k, agent=19.6k, platform=5k. Invariant `gross == seller + agent + platform` asserted in code (and in tests, across 5 cases including pennies).
  - `post_funds_received` (debit cash_clearing / credit escrow_liability) — idempotent on `(provider, provider_txn_id)`.
  - `post_release` (debit escrow_liability / credit seller_payable + agent_payable + platform_revenue).
  - `post_refund` (reverse of funds_received, for dispute → refund_to_buyer).
  - `post_payout_paid` (debit payable / credit cash_clearing).
  - `assert_balanced(order_id)` — called after every batch; `_post_entries` rejects unbalanced batches before write.
  - Chart of accounts seeded on every startup (idempotent upsert): `cash_clearing`, `escrow_liability`, `seller_payable`, `agent_payable`, `platform_revenue`.
  - Auto-resolve helpers — find disputes older than `DISPUTE_AUTO_RESOLVE_DAYS=3`.

- [x] **HTTP API surface (in `server.py`)**:
  - `GET /api/ledger/accounts` (public) — chart of accounts.
  - `POST /api/ledger/quote` (public) — stateless fee calculator. Validates inputs and returns the canonical split.
  - `GET /api/ledger/order/{id}` (auth) — reconciliation view: order status, ledger position, paid_out, full entries list.
  - `POST /api/payments/webhook` — gateway webhook handler. Idempotent on `(provider, event_id)`. Cross-checks amount against order.gross_amount. Posts funds-received and flips order to `funded`.
  - `POST /api/orders/{id}/release` — buyer-only. Posts release entries, queues payouts.
  - `GET /api/payouts` — scoped by user role (non-admin sees own).
  - `POST /api/payouts/{id}/disburse` — admin-only. **MOCKED** until AzamPay/Selcom keys are wired. Returns `provider_ref="MOCK_xxx"` and posts the payout-paid double-entry.
  - `POST /api/disputes` — open. One open dispute per order.
  - `POST /api/disputes/{id}/resolve` — admin override (release_to_seller | refund_to_buyer).
  - `POST /api/disputes/{id}/agree` — buyer or seller agrees; mutual agreement auto-finalizes.
  - `GET /api/disputes` — scoped.

- [x] **Background task** — `_dispute_auto_resolver_loop()` runs hourly, refunds buyers on disputes older than 3 days that haven't been resolved (pro-buyer default policy nudges sellers to engage).

- [x] **Mongo collections (auto-created)**: `ledger_accounts`, `ledger_entries`, `payment_transactions`, `payouts`, `disputes`, `processed_webhooks`. All include `created_at`/`updated_at` ISO timestamps and `_id` excluded from API responses.

- [x] **Frontend admin page** — `LedgerAdminPage.tsx` at `/admin/ledger`. Reactive Fee Calculator + tabbed Payouts / Disputes / Accounts views. All bilingual (`ledger.*` keys).

- [x] **Tests** — `/app/backend/tests/test_ledger_e2e.py` (direct + 3p + refund + idempotency, all balanced) + `/app/test_reports/iteration_10.json` (22/22 new + 42/42 regression backend, 5/5 frontend, zero issues).

### Mock-only / Deferred
- ⚠️ **Real AzamPay / Selcom disbursement** — will replace the mock `/payouts/{id}/disburse` once the user provides API credentials. From the ledger's perspective, behaviour is identical — success path always ends with `post_payout_paid`.
- ⏭ **Refactor existing `/api/escrow/three-party/*` and `/api/escrow/direct/*` flows to use the new ledger** — deferred to a follow-up iteration. Today's ledger handles fresh orders coming in via `/api/payments/webhook`. Existing escrow flows still use the old direct-write code path.

## Shipped May 19, 2026 (iter11) — Mobile-First Seller Onboarding (5-doc capture)
User asked: "How do I capture certificate of registration, Memart extract, TIN, business license, and national ID for each seller from my phone, and uniquely distinguish each seller?"

- [x] **`/app/backend/seller_onboarding.py`** — REQUIRED_DOCS = `[national_id, business_registration, memart_extract, tin_certificate, business_license]`. Bilingual labels (SW + EN). Phone normalized to `+255XXXXXXXXX` via `normalize_tz_phone` BEFORE uniqueness checks. Phone = primary key, TIN (9-12 digits) = secondary unique key. Returns 409 on either collision so reps can resolve in the field.
- [x] **HTTP API** (auth required for all except required-docs list):
  - `GET /api/onboarding/seller/required-docs` (public) — 5 doc types + SW/EN labels
  - `POST /api/onboarding/seller/start` — creates `seller_onboarding` (status=draft); validates phone + TIN uniqueness
  - `POST /api/onboarding/seller/{id}/doc` — one camera snap at a time (so a flaky 3G connection only loses a single upload)
  - `POST /api/onboarding/seller/{id}/submit` — gated on all 5 docs captured
  - `GET /api/onboarding/seller/{id}` — progress reconcile (no base64 in list view)
  - `GET /api/admin/onboarding/queue` — admin-only review queue
  - `GET /api/admin/onboarding/{id}/doc/{doc_type}` — raw base64 for inspection
  - `POST /api/admin/onboarding/{id}/review` — verified | rejected. On verified: creates seller user with `role='seller'`, `kyc_status='verified'`, `auth_type='password_pending'` (forces password reset on first login). **Auto-sends a bilingual welcome SMS with a password-set link** via existing Africa's Talking helper (simulated until AT key configured).
- [x] **Mobile-first wizard** — `/app/frontend/src/pages/SellerOnboardingPage.tsx` at `/onboard/seller`. 7 steps: business info → 5 doc captures (rear-camera via `<input capture="environment">`) → review → success. Progress bar with `role="progressbar"` + ARIA. Optimizes photos client-side (canvas resize to ≤1600px JPEG 70%) before upload so cellular bandwidth + Mongo doc size stay sane.
- [x] **i18n** — full `onb.*` key set (SW + EN).
- [x] **Mongo schema** — new collection `seller_onboarding` with fields: `onboarding_id, business_name, owner_name, phone (UNIQUE-by-status), tin (UNIQUE-by-status), business_email, location, category, rep_user_id, documents{5}, status (draft|submitted|verified|rejected), created_user_id, submitted_at, reviewed_at, reviewed_by, rejection_reason, created_at, updated_at`.
- [x] **Tests** — `/app/test_reports/iteration_11.json`: 18/18 new backend + 45/45 regression (iter5/6/10) + 6/6 frontend, zero issues. Phone-normalization across 5 formats verified; duplicate-phone and duplicate-TIN both return 409.
- [x] **Polish (iter12)** — added `role="progressbar"` ARIA to the wizard progress bar; auto-SMS on admin verified.

### Operational notes
- Photos stored as base64 inside `seller_onboarding.documents.{doc_type}.image_b64`. Swap to S3 (or equivalent) when the volume justifies it; the API contract doesn't change.
- The dedup is a read-then-write — under bursty concurrent rep traffic, two `start` calls with the same phone could race past the existence check. Mitigation (deferred): add a unique partial index on `(phone, status in [draft,submitted])`.

---
*Version 6.8 — Mobile-first 5-doc seller onboarding, May 19, 2026*


### Code Quality Hardening (Feb 19, 2026)
- [x] Replaced empty/silent `catch {}` blocks across frontend with `console.debug` calls preserving intent comments:
  - `src/pages/MyOrderPage.tsx:163` (Web Share API fallback)
  - `src/pages/HawkerTxEditPage.tsx:33` (tx load failure)
  - `src/components/three-party/SupplierConfirmationScreen.tsx:28, 50` (verify-link & non-JSON error body)
- [x] Moved inline `// eslint-disable-next-line react-hooks/exhaustive-deps` in `HawkerTxEditPage.tsx` to preceding-line position so eslint now respects it (clears recurring warning).
- [x] Reviewed `localStorage` usages — confirmed false positives:
  - `i18n/index.tsx` stores only language preference (non-sensitive)
  - `DirectEscrowCreatePage.tsx` & `VoiceProductListingModal.tsx` read JWT from Zustand-persisted `auth-storage`; this is an app-wide architectural choice. Migration to HttpOnly cookies remains a P2 task (would require backend cookie-session refactor).
- [x] Previously in this session: `random` → `secrets` for OTPs / payment links; empty catch in `WatchBell.tsx`.
- Smoke: frontend compiles cleanly, landing page renders in preview ✅


### Observability — Self-hosted Client-Error Collector (Feb 19, 2026)
- **Why**: After replacing silent `catch {}` blocks with `console.debug`, those signals were still invisible to operators. Built a tiny Sentry-lite so we can see real failures hitting Tanzanian users on flaky 3G — without paying a SaaS bill.
- **Backend** (`/app/backend/client_errors.py` — new module, ~220 lines):
  - `POST /api/client-errors` — public ingest. Returns 202 always (fire-and-forget). Rate-limited per IP to 30 events / minute. Hard size caps (4KB message, 4KB stack, 2KB meta). Unknown levels coerce to `info`.
  - `GET /api/admin/client-errors?level=&since=&q=&limit=` — admin-only filtered listing (substring search on message + URL).
  - `GET /api/admin/client-errors/stats` — totals + last-24h + last-7d + per-level breakdown.
  - `DELETE /api/admin/client-errors?older_than_days=N` — admin purge (no arg = wipe all).
  - Mongo collection `client_errors` with TTL index on `expire_at` (30-day retention) + compound `(level, created_at)` index. Indexes idempotent at startup.
- **Frontend reporter** (`/app/frontend/src/lib/clientErrorReporter.ts`):
  - Installs `window.onerror` + `unhandledrejection` handlers on app boot (from `index.tsx`).
  - Public helper `reportClientError(level, message, meta)` — wired into the 3 catch blocks fixed earlier so debug events ship to the backend.
  - Throttle: max 20 events / minute, dedupe identical signatures within 30s. Uses `navigator.sendBeacon` first (survives page unload), `fetch({keepalive:true})` fallback.
  - Reads `user_id` from Zustand persist key `biz-salama-auth` (no store-import cycle).
- **Admin UI** (`/app/frontend/src/pages/ClientErrorsAdminPage.tsx` → `/admin/client-errors`):
  - Stats cards (24h / 7d / all-time / level breakdown), filters (level, search, limit), purge buttons (>7d & all), expandable detail row (URL, UA, viewport, online status, app version, stack, meta).
  - Gated on the server's 401/403 — no client-side `role` check needed. Linked from `/admin/ledger` header.
- **Verified via curl + screenshot**:
  - Ingest accepts, dedupes, rate-limits.
  - Stats return `{total, last_24h, last_7d, by_level_7d, retention_days}`.
  - Unauthenticated admin endpoints return 401.
  - Admin user `+255700000001 / AdminPass123!` (added to `test_credentials.md`) loads the page and sees all 4 captured events with expandable detail.


### Code Quality Report Round 2 (Feb 19, 2026)

**Applied fixes:**
- **`backend/fraud.py` — `score_order()` refactor**: split the 90-line monolith into 4 small async rule evaluators (`_rule_velocity`, `_rule_self_deal_and_account_age`, `_rule_refund_rate`, `_rule_watchlist`). The main function is now a glue function that fans out rules and tallies points. Cyclomatic complexity dropped from 28 → ≤6. Behavioural sanity-tested: `self_deal` flag still triggers at 60 points; clean orders score 0.
- **`backend/ledger.py` — `calculate_split()` refactor**: extracted `_split_direct`, `_split_three_party`, and `_reconcile_pennies`. The public function is now ~30 lines of declarative glue. Numbers match the existing fixtures (3-party 1,850,000 buyer price → supplier 1,617,000, supply_fee 33,000 — bit-exact with `test_biz_salama.py`).
- **Hardcoded test creds (5 files)**: routed `LOGIN_PHONE`, `LOGIN_PASSWORD`, and `JWT_SECRET` through `os.environ.get(..., DEFAULT)` so CI can override; the documented `+255712345678 / test1234` local dev fixture still works out of the box.
- **Array-index-as-key (14 instances)** in `SellerDashboard`, `Register`, `OrderTracking`, `MyOrderPage`, `LandingPage` (×6), plus `HawkerTxEditPage`, `DirectBuyerOfferPage`, and `SupplierConfirmationScreen` negotiation history. Static lists now use content-based keys (e.g. `step.label`, `item.title`); dynamic negotiation history uses `${by}-${action}-${i}` composite keys.

**Pushed back on (with reasoning):**
- **`is True` / `is False` "26+ instances in `server.py`"**: `grep -nE "is True|is False"` in `server.py` returns **zero** matches. The report's specific line numbers (`453, 528, 873, 4074-4082`) all point to other code patterns. False positive. Additionally, the report's recommended fix (`if x == True`) is anti-Pythonic; PEP 8 says use `if x:` directly. No change made.
- **Hook deps in `SellerProfile`, `ProductDetail`, `LedgerAdminPage`, `ClientErrorsAdminPage`**: the "9+/10+/11+ missing" claim is exaggerated. The actual references are React state setters (`setLoading`, `setNotFound`, …) which React guarantees are stable, plus module-level imports (`api`). Adding them to deps changes nothing. The existing `[id]` / `[level, q, limit]` deps are correct. No change made.
- **`localStorage` flagged in `clientErrorReporter.ts`**: that file only reads `user_id` (non-sensitive — already broadcast publicly via `/api/seller/{id}` etc.). Not a credential. No change made.
- **Oversized components (`LandingPage.tsx` 522 lines, `ThreePartyTransactionCreator.tsx` 516 lines)**: these are visually rich marketing/wizard pages. Mechanical line-count splits create one-shot helper components that aren't reused anywhere — net negative for maintainability. Deferred until/unless we find genuine reuse boundaries.

**Outstanding from the report (deferred):**
- Refactor of `server.py` auth funcs (`register`/`login`/`forgot_password`/`reset_password`) — already on the P2 list; needs route-module extraction to do cleanly.
- Refactor of `seller_onboarding.start_onboarding()` — P2.

**Tests**:
- `python3 -c` smoke for `calculate_split` (direct + three_party + edge errors): all pass, books balance.
- `python3 -c` smoke for `score_order` (self-deal + clean): flags + scores match expectations.
- Frontend webpack compiles cleanly (no new warnings). Landing page renders.


### Code Quality Report Round 3 (Feb 19, 2026)

**Applied fixes:**
- **Empty catch blocks (5)**: `clientErrorReporter.ts` (×2 — beacon/fetch fallbacks), `i18n/index.tsx`, `VoiceListedStrip.tsx`, `TrendingSellersStrip.tsx`, `BuildBadge.tsx` — all now bind the error and `console.debug` it under a `typeof console !== 'undefined'` guard. Comments preserved.
- **`fraud._rule_self_deal_and_account_age` split** (complexity 17 → ≤8 each): now two functions — `_rule_self_deal_by_phone()` (async; returns buyer doc so the next rule can reuse it without a second DB hit) and `_rule_new_account_high_value()` (pure function). Behavioural sanity test: `self_deal` still triggers 60 points, clean orders still score 0.
- **`server.py:get_public_products()` split** (complexity 24 → ~8): extracted `_tag_lowest_price_per_category()` helper. Marketplace endpoint still returns 39 products with correct shape.
- **Test files cleanup (6 files)**:
  - `is True/False` patterns → Pythonic `assert expr` / `assert not (expr)` (10 fixes across `test_iter3_features.py`, `test_iter6_watches.py`, `test_iter11_seller_onboarding.py`)
  - `random.choice` / `random.randint` → `secrets.choice` / `secrets.randbelow + offset` (14 fixes in `test_iter4_phone_pwa.py`, `test_iter3_features.py`, `test_biz_salama.py`). Not strictly required (test fixtures aren't security-sensitive) but silences the linter and removes a non-CSPRNG dependency.
- All 5 affected test files compile under `py_compile`. Backend + frontend smoke-tested clean.

**Pushed back on (third time, with concrete evidence this time):**
- **"`is` / `is not` 49 instances in `server.py`, lines 453, 528, 873, 4074-4082"**: I checked each cited line. Every single one is `is None` / `is not None`. PEP 8 *mandates* this pattern (never use `==` with `None`). The report's automated tool is conflating `is None` with `is True/False`. This claim has appeared in three consecutive rounds — please ask whichever scanner is producing it to differentiate `is None` from `is True/False`, or it will keep wasting review cycles.
- **"Missing hook dependencies — Product, SellerInfo, alive, api, Record, err…"**: again, these are TypeScript types, module-level imports, locally-scoped variables inside the effect closure, or React state setters (`setLoading` etc. — *guaranteed stable by React*). None of these can or should be in the dep array. Adding them either errors at compile time or causes infinite re-render loops. The existing deps (`[id]`, `[limit]`, `[level, q, limit]`) are correct.
- **`localStorage in clientErrorReporter.ts:59`**: only reads `user_id`, which is public and broadcast via `/api/seller/{id}` and `/seller/{id}` profile pages. Not a credential.
- **Oversized components**: addressed in Round 2 — these are visually-rich pages where mechanical splits hurt maintainability. No reuse boundaries identified.
- **"Python: Undefined Variables (11 instances)"**: report provided no file or line numbers. Can't act on it. Linting `/app/backend/` with `ruff` (which has the equivalent rule `F821`) reports zero undefined references, so this is likely another false-positive class from the scanner.

**Outstanding (deferred):**
- `server.py` auth funcs (`register`/`login`/`forgot_password`/`reset_password`) complexity — needs the broader route-module extraction. P2.
- `seller_onboarding.start_onboarding()` (complexity 21) refactor. P2.
- `normalize_tz_phone()` complexity 11 — currently consolidates 5 phone-format normalizations in one place; splitting it loses readability. Will leave unless it grows further.
