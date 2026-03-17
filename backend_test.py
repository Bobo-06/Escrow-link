#!/usr/bin/env python3
"""
CraftHer Backend API Testing Script
Tests the complete payment flow for social sellers platform
"""

import requests
import json
import time
from datetime import datetime

# Base URL from environment - testing uses the public URL
BASE_URL = "https://pay-secure-3.preview.emergentagent.com/api"

# Test credentials provided in request
TEST_CREDENTIALS = {
    "email": "testmama@test.com",
    "password": "test123"
}

# Test data for creating realistic content
SAMPLE_PRODUCT = {
    "name": "Handmade Ankara Dress - Size M",
    "price": 50000,  # 50,000 TZS as specified in request
    "description": "Beautiful handmade Ankara dress, perfect for special occasions. Made with high-quality fabric.",
    "image": None  # Could add base64 image later
}

SAMPLE_ORDER = {
    "buyer_name": "Amina Hassan", 
    "buyer_phone": "+255789123456",
    "buyer_location": "Dar es Salaam, Kinondoni",
    "payment_method": "mpesa"
}

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.user_data = None
        self.product_data = None
        self.order_data = None
        self.payment_link_code = None
        
    def log(self, message, level="INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def make_request(self, method, endpoint, data=None, auth_required=False):
        """Make HTTP request with optional authentication"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_required and self.session_token:
            headers["Authorization"] = f"Bearer {self.session_token}"
            
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers)
            elif method == "PUT":
                response = self.session.put(url, json=data, headers=headers)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers)
                
            self.log(f"{method} {endpoint} -> {response.status_code}")
            return response
        except Exception as e:
            self.log(f"Request failed: {e}", "ERROR")
            return None
    
    def test_health_check(self):
        """Test basic API health"""
        self.log("=== Testing API Health ===")
        response = self.make_request("GET", "/health")
        
        if response and response.status_code == 200:
            self.log("✅ API health check passed")
            return True
        else:
            self.log("❌ API health check failed", "ERROR")
            return False
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        self.log("=== Testing User Registration ===")
        
        # First try to register with test credentials
        registration_data = {
            "email": TEST_CREDENTIALS["email"],
            "password": TEST_CREDENTIALS["password"],
            "name": "Mama Test",
            "phone": "+255789123456",
            "business_name": "Mama Test Crafts"
        }
        
        response = self.make_request("POST", "/auth/register", registration_data)
        
        if response:
            if response.status_code == 200:
                data = response.json()
                self.session_token = data.get('session_token')
                self.user_data = data
                self.log("✅ User registration successful")
                self.log(f"   User ID: {data.get('user_id')}")
                self.log(f"   Email: {data.get('email')}")
                return True
            elif response.status_code == 400:
                # User already exists, try login instead
                self.log("ℹ️ User already exists, will test login")
                return True
            else:
                self.log(f"❌ Registration failed: {response.text}", "ERROR")
                return False
        return False
    
    def test_user_login(self):
        """Test user login endpoint"""
        self.log("=== Testing User Login ===")
        
        response = self.make_request("POST", "/auth/login", TEST_CREDENTIALS)
        
        if response and response.status_code == 200:
            data = response.json()
            self.session_token = data.get('session_token')
            self.user_data = data
            self.log("✅ User login successful")
            self.log(f"   User ID: {data.get('user_id')}")
            self.log(f"   Session Token: {self.session_token[:20]}...")
            return True
        else:
            self.log(f"❌ Login failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_auth_me(self):
        """Test getting current user info"""
        self.log("=== Testing Auth Me Endpoint ===")
        
        response = self.make_request("GET", "/auth/me", auth_required=True)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log("✅ Auth me successful")
            self.log(f"   Name: {data.get('name')}")
            self.log(f"   Email: {data.get('email')}")
            return True
        else:
            self.log(f"❌ Auth me failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_profile_update(self):
        """Test updating user profile"""
        self.log("=== Testing Profile Update ===")
        
        update_data = {
            "name": "Mama Test Updated",
            "business_name": "Mama Test Premium Crafts"
        }
        
        response = self.make_request("PUT", "/auth/profile", update_data, auth_required=True)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log("✅ Profile update successful")
            self.log(f"   Updated name: {data.get('name')}")
            self.log(f"   Updated business: {data.get('business_name')}")
            return True
        else:
            self.log(f"❌ Profile update failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_create_product(self):
        """Test creating a product/payment link"""
        self.log("=== Testing Product Creation ===")
        
        response = self.make_request("POST", "/products", SAMPLE_PRODUCT, auth_required=True)
        
        if response and response.status_code == 200:
            data = response.json()
            self.product_data = data
            self.payment_link_code = data.get('payment_link_code')
            
            self.log("✅ Product creation successful")
            self.log(f"   Product ID: {data.get('product_id')}")
            self.log(f"   Payment Link Code: {self.payment_link_code}")
            self.log(f"   Total Buyer Pays: TZS {data.get('total_buyer_pays'):,.0f}")
            self.log(f"   Seller Receives: TZS {data.get('seller_receives'):,.0f}")
            
            # Verify fee calculations (3% buyer + 2% seller)
            expected_buyer_fee = SAMPLE_PRODUCT["price"] * 0.03
            expected_seller_fee = SAMPLE_PRODUCT["price"] * 0.02
            expected_total = SAMPLE_PRODUCT["price"] + expected_buyer_fee
            expected_seller_payout = SAMPLE_PRODUCT["price"] - expected_seller_fee
            
            if abs(data.get('total_buyer_pays') - expected_total) < 0.01:
                self.log("✅ Fee calculation correct")
            else:
                self.log("❌ Fee calculation incorrect", "ERROR")
                
            return True
        else:
            self.log(f"❌ Product creation failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_get_products(self):
        """Test getting seller's products"""
        self.log("=== Testing Get My Products ===")
        
        response = self.make_request("GET", "/products", auth_required=True)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log(f"✅ Get products successful - {len(data)} products found")
            return True
        else:
            self.log(f"❌ Get products failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_get_product_by_code(self):
        """Test public product endpoint (buyer view)"""
        self.log("=== Testing Get Product by Payment Code ===")
        
        if not self.payment_link_code:
            self.log("❌ No payment link code available", "ERROR")
            return False
            
        response = self.make_request("GET", f"/pay/{self.payment_link_code}")
        
        if response and response.status_code == 200:
            data = response.json()
            self.log("✅ Get product by code successful")
            self.log(f"   Product: {data.get('name')}")
            self.log(f"   Seller: {data.get('seller_name')}")
            self.log(f"   Seller Verified: {data.get('seller_verified')}")
            return True
        else:
            self.log(f"❌ Get product by code failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_create_order(self):
        """Test creating an order (buyer action)"""
        self.log("=== Testing Order Creation ===")
        
        if not self.product_data:
            self.log("❌ No product available for order", "ERROR")
            return False
            
        order_data = {
            **SAMPLE_ORDER,
            "product_id": self.product_data.get('product_id')
        }
        
        response = self.make_request("POST", "/orders", order_data)
        
        if response and response.status_code == 200:
            data = response.json()
            self.order_data = data
            
            self.log("✅ Order creation successful")
            self.log(f"   Order ID: {data.get('order_id')}")
            self.log(f"   Status: {data.get('status')}")
            self.log(f"   Total to Pay: TZS {data.get('total_paid'):,.0f}")
            self.log(f"   Escrow Status: {data.get('escrow_status')}")
            return True
        else:
            self.log(f"❌ Order creation failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_get_order(self):
        """Test getting order details"""
        self.log("=== Testing Get Order Details ===")
        
        if not self.order_data:
            self.log("❌ No order available", "ERROR")
            return False
            
        order_id = self.order_data.get('order_id')
        response = self.make_request("GET", f"/orders/{order_id}")
        
        if response and response.status_code == 200:
            data = response.json()
            self.log("✅ Get order details successful")
            self.log(f"   Order Status: {data.get('status')}")
            self.log(f"   Escrow Status: {data.get('escrow_status')}")
            return True
        else:
            self.log(f"❌ Get order details failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_simulate_payment(self):
        """Test simulating mobile money payment"""
        self.log("=== Testing Payment Simulation ===")
        
        if not self.order_data:
            self.log("❌ No order available for payment", "ERROR")
            return False
            
        payment_data = {
            "order_id": self.order_data.get('order_id'),
            "payment_method": "mpesa"
        }
        
        response = self.make_request("POST", "/payments/simulate", payment_data)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log("✅ Payment simulation successful")
            self.log(f"   Message: {data.get('message')}")
            self.log(f"   Escrow Status: {data.get('escrow_status')}")
            self.log(f"   Order Status: {data.get('order_status')}")
            
            # Update order data with new status
            if data.get('order_status'):
                self.order_data['status'] = data['order_status']
            return True
        else:
            self.log(f"❌ Payment simulation failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_order_status_updates(self):
        """Test updating order status (seller actions)"""
        self.log("=== Testing Order Status Updates ===")
        
        if not self.order_data:
            self.log("❌ No order available", "ERROR")
            return False
            
        order_id = self.order_data.get('order_id')
        status_flow = ['preparing', 'shipped']
        
        for new_status in status_flow:
            self.log(f"   Updating order to: {new_status}")
            
            update_data = {"status": new_status}
            response = self.make_request("PUT", f"/orders/{order_id}/status", update_data, auth_required=True)
            
            if response and response.status_code == 200:
                self.log(f"   ✅ Status updated to {new_status}")
                self.order_data['status'] = new_status
            else:
                self.log(f"   ❌ Failed to update to {new_status}: {response.text if response else 'No response'}", "ERROR")
                return False
                
        return True
    
    def test_confirm_delivery(self):
        """Test buyer confirming delivery"""
        self.log("=== Testing Delivery Confirmation ===")
        
        if not self.order_data:
            self.log("❌ No order available", "ERROR")
            return False
            
        order_id = self.order_data.get('order_id')
        response = self.make_request("POST", f"/orders/{order_id}/confirm-delivery")
        
        if response and response.status_code == 200:
            data = response.json()
            self.log("✅ Delivery confirmation successful")
            self.log(f"   Message: {data.get('message')}")
            self.log(f"   Escrow Status: {data.get('escrow_status')}")
            return True
        else:
            self.log(f"❌ Delivery confirmation failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_seller_orders(self):
        """Test getting seller's orders"""
        self.log("=== Testing Get Seller Orders ===")
        
        response = self.make_request("GET", "/seller/orders", auth_required=True)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log(f"✅ Get seller orders successful - {len(data)} orders found")
            if data:
                latest_order = data[0]
                self.log(f"   Latest order status: {latest_order.get('status')}")
                self.log(f"   Latest order escrow: {latest_order.get('escrow_status')}")
            return True
        else:
            self.log(f"❌ Get seller orders failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_seller_stats(self):
        """Test getting seller dashboard stats"""
        self.log("=== Testing Seller Stats ===")
        
        response = self.make_request("GET", "/seller/stats", auth_required=True)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log("✅ Seller stats successful")
            self.log(f"   Products: {data.get('products_count')}")
            self.log(f"   Total Orders: {data.get('total_orders')}")
            self.log(f"   Completed Orders: {data.get('completed_orders')}")
            self.log(f"   Total Earnings: TZS {data.get('total_earnings', 0):,.0f}")
            self.log(f"   Pending Earnings: TZS {data.get('pending_earnings', 0):,.0f}")
            return True
        else:
            self.log(f"❌ Seller stats failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_dispute_flow(self):
        """Test creating a dispute"""
        self.log("=== Testing Dispute Creation ===")
        
        # Create a new order for dispute testing
        if not self.product_data:
            self.log("❌ No product available for dispute test", "ERROR")
            return False
            
        # Create test order for dispute
        order_data = {
            **SAMPLE_ORDER,
            "product_id": self.product_data.get('product_id'),
            "buyer_name": "John Dispute Test"
        }
        
        response = self.make_request("POST", "/orders", order_data)
        if not response or response.status_code != 200:
            self.log("❌ Failed to create test order for dispute", "ERROR")
            return False
            
        test_order = response.json()
        order_id = test_order.get('order_id')
        
        # Create dispute
        dispute_data = {"reason": "not_delivered"}
        response = self.make_request("POST", f"/orders/{order_id}/dispute", dispute_data)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log("✅ Dispute creation successful")
            self.log(f"   Message: {data.get('message')}")
            self.log(f"   Dispute ID: {data.get('dispute_id')}")
            return True
        else:
            self.log(f"❌ Dispute creation failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def test_logout(self):
        """Test user logout"""
        self.log("=== Testing User Logout ===")
        
        response = self.make_request("POST", "/auth/logout", auth_required=True)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log("✅ Logout successful")
            self.log(f"   Message: {data.get('message')}")
            self.session_token = None
            return True
        else:
            self.log(f"❌ Logout failed: {response.text if response else 'No response'}", "ERROR")
            return False
    
    def run_full_test_suite(self):
        """Run the complete test suite"""
        self.log("🚀 Starting CraftHer Backend API Tests")
        self.log(f"Testing against: {BASE_URL}")
        
        test_results = []
        
        # Basic tests
        test_results.append(("Health Check", self.test_health_check()))
        
        # Authentication flow
        test_results.append(("User Registration", self.test_user_registration()))
        test_results.append(("User Login", self.test_user_login()))
        test_results.append(("Auth Me", self.test_auth_me()))
        test_results.append(("Profile Update", self.test_profile_update()))
        
        # Product management
        test_results.append(("Create Product", self.test_create_product()))
        test_results.append(("Get My Products", self.test_get_products()))
        test_results.append(("Get Product by Code", self.test_get_product_by_code()))
        
        # Order flow
        test_results.append(("Create Order", self.test_create_order()))
        test_results.append(("Get Order Details", self.test_get_order()))
        test_results.append(("Simulate Payment", self.test_simulate_payment()))
        test_results.append(("Order Status Updates", self.test_order_status_updates()))
        test_results.append(("Confirm Delivery", self.test_confirm_delivery()))
        
        # Dashboard and management
        test_results.append(("Get Seller Orders", self.test_seller_orders()))
        test_results.append(("Seller Stats", self.test_seller_stats()))
        
        # Edge cases
        test_results.append(("Dispute Flow", self.test_dispute_flow()))
        test_results.append(("User Logout", self.test_logout()))
        
        # Summary
        self.log("\n" + "="*60)
        self.log("🏁 TEST RESULTS SUMMARY")
        self.log("="*60)
        
        passed = 0
        failed = 0
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status}  {test_name}")
            if result:
                passed += 1
            else:
                failed += 1
        
        self.log("="*60)
        self.log(f"📊 FINAL SCORE: {passed} PASSED, {failed} FAILED")
        
        if failed == 0:
            self.log("🎉 ALL TESTS PASSED! CraftHer backend is working correctly.")
        else:
            self.log(f"⚠️  {failed} tests failed. Please review the errors above.")
        
        return failed == 0

def main():
    """Main test execution function"""
    tester = APITester()
    success = tester.run_full_test_suite()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())