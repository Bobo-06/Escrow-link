# SecureTrade TZ / Biz-Salama PWA
## Product Requirements Document

### Overview
SecureTrade TZ is Tanzania's premier escrow-protected marketplace PWA. It enables secure social commerce transactions with escrow protection, mobile money integration (M-Pesa, Airtel, Tigo), AI-powered support, and 2025 fintech standard features.

### Target Market
- Women entrepreneurs in Tanzania
- Social commerce sellers (Instagram, WhatsApp)
- Diaspora buyers (NALA integration for USD/GBP/EUR)
- Artisans and small business owners

---

## ✅ Implemented Features

### Phase 1: Core Infrastructure (COMPLETED)
- [x] FastAPI backend with MongoDB
- [x] JWT-based custom authentication
- [x] Phone/Email registration toggle
- [x] Product CRUD operations
- [x] Order management lifecycle
- [x] 5% fee structure (3% buyer protection + 2% seller acquisition)

### Phase 2: SecureTrade PWA Design (COMPLETED)
- [x] Premium fintech UI theme
  - Dark ink (#0a0a0f) header with gold (#c8a96e) accents
  - Emerald (#1a7a5a) for success/security states
  - Surface (#f4f3ef) light backgrounds
- [x] Landing page with trust stats
- [x] Trust strip (Escrow, M-Pesa, KYC, Dispute)
- [x] Sample product card with trust score
- [x] Feature grid (NMB Escrow, NALA Diaspora, AI Support, M-Pesa)

### Phase 3: Bilingual UI (COMPLETED)
- [x] Full Swahili/English interface
- [x] All labels in both languages
- [x] Placeholder text bilingual
- [x] Error messages bilingual

### Phase 4: Tanzania-Specific Features (COMPLETED)
- [x] M-Pesa STK Push payment screen (simulated)
- [x] Voice confirmation (Swahili TTS) - uses expo-speech
- [x] Offline mode indicator - uses @react-native-community/netinfo
- [x] Seller Trust Score card component
- [x] TZS/USD currency display

### Phase 5: AI Integration (COMPLETED)
- [x] Claude Sonnet 4 integration via Emergent LLM Key
- [x] AI Support Chatbot (Swahili/English)
- [x] AI Dispute Mediator with recommendations (RELEASE/REFUND/ESCALATE)
- [x] AI Fraud Detection (risk level analysis)
- [x] Chat session history in MongoDB

### Phase 6: Complete Buyer Flow (COMPLETED)
- [x] Product page with escrow badges
- [x] Checkout page with delivery form
- [x] Payment gateway selection (M-Pesa, Airtel, Tigo, NALA)
- [x] M-Pesa STK Push simulation
- [x] Confirmation page with voice playback
- [x] Order tracking with timeline
- [x] Release payment / Open dispute actions

### Phase 7: Seller Dashboard (COMPLETED)
- [x] Revenue stats card
- [x] Products count, success rate, trust score
- [x] Quick actions (Withdraw, Analytics, Settings)
- [x] Product list with copy link action
- [x] Create payment link flow

### Phase 8: 2025 Fintech Upgrade Pack (COMPLETED - April 2026)
- [x] **Biometric Authentication** - Face ID / Fingerprint (expo-local-authentication)
- [x] **Dark Mode Support** - System-aware theme with persistence
- [x] **Onboarding Flow** - 4-screen trust-building experience
  - Screen 1: Biashara Salama / Trade Safely (Shield icon, gold accent)
  - Screen 2: Njia 5 za Malipo / 5 Payment Methods (Phone icon, green accent)
  - Screen 3: AI Inasuluhisha / AI Mediates Disputes (Scale icon, emerald accent)
  - Screen 4: Imefanywa Tanzania / Made in Tanzania (Flag icon, green accent)
- [x] **Transaction History** - Full history with filter & search
- [x] **Push Notification Banner** - Request permission prompt
- [x] **KYC Tier Gate** - Progressive KYC (NIDA verification, selfie)
- [x] **Live Exchange Rate Ticker** - Real-time TSh/USD/GBP/EUR/KES rates
- [x] **Transaction Receipt** - Shareable receipt with verification link
- [x] **Rating Modal** - Post-transaction 5-star seller rating
- [x] **Bottom Navigation** - Modern fintech nav (Home, History, Support, Profile)

---

## 🔄 In Progress / Upcoming

### P1: Google OAuth Finalization
- [ ] Complete Expo web-browser redirect handling
- [ ] Backend OAuth callback token exchange
- [ ] Zustand auth store integration

### P2: Real Payment Integration
- [ ] NALA API integration for diaspora payments
- [ ] Selcom Pesa gateway
- [ ] Real M-Pesa STK Push via Vodacom API

### P3: Real Escrow Integration
- [ ] NMB Bank escrow account setup
- [ ] Automated fund release on confirmation
- [ ] Dispute fund holding

---

## 📋 Backlog / Future Features

### P4: Advanced Seller Features
- [ ] Seller profile page with ratings
- [ ] Trade history for credit scoring
- [ ] Export readiness certification
- [ ] Women-owned business verification badge

### P5: Enhanced Security
- [ ] KYC integration (Smile Identity)
- [ ] Two-factor authentication
- [ ] Transaction signing with biometrics

### P6: Logistics Integration
- [ ] Sendy Africa integration
- [ ] Real-time delivery tracking
- [ ] Automated delivery confirmation

---

## Architecture

### Frontend Stack
- **Framework:** React Native + Expo
- **Router:** Expo Router (file-based)
- **State:** Zustand
- **UI:** Custom components with SecureTrade theme
- **Icons:** @expo/vector-icons (Ionicons)
- **Auth:** expo-local-authentication (biometric)

### Backend Stack
- **API:** FastAPI (Python)
- **Database:** MongoDB (Motor async driver)
- **Auth:** JWT + bcrypt
- **AI:** Emergent Integrations (Claude Sonnet 4)

### New Components (Phase 8)
```
/app/frontend/src/
├── hooks/
│   ├── useBiometricAuth.ts    # Face ID / Fingerprint
│   └── useDarkMode.ts         # Theme persistence
├── components/
│   ├── BiometricButton.tsx    # Verify identity button
│   ├── OnboardingFlow.tsx     # 4-screen onboarding
│   ├── TransactionHistory.tsx # Full history view
│   ├── ExchangeRateTicker.tsx # Live rates bar
│   ├── KYCGate.tsx            # Progressive verification
│   ├── RatingModal.tsx        # Seller rating
│   ├── BottomNav.tsx          # Modern navigation
│   └── PushNotificationBanner.tsx
```

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Register (phone OR email)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

### Products
- `GET /api/products` - List seller's products
- `POST /api/products` - Create product
- `GET /api/pay/{link_id}` - Public product page

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order details
- `POST /api/orders/{id}/confirm-delivery` - Buyer confirms

### AI
- `POST /api/ai/support` - AI support chatbot
- `POST /api/ai/dispute` - AI dispute mediator
- `POST /api/ai/fraud-check` - Fraud analysis

---

## Testing Notes

### Test Credentials
- Phone: 0712345678
- Email: test@example.com
- Password: any

### Test URLs
- Landing: https://escrow-link.preview.emergentagent.com
- Login: /login
- Register: /register
- Dashboard: /seller

---

## Known Limitations (MOCKED)
1. **Payment Processing:** M-Pesa STK Push is simulated
2. **Escrow:** Fund holding is simulated in DB status
3. **Voice:** Uses browser Web Speech API / expo-speech
4. **Google OAuth:** Button present but flow incomplete
5. **KYC:** NIDA verification is simulated
6. **Exchange Rates:** Static rates (would need live API)

---

*Last Updated: April 11, 2026*
*Version: 2.5 (2025 Fintech Upgrade Pack)*
