import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, BanknoteIcon, RefreshCw, AlertTriangle, CheckCircle2, Send,
  Clock, Shield, Info, Zap, Building2, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────────────
interface Reconcile {
  cash_clearing_selcom: number;
  cash_trust_azania: number;
  buyer_escrow_liability: number;
  seller_payable: number;
  agent_payable: number;
  platform_revenue: number;
  total_cash: number;
  total_liabilities: number;
  liquidity_shortfall: number;
  sweep_pending_entries: number;
  payouts_queued: number;
  generated_at: string;
}

interface QueueOrder {
  order_id: string;
  amount: number;
  buyer_phone?: string;
  buyer_name?: string;
  order_status?: string;
}

interface SweepQueue {
  pending_count: number;
  pending_total: number;
  narration: string;
  orders: QueueOrder[];
}

interface Payout {
  payout_id: string;
  order_id: string;
  beneficiary_user_id: string;
  beneficiary_role: 'seller' | 'agent';
  destination: string;
  amount: number;
  status: string;
  provider?: string;
  provider_ref?: string;
  selcom_transid?: string;
  selcom_resultcode?: string;
  selcom_network?: string;
  updated_at?: string;
  created_at?: string;
}

interface EscrowEvent {
  event_id: string;
  event_type: string;
  actor?: string;
  meta?: Record<string, unknown>;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
const fmt = (n: number) => `TZS ${(n || 0).toLocaleString()}`;

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    queued:     'bg-amber-500/15 text-amber-300 border-amber-500/40',
    disbursing: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    pending:    'bg-blue-500/15 text-blue-300 border-blue-500/40',
    paid:       'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    failed:     'bg-rose-500/15 text-rose-300 border-rose-500/40',
  };
  return (
    <span data-testid={`payout-status-${status}`} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${map[status] || 'bg-ink-700 text-ink-300 border-ink-600'}`}>
      {status}
    </span>
  );
};

// ─── Small UI primitives ────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: string; icon: React.ReactNode; tone?: 'ok'|'warn'|'alert'|'neutral';
}> = ({ label, value, icon, tone = 'neutral' }) => {
  const toneCls = {
    ok:      'from-emerald-500/10 to-emerald-500/0 border-emerald-500/30',
    warn:    'from-amber-500/10 to-amber-500/0 border-amber-500/30',
    alert:   'from-rose-500/10 to-rose-500/0 border-rose-500/30',
    neutral: 'from-ink-700/40 to-ink-700/0 border-ink-700',
  }[tone];
  return (
    <div className={`glass rounded-xl p-4 border bg-gradient-to-br ${toneCls}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-ink-400 text-xs uppercase tracking-wider">{label}</span>
        <div className="text-ink-300">{icon}</div>
      </div>
      <div className="text-xl font-display font-bold text-white break-all">{value}</div>
    </div>
  );
};

// ─── Sweep Queue section ────────────────────────────────────────────────
const SweepQueueSection: React.FC<{ onChange: () => void }> = ({ onChange }) => {
  const [queue, setQueue] = useState<SweepQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [selcomRef, setSelcomRef] = useState('');
  const [azaniaRef, setAzaniaRef] = useState('');
  const [note, setNote] = useState('');
  const [confirmStage, setConfirmStage] = useState<0 | 1>(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/escrow/queue');
      setQueue(r.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to load sweep queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const record = async () => {
    if (!queue || queue.orders.length === 0) return;
    if (!selcomRef.trim() || !azaniaRef.trim()) {
      toast.error('Both Selcom and Azania reference numbers are required');
      return;
    }
    setRecording(true);
    try {
      const r = await api.post('/admin/escrow/transfer-recorded', {
        order_ids: queue.orders.map(o => o.order_id),
        expected_total: queue.pending_total,
        selcom_ref: selcomRef.trim(),
        azania_ref: azaniaRef.trim(),
        note: note.trim(),
      });
      toast.success(`Swept ${r.data.orders_swept} order(s) · ${fmt(r.data.total_amount)}`);
      setSelcomRef(''); setAzaniaRef(''); setNote(''); setConfirmStage(0);
      await load();
      onChange();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Transfer-record failed');
    } finally {
      setRecording(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5 mb-6"
      data-testid="sweep-queue-section"
    >
      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            Daily Sweep: Selcom → Azania Trust
          </h2>
          <p className="text-ink-400 text-sm mt-0.5">
            Transfer the day's Selcom collection into the Azania trust account, then record the two bank refs.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg bg-ink-700/60 hover:bg-ink-600 text-ink-300 disabled:opacity-50"
          data-testid="sweep-refresh-btn"
          title="Refresh queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {loading && !queue ? (
        <div className="text-ink-400 text-sm">Loading...</div>
      ) : !queue || queue.pending_count === 0 ? (
        <div className="py-8 text-center text-ink-400" data-testid="sweep-empty">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400/70" />
          No pending Selcom collections. Trust account is fully funded.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <StatCard label="Pending orders" value={String(queue.pending_count)} icon={<Clock className="w-4 h-4" />} tone="warn" />
            <StatCard label="Amount to sweep" value={fmt(queue.pending_total)} icon={<Wallet className="w-4 h-4" />} tone="warn" />
            <StatCard label="Narration (use this)" value={queue.narration} icon={<Info className="w-4 h-4" />} tone="neutral" />
          </div>

          <div className="overflow-x-auto mb-4 rounded-lg border border-ink-700">
            <table className="w-full text-sm">
              <thead className="bg-ink-800/80 text-ink-300 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Order ID</th>
                  <th className="px-3 py-2 text-left">Buyer</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Order Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.orders.map(o => (
                  <tr key={o.order_id} className="border-t border-ink-700/50 hover:bg-ink-800/30">
                    <td className="px-3 py-2 font-mono text-xs text-ink-200">{o.order_id}</td>
                    <td className="px-3 py-2 text-ink-300">
                      {o.buyer_name || '—'}
                      {o.buyer_phone && <div className="text-ink-500 text-xs">{o.buyer_phone}</div>}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-white">{fmt(o.amount)}</td>
                    <td className="px-3 py-2 text-ink-400 text-xs">{o.order_status || '—'}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-amber-500/40 bg-amber-500/5">
                  <td colSpan={2} className="px-3 py-2 text-right text-ink-200 font-semibold">Total</td>
                  <td className="px-3 py-2 text-right text-amber-300 font-display font-bold">{fmt(queue.pending_total)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-ink-800/40 rounded-lg p-4 border border-ink-700">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Record the transfer
            </h3>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="text-xs text-ink-400 uppercase tracking-wider">Selcom IB ref *</span>
                <input
                  type="text" value={selcomRef} onChange={e => setSelcomRef(e.target.value)}
                  placeholder="e.g. SLCM-TX-20261118-0001"
                  className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-lg text-white placeholder:text-ink-500 text-sm"
                  data-testid="sweep-selcom-ref-input"
                />
              </label>
              <label className="block">
                <span className="text-xs text-ink-400 uppercase tracking-wider">Azania IB ref *</span>
                <input
                  type="text" value={azaniaRef} onChange={e => setAzaniaRef(e.target.value)}
                  placeholder="e.g. AZN-DEP-20261118-0001"
                  className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-lg text-white placeholder:text-ink-500 text-sm"
                  data-testid="sweep-azania-ref-input"
                />
              </label>
            </div>
            <label className="block mb-3">
              <span className="text-xs text-ink-400 uppercase tracking-wider">Note (optional)</span>
              <input
                type="text" value={note} onChange={e => setNote(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-lg text-white placeholder:text-ink-500 text-sm"
                data-testid="sweep-note-input"
              />
            </label>

            {confirmStage === 0 ? (
              <button
                onClick={() => setConfirmStage(1)}
                disabled={!selcomRef.trim() || !azaniaRef.trim()}
                className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg font-semibold text-sm disabled:opacity-50"
                data-testid="sweep-record-btn"
              >
                Record sweep ({fmt(queue.pending_total)})
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmStage(0)}
                  className="flex-1 py-2.5 bg-ink-700 hover:bg-ink-600 text-ink-200 rounded-lg font-semibold text-sm"
                  data-testid="sweep-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={record} disabled={recording}
                  className="flex-[2] py-2.5 bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-500/50 rounded-lg font-semibold text-sm disabled:opacity-50"
                  data-testid="sweep-confirm-btn"
                >
                  {recording ? 'Recording...' : `✓ Confirm — ${fmt(queue.pending_total)} swept`}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </motion.section>
  );
};

// ─── Payouts section ────────────────────────────────────────────────────
const PayoutsSection: React.FC<{ onChange: () => void }> = ({ onChange }) => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'queued' | 'disbursing' | 'paid' | 'failed' | 'all'>('queued');
  const [acting, setActing] = useState<string | null>(null);
  const [manualFor, setManualFor] = useState<Payout | null>(null);
  const [manualAzaniaRef, setManualAzaniaRef] = useState('');
  const [manualNote, setManualNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/payouts' : `/payouts?status=${filter}`;
      const r = await api.get(url);
      setPayouts(r.data.payouts || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  const disburseSelcom = async (p: Payout) => {
    setActing(p.payout_id);
    try {
      const r = await api.post(`/admin/payouts/${p.payout_id}/disburse-via-selcom`, { network: 'auto' });
      const { status, resultcode } = r.data;
      if (status === 'paid')         toast.success(`✓ Paid via Selcom (${resultcode})`);
      else if (status === 'failed')  toast.error(`Selcom rejected (${resultcode})`);
      else                            toast(`In progress (${resultcode}) — poll for status`, { icon: '⏳' });
      await load();
      onChange();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Selcom disburse failed');
    } finally {
      setActing(null);
    }
  };

  const pollStatus = async (p: Payout) => {
    setActing(p.payout_id);
    try {
      const r = await api.post(`/admin/payouts/${p.payout_id}/selcom-status`);
      const { status, resultcode } = r.data;
      toast.success(`Status: ${status} (${resultcode})`);
      await load();
      onChange();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Status poll failed');
    } finally {
      setActing(null);
    }
  };

  const recordManual = async () => {
    if (!manualFor) return;
    if (!manualAzaniaRef.trim()) { toast.error('Azania ref required'); return; }
    setActing(manualFor.payout_id);
    try {
      await api.post(`/admin/payouts/${manualFor.payout_id}/manual-record`, {
        beneficiary_phone: manualFor.destination,
        azania_ref: manualAzaniaRef.trim(),
        note: manualNote.trim(),
      });
      toast.success(`✓ Manual payout recorded for ${manualFor.payout_id}`);
      setManualFor(null); setManualAzaniaRef(''); setManualNote('');
      await load();
      onChange();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Manual record failed');
    } finally {
      setActing(null);
    }
  };

  const filterLabels: Array<{ key: typeof filter; label: string }> = [
    { key: 'queued', label: 'Queued' },
    { key: 'disbursing', label: 'In progress' },
    { key: 'paid', label: 'Paid' },
    { key: 'failed', label: 'Failed' },
    { key: 'all', label: 'All' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5 mb-6"
      data-testid="payouts-section"
    >
      <header className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
            <BanknoteIcon className="w-5 h-5 text-emerald-400" />
            Payouts — Azania Trust → Seller / Agent
          </h2>
          <p className="text-ink-400 text-sm mt-0.5">
            One-click disburse via Selcom Wallet Cashin · Manual Azania IB record as fallback.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-lg bg-ink-700/60 hover:bg-ink-600 text-ink-300 disabled:opacity-50" data-testid="payouts-refresh-btn">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="flex gap-2 mb-4 flex-wrap">
        {filterLabels.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            data-testid={`payout-filter-${f.key}`}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              filter === f.key
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50'
                : 'bg-ink-800/50 text-ink-300 border-ink-700 hover:bg-ink-700/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-ink-400 text-sm">Loading...</div>
      ) : payouts.length === 0 ? (
        <div className="py-8 text-center text-ink-400" data-testid="payouts-empty">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400/70" />
          No payouts with status "{filter}".
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink-700">
          <table className="w-full text-sm">
            <thead className="bg-ink-800/80 text-ink-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Payout ID</th>
                <th className="px-3 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Destination</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Ref</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.payout_id} className="border-t border-ink-700/50 hover:bg-ink-800/30" data-testid={`payout-row-${p.payout_id}`}>
                  <td className="px-3 py-2 font-mono text-xs text-ink-200">{p.payout_id.slice(0, 16)}...</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-300">{p.order_id.slice(0, 16)}...</td>
                  <td className="px-3 py-2 text-ink-300">{p.beneficiary_role}</td>
                  <td className="px-3 py-2 text-ink-300">{p.destination || '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-white">{fmt(p.amount)}</td>
                  <td className="px-3 py-2"><StatusPill status={p.status} /></td>
                  <td className="px-3 py-2 text-ink-400 text-xs font-mono">
                    {p.provider_ref ? (
                      <span title={p.provider_ref}>{p.provider_ref.slice(0, 14)}{p.provider_ref.length > 14 ? '...' : ''}</span>
                    ) : '—'}
                    {p.selcom_resultcode && <div className="text-[10px] text-ink-500">rc={p.selcom_resultcode}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {p.status === 'queued' && (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => disburseSelcom(p)} disabled={acting === p.payout_id}
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 rounded text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                          data-testid={`disburse-selcom-${p.payout_id}`}
                          title="Pay via Selcom Wallet Cashin"
                        >
                          <Zap className="w-3 h-3" /> Selcom
                        </button>
                        <button
                          onClick={() => { setManualFor(p); setManualAzaniaRef(''); setManualNote(''); }}
                          className="px-2 py-1 bg-ink-700 hover:bg-ink-600 text-ink-200 border border-ink-600 rounded text-xs font-semibold inline-flex items-center gap-1"
                          data-testid={`manual-record-${p.payout_id}`}
                          title="Record manual Azania IB transfer"
                        >
                          <Building2 className="w-3 h-3" /> Manual
                        </button>
                      </div>
                    )}
                    {(p.status === 'disbursing' || p.status === 'pending') && (
                      <button
                        onClick={() => pollStatus(p)} disabled={acting === p.payout_id}
                        className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/40 rounded text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                        data-testid={`poll-status-${p.payout_id}`}
                      >
                        <RefreshCw className="w-3 h-3" /> Poll
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual-record modal */}
      {manualFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" data-testid="manual-record-modal">
          <div className="bg-ink-800 border border-ink-600 rounded-xl p-5 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-1">Record manual payout</h3>
            <p className="text-ink-400 text-sm mb-4">
              You're recording that <strong>{fmt(manualFor.amount)}</strong> was manually transferred
              from Azania IB to <strong className="font-mono">{manualFor.destination}</strong>.
            </p>
            <label className="block mb-3">
              <span className="text-xs text-ink-400 uppercase tracking-wider">Azania IB ref *</span>
              <input
                type="text" value={manualAzaniaRef} onChange={e => setManualAzaniaRef(e.target.value)}
                placeholder="e.g. AZN-PAY-20261118-0042"
                className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-lg text-white text-sm"
                data-testid="manual-azania-ref-input"
                autoFocus
              />
            </label>
            <label className="block mb-4">
              <span className="text-xs text-ink-400 uppercase tracking-wider">Note (optional)</span>
              <input
                type="text" value={manualNote} onChange={e => setManualNote(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-lg text-white text-sm"
                data-testid="manual-note-input"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setManualFor(null)}
                className="flex-1 py-2 bg-ink-700 hover:bg-ink-600 text-ink-200 rounded-lg font-semibold text-sm"
                data-testid="manual-cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={recordManual}
                disabled={acting === manualFor.payout_id}
                className="flex-[2] py-2 bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-500/50 rounded-lg font-semibold text-sm disabled:opacity-50"
                data-testid="manual-confirm-btn"
              >
                {acting === manualFor.payout_id ? 'Recording...' : 'Record payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
};

// ─── Audit timeline modal ───────────────────────────────────────────────
const AuditTimeline: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [events, setEvents] = useState<EscrowEvent[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!orderId.trim()) return;
    setLoading(true);
    try {
      const r = await api.get(`/admin/escrow/events/${encodeURIComponent(orderId.trim())}`);
      setEvents(r.data.events || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to load audit trail');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5 mb-6"
      data-testid="audit-timeline-section"
    >
      <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2 mb-1">
        <Shield className="w-5 h-5 text-indigo-400" />
        Per-order Audit Trail
      </h2>
      <p className="text-ink-400 text-sm mb-3">
        Append-only escrow events. Immutable evidence for auditors, Azania, or BoT.
      </p>
      <div className="flex gap-2 mb-4">
        <input
          type="text" value={orderId} onChange={e => setOrderId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Order ID (e.g. ord_abc123...)"
          className="flex-1 px-3 py-2 bg-ink-900 border border-ink-600 rounded-lg text-white placeholder:text-ink-500 text-sm font-mono"
          data-testid="audit-order-input"
        />
        <button
          onClick={load} disabled={loading || !orderId.trim()}
          className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 rounded-lg text-sm font-semibold disabled:opacity-50"
          data-testid="audit-load-btn"
        >
          {loading ? 'Loading...' : 'Load trail'}
        </button>
      </div>

      {events && (
        events.length === 0 ? (
          <div className="text-ink-400 text-sm py-6 text-center">No events recorded for this order.</div>
        ) : (
          <ol className="relative border-l-2 border-indigo-500/30 ml-2 pl-4 space-y-3">
            {events.map(ev => (
              <li key={ev.event_id} className="relative" data-testid={`audit-event-${ev.event_type}`}>
                <span className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-indigo-400 ring-4 ring-ink-800" />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-semibold text-sm text-white">{ev.event_type}</div>
                  <div className="text-ink-500 text-xs font-mono">{new Date(ev.created_at).toLocaleString()}</div>
                </div>
                {ev.actor && <div className="text-ink-400 text-xs">actor: <span className="font-mono">{ev.actor}</span></div>}
                {ev.meta && Object.keys(ev.meta).length > 0 && (
                  <pre className="mt-1 text-[11px] text-ink-300 bg-ink-900/60 rounded p-2 overflow-x-auto">
                    {JSON.stringify(ev.meta, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        )
      )}
    </motion.section>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────
export default function AdminEscrowReconcilePage() {
  const [rec, setRec] = useState<Reconcile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/escrow/reconcile');
      setRec(r.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to load reconcile snapshot');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshToken]);

  const bump = () => setRefreshToken(t => t + 1);

  const shortfall = rec?.liquidity_shortfall ?? 0;
  const shortfallTone: 'ok'|'warn'|'alert' =
    shortfall > 0 ? 'alert' : shortfall < -0.01 ? 'warn' : 'ok';

  return (
    <div className="min-h-screen bg-ink-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Escrow Reconciliation — Admin"
        description="Daily Selcom → Azania sweep queue, queued payouts, and per-order audit timeline."
        url="/admin/escrow/reconcile" noindex
      />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2">
              <Shield className="w-7 h-7 text-amber-400" />
              Escrow Reconciliation
            </h1>
            <p className="text-ink-400 text-sm mt-1">
              Daily cash position across Selcom clearing and the Azania bank-trusteed escrow account,
              with one-click sweep + payout actions and an immutable per-order audit trail.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/ledger" className="px-3 py-2 bg-ink-700 hover:bg-ink-600 text-ink-200 rounded-lg text-sm inline-flex items-center gap-2" data-testid="link-admin-ledger">
              <ExternalLink className="w-4 h-4" /> Ledger
            </Link>
            <button onClick={bump} disabled={loading} className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50" data-testid="reconcile-refresh-btn">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh all
            </button>
          </div>
        </div>

        {/* Reconcile snapshot */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-5 mb-6"
          data-testid="reconcile-section"
        >
          <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-amber-400" />
            Today's Position
          </h2>
          {loading && !rec ? (
            <div className="text-ink-400 text-sm">Loading snapshot...</div>
          ) : rec ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                <StatCard label="Selcom clearing" value={fmt(rec.cash_clearing_selcom)} icon={<Building2 className="w-4 h-4" />} tone={rec.cash_clearing_selcom > 0 ? 'warn' : 'ok'} />
                <StatCard label="Azania trust" value={fmt(rec.cash_trust_azania)} icon={<Shield className="w-4 h-4" />} tone="ok" />
                <StatCard label="Buyer escrow liab." value={fmt(rec.buyer_escrow_liability)} icon={<Wallet className="w-4 h-4" />} tone="neutral" />
                <StatCard label="Platform revenue" value={fmt(rec.platform_revenue)} icon={<BanknoteIcon className="w-4 h-4" />} tone="ok" />
                <StatCard label="Seller payable" value={fmt(rec.seller_payable)} icon={<Send className="w-4 h-4" />} tone={rec.seller_payable > 0 ? 'warn' : 'ok'} />
                <StatCard label="Agent payable" value={fmt(rec.agent_payable)} icon={<Send className="w-4 h-4" />} tone={rec.agent_payable > 0 ? 'warn' : 'ok'} />
                <StatCard label="Total cash" value={fmt(rec.total_cash)} icon={<Wallet className="w-4 h-4" />} tone="neutral" />
                <StatCard
                  label={shortfall > 0 ? 'LIQUIDITY SHORTFALL' : 'Surplus (fee in trust)'}
                  value={fmt(Math.abs(shortfall))}
                  icon={shortfall > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  tone={shortfallTone}
                />
              </div>
              <div className="text-ink-500 text-xs flex items-center gap-4 flex-wrap">
                <span>Generated: {new Date(rec.generated_at).toLocaleString()}</span>
                <span>Sweep entries: {rec.sweep_pending_entries}</span>
                <span>Queued payouts: {rec.payouts_queued}</span>
              </div>
              {shortfall > 0.01 && (
                <div className="mt-3 bg-rose-500/10 border border-rose-500/40 rounded-lg p-3 flex items-start gap-2" data-testid="shortfall-warning">
                  <AlertTriangle className="w-5 h-5 text-rose-300 flex-shrink-0 mt-0.5" />
                  <div className="text-rose-200 text-sm">
                    <strong>Liquidity shortfall of {fmt(shortfall)}.</strong>
                    &nbsp;Cash on hand (Selcom + Azania) is less than outstanding liabilities.
                    Likely cause: an un-recorded Selcom → Azania sweep. Record it in the section below.
                  </div>
                </div>
              )}
            </>
          ) : null}
        </motion.section>

        <SweepQueueSection onChange={bump} />
        <PayoutsSection onChange={bump} />
        <AuditTimeline />
      </div>
    </div>
  );
}
