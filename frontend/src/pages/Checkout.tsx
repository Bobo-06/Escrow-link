import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shield, CreditCard, User, Loader2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import SEO from '../components/SEO';

// Our custom checkout page.
// Flow:
//   1. Load the product so we know price + seller.
//   2. Collect buyer delivery info + payment method.
//   3. On "Pay Securely": create the order in our DB (POST /orders),
//      then route by payment method:
//        mpesa / airtel / tigo → POST /payments/selcom/stk  (USSD push to phone)
//        bank                  → POST /payments/selcom/checkout (hosted page,
//                                 where the bank tab appears alongside wallets)
//   4. Navigate to the order status page, where the webhook flips it to paid.

type PaymentMethod = 'mpesa' | 'airtel' | 'tigo' | 'bank';

interface Product {
  product_id: string;
  name: string;
  price: number;              // seller's TZS price
  image?: string;
  seller_name?: string;
}

interface CreatedOrder {
  order_id: string;
  product_id: string;
  product_name: string;
  product_price_tzs: number;
  total_paid: number;
  buyer_protection_fee: number;
  seller_payout: number;
}

const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; icon: string; sublabel?: string }> = [
  { id: 'mpesa',  label: 'M-Pesa',       icon: '📱', sublabel: 'STK push to your phone' },
  { id: 'airtel', label: 'Airtel Money', icon: '📱', sublabel: 'STK push to your phone' },
  { id: 'tigo',   label: 'Tigo Pesa',    icon: '📱', sublabel: 'STK push to your phone' },
  { id: 'bank',   label: 'Bank Transfer / Card', icon: '🏦', sublabel: 'CRDB, NMB, NBC, Stanbic, Visa, Mastercard' },
];

// Normalize phone to Selcom's expected 255XXXXXXXXX (12 digits, no plus).
function normalizePhone(raw: string): string {
  const p = (raw || '').replace(/[^\d]/g, '');
  if (p.startsWith('0') && p.length === 10) return '255' + p.slice(1);
  if (p.startsWith('255') && p.length === 12) return p;
  if (p.length === 9) return '255' + p;
  return p;
}

const Checkout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('mpesa');
  const [submitting, setSubmitting] = useState(false);

  // Load product
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoadingProduct(true);
      try {
        // Public endpoint — no auth required, so the buyer can check out
        // without being logged in (login happens later if needed).
        const r = await api.get(`/products/detail/${id}`);
        setProduct(r.data);
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || 'Product not found');
      } finally {
        setLoadingProduct(false);
      }
    })();
    // Prefill from local profile if available
    try {
      const raw = localStorage.getItem('bs_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u.name) setName(u.name);
        if (u.phone) setPhone(u.phone);
      }
    } catch { /* non-fatal */ }
  }, [id]);

  const subtotal = product?.price || 0;
  const protectionFee = useMemo(() => Math.round(subtotal * 0.03), [subtotal]);
  const total = subtotal + protectionFee;

  const canSubmit = Boolean(
    product && name.trim() && phone.trim() && location.trim() && !submitting
  );

  const handlePay = async () => {
    if (!product) return;
    if (!name.trim() || !phone.trim() || !location.trim()) {
      toast.error('Please complete all delivery fields');
      return;
    }
    const nPhone = normalizePhone(phone);
    if (nPhone.length !== 12 || !nPhone.startsWith('255')) {
      toast.error('Enter a valid Tanzanian phone (0XXXXXXXXX or 255XXXXXXXXX)');
      return;
    }

    setSubmitting(true);
    const loader = toast.loading('Creating your order...');
    try {
      // Step 1: Create the order in our DB
      const orderResp = await api.post<CreatedOrder>('/orders', {
        product_id: product.product_id,
        buyer_name: name.trim(),
        buyer_phone: nPhone,
        buyer_location: location.trim(),
        buyer_country: 'TZ',
        payment_method: method,
        buyer_currency: 'TZS',
      });
      const order = orderResp.data;

      // Step 2: Kick off payment
      if (method === 'bank') {
        // Hosted-page flow — bank + card tabs appear on the Selcom page
        toast.loading('Opening bank payment...', { id: loader });
        const r = await api.post('/payments/selcom/checkout', {
          amount: order.total_paid,
          phone: nPhone,
          order_id: order.order_id,
          buyer_name: name.trim(),
          buyer_email: `${nPhone}@biz-salama.co.tz`,
        });

        // Selcom hasn't activated the hosted-checkout endpoint yet → clear message
        if (r.data?.activation_pending) {
          toast.error(
            r.data.message ||
              'Bank & card payments are being activated. Please use mobile money for now.',
            { id: loader, duration: 8000 }
          );
          // Auto-switch the selection to M-Pesa so the next click just works
          setMethod('mpesa');
          setSubmitting(false);
          return;
        }

        const url = r.data?.checkout_url;
        if (!url) {
          toast.error(r.data?.selcom?.message || 'Selcom did not return a payment URL', { id: loader });
          setSubmitting(false);
          return;
        }
        toast.dismiss(loader);
        window.location.href = url;
        return;
      }

      // Mobile-money STK push flow
      toast.loading(`Sending ${PAYMENT_METHODS.find(m => m.id === method)?.label} prompt to ${nPhone}...`, { id: loader });
      const r = await api.post('/payments/selcom/stk', {
        amount: order.total_paid,
        phone: nPhone,
        transaction_ref: order.order_id,
      });
      if (r.data?.ok) {
        toast.success('Check your phone — enter your PIN to confirm', { id: loader, duration: 6000 });
      } else if (r.data?.simulated) {
        toast.success('Simulated payment (dev mode) — redirecting...', { id: loader });
      } else {
        toast.error(r.data?.selcom?.message || 'Payment push failed. Please try bank/card.', { id: loader });
        setSubmitting(false);
        return;
      }
      navigate(`/my-orders/${order.order_id}`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || 'Payment could not be started';
      toast.error(detail, { id: loader });
      setSubmitting(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Product not found or no longer available.</p>
          <button onClick={() => navigate('/marketplace')} className="px-5 py-2 bg-gold-500 text-ink-900 font-semibold rounded-lg" data-testid="back-to-marketplace-btn">
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 pt-20">
      <SEO title="Secure Checkout" description="Pay safely — M-Pesa, Tigo Pesa, Airtel Money or Bank. Protected by Biz-Salama." url="/checkout" noindex />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-display font-bold text-white mb-8" data-testid="checkout-title">
          Secure Checkout
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-gold-400" />
                Delivery Information
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-4 py-3 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500"
                  data-testid="checkout-name-input"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number (07XXXXXXXX)"
                  inputMode="tel"
                  className="w-full px-4 py-3 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500"
                  data-testid="checkout-phone-input"
                />
                <textarea
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Delivery Address"
                  rows={3}
                  className="w-full px-4 py-3 bg-ink-700 border border-ink-600 rounded-xl text-white placeholder-ink-400 focus:outline-none focus:border-gold-500"
                  data-testid="checkout-address-input"
                />
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-gold-400" />
                Payment Method
              </h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((pm) => (
                  <label
                    key={pm.id}
                    className={`flex items-center p-4 rounded-xl cursor-pointer transition-colors ${
                      method === pm.id ? 'bg-gold-500/10 border border-gold-500/40' : 'bg-ink-700 hover:bg-ink-600 border border-transparent'
                    }`}
                    data-testid={`checkout-method-${pm.id}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={pm.id}
                      checked={method === pm.id}
                      onChange={() => setMethod(pm.id)}
                      className="w-5 h-5 text-gold-500"
                    />
                    <span className="ml-3 flex-1">
                      <span className="text-white flex items-center">
                        <span className="mr-2">{pm.icon}</span>
                        {pm.label}
                        {pm.id === 'bank' && (
                          <Building2 className="w-4 h-4 ml-2 text-emerald-400" />
                        )}
                      </span>
                      {pm.sublabel && (
                        <span className="text-xs text-ink-400 block mt-0.5 ml-6">{pm.sublabel}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="glass rounded-xl p-6 h-fit" data-testid="checkout-summary">
            <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>
            <div className="mb-4 pb-4 border-b border-ink-700">
              <div className="text-sm text-ink-300 mb-1">Product</div>
              <div className="text-white font-semibold line-clamp-2" data-testid="checkout-product-name">{product.name}</div>
              {product.seller_name && (
                <div className="text-xs text-ink-500 mt-1">Seller: {product.seller_name}</div>
              )}
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-ink-300">
                <span>Subtotal</span>
                <span data-testid="checkout-subtotal">TZS {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-ink-300">
                <span>Protection Fee (3%)</span>
                <span data-testid="checkout-fee">TZS {protectionFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-ink-700 pt-3 flex justify-between text-white font-semibold">
                <span>Total</span>
                <span className="text-gold-400" data-testid="checkout-total">TZS {total.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={!canSubmit}
              data-testid="checkout-pay-btn"
              className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 rounded-xl font-bold hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay Securely — TZS ${total.toLocaleString()}`
              )}
            </button>

            <div className="mt-4 flex items-center justify-center text-emerald-400 text-sm">
              <Shield className="w-4 h-4 mr-2" />
              Protected by Biz-Salama
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
