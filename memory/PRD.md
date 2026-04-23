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
