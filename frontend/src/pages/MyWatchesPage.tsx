import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, BellRing, Trash2, MapPin, ShoppingBag, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import SEO from '../components/SEO';
import { useT } from '../i18n';
import { useAuthStore } from '../store/authStore';

interface BestMatch {
  product_id: string;
  name: string;
  price: number;
  image?: string;
  image_b64?: string;
  seller_name?: string;
  location?: string;
  savings: number;
}

interface AlertEntry {
  alert_id: string;
  at: string;
  matched_product_id: string;
  matched_name: string;
  matched_price: number;
  savings: number;
  delivery: string;
}

interface Watch {
  watch_id: string;
  product_id: string;
  name_at_watch: string;
  price_at_watch: number;
  category: string;
  image?: string;
  created_at: string;
  last_alerted_at: string | null;
  alerts: AlertEntry[];
  best_match: BestMatch | null;
}

const fmt = (n: number) => `TZS ${(n || 0).toLocaleString()}`;

const MyWatchesPage: React.FC = () => {
  const { t } = useT();
  const { isAuthenticated } = useAuthStore();
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      setLoading(true);
      const r = await api.get<{ watches: Watch[] }>('/watches');
      setWatches(r.data.watches || []);
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        toast.error(t('watch.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) reload();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleDelete = async (watch_id: string) => {
    try {
      await api.delete(`/watches/${watch_id}`);
      setWatches((ws) => ws.filter((w) => w.watch_id !== watch_id));
      toast.success(t('watch.removed_toast'));
    } catch {
      toast.error(t('watch.error'));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <Bell className="w-12 h-12 text-ink-600 mx-auto mb-4" />
          <p className="text-ink-300 mb-4">{t('watch.login_required')}</p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 bg-gold-500 text-ink-900 rounded-full font-bold hover:bg-gold-400"
          >
            {t('nav.login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 pt-20" data-testid="my-watches-page">
      <SEO title="My Watches" description="Your watched products and price-drop alerts." url="/my-watches" noindex />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
            <BellRing className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              {t('watches.title')}
            </h1>
            <p className="text-ink-400 text-sm">{t('watches.subtitle')}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : watches.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center" data-testid="my-watches-empty">
            <Bell className="w-12 h-12 text-ink-600 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">{t('watches.empty_title')}</p>
            <p className="text-ink-400 text-sm mb-5">{t('watches.empty_sub')}</p>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 rounded-full font-bold hover:from-gold-400 hover:to-gold-500"
            >
              <ShoppingBag className="w-4 h-4" />
              {t('watches.go_marketplace')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {watches.map((w, i) => {
              const hasDrop = !!w.best_match && (w.best_match.savings || 0) > 0;
              return (
                <motion.div
                  key={w.watch_id}
                  data-testid={`my-watch-${w.watch_id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass rounded-2xl p-5 border ${
                    hasDrop ? 'border-emerald-500/40' : 'border-ink-700'
                  }`}
                >
                  <div className="grid md:grid-cols-[1fr_auto] gap-4 items-start">
                    {/* Anchor product info */}
                    <div className="flex gap-4 min-w-0">
                      <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-ink-700 flex items-center justify-center">
                        {w.image && w.image.startsWith('http') ? (
                          <img src={w.image} alt={w.name_at_watch} className="w-full h-full object-cover" />
                        ) : w.image ? (
                          <img
                            src={`data:image/jpeg;base64,${w.image}`}
                            alt={w.name_at_watch}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl">🛍️</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/product/${w.product_id}`}
                          className="text-white font-semibold hover:text-gold-400 line-clamp-2 block"
                        >
                          {w.name_at_watch}
                        </Link>
                        <p className="text-ink-500 text-xs mt-0.5 capitalize">{w.category}</p>
                        <div className="flex items-baseline gap-3 mt-2">
                          <div>
                            <p className="text-ink-500 text-[10px] uppercase tracking-wider">
                              {t('watches.anchor_price')}
                            </p>
                            <p className="text-ink-200 font-bold">{fmt(w.price_at_watch)}</p>
                          </div>
                          {hasDrop && w.best_match && (
                            <div>
                              <p className="text-emerald-400 text-[10px] uppercase tracking-wider">
                                {t('watches.now_lowest')}
                              </p>
                              <p className="text-emerald-300 font-bold">{fmt(w.best_match.price)}</p>
                            </div>
                          )}
                        </div>

                        {(w.alerts || []).length > 0 && (
                          <p className="text-ink-500 text-[11px] mt-2">
                            {(w.alerts || []).length} {t('watches.alerts_count')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex md:flex-col gap-2 md:items-end">
                      {hasDrop && w.best_match && (
                        <Link
                          to={`/product/${w.best_match.product_id}`}
                          data-testid={`watch-view-match-${w.watch_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-ink-900 text-xs font-bold hover:from-emerald-400 hover:to-emerald-500"
                        >
                          <TrendingDown className="w-4 h-4" />
                          {t('watches.view_match')} · {t('watches.savings')} {fmt(w.best_match.savings)}
                        </Link>
                      )}
                      {!hasDrop && (
                        <span className="inline-flex items-center px-3 py-2 rounded-full border border-ink-700 text-ink-400 text-xs">
                          {t('watches.no_drop')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(w.watch_id)}
                        data-testid={`watch-unwatch-${w.watch_id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-ink-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('watches.unwatch')}
                      </button>
                    </div>
                  </div>

                  {/* Best-match preview (with seller + location) */}
                  {hasDrop && w.best_match && (
                    <div className="mt-4 pt-4 border-t border-ink-700 grid grid-cols-[auto_1fr] gap-3 items-center">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-ink-700 flex items-center justify-center">
                        {w.best_match.image && w.best_match.image.startsWith('http') ? (
                          <img src={w.best_match.image} alt={w.best_match.name} className="w-full h-full object-cover" />
                        ) : w.best_match.image_b64 ? (
                          <img
                            src={`data:image/jpeg;base64,${w.best_match.image_b64}`}
                            alt={w.best_match.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">🛍️</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{w.best_match.name}</p>
                        <p className="text-ink-400 text-xs flex items-center gap-2 truncate">
                          <span>{w.best_match.seller_name || '—'}</span>
                          {w.best_match.location && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />
                                {w.best_match.location}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recent alerts list */}
                  {(w.alerts || []).length > 0 && (
                    <details className="mt-3 group">
                      <summary className="text-ink-400 text-xs cursor-pointer hover:text-ink-200 list-none flex items-center gap-1">
                        <span className="group-open:rotate-90 transition-transform">▸</span>
                        {t('watches.alerts_history')}
                      </summary>
                      <ul className="mt-2 space-y-1.5 text-xs">
                        {(w.alerts || []).slice().reverse().slice(0, 5).map((a) => (
                          <li
                            key={a.alert_id}
                            className="flex items-center justify-between bg-ink-900 rounded-lg px-3 py-2"
                          >
                            <span className="text-ink-300 truncate mr-2">{a.matched_name}</span>
                            <span className="text-emerald-400 font-bold whitespace-nowrap">
                              {fmt(a.matched_price)} · -{fmt(a.savings)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyWatchesPage;
