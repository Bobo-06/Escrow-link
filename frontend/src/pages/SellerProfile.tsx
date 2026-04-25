import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Star, MapPin, CheckCircle, ShoppingBag, Sparkles } from 'lucide-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import { useT } from '../i18n';

interface Product {
  product_id: string;
  name: string;
  price: number;
  image?: string;
  image_b64?: string;
  category?: string;
  location?: string;
  rating?: number;
  is_verified?: boolean;
}

interface SellerInfo {
  seller_id: string;
  name: string;
  is_verified: boolean;
  is_women_owned?: boolean;
  rating: number;
  total_ratings: number;
  location: string;
  bio: string;
  joined?: string;
  products_count: number;
  orders_completed: number;
}

const fmtTzs = (n: number) => `TZS ${(n || 0).toLocaleString()}`;
const fmtJoined = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const SellerProfile: React.FC = () => {
  const { id } = useParams();
  const { t } = useT();
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!id) return;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const r = await api.get<{ seller: SellerInfo; products: Product[] }>(`/sellers/${id}`);
        if (!alive) return;
        setSeller(r.data.seller);
        setProducts(r.data.products || []);
      } catch (e: any) {
        if (e?.response?.status === 404) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 flex items-center justify-center">
        <div className="text-ink-400">{t('sp.loading')}</div>
      </div>
    );
  }

  if (notFound || !seller) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-300 mb-4">{t('sp.not_found')}</p>
          <Link to="/marketplace" className="text-gold-400 hover:underline">
            {t('cta.explore')}
          </Link>
        </div>
      </div>
    );
  }

  const initials = seller.name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-ink-900 pt-20" data-testid="seller-profile-page">
      <SEO
        title={seller.name}
        description={seller.bio?.slice(0, 155) || `Verified seller on Biz-Salama. Browse products by ${seller.name}.`}
        url={`/seller/${seller.seller_id}`}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Seller Header */}
        <div className="glass rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center text-ink-900 font-bold text-3xl shrink-0">
              {initials || 'S'}
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2 flex-wrap">
                <h1 className="text-2xl font-display font-bold text-white">{seller.name}</h1>
                {seller.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t('sp.verified')}
                  </span>
                )}
                {seller.is_women_owned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('sp.women_owned')}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4 text-ink-400 mb-4 flex-wrap text-sm">
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {seller.location}
                </span>
                <span>
                  {t('sp.joined')} {fmtJoined(seller.joined)}
                </span>
              </div>
              {seller.bio && <p className="text-ink-300 max-w-2xl">{seller.bio}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4 bg-ink-800 rounded-xl">
              <div className="flex items-center justify-center text-gold-400 mb-1">
                <Star className="w-5 h-5 fill-current mr-1" />
                <span className="text-2xl font-bold">
                  {seller.rating ? Number(seller.rating).toFixed(1) : '—'}
                </span>
              </div>
              <p className="text-ink-400 text-sm">
                {seller.total_ratings
                  ? `${seller.total_ratings} ${t('sp.stat.reviews')}`
                  : t('sp.no_rating')}
              </p>
            </div>
            <div className="text-center p-4 bg-ink-800 rounded-xl">
              <p className="text-2xl font-bold text-emerald-400">{seller.orders_completed}</p>
              <p className="text-ink-400 text-sm">{t('sp.stat.orders')}</p>
            </div>
            <div className="text-center p-4 bg-ink-800 rounded-xl">
              <p className="text-2xl font-bold text-gold-400">{seller.products_count}</p>
              <p className="text-ink-400 text-sm">{t('sp.stat.products')}</p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {t('sp.products_by')} {seller.name}
          </h2>
          <span className="text-ink-500 text-sm">
            {products.length} {t('sp.products_count')}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center" data-testid="seller-no-products">
            <ShoppingBag className="w-12 h-12 text-ink-600 mx-auto mb-3" />
            <p className="text-ink-400">{t('sp.no_products')}</p>
          </div>
        ) : (
          <div
            data-testid="seller-products-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {products.map((p, i) => (
              <motion.div
                key={p.product_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/product/${p.product_id}`}
                  data-testid={`seller-product-${p.product_id}`}
                  className="group block glass rounded-xl overflow-hidden hover:border-gold-500/50 transition-all"
                >
                  <div className="aspect-square bg-ink-700 relative overflow-hidden">
                    {p.image_b64 ? (
                      <img
                        src={`data:image/jpeg;base64,${p.image_b64}`}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
                    )}
                    {p.is_verified && (
                      <span className="absolute top-2 left-2 inline-flex items-center px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                        <Shield className="w-3 h-3 mr-1" />
                        {t('mkt.verified')}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-semibold mb-1 line-clamp-2 min-h-[2.5rem] group-hover:text-gold-400 transition-colors">
                      {p.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-gold-400 font-bold">{fmtTzs(p.price)}</p>
                      {p.rating ? (
                        <span className="inline-flex items-center text-gold-400 text-sm">
                          <Star className="w-4 h-4 fill-current mr-1" />
                          {p.rating}
                        </span>
                      ) : null}
                    </div>
                    {p.location && (
                      <p className="text-ink-500 text-xs mt-2 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {p.location}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerProfile;
