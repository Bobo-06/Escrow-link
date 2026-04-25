import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Star, ShieldCheck, MapPin } from 'lucide-react';
import api from '../lib/api';
import { useT } from '../i18n';

interface TrendingSeller {
  seller_id: string;
  name: string;
  is_verified?: boolean;
  rating?: number;
  total_ratings?: number;
  location?: string;
  product_count: number;
  min_price?: number;
  categories?: string[];
}

const TrendingSellersStrip: React.FC<{ limit?: number }> = ({ limit = 6 }) => {
  const { t } = useT();
  const [sellers, setSellers] = useState<TrendingSeller[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get<{ sellers: TrendingSeller[] }>(`/sellers/trending?limit=${limit}`);
        if (alive) setSellers(res.data.sellers || []);
      } catch {
        // Silent — strip just hides on failure; nothing actionable for the user.
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [limit]);

  // Hide gracefully when empty / not yet loaded
  if (!loaded || sellers.length === 0) return null;

  return (
    <section data-testid="trending-sellers-strip" className="py-6 border-y border-ink-700 bg-ink-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h3 className="text-white text-lg font-bold flex items-center gap-2">
              <Flame className="w-5 h-5 text-gold-400" />
              {t('trending.title')}
            </h3>
            <p className="text-ink-400 text-xs">{t('trending.subtitle')}</p>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
          {sellers.map((s) => (
            <Link
              key={s.seller_id}
              to={`/seller/${s.seller_id}`}
              data-testid={`trending-seller-${s.seller_id}`}
              className="snap-start shrink-0 w-56 bg-ink-900 border border-ink-700 hover:border-gold-500/50 rounded-xl p-3 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-ink-900 font-bold text-sm">
                  {s.name?.[0]?.toUpperCase() || 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate flex items-center gap-1">
                    {s.name}
                    {s.is_verified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </p>
                  <p className="text-ink-500 text-[11px] truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {s.location}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gold-400 font-bold">
                  {s.product_count} {t('trending.products')}
                </span>
                {s.rating && s.rating > 0 ? (
                  <span className="text-ink-300 inline-flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current text-gold-400" />
                    {Number(s.rating).toFixed(1)}
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingSellersStrip;
