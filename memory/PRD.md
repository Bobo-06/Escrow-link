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

---
*Version 6.3 — PWA icon rebranding + production-vs-preview disambiguation, Apr 24, 2026*
