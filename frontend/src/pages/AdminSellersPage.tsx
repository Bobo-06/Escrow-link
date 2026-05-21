import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Loader2, ShieldCheck, UserCheck, RefreshCw, EyeOff, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import SEO from '../components/SEO';

interface Seller {
  user_id: string;
  name: string;
  phone: string;
  email?: string | null;
  business_name?: string | null;
  location?: string | null;
  bio?: string | null;
  picture?: string | null;
  is_verified?: boolean;
  is_active?: boolean;
  auth_type?: string;
  kyc_status?: string;
  created_at?: string;
  products_count?: number;
}

/**
 * /admin/sellers — Admin-only directory of every seller account.
 *
 * Created by either:
 *   • the admin-direct flow at /admin/sellers/new (this module);
 *   • the field-rep onboarding flow → /admin/onboarding/queue → approve.
 * Both surface here so the back office has one screen to find / pause /
 * resend-password-link any seller.
 */
export default function AdminSellersPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { lang } = useT();

  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/sellers', { params: search ? { search } : {} });
      setSellers(res.data?.sellers || []);
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } };
      if (e?.response?.status === 403) {
        toast.error(lang === 'sw' ? 'Hii ni ukurasa wa admin tu' : 'Admin only');
      } else {
        toast.error(e?.response?.data?.detail || 'Failed to load');
      }
      setSellers([]);
    }
  }, [search, lang]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    void load();
  }, [isAuthenticated, user?.role, load]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6">
        <SEO title="Admin only" url="/admin/sellers" noindex />
        <div className="max-w-md mx-auto bg-ink-800 border border-ink-700 rounded-2xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">
            {lang === 'sw' ? 'Ingia kama admin' : 'Sign in as admin'}
          </h2>
        </div>
      </div>
    );
  }

  const toggleActive = async (s: Seller) => {
    setBusy(s.user_id);
    try {
      await api.patch(`/admin/sellers/${s.user_id}`, { is_active: !s.is_active });
      toast.success(!s.is_active ? (lang === 'sw' ? 'Imewashwa' : 'Activated') : (lang === 'sw' ? 'Imezimwa' : 'Deactivated'));
      await load();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  const resendLink = async (s: Seller) => {
    setBusy(s.user_id);
    try {
      const res = await api.post(`/admin/sellers/${s.user_id}/resend-password-link`);
      const link = res.data?.set_password_link as string | undefined;
      if (link) {
        await navigator.clipboard.writeText(link).catch(() => {});
        toast.success(lang === 'sw' ? 'SMS imetumwa. Kiungo kimenakiliwa.' : 'SMS sent. Link copied to clipboard.');
      } else {
        toast.success(lang === 'sw' ? 'SMS imetumwa' : 'SMS sent');
      }
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Resend failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-16 px-4 sm:px-6">
      <SEO title="Sellers" url="/admin/sellers" noindex />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold">Admin · Sellers</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              {lang === 'sw' ? 'Wauzaji' : 'Sellers'}
            </h1>
            <p className="text-ink-400 text-sm mt-1">
              {lang === 'sw' ? 'Sajili na hudumia wauzaji.' : 'Register and manage seller accounts.'}
            </p>
          </div>
          <Link
            to="/admin/sellers/new"
            data-testid="admin-add-seller-btn"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gold-500 text-ink-900 font-bold hover:bg-gold-400 transition"
          >
            <Plus className="w-4 h-4" /> {lang === 'sw' ? 'Sajili muuzaji' : 'Register seller'}
          </Link>
        </div>

        <div className="bg-ink-800 border border-ink-700 rounded-2xl p-4 mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'sw' ? 'Tafuta kwa jina, biashara au simu…' : 'Search by name, business or phone…'}
              data-testid="admin-sellers-search"
              className="w-full bg-ink-900 border border-ink-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-gold-500/60"
            />
          </div>
        </div>

        {sellers === null && (
          <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gold-400 mx-auto" /></div>
        )}

        {sellers && sellers.length === 0 && (
          <div data-testid="admin-sellers-empty" className="bg-ink-800 border border-ink-700 rounded-2xl p-10 text-center">
            <UserCheck className="w-10 h-10 text-ink-500 mx-auto mb-3" />
            <p className="text-ink-300">
              {search
                ? (lang === 'sw' ? 'Hakuna muuzaji aliyepatikana.' : 'No sellers match that search.')
                : (lang === 'sw' ? 'Bado hujasajili muuzaji yeyote.' : "You haven't registered any sellers yet.")}
            </p>
            <Link to="/admin/sellers/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 text-ink-900 font-bold">
              <Plus className="w-4 h-4" /> {lang === 'sw' ? 'Sajili wa kwanza' : 'Register the first one'}
            </Link>
          </div>
        )}

        {sellers && sellers.length > 0 && (
          <div data-testid="admin-sellers-list" className="space-y-3">
            {sellers.map((s) => (
              <motion.div
                key={s.user_id}
                layout
                data-testid={`seller-row-${s.user_id}`}
                className={`flex items-start gap-4 bg-ink-800 border ${s.is_active === false ? 'border-rose-500/20 opacity-70' : 'border-ink-700'} rounded-2xl p-4`}
              >
                <div className="w-12 h-12 rounded-full bg-ink-900 border border-ink-700 overflow-hidden flex items-center justify-center shrink-0">
                  {s.picture ? (
                    <img src={s.picture} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg text-ink-500">{(s.name || 'S').slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-bold truncate">{s.business_name || s.name}</h3>
                    {s.is_verified && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">VERIFIED</span>}
                    {s.is_active === false && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">DEACTIVATED</span>}
                    {s.auth_type === 'password_pending' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">PWD PENDING</span>}
                  </div>
                  <p className="text-ink-400 text-xs mt-0.5 truncate">
                    {s.name} · {s.phone} {s.location ? `· ${s.location}` : ''}
                  </p>
                  <p className="text-ink-500 text-xs mt-0.5">
                    {(s.products_count || 0)} {lang === 'sw' ? 'bidhaa' : 'product(s)'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    to={`/seller/${s.user_id}`}
                    data-testid={`seller-view-${s.user_id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-ink-700 text-ink-200 hover:bg-ink-600"
                  >
                    {lang === 'sw' ? 'Tazama' : 'View'}
                  </Link>
                  {s.auth_type === 'password_pending' && (
                    <button
                      onClick={() => resendLink(s)}
                      disabled={busy === s.user_id}
                      data-testid={`seller-resend-link-${s.user_id}`}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" /> {lang === 'sw' ? 'Tuma kiungo' : 'Resend link'}
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(s)}
                    disabled={busy === s.user_id}
                    data-testid={`seller-toggle-${s.user_id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-ink-700 text-ink-200 hover:bg-ink-600 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {s.is_active === false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {s.is_active === false ? (lang === 'sw' ? 'Wezesha' : 'Activate') : (lang === 'sw' ? 'Zima' : 'Deactivate')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
