from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, UploadFile, File, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt
import base64
import random
import string
import hashlib
import hmac
import asyncio
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

# ═══════════════════════════════════════════════════════════════════════════
# PAYMENT GATEWAY CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

# Africa's Talking (SMS)
AT_API_KEY = os.environ.get('AFRICASTALKING_API_KEY', '')
AT_USERNAME = os.environ.get('AFRICASTALKING_USERNAME', 'sandbox')

# Selcom Pesalink
SELCOM_API_KEY = os.environ.get('SELCOM_API_KEY', '')
SELCOM_SECRET = os.environ.get('SELCOM_SECRET', '')
SELCOM_VENDOR = os.environ.get('SELCOM_VENDOR', '')
SELCOM_BASE_URL = os.environ.get('SELCOM_BASE_URL', 'https://apigw.selcommobile.com/v1')

# M-Pesa Daraja (Vodacom TZ)
MPESA_CONSUMER_KEY = os.environ.get('MPESA_CONSUMER_KEY', '')
MPESA_CONSUMER_SECRET = os.environ.get('MPESA_CONSUMER_SECRET', '')
MPESA_SHORTCODE = os.environ.get('MPESA_SHORTCODE', '')
MPESA_PASSKEY = os.environ.get('MPESA_PASSKEY', '')
MPESA_BASE_URL = os.environ.get('MPESA_BASE_URL', 'https://openapi.m-pesa.com/sandbox/ipg/v2/vodacomTZN')

# Stripe
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# NALA Business API
NALA_API_KEY = os.environ.get('NALA_API_KEY', '')
NALA_BUSINESS_ID = os.environ.get('NALA_BUSINESS_ID', '')

# Smile Identity KYC
SMILE_PARTNER_ID = os.environ.get('SMILE_IDENTITY_PARTNER_ID', '')
SMILE_API_KEY = os.environ.get('SMILE_IDENTITY_API_KEY', '')

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')

# Base URL (required in production)
BASE_URL = os.environ.get('BASE_URL', '')

# OAuth Session URL
OAUTH_SESSION_URL = os.environ.get('OAUTH_SESSION_URL', 'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data')

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

# ═══════════════════════════════════════════════════════════════════════════
# SMS TEMPLATES (Bilingual: Swahili/English)
# ═══════════════════════════════════════════════════════════════════════════
SMS_TEMPLATES = {
    "escrow_created": lambda amount, tx_id: {
        "sw": f"SecureTrade: Malipo ya TSh {amount:,.0f} yameshikwa salama. TX: {tx_id}. Utapata taarifa wakati bidhaa inasafirishwa.",
        "en": f"SecureTrade: TSh {amount:,.0f} secured in escrow. TX: {tx_id}. You'll be notified when item ships."
    },
    "item_shipped": lambda tx_id, tracking_no: {
        "sw": f"SecureTrade: Bidhaa yako imepelekwa! Nambari ya ufuatiliaji: {tracking_no}. TX: {tx_id}.",
        "en": f"SecureTrade: Your item has shipped! Tracking: {tracking_no}. TX: {tx_id}."
    },
    "funds_released": lambda amount, seller_name: {
        "sw": f"SecureTrade: TSh {amount:,.0f} imetolewa kwa {seller_name}. Asante kwa kutumia SecureTrade!",
        "en": f"SecureTrade: TSh {amount:,.0f} released to {seller_name}. Thank you for using SecureTrade!"
    },
    "dispute_opened": lambda tx_id, case_no: {
        "sw": f"SecureTrade: Tatizo limefunguliwa ({case_no}). Pesa imegandwa. Wakala atawasiliana nawe ndani ya masaa 4. TX: {tx_id}.",
        "en": f"SecureTrade: Dispute opened ({case_no}). Funds frozen. An agent will contact you within 4 hours. TX: {tx_id}."
    },
    "payment_received": lambda amount, tx_id: {
        "sw": f"SecureTrade: Malipo ya TSh {amount:,.0f} yamepokelewa. TX: {tx_id}. Bidhaa itasafirishwa hivi karibuni.",
        "en": f"SecureTrade: Payment of TSh {amount:,.0f} received. TX: {tx_id}. Item will ship soon."
    },
    "delivery_confirmed": lambda tx_id: {
        "sw": f"SecureTrade: Uwasilishaji umethibitishwa! TX: {tx_id}. Pesa itatolewa kwa muuzaji.",
        "en": f"SecureTrade: Delivery confirmed! TX: {tx_id}. Funds will be released to seller."
    },
    "password_reset_otp": lambda otp: {
        "sw": f"SecureTrade: Nambari yako ya kubadilisha nenosiri ni: {otp}. Inaisha baada ya dakika 10. Usiionyeshe mtu yeyote.",
        "en": f"SecureTrade: Your password reset code is: {otp}. Expires in 10 minutes. Do not share with anyone."
    },
}

# Cached M-Pesa token
mpesa_token_cache = {"token": None, "expiry": 0}

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

class ForgotPasswordRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    otp: str
    new_password: str

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

# ═══════════════════════════════════════════════════════════════════════════
# PAYMENT GATEWAY MODELS
# ═══════════════════════════════════════════════════════════════════════════

class SMSRequest(BaseModel):
    phone: str
    type: str  # escrow_created, item_shipped, funds_released, dispute_opened
    data: Dict[str, Any]

class SelcomCheckoutRequest(BaseModel):
    amount: float
    phone: str
    order_id: str
    buyer_name: str
    buyer_email: str

class SelcomSTKRequest(BaseModel):
    amount: float
    phone: str
    transaction_ref: str

class MpesaSTKRequest(BaseModel):
    phone: str
    amount: float
    tx_ref: str

class StripeIntentRequest(BaseModel):
    amount_usd: float
    tx_ref: str
    buyer_email: str

class StripeCaptureRequest(BaseModel):
    intent_id: str

class StripeCancelRequest(BaseModel):
    intent_id: str
    reason: Optional[str] = "requested_by_customer"

class NalaTransferRequest(BaseModel):
    sender_phone: str
    receiver_phone: str
    amount_tzs: float
    currency: str  # USD, GBP, EUR
    tx_ref: str

class KYCVerifyNINRequest(BaseModel):
    national_id: str
    first_name: str
    last_name: str
    dob: str  # YYYY-MM-DD
    phone: str

class KYCSelfieRequest(BaseModel):
    selfie_base64: str
    national_id: str
    user_id: str

class PushSubscribeRequest(BaseModel):
    subscription: Dict[str, Any]
    user_id: str

class EscrowCreateRequest(BaseModel):
    item: str
    amount: float
    currency: str = "TZS"
    buyer_id: str
    seller_id: str
    payment_method: str

class EscrowReleaseRequest(BaseModel):
    tx_id: str
    buyer_id: str

class EscrowDisputeRequest(BaseModel):
    tx_id: str
    reason: str
    evidence: Optional[str] = None
    buyer_id: str

class AuditLogRequest(BaseModel):
    tx_id: str
    event: str  # ESCROW_CREATED, PAYMENT_RECEIVED, FUNDS_RELEASED, etc.
    actor: str
    metadata: Optional[Dict[str, Any]] = None

# ═══════════════════════════════════════════════════════════════════════════
# THREE-PARTY ESCROW MODELS (Hawker ↔ Supplier ↔ Buyer)
# ═══════════════════════════════════════════════════════════════════════════

class ThreePartyEscrowCreate(BaseModel):
    """Hawker creates stock request to supplier"""
    item_name: str
    item_description: Optional[str] = None
    item_condition: Optional[str] = None
    buyer_price: float  # Price hawker will charge buyer
    supplier_cost: Optional[float] = None  # Wholesale price hawker will pay supplier (optional - supplier can set)
    supplier_phone: str  # Supplier's phone number
    supplier_name: Optional[str] = None
    supplier_location: Optional[str] = None
    notes: Optional[str] = None
    quantity: int = 1
    image_b64: Optional[str] = None

class ThreePartyEscrowApprove(BaseModel):
    """Supplier approves with their wholesale price"""
    tx_id: str
    supplier_cost: float  # Wholesale price supplier charges hawker
    
class ThreePartyEscrowPay(BaseModel):
    """Buyer pays for the item"""
    tx_id: str
    buyer_name: str
    buyer_phone: str
    buyer_address: str
    payment_method: str  # mpesa, airtel, tigo

class ThreePartyEscrowRelease(BaseModel):
    """Release funds after delivery confirmation"""
    tx_id: str
    released_by: str  # buyer or hawker

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

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Request password reset OTP (sent via SMS or simulated)"""
    if not data.email and not data.phone:
        raise HTTPException(status_code=400, detail="Tafadhali weka barua pepe au nambari ya simu / Please provide email or phone")
    
    # Find user
    if data.email:
        user = await db.users.find_one({"email": data.email}, {"_id": 0})
    else:
        user = await db.users.find_one({"phone": data.phone}, {"_id": 0})
    
    if not user:
        # Don't reveal if user exists - return success either way
        return {"ok": True, "message": "Ikiwa akaunti ipo, utapokea nambari ya kubadilisha nenosiri / If account exists, you will receive a reset code"}
    
    if user.get('auth_type') == 'google':
        raise HTTPException(status_code=400, detail="Tafadhali ingia kwa kutumia Google / Please login with Google instead")
    
    # Generate 6-digit OTP
    otp = ''.join(random.choices('0123456789', k=6))
    
    # Store OTP with expiry (10 minutes)
    await db.password_resets.update_one(
        {"user_id": user['user_id']},
        {"$set": {
            "user_id": user['user_id'],
            "otp": otp,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
            "created_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    # In production, send SMS via Africa's Talking
    # For demo, we'll log it and return in response (remove in production!)
    sms_content = SMS_TEMPLATES["password_reset_otp"](otp)
    logger.info(f"Password reset OTP for {user['phone'] or user['email']}: {otp}")
    
    # Try to send SMS if phone provided and AT is configured
    if user.get('phone') and AT_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://api.africastalking.com/version1/messaging",
                    headers={
                        "apiKey": AT_API_KEY,
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    data={
                        "username": AT_USERNAME,
                        "to": user['phone'],
                        "message": sms_content["en"]
                    }
                )
        except Exception as e:
            logger.warning(f"SMS send failed: {e}")
    
    return {
        "ok": True, 
        "message": "Nambari ya kubadilisha nenosiri imetumwa / Reset code has been sent",
        # DEMO ONLY - remove in production!
        "demo_otp": otp if not AT_API_KEY else None
    }

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password using OTP"""
    if not data.email and not data.phone:
        raise HTTPException(status_code=400, detail="Tafadhali weka barua pepe au nambari ya simu / Please provide email or phone")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Nenosiri liwe na herufi 6 au zaidi / Password must be at least 6 characters")
    
    # Find user
    if data.email:
        user = await db.users.find_one({"email": data.email}, {"_id": 0})
    else:
        user = await db.users.find_one({"phone": data.phone}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Akaunti haijapatikana / Account not found")
    
    # Find and validate OTP
    reset_record = await db.password_resets.find_one({"user_id": user['user_id']}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Nambari ya kubadilisha nenosiri haijapatikana. Omba mpya / Reset code not found. Please request a new one")
    
    # Check expiry
    expires_at = reset_record['expires_at']
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Nambari imekwisha muda. Omba mpya / Code expired. Please request a new one")
    
    if reset_record['otp'] != data.otp:
        raise HTTPException(status_code=400, detail="Nambari si sahihi / Invalid code")
    
    # Update password
    new_hash = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"user_id": user['user_id']},
        {"$set": {"password_hash": new_hash}}
    )
    
    # Delete the reset record
    await db.password_resets.delete_one({"user_id": user['user_id']})
    
    # Invalidate all existing sessions
    await db.user_sessions.delete_many({"user_id": user['user_id']})
    
    return {"ok": True, "message": "Nenosiri limebadilishwa. Tafadhali ingia / Password changed. Please login"}

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
                OAUTH_SESSION_URL,
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
    
    # Get trade metrics with optimized projection
    orders = await db.orders.find(
        {"seller_id": user['user_id']}, 
        {"_id": 0, "status": 1, "escrow_status": 1, "buyer_country": 1, "total_paid": 1, "buyer_phone": 1, "seller_payout": 1, "is_international": 1}
    ).sort("created_at", -1).limit(100).to_list(100)
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

@api_router.get("/products/public")
async def get_public_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "newest"
):
    """Get all public products for marketplace (no auth required)"""
    query = {}
    
    if category and category != 'all':
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    # Define sort order
    sort_order = -1 if sort in ["newest", "price_high"] else 1
    sort_field = "created_at" if sort == "newest" else "price" if sort in ["price_low", "price_high"] else "rating"
    
    products = await db.products.find(
        query,
        {"_id": 0}
    ).sort(sort_field, sort_order).to_list(50)
    
    # Batch fetch all seller info to avoid N+1 queries
    seller_ids = list(set(p.get('seller_id') for p in products if p.get('seller_id')))
    sellers = await db.users.find(
        {"user_id": {"$in": seller_ids}}, 
        {"_id": 0, "user_id": 1, "name": 1, "username": 1}
    ).to_list(len(seller_ids)) if seller_ids else []
    seller_map = {s['user_id']: s for s in sellers}
    
    # Process products with seller info
    for p in products:
        if isinstance(p.get('created_at'), datetime):
            p['created_at'] = p['created_at'].isoformat()
        
        # Get seller name from map
        if p.get('seller_id') and p['seller_id'] in seller_map:
            seller = seller_map[p['seller_id']]
            p['seller_name'] = seller.get('name') or seller.get('username', 'Seller')
    
    return {"products": products, "count": len(products)}

@api_router.get("/products/detail/{product_id}")
async def get_product_public(product_id: str):
    """Get single product details for public view (no auth required)"""
    product = await db.products.find_one(
        {"product_id": product_id},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product.get('created_at'), datetime):
        product['created_at'] = product['created_at'].isoformat()
    
    # Get seller info
    if product.get('seller_id'):
        seller = await db.users.find_one(
            {"user_id": product['seller_id']}, 
            {"_id": 0, "name": 1, "username": 1, "phone": 1}
        )
        if seller:
            product['seller_name'] = seller.get('name') or seller.get('username', 'Seller')
            product['seller_phone'] = seller.get('phone', '')
    
    return product

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
    
    # Get seller's trade metrics with optimized projection
    orders = await db.orders.find(
        {"seller_id": product['seller_id']}, 
        {"_id": 0, "status": 1, "escrow_status": 1, "buyer_country": 1, "total_paid": 1, "buyer_phone": 1, "seller_payout": 1, "is_international": 1}
    ).sort("created_at", -1).limit(100).to_list(100)
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

class RatingCreate(BaseModel):
    rating: int
    comment: Optional[str] = None

@api_router.post("/orders/{order_id}/rate")
async def rate_seller(order_id: str, rating_data: RatingCreate):
    """Buyer rates the seller after delivery"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if rating_data.rating < 1 or rating_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Store the rating
    rating_record = {
        "rating_id": f"rate_{uuid.uuid4().hex[:12]}",
        "order_id": order_id,
        "seller_id": order['seller_id'],
        "buyer_name": order['buyer_name'],
        "rating": rating_data.rating,
        "comment": rating_data.comment,
        "created_at": datetime.now(timezone.utc)
    }
    await db.ratings.insert_one(rating_record)
    
    # Update seller's average rating
    seller = await db.users.find_one({"user_id": order['seller_id']}, {"_id": 0})
    current_rating = seller.get('average_rating', 4.8)
    total_ratings = seller.get('total_ratings', 0)
    
    # Calculate new average
    new_total_ratings = total_ratings + 1
    new_average = ((current_rating * total_ratings) + rating_data.rating) / new_total_ratings
    
    await db.users.update_one(
        {"user_id": order['seller_id']},
        {
            "$set": {
                "average_rating": round(new_average, 1),
                "total_ratings": new_total_ratings
            }
        }
    )
    
    return {
        "success": True,
        "message": "Asante kwa ukadiriaji! / Thank you for your rating!",
        "new_seller_rating": round(new_average, 1)
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
    
    # Optimized query with projection
    orders = await db.orders.find(
        {"seller_id": user['user_id']}, 
        {"_id": 0, "status": 1, "escrow_status": 1, "seller_payout": 1, "is_international": 1, "total_paid": 1, "buyer_country": 1, "buyer_phone": 1}
    ).sort("created_at", -1).limit(200).to_list(200)
    
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
async def get_trade_history(request: Request, page: int = 1, limit: int = 20):
    """Get detailed trade history for credit scoring eligibility"""
    user = await get_current_user(request)
    
    # Paginated query with optimized projection
    skip = (page - 1) * limit
    orders = await db.orders.find(
        {"seller_id": user['user_id']},
        {"_id": 0, "order_id": 1, "status": 1, "escrow_status": 1, "total_paid": 1, "seller_payout": 1, 
         "buyer_country": 1, "is_international": 1, "created_at": 1, "paid_at": 1, "delivered_at": 1}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
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

# ═══════════════════════════════════════════════════════════════════════════
# AI PRODUCT SUGGESTIONS — NO POACHING AFTER ESCROW
# ═══════════════════════════════════════════════════════════════════════════

class SuggestionRequest(BaseModel):
    user_id: Optional[str] = None
    current_product_id: str
    order_id: Optional[str] = None  # If exists, no suggestions (anti-poaching)
    preferences: List[str] = ["price", "rating", "shipping_speed"]

@api_router.post("/ai/suggestions")
async def get_ai_suggestions(request: SuggestionRequest):
    """
    AI-powered product suggestions for buyers.
    IMPORTANT: Returns empty array if order_id exists (no client poaching after escrow)
    """
    
    # Anti-poaching rule: If order exists, don't suggest alternatives
    if request.order_id:
        # Check if order is in escrow/paid status
        order = await db.orders.find_one({"order_id": request.order_id}, {"_id": 0})
        if order and order.get('status') in ['paid', 'in_escrow', 'shipped', 'delivered']:
            logger.info(f"Anti-poaching: No suggestions for order {request.order_id} (status: {order.get('status')})")
            return {"suggestions": [], "reason": "Transaction in progress - suggestions disabled"}
    
    # Get current product details
    current_product = await db.products.find_one(
        {"product_id": request.current_product_id},
        {"_id": 0}
    )
    
    if not current_product:
        return {"suggestions": [], "reason": "Product not found"}
    
    current_price = current_product.get('price', 0)
    current_category = current_product.get('category', 'general')
    seller_id = current_product.get('seller_id', '')
    
    # Find similar products (different sellers, similar price range)
    price_min = current_price * 0.7  # 30% cheaper
    price_max = current_price * 1.3  # 30% more expensive
    
    similar_products = await db.products.find(
        {
            "product_id": {"$ne": request.current_product_id},
            "seller_id": {"$ne": seller_id},  # Different seller
            "price": {"$gte": price_min, "$lte": price_max}
        },
        {"_id": 0}
    ).limit(10).to_list(10)
    
    if not similar_products:
        return {"suggestions": [], "reason": "No alternatives found in this price range"}
    
    # Get seller info for each product
    suggestions = []
    for product in similar_products[:5]:
        seller = await db.users.find_one(
            {"user_id": product.get('seller_id')},
            {"_id": 0, "name": 1, "average_rating": 1, "total_ratings": 1, "is_verified": 1}
        )
        
        # Calculate score based on preferences
        score = 0
        if 'price' in request.preferences:
            # Lower price = higher score
            price_diff = (current_price - product.get('price', 0)) / current_price
            score += price_diff * 30
        
        if 'rating' in request.preferences:
            rating = seller.get('average_rating', 4.0) if seller else 4.0
            score += rating * 10
        
        if 'shipping_speed' in request.preferences:
            if product.get('express_shipping'):
                score += 15
        
        # Bonus for verified sellers
        if seller and seller.get('is_verified'):
            score += 10
        
        suggestions.append({
            "product_id": product.get('product_id'),
            "name": product.get('name'),
            "price": product.get('price'),
            "price_formatted": f"TZS {product.get('price', 0):,.0f}",
            "description": product.get('description', '')[:100],
            "image": product.get('image_b64', '')[:100] if product.get('image_b64') else None,
            "link_code": product.get('link_code'),
            "seller": {
                "name": seller.get('name', 'Muuzaji') if seller else 'Muuzaji',
                "rating": seller.get('average_rating', 4.5) if seller else 4.5,
                "total_ratings": seller.get('total_ratings', 0) if seller else 0,
                "is_verified": seller.get('is_verified', False) if seller else False
            },
            "savings": current_price - product.get('price', 0) if product.get('price', 0) < current_price else 0,
            "score": round(score, 1)
        })
    
    # Sort by score (highest first)
    suggestions.sort(key=lambda x: x['score'], reverse=True)
    
    # Use AI to generate personalized message if available
    ai_message = "Bidhaa zinazofanana kutoka kwa wauzaji wengine waliothibitishwa"
    ai_message_en = "Similar products from other verified sellers"
    
    if EMERGENT_LLM_KEY and suggestions:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                model="claude-sonnet-4-20250514"
            )
            
            prompt = f"""You are a helpful shopping assistant for SecureTrade Tanzania.
            
The buyer is looking at: {current_product.get('name')} for TZS {current_price:,.0f}

We found {len(suggestions)} alternatives. Top option: {suggestions[0]['name']} for TZS {suggestions[0]['price']:,.0f}

Generate a brief, friendly message (max 2 sentences) in Swahili explaining why they might want to consider alternatives. Focus on savings or better ratings if applicable. Be helpful, not pushy."""

            response = await asyncio.to_thread(
                chat.send_message,
                prompt,
                "Generate shopping suggestion message"
            )
            ai_message = response.strip()
        except Exception as e:
            logger.warning(f"AI suggestion message failed: {e}")
    
    return {
        "suggestions": suggestions[:3],  # Return top 3
        "message_sw": ai_message,
        "message_en": ai_message_en,
        "total_found": len(similar_products),
        "anti_poach_active": False  # Not in escrow
    }

# ═══════════════════════════════════════════════════════════════════════════
# SMS NOTIFICATIONS — AFRICA'S TALKING
# ═══════════════════════════════════════════════════════════════════════════

async def send_sms(phone: str, message_en: str, message_sw: str) -> Dict:
    """Send bilingual SMS via Africa's Talking"""
    body = f"{message_sw}\n---\n{message_en}"
    
    if not AT_API_KEY:
        logger.warning("Africa's Talking not configured - SMS simulated")
        return {"status": "simulated", "message": body}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.africastalking.com/version1/messaging",
                headers={
                    "apiKey": AT_API_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                },
                data={
                    "username": AT_USERNAME,
                    "to": phone if phone.startswith("+") else f"+{phone}",
                    "message": body,
                    "from": "SecureTrad"
                }
            )
            return response.json()
    except Exception as e:
        logger.error(f"SMS error: {e}")
        return {"status": "error", "error": str(e)}

@api_router.post("/notifications/sms")
async def send_sms_notification(request: SMSRequest):
    """Send SMS notification to user"""
    template_fn = SMS_TEMPLATES.get(request.type)
    if not template_fn:
        raise HTTPException(status_code=400, detail=f"Unknown SMS type: {request.type}")
    
    try:
        data = request.data
        if request.type == "escrow_created":
            template = template_fn(data.get("amount", 0), data.get("tx_id", ""))
        elif request.type == "item_shipped":
            template = template_fn(data.get("tx_id", ""), data.get("tracking_no", ""))
        elif request.type == "funds_released":
            template = template_fn(data.get("amount", 0), data.get("seller_name", ""))
        elif request.type == "dispute_opened":
            template = template_fn(data.get("tx_id", ""), data.get("case_no", ""))
        else:
            template = template_fn(**data)
        
        result = await send_sms(request.phone, template["en"], template["sw"])
        return {"ok": True, "result": result}
    except Exception as e:
        logger.error(f"SMS notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════
# SELCOM PESALINK INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

def selcom_headers() -> Dict[str, str]:
    """Generate Selcom API headers with signature"""
    import time
    nonce = uuid.uuid4().hex
    timestamp = str(int(time.time()))
    params = f"{SELCOM_VENDOR}{nonce}{timestamp}"
    signature = base64.b64encode(
        hmac.new(SELCOM_SECRET.encode(), params.encode(), hashlib.sha256).digest()
    ).decode()
    
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"SELCOM {SELCOM_API_KEY}",
        "Digest-Method": "HS256",
        "Digest": signature,
        "Timestamp": timestamp,
        "Nonce": nonce,
    }

@api_router.post("/payments/selcom/checkout")
async def selcom_checkout(request: SelcomCheckoutRequest):
    """Create Selcom checkout order"""
    if not SELCOM_API_KEY:
        # Simulate for development
        return {
            "ok": True,
            "simulated": True,
            "checkout_url": f"{BASE_URL}/payment/selcom/demo",
            "order_id": request.order_id
        }
    
    try:
        payload = {
            "vendor": SELCOM_VENDOR,
            "order_id": request.order_id,
            "buyer_email": request.buyer_email,
            "buyer_name": request.buyer_name,
            "buyer_phone": request.phone,
            "amount": request.amount,
            "currency": "TZS",
            "redirect_url": f"{BASE_URL}/payment/selcom/callback",
            "cancel_url": f"{BASE_URL}/payment/selcom/cancel",
            "webhook": f"{BASE_URL}/api/payments/selcom/webhook",
            "payment_methods": ["SELCOM-WALLET", "MASTERPASS", "TIGOPESA", "AIRTEL", "HALOPESA"]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SELCOM_BASE_URL}/checkout/create-order",
                json=payload,
                headers=selcom_headers()
            )
            data = response.json()
            
        return {
            "ok": True,
            "checkout_url": data.get("data", {}).get("payment_gateway_url"),
            "order_id": request.order_id
        }
    except Exception as e:
        logger.error(f"Selcom checkout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/selcom/stk")
async def selcom_stk_push(request: SelcomSTKRequest):
    """Direct STK push via Selcom wallet"""
    if not SELCOM_API_KEY:
        return {"ok": True, "simulated": True, "status": "pending"}
    
    try:
        payload = {
            "vendor": SELCOM_VENDOR,
            "msisdn": request.phone,
            "amount": request.amount,
            "currency": "TZS",
            "remarks": "SecureTrade Escrow",
            "transref": request.transaction_ref,
            "callback": f"{BASE_URL}/api/payments/selcom/callback"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SELCOM_BASE_URL}/checkout/wallet-to-wallet",
                json=payload,
                headers=selcom_headers()
            )
            
        return {"ok": True, **response.json()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/selcom/webhook")
async def selcom_webhook(request: Request):
    """Handle Selcom payment webhook"""
    body = await request.json()
    order_id = body.get("order_id")
    result = body.get("result")
    
    if result == "SUCCESS":
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": "paid",
                "payment_status": "completed",
                "selcom_tx_id": body.get("selcom_transaction_id"),
                "paid_at": datetime.now(timezone.utc)
            }}
        )
        # Create audit log
        await create_audit_log(order_id, "PAYMENT_RECEIVED", "system", {"gateway": "selcom"})
    else:
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"status": "payment_failed", "failure_reason": body.get("result_desc")}}
        )
    
    return {"ok": True}

# ═══════════════════════════════════════════════════════════════════════════
# M-PESA DARAJA (Vodacom Tanzania)
# ═══════════════════════════════════════════════════════════════════════════

async def get_mpesa_token() -> str:
    """Get or refresh M-Pesa access token"""
    import time
    
    if mpesa_token_cache["token"] and time.time() < mpesa_token_cache["expiry"]:
        return mpesa_token_cache["token"]
    
    if not MPESA_CONSUMER_KEY:
        return "simulated_token"
    
    creds = base64.b64encode(f"{MPESA_CONSUMER_KEY}:{MPESA_CONSUMER_SECRET}".encode()).decode()
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{MPESA_BASE_URL}/getSession/",
            headers={"Authorization": f"Basic {creds}", "Origin": BASE_URL}
        )
        data = response.json()
    
    mpesa_token_cache["token"] = data.get("output_SessionID")
    mpesa_token_cache["expiry"] = time.time() + 55 * 60  # 55 minutes
    
    return mpesa_token_cache["token"]

@api_router.post("/payments/mpesa/stk")
async def mpesa_stk_push(request: MpesaSTKRequest):
    """Initiate M-Pesa STK Push (Lipa na M-Pesa)"""
    if not MPESA_CONSUMER_KEY:
        # Simulate for development
        await db.orders.update_one(
            {"order_id": request.tx_ref},
            {"$set": {"mpesa_status": "pending_simulation"}}
        )
        return {
            "ok": True,
            "simulated": True,
            "conversation_id": f"SIM-{uuid.uuid4().hex[:12]}",
            "message": "STK Push simulated - check phone for prompt"
        }
    
    try:
        token = await get_mpesa_token()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = base64.b64encode(
            f"{MPESA_SHORTCODE}{MPESA_PASSKEY}{timestamp}".encode()
        ).decode()
        
        # Normalize phone number (255XXXXXXXXX)
        phone = request.phone.replace("+", "")
        if phone.startswith("0"):
            phone = "255" + phone[1:]
        elif not phone.startswith("255"):
            phone = "255" + phone
        
        payload = {
            "input_Amount": request.amount,
            "input_Country": "TZN",
            "input_Currency": "TZS",
            "input_CustomerMSISDN": phone,
            "input_ServiceProviderCode": MPESA_SHORTCODE,
            "input_ThirdPartyConversationID": request.tx_ref,
            "input_TransactionReference": request.tx_ref,
            "input_PurchasedItemsDesc": "SecureTrade Escrow"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MPESA_BASE_URL}/c2bPayment/singleStage/",
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Origin": BASE_URL,
                    "Content-Type": "application/json"
                }
            )
            data = response.json()
        
        return {
            "ok": True,
            "conversation_id": data.get("output_ConversationID"),
            **data
        }
    except Exception as e:
        logger.error(f"M-Pesa STK error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/mpesa/callback")
async def mpesa_callback(request: Request):
    """Handle M-Pesa payment callback"""
    body = await request.json()
    tx_ref = body.get("input_ThirdPartyConversationID")
    response_code = body.get("output_ResponseCode")
    
    if response_code == "INS-0":
        await db.orders.update_one(
            {"order_id": tx_ref},
            {"$set": {
                "status": "paid",
                "payment_status": "completed",
                "mpesa_tx_id": body.get("output_TransactionID"),
                "paid_at": datetime.now(timezone.utc)
            }}
        )
        await create_audit_log(tx_ref, "PAYMENT_RECEIVED", "system", {"gateway": "mpesa"})
    else:
        await db.orders.update_one(
            {"order_id": tx_ref},
            {"$set": {"status": "payment_failed", "mpesa_code": response_code}}
        )
    
    return {"ok": True}

# ═══════════════════════════════════════════════════════════════════════════
# STRIPE ESCROW (Hold + Release)
# ═══════════════════════════════════════════════════════════════════════════

@api_router.post("/payments/stripe/create-intent")
async def stripe_create_intent(request: StripeIntentRequest):
    """Create Stripe PaymentIntent with manual capture (escrow hold)"""
    if not STRIPE_SECRET_KEY:
        return {
            "ok": True,
            "simulated": True,
            "client_secret": f"sim_secret_{uuid.uuid4().hex}",
            "intent_id": f"sim_pi_{uuid.uuid4().hex}"
        }
    
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        
        amount_cents = int(request.amount_usd * 100)
        
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            capture_method="manual",  # HOLD - don't charge yet
            description=f"SecureTrade Escrow: {request.tx_ref}",
            receipt_email=request.buyer_email,
            metadata={"tx_ref": request.tx_ref, "platform": "securetrade_tz"}
        )
        
        return {
            "ok": True,
            "client_secret": intent.client_secret,
            "intent_id": intent.id
        }
    except Exception as e:
        logger.error(f"Stripe create intent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/stripe/capture")
async def stripe_capture(request: StripeCaptureRequest):
    """Capture held Stripe payment (release from escrow to seller)"""
    if not STRIPE_SECRET_KEY:
        return {"ok": True, "simulated": True, "status": "captured"}
    
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        
        captured = stripe.PaymentIntent.capture(request.intent_id)
        
        return {"ok": True, "status": captured.status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/stripe/cancel")
async def stripe_cancel(request: StripeCancelRequest):
    """Cancel Stripe payment hold (refund on dispute)"""
    if not STRIPE_SECRET_KEY:
        return {"ok": True, "simulated": True, "status": "canceled"}
    
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        
        canceled = stripe.PaymentIntent.cancel(
            request.intent_id,
            cancellation_reason="fraudulent"
        )
        
        return {"ok": True, "status": canceled.status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════
# NALA BUSINESS API (Diaspora Payments)
# ═══════════════════════════════════════════════════════════════════════════

@api_router.post("/payments/nala/initiate")
async def nala_initiate_transfer(request: NalaTransferRequest):
    """Initiate NALA diaspora payment"""
    if not NALA_API_KEY:
        return {
            "ok": True,
            "simulated": True,
            "transfer_id": f"SIM-NALA-{uuid.uuid4().hex[:8]}",
            "status": "pending",
            "pay_link": f"{BASE_URL}/pay/nala/demo"
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://business.nala.com/api/v1/transfers",
                json={
                    "sender_phone": request.sender_phone,
                    "receiver_phone": request.receiver_phone,
                    "amount_tzs": request.amount_tzs,
                    "sender_currency": request.currency,
                    "reference": request.tx_ref,
                    "description": "SecureTrade Escrow",
                    "callback_url": f"{BASE_URL}/api/payments/nala/callback"
                },
                headers={
                    "Authorization": f"Bearer {NALA_API_KEY}",
                    "Content-Type": "application/json"
                }
            )
            data = response.json()
        
        return {
            "ok": True,
            "transfer_id": data.get("id"),
            "status": data.get("status"),
            "pay_link": data.get("payment_link")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/nala/callback")
async def nala_callback(request: Request):
    """Handle NALA payment callback"""
    body = await request.json()
    tx_ref = body.get("reference")
    status = body.get("status")
    
    if status == "COMPLETED":
        await db.orders.update_one(
            {"order_id": tx_ref},
            {"$set": {
                "status": "paid",
                "payment_status": "completed",
                "nala_tx_id": body.get("transaction_id"),
                "paid_at": datetime.now(timezone.utc)
            }}
        )
        await create_audit_log(tx_ref, "PAYMENT_RECEIVED", "system", {"gateway": "nala"})
    
    return {"ok": True}

# ═══════════════════════════════════════════════════════════════════════════
# SMILE IDENTITY KYC (NIDA Verification)
# ═══════════════════════════════════════════════════════════════════════════

@api_router.post("/kyc/verify-nin")
async def kyc_verify_nin(request: KYCVerifyNINRequest):
    """Verify Tanzania National ID (NIDA) via Smile Identity"""
    if not SMILE_PARTNER_ID:
        # Simulate verification
        await asyncio.sleep(1)  # Simulate API delay
        return {
            "ok": True,
            "simulated": True,
            "verified": True,
            "actions": {"Verify_ID_Number": "Verified"},
            "confidence": 99.5
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.smileidentity.com/v1/id_verification",
                json={
                    "partner_id": SMILE_PARTNER_ID,
                    "country": "TZ",
                    "id_type": "NATIONAL_ID",
                    "id_number": request.national_id,
                    "first_name": request.first_name,
                    "last_name": request.last_name,
                    "dob": request.dob,
                    "phone_number": request.phone
                },
                headers={
                    "Authorization": f"Bearer {SMILE_API_KEY}",
                    "Content-Type": "application/json"
                }
            )
            data = response.json()
        
        verified = data.get("Actions", {}).get("Verify_ID_Number") == "Verified"
        
        if verified:
            # Update user KYC level in database
            await db.users.update_one(
                {"phone": request.phone},
                {"$set": {"kyc_level": 2, "nida_verified": True, "kyc_verified_at": datetime.now(timezone.utc)}}
            )
        
        return {
            "ok": verified,
            "actions": data.get("Actions"),
            "confidence": data.get("ConfidenceValue")
        }
    except Exception as e:
        logger.error(f"Smile KYC error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/kyc/selfie")
async def kyc_verify_selfie(request: KYCSelfieRequest):
    """Verify selfie against NIDA photo via Smile Identity"""
    if not SMILE_PARTNER_ID:
        await asyncio.sleep(1.5)
        return {
            "ok": True,
            "simulated": True,
            "verified": True,
            "confidence": 95.2
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.smileidentity.com/v1/biometric_kyc",
                json={
                    "partner_id": SMILE_PARTNER_ID,
                    "job_type": 1,
                    "country": "TZ",
                    "id_type": "NATIONAL_ID",
                    "id_number": request.national_id,
                    "images": [{"image_type_id": 0, "image": request.selfie_base64}]
                },
                headers={
                    "Authorization": f"Bearer {SMILE_API_KEY}",
                    "Content-Type": "application/json"
                }
            )
            data = response.json()
        
        verified = data.get("Actions", {}).get("Selfie_To_ID_Authority_Compare") == "Passed"
        
        if verified:
            await db.users.update_one(
                {"_id": request.user_id},
                {"$set": {"kyc_level": 3, "selfie_verified": True}}
            )
        
        return {
            "ok": verified,
            "confidence": data.get("result", {}).get("ConfidenceValue")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════
# PUSH NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════

@api_router.post("/push/subscribe")
async def push_subscribe(request: PushSubscribeRequest):
    """Subscribe user to push notifications"""
    await db.users.update_one(
        {"_id": request.user_id},
        {"$set": {"push_subscription": request.subscription}}
    )
    return {"ok": True}

async def send_push_to_user(user_id: str, notification: Dict):
    """Send push notification to user"""
    user = await db.users.find_one({"_id": user_id})
    if not user or not user.get("push_subscription"):
        return
    
    # In production, use pywebpush library
    logger.info(f"Push to {user_id}: {notification}")

# ═══════════════════════════════════════════════════════════════════════════
# ESCROW STATE MACHINE
# States: created → paid → shipped → delivered → released | disputed | refunded
# ═══════════════════════════════════════════════════════════════════════════

@api_router.post("/escrow/create")
async def escrow_create(request: EscrowCreateRequest):
    """Create new escrow transaction"""
    tx_id = "SCT-" + uuid.uuid4().hex[:8].upper()
    
    escrow = {
        "tx_id": tx_id,
        "item": request.item,
        "amount": request.amount,
        "currency": request.currency,
        "buyer_id": request.buyer_id,
        "seller_id": request.seller_id,
        "payment_method": request.payment_method,
        "status": "created",
        "escrow_status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.escrow_transactions.insert_one(escrow)
    await create_audit_log(tx_id, "ESCROW_CREATED", request.buyer_id, {"amount": request.amount})
    
    return {"ok": True, "tx_id": tx_id, "status": "created"}

@api_router.post("/escrow/release")
async def escrow_release(request: EscrowReleaseRequest):
    """Release escrow funds to seller (buyer confirms delivery)"""
    escrow = await db.escrow_transactions.find_one({"tx_id": request.tx_id})
    
    if not escrow:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if escrow.get("buyer_id") != request.buyer_id:
        raise HTTPException(status_code=403, detail="Only buyer can release funds")
    
    if escrow.get("status") not in ["paid", "shipped", "delivered"]:
        raise HTTPException(status_code=400, detail=f"Cannot release from status: {escrow.get('status')}")
    
    # Update status
    await db.escrow_transactions.update_one(
        {"tx_id": request.tx_id},
        {"$set": {
            "status": "released",
            "escrow_status": "released",
            "released_at": datetime.now(timezone.utc)
        }}
    )
    
    # Create audit log
    await create_audit_log(request.tx_id, "FUNDS_RELEASED", request.buyer_id, {
        "amount": escrow.get("amount"),
        "seller_id": escrow.get("seller_id")
    })
    
    # Send notifications
    seller = await db.users.find_one({"_id": escrow.get("seller_id")})
    if seller and seller.get("phone"):
        template = SMS_TEMPLATES["funds_released"](escrow.get("amount"), seller.get("name", "Seller"))
        await send_sms(seller["phone"], template["en"], template["sw"])
    
    return {"ok": True, "tx_id": request.tx_id, "status": "released"}

@api_router.post("/escrow/dispute")
async def escrow_dispute(request: EscrowDisputeRequest):
    """Open dispute on escrow transaction"""
    escrow = await db.escrow_transactions.find_one({"tx_id": request.tx_id})
    
    if not escrow:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    case_no = "DIS-" + uuid.uuid4().hex[:6].upper()
    
    # Create dispute record
    dispute = {
        "case_no": case_no,
        "tx_id": request.tx_id,
        "reason": request.reason,
        "evidence": request.evidence,
        "raised_by": request.buyer_id,
        "status": "open",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.disputes.insert_one(dispute)
    
    # Update escrow status
    await db.escrow_transactions.update_one(
        {"tx_id": request.tx_id},
        {"$set": {"status": "disputed", "escrow_status": "frozen", "dispute_case": case_no}}
    )
    
    # Create audit log
    await create_audit_log(request.tx_id, "DISPUTE_OPENED", request.buyer_id, {
        "case_no": case_no,
        "reason": request.reason
    })
    
    # Notify parties
    template = SMS_TEMPLATES["dispute_opened"](request.tx_id, case_no)
    buyer = await db.users.find_one({"_id": request.buyer_id})
    if buyer and buyer.get("phone"):
        await send_sms(buyer["phone"], template["en"], template["sw"])
    
    return {"ok": True, "case_no": case_no, "status": "opened"}

@api_router.get("/escrow/verify/{tx_id}")
async def escrow_verify(tx_id: str, token: Optional[str] = None, role: Optional[str] = None):
    """Public verification endpoint for escrow transactions (2-party AND 3-party).
    
    Role-based output (Option B):
      - No token/role: MINIMAL public view (tx exists, amount locked, status, bank)
      - role=supplier + valid token: supplier view (their payout, hawker name, no commission)
      - role=buyer + valid token: buyer view (item, amount paid, status, escrow guarantee)
    
    Security: commission and supplier_cost are NEVER shown to random visitors —
    the hawker's markup stays confidential.
    """
    # First try three-party transactions
    tx = await db.three_party_transactions.find_one({"tx_id": tx_id}, {"_id": 0})
    if tx:
        # Always-public minimal fields (safe for any viewer)
        base = {
            "ok": True,
            "tx_id": tx["tx_id"],
            "type": "three_party",
            "status": tx.get("status"),
            "bank": "CRDB Bank PLC (Escrow Trust)",
            "locked_at": tx.get("paid_at") or tx.get("approved_at") or tx.get("created_at"),
            "created_at": tx.get("created_at"),
            "verified": True,
            "platform": "Biz-Salama TZ",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Validate token against role (HMAC over tx_id:role:identifier)
        valid_token = False
        if token and role in ("supplier", "buyer"):
            identifier = tx.get("supplier_phone") if role == "supplier" else (tx.get("buyer_id") or tx.get("hawker_id"))
            expected = _sign_verify_token(tx_id, role, identifier)
            valid_token = hmac.compare_digest(token, expected)

        if valid_token and role == "supplier":
            # SUPPLIER view — sees their payout, hawker name, item, but NOT hawker's commission
            return {
                **base,
                "view": "supplier",
                "item": tx.get("item_name"),
                "item_condition": tx.get("item_condition"),
                "buyer_price": tx.get("buyer_price"),
                "supplier_cost": tx.get("supplier_cost"),        # Their payout
                "supplier_name": tx.get("supplier_name"),
                "supplier_phone": tx.get("supplier_phone"),
                "supplier_location": tx.get("supplier_location"),
                "hawker_name": tx.get("hawker_name"),
                # commission & platform_fee INTENTIONALLY omitted
            }

        if valid_token and role == "buyer":
            # BUYER view — sees what they paid, item, seller (hawker) name, status, NO supplier info
            return {
                **base,
                "view": "buyer",
                "item": tx.get("item_name"),
                "item_condition": tx.get("item_condition"),
                "buyer_price": tx.get("buyer_price"),
                "seller_name": tx.get("hawker_name"),            # Buyer only knows the hawker
                # supplier_cost, supplier_name, supplier_phone, commission all HIDDEN
            }

        # DEFAULT public view — just enough to prove escrow exists, nothing competitive
        return {
            **base,
            "view": "public",
            "item": tx.get("item_name"),
            "buyer_price": tx.get("buyer_price"),
            "funds_secured": tx.get("status") in ("paid", "escrowed"),
        }

    # Fallback: two-party escrow (legacy)
    escrow = await db.escrow_transactions.find_one(
        {"tx_id": tx_id},
        {"_id": 0, "tx_id": 1, "status": 1, "escrow_status": 1, "amount": 1, "currency": 1, "created_at": 1}
    )
    if not escrow:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return {
        **escrow,
        "type": "two_party",
        "verified": True,
        "platform": "Biz-Salama TZ",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def _sign_verify_token(tx_id: str, role: str, identifier: Optional[str]) -> str:
    """HMAC-SHA256 signed token for role-scoped verify URLs. 16 hex chars (64-bit)."""
    msg = f"{tx_id}:{role}:{identifier or ''}".encode()
    return hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).hexdigest()[:16]

# ═══════════════════════════════════════════════════════════════════════════
# THREE-PARTY ESCROW (Hawker ↔ Supplier ↔ Buyer)
# Solves trust gap in Tanzania's informal supply chain
# ═══════════════════════════════════════════════════════════════════════════

# Platform fee for three-party transactions
THREE_PARTY_FEE_RATE = 0.025  # 2.5% total platform fee

@api_router.post("/escrow/three-party/create")
async def three_party_create(request: ThreePartyEscrowCreate, current_user: dict = Depends(get_current_user)):
    """
    Hawker (Mchuuzi) creates stock request to a supplier
    Flow: Hawker sets buyer price → Supplier approves with their cost → Buyer pays → Delivery → Split
    """
    tx_id = f"3P_{uuid.uuid4().hex[:12]}"
    
    # Find supplier by phone
    supplier = await db.users.find_one(
        {"$or": [{"phone": request.supplier_phone}, {"email": request.supplier_phone}]},
        {"_id": 0}
    )
    supplier_id = supplier["user_id"] if supplier else None
    
    transaction = {
        "tx_id": tx_id,
        "type": "three_party",
        "status": "pending_approval",  # Awaiting supplier approval
        "escrow_status": "empty",
        
        # Hawker (Street Seller) - Creator
        "hawker_id": current_user["user_id"],
        "hawker_name": current_user.get("username") or current_user.get("name", "Mchuuzi"),
        "hawker_phone": current_user.get("phone", ""),
        
        # Supplier (Shop Owner) - Must approve
        "supplier_phone": request.supplier_phone,
        "supplier_id": supplier_id,
        "supplier_name": (supplier.get("username") if supplier else None) or request.supplier_name or "Pending",
        "supplier_location": request.supplier_location,
        "supplier_cost": request.supplier_cost,  # May be set by hawker upfront; supplier can adjust
        
        # Item Details
        "item_name": request.item_name,
        "item_description": request.item_description,
        "item_condition": request.item_condition,
        "notes": request.notes,
        "image_b64": request.image_b64,
        "quantity": request.quantity,
        
        # Pricing (Hawker sets buyer price, supplier sets their cost)
        "buyer_price": request.buyer_price,
        "commission": (request.buyer_price - request.supplier_cost) if request.supplier_cost else None,
        "platform_fee": round(request.buyer_price * 0.01, 2),
        
        # Buyer (Filled when they pay)
        "buyer_id": None,
        "buyer_name": None,
        "buyer_phone": None,
        "buyer_address": None,
        
        # Timestamps
        "created_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None,
        "paid_at": None,
        "released_at": None,
    }
    
    await db.three_party_transactions.insert_one(transaction)
    
    # Create audit log
    await create_audit_log(tx_id, "THREE_PARTY_CREATED", current_user["user_id"], {
        "item": request.item_name,
        "buyer_price": request.buyer_price,
        "supplier_phone": request.supplier_phone
    })
    
    # Generate role-scoped signed verify URLs (Option B: HMAC tokens)
    base_url = os.environ.get("BASE_URL", "").rstrip("/")
    supplier_token = _sign_verify_token(tx_id, "supplier", request.supplier_phone)
    hawker_token = _sign_verify_token(tx_id, "buyer", current_user["user_id"])
    supplier_verify_url = f"{base_url}/verify/{tx_id}?t={supplier_token}&r=supplier" if base_url else f"/verify/{tx_id}?t={supplier_token}&r=supplier"
    public_verify_url = f"{base_url}/verify/{tx_id}" if base_url else f"/verify/{tx_id}"

    return {
        "ok": True,
        "tx_id": tx_id,
        "status": "pending_approval",
        "supplier_verify_url": supplier_verify_url,   # → share this via WhatsApp/SMS to supplier
        "supplier_token": supplier_token,
        "public_verify_url": public_verify_url,        # → safe to share anywhere (minimal view)
        "hawker_token": hawker_token,                  # → hawker uses this if they want a buyer-view link
        "message_sw": "Ombi limetumwa kwa msambazaji. Subiri uidhinishaji.",
        "message_en": "Request sent to supplier. Awaiting approval."
    }

@api_router.get("/escrow/three-party/pending")
async def three_party_pending(current_user: dict = Depends(get_current_user)):
    """Get pending approval requests for supplier (by phone match)"""
    phone = current_user.get("phone", "")
    user_id = current_user["user_id"]
    
    # Find transactions where user is supplier (by phone or user_id)
    pending = await db.three_party_transactions.find(
        {
            "$or": [
                {"supplier_phone": phone},
                {"supplier_id": user_id}
            ],
            "status": "pending_approval"
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"pending": pending, "count": len(pending)}

@api_router.post("/escrow/three-party/approve")
async def three_party_approve(request: ThreePartyEscrowApprove, current_user: dict = Depends(get_current_user)):
    """
    Supplier approves stock request with their wholesale cost
    Validates: supplier_cost < buyer_price (hawker must make profit)
    """
    tx = await db.three_party_transactions.find_one(
        {"tx_id": request.tx_id},
        {"_id": 0}
    )
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail="Transaction already processed")
    
    # Verify user is the supplier
    phone = current_user.get("phone", "")
    if tx["supplier_phone"] != phone and tx.get("supplier_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to approve this transaction")
    
    # Validate supplier cost is less than buyer price (hawker margin)
    buyer_price = tx["buyer_price"]
    if request.supplier_cost >= buyer_price:
        raise HTTPException(
            status_code=400, 
            detail=f"Bei ya msambazaji lazima iwe chini ya bei ya mnunuaji / Supplier cost must be less than buyer price (TZS {buyer_price:,.0f})"
        )
    
    # Calculate splits
    platform_fee = round(buyer_price * THREE_PARTY_FEE_RATE, 2)
    hawker_commission = buyer_price - request.supplier_cost - platform_fee
    
    if hawker_commission < 0:
        raise HTTPException(
            status_code=400,
            detail="Bei ya msambazaji kubwa sana / Supplier cost too high for platform fee"
        )
    
    # Update transaction
    await db.three_party_transactions.update_one(
        {"tx_id": request.tx_id},
        {"$set": {
            "status": "approved",
            "supplier_id": current_user["user_id"],
            "supplier_name": current_user.get("username") or current_user.get("name", "Msambazaji"),
            "supplier_cost": request.supplier_cost,
            "commission": hawker_commission,
            "platform_fee": platform_fee,
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create audit log
    await create_audit_log(request.tx_id, "THREE_PARTY_APPROVED", current_user["user_id"], {
        "supplier_cost": request.supplier_cost,
        "hawker_commission": hawker_commission,
        "platform_fee": platform_fee
    })
    
    # Notify hawker
    template_msg = f"Biz-Salama: Ombi lako la bidhaa limekubaliwa! TX: {request.tx_id}. Sasa unaweza kuuza kwa wateja."
    # await send_sms(tx["hawker_phone"], template_msg, template_msg)
    
    return {
        "ok": True,
        "tx_id": request.tx_id,
        "status": "approved",
        "split_preview": {
            "buyer_pays": buyer_price,
            "supplier_receives": request.supplier_cost,
            "hawker_receives": hawker_commission,
            "platform_fee": platform_fee
        },
        "message_sw": "Umekubali! Mchuuzi anaweza sasa kuuza bidhaa.",
        "message_en": "Approved! Hawker can now sell to customers."
    }

@api_router.get("/escrow/three-party/my-transactions")
async def three_party_my_transactions(current_user: dict = Depends(get_current_user)):
    """Get all three-party transactions for current user (as hawker, supplier, or buyer)"""
    user_id = current_user["user_id"]
    phone = current_user.get("phone", "")
    
    transactions = await db.three_party_transactions.find(
        {
            "$or": [
                {"hawker_id": user_id},
                {"supplier_id": user_id},
                {"supplier_phone": phone},
                {"buyer_id": user_id}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Add role indicator for each transaction
    for tx in transactions:
        if tx.get("hawker_id") == user_id:
            tx["my_role"] = "hawker"
        elif tx.get("supplier_id") == user_id or tx.get("supplier_phone") == phone:
            tx["my_role"] = "supplier"
        elif tx.get("buyer_id") == user_id:
            tx["my_role"] = "buyer"
        else:
            tx["my_role"] = "unknown"
    
    return {"transactions": transactions, "count": len(transactions)}

@api_router.get("/escrow/three-party/{tx_id}")
async def three_party_get(tx_id: str):
    """Get three-party transaction details (public for buyer view)"""
    tx = await db.three_party_transactions.find_one(
        {"tx_id": tx_id},
        {"_id": 0}
    )
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Don't expose supplier cost to public
    if tx["status"] == "approved":
        tx_public = {**tx}
        tx_public.pop("supplier_cost", None)
        tx_public.pop("commission", None)
        return tx_public
    
    return tx

@api_router.post("/escrow/three-party/pay")
async def three_party_pay(request: ThreePartyEscrowPay, current_user: dict = Depends(get_current_user)):
    """
    Buyer pays for item - funds go to escrow
    Triggers: STK Push → Escrow hold → Await delivery
    """
    tx = await db.three_party_transactions.find_one(
        {"tx_id": request.tx_id},
        {"_id": 0}
    )
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx["status"] != "approved":
        raise HTTPException(status_code=400, detail="Transaction not available for payment")
    
    buyer_price = tx["buyer_price"]
    
    # MOCK: Simulate payment success
    # In production, integrate with M-Pesa STK Push
    payment_ref = f"PAY_{uuid.uuid4().hex[:8].upper()}"
    
    # Update transaction with buyer details
    await db.three_party_transactions.update_one(
        {"tx_id": request.tx_id},
        {"$set": {
            "status": "paid",
            "escrow_status": "held",
            "buyer_id": current_user["user_id"],
            "buyer_name": request.buyer_name,
            "buyer_phone": request.buyer_phone,
            "buyer_address": request.buyer_address,
            "payment_method": request.payment_method,
            "payment_ref": payment_ref,
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create audit log
    await create_audit_log(request.tx_id, "THREE_PARTY_PAID", current_user["user_id"], {
        "amount": buyer_price,
        "payment_method": request.payment_method,
        "payment_ref": payment_ref
    })
    
    # Notify all parties
    # await send_sms(tx["hawker_phone"], f"Biz-Salama: Malipo yamefanikiwa! TZS {buyer_price:,.0f} imeshikwa. TX: {request.tx_id}", "")
    # await send_sms(tx["supplier_phone"], f"Biz-Salama: Agizo jipya! Peleka bidhaa: {tx['item_name']}. TX: {request.tx_id}", "")
    
    return {
        "ok": True,
        "tx_id": request.tx_id,
        "status": "paid",
        "escrow_status": "held",
        "payment_ref": payment_ref,
        "amount": buyer_price,
        "message_sw": "Malipo yamefanikiwa! Pesa imeshikwa salama.",
        "message_en": "Payment successful! Funds held in escrow."
    }

@api_router.post("/escrow/three-party/release")
async def three_party_release(request: ThreePartyEscrowRelease, current_user: dict = Depends(get_current_user)):
    """
    Release escrow funds after delivery confirmation
    Splits: Supplier gets cost, Hawker gets commission, Platform gets fee
    """
    tx = await db.three_party_transactions.find_one(
        {"tx_id": request.tx_id},
        {"_id": 0}
    )
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx["status"] != "paid" or tx["escrow_status"] != "held":
        raise HTTPException(status_code=400, detail="Transaction not in releasable state")
    
    # Verify releaser is buyer or hawker
    user_id = current_user["user_id"]
    if user_id not in [tx["buyer_id"], tx["hawker_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized to release this transaction")
    
    # Calculate disbursements
    supplier_payout = tx["supplier_cost"]
    hawker_payout = tx["commission"]
    platform_fee = tx["platform_fee"]
    
    # MOCK: Process payouts
    # In production: trigger M-Pesa B2C to supplier and hawker wallets
    payout_refs = {
        "supplier": f"OUT_{uuid.uuid4().hex[:6].upper()}",
        "hawker": f"OUT_{uuid.uuid4().hex[:6].upper()}"
    }
    
    # Update transaction
    await db.three_party_transactions.update_one(
        {"tx_id": request.tx_id},
        {"$set": {
            "status": "completed",
            "escrow_status": "released",
            "released_by": user_id,
            "released_at": datetime.now(timezone.utc).isoformat(),
            "payout_refs": payout_refs,
            "disbursements": {
                "supplier": supplier_payout,
                "hawker": hawker_payout,
                "platform": platform_fee
            }
        }}
    )
    
    # Create audit log
    await create_audit_log(request.tx_id, "THREE_PARTY_RELEASED", user_id, {
        "supplier_payout": supplier_payout,
        "hawker_payout": hawker_payout,
        "platform_fee": platform_fee,
        "released_by": request.released_by
    })
    
    return {
        "ok": True,
        "tx_id": request.tx_id,
        "status": "completed",
        "disbursements": {
            "supplier_receives": {"name": tx["supplier_name"], "amount": supplier_payout, "ref": payout_refs["supplier"]},
            "hawker_receives": {"name": tx["hawker_name"], "amount": hawker_payout, "ref": payout_refs["hawker"]},
            "platform_fee": platform_fee
        },
        "message_sw": "Malipo yametolewa! Asante kwa kutumia Biz-Salama.",
        "message_en": "Funds released! Thank you for using Biz-Salama."
    }

@api_router.post("/escrow/three-party/reject")
async def three_party_reject(tx_id: str, reason: str = "Not available", current_user: dict = Depends(get_current_user)):
    """Supplier rejects stock request"""
    tx = await db.three_party_transactions.find_one({"tx_id": tx_id}, {"_id": 0})
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail="Transaction already processed")
    
    # Verify supplier
    phone = current_user.get("phone", "")
    if tx["supplier_phone"] != phone and tx.get("supplier_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.three_party_transactions.update_one(
        {"tx_id": tx_id},
        {"$set": {"status": "rejected", "rejection_reason": reason, "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await create_audit_log(tx_id, "THREE_PARTY_REJECTED", current_user["user_id"], {"reason": reason})
    
    return {"ok": True, "status": "rejected", "message_sw": "Ombi limekataliwa", "message_en": "Request rejected"}

# ═══════════════════════════════════════════════════════════════════════════
# BOT AUDIT TRAIL (Bank of Tanzania Compliance)
# ═══════════════════════════════════════════════════════════════════════════

async def create_audit_log(tx_id: str, event: str, actor: str, metadata: Dict = None):
    """Create immutable audit log entry for BOT compliance"""
    entry = {
        "audit_id": str(uuid.uuid4()),
        "tx_id": tx_id,
        "event": event,
        "actor": actor,
        "metadata": metadata or {},
        "timestamp": datetime.now(timezone.utc),
        "hash": hashlib.sha256(f"{tx_id}{event}{datetime.now().timestamp()}".encode()).hexdigest()
    }
    
    await db.audit_log.insert_one(entry)
    return entry["audit_id"]

@api_router.post("/audit/log")
async def audit_log_endpoint(request: AuditLogRequest):
    """Create audit log entry"""
    audit_id = await create_audit_log(
        request.tx_id,
        request.event,
        request.actor,
        request.metadata
    )
    return {"ok": True, "audit_id": audit_id}

@api_router.get("/audit/{tx_id}")
async def get_audit_trail(tx_id: str):
    """Get full audit trail for a transaction"""
    entries = await db.audit_log.find(
        {"tx_id": tx_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    
    return {"tx_id": tx_id, "entries": entries}

# ═══════════════════════════════════════════════════════════════════════════
# LIVE EXCHANGE RATES
# ═══════════════════════════════════════════════════════════════════════════

@api_router.get("/rates")
async def get_exchange_rates():
    """Get current exchange rates"""
    # In production, fetch from API like Open Exchange Rates
    return {
        "base": "TZS",
        "rates": EXCHANGE_RATES,
        "updated_at": datetime.now(timezone.utc).isoformat()
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

# ═══════════════════════════════════════════════════════════════════════════
# PUBLIC SUPPLIER RESPONSE (no auth) — accept/decline via SMS/WhatsApp link
# ═══════════════════════════════════════════════════════════════════════════

class SupplierResponse(BaseModel):
    accepted: bool
    supplier_phone: Optional[str] = None
    supplier_cost: Optional[float] = None


@api_router.post("/escrow/three-party/{tx_id}/supplier-response")
async def supplier_response_public(tx_id: str, payload: SupplierResponse):
    """Supplier accepts/declines a 3-party escrow from the SMS/WhatsApp link (no login required)."""
    tx = await db.three_party_transactions.find_one({"tx_id": tx_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.get("status") not in ("pending_approval", "awaiting_supplier"):
        raise HTTPException(status_code=400, detail=f"Cannot respond — current status: {tx.get('status')}")

    if payload.accepted:
        supplier_cost = payload.supplier_cost or tx.get("supplier_cost")
        if not supplier_cost:
            raise HTTPException(status_code=400, detail="supplier_cost required to accept")
        buyer_price = tx.get("buyer_price", 0)
        platform_fee = round(buyer_price * 0.01, 2)
        commission = buyer_price - supplier_cost - platform_fee
        update = {
            "status": "supplier_approved",
            "supplier_cost": supplier_cost,
            "commission": commission,
            "platform_fee": platform_fee,
            "approved_at": datetime.now(timezone.utc).isoformat(),
        }
    else:
        update = {
            "status": "rejected",
            "rejected_at": datetime.now(timezone.utc).isoformat(),
        }

    await db.three_party_transactions.update_one({"tx_id": tx_id}, {"$set": update})
    return {"ok": True, "tx_id": tx_id, "status": update["status"]}


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
