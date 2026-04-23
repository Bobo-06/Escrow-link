import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, Star, MapPin, CheckCircle, ShoppingCart, Heart, Share2 } from 'lucide-react';
import SEO from '../components/SEO';

const ProductDetail: React.FC = () => {
  const { id } = useParams();

  // Sample product data
  const product = {
    id,
    name: 'Kitenge Fabric (5m)',
    price: 75000,
    description: 'Beautiful African print fabric, perfect for making dresses, shirts, and home décor. High-quality cotton blend with vibrant colors that won\'t fade.',
    seller_name: 'Mama Biashara',
    seller_id: 'seller_123',
    location: 'Kariakoo, Dar es Salaam',
    rating: 4.8,
    reviews: 32,
    is_verified: true,
    images: [],
    category: 'Fashion',
    stock: 15,
  };

  return (
    <div className="min-h-screen bg-ink-900 pt-20">
      <SEO
        title={product.name}
        description={`${product.description.substring(0, 155)}`}
        url={`/product/${product.id}`}
        type="product"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="aspect-square bg-gradient-to-br from-gold-500/20 to-emerald-500/20 flex items-center justify-center">
              <span className="text-9xl">🛍️</span>
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-gold-500/20 text-gold-400 rounded-full text-sm font-medium">
                {product.category}
              </span>
              {product.is_verified && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Escrow Protected
                </span>
              )}
            </div>

            <h1 className="text-3xl font-display font-bold text-white mb-4">
              {product.name}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center text-gold-400">
                <Star className="w-5 h-5 fill-current mr-1" />
                <span className="font-semibold">{product.rating}</span>
                <span className="text-ink-400 ml-1">({product.reviews} reviews)</span>
              </div>
              <div className="flex items-center text-ink-400">
                <MapPin className="w-4 h-4 mr-1" />
                {product.location}
              </div>
            </div>

            <p className="text-4xl font-bold gradient-text mb-6">
              TZS {product.price.toLocaleString()}
            </p>

            <p className="text-ink-300 mb-8 leading-relaxed">
              {product.description}
            </p>

            {/* Seller Info */}
            <Link to={`/seller/${product.seller_id}`} className="glass rounded-xl p-4 flex items-center justify-between mb-8 hover:border-gold-500/50 transition-all">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center text-ink-900 font-bold">
                  MB
                </div>
                <div className="ml-4">
                  <p className="text-white font-semibold flex items-center">
                    {product.seller_name}
                    {product.is_verified && <CheckCircle className="w-4 h-4 text-emerald-400 ml-2" />}
                  </p>
                  <p className="text-ink-400 text-sm">View seller profile</p>
                </div>
              </div>
              <div className="text-gold-400 text-sm font-medium">⭐ {product.rating}</div>
            </Link>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Link
                to={`/checkout/${product.id}`}
                className="flex-1 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 rounded-xl font-bold text-lg hover:from-gold-400 hover:to-gold-500 transition-all flex items-center justify-center"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Buy Now
              </Link>
              <button className="p-4 glass rounded-xl hover:bg-ink-700 transition-colors">
                <Heart className="w-6 h-6 text-ink-400" />
              </button>
              <button className="p-4 glass rounded-xl hover:bg-ink-700 transition-colors">
                <Share2 className="w-6 h-6 text-ink-400" />
              </button>
            </div>

            {/* Trust Badge */}
            <div className="mt-8 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start">
              <Shield className="w-6 h-6 text-emerald-400 mr-3 flex-shrink-0" />
              <div>
                <p className="text-emerald-400 font-semibold">Escrow Protection</p>
                <p className="text-emerald-300/80 text-sm">
                  Your payment is held securely until you confirm delivery. 100% buyer protection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
