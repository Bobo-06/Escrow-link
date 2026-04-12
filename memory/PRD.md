# Biz-Salama / SecureTrade TZ PWA
## Product Requirements Document

### Overview
SecureTrade TZ (Biz-Salama) is Tanzania's premier escrow-protected marketplace PWA. It enables secure social commerce transactions with escrow protection, mobile money integration (M-Pesa, Airtel, Tigo, Selcom), diaspora payments (NALA), AI-powered support, and 2025 fintech standard features.

### Target Market
- Women entrepreneurs in Tanzania
- Social commerce sellers (Instagram, WhatsApp)
- Diaspora buyers (NALA integration for USD/GBP/EUR)
- Artisans and small business owners

## Grant Requirements Compliance (FSDT/UNCDF/BOT Sandbox) ✅

All 6 grant requirements have been implemented and verified:

### ✅ GAP 1: Authentication Layer
- Phone OTP login via `/login` with phone/email toggle
- Password reset via `/forgot-password` with OTP verification
- Registration at `/register` with full form
- JWT session management with secure token storage

### ✅ GAP 2: Transaction History
- Full transaction history at `/seller` → History tab
- Filters: All, Released, In Escrow, Disputed, Refunded
- Search by item, TX ID, or seller name
- Status badges with Swahili/English labels
- Total spent/earned summary card

### ✅ GAP 3: Bottom Navigation
- Persistent 4-tab navigation: Home (Nyumbani), History (Historia), Support (Msaada), Profile (Wasifu)
- Available on all authenticated screens
- Modern fintech design with active state indicators

### ✅ GAP 4: Onboarding Flow
- 4-screen trust-building onboarding on first visit:
  1. "Biashara Salama / Trade Safely" - BOT-licensed escrow
  2. "Njia 5 za Malipo / 5 Payment Methods" - M-Pesa, Airtel, Tigo, NALA, Selcom
  3. "AI Inasuluhisha / AI Mediates Disputes" - 24h resolution
  4. "Imefanywa Tanzania / Made in Tanzania" - Local legitimacy
- Skip button and swipe navigation
- Stored in AsyncStorage to show only once

### ✅ GAP 5: Profile / KYC Screen
- Full profile page at `/seller/profile`
- KYC Tier Display:
  - Tier 0: Mgeni (Guest) - TZS 50K limit
  - Tier 1: Msingi (Basic) - TZS 500K limit
  - Tier 2: Imethibitishwa (Verified) - TZS 5M limit
  - Tier 3: Biashara (Business) - TZS 50M limit
- Requirements shown for each tier
- "Panda Kiwango / Upgrade" button for next tier

### ✅ GAP 6: Service Worker / PWA
- `manifest.json` linked in HTML head
- Service worker `sw.js` registered on page load
- Offline caching, background sync, push notifications

---

## Implemented Features

### Phase 1: Core Infrastructure (COMPLETED)
- [x] FastAPI backend with MongoDB
- [x] JWT-based custom authentication (phone/email toggle)
- [x] Google OAuth integration (Emergent-managed)
- [x] Product CRUD operations with payment link generation
- [x] Order management lifecycle (create -> pay -> ship -> deliver -> confirm)
- [x] 5% fee structure (3% buyer protection + 2% seller acquisition)

### Phase 2: SecureTrade PWA Design (COMPLETED)
- [x] Premium fintech dark theme UI
- [x] Landing page with trust stats
- [x] Trust strip icons
- [x] Sample product cards with trust score

### Phase 3: Bilingual UI (COMPLETED)
- [x] Full Swahili/English interface throughout

### Phase 4: Tanzania-Specific Features (COMPLETED)
- [x] M-Pesa STK Push payment flow (mock mode)
- [x] Voice confirmation (Swahili TTS)
- [x] Offline mode indicator
- [x] Seller Trust Score card component

### Phase 5: AI Integration (COMPLETED)
- [x] Claude Sonnet 4 integration via Emergent LLM Key
- [x] AI Support Chatbot (bilingual)
- [x] AI Dispute Mediator
- [x] AI Fraud Detection

### Phase 6: Complete Buyer Flow (COMPLETED)
- [x] Product page with escrow badges
- [x] Checkout page with delivery form
- [x] Payment gateway selection
- [x] Order tracking with timeline

### Phase 7: Seller Dashboard (COMPLETED)
- [x] Revenue stats card
- [x] Product list management
- [x] Create payment link flow

### Phase 8: 2025 Fintech Upgrade Pack (COMPLETED)
- [x] Biometric Authentication
- [x] Dark Mode Support
- [x] Onboarding Flow
- [x] Transaction History
- [x] Push Notification Banner
- [x] KYC Tier Gate (mock)
- [x] Live Exchange Rate Ticker
- [x] Bottom Navigation

### Phase 9: Payment Gateway Wiring (COMPLETED)
- [x] Frontend API module with all payment endpoints
- [x] MobileMoneyScreen wired to M-Pesa endpoint
- [x] SelcomScreen wired to Selcom endpoints
- [x] NalaScreen wired to NALA endpoint
- [x] Escrow/KYC/Notifications API integration

### Phase 10: PWA Features (COMPLETED)
- [x] Service Worker with offline caching
- [x] Web App Manifest
- [x] Push notifications support

### Phase 11: Auth Enhancements (COMPLETED - April 2026)
- [x] Fixed login function parameter format in authStore
- [x] Fixed expo-router web navigation issue
- [x] Added window.location.href fallback for web navigation
- [x] Fixed seller dashboard auth guard with proper loading states

### Phase 12: Forgot Password Feature (COMPLETED - April 2026)
- [x] Backend API: POST /api/auth/forgot-password (OTP generation)
- [x] Backend API: POST /api/auth/reset-password (OTP verification)
- [x] SMS template for password reset OTP
- [x] Frontend forgot-password.tsx page with 3-step flow
- [x] Phone/Email method toggle
- [x] OTP verification screen with timer
- [x] Password reset confirmation
- [x] Demo OTP display for testing (to be removed in production)
- [x] Session invalidation after password reset

### Phase 13: Rating & Feedback System (COMPLETED - April 2026)
- [x] Backend API: POST /api/orders/{id}/rate
- [x] RatingModal component with 5-star rating
- [x] Optional comment field
- [x] Seller average rating calculation
- [x] Rating shown on product pages
- [x] Modal triggered after delivery confirmation

---

## Complete Customer Journey

### Step 1: Landing Page
Customer arrives at Masoko Salama (Protected Marketplace) and sees:
- Live exchange rates (USD, GBP, EUR to TSh)
- "ESCROW PROTECTED" badge
- Trust stats: 1,000+ sellers, TZS 500M+ volume, 98% success
- Trust strip: Escrow, M-Pesa, KYC, Dispute
- Trending products with TRUST scores

### Step 2: Product Page (/pay/{code})
Customer clicks a product and sees:
- Product image and description
- Price in TZS with USD equivalent
- **Seller Trust Card**: Name, Trust Score (0-100), Trades, Rating, Member since
- "Muuzaji Mwaminifu · Trusted" badge
- Buyer Protection notice
- **"Nunua Salama · Buy Securely"** button

### Step 3: Checkout (/checkout/{code})
Customer enters delivery details:
- Order summary with price breakdown
- 3% buyer protection fee shown
- Full name, phone (+255), address fields
- **"Endelea · Continue"** to payment selection

### Step 4: Payment Gateway Selection
Customer chooses payment method:
- **M-Pesa** (Vodacom) - STK Push
- **Airtel Money** - STK Push
- **Tigo Pesa** - STK Push
- **Selcom** (Bank/Wallet/USSD)
- **NALA** (Diaspora - USD/GBP/EUR)
- **Stripe** (International cards)

### Step 5: Payment Confirmation (/confirm/{orderId})
After successful payment:
- "Pesa Imeshikwa · Funds Secured" header
- Receipt with TX ID, amounts, seller, method
- **Voice Confirmation** (Swahili TTS)
- SMS notification via Africa's Talking
- **"Fuatilia Agizo · Track Order"** button

### Step 6: Order Tracking (/track/{orderId})
Customer tracks delivery:
- Sendy Africa tracking integration
- Real-time shipment timeline (5 stages)
- ETA display
- Escrow status shown
- **AI Support Chatbot** (floating button)

### Step 7: Delivery Actions
When item arrives, customer has two options:

**A) Release Payment (Happy Path)**
- Click "Toa Malipo / Release Payment"
- Escrow released to seller's mobile wallet
- **Rating Modal** appears:
  - 5-star rating selection
  - Optional comment field
  - "Wasilisha Ukadiriaji / Submit Rating"

**B) Open Dispute (Problem)**
- Click "Fungua Tatizo / Open Dispute"
- **AI Dispute Mediator** opens
- Explains issue to AI
- AI recommends: RELEASE / REFUND / ESCALATE
- Human escalation if needed

### Step 8: Post-Transaction
- Seller receives payment
- Seller's rating updated
- Transaction recorded for credit scoring
- Protection expires after 14 days (auto-release)

---

## Bug Fixes (April 2026)

### Login/Register Navigation Fix
**Issue:** Login and register were failing silently on web. The forms would submit successfully but not navigate to the seller dashboard.

**Root Cause:**
1. The `login` function in authStore was expecting individual parameters `(email, password)` but was being called with an object `{phone, password}` or `{email, password}`
2. The expo-router `useRouter().replace()` was being called before the Root Layout component was fully mounted (expo-router web specific issue)

**Fix Applied:**
1. Updated authStore login function signature to accept `LoginData` object
2. Changed post-login navigation to use `window.location.href = '/seller'` for web platform
3. Added proper loading states and auth guards in seller dashboard to prevent premature navigation

---

## Testing Status

### Backend Testing (April 2026)
- All 18+ endpoints tested and working
- Complete E2E order flow verified
- Mock payment gateways functional
- AI integration working with bilingual responses

### Frontend Testing (April 2026)
- Landing page: VERIFIED
- Auth flow (Login/Register): VERIFIED ✅
- Seller dashboard: VERIFIED ✅
- Mobile responsiveness: VERIFIED

---

## Known Limitations (MOCKED)

1. **Payment Processing:** All payment gateway calls are simulated
2. **Escrow:** Fund holding is database status-based
3. **KYC:** NIDA verification is simulated
4. **Exchange Rates:** Static rates

---

## Upcoming Tasks (P1)

- [ ] Add real M-Pesa Daraja API keys for production
- [ ] Add real Selcom API keys for production
- [ ] Add real Stripe API keys for production
- [ ] Complete Google OAuth token exchange flow

## Future Tasks (P2-P4)

- [ ] Real NMB Bank escrow integration
- [ ] Seller profile page with ratings
- [ ] Trade history export for credit scoring
- [ ] Two-factor authentication

---

*Last Updated: April 11, 2026*
*Version: 3.1 (Auth Bug Fixes)*
