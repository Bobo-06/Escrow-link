import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  kyc_tier?: number;
  is_verified?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'biz-salama-auth',
    }
  )
);
