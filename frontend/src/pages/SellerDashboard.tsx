import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Plus, Package, TrendingUp, DollarSign, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import SEO from '../components/SEO';

const SellerDashboard: React.FC = () => {
  const { user } = useAuthStore();

  const stats = [
    { label: 'Total Revenue', value: 'TZS 2.5M', icon: DollarSign, color: 'gold' },
    { label: 'Active Products', value: '12', icon: Package, color: 'emerald' },
    { label: 'Orders', value: '45', icon: TrendingUp, color: 'blue' },
  ];

  return (
    <div className="min-h-screen bg-ink-900 pt-20">
      <SEO title="Seller Dashboard" url="/dashboard" noindex />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Seller Dashboard</h1>
            <p className="text-ink-400">Welcome back, {user?.name || 'Seller'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              data-testid="dashboard-three-party-btn"
              to="/hawker/new"
              className="flex items-center px-5 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-400 transition-all"
            >
              <Users className="w-5 h-5 mr-2" />
              3-Party Escrow
            </Link>
            <Link
              data-testid="dashboard-supplier-portal-btn"
              to="/supplier/portal"
              className="flex items-center px-5 py-3 bg-ink-700 text-white rounded-xl font-semibold hover:bg-ink-600 transition-all border border-ink-600"
            >
              <Shield className="w-5 h-5 mr-2" />
              Supplier Portal
            </Link>
            <button className="flex items-center px-5 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 rounded-xl font-semibold hover:from-gold-400 hover:to-gold-500 transition-all">
              <Plus className="w-5 h-5 mr-2" />
              Add Product
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="glass rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-ink-400 text-sm mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-${stat.color}-500/20 rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="glass rounded-xl p-6 flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="w-10 h-10 text-emerald-400 mr-4" />
            <div>
              <p className="text-white font-semibold">All transactions protected</p>
              <p className="text-ink-400 text-sm">Buyers pay with confidence using escrow</p>
            </div>
          </div>
          <Link to="/marketplace" className="text-gold-400 font-medium hover:underline">
            View your store →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
