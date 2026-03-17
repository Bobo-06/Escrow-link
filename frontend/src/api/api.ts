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
  create: (data: { name: string; price: number; description?: string; image?: string }) => 
    api.post('/products', data),
  getAll: () => api.get('/products'),
  get: (productId: string) => api.get(`/products/${productId}`),
  delete: (productId: string) => api.delete(`/products/${productId}`),
};

// Public product API (buyer view)
export const paymentLinkApi = {
  getByCode: (code: string) => api.get(`/pay/${code}`),
};

// Orders API
export const ordersApi = {
  create: (data: {
    product_id: string;
    buyer_name: string;
    buyer_phone: string;
    buyer_location: string;
    payment_method: string;
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

// Payments API (Mock)
export const paymentsApi = {
  simulate: (orderId: string, paymentMethod: string) => 
    api.post('/payments/simulate', { order_id: orderId, payment_method: paymentMethod }),
};

// Stats API
export const statsApi = {
  getSellerStats: () => api.get('/seller/stats'),
};

export default api;
