import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Components (eager — needed on every route)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CompareDrawer from './components/CompareDrawer';

// Hot path — eagerly loaded so first paint is fast on mobile.
import LandingPage from './pages/LandingPage';
import Marketplace from './pages/Marketplace';
import ProductDetail from './pages/ProductDetail';

// Cold path — lazy-loaded chunks. Rarely opened on first visit, so we keep the
// initial JS bundle slim. React.lazy + <Suspense> serves a tiny spinner while
// the chunk fetches over a 3G/4G connection.
const SellerProfile = lazy(() => import('./pages/SellerProfile'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Hawker = lazy(() => import('./pages/Hawker'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));
const SupplierConfirmPage = lazy(() => import('./pages/SupplierConfirmPage'));
const SupplierPortalPage = lazy(() => import('./pages/SupplierPortalPage'));
const HawkerTxEditPage = lazy(() => import('./pages/HawkerTxEditPage'));
const MyOrderPage = lazy(() => import('./pages/MyOrderPage'));
const DirectEscrowCreatePage = lazy(() => import('./pages/DirectEscrowCreatePage'));
const DirectBuyerOfferPage = lazy(() => import('./pages/DirectBuyerOfferPage'));
const MyWatchesPage = lazy(() => import('./pages/MyWatchesPage'));

const RouteFallback: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center" data-testid="route-suspense-fallback">
    <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-ink-900 flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/seller/:id" element={<SellerProfile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<SellerDashboard />} />
              <Route path="/checkout/:id" element={<Checkout />} />
              <Route path="/track/:orderId" element={<OrderTracking />} />
              <Route path="/hawker/new" element={<Hawker />} />
              <Route path="/verify/:txId" element={<VerifyPage />} />
              <Route path="/supplier-confirm/:txId" element={<SupplierConfirmPage />} />
              <Route path="/supplier/portal" element={<SupplierPortalPage />} />
              <Route path="/hawker/edit/:txId" element={<HawkerTxEditPage />} />
              <Route path="/my-orders/:orderId" element={<MyOrderPage />} />
              <Route path="/direct/new" element={<DirectEscrowCreatePage />} />
              <Route path="/direct-offer/:txId" element={<DirectBuyerOfferPage />} />
              <Route path="/my-watches" element={<MyWatchesPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <CompareDrawer />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid #334155',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
