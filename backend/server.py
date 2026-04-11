from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, UploadFile, File, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt
import base64
import random
import string
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'crafther-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# Emergent LLM Key for Claude AI
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# AI System Prompts
AI_SUPPORT_SYSTEM = """You are SecureTrade's customer support assistant for Tanzania.
You help buyers and sellers with: how escrow works, payment methods (M-Pesa, Airtel, card),
tracking orders, understanding fees, and account issues.
You ALWAYS:
- Reply in Swahili first, then English
- Be warm and reassuring — many users are new to escrow
- Keep answers under 3 sentences on mobile
- For payment issues, always say "Pesa yako ipo salama / Your money is safe" first
- Escalate to human if: fraud allegation, amount > 2M TZS, or user distress"""

AI_DISPUTE_SYSTEM = """You are SecureTrade's dispute mediator AI for the Tanzanian market.
You analyze disputes between buyers and sellers in social commerce transactions.
You ALWAYS:
- Respond in both Swahili and English (Swahili first)
- Ask for evidence: photos, screenshots, delivery receipts
- Recommend one of three outcomes: RELEASE (to seller), REFUND (to buyer), ESCALATE (human review)
- Explain your reasoning clearly and fairly
- Never take sides until evidence is reviewed
- Keep responses concise — many users are on mobile data
Context: This is an escrow platform. Funds are frozen during dispute."""

AI_FRAUD_SYSTEM = """You analyze social commerce transactions for fraud risk in Tanzania.
Given transaction details, you output a risk assessment.
Respond ONLY in JSON: { "risk_level": "low|medium|high", "reasons": ["reason1", "reason2"], "recommended_action": "action" }"""

# Create the main app
app = FastAPI(
    title="CraftHer Trade Finance API", 
    description="Trade-Finance Infrastructure for Women Entrepreneurs - Connecting Diaspora Buyers to African Producers"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== CURRENCY & EXCHANGE RATES ==============
# Mock exchange rates (in production, fetch from API)
EXCHANGE_RATES = {
    "USD": 2500,   # 1 USD = 2500 TZS
    "GBP": 3200,   # 1 GBP = 3200 TZS
    "EUR": 2700,   # 1 EUR = 2700 TZS
    "KES": 18,     # 1 KES = 18 TZS (Kenya)
    "UGX": 0.67,   # 1 UGX = 0.67 TZS (Uganda)
    "TZS": 1       # Base currency
}

SUPPORTED_CURRENCIES = ["USD", "GBP", "EUR", "KES", "UGX", "TZS"]

# Export categories for women-led businesses
EXPORT_CATEGORIES = [
    "textiles_fashion",
    "handicrafts_art",
    "food_beverages",
    "beauty_cosmetics",
    "jewelry_accessories",
    "home_decor",
    "agricultural_products",
    "other"
]

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    name: str
    business_name: Optional[str] = None
    is_women_owned: bool = True  # Default to women-owned for this platform
    business_type: Optional[str] = None
    export_enabled: bool = False

class UserLogin(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

class ProductCreate(BaseModel):
    name: str
    price: float  # Price in base currency (TZS)
    currency: str = "TZS"  # Base pricing currency
    description: Optional[str] = None
    image: Optional[str] = None
    export_category: Optional[str] = None
    international_shipping: bool = False
    shipping_countries: Optional[List[str]] = None

class OrderCreate(BaseModel):
    product_id: str
    buyer_name: str
    buyer_phone: str
    buyer_location: str
    buyer_country: str = "TZ"  # ISO country code
    payment_method: str  # mpesa, airtel, tigo, nala
    buyer_currency: str = "TZS"

class DisputeCreate(BaseModel):
    reason: str

class PaymentSimulate(BaseModel):
    order_id: str
    payment_method: str

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict] = None

class FraudCheckRequest(BaseModel):
    item: str
    amount: float
    seller_age_days: int
    buyer_age_days: int
    price_vs_market: int  # percentage of market price

# ============== HELPER FUNCTIONS ==============

def generate_payment_link_code():
    """Generate unique 8-character payment link code"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

def convert_currency(amount: float, from_currency: str, to_currency: str) -> Dict:
    """Convert between currencies with tracking"""
    if from_currency == to_currency:
        return {"amount": amount, "rate": 1, "from": from_currency, "to": to_currency}
    
    # Convert to TZS first, then to target
    tzs_amount = amount * EXCHANGE_RATES.get(from_currency, 1)
    target_amount = tzs_amount / EXCHANGE_RATES.get(to_currency, 1)
    
    return {
        "amount": round(target_amount, 2),
        "tzs_amount": round(tzs_amount, 2),
        "rate": EXCHANGE_RATES.get(from_currency, 1) / EXCHANGE_RATES.get(to_currency, 1),
        "from": from_currency,
        "to": to_currency
    }

def calculate_fees(price: float, is_international: bool = False):
    """
    Calculate fees with international premium
    - Buyer protection: 3% (domestic) or 2% (international - lower to encourage diaspora)
    - Seller acquisition: 2%
    """
    if is_international:
        buyer_fee_rate = 0.02  # Reduced for diaspora buyers
    else:
        buyer_fee_rate = 0.03
    
    seller_fee_rate = 0.02
    
    buyer_fee = round(price * buyer_fee_rate, 2)
    seller_fee = round(price * seller_fee_rate, 2)
    
    return {
        'buyer_protection_fee': buyer_fee,
        'seller_acquisition_fee': seller_fee,
        'total_buyer_pays': round(price + buyer_fee, 2),
        'seller_receives': round(price - seller_fee, 2),
        'fee_rate': buyer_fee_rate
    }

async def get_current_user(request: Request) -> dict:
    """Get current user from session token (cookie or header)"""
    session_token = request.cookies.get('session_token')
    
    if not session_token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            session_token = auth_header.split(' ')[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one(
        {"user_id": session['user_id']},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

def calculate_trade_metrics(transactions: List[dict]) -> dict:
    """Calculate trade finance metrics for a seller"""
    if not transactions:
        return {
            "total_transactions": 0,
            "successful_transactions": 0,
            "success_rate": 0,
            "total_volume_tzs": 0,
            "international_orders": 0,
            "repeat_buyers": 0,
            "avg_order_value": 0,
            "credit_score_eligible": False
        }
    
    successful = [t for t in transactions if t.get('status') == 'completed']
    international = [t for t in transactions if t.get('buyer_country', 'TZ') != 'TZ']
    
    # Count repeat buyers
    buyers = {}
    for t in transactions:
        buyer_phone = t.get('buyer_phone', '')
        buyers[buyer_phone] = buyers.get(buyer_phone, 0) + 1
    repeat_buyers = len([b for b, count in buyers.items() if count > 1])
    
    total_volume = sum(t.get('total_paid', 0) for t in successful)
    
    return {
        "total_transactions": len(transactions),
        "successful_transactions": len(successful),
        "success_rate": round(len(successful) / len(transactions) * 100, 1) if transactions else 0,
        "total_volume_tzs": total_volume,
        "international_orders": len(international),
        "repeat_buyers": repeat_buyers,
        "avg_order_value": round(total_volume / len(successful), 2) if successful else 0,
        "credit_score_eligible": len(successful) >= 5 and (len(successful) / len(transactions)) >= 0.8
    }

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    """Register new women entrepreneur seller with phone or email"""
    # Require at least phone or email
    if not user_data.email and not user_data.phone:
        raise HTTPException(status_code=400, detail="Tafadhali weka barua pepe au nambari ya simu / Please provide email or phone number")
    
    # Check for existing user by email or phone
    if user_data.email:
        existing = await db.users.find_one({"email": user_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Barua pepe tayari imesajiliwa / Email already registered")
    
    if user_data.phone:
        existing = await db.users.find_one({"phone": user_data.phone})
        if existing:
            raise HTTPException(status_code=400, detail="Nambari ya simu tayari imesajiliwa / Phone number already registered")
    
    hashed_password = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    auth_type = "email" if user_data.email else "phone"
    
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "business_name": user_data.business_name,
        "picture": None,
        "password_hash": hashed_password,
        "is_verified": True,
        "is_women_owned": user_data.is_women_owned,
        "business_type": user_data.business_type,
        "export_enabled": user_data.export_enabled,
        "auth_type": auth_type,
        "created_at": datetime.now(timezone.utc),
        # Trade finance tracking
        "total_sales_tzs": 0,
        "successful_orders": 0,
        "international_orders": 0
    }
    
    await db.users.insert_one(user)
    
    session_token = f"session_{uuid.uuid4().hex}"
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "business_name": user_data.business_name,
        "picture": None,
        "is_verified": True,
        "is_women_owned": user_data.is_women_owned,
        "business_type": user_data.business_type,
        "export_enabled": user_data.export_enabled,
        "auth_type": auth_type,
        "created_at": user["created_at"].isoformat(),
        "session_token": session_token
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    """Login with email/phone and password"""
    # Require at least email or phone
    if not credentials.email and not credentials.phone:
        raise HTTPException(status_code=400, detail="Tafadhali weka barua pepe au nambari ya simu / Please provide email or phone number")
    
    # Find user by email or phone
    if credentials.email:
        user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    else:
        user = await db.users.find_one({"phone": credentials.phone}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Taarifa si sahihi / Invalid credentials")
    
    if user.get('auth_type') == 'google':
        raise HTTPException(status_code=400, detail="Please login with Google")
    
    if not bcrypt.checkpw(credentials.password.encode(), user['password_hash'].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    session_token = f"session_{uuid.uuid4().hex}"
    session = {
        "user_id": user['user_id'],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user_id": user['user_id'],
        "email": user['email'],
        "name": user['name'],
        "phone": user.get('phone'),
        "business_name": user.get('business_name'),
        "picture": user.get('picture'),
        "is_verified": user.get('is_verified', True),
        "is_women_owned": user.get('is_women_owned', True),
        "business_type": user.get('business_type'),
        "export_enabled": user.get('export_enabled', False),
        "auth_type": user['auth_type'],
        "created_at": user['created_at'].isoformat() if isinstance(user['created_at'], datetime) else user['created_at'],
        "session_token": session_token
    }

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange Emergent OAuth session_id for session token"""
    body = await request.json()
    session_id = body.get('session_id')
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if res.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            oauth_data = res.json()
        except Exception as e:
            logger.error(f"OAuth error: {e}")
            raise HTTPException(status_code=500, detail="Authentication failed")
    
    email = oauth_data.get('email')
    name = oauth_data.get('name')
    picture = oauth_data.get('picture')
    
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user['user_id']
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "phone": None,
            "business_name": None,
            "picture": picture,
            "is_verified": True,
            "is_women_owned": True,
            "business_type": None,
            "export_enabled": False,
            "auth_type": "google",
            "created_at": datetime.now(timezone.utc),
            "total_sales_tzs": 0,
            "successful_orders": 0,
            "international_orders": 0
        }
        await db.users.insert_one(user)
    
    session_token = f"session_{uuid.uuid4().hex}"
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "user_id": user['user_id'],
        "email": user['email'],
        "name": user['name'],
        "phone": user.get('phone'),
        "business_name": user.get('business_name'),
        "picture": user.get('picture'),
        "is_verified": user.get('is_verified', True),
        "is_women_owned": user.get('is_women_owned', True),
        "export_enabled": user.get('export_enabled', False),
        "auth_type": user['auth_type'],
        "created_at": user['created_at'].isoformat() if isinstance(user['created_at'], datetime) else user['created_at'],
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user with trade metrics"""
    user = await get_current_user(request)
    
    # Get trade metrics
    orders = await db.orders.find({"seller_id": user['user_id']}, {"_id": 0}).to_list(1000)
    trade_metrics = calculate_trade_metrics(orders)
    
    return {
        "user_id": user['user_id'],
        "email": user['email'],
        "name": user['name'],
        "phone": user.get('phone'),
        "business_name": user.get('business_name'),
        "picture": user.get('picture'),
        "is_verified": user.get('is_verified', True),
        "is_women_owned": user.get('is_women_owned', True),
        "business_type": user.get('business_type'),
        "export_enabled": user.get('export_enabled', False),
        "auth_type": user['auth_type'],
        "created_at": user['created_at'].isoformat() if isinstance(user['created_at'], datetime) else user['created_at'],
        "trade_metrics": trade_metrics
    }

@api_router.put("/auth/profile")
async def update_profile(request: Request):
    """Update user profile"""
    user = await get_current_user(request)
    body = await request.json()
    
    update_data = {}
    allowed_fields = ['name', 'phone', 'business_name', 'is_women_owned', 'business_type', 'export_enabled']
    for field in allowed_fields:
        if field in body:
            update_data[field] = body[field]
    
    if update_data:
        await db.users.update_one(
            {"user_id": user['user_id']},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user['user_id']}, {"_id": 0})
    return {
        "user_id": updated_user['user_id'],
        "email": updated_user['email'],
        "name": updated_user['name'],
        "phone": updated_user.get('phone'),
        "business_name": updated_user.get('business_name'),
        "picture": updated_user.get('picture'),
        "is_verified": updated_user.get('is_verified', True),
        "is_women_owned": updated_user.get('is_women_owned', True),
        "business_type": updated_user.get('business_type'),
        "export_enabled": updated_user.get('export_enabled', False),
        "auth_type": updated_user['auth_type'],
        "created_at": updated_user['created_at'].isoformat() if isinstance(updated_user['created_at'], datetime) else updated_user['created_at']
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get('session_token')
    if not session_token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            session_token = auth_header.split(' ')[1]
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============== PRODUCT ENDPOINTS ==============

@api_router.post("/products")
async def create_product(product: ProductCreate, request: Request):
    """Create a new product/payment link with multi-currency support"""
    user = await get_current_user(request)
    
    # Validate currency
    if product.currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency. Supported: {SUPPORTED_CURRENCIES}")
    
    # Convert price to TZS for storage
    price_tzs = product.price * EXCHANGE_RATES.get(product.currency, 1)
    
    fees = calculate_fees(price_tzs, is_international=product.international_shipping)
    payment_link_code = generate_payment_link_code()
    
    while await db.products.find_one({"payment_link_code": payment_link_code}):
        payment_link_code = generate_payment_link_code()
    
    product_data = {
        "product_id": f"prod_{uuid.uuid4().hex[:12]}",
        "seller_id": user['user_id'],
        "seller_name": user['name'],
        "seller_business": user.get('business_name'),
        "seller_is_women_owned": user.get('is_women_owned', True),
        "name": product.name,
        "price": product.price,
        "price_tzs": price_tzs,
        "currency": product.currency,
        "description": product.description,
        "image": product.image,
        "payment_link_code": payment_link_code,
        "export_category": product.export_category,
        "international_shipping": product.international_shipping,
        "shipping_countries": product.shipping_countries or [],
        "buyer_protection_fee": fees['buyer_protection_fee'],
        "seller_acquisition_fee": fees['seller_acquisition_fee'],
        "total_buyer_pays": fees['total_buyer_pays'],
        "seller_receives": fees['seller_receives'],
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.products.insert_one(product_data)
    
    return {
        "product_id": product_data["product_id"],
        "seller_id": product_data["seller_id"],
        "seller_name": product_data["seller_name"],
        "seller_business": product_data["seller_business"],
        "seller_is_women_owned": product_data["seller_is_women_owned"],
        "name": product_data["name"],
        "price": product_data["price"],
        "price_tzs": product_data["price_tzs"],
        "currency": product_data["currency"],
        "description": product_data["description"],
        "image": product_data["image"],
        "payment_link_code": product_data["payment_link_code"],
        "export_category": product_data["export_category"],
        "international_shipping": product_data["international_shipping"],
        "shipping_countries": product_data["shipping_countries"],
        "buyer_protection_fee": product_data["buyer_protection_fee"],
        "seller_acquisition_fee": product_data["seller_acquisition_fee"],
        "total_buyer_pays": product_data["total_buyer_pays"],
        "seller_receives": product_data["seller_receives"],
        "is_active": product_data["is_active"],
        "created_at": product_data["created_at"].isoformat()
    }

@api_router.get("/products")
async def get_my_products(request: Request):
    """Get all products for current seller"""
    user = await get_current_user(request)
    
    products = await db.products.find(
        {"seller_id": user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for p in products:
        if isinstance(p.get('created_at'), datetime):
            p['created_at'] = p['created_at'].isoformat()
    
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str, request: Request):
    """Get single product (seller view)"""
    user = await get_current_user(request)
    
    product = await db.products.find_one(
        {"product_id": product_id, "seller_id": user['user_id']},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product.get('created_at'), datetime):
        product['created_at'] = product['created_at'].isoformat()
    
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    """Delete a product"""
    user = await get_current_user(request)
    
    result = await db.products.delete_one(
        {"product_id": product_id, "seller_id": user['user_id']}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted"}

# ============== PUBLIC PRODUCT ENDPOINT (BUYER VIEW) ==============

@api_router.get("/pay/{code}")
async def get_product_by_code(code: str, currency: str = "TZS"):
    """Get product by payment link code with currency conversion for diaspora buyers"""
    product = await db.products.find_one(
        {"payment_link_code": code, "is_active": True},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get seller info with trade metrics
    seller = await db.users.find_one(
        {"user_id": product['seller_id']},
        {"_id": 0, "password_hash": 0}
    )
    
    # Get seller's trade metrics
    orders = await db.orders.find({"seller_id": product['seller_id']}, {"_id": 0}).to_list(1000)
    trade_metrics = calculate_trade_metrics(orders)
    
    # Convert price if different currency requested
    price_tzs = product.get('price_tzs', product['price'])
    is_international = currency != "TZS"
    
    if currency != "TZS":
        conversion = convert_currency(price_tzs, "TZS", currency)
        display_price = conversion['amount']
    else:
        display_price = price_tzs
    
    # Recalculate fees for buyer's currency
    fees = calculate_fees(price_tzs, is_international=is_international)
    
    if isinstance(product.get('created_at'), datetime):
        product['created_at'] = product['created_at'].isoformat()
    
    return {
        **product,
        "display_price": display_price,
        "display_currency": currency,
        "price_tzs": price_tzs,
        "buyer_protection_fee": fees['buyer_protection_fee'],
        "buyer_protection_fee_display": round(fees['buyer_protection_fee'] / EXCHANGE_RATES.get(currency, 1), 2),
        "total_buyer_pays": fees['total_buyer_pays'],
        "total_buyer_pays_display": round(fees['total_buyer_pays'] / EXCHANGE_RATES.get(currency, 1), 2),
        "fee_rate": f"{int(fees['fee_rate'] * 100)}%",
        "seller_verified": seller.get('is_verified', True) if seller else True,
        "seller_is_women_owned": seller.get('is_women_owned', True) if seller else True,
        "seller_trade_metrics": {
            "successful_transactions": trade_metrics['successful_transactions'],
            "success_rate": trade_metrics['success_rate'],
            "credit_score_eligible": trade_metrics['credit_score_eligible']
        },
        "exchange_rate": EXCHANGE_RATES.get(currency, 1),
        "supported_currencies": SUPPORTED_CURRENCIES
    }

# ============== CURRENCY ENDPOINT ==============

@api_router.get("/currencies")
async def get_currencies():
    """Get supported currencies and exchange rates"""
    return {
        "base_currency": "TZS",
        "supported_currencies": SUPPORTED_CURRENCIES,
        "exchange_rates": EXCHANGE_RATES,
        "diaspora_markets": ["USD", "GBP", "EUR"],
        "regional_markets": ["KES", "UGX"]
    }

# ============== ORDER ENDPOINTS ==============

@api_router.post("/orders")
async def create_order(order_data: OrderCreate):
    """Create a new order with multi-currency support"""
    product = await db.products.find_one(
        {"product_id": order_data.product_id, "is_active": True},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Determine if international order
    is_international = order_data.buyer_country != "TZ"
    buyer_currency = order_data.buyer_currency
    
    # Get price in TZS
    price_tzs = product.get('price_tzs', product['price'])
    
    # Calculate fees
    fees = calculate_fees(price_tzs, is_international=is_international)
    
    # Convert for display
    if buyer_currency != "TZS":
        total_display = round(fees['total_buyer_pays'] / EXCHANGE_RATES.get(buyer_currency, 1), 2)
    else:
        total_display = fees['total_buyer_pays']
    
    order = {
        "order_id": f"order_{uuid.uuid4().hex[:12]}",
        "product_id": product['product_id'],
        "product_name": product['name'],
        "product_price": product['price'],
        "product_price_tzs": price_tzs,
        "product_image": product.get('image'),
        "seller_id": product['seller_id'],
        "seller_name": product['seller_name'],
        "buyer_name": order_data.buyer_name,
        "buyer_phone": order_data.buyer_phone,
        "buyer_location": order_data.buyer_location,
        "buyer_country": order_data.buyer_country,
        "buyer_currency": buyer_currency,
        "payment_method": order_data.payment_method,
        "is_international": is_international,
        "buyer_protection_fee": fees['buyer_protection_fee'],
        "seller_acquisition_fee": fees['seller_acquisition_fee'],
        "total_paid": fees['total_buyer_pays'],
        "total_paid_display": total_display,
        "seller_payout": fees['seller_receives'],
        "exchange_rate": EXCHANGE_RATES.get(buyer_currency, 1),
        "status": "pending_payment",
        "escrow_status": "pending",
        "nala_reference": None,  # For NALA payments
        "created_at": datetime.now(timezone.utc),
        "paid_at": None,
        "delivered_at": None
    }
    
    await db.orders.insert_one(order)
    
    return {
        "order_id": order["order_id"],
        "product_id": order["product_id"],
        "product_name": order["product_name"],
        "product_price": order["product_price"],
        "product_price_tzs": order["product_price_tzs"],
        "product_image": order["product_image"],
        "seller_id": order["seller_id"],
        "seller_name": order["seller_name"],
        "buyer_name": order["buyer_name"],
        "buyer_phone": order["buyer_phone"],
        "buyer_location": order["buyer_location"],
        "buyer_country": order["buyer_country"],
        "buyer_currency": order["buyer_currency"],
        "payment_method": order["payment_method"],
        "is_international": order["is_international"],
        "buyer_protection_fee": order["buyer_protection_fee"],
        "seller_acquisition_fee": order["seller_acquisition_fee"],
        "total_paid": order["total_paid"],
        "total_paid_display": order["total_paid_display"],
        "seller_payout": order["seller_payout"],
        "exchange_rate": order["exchange_rate"],
        "status": order["status"],
        "escrow_status": order["escrow_status"],
        "created_at": order["created_at"].isoformat(),
        "paid_at": None,
        "delivered_at": None
    }

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    """Get order details (public - for tracking)"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    for key in ['created_at', 'paid_at', 'delivered_at']:
        if isinstance(order.get(key), datetime):
            order[key] = order[key].isoformat()
    
    return order

@api_router.get("/seller/orders")
async def get_seller_orders(request: Request):
    """Get all orders for current seller"""
    user = await get_current_user(request)
    
    orders = await db.orders.find(
        {"seller_id": user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for order in orders:
        for key in ['created_at', 'paid_at', 'delivered_at']:
            if isinstance(order.get(key), datetime):
                order[key] = order[key].isoformat()
    
    return orders

# ============== PAYMENT ENDPOINTS ==============

@api_router.post("/payments/simulate")
async def simulate_payment(payment: PaymentSimulate):
    """
    Simulate payment - supports mobile money and NALA
    In production:
    - Mobile money -> Selcom API
    - International -> NALA API
    """
    order = await db.orders.find_one({"order_id": payment.order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order['status'] != 'pending_payment':
        raise HTTPException(status_code=400, detail="Order already paid")
    
    # Generate reference based on payment method
    if payment.payment_method == "nala":
        payment_ref = f"NALA-{uuid.uuid4().hex[:8].upper()}"
        payment_provider = "NALA Payment Rails"
    else:
        payment_ref = f"MM-{uuid.uuid4().hex[:8].upper()}"
        payment_provider = f"{payment.payment_method.upper()} Mobile Money"
    
    # Update order
    await db.orders.update_one(
        {"order_id": payment.order_id},
        {
            "$set": {
                "status": "paid",
                "escrow_status": "held",
                "paid_at": datetime.now(timezone.utc),
                "nala_reference": payment_ref if payment.payment_method == "nala" else None
            }
        }
    )
    
    # Create escrow record (NMB simulation)
    escrow = {
        "escrow_id": f"escrow_{uuid.uuid4().hex[:12]}",
        "order_id": payment.order_id,
        "amount_tzs": order['total_paid'],
        "buyer_currency": order.get('buyer_currency', 'TZS'),
        "exchange_rate": order.get('exchange_rate', 1),
        "buyer_protection_fee": order['buyer_protection_fee'],
        "seller_acquisition_fee": order['seller_acquisition_fee'],
        "seller_payout": order['seller_payout'],
        "payment_method": payment.payment_method,
        "payment_reference": payment_ref,
        "status": "held",
        "bank": "NMB",
        "is_international": order.get('is_international', False),
        "created_at": datetime.now(timezone.utc),
        "released_at": None
    }
    await db.escrows.insert_one(escrow)
    
    # Update seller stats
    if order.get('is_international'):
        await db.users.update_one(
            {"user_id": order['seller_id']},
            {"$inc": {"international_orders": 1}}
        )
    
    return {
        "success": True,
        "message": f"Payment of TZS {order['total_paid']:,.0f} received via {payment_provider}",
        "payment_reference": payment_ref,
        "escrow_status": "held",
        "order_status": "paid",
        "is_international": order.get('is_international', False)
    }

# ============== ORDER STATUS UPDATES ==============

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, request: Request):
    """Update order status (seller action)"""
    user = await get_current_user(request)
    body = await request.json()
    new_status = body.get('status')
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order['seller_id'] != user['user_id']:
        raise HTTPException(status_code=403, detail="Not your order")
    
    valid_transitions = {
        'paid': ['preparing'],
        'preparing': ['shipped'],
        'shipped': ['delivered']
    }
    
    if order['status'] not in valid_transitions or new_status not in valid_transitions.get(order['status'], []):
        raise HTTPException(status_code=400, detail=f"Cannot change status from {order['status']} to {new_status}")
    
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": new_status}})
    
    return {"message": f"Order status updated to {new_status}"}

@api_router.post("/orders/{order_id}/confirm-delivery")
async def confirm_delivery(order_id: str):
    """Buyer confirms delivery - releases escrow to seller's mobile wallet"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order['status'] not in ['shipped', 'delivered']:
        raise HTTPException(status_code=400, detail="Order not yet shipped")
    
    # Update order
    await db.orders.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "completed",
                "escrow_status": "released",
                "delivered_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Release escrow
    await db.escrows.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "released",
                "released_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Update seller stats
    await db.users.update_one(
        {"user_id": order['seller_id']},
        {
            "$inc": {
                "total_sales_tzs": order['seller_payout'],
                "successful_orders": 1
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Payment of TZS {order['seller_payout']:,.0f} released to seller's mobile wallet",
        "escrow_status": "released",
        "is_international": order.get('is_international', False)
    }

@api_router.post("/orders/{order_id}/dispute")
async def create_dispute(order_id: str, dispute: DisputeCreate):
    """Buyer reports an issue"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    dispute_record = {
        "dispute_id": f"disp_{uuid.uuid4().hex[:12]}",
        "order_id": order_id,
        "reason": dispute.reason,
        "status": "open",
        "created_at": datetime.now(timezone.utc)
    }
    await db.disputes.insert_one(dispute_record)
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": "disputed"}}
    )
    
    return {
        "success": True,
        "message": "Dispute submitted. We will review and contact you shortly.",
        "dispute_id": dispute_record['dispute_id']
    }

# ============== DASHBOARD STATS ==============

@api_router.get("/seller/stats")
async def get_seller_stats(request: Request):
    """Get seller dashboard stats with trade finance metrics"""
    user = await get_current_user(request)
    
    products_count = await db.products.count_documents({"seller_id": user['user_id']})
    
    orders = await db.orders.find({"seller_id": user['user_id']}, {"_id": 0}).to_list(1000)
    
    # Calculate trade metrics
    trade_metrics = calculate_trade_metrics(orders)
    
    total_orders = len(orders)
    pending_orders = len([o for o in orders if o['status'] in ['pending_payment', 'paid', 'preparing', 'shipped']])
    completed_orders = len([o for o in orders if o['status'] == 'completed'])
    international_orders = len([o for o in orders if o.get('is_international', False)])
    
    total_earnings = sum(o['seller_payout'] for o in orders if o['status'] == 'completed')
    pending_earnings = sum(o['seller_payout'] for o in orders if o['escrow_status'] == 'held')
    international_earnings = sum(o['seller_payout'] for o in orders if o['status'] == 'completed' and o.get('is_international', False))
    
    return {
        "products_count": products_count,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "international_orders": international_orders,
        "total_earnings": total_earnings,
        "pending_earnings": pending_earnings,
        "international_earnings": international_earnings,
        "is_women_owned": user.get('is_women_owned', True),
        "export_enabled": user.get('export_enabled', False),
        "trade_metrics": trade_metrics
    }

# ============== TRADE FINANCE ENDPOINTS ==============

@api_router.get("/seller/trade-history")
async def get_trade_history(request: Request):
    """Get detailed trade history for credit scoring eligibility"""
    user = await get_current_user(request)
    
    orders = await db.orders.find(
        {"seller_id": user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for order in orders:
        for key in ['created_at', 'paid_at', 'delivered_at']:
            if isinstance(order.get(key), datetime):
                order[key] = order[key].isoformat()
    
    trade_metrics = calculate_trade_metrics(orders)
    
    # Monthly breakdown
    monthly_data = {}
    for order in orders:
        if order['status'] == 'completed':
            created = order.get('created_at', '')
            if isinstance(created, str) and len(created) >= 7:
                month_key = created[:7]  # YYYY-MM
                if month_key not in monthly_data:
                    monthly_data[month_key] = {"count": 0, "volume": 0, "international": 0}
                monthly_data[month_key]["count"] += 1
                monthly_data[month_key]["volume"] += order.get('seller_payout', 0)
                if order.get('is_international'):
                    monthly_data[month_key]["international"] += 1
    
    return {
        "seller_id": user['user_id'],
        "business_name": user.get('business_name'),
        "is_women_owned": user.get('is_women_owned', True),
        "trade_metrics": trade_metrics,
        "monthly_breakdown": monthly_data,
        "transactions": orders,
        "credit_eligibility": {
            "eligible": trade_metrics['credit_score_eligible'],
            "requirements": {
                "min_transactions": 5,
                "min_success_rate": 80,
                "current_transactions": trade_metrics['successful_transactions'],
                "current_success_rate": trade_metrics['success_rate']
            }
        }
    }

@api_router.get("/export-categories")
async def get_export_categories():
    """Get supported export categories for women-led businesses"""
    return {
        "categories": EXPORT_CATEGORIES,
        "descriptions": {
            "textiles_fashion": "Kitenge, Kanga, Traditional Clothing",
            "handicrafts_art": "Baskets, Pottery, Wood Carvings",
            "food_beverages": "Coffee, Spices, Honey, Processed Foods",
            "beauty_cosmetics": "Natural Oils, Shea Butter, Herbal Products",
            "jewelry_accessories": "Beaded Jewelry, Leather Goods",
            "home_decor": "Handwoven Rugs, Wall Art",
            "agricultural_products": "Cashews, Sisal, Organic Produce",
            "other": "Other Export-Ready Products"
        }
    }

# ============== AI CHAT ENDPOINTS ==============

@api_router.post("/ai/support")
async def ai_support_chat(chat_data: ChatMessage):
    """AI-powered customer support chatbot (Swahili/English)"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        session_id = chat_data.session_id or f"support_{uuid.uuid4().hex[:12]}"
        
        # Get or create chat history
        chat_history = await db.chat_sessions.find_one({"session_id": session_id})
        messages = chat_history.get("messages", []) if chat_history else []
        
        # Add user message to history
        messages.append({"role": "user", "content": chat_data.message})
        
        # Create LLM chat instance
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=AI_SUPPORT_SYSTEM
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        # Build context from history
        for msg in messages[:-1]:  # Exclude the latest message we just added
            if msg["role"] == "user":
                await chat.send_message(UserMessage(text=msg["content"]))
        
        # Send current message
        response = await chat.send_message(UserMessage(text=chat_data.message))
        
        # Add assistant response to history
        messages.append({"role": "assistant", "content": response})
        
        # Save chat history
        await db.chat_sessions.update_one(
            {"session_id": session_id},
            {"$set": {"messages": messages, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        
        return {
            "response": response,
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"AI Support error: {e}")
        return {
            "response": "Samahani, kuna tatizo la muunganisho. Tafadhali jaribu tena.\n\nSorry, there's a connection issue. Please try again.",
            "session_id": chat_data.session_id or "error"
        }

@api_router.post("/ai/dispute")
async def ai_dispute_mediator(chat_data: ChatMessage):
    """AI-powered dispute mediation (Swahili/English)"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        session_id = chat_data.session_id or f"dispute_{uuid.uuid4().hex[:12]}"
        
        # Get or create chat history
        chat_history = await db.chat_sessions.find_one({"session_id": session_id})
        messages = chat_history.get("messages", []) if chat_history else []
        
        # Build context message if transaction info provided
        context_msg = ""
        if chat_data.context:
            tx = chat_data.context
            context_msg = f"Transaction: {tx.get('item', 'Unknown')} - TZS {tx.get('amount', 0):,} - Order ID: {tx.get('order_id', 'N/A')}\n\n"
        
        # Add user message to history
        full_message = context_msg + chat_data.message if context_msg and len(messages) == 0 else chat_data.message
        messages.append({"role": "user", "content": full_message})
        
        # Create LLM chat instance
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=AI_DISPUTE_SYSTEM
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        # Build context from history
        for msg in messages[:-1]:
            if msg["role"] == "user":
                await chat.send_message(UserMessage(text=msg["content"]))
        
        # Send current message
        response = await chat.send_message(UserMessage(text=full_message))
        
        # Add assistant response to history
        messages.append({"role": "assistant", "content": response})
        
        # Check for recommendation
        recommendation = None
        if "RELEASE" in response.upper() or "TOA PESA" in response.upper():
            recommendation = "release"
        elif "REFUND" in response.upper() or "RUDISHA" in response.upper():
            recommendation = "refund"
        elif "ESCALATE" in response.upper() or "BINADAMU" in response.upper():
            recommendation = "escalate"
        
        # Save chat history
        await db.chat_sessions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "messages": messages,
                    "recommendation": recommendation,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        return {
            "response": response,
            "session_id": session_id,
            "recommendation": recommendation
        }
    except Exception as e:
        logger.error(f"AI Dispute error: {e}")
        return {
            "response": "Samahani, kuna tatizo la muunganisho. Tafadhali jaribu tena.\n\nSorry, there's a connection issue. Please try again.",
            "session_id": chat_data.session_id or "error",
            "recommendation": None
        }

@api_router.post("/ai/fraud-check")
async def ai_fraud_check(fraud_data: FraudCheckRequest):
    """AI-powered fraud detection for transactions"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        prompt = f"""Analyze this transaction for fraud risk:
Item: {fraud_data.item}
Amount (TZS): {fraud_data.amount:,.0f}
Seller account age: {fraud_data.seller_age_days} days
Buyer account age: {fraud_data.buyer_age_days} days
Price vs market average: {fraud_data.price_vs_market}% of market price
Tanzania social commerce context."""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"fraud_{uuid.uuid4().hex[:8]}",
            system_message=AI_FRAUD_SYSTEM
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Try to parse JSON response
        import json
        try:
            # Clean response and parse
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            result = json.loads(clean_response)
        except (json.JSONDecodeError, IndexError):
            result = {
                "risk_level": "medium",
                "reasons": ["Analysis unavailable"],
                "recommended_action": "Proceed with caution"
            }
        
        return result
    except Exception as e:
        logger.error(f"AI Fraud check error: {e}")
        return {
            "risk_level": "medium",
            "reasons": ["Analysis service temporarily unavailable"],
            "recommended_action": "Proceed with standard verification"
        }

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {
        "message": "CraftHer Trade Finance API",
        "description": "Trade-Finance Infrastructure for Women Entrepreneurs",
        "version": "2.0",
        "features": [
            "Diaspora-to-Producer Payments",
            "Multi-Currency Support (USD, GBP, EUR)",
            "NALA Payment Rails Integration",
            "NMB Escrow System",
            "Women-Owned Business Verification",
            "Trade Finance Metrics for Credit Scoring"
        ]
    }

@api_router.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "platform": "CraftHer Trade Finance"
    }

# Include the router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
