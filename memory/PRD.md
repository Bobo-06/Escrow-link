# CraftHer - Trade Finance Platform for Women Entrepreneurs

## Overview
CraftHer is a secure payment link generator and trade finance platform connecting women entrepreneurs in Tanzania with diaspora buyers worldwide. The platform provides escrow-protected transactions, multi-currency support, and bilingual (English/Kiswahili) interfaces.

## Core Features

### ✅ Implemented Features

#### 1. Authentication System
- **JWT-based Custom Auth**: Registration, login with email/password
- **Google OAuth Integration**: Emergent-managed Google OAuth flow
- **Session Management**: Secure token-based session handling
- **User Types**: Sellers with "Women-Owned Business" verification

#### 2. Seller Dashboard
- **Bilingual Interface**: Full English/Kiswahili support
- **Trade Metrics**: Success rate, completed transactions, repeat buyers
- **Earnings Overview**: Total earnings, escrow balance, international earnings
- **Quick Actions**: Create payment links, view orders
- **NALA Diaspora Card**: Multi-currency payment info (USD, GBP, EUR)

#### 3. Payment Link Generator
- **Product Creation**: Name, price (TZS), description, image upload
- **Diaspora Sales Toggle**: Enable international shipping/payments
- **Export Categories**: Textiles, handicrafts, food, beauty, jewelry, etc.
- **Fee Transparency**: Real-time fee breakdown (3% buyer protection, 2% seller)
- **Unique Link Codes**: Shareable payment links

#### 4. Buyer Flow
- **Product Page**: High-trust design with seller verification, escrow info
- **Multi-Currency**: Support for TZS, USD, GBP, EUR
- **Checkout Process**: Delivery details → Payment selection → Processing
- **Payment Methods**: M-Pesa, Airtel Money, Tigo Pesa, NALA (Diaspora)
- **Order Tracking**: Real-time status with escrow protection display
- **Delivery Confirmation**: Release payment or dispute options

#### 5. Sophisticated Bilingual UI
- **Premium Design**: Deep emerald/teal gradient header with gold accents
- **Trust Signals**: NMB Escrow badges, NALA payment indicators
- **Kiswahili/English**: All screens fully bilingual
- **Mobile-First**: Optimized for 390x844 viewport
- **Premium Elements**: LinearGradients, shadows, modern typography

### Backend API Endpoints
```
POST /api/auth/register    - User registration
POST /api/auth/login       - User login
POST /api/auth/session     - OAuth session exchange
GET  /api/auth/me          - Get current user
POST /api/auth/logout      - Logout

GET  /api/products         - List seller's products
POST /api/products         - Create product
GET  /api/pay/:code        - Get product by payment link code

POST /api/orders           - Create order
GET  /api/orders/:id       - Get order details
POST /api/orders/:id/confirm - Confirm delivery
POST /api/orders/:id/dispute - Create dispute

GET  /api/stats/seller     - Seller statistics
```

### Data Models

#### Users
```
{
  user_id, email, name, phone, business_name,
  is_verified, is_women_owned, auth_type, created_at
}
```

#### Products
```
{
  product_id, seller_id, name, price_tzs, description,
  image, payment_link_code, international_shipping,
  export_category, created_at
}
```

#### Orders
```
{
  order_id, product_id, buyer_name, buyer_phone,
  buyer_location, status, total_paid, protection_fee,
  escrow_status, payment_method, buyer_currency
}
```

## Technology Stack
- **Frontend**: Expo/React Native with file-based routing
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT + Emergent Google OAuth
- **UI Components**: expo-linear-gradient, @expo/vector-icons

## Architecture
```
/app
├── backend/
│   └── server.py           # FastAPI backend (all logic)
└── frontend/
    ├── app/
    │   ├── index.tsx       # Landing page (bilingual)
    │   ├── login.tsx       # Login (bilingual)
    │   ├── register.tsx    # Registration (bilingual)
    │   ├── auth-callback.tsx # OAuth callback
    │   ├── seller/
    │   │   ├── index.tsx   # Dashboard (bilingual)
    │   │   └── create.tsx  # Create product
    │   ├── pay/
    │   │   └── [code].tsx  # Product page
    │   ├── checkout/
    │   │   └── [orderId].tsx # Checkout flow
    │   ├── track/
    │   │   └── [orderId].tsx # Order tracking
    │   └── confirm/
    │       └── [orderId].tsx # Delivery confirmation
    └── src/
        ├── store/
        │   └── authStore.ts # Zustand auth state
        ├── api/
        │   └── api.ts       # API client
        └── components/
            └── LoadingScreen.tsx
```

## Pending/Future Features

### P1 - High Priority
- [ ] Implement Seller Profile & Ratings page
- [ ] Complete product creation success page with sharing

### P2 - Medium Priority
- [ ] Real payment integration (NALA API)
- [ ] Real escrow integration (NMB Bank)
- [ ] Push notifications for order updates

### P3 - Future Enhancements
- [ ] Seller analytics dashboard
- [ ] Buyer reviews and ratings
- [ ] Multi-product orders
- [ ] Inventory management
- [ ] Export documentation assistance

## Mocked/Simulated Features
⚠️ **Payment Flow**: Currently simulated - not connected to real payment providers
⚠️ **Escrow System**: Simulated - not connected to real banking partner

## Environment Variables
```
# Backend
MONGO_URL=mongodb://...
DB_NAME=crafther

# Frontend
EXPO_PUBLIC_BACKEND_URL=https://escrow-link.preview.emergentagent.com
```

## Last Updated
- Date: April 2026
- Session: Sophisticated bilingual UI implementation complete
- Status: Production-ready UI, pending real payment integration
