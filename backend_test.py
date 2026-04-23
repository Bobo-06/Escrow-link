#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Biz-Salama / SecureTrade
Testing all endpoints as specified in the review request
"""

import requests
import json
import time
import uuid
import random
from datetime import datetime

# Configuration
BASE_URL = "https://salama-secure.preview.emergentagent.com/api"
session_token = None
product_id = None
order_id = None
payment_link_code = None

def log_test(test_name, status, details=""):
    """Log test results"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_icon} {test_name}: {status}")
    if details:
        print(f"    {details}")
    print()

def test_auth_register():
    """Test 1: User Registration with phone"""
    global session_token
    
    test_phone = f"071234567{random.randint(10, 99)}"
    payload = {
        "phone": test_phone,
        "password": "test123",
        "name": "Test User",
        "business_name": "Test Business",
        "is_women_owned": True
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            session_token = data.get('session_token')
            log_test("Auth Registration", "PASS", f"User created with phone {test_phone}, session_token received")
            return True
        elif response.status_code == 400 and "already registered" in response.text:
            log_test("Auth Registration", "PASS", "Expected 400 for existing phone (normal behavior)")
            return True
        else:
            log_test("Auth Registration", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Auth Registration", "FAIL", f"Exception: {str(e)}")
        return False

def test_auth_login():
    """Test 2: User Login with phone"""
    global session_token
    
    # Use known test credentials
    payload = {
        "phone": "0712345678",
        "password": "test123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            session_token = data.get('session_token')
            log_test("Auth Login", "PASS", f"Login successful, session_token: {session_token[:20]}...")
            return True
        else:
            log_test("Auth Login", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Auth Login", "FAIL", f"Exception: {str(e)}")
        return False

def test_auth_me():
    """Test 3: Get authenticated user profile"""
    if not session_token:
        log_test("Auth Me", "SKIP", "No session token available")
        return False
        
    headers = {"Authorization": f"Bearer {session_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            log_test("Auth Me", "PASS", f"User profile retrieved: {data.get('name', 'Unknown')}")
            return True
        else:
            log_test("Auth Me", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Auth Me", "FAIL", f"Exception: {str(e)}")
        return False

def test_create_product():
    """Test 4: Create Product/Payment Link"""
    global product_id, payment_link_code
    
    if not session_token:
        log_test("Create Product", "SKIP", "No session token available")
        return False
        
    headers = {"Authorization": f"Bearer {session_token}"}
    payload = {
        "name": "Handmade Basket",
        "price": 50000,
        "currency": "TZS",
        "description": "Beautiful handwoven basket"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/products", json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            product_id = data.get('product_id')
            payment_link_code = data.get('payment_link_code')
            log_test("Create Product", "PASS", f"Product created: {product_id}, Payment code: {payment_link_code}")
            return True
        else:
            log_test("Create Product", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Create Product", "FAIL", f"Exception: {str(e)}")
        return False

def test_get_products():
    """Test 5: Get Products"""
    if not session_token:
        log_test("Get Products", "SKIP", "No session token available")
        return False
        
    headers = {"Authorization": f"Bearer {session_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/products", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            log_test("Get Products", "PASS", f"Retrieved {len(data)} products")
            return True
        else:
            log_test("Get Products", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Get Products", "FAIL", f"Exception: {str(e)}")
        return False

def test_seller_stats():
    """Test 6: Get Seller Stats"""
    if not session_token:
        log_test("Seller Stats", "SKIP", "No session token available")
        return False
        
    headers = {"Authorization": f"Bearer {session_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/seller/stats", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            log_test("Seller Stats", "PASS", f"Stats retrieved: {json.dumps(data, indent=2)}")
            return True
        else:
            log_test("Seller Stats", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Seller Stats", "FAIL", f"Exception: {str(e)}")
        return False

def test_get_product_by_code():
    """Test 7: Get Product by Payment Code (Public)"""
    if not payment_link_code:
        log_test("Get Product by Code", "SKIP", "No payment link code available")
        return False
    
    try:
        response = requests.get(f"{BASE_URL}/pay/{payment_link_code}")
        
        if response.status_code == 200:
            data = response.json()
            log_test("Get Product by Code", "PASS", f"Product retrieved: {data.get('name', 'Unknown')}")
            return True
        else:
            log_test("Get Product by Code", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Get Product by Code", "FAIL", f"Exception: {str(e)}")
        return False

def test_create_order():
    """Test 8: Create Order"""
    global order_id
    
    if not product_id:
        log_test("Create Order", "SKIP", "No product_id available")
        return False
    
    payload = {
        "product_id": product_id,
        "buyer_name": "John Buyer",
        "buyer_phone": "+255712345679",
        "buyer_location": "Dar es Salaam",
        "payment_method": "mpesa"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/orders", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            order_id = data.get('order_id')
            log_test("Create Order", "PASS", f"Order created: {order_id}")
            return True
        else:
            log_test("Create Order", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Create Order", "FAIL", f"Exception: {str(e)}")
        return False

def test_simulate_payment():
    """Test 9: Simulate Payment"""
    if not order_id:
        log_test("Simulate Payment", "SKIP", "No order_id available")
        return False
    
    payload = {
        "order_id": order_id,
        "payment_method": "mpesa"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/payments/simulate", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            log_test("Simulate Payment", "PASS", f"Payment simulated: {data.get('status', 'Unknown')}")
            return True
        else:
            log_test("Simulate Payment", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Simulate Payment", "FAIL", f"Exception: {str(e)}")
        return False

def test_get_order():
    """Test 10: Get Order"""
    if not order_id:
        log_test("Get Order", "SKIP", "No order_id available")
        return False
    
    try:
        response = requests.get(f"{BASE_URL}/orders/{order_id}")
        
        if response.status_code == 200:
            data = response.json()
            log_test("Get Order", "PASS", f"Order retrieved: Status {data.get('status', 'Unknown')}")
            return True
        else:
            log_test("Get Order", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Get Order", "FAIL", f"Exception: {str(e)}")
        return False

def test_update_order_status():
    """Test 11a: Update Order Status (Seller)"""
    if not order_id or not session_token:
        log_test("Update Order Status", "SKIP", "No order_id or session_token available")
        return False
    
    headers = {"Authorization": f"Bearer {session_token}"}
    
    # First update to preparing
    try:
        payload = {"status": "preparing"}
        response = requests.put(f"{BASE_URL}/orders/{order_id}/status", json=payload, headers=headers)
        
        if response.status_code == 200:
            log_test("Update Order Status (Preparing)", "PASS", "Order status updated to preparing")
        else:
            log_test("Update Order Status (Preparing)", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Update Order Status (Preparing)", "FAIL", f"Exception: {str(e)}")
        return False
    
    # Then update to shipped
    try:
        payload = {"status": "shipped"}
        response = requests.put(f"{BASE_URL}/orders/{order_id}/status", json=payload, headers=headers)
        
        if response.status_code == 200:
            log_test("Update Order Status (Shipped)", "PASS", "Order status updated to shipped")
            return True
        else:
            log_test("Update Order Status (Shipped)", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("Update Order Status (Shipped)", "FAIL", f"Exception: {str(e)}")
        return False

def test_confirm_delivery():
    """Test 11b: Confirm Delivery"""
    if not order_id:
        log_test("Confirm Delivery", "SKIP", "No order_id available")
        return False
    
    try:
        response = requests.post(f"{BASE_URL}/orders/{order_id}/confirm-delivery")
        
        if response.status_code == 200:
            data = response.json()
            log_test("Confirm Delivery", "PASS", f"Delivery confirmed: {data.get('message', 'Success')}")
            return True
        else:
            log_test("Confirm Delivery", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Confirm Delivery", "FAIL", f"Exception: {str(e)}")
        return False

def test_payment_gateway_endpoints():
    """Test 12-14: Payment Gateway Endpoints (Mock Mode)"""
    
    # M-Pesa STK
    try:
        payload = {
            "phone": "+255712345678",
            "amount": 50000,
            "tx_ref": "TEST123"
        }
        response = requests.post(f"{BASE_URL}/payments/mpesa/stk", json=payload)
        
        if response.status_code == 200:
            log_test("M-Pesa STK", "PASS", "M-Pesa STK request successful")
        else:
            log_test("M-Pesa STK", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("M-Pesa STK", "FAIL", f"Exception: {str(e)}")
    
    # Selcom Checkout
    try:
        payload = {
            "amount": 50000,
            "phone": "+255712345678",
            "order_id": "TEST123",
            "buyer_name": "Test",
            "buyer_email": "test@test.com"
        }
        response = requests.post(f"{BASE_URL}/payments/selcom/checkout", json=payload)
        
        if response.status_code == 200:
            log_test("Selcom Checkout", "PASS", "Selcom checkout request successful")
        else:
            log_test("Selcom Checkout", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Selcom Checkout", "FAIL", f"Exception: {str(e)}")
    
    # Stripe Intent
    try:
        payload = {
            "amount_usd": 20,
            "tx_ref": "TEST123",
            "buyer_email": "test@test.com"
        }
        response = requests.post(f"{BASE_URL}/payments/stripe/create-intent", json=payload)
        
        if response.status_code == 200:
            log_test("Stripe Intent", "PASS", "Stripe payment intent created")
        else:
            log_test("Stripe Intent", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Stripe Intent", "FAIL", f"Exception: {str(e)}")

def test_escrow_endpoints():
    """Test 15: Escrow Endpoints"""
    try:
        payload = {
            "item": "Test Item",
            "amount": 50000,
            "buyer_id": "buyer1",
            "seller_id": "seller1",
            "payment_method": "mpesa"
        }
        response = requests.post(f"{BASE_URL}/escrow/create", json=payload)
        
        if response.status_code == 200:
            log_test("Create Escrow", "PASS", "Escrow created successfully")
        else:
            log_test("Create Escrow", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Create Escrow", "FAIL", f"Exception: {str(e)}")

def test_ai_endpoints():
    """Test 16-17: AI Endpoints"""
    
    # Support Chat
    try:
        payload = {
            "message": "Habari, pesa yangu iko wapi?"
        }
        response = requests.post(f"{BASE_URL}/ai/support", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            log_test("AI Support Chat", "PASS", f"AI response received: {data.get('response', 'No response')[:100]}...")
        else:
            log_test("AI Support Chat", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("AI Support Chat", "FAIL", f"Exception: {str(e)}")
    
    # Dispute Mediator
    try:
        payload = {
            "message": "The item was damaged"
        }
        response = requests.post(f"{BASE_URL}/ai/dispute", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            log_test("AI Dispute Mediator", "PASS", f"AI response received: {data.get('response', 'No response')[:100]}...")
        else:
            log_test("AI Dispute Mediator", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("AI Dispute Mediator", "FAIL", f"Exception: {str(e)}")

def test_kyc_endpoint():
    """Test 18: KYC Endpoint"""
    try:
        payload = {
            "national_id": "19900101-12345-00000-00",
            "first_name": "Amina",
            "last_name": "Juma",
            "dob": "1990-01-01",
            "phone": "0712345678"
        }
        response = requests.post(f"{BASE_URL}/kyc/verify-nin", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            log_test("KYC Verify NIN", "PASS", f"KYC verification: {data.get('status', 'Unknown')}")
        else:
            log_test("KYC Verify NIN", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("KYC Verify NIN", "FAIL", f"Exception: {str(e)}")

def main():
    """Run comprehensive backend API tests"""
    print("🎯 STARTING COMPREHENSIVE BACKEND API TESTING")
    print("=" * 60)
    print(f"Testing Backend URL: {BASE_URL}")
    print("=" * 60)
    
    # Test sequence as specified in review request
    test_auth_register()
    test_auth_login()
    test_auth_me()
    test_create_product()
    test_get_products()
    test_seller_stats()
    test_get_product_by_code()
    test_create_order()
    test_simulate_payment()
    test_get_order()
    test_update_order_status()  # New test to update order status
    test_confirm_delivery()
    test_payment_gateway_endpoints()
    test_escrow_endpoints()
    test_ai_endpoints()
    test_kyc_endpoint()
    
    print("=" * 60)
    print("🏁 BACKEND API TESTING COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()