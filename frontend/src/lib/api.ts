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
  /**
   * Create a product. Backend expects JSON matching `ProductCreate`.
   * Use the `lib/imageUpload.ts` helper to produce the `image_b64` field
   * — never send raw camera bytes (they exceed FastAPI's body limit).
   */
  create: (data: {
    name: string;
    price: number;
    currency?: string;
    description?: string;
    image_b64?: string;
    category?: string;
    location?: string;
    listed_via_voice?: boolean;
  }) => api.post('/products', data),
  getBySeller: (sellerId: string) => api.get(`/products/seller/${sellerId}`),
  getMine: () => api.get('/products/mine'),
  getOneMine: (id: string) => api.get(`/products/${id}`),
  update: (id: string, data: Partial<{
    name: string;
    price: number;
    description: string | null;
    image_b64: string | null;
    category: string;
    location: string | null;
    is_active: boolean;
  }>) => api.patch(`/products/${id}`, data),
  remove: (id: string) => api.delete(`/products/${id}`),
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
