import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  login: (phone: string, password: string) =>
    api.post('/auth/login', { phone, password }),
  register: (data: { phone: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Products APIs
export const productsAPI = {
  getAll: (params?: { category?: string; search?: string; sort?: string }) =>
    api.get('/products/public', { params }),
  getOne: (id: string) => api.get(`/products/detail/${id}`),
  create: (data: FormData) =>
    api.post('/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getBySeller: (sellerId: string) => api.get(`/products/seller/${sellerId}`),
};

// Orders APIs
export const ordersAPI = {
  create: (data: any) => api.post('/orders', data),
  getOne: (id: string) => api.get(`/orders/${id}`),
  getMine: () => api.get('/orders/mine'),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
};

// Sellers APIs
export const sellersAPI = {
  getProfile: (id: string) => api.get(`/sellers/${id}`),
  getStats: () => api.get('/seller/stats'),
};

export default api;
