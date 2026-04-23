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
- **Frontend**: React 19 + TypeScript, Tailwind v3.4, Framer Motion, Zustand, Axios, Lucide, React Router v6
- **Backend**: FastAPI, MongoDB (motor), JWT + bcrypt, emergentintegrations (Claude), Stripe SDK
- **Payments**: Selcom, M-Pesa Daraja, Stripe, NALA (env-key driven, graceful fallback when keys missing)
- **AI**: Claude Sonnet 4 via Emergent LLM key (support chatbot, dispute mediator, fraud checker)

## What's Been Restored / Implemented (Apr 23, 2026)
- [x] Pulled full codebase from GitHub into `/app`
- [x] Installed Python deps from `backend/requirements.txt` (122 KB `server.py`)
- [x] Installed Node deps via `yarn install` (fresh `node_modules`, new lockfile)
- [x] Configured `/app/backend/.env` with `MONGO_URL`, `DB_NAME=biz_salama_db`, `EMERGENT_LLM_KEY`, `BASE_URL`
- [x] Preserved `/app/frontend/.env` `REACT_APP_BACKEND_URL`
- [x] Supervisor restarted — frontend + backend RUNNING
- [x] Verified landing page, navbar, hero, escrow card render correctly
- [x] Verified APIs 200 OK: `/api/currencies`, `/api/products/public`, `/api/export-categories`, `/api/auth/register`

## SEO / Link Preview Overhaul (Apr 23, 2026)
- [x] Generated branded 1200×630 PNG at `/public/og-image.png` (shield + Biz-Salama + "Shop Safely with Escrow Protection" + ESCROW PROTECTED badge)
- [x] Rewrote `/public/index.html` with: title, description, keywords, canonical, full Open Graph (og:*), Twitter card, apple/PWA tags, `<noscript>` content for crawlers, and two JSON-LD blocks (Organization + WebSite search schema)
- [x] Updated `/public/manifest.json` — brand name, gold theme color (#F59E0B), ink background (#0F172A)
- [x] Added `/public/robots.txt` (disallow /dashboard, /checkout, /track) and `/public/sitemap.xml`
- [x] Installed `react-helmet-async`; wrapped app with `<HelmetProvider>` in `index.tsx`
- [x] Created reusable `<SEO>` component (`src/components/SEO.tsx`) — per-route title/description/OG/Twitter
- [x] Integrated `<SEO>` into LandingPage, Marketplace, ProductDetail, Login (noindex), Register
- [x] Installed `react-snap` + added `postbuild` script in `package.json` → prerenders `/`, `/marketplace`, `/login`, `/register` into real static HTML at build time so WhatsApp / Facebook / Twitter / Google see actual content (not the JS shell)
- [x] `index.tsx` uses `hydrateRoot` when prerendered HTML is present, `createRoot` otherwise

## Three-Party Escrow — Full UI + Public Verify (Apr 23, 2026)
- [x] **5 React components** in `src/components/three-party/`:
  - `ThreePartyTransactionCreator.tsx` — 4-step hawker wizard (item → supplier → split → confirm) with Swahili+English, condition picker, image upload, live commission calculator
  - `EscrowLetterOfComfort.tsx` — shareable "Letter of Comfort" with WhatsApp + SMS deep links for supplier
  - `EscrowVerifyPublic.tsx` — public verify page (no login) fetched from `/api/escrow/verify/{tx_id}`
  - `SupplierConfirmationScreen.tsx` — supplier accept/decline view reached via SMS link
  - `SupplierPortal.tsx` — shop-owner dashboard with hawkers list + recent txs
  - `constants.ts` — shared colors, fmtTSh/fmtK, TX_STATES, API_URL, authHeaders
- [x] Routes in `App.tsx`: `/hawker/new`, `/verify/:txId` (public), `/supplier-confirm/:txId` (public), `/supplier/portal`, `/hawker/edit/:txId`

## Option B — Role-Based Verify + Fee Upgrade + Counter-Offer + Edit Flow (Apr 23, 2026)
- [x] **Fee structure**: 2% supply-side (from supplier payout) + 3% buyer-side (from buyer price). `_compute_three_party_split()` helper enforces invariant `supplier_payout + commission + platform_fee == buyer_price`
- [x] **HMAC signed tokens** for role-scoped verify URLs: `_sign_verify_token(tx_id, role, identifier)` using JWT_SECRET; constant-time compare via `hmac.compare_digest`
- [x] **3 role views** on `/api/escrow/verify/{tx_id}`:
  - Public (no token) — just TX existence + amount locked + bank + status
  - Supplier (valid token + role=supplier) — FULL transparent breakdown: buyer_price, supplier_payout (after 2% fee), hawker commission, supply_fee, buyer_fee, platform_fee, approval_snapshot
  - Buyer (valid token + role=buyer) — item, amount they paid, seller_name (hawker), status — NO supplier info, NO commission
- [x] **Counter-offer flow**: supplier taps "Pendekeza Bei Nyingine" → modal for new supplier_cost + optional note → tx status transitions to `counter_offered`
- [x] **Hawker edit**: `POST /api/escrow/three-party/{tx_id}/edit` (auth'd) lets hawker update buyer_price / supplier_cost / item fields; status resets to `pending_approval`, split recomputed, supplier re-notified (same HMAC token). New page `/hawker/edit/:txId` with pre-filled form + yellow banner when status=`counter_offered` showing supplier's counter + optional note
- [x] **Approval snapshot**: on supplier final accept, `approval_snapshot` dict stored with {buyer_price, supplier_cost, supplier_payout, commission, supply_fee, buyer_fee, platform_fee, approved_by, approved_at, terms_accepted_sw: "Nimekubali bei hizi zote"}. Immutable audit record — supplier cannot later claim they didn't know the commission
- [x] **SupplierConfirmationScreen** redesigned: shows full 4-line breakdown (payout, hawker commission, 2% fee, 3% fee), large primary "Nimekubali bei hizi zote / I agree to all these prices" button + "Pendekeza Bei Nyingine" counter button + "HAPANA" decline
- [x] **Landing page showcase** updated with new fee breakdown (TSh 1,850,000 example → supplier 1,617,000 / hawker 144,500 / platform 88,500)
- [x] Install App button in Navbar + landing page section for 3-party flow (previous session)

## Key Pages (from GitHub code)
- `/` LandingPage — hero, trust indicators, how-it-works, CTA
- `/marketplace` Marketplace — grid, search, filters, sort
- `/product/:id` ProductDetail
- `/seller/:id` SellerProfile
- `/login`, `/register` — phone OR email + password
- `/dashboard` SellerDashboard — products, orders, stats, trade-finance metrics
- `/checkout/:id` Checkout — pick payment method
- `/track/:orderId` OrderTracking — status + confirm delivery

## Key API Endpoints
- **Auth**: `/api/auth/register`, `/login`, `/forgot-password`, `/reset-password`, `/session` (Google), `/me`, `/profile`, `/logout`
- **Products**: `/api/products` (CRUD, seller), `/api/products/public`, `/api/products/detail/{id}`, `/api/pay/{code}`
- **Orders**: `/api/orders`, `/api/orders/{id}`, `/api/seller/orders`, `/orders/{id}/status`, `/orders/{id}/confirm-delivery`, `/rate`, `/dispute`
- **Escrow (3-party Hawker↔Supplier↔Buyer)**: `/api/escrow/three-party/{create,pending,approve,pay,release,my-transactions}`
- **Payments**: `/api/payments/simulate`, Selcom, M-Pesa, Stripe, NALA routes (inside server.py)
- **AI**: `/api/ai/support`, `/api/ai/dispute`, fraud check
- **Dashboard**: `/api/seller/stats`, `/api/seller/trade-history`, `/api/currencies`, `/api/export-categories`

## Live URLs
- Preview: https://salama-secure.preview.emergentagent.com
- Custom domain target: www.biz-salama.co.tz (user will link via Emergent deployment → Custom Domains)

## Next Action Items
- **P0** User triggers **Deploy** from Emergent → Deployments → attaches custom domain `www.biz-salama.co.tz`
- **P1** Add production API keys to backend `.env` for: `STRIPE_SECRET_KEY`, `SELCOM_API_KEY/SECRET/VENDOR`, `MPESA_*`, `NALA_API_KEY/BUSINESS_ID`, `AFRICASTALKING_API_KEY`, `SMILE_IDENTITY_*`
- **P1** Click-Pesa integration (requested) — not yet in codebase. Need Click-Pesa API credentials + integration playbook
- **P2** Seed demo products + sellers so marketplace is not empty on first visit
- **P2** Admin panel route + moderator user role
- **P3** Ratings/reviews UI surface on SellerProfile + ProductDetail

## Mocked / Fallback Behaviour
- **MOCKED** SMS sending (Africa's Talking) — OTPs logged & returned as `demo_otp` when key missing
- **MOCKED** Mobile Money payments fall back to `/api/payments/simulate` when real keys missing
- **MOCKED** Click-Pesa — NOT YET IMPLEMENTED (see P1)
- Exchange rates are static in code (USD=2500, GBP=3200, EUR=2700, KES=18, UGX=0.67, TZS=1)

## Environment Variables
### /app/backend/.env
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="biz_salama_db"
CORS_ORIGINS="*"
JWT_SECRET="biz-salama-secret-change-in-prod-2026"
EMERGENT_LLM_KEY="sk-emergent-xxx" (Universal key)
BASE_URL="https://salama-secure.preview.emergentagent.com"
```
### /app/frontend/.env
```
REACT_APP_BACKEND_URL=https://salama-secure.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

---
*Version 6.0 — GitHub restore on fresh Emergent project, Apr 23, 2026*
