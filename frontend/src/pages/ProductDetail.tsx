import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Star, MapPin, CheckCircle, ShoppingCart, Share2, Scale } from 'lucide-react';
import api, { productsAPI } from '../lib/api';
import SEO from '../components/SEO';
import WatchBell from '../components/WatchBell';
import { useT } from '../i18n';
import { useCompareStore } from '../store/compareStore';

interface Product {
  product_id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  image_b64?: string;
  category?: string;
  location?: string;
  rating?: number;
  reviews?: number;
  is_verified?: boolean;
  seller_id?: string;
  seller_name?: string;
  seller_phone?: string;
  stock?: number;
}

const fmtTzs = (n: number) => `TZS ${(n || 0).toLocaleString()}`;

const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const { t } = useT();
  const { add: addCompare, has: hasCompare, remove: removeCompare } = useCompareStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!id) return;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await productsAPI.getOne(id);
        if (!alive) return;
        setProduct(res.data);
      } catch (e: any) {
        if (e?.response?.status === 404) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }

      try {
        const r = await api.get<{ products: Product[] }>(`/products/related/${id}?limit=6`);
        if (alive) setRelated(r.data.products || []);
      } catch {
        if (alive) setRelated([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 flex items-center justify-center">
        <div className="text-ink-400">{t('pd.loading')}</div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-300 mb-4">{t('pd.not_found')}</p>
          <Link to="/marketplace" className="text-gold-400 hover:underline">
            {t('cta.explore')}
          </Link>
        </div>
      </div>
    );
  }

  const inCompare = hasCompare(product.product_id);
  const initials = (product.seller_name || 'S')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-ink-900 pt-20">
      <SEO
        title={product.name}
        description={`${(product.description || product.name).substring(0, 155)}`}
        url={`/product/${product.product_id}`}
        type="product"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="aspect-square bg-gradient-to-br from-gold-500/10 to-emerald-500/10 flex items-center justify-center">
              {product.image_b64 ? (
                <img
                  src={`data:image/jpeg;base64,${product.image_b64}`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-9xl">🛍️</span>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {product.category && (
                <span className="px-3 py-1 bg-gold-500/20 text-gold-400 rounded-full text-sm font-medium capitalize">
                  {product.category}
                </span>
              )}
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                {t('pd.escrow_protected')}
              </span>
            </div>

            <h1 className="text-3xl font-display font-bold text-white mb-4">{product.name}</h1>

            <div className="flex items-center gap-4 mb-6 flex-wrap">
              {product.rating ? (
                <div className="flex items-center text-gold-400">
                  <Star className="w-5 h-5 fill-current mr-1" />
                  <span className="font-semibold">{product.rating}</span>
                  {product.reviews ? (
                    <span className="text-ink-400 ml-1">
                      ({product.reviews} {t('pd.reviews')})
                    </span>
                  ) : null}
                </div>
              ) : null}
              {product.location && (
                <div className="flex items-center text-ink-400">
                  <MapPin className="w-4 h-4 mr-1" />
                  {product.location}
                </div>
              )}
            </div>

            <p className="text-4xl font-bold gradient-text mb-6">{fmtTzs(product.price)}</p>

            {product.description && (
              <p className="text-ink-300 mb-8 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* Seller Info */}
            {product.seller_id && (
              <Link
                to={`/seller/${product.seller_id}`}
                className="glass rounded-xl p-4 flex items-center justify-between mb-8 hover:border-gold-500/50 transition-all"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center text-ink-900 font-bold">
                    {initials}
                  </div>
                  <div className="ml-4">
                    <p className="text-white font-semibold flex items-center">
                      {product.seller_name || 'Seller'}
                      {product.is_verified && (
                        <CheckCircle className="w-4 h-4 text-emerald-400 ml-2" />
                      )}
                    </p>
                    <p className="text-ink-400 text-sm">{t('pd.view_seller')}</p>
                  </div>
                </div>
                {product.rating ? (
                  <div className="text-gold-400 text-sm font-medium">⭐ {product.rating}</div>
                ) : null}
              </Link>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link
                to={`/checkout/${product.product_id}`}
                data-testid="product-buy-now"
                className="flex-1 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 rounded-xl font-bold text-lg hover:from-gold-400 hover:to-gold-500 transition-all flex items-center justify-center"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {t('pd.buy_now')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (inCompare) removeCompare(product.product_id);
                  else
                    addCompare({
                      product_id: product.product_id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      image_b64: product.image_b64,
                      seller_name: product.seller_name,
                      category: product.category,
                      location: product.location,
                      rating: product.rating,
                      is_verified: product.is_verified,
                    });
                }}
                data-testid="product-compare-toggle"
                title={t('mkt.compare_add')}
                className={`p-4 rounded-xl transition-colors border ${
                  inCompare
                    ? 'bg-gold-500 text-ink-900 border-gold-500'
                    : 'glass border-ink-700 hover:bg-ink-700 text-ink-300'
                }`}
              >
                <Scale className="w-6 h-6" />
              </button>
              <button className="p-4 glass rounded-xl hover:bg-ink-700 transition-colors" aria-label="Share">
                <Share2 className="w-6 h-6 text-ink-400" />
              </button>
              <WatchBell productId={product.product_id} productName={product.name} variant="pdp" />
            </div>

            {/* Trust Badge */}
            <div className="mt-8 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start">
              <Shield className="w-6 h-6 text-emerald-400 mr-3 flex-shrink-0" />
              <div>
                <p className="text-emerald-400 font-semibold">{t('pd.escrow_assurance_title')}</p>
                <p className="text-emerald-300/80 text-sm">{t('pd.escrow_assurance_body')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section data-testid="related-products" className="mt-16">
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold text-white">{t('pd.related')}</h2>
              <p className="text-ink-400 text-sm">{t('pd.related_sub')}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {related.map((p, i) => (
                <motion.div
                  key={p.product_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={`/product/${p.product_id}`}
                    data-testid={`related-card-${p.product_id}`}
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
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🛍️
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-white text-sm font-semibold line-clamp-2 min-h-[2.5rem]">
                        {p.name}
                      </p>
                      <p className="text-gold-400 font-bold text-sm mt-1">{fmtTzs(p.price)}</p>
                      <p className="text-ink-500 text-[11px] truncate mt-0.5">
                        {p.seller_name || '—'}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
