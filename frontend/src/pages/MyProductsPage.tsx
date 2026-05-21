import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Plus, Copy, Eye, EyeOff, Loader2, ShieldCheck, Package, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import SEO from '../components/SEO';

/**
 * /my-products — Authenticated seller's own inventory.
 *
 * Differs from public `/seller/:id` (active-only, no edit buttons) in that
 * this view shows every product the seller has created — including
 * deactivated ones — and surfaces edit / hide / delete affordances directly
 * on each card. Designed mobile-first because most TZ sellers manage their
 * shop from a phone.
 */
interface Product {
  product_id: string;
  name: string;
  price: number;
  price_tzs?: number;
  currency?: string;
  description?: string | null;
  image_b64?: string | null;
  image?: string | null;
  category?: string | null;
  location?: string | null;
  payment_link_code?: string;
  is_active?: boolean;
  created_at?: string;
}

export default function MyProductsPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { lang } = useT();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await productsAPI.getMine();
      setProducts(res.data?.products || []);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      toast.error(e?.response?.data?.detail || e?.message || 'Failed to load products');
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated, load]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6">
        <SEO title="Sign in" url="/my-products" noindex />
        <div className="max-w-md mx-auto bg-ink-800 border border-ink-700 rounded-2xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">
            {lang === 'sw' ? 'Ingia ili uone bidhaa zako' : 'Sign in to view your products'}
          </h2>
          <button
            onClick={() => navigate('/login')}
            data-testid="signin-to-myproducts-btn"
            className="mt-4 px-5 py-2.5 rounded-xl bg-gold-500 text-ink-900 font-semibold"
          >
            {lang === 'sw' ? 'Ingia' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  const toggleActive = async (p: Product) => {
    setBusy(p.product_id);
    try {
      await productsAPI.update(p.product_id, { is_active: !p.is_active });
      toast.success(
        !p.is_active
          ? (lang === 'sw' ? 'Bidhaa imewashwa' : 'Product activated')
          : (lang === 'sw' ? 'Bidhaa imefichwa' : 'Product hidden'),
      );
      await load();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p: Product) => {
    const confirmMsg = lang === 'sw'
      ? `Una uhakika unataka kufuta "${p.name}"? Kitendo hiki hakirudiwi.`
      : `Are you sure you want to delete "${p.name}"? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setBusy(p.product_id);
    try {
      await productsAPI.remove(p.product_id);
      toast.success(lang === 'sw' ? 'Imefutwa' : 'Deleted');
      await load();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Delete failed');
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async (p: Product) => {
    const url = `${window.location.origin}/product/${p.product_id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(lang === 'sw' ? 'Kiungo kimenakiliwa' : 'Link copied');
    } catch {
      toast.error(lang === 'sw' ? 'Imeshindwa kunakili' : 'Could not copy');
    }
  };

  const fmtTzs = (n?: number) => `TZS ${(n || 0).toLocaleString()}`;

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-16 px-4 sm:px-6">
      <SEO title={lang === 'sw' ? 'Bidhaa zangu' : 'My products'} url="/my-products" noindex />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              {lang === 'sw' ? 'Bidhaa zangu' : 'My products'}
            </h1>
            <p className="text-ink-400 text-sm mt-1">
              {lang === 'sw'
                ? 'Hariri bei, ficha, futa au tuma kiungo cha bidhaa yoyote.'
                : 'Edit prices, hide, delete or share any of your listings.'}
            </p>
          </div>
          <Link
            to="/sell/new"
            data-testid="myproducts-add-btn"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gold-500 text-ink-900 font-bold hover:bg-gold-400 transition"
          >
            <Plus className="w-4 h-4" /> {lang === 'sw' ? 'Ongeza bidhaa' : 'Add product'}
          </Link>
        </div>

        {products === null && (
          <div className="text-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gold-400 mx-auto" />
          </div>
        )}

        {products && products.length === 0 && (
          <div data-testid="myproducts-empty-state" className="bg-ink-800 border border-ink-700 rounded-2xl p-10 text-center">
            <Package className="w-10 h-10 text-ink-500 mx-auto mb-3" />
            <p className="text-ink-300">
              {lang === 'sw' ? 'Hujaorodhesha bidhaa bado.' : "You haven't listed any products yet."}
            </p>
            <Link to="/sell/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 text-ink-900 font-bold">
              <Plus className="w-4 h-4" /> {lang === 'sw' ? 'Anza sasa' : 'Start now'}
            </Link>
          </div>
        )}

        {products && products.length > 0 && (
          <div data-testid="myproducts-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((p) => (
              <motion.div
                key={p.product_id}
                layout
                data-testid={`product-card-${p.product_id}`}
                className={`bg-ink-800 border rounded-2xl overflow-hidden ${p.is_active === false ? 'border-ink-700 opacity-60' : 'border-ink-700'}`}
              >
                <div className="aspect-[16/9] bg-ink-900 flex items-center justify-center overflow-hidden">
                  {p.image_b64 ? (
                    <img src={p.image_b64.startsWith('data:') ? p.image_b64 : `data:image/jpeg;base64,${p.image_b64}`} alt={p.name} className="w-full h-full object-cover" />
                  ) : p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-10 h-10 text-ink-600" />
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-white font-bold leading-tight">{p.name}</h3>
                      <p className="text-gold-400 font-semibold mt-1">{fmtTzs(p.price)}</p>
                      <p className="text-ink-500 text-xs mt-0.5">{p.category} {p.location ? `· ${p.location}` : ''}</p>
                    </div>
                    {p.is_active === false && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-ink-700 text-ink-300 uppercase">{lang === 'sw' ? 'Imefichwa' : 'Hidden'}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Link
                      to={`/sell/edit/${p.product_id}`}
                      data-testid={`edit-product-${p.product_id}`}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-gold-500/15 text-gold-300 hover:bg-gold-500/25 transition text-xs font-semibold"
                    >
                      <Pencil className="w-3.5 h-3.5" /> {lang === 'sw' ? 'Hariri' : 'Edit'}
                    </Link>
                    <button
                      onClick={() => toggleActive(p)}
                      disabled={busy === p.product_id}
                      data-testid={`toggle-active-${p.product_id}`}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-ink-700 text-ink-200 hover:bg-ink-600 transition text-xs font-semibold disabled:opacity-50"
                    >
                      {p.is_active === false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {p.is_active === false ? (lang === 'sw' ? 'Onyesha' : 'Show') : (lang === 'sw' ? 'Ficha' : 'Hide')}
                    </button>
                    <button
                      onClick={() => copyLink(p)}
                      data-testid={`copy-link-${p.product_id}`}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-ink-700 text-ink-200 hover:bg-ink-600 transition text-xs font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5" /> {lang === 'sw' ? 'Kiungo' : 'Link'}
                    </button>
                    <button
                      onClick={() => remove(p)}
                      disabled={busy === p.product_id}
                      data-testid={`delete-product-${p.product_id}`}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition text-xs font-semibold disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {lang === 'sw' ? 'Futa' : 'Delete'}
                    </button>
                  </div>
                  <Link
                    to={`/product/${p.product_id}`}
                    className="text-xs text-ink-400 hover:text-gold-400 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> {lang === 'sw' ? 'Tazama ukurasa wa umma' : 'View public page'}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
