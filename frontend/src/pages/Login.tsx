import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Normalize Tanzanian phone → +255XXXXXXXXX (strips spaces, handles 0X/+/255 prefixes)
  const normalizeTzPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('255') && digits.length === 12) return '+' + digits;
    if (digits.startsWith('0') && digits.length === 10) return '+255' + digits.slice(1);
    if (digits.length === 9 && digits.startsWith('7')) return '+255' + digits;
    return raw.startsWith('+') ? raw.trim() : '+' + digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    const normalizedPhone = normalizeTzPhone(phone);

    try {
      setLoading(true);
      const response = await authAPI.login(normalizedPhone, password);
      const { session_token, ...user } = response.data;
      setAuth(session_token, user);
      toast.success('Karibu! / Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Login failed';
      toast.error(msg);
      console.error('Login error:', error.response?.status, error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center pt-20 pb-12 px-4">
      <SEO
        title="Sign In"
        description="Sign in to your Biz-Salama account to buy, sell, and track escrow-protected transactions."
        url="/login"
        noindex
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-ink-900" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-ink-400">
            Sign in to your Biz-Salama account
          </p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-ink-300 text-sm font-medium mb-2">
                Phone Number (Nambari ya Simu)
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  data-testid="login-phone-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+255 712 345 678"
                  className="w-full pl-12 pr-4 py-4 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>
              <p className="text-ink-500 text-xs mt-1.5">
                Any format works: <code className="text-gold-400">0712345678</code>, <code className="text-gold-400">712345678</code>, or <code className="text-gold-400">+255712345678</code>
              </p>
            </div>

            <div>
              <label className="block text-ink-300 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-4 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 rounded border-ink-600 text-gold-500 focus:ring-gold-500 bg-ink-700" />
                <span className="ml-2 text-ink-400 text-sm">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-gold-400 text-sm hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 rounded-xl font-bold text-lg hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-ink-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-gold-400 font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
