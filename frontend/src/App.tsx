import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import LandingPage from './pages/LandingPage';
import Marketplace from './pages/Marketplace';
import ProductDetail from './pages/ProductDetail';
import SellerProfile from './pages/SellerProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import SellerDashboard from './pages/SellerDashboard';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import Hawker from './pages/Hawker';
import VerifyPage from './pages/VerifyPage';
import SupplierConfirmPage from './pages/SupplierConfirmPage';
import SupplierPortalPage from './pages/SupplierPortalPage';
import HawkerTxEditPage from './pages/HawkerTxEditPage';
import MyOrderPage from './pages/MyOrderPage';
import DirectEscrowCreatePage from './pages/DirectEscrowCreatePage';
import DirectBuyerOfferPage from './pages/DirectBuyerOfferPage';
import MyWatchesPage from './pages/MyWatchesPage';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CompareDrawer from './components/CompareDrawer';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-ink-900 flex flex-col">
        <Navbar />
        <main className="flex-grow">
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
