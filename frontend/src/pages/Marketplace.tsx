import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Star, Shield, MapPin, Scale, CheckCircle, Tag } from 'lucide-react';
import { productsAPI } from '../lib/api';
import SEO from '../components/SEO';
import VoiceRecorder from '../components/VoiceRecorder';
import TrendingSellersStrip from '../components/TrendingSellersStrip';
import WatchBell from '../components/WatchBell';
import { useT } from '../i18n';
import { useCompareStore } from '../store/compareStore';

interface Product {
  product_id: string;
  name: string;
  price: number;
  description?: string;
  image_b64?: string;
  image?: string;
  seller_name?: string;
  seller_id?: string;
  category?: string;
  location?: string;
  rating?: number;
  is_verified?: boolean;
  is_lowest_price?: boolean;
}

const Marketplace: React.FC = () => {
  const { t } = useT();
  const { add: addCompare, remove: removeCompare, has: hasCompare } = useCompareStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const categories = [
    { value: 'all', label: t('mkt.cat.all') },
    { value: 'fashion', label: t('mkt.cat.fashion') },
    { value: 'electronics', label: t('mkt.cat.electronics') },
    { value: 'home', label: t('mkt.cat.home') },
    { value: 'beauty', label: t('mkt.cat.beauty') },
    { value: 'food', label: t('mkt.cat.food') },
  ];

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll({
        category: category !== 'all' ? category : undefined,
        sort: sortBy,
      });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => `TZS ${price.toLocaleString()}`;

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCompare = (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasCompare(p.product_id)) {
      removeCompare(p.product_id);
    } else {
      addCompare({
        product_id: p.product_id,
        name: p.name,
        price: p.price,
        image: p.image,
        image_b64: p.image_b64,
        seller_name: p.seller_name,
        category: p.category,
        location: p.location,
        rating: p.rating,
        is_verified: p.is_verified,
      });
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 pt-20">
      <SEO
        title="Marketplace — Verified Sellers in Tanzania"
        description="Browse thousands of products from verified Tanzanian sellers. Fashion, electronics, home, beauty & more. Every purchase protected by escrow."
        url="/marketplace"
      />
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-ink-800 to-ink-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            {t('mkt.title')}
          </h1>
          <p className="text-ink-400 text-lg mb-8">{t('mkt.subtitle')}</p>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
              <input
                type="text"
                placeholder={t('mkt.search_ph')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-16 py-4 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500 transition-colors"
                data-testid="marketplace-search-input"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <VoiceRecorder
                  context="search"
                  size="sm"
                  title="Search by voice (Swahili or English)"
                  onTranscribed={(s) => setSearchTerm(s)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-4 bg-ink-700 border border-ink-600 rounded-xl text-white focus:outline-none focus:border-gold-500"
                data-testid="marketplace-category-select"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-4 bg-ink-700 border border-ink-600 rounded-xl text-white focus:outline-none focus:border-gold-500"
              >
                <option value="newest">{t('mkt.sort.newest')}</option>
                <option value="price_low">{t('mkt.sort.price_low')}</option>
                <option value="price_high">{t('mkt.sort.price_high')}</option>
                <option value="rating">{t('mkt.sort.rating')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Sellers strip — hides when empty */}
      <TrendingSellersStrip limit={6} />

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-ink-400 text-lg">{t('mkt.no_products')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => {
              const inCompare = hasCompare(product.product_id);
              return (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Link
                    to={`/product/${product.product_id}`}
                    data-testid={`product-card-${product.product_id}`}
                    className="group block glass rounded-2xl overflow-hidden hover:border-gold-500/50 transition-all relative"
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-ink-700 relative overflow-hidden">
                      {product.image_b64 ? (
                        <img
                          src={`data:image/jpeg;base64,${product.image_b64}`}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold-500/20 to-emerald-500/20">
                          <span className="text-6xl">🛍️</span>
                        </div>
                      )}

                      {/* badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                        {product.is_verified && (
                          <span className="bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                            <Shield className="w-3 h-3 mr-1" />
                            {t('mkt.verified')}
                          </span>
                        )}
                        {product.is_lowest_price && (
                          <span
                            data-testid={`lowest-price-badge-${product.product_id}`}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-ink-900 px-2 py-1 rounded-full text-[10px] font-bold flex items-center shadow-lg shadow-emerald-500/30"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {t('mkt.lowest_price')}
                          </span>
                        )}
                      </div>

                      {/* compare toggle + watch bell */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <WatchBell productId={product.product_id} productName={product.name} variant="card" />
                        <button
                          type="button"
                          onClick={(e) => toggleCompare(e, product)}
                          data-testid={`compare-toggle-${product.product_id}`}
                          title={t('mkt.compare_add')}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border transition-all ${
                            inCompare
                              ? 'bg-gold-500 text-ink-900 border-gold-500'
                              : 'bg-ink-900/80 text-ink-200 border-ink-600 hover:bg-ink-900 hover:border-gold-500/60'
                          }`}
                        >
                          {inCompare ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Scale className="w-3.5 h-3.5" />
                          )}
                          {inCompare ? t('mkt.compare_added') : t('mkt.compare_add')}
                        </button>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="text-white font-semibold mb-1 group-hover:text-gold-400 transition-colors line-clamp-2 min-h-[3rem]">
                        {product.name}
                      </h3>
                      <p
                        className={`font-bold text-lg mb-2 ${
                          product.is_lowest_price ? 'text-emerald-400' : 'text-gold-400'
                        }`}
                      >
                        {formatPrice(product.price)}
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-ink-400">
                          <MapPin className="w-4 h-4 mr-1" />
                          {product.location || 'Tanzania'}
                        </div>
                        {product.rating && (
                          <div className="flex items-center text-gold-400">
                            <Star className="w-4 h-4 mr-1 fill-current" />
                            {product.rating}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-ink-700">
                        <p className="text-ink-400 text-sm">
                          {t('mkt.by')} {product.seller_name || 'Seller'}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
