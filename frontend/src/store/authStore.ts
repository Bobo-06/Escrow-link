import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

// Get backend URL - handle web and native differently
const getBackendUrl = () => {
  // For web, use process.env directly
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }
  // For native, also use process.env (Expo loads .env vars)
  return process.env.EXPO_PUBLIC_BACKEND_URL || '';
};

const API_URL = getBackendUrl();

console.log('Auth Store - API_URL:', API_URL);

export interface User {
  user_id: string;
  email: string;
  name: string;
  phone?: string;
  business_name?: string;
  picture?: string;
  is_verified: boolean;
  auth_type: string;
  created_at: string;
}

interface LoginData {
  email?: string;
  phone?: string;
  password: string;
}

interface RegisterData {
  email?: string;
  phone?: string;
  password: string;
  name: string;
  business_name?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  setUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => Promise<void>;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
  login: (data: LoginData) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  exchangeSession: (sessionId: string) => Promise<User>;
  updateProfile: (data: { name?: string; phone?: string; business_name?: string }) => Promise<User>;
}

// Create axios instance for auth
const authApi = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  withCredentials: true,
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  sessionToken: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setSessionToken: async (token) => {
    if (token) {
      await AsyncStorage.setItem('session_token', token);
    } else {
      await AsyncStorage.removeItem('session_token');
    }
    set({ sessionToken: token });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem('session_token');
      
      if (!token) {
        set({ isLoading: false, isAuthenticated: false, user: null });
        return false;
      }

      const response = await authApi.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      set({ 
        user: response.data, 
        isAuthenticated: true, 
        isLoading: false,
        sessionToken: token 
      });
      return true;
    } catch (error) {
      console.log('Auth check failed:', error);
      await AsyncStorage.removeItem('session_token');
      set({ user: null, isAuthenticated: false, isLoading: false, sessionToken: null });
      return false;
    }
  },

  logout: async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        await authApi.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('session_token');
      set({ user: null, isAuthenticated: false, sessionToken: null });
    }
  },

  login: async (data: LoginData) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, data, {
      withCredentials: true,
    });
    
    const userData = response.data;
    const sessionToken = userData.session_token;
    
    await AsyncStorage.setItem('session_token', sessionToken);
    
    set({ user: userData, isAuthenticated: true, sessionToken });
    return userData;
  },

  register: async (data: RegisterData) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, data, {
      withCredentials: true,
    });
    
    const userData = response.data;
    const sessionToken = userData.session_token; // Use token from response
    
    await AsyncStorage.setItem('session_token', sessionToken);
    
    set({ user: userData, isAuthenticated: true, sessionToken });
    return userData;
  },

  exchangeSession: async (sessionId) => {
    const response = await axios.post(`${API_URL}/api/auth/session`, { session_id: sessionId }, {
      withCredentials: true,
    });
    
    const userData = response.data;
    const sessionToken = userData.session_token; // Use token from response
    
    await AsyncStorage.setItem('session_token', sessionToken);
    
    set({ user: userData, isAuthenticated: true, sessionToken });
    return userData;
  },

  updateProfile: async (data) => {
    const token = await AsyncStorage.getItem('session_token');
    const response = await authApi.put('/auth/profile', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    set({ user: response.data });
    return response.data;
  }
}));
