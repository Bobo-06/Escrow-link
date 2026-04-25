import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Phone, Mail, MapPin } from 'lucide-react';
import { useT } from '../i18n';

const Footer: React.FC = () => {
  const { t } = useT();
  return (
    <footer className="bg-ink-800 border-t border-ink-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-ink-900" />
              </div>
              <span className="text-xl font-display font-bold text-white">Biz-Salama</span>
            </div>
            <p className="text-ink-400 mb-4 max-w-md">
              {t("footer.tagline")}
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-ink-400 hover:text-gold-400 transition-colors" aria-label="Twitter">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-ink-400 hover:text-gold-400 transition-colors" aria-label="Pinterest">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
                </svg>
              </a>
              <a href="#" className="text-ink-400 hover:text-gold-400 transition-colors" aria-label="Instagram">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t("footer.quick_links")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/marketplace" className="text-ink-400 hover:text-gold-400 transition-colors">
                  {t("nav.marketplace")}
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-ink-400 hover:text-gold-400 transition-colors">
                  {t("footer.become_seller")}
                </Link>
              </li>
              <li>
                <Link to="/#how-it-works" className="text-ink-400 hover:text-gold-400 transition-colors">
                  {t("nav.how")}
                </Link>
              </li>
              <li>
                <Link to="/#trust" className="text-ink-400 hover:text-gold-400 transition-colors">
                  {t("nav.trust")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t("footer.contact")}</h4>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2 text-ink-400">
                <Phone className="w-5 h-5 text-gold-400" />
                <span>+255 700 123 456</span>
              </li>
              <li className="flex items-center space-x-2 text-ink-400">
                <Mail className="w-5 h-5 text-gold-400" />
                <span>support@biz-salama.co.tz</span>
              </li>
              <li className="flex items-start space-x-2 text-ink-400">
                <MapPin className="w-5 h-5 text-gold-400 flex-shrink-0" />
                <span>Dar es Salaam, Tanzania</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ink-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-ink-500 text-sm">
            {t("footer.rights")}
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-ink-500 hover:text-ink-300 text-sm">{t("footer.privacy")}</a>
            <a href="#" className="text-ink-500 hover:text-ink-300 text-sm">{t("footer.terms")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
