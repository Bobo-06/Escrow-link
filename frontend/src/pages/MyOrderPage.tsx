import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Package,
  Truck,
  Home,
  Shield,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

type Status =
  | 'pending_payment'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'pending_approval'
  | 'approved'
  | 'supplier_approved'
  | 'counter_offered'
  | 'rejected';

interface OrderView {
  kind: 'traditional' | 'three_party';
  id: string;
  name: string;
  amount: number;
  status: Status;
  seller_name?: string;
  escrow_status?: string;
  paid_at?: string;
  delivered_at?: string;
}

const fmtTSh = (n: number) => `TSh ${Math.round(n).toLocaleString()}`;

const MyOrderPage: React.FC = () => {
  const { orderId = '' } = useParams();
  const [params] = useSearchParams();
  const buyerToken = params.get('t') || '';

  const [order, setOrder] = useState<OrderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [released, setReleased] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isThreeParty = orderId.startsWith('3P_');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isThreeParty) {
        // Public verify endpoint — buyer scope if token provided
        const qs = buyerToken ? `?t=${encodeURIComponent(buyerToken)}&r=buyer` : '';
        const res = await fetch(`${API_URL}/api/escrow/verify/${orderId}${qs}`);
        if (!res.ok) throw new Error('Order not found');
        const tx = await res.json();
        setOrder({
          kind: 'three_party',
          id: orderId,
          name: tx.item_name || tx.name || 'Three-party order',
          amount: tx.buyer_price || tx.amount_locked || 0,
          status: (tx.status || 'pending_payment') as Status,
          seller_name: tx.seller_name || tx.hawker_name,
          escrow_status: tx.escrow_status,
          paid_at: tx.paid_at,
        });
      } else {
        const res = await fetch(`${API_URL}/api/orders/${orderId}`);
        if (!res.ok) throw new Error('Order not found');
        const o = await res.json();
        setOrder({
          kind: 'traditional',
          id: orderId,
          name: o.product_name || o.name || 'Order',
          amount: o.total_paid || o.amount || 0,
          status: (o.status || 'pending_payment') as Status,
          seller_name: o.seller_name,
          escrow_status: o.escrow_status,
          paid_at: o.paid_at,
          delivered_at: o.delivered_at,
        });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, buyerToken]);

  const handleConfirm = async () => {
    if (!order) return;
    const confirmMsg =
      'Umepokea bidhaa salama?\nAre you sure the item arrived and is what you ordered?';
    if (!window.confirm(confirmMsg)) return;

    setConfirming(true);
    try {
      let res: Response;
      if (order.kind === 'three_party') {
        if (!buyerToken) throw new Error('Missing buyer token. Check your payment receipt link.');
        const qs = new URLSearchParams({ token: buyerToken });
        res = await fetch(
          `${API_URL}/api/escrow/three-party/${order.id}/buyer-confirm-delivery?${qs.toString()}`,
          { method: 'POST' },
        );
      } else {
        res = await fetch(`${API_URL}/api/orders/${order.id}/confirm-delivery`, {
          method: 'POST',
        });
      }
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to confirm');
      }
      const data = await res.json();
      setReleased(true);
      toast.success(data.message_sw || 'Malipo yametolewa! Asante.');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-gold-400 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20">
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Order not found</h1>
          <p className="text-ink-400 mb-6">{error || 'We could not locate this order.'}</p>
          <Link
            to="/marketplace"
            className="inline-block px-6 py-3 bg-gold-500 text-ink-900 font-semibold rounded-xl hover:bg-gold-400"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = released || order.status === 'completed' || order.escrow_status === 'released';
  const canConfirm = order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered';
  const steps: Array<{ icon: any; label: string; done: boolean; current?: boolean }> = [
    { icon: CheckCircle, label: 'Order placed', done: true },
    {
      icon: Package,
      label: order.kind === 'three_party' ? 'Supplier preparing' : 'Seller preparing',
      done: ['paid', 'shipped', 'delivered', 'completed'].includes(order.status) || isCompleted,
      current: order.status === 'paid',
    },
    {
      icon: Truck,
      label: 'On the way',
      done: ['shipped', 'delivered', 'completed'].includes(order.status) || isCompleted,
      current: order.status === 'shipped',
    },
    { icon: Home, label: 'Delivered & funds released', done: isCompleted, current: !isCompleted && canConfirm },
  ];

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-16">
      <SEO title={`Order ${order.id}`} url={`/my-orders/${order.id}`} noindex />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white" data-testid="my-order-heading">
            {isCompleted ? 'Order Complete' : 'Your Order'}
          </h1>
          <p className="text-ink-400 mt-1">#{order.id}</p>
        </div>

        {/* Summary card */}
        <div className="glass rounded-2xl p-6 mb-6" data-testid="my-order-summary">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <p className="text-ink-400 text-xs uppercase tracking-wide mb-1">Item</p>
              <p className="text-white font-semibold">{order.name}</p>
              {order.seller_name && (
                <p className="text-ink-400 text-sm mt-1">by {order.seller_name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-ink-400 text-xs uppercase tracking-wide mb-1">Amount</p>
              <p className="text-gold-400 font-bold text-xl">{fmtTSh(order.amount)}</p>
            </div>
          </div>

          <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2
            ${isCompleted ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : 'bg-gold-500/10 text-gold-300 border border-gold-500/30'}`}>
            <Shield className="w-4 h-4" />
            {isCompleted
              ? 'Pesa imetolewa kwa muuzaji / Funds released to seller'
              : 'Pesa yako ipo salama kwenye escrow / Your money is safely in escrow'}
          </div>
        </div>

        {/* Stepper */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="relative space-y-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-4 relative"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10
                    ${step.done ? 'bg-emerald-500'
                      : step.current ? 'bg-gold-500'
                      : 'bg-ink-700 border border-ink-600'}`}
                >
                  <step.icon className={`w-5 h-5 ${step.done || step.current ? 'text-white' : 'text-ink-400'}`} />
                </div>
                <div className="flex-1 pt-1">
                  <p className={`font-medium ${step.done || step.current ? 'text-white' : 'text-ink-400'}`}>
                    {step.label}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className="absolute left-5 top-10 w-0.5 h-8 bg-ink-700" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Confirm delivery button */}
        {!isCompleted && canConfirm && (
          <motion.button
            onClick={handleConfirm}
            disabled={confirming}
            data-testid="confirm-delivery-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600
                     text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20
                     hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-60
                     flex items-center justify-center gap-3"
          >
            {confirming ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" /> Processing…
              </>
            ) : (
              <>
                <span className="text-2xl">📦</span>
                <span className="flex flex-col items-start leading-tight">
                  <span>Nimepokea bidhaa</span>
                  <span className="text-xs font-normal opacity-90">Confirm delivery & release payment</span>
                </span>
              </>
            )}
          </motion.button>
        )}

        {!isCompleted && !canConfirm && order.status === 'pending_payment' && (
          <div className="glass rounded-xl p-4 flex items-center gap-3" data-testid="pending-payment-notice">
            <AlertCircle className="w-5 h-5 text-gold-400 flex-shrink-0" />
            <p className="text-ink-300 text-sm">
              Payment not yet received. Complete payment to activate escrow protection.
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="glass rounded-2xl p-6 text-center border border-emerald-500/30" data-testid="order-completed-notice">
            <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-white font-semibold">Asante! Thank you!</p>
            <p className="text-ink-400 text-sm mt-1">
              Funds have been released. Rate your seller on the marketplace to help others.
            </p>
            <Link
              to="/marketplace"
              className="inline-block mt-4 text-gold-400 font-medium hover:underline"
            >
              Shop again →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrderPage;
