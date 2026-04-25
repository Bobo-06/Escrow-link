import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Phone, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import { useT } from '../i18n';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { t } = useT();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Normalize Tanzanian phone → +255XXXXXXXXX
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
    
    if (!name || !phone || !password) {
      toast.error(t("reg.error_fill"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("reg.error_match"));
      return;
    }

    if (!acceptTerms) {
      toast.error(t("reg.error_terms"));
      return;
    }

    const normalizedPhone = normalizeTzPhone(phone);

    try {
      setLoading(true);
      const response = await authAPI.register({ name, phone: normalizedPhone, password });
      const { session_token, ...user } = response.data;
      setAuth(session_token, user);
      toast.success(t("reg.success"));
      navigate('/dashboard');
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || t("reg.failed");
      toast.error(msg);
      console.error('Register error:', error.response?.status, error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    t("reg.benefit1"),
    t("reg.benefit2"),
    t("reg.benefit3"),
    t("reg.benefit4"),
  ];

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-12">
      <SEO
        title="Create Your Free Seller Account"
        description="Join 1,200+ sellers on Biz-Salama. Start selling with escrow protection, verified buyers, and M-Pesa payments. Free to register."
        url="/register"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block"
          >
            <h1 className="text-4xl font-display font-bold text-white mb-6">
              {t("reg.title")}{' '}
              <span className="gradient-text">{t("reg.title_b")}</span>
            </h1>
            <p className="text-ink-400 text-lg mb-8">
              {t("reg.subtitle")}
            </p>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center"
                >
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center mr-4">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-ink-300">{benefit}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 p-6 glass rounded-2xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center text-ink-900 font-bold text-lg">
                  MB
                </div>
                <div className="ml-4">
                  <p className="text-white font-semibold">Mama Biashara</p>
                  <p className="text-ink-400 text-sm">{t("reg.testimonial_role")}</p>
                </div>
              </div>
              <p className="text-ink-300 italic">
                {t("reg.testimonial_quote")}
              </p>
            </div>
          </motion.div>

          {/* Right - Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8 lg:hidden">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl mb-4">
                <Shield className="w-8 h-8 text-ink-900" />
              </div>
              <h1 className="text-3xl font-display font-bold text-white mb-2">
                {t("reg.create")}
              </h1>
              <p className="text-ink-400">
                {t("reg.join")}
              </p>
            </div>

            <div className="glass rounded-2xl p-8">
              <div className="hidden lg:block text-center mb-6">
                <h2 className="text-2xl font-display font-bold text-white">{t("reg.create_long")}</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-ink-300 text-sm font-medium mb-2">
                    {t("reg.full_name")}
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("reg.full_name_ph")}
                      className="w-full pl-12 pr-4 py-4 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-ink-300 text-sm font-medium mb-2">
                    {t("login.phone_label")}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+255 712 345 678"
                      className="w-full pl-12 pr-4 py-4 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-ink-300 text-sm font-medium mb-2">
                    {t("login.password_label")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("reg.password_ph")}
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

                <div>
                  <label className="block text-ink-300 text-sm font-medium mb-2">
                    {t("reg.confirm_password")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("reg.confirm_password_ph")}
                      className="w-full pl-12 pr-4 py-4 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>
                </div>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="w-5 h-5 rounded border-ink-600 text-gold-500 focus:ring-gold-500 bg-ink-700 mt-0.5"
                  />
                  <span className="ml-3 text-ink-400 text-sm">
                    {t("reg.agree")}{' '}
                    <a href="#" className="text-gold-400 hover:underline">{t("reg.terms")}</a>
                    {' '}{t("reg.and")}{' '}
                    <a href="#" className="text-gold-400 hover:underline">{t("reg.privacy")}</a>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 rounded-xl font-bold text-lg hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {t("reg.create")}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-ink-400">
                  {t("reg.have_account")}{' '}
                  <Link to="/login" className="text-gold-400 font-medium hover:underline">
                    {t("reg.login_link")}
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Register;
