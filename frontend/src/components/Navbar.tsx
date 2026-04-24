import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Shield, Menu, X, ShoppingBag, User, LogOut, LayoutDashboard, Users } from 'lucide-react';
import InstallAppButton from './InstallAppButton';
import BuildBadge from './BuildBadge';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-ink-900" />
            </div>
            <span className="text-xl font-display font-bold text-white">Biz-Salama</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/marketplace" className="text-ink-300 hover:text-white transition-colors font-medium">
              Marketplace
            </Link>
            <Link to="/#three-party" className="text-ink-300 hover:text-white transition-colors font-medium">
              3-Party Escrow
            </Link>
            <Link to="/#how-it-works" className="text-ink-300 hover:text-white transition-colors font-medium">
              How It Works
            </Link>
            <Link to="/#trust" className="text-ink-300 hover:text-white transition-colors font-medium">
              Trust & Safety
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <BuildBadge />
            <InstallAppButton />
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/hawker/new"
                  data-testid="desktop-new-3p-cta"
                  className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 px-4 py-2 rounded-full font-bold text-sm hover:from-gold-400 hover:to-gold-500 shadow-lg shadow-gold-500/30 whitespace-nowrap"
                >
                  <Users className="w-4 h-4" />
                  + New 3-Party
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-2 text-ink-300 hover:text-white transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-ink-300 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-ink-300 hover:text-white transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 px-6 py-2 rounded-full font-semibold hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg hover:shadow-gold-500/25"
                >
                  Start Selling
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white p-2"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden glass border-t border-ink-700">
          <div className="px-4 py-4 space-y-3">
            {isAuthenticated && (
              <Link
                to="/hawker/new"
                data-testid="mobile-new-3p-cta"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 px-4 py-3 rounded-xl font-bold shadow-lg shadow-gold-500/30 hover:from-gold-400 hover:to-gold-500"
              >
                <Users className="w-5 h-5" />
                + New 3-Party Transaction
              </Link>
            )}
            <div className="pb-2">
              <InstallAppButton className="w-full justify-center" />
            </div>
            <Link
              to="/marketplace"
              className="block text-ink-300 hover:text-white py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Marketplace
            </Link>
            <Link
              to="/#three-party"
              className="block text-ink-300 hover:text-white py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              About 3-Party Escrow
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block text-ink-300 hover:text-white py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block text-ink-300 hover:text-white py-2 w-full text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block text-ink-300 hover:text-white py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 px-6 py-3 rounded-full font-semibold text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Start Selling
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
