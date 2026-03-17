from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, UploadFile, File, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt
import base64
import random
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'crafther-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# Create the main app
app = FastAPI(title="CraftHer API", description="Secure Payment Links for Social Sellers")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    business_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    phone: Optional[str] = None
    business_name: Optional[str] = None
    picture: Optional[str] = None
    is_verified: bool = True  # MVP: All sellers shown as verified
    auth_type: str
    created_at: datetime

class ProductCreate(BaseModel):
    name: str
    price: float  # Price in TZS
    description: Optional[str] = None
    image: Optional[str] = None  # Base64 image

class ProductResponse(BaseModel):
    product_id: str
    seller_id: str
    seller_name: str
    seller_business: Optional[str] = None
    name: str
    price: float
    description: Optional[str] = None
    image: Optional[str] = None
    payment_link_code: str
    buyer_protection_fee: float  # 3% of price
    seller_acquisition_fee: float  # 2% of price
    total_buyer_pays: float  # price + 3%
    seller_receives: float  # price - 2%
    is_active: bool = True
    created_at: datetime

class OrderCreate(BaseModel):
    product_id: str
    buyer_name: str
    buyer_phone: str
    buyer_location: str
    payment_method: str  # mpesa, airtel, tigo

class OrderResponse(BaseModel):
    order_id: str
    product_id: str
    product_name: str
    product_price: float
    product_image: Optional[str] = None
    seller_id: str
    seller_name: str
    buyer_name: str
    buyer_phone: str
    buyer_location: str
    payment_method: str
    buyer_protection_fee: float
    seller_acquisition_fee: float
    total_paid: float
    seller_payout: float
    status: str  # pending_payment, paid, preparing, shipped, delivered, completed, disputed
    escrow_status: str  # pending, held, released, refunded
    created_at: datetime
    paid_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

class DisputeCreate(BaseModel):
    reason: str  # not_delivered, wrong_item, poor_quality

class PaymentSimulate(BaseModel):
    order_id: str
    payment_method: str

# ============== HELPER FUNCTIONS ==============

def generate_payment_link_code():
    """Generate unique 8-character payment link code"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

def calculate_fees(price: float):
    """Calculate buyer protection fee (3%) and seller acquisition fee (2%)"""
    buyer_fee = round(price * 0.03, 2)
    seller_fee = round(price * 0.02, 2)
    return {
        'buyer_protection_fee': buyer_fee,
        'seller_acquisition_fee': seller_fee,
        'total_buyer_pays': round(price + buyer_fee, 2),
        'seller_receives': round(price - seller_fee, 2)
    }

async def get_current_user(request: Request) -> dict:
    """Get current user from session token (cookie or header)"""
    # Try cookie first
    session_token = request.cookies.get('session_token')
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            session_token = auth_header.split(' ')[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user = await db.users.find_one(
        {"user_id": session['user_id']},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    """Register new seller with email/password"""
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "business_name": user_data.business_name,
        "picture": None,
        "password_hash": hashed_password,
        "is_verified": True,  # MVP: All verified
        "auth_type": "email",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session)
    
    # Set cookie
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
        "auth_type": "email",
        "created_at": user["created_at"].isoformat(),
        "session_token": session_token  # Return token for mobile apps
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    """Login with email/password"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get('auth_type') == 'google':
        raise HTTPException(status_code=400, detail="Please login with Google")
    
    if not bcrypt.checkpw(credentials.password.encode(), user['password_hash'].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session = {
        "user_id": user['user_id'],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session)
    
    # Set cookie
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
        "auth_type": user['auth_type'],
        "created_at": user['created_at'].isoformat() if isinstance(user['created_at'], datetime) else user['created_at'],
        "session_token": session_token  # Return token for mobile apps
    }

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange Emergent OAuth session_id for session token"""
    body = await request.json()
    session_id = body.get('session_id')
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
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
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user['user_id']
        # Update user info if needed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "phone": None,
            "business_name": None,
            "picture": picture,
            "is_verified": True,
            "auth_type": "google",
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    # Get full user data
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "user_id": user['user_id'],
        "email": user['email'],
        "name": user['name'],
        "phone": user.get('phone'),
        "business_name": user.get('business_name'),
        "picture": user.get('picture'),
        "is_verified": user.get('is_verified', True),
        "auth_type": user['auth_type'],
        "created_at": user['created_at'].isoformat() if isinstance(user['created_at'], datetime) else user['created_at'],
        "session_token": session_token  # Return token for mobile apps
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    return {
        "user_id": user['user_id'],
        "email": user['email'],
        "name": user['name'],
        "phone": user.get('phone'),
        "business_name": user.get('business_name'),
        "picture": user.get('picture'),
        "is_verified": user.get('is_verified', True),
        "auth_type": user['auth_type'],
        "created_at": user['created_at'].isoformat() if isinstance(user['created_at'], datetime) else user['created_at']
    }

@api_router.put("/auth/profile")
async def update_profile(request: Request):
    """Update user profile"""
    user = await get_current_user(request)
    body = await request.json()
    
    update_data = {}
    if 'name' in body:
        update_data['name'] = body['name']
    if 'phone' in body:
        update_data['phone'] = body['phone']
    if 'business_name' in body:
        update_data['business_name'] = body['business_name']
    
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
    """Create a new product/payment link"""
    user = await get_current_user(request)
    
    fees = calculate_fees(product.price)
    payment_link_code = generate_payment_link_code()
    
    # Ensure unique code
    while await db.products.find_one({"payment_link_code": payment_link_code}):
        payment_link_code = generate_payment_link_code()
    
    product_data = {
        "product_id": f"prod_{uuid.uuid4().hex[:12]}",
        "seller_id": user['user_id'],
        "seller_name": user['name'],
        "seller_business": user.get('business_name'),
        "name": product.name,
        "price": product.price,
        "description": product.description,
        "image": product.image,
        "payment_link_code": payment_link_code,
        "buyer_protection_fee": fees['buyer_protection_fee'],
        "seller_acquisition_fee": fees['seller_acquisition_fee'],
        "total_buyer_pays": fees['total_buyer_pays'],
        "seller_receives": fees['seller_receives'],
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.products.insert_one(product_data)
    
    # Return without MongoDB _id
    return {
        "product_id": product_data["product_id"],
        "seller_id": product_data["seller_id"],
        "seller_name": product_data["seller_name"],
        "seller_business": product_data["seller_business"],
        "name": product_data["name"],
        "price": product_data["price"],
        "description": product_data["description"],
        "image": product_data["image"],
        "payment_link_code": product_data["payment_link_code"],
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
async def get_product_by_code(code: str):
    """Get product by payment link code (public - buyer view)"""
    product = await db.products.find_one(
        {"payment_link_code": code, "is_active": True},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get seller info
    seller = await db.users.find_one(
        {"user_id": product['seller_id']},
        {"_id": 0, "password_hash": 0}
    )
    
    if isinstance(product.get('created_at'), datetime):
        product['created_at'] = product['created_at'].isoformat()
    
    return {
        **product,
        "seller_verified": seller.get('is_verified', True) if seller else True
    }

# ============== ORDER ENDPOINTS ==============

@api_router.post("/orders")
async def create_order(order_data: OrderCreate):
    """Create a new order (buyer action - no auth required)"""
    # Get product
    product = await db.products.find_one(
        {"product_id": order_data.product_id, "is_active": True},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    order = {
        "order_id": f"order_{uuid.uuid4().hex[:12]}",
        "product_id": product['product_id'],
        "product_name": product['name'],
        "product_price": product['price'],
        "product_image": product.get('image'),
        "seller_id": product['seller_id'],
        "seller_name": product['seller_name'],
        "buyer_name": order_data.buyer_name,
        "buyer_phone": order_data.buyer_phone,
        "buyer_location": order_data.buyer_location,
        "payment_method": order_data.payment_method,
        "buyer_protection_fee": product['buyer_protection_fee'],
        "seller_acquisition_fee": product['seller_acquisition_fee'],
        "total_paid": product['total_buyer_pays'],
        "seller_payout": product['seller_receives'],
        "status": "pending_payment",
        "escrow_status": "pending",
        "created_at": datetime.now(timezone.utc),
        "paid_at": None,
        "delivered_at": None
    }
    
    await db.orders.insert_one(order)
    
    # Return without MongoDB _id
    return {
        "order_id": order["order_id"],
        "product_id": order["product_id"],
        "product_name": order["product_name"],
        "product_price": order["product_price"],
        "product_image": order["product_image"],
        "seller_id": order["seller_id"],
        "seller_name": order["seller_name"],
        "buyer_name": order["buyer_name"],
        "buyer_phone": order["buyer_phone"],
        "buyer_location": order["buyer_location"],
        "payment_method": order["payment_method"],
        "buyer_protection_fee": order["buyer_protection_fee"],
        "seller_acquisition_fee": order["seller_acquisition_fee"],
        "total_paid": order["total_paid"],
        "seller_payout": order["seller_payout"],
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

# ============== MOCK PAYMENT ENDPOINTS ==============

@api_router.post("/payments/simulate")
async def simulate_payment(payment: PaymentSimulate):
    """
    MOCK: Simulate mobile money payment
    In production, this would be replaced by Selcom integration
    """
    order = await db.orders.find_one({"order_id": payment.order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order['status'] != 'pending_payment':
        raise HTTPException(status_code=400, detail="Order already paid")
    
    # Simulate payment success (in real app, this would call Selcom API)
    await db.orders.update_one(
        {"order_id": payment.order_id},
        {
            "$set": {
                "status": "paid",
                "escrow_status": "held",  # Money now in NMB escrow simulation
                "paid_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Create escrow record (NMB simulation)
    escrow = {
        "escrow_id": f"escrow_{uuid.uuid4().hex[:12]}",
        "order_id": payment.order_id,
        "amount": order['total_paid'],
        "buyer_protection_fee": order['buyer_protection_fee'],
        "seller_acquisition_fee": order['seller_acquisition_fee'],
        "seller_payout": order['seller_payout'],
        "status": "held",
        "bank": "NMB",  # Simulated NMB escrow
        "created_at": datetime.now(timezone.utc),
        "released_at": None
    }
    await db.escrows.insert_one(escrow)
    
    return {
        "success": True,
        "message": f"Payment of TZS {order['total_paid']:,.0f} received via {payment.payment_method}",
        "escrow_status": "held",
        "order_status": "paid"
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
    
    update_data = {"status": new_status}
    
    await db.orders.update_one({"order_id": order_id}, {"$set": update_data})
    
    return {"message": f"Order status updated to {new_status}"}

@api_router.post("/orders/{order_id}/confirm-delivery")
async def confirm_delivery(order_id: str):
    """Buyer confirms delivery - releases escrow to seller"""
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
    
    # Release escrow (NMB simulation)
    await db.escrows.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "released",
                "released_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Payment of TZS {order['seller_payout']:,.0f} released to seller",
        "escrow_status": "released"
    }

@api_router.post("/orders/{order_id}/dispute")
async def create_dispute(order_id: str, dispute: DisputeCreate):
    """Buyer reports an issue"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create dispute record
    dispute_record = {
        "dispute_id": f"disp_{uuid.uuid4().hex[:12]}",
        "order_id": order_id,
        "reason": dispute.reason,
        "status": "open",
        "created_at": datetime.now(timezone.utc)
    }
    await db.disputes.insert_one(dispute_record)
    
    # Update order status
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
    """Get seller dashboard stats"""
    user = await get_current_user(request)
    
    # Count products
    products_count = await db.products.count_documents({"seller_id": user['user_id']})
    
    # Count orders by status
    orders = await db.orders.find({"seller_id": user['user_id']}, {"_id": 0}).to_list(1000)
    
    total_orders = len(orders)
    pending_orders = len([o for o in orders if o['status'] in ['pending_payment', 'paid', 'preparing', 'shipped']])
    completed_orders = len([o for o in orders if o['status'] == 'completed'])
    
    # Calculate earnings
    total_earnings = sum(o['seller_payout'] for o in orders if o['status'] == 'completed')
    pending_earnings = sum(o['seller_payout'] for o in orders if o['escrow_status'] == 'held')
    
    return {
        "products_count": products_count,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_earnings": total_earnings,
        "pending_earnings": pending_earnings
    }

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "CraftHer API - Secure Payment Links for Social Sellers"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

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
