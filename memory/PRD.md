# Biz-Salama - SecureTrade Web App

## Overview
Biz-Salama is Tanzania's trusted escrow marketplace platform for social sellers. The app enables secure transactions between buyers and sellers with escrow protection, verified seller profiles, and mobile money integration.

**Live URL:** https://escrow-link.preview.emergentagent.com
**Custom Domain (Pending):** www.biz-salama.co.tz

---

## What's Been Implemented

### Phase 1: Backend API (COMPLETED)
- [x] FastAPI backend with all CRUD operations
- [x] JWT-based authentication (register/login)
- [x] Products API (create, list, get by ID)
- [x] Orders API (create, track, confirm delivery)
- [x] Escrow state management
- [x] Three-Party Escrow System (Hawker ↔ Supplier ↔ Buyer)
- [x] AI Product Suggestions endpoint
- [x] Forgot Password flow

### Phase 2: React Web App (COMPLETED - April 2026)
- [x] Converted from Expo to React web app for custom domain support
- [x] Beautiful landing page with:
  - Hero section with value proposition
  - Trust indicators and stats
  - How it works section
  - CTA buttons
- [x] Marketplace page with:
  - Product grid with verified badges
  - Search and filter functionality
  - Category selection
  - Sort options (newest, price, rating)
- [x] Product detail page
- [x] Seller profile page
- [x] Login/Register pages with form validation
- [x] Seller Dashboard
- [x] Checkout flow
- [x] Order tracking page

### Phase 3: Design & UX (COMPLETED)
- [x] Dark theme with gold accent colors
- [x] Glass morphism UI effects
- [x] Responsive design (mobile + desktop)
- [x] Framer Motion animations
- [x] Trust badges throughout
- [x] Tailwind CSS styling

---

## Tech Stack

### Frontend (New - React Web App)
- React 18 + TypeScript
- React Router v6
- Tailwind CSS v3.4
- Framer Motion
- Zustand (state management)
- Axios (API calls)
- Lucide React (icons)

### Backend
- FastAPI (Python)
- MongoDB (database)
- JWT authentication
- Pydantic models

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Forgot password

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/{id}` - Get product details
- `GET /api/products/seller/{seller_id}` - Get seller's products

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order details
- `GET /api/orders/mine` - Get my orders
- `PATCH /api/orders/{id}/status` - Update order status

### Three-Party Escrow
- `POST /api/escrow/three-party/create` - Hawker creates stock request
- `GET /api/escrow/three-party/pending` - Supplier's pending requests
- `POST /api/escrow/three-party/approve` - Supplier approves
- `POST /api/escrow/three-party/pay` - Buyer pays
- `POST /api/escrow/three-party/release` - Release escrow funds
- `GET /api/escrow/three-party/my-transactions` - Transaction history

---

## Upcoming Tasks

### P1 - Custom Domain
- [ ] Link www.biz-salama.co.tz via Emergent support
- [ ] Configure DNS at Habari Node

### P1 - Save to GitHub
- [ ] Push code to Bobo-06/Escrow-link repository

### P2 - Real Integrations
- [ ] M-Pesa API integration
- [ ] Selcom payment gateway
- [ ] Smile Identity KYC

---

## Environment Variables

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://escrow-link.preview.emergentagent.com
PORT=3000
```

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
EMERGENT_LLM_KEY=sk-emergent-xxx
BASE_URL=https://escrow-link.preview.emergentagent.com
```

---

## Directory Structure

```
/app
├── backend/
│   └── server.py                # FastAPI backend (all endpoints)
├── frontend/
│   ├── src/
│   │   ├── components/          # React components (Navbar, Footer)
│   │   ├── pages/               # Page components
│   │   │   ├── LandingPage.tsx
│   │   │   ├── Marketplace.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── SellerProfile.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── SellerDashboard.tsx
│   │   │   ├── Checkout.tsx
│   │   │   └── OrderTracking.tsx
│   │   ├── store/               # Zustand auth store
│   │   ├── lib/                 # API utilities
│   │   └── index.css            # Tailwind styles
│   ├── tailwind.config.js
│   └── package.json
├── frontend_expo_backup/        # Original Expo app (backup)
└── memory/
    └── PRD.md
```

---

## Mocked Features
- Payment gateways (M-Pesa, Selcom, Stripe) - simulation mode
- Product images - using placeholder emojis
- SMS notifications - logged but not sent

---

*Last Updated: April 23, 2026*
*Version: 5.0 (React Web App Conversion)*
