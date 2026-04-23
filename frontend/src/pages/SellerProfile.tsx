import React from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Star, MapPin, CheckCircle, Package } from 'lucide-react';

const SellerProfile: React.FC = () => {
  const { id } = useParams();

  const seller = {
    id,
    name: 'Mama Biashara',
    location: 'Kariakoo, Dar es Salaam',
    rating: 4.8,
    reviews: 156,
    orders_completed: 243,
    joined: 'March 2024',
    is_verified: true,
    bio: 'Fashion enthusiast selling quality African fabrics and clothing. All products are carefully selected for quality and authenticity.',
    products: [
      { id: '1', name: 'Kitenge Fabric (5m)', price: 75000, rating: 4.8 },
      { id: '2', name: 'Kanga Set (2pcs)', price: 35000, rating: 4.7 },
      { id: '3', name: 'African Print Dress', price: 85000, rating: 4.9 },
    ],
  };

  return (
    <div className="min-h-screen bg-ink-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Seller Header */}
        <div className="glass rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center text-ink-900 font-bold text-3xl">
              MB
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <h1 className="text-2xl font-display font-bold text-white">{seller.name}</h1>
                {seller.is_verified && <CheckCircle className="w-6 h-6 text-emerald-400" />}
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4 text-ink-400 mb-4">
                <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{seller.location}</span>
                <span>Joined {seller.joined}</span>
              </div>
              <p className="text-ink-300 max-w-2xl">{seller.bio}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4 bg-ink-800 rounded-xl">
              <div className="flex items-center justify-center text-gold-400 mb-1">
                <Star className="w-5 h-5 fill-current mr-1" />
                <span className="text-2xl font-bold">{seller.rating}</span>
              </div>
              <p className="text-ink-400 text-sm">{seller.reviews} reviews</p>
            </div>
            <div className="text-center p-4 bg-ink-800 rounded-xl">
              <p className="text-2xl font-bold text-emerald-400">{seller.orders_completed}</p>
              <p className="text-ink-400 text-sm">Orders completed</p>
            </div>
            <div className="text-center p-4 bg-ink-800 rounded-xl">
              <div className="flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-ink-400 text-sm">Verified Seller</p>
            </div>
          </div>
        </div>

        {/* Products */}
        <h2 className="text-xl font-bold text-white mb-6">Products by {seller.name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {seller.products.map((product) => (
            <div key={product.id} className="glass rounded-xl overflow-hidden hover:border-gold-500/50 transition-all">
              <div className="aspect-video bg-gradient-to-br from-gold-500/20 to-emerald-500/20 flex items-center justify-center">
                <Package className="w-12 h-12 text-ink-600" />
              </div>
              <div className="p-4">
                <h3 className="text-white font-semibold mb-2">{product.name}</h3>
                <div className="flex justify-between items-center">
                  <p className="text-gold-400 font-bold">TZS {product.price.toLocaleString()}</p>
                  <div className="flex items-center text-gold-400 text-sm">
                    <Star className="w-4 h-4 fill-current mr-1" />
                    {product.rating}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SellerProfile;
