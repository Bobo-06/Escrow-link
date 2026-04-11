import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Products API
export const productsApi = {
  create: (data: { 
    name: string; 
    price: number; 
    currency?: string;
    description?: string; 
    image?: string;
    export_category?: string;
    international_shipping?: boolean;
    shipping_countries?: string[];
  }) => api.post('/products', data),
  getAll: () => api.get('/products'),
  get: (productId: string) => api.get(`/products/${productId}`),
  delete: (productId: string) => api.delete(`/products/${productId}`),
};

// Public product API (buyer view)
export const paymentLinkApi = {
  getByCode: (code: string, currency: string = 'TZS') => 
    api.get(`/pay/${code}?currency=${currency}`),
};

// Orders API
export const ordersApi = {
  create: (data: {
    product_id: string;
    buyer_name: string;
    buyer_phone: string;
    buyer_location: string;
    buyer_country?: string;
    payment_method: string;
    buyer_currency?: string;
  }) => api.post('/orders', data),
  get: (orderId: string) => api.get(`/orders/${orderId}`),
  getSellerOrders: () => api.get('/seller/orders'),
  updateStatus: (orderId: string, status: string) => 
    api.put(`/orders/${orderId}/status`, { status }),
  confirmDelivery: (orderId: string) => 
    api.post(`/orders/${orderId}/confirm-delivery`),
  createDispute: (orderId: string, reason: string) => 
    api.post(`/orders/${orderId}/dispute`, { reason }),
};

// Payments API
export const paymentsApi = {
  // Simulated payment (for testing)
  simulate: (orderId: string, paymentMethod: string) => 
    api.post('/payments/simulate', { order_id: orderId, payment_method: paymentMethod }),
  
  // M-Pesa STK Push (Vodacom Tanzania)
  mpesaSTK: (data: { phone: string; amount: number; tx_ref: string }) => 
    api.post('/payments/mpesa/stk', data),
  
  // Selcom Pesalink checkout
  selcomCheckout: (data: { 
    amount: number; 
    phone: string; 
    order_id: string; 
    buyer_name: string; 
    buyer_email: string 
  }) => api.post('/payments/selcom/checkout', data),
  
  // Selcom STK Push
  selcomSTK: (data: { amount: number; phone: string; transaction_ref: string }) => 
    api.post('/payments/selcom/stk', data),
  
  // Stripe payment intent (for card/diaspora)
  stripeCreateIntent: (data: { amount_usd: number; tx_ref: string; buyer_email: string }) => 
    api.post('/payments/stripe/create-intent', data),
  
  stripeCapture: (intentId: string) => 
    api.post('/payments/stripe/capture', { intent_id: intentId }),
  
  stripeCancel: (intentId: string, reason?: string) => 
    api.post('/payments/stripe/cancel', { intent_id: intentId, reason }),
  
  // NALA (Diaspora payments)
  nalaTransfer: (data: { 
    sender_phone: string; 
    receiver_phone: string; 
    amount_tzs: number;
    currency: string;
    tx_ref: string 
  }) => api.post('/payments/nala/transfer', data),
};

// Escrow API
export const escrowApi = {
  create: (data: {
    item: string;
    amount: number;
    currency?: string;
    buyer_id: string;
    seller_id: string;
    payment_method: string;
  }) => api.post('/escrow/create', data),
  
  release: (txId: string, buyerId: string) => 
    api.post('/escrow/release', { tx_id: txId, buyer_id: buyerId }),
  
  dispute: (data: { tx_id: string; reason: string; evidence?: string; buyer_id: string }) => 
    api.post('/escrow/dispute', data),
};

// KYC API
export const kycApi = {
  verifyNIN: (data: {
    national_id: string;
    first_name: string;
    last_name: string;
    dob: string;
    phone: string;
  }) => api.post('/kyc/verify-nin', data),
  
  verifySelfie: (data: { selfie_base64: string; national_id: string; user_id: string }) => 
    api.post('/kyc/selfie', data),
};

// Notifications API
export const notificationsApi = {
  sendSMS: (data: { phone: string; type: string; data: Record<string, any> }) => 
    api.post('/notifications/sms', data),
  
  subscribePush: (data: { subscription: Record<string, any>; user_id: string }) => 
    api.post('/notifications/push/subscribe', data),
};

// Stats API
export const statsApi = {
  getSellerStats: () => api.get('/seller/stats'),
  getTradeHistory: () => api.get('/seller/trade-history'),
};

// Currency API
export const currencyApi = {
  getCurrencies: () => api.get('/currencies'),
  getExportCategories: () => api.get('/export-categories'),
};

export default api;
