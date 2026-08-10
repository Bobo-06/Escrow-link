import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Shield, Menu, X, ShoppingBag, LogOut, LayoutDashboard, Users, BellRing, Crown } from 'lucide-react';
import InstallAppButton from './InstallAppButton';
import BuildBadge from './BuildBadge';
import { LangToggle, useT } from '../i18n';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const { t } = useT();

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
              {t("nav.marketplace")}
            </Link>
            <Link to="/#three-party" className="text-ink-300 hover:text-white transition-colors font-medium">
              {t("nav.three_party")}
            </Link>
            <Link to="/#how-it-works" className="text-ink-300 hover:text-white transition-colors font-medium">
              {t("nav.how")}
            </Link>
            <Link to="/#trust" className="text-ink-300 hover:text-white transition-colors font-medium">
              {t("nav.trust")}
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <LangToggle />
            <BuildBadge />
            <InstallAppButton />
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/direct/new"
                  data-testid="desktop-direct-cta"
                  className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 px-3 py-2 rounded-full font-bold text-xs hover:bg-emerald-500/20 whitespace-nowrap"
                  title="Direct Secure Commerce — seller to buyer, no middleman"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {t("nav.cta_direct")}
                </Link>
                <Link
                  to="/hawker/new"
                  data-testid="desktop-new-3p-cta"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 px-3 py-2 rounded-full font-bold text-xs hover:from-gold-400 hover:to-gold-500 shadow-lg shadow-gold-500/30 whitespace-nowrap"
                  title="3-Party Secure Commerce — hawker ↔ supplier ↔ buyer"
                >
                  <Users className="w-4 h-4" />
                  {t("nav.cta_3p")}
                </Link>
                <Link
                  to="/my-watches"
                  data-testid="desktop-watches-link"
                  className="flex items-center text-ink-300 hover:text-emerald-300 transition-colors"
                  title="My watched products"
                >
                  <BellRing className="w-5 h-5" />
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-2 text-ink-300 hover:text-white transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="hidden lg:inline">{t("nav.dashboard")}</span>
                </Link>
                {isAdmin && (
                  <div className="relative">
                    <button
                      onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                      data-testid="nav-admin-link"
                      className="flex items-center space-x-2 text-gold-400 hover:text-gold-300 transition-colors font-semibold"
                    >
                      <Crown className="w-5 h-5" />
                      <span className="hidden lg:inline">Admin</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isAdminMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsAdminMenuOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-ink-800 border border-ink-700 rounded-xl shadow-2xl z-50 overflow-hidden" data-testid="nav-admin-dropdown">
                          <Link to="/admin/sellers" data-testid="nav-admin-sellers" onClick={() => setIsAdminMenuOpen(false)} className="block px-4 py-2.5 text-sm text-white hover:bg-ink-700">
                            👥 Sellers
                          </Link>
                          <Link to="/admin/sellers/new" data-testid="nav-admin-register-seller" onClick={() => setIsAdminMenuOpen(false)} className="block px-4 py-2.5 text-sm text-white hover:bg-ink-700">
                            ➕ Register seller
                          </Link>
                          <Link to="/admin/onboarding/queue" data-testid="nav-admin-onboarding-queue" onClick={() => setIsAdminMenuOpen(false)} className="block px-4 py-2.5 text-sm text-white hover:bg-ink-700">
                            📋 Onboarding queue
                          </Link>
                          <Link to="/admin/ledger" data-testid="nav-admin-ledger" onClick={() => setIsAdminMenuOpen(false)} className="block px-4 py-2.5 text-sm text-white hover:bg-ink-700 border-t border-ink-700">
                            💰 Ledger
                          </Link>
                          <Link to="/admin/client-errors" data-testid="nav-admin-errors" onClick={() => setIsAdminMenuOpen(false)} className="block px-4 py-2.5 text-sm text-white hover:bg-ink-700">
                            🐛 Client errors
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-ink-300 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden lg:inline">{t("nav.logout")}</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-ink-300 hover:text-white transition-colors font-medium"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 px-6 py-2 rounded-full font-semibold hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg hover:shadow-gold-500/25"
                >
                  {t("nav.signup")}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            data-testid="navbar-mobile-toggle"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
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
            <div className="flex items-center justify-between pb-2 border-b border-ink-700">
              <span className="text-ink-400 text-xs font-mono uppercase tracking-wider">Lugha / Language</span>
              <LangToggle />
            </div>
            {isAuthenticated && (
              <>
                <Link
                  to="/hawker/new"
                  data-testid="mobile-new-3p-cta"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 px-4 py-3 rounded-xl font-bold shadow-lg shadow-gold-500/30 hover:from-gold-400 hover:to-gold-500"
                >
                  <Users className="w-5 h-5" />
                  {t("nav.cta_3p_full")}
                </Link>
                <Link
                  to="/direct/new"
                  data-testid="mobile-direct-cta"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl font-bold hover:bg-emerald-500/20"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {t("nav.cta_direct_full")}
                </Link>
              </>
            )}
            <div className="pb-2">
              <InstallAppButton className="w-full justify-center" />
            </div>
            <Link
              to="/marketplace"
              className="block text-ink-300 hover:text-white py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("nav.marketplace")}
            </Link>
            <Link
              to="/#three-party"
              className="block text-ink-300 hover:text-white py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("nav.about_3p")}
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block text-ink-300 hover:text-white py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("nav.dashboard")}
                </Link>
                <Link
                  to="/my-watches"
                  data-testid="mobile-watches-link"
                  className="block text-ink-300 hover:text-emerald-300 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("nav.watches")}
                </Link>
                {isAdmin && (
                  <div className="pt-2 border-t border-ink-700">
                    <p className="text-gold-400 text-xs uppercase font-bold tracking-wider px-1 py-1">👑 Admin</p>
                    <Link to="/admin/sellers" data-testid="nav-admin-link-mobile" className="block text-gold-400 hover:text-gold-300 py-2 pl-3 text-sm" onClick={() => setIsMenuOpen(false)}>
                      👥 Sellers
                    </Link>
                    <Link to="/admin/sellers/new" className="block text-gold-400 hover:text-gold-300 py-2 pl-3 text-sm" onClick={() => setIsMenuOpen(false)}>
                      ➕ Register seller
                    </Link>
                    <Link to="/admin/onboarding/queue" data-testid="nav-admin-onboarding-queue-mobile" className="block text-gold-400 hover:text-gold-300 py-2 pl-3 text-sm" onClick={() => setIsMenuOpen(false)}>
                      📋 Onboarding queue
                    </Link>
                    <Link to="/admin/ledger" className="block text-gold-400 hover:text-gold-300 py-2 pl-3 text-sm" onClick={() => setIsMenuOpen(false)}>
                      💰 Ledger
                    </Link>
                  </div>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block text-ink-300 hover:text-white py-2 w-full text-left"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block text-ink-300 hover:text-white py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className="block bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 px-6 py-3 rounded-full font-semibold text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("nav.signup")}
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
