import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Star, Shield, MapPin, ChevronDown } from 'lucide-react';
import { productsAPI } from '../lib/api';
import SEO from '../components/SEO';

interface Product {
  product_id: string;
  name: string;
  price: number;
  description?: string;
  image_b64?: string;
  seller_name?: string;
  seller_id?: string;
  category?: string;
  location?: string;
  rating?: number;
  is_verified?: boolean;
}

const Marketplace: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'fashion', label: 'Fashion & Clothing' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'home', label: 'Home & Living' },
    { value: 'beauty', label: 'Beauty & Health' },
    { value: 'food', label: 'Food & Groceries' },
  ];

  useEffect(() => {
    fetchProducts();
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
      // Use sample products for demo
      setProducts([
        {
          product_id: '1',
          name: 'Kitenge Fabric (5m)',
          price: 75000,
          description: 'Beautiful African print fabric',
          seller_name: 'Mama Biashara',
          category: 'fashion',
          location: 'Kariakoo, Dar',
          rating: 4.8,
          is_verified: true,
        },
        {
          product_id: '2',
          name: 'Samsung Galaxy A54',
          price: 850000,
          description: 'Brand new, 1 year warranty',
          seller_name: 'TechHub TZ',
          category: 'electronics',
          location: 'Mlimani City',
          rating: 4.9,
          is_verified: true,
        },
        {
          product_id: '3',
          name: 'Handmade Leather Sandals',
          price: 45000,
          description: 'Genuine leather, all sizes',
          seller_name: 'Maasai Crafts',
          category: 'fashion',
          location: 'Arusha',
          rating: 4.7,
          is_verified: true,
        },
        {
          product_id: '4',
          name: 'Organic Honey (1kg)',
          price: 35000,
          description: 'Pure honey from Tabora',
          seller_name: 'Asali Pure',
          category: 'food',
          location: 'Tabora',
          rating: 4.6,
          is_verified: false,
        },
        {
          product_id: '5',
          name: 'Wooden Coffee Table',
          price: 180000,
          description: 'Handcrafted mahogany',
          seller_name: 'Furniture Plus',
          category: 'home',
          location: 'Mwenge',
          rating: 4.5,
          is_verified: true,
        },
        {
          product_id: '6',
          name: 'Natural Shea Butter',
          price: 25000,
          description: 'Pure, unrefined, 500g',
          seller_name: 'Beauty Naturals',
          category: 'beauty',
          location: 'Sinza',
          rating: 4.8,
          is_verified: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `TZS ${price.toLocaleString()}`;
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            Discover Amazing Products
          </h1>
          <p className="text-ink-400 text-lg mb-8">
            Shop from verified sellers across Tanzania with escrow protection
          </p>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
              <input
                type="text"
                placeholder="Search for products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500 transition-colors"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-4 bg-ink-700 border border-ink-600 rounded-xl text-white focus:outline-none focus:border-gold-500"
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
                <option value="newest">Newest</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-ink-400 text-lg">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.product_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/product/${product.product_id}`}
                  className="group block glass rounded-2xl overflow-hidden hover:border-gold-500/50 transition-all"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-ink-700 relative overflow-hidden">
                    {product.image_b64 ? (
                      <img
                        src={`data:image/jpeg;base64,${product.image_b64}`}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold-500/20 to-emerald-500/20">
                        <span className="text-6xl">🛍️</span>
                      </div>
                    )}
                    {product.is_verified && (
                      <div className="absolute top-3 left-3 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="text-white font-semibold mb-1 group-hover:text-gold-400 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-gold-400 font-bold text-lg mb-2">
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
                        by {product.seller_name || 'Seller'}
                      </p>
                    </div>
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

export default Marketplace;
