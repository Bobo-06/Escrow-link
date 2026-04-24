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
- [ ] **P1a** SEO prerender shim — detect bot User-Agents and serve server-rendered HTML with product/seller OG tags (deployment-safe, no `react-snap`)
- [ ] **P1b** Click-Pesa integration (Tanzania mobile money rail)
- [ ] **P1c** Seed 20–40 realistic Tanzanian products (electronics, fashion, agriculture) to replace dummy data
- [ ] **P1d** Voice features — Swahili voice search, voice product listing, voice AI assistant via OpenAI Whisper + TTS (Emergent LLM key)

## Backlog (P2–P3)
- Discovery UI layer — related products, trending sellers, compare drawer, "lowest price" badge on search
- Admin moderator panel + user role `admin`
- Ratings / reviews surfaced on SellerProfile + ProductDetail
- Tighten CORS (replace `*` with explicit origins when `allow_credentials=True`)
- Add Pydantic `min_length=6` validator on `UserCreate.password`
- Refactor `server.py` (3,484 lines) into routers (`auth.py`, `escrow_2p.py`, `escrow_3p.py`, `payments.py`, `audit.py`)
- Native app wrapper (Capacitor → Play Store / App Store)

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

## Test Results (iteration_1.json)
- Backend: 100% (15/15 PASS) — phone normalization, 3-party escrow, HMAC role views, fee invariant
- Frontend: 100% critical flows — login across 5 phone formats, PWA Install modal, role-scoped verify
- Minor items flagged: CORS `*` + credentials, password min_length validator, invalid-link page contrast

---
*Version 6.1 — Continuing session, Apr 24, 2026*
