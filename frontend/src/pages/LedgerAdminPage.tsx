import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Scale, BookOpen, Calculator, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import SEO from '../components/SEO';
import { useT } from '../i18n';
import { useAuthStore } from '../store/authStore';

interface Payout {
  payout_id: string;
  order_id: string;
  beneficiary_role: string;
  destination: string;
  amount: number;
  status: string;
  provider: string;
  provider_ref?: string;
  created_at?: string;
}

interface Dispute {
  dispute_id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  status: string;
  resolution?: string;
  auto_resolve_at?: string;
  buyer_decision?: string;
  seller_decision?: string;
  created_at?: string;
}

interface Account {
  code: string;
  name: string;
  type: string;
}

const fmt = (n: number) => `TZS ${(n || 0).toLocaleString()}`;

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    queued: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    paid: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    failed: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    open: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    review: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${map[status] || 'bg-ink-700 text-ink-300 border-ink-600'}`}>
      {status}
    </span>
  );
};

const FeeCalculator: React.FC = () => {
  const { t } = useT();
  const [mode, setMode] = useState<'direct' | 'three_party'>('direct');
  const [deal, setDeal] = useState('100000');
  const [supplierCost, setSupplierCost] = useState('80000');
  const [quote, setQuote] = useState<any>(null);

  useEffect(() => {
    const dv = parseFloat(deal);
    const sc = parseFloat(supplierCost);
    if (!dv || dv <= 0) { setQuote(null); return; }
    if (mode === 'three_party' && (!sc || sc <= 0 || sc >= dv)) { setQuote(null); return; }
    let alive = true;
    (async () => {
      try {
        const body: any = { mode, deal_value: dv };
        if (mode === 'three_party') body.supplier_cost = sc;
        const r = await api.post('/ledger/quote', body);
        if (alive) setQuote(r.data);
      } catch {
        if (alive) setQuote(null);
      }
    })();
    return () => { alive = false; };
  }, [mode, deal, supplierCost]);

  return (
    <div className="glass rounded-2xl p-6" data-testid="ledger-fee-calc">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-gold-400" />
        <h3 className="text-white font-bold">{t('ledger.fee_quote')}</h3>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div>
          <label className="block text-ink-400 text-xs mb-1">{t('ledger.mode')}</label>
          <select
            data-testid="ledger-mode-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full bg-ink-700 border border-ink-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="direct">direct (2-party)</option>
            <option value="three_party">three_party (hawker)</option>
          </select>
        </div>
        <div>
          <label className="block text-ink-400 text-xs mb-1">{t('ledger.deal')} (TZS)</label>
          <input
            data-testid="ledger-deal-input"
            type="number"
            value={deal}
            onChange={(e) => setDeal(e.target.value)}
            className="w-full bg-ink-700 border border-ink-600 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        {mode === 'three_party' && (
          <div>
            <label className="block text-ink-400 text-xs mb-1">{t('ledger.supplier_cost')} (TZS)</label>
            <input
              data-testid="ledger-supplier-input"
              type="number"
              value={supplierCost}
              onChange={(e) => setSupplierCost(e.target.value)}
              className="w-full bg-ink-700 border border-ink-600 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
        )}
      </div>
      {quote && (
        <div data-testid="ledger-quote-result" className="grid sm:grid-cols-4 gap-3">
          <div className="bg-ink-900 rounded-lg p-3">
            <p className="text-ink-500 text-[10px] uppercase tracking-wider">{t('ledger.buyer_pays')}</p>
            <p className="text-gold-400 font-bold text-lg">{fmt(quote.gross_amount)}</p>
          </div>
          <div className="bg-ink-900 rounded-lg p-3">
            <p className="text-ink-500 text-[10px] uppercase tracking-wider">{t('ledger.seller_gets')}</p>
            <p className="text-emerald-400 font-bold text-lg">{fmt(quote.seller_amount)}</p>
          </div>
          <div className="bg-ink-900 rounded-lg p-3">
            <p className="text-ink-500 text-[10px] uppercase tracking-wider">{t('ledger.hawker_gets')}</p>
            <p className="text-cyan-400 font-bold text-lg">{fmt(quote.agent_commission)}</p>
          </div>
          <div className="bg-ink-900 rounded-lg p-3">
            <p className="text-ink-500 text-[10px] uppercase tracking-wider">{t('ledger.platform_fee')}</p>
            <p className="text-rose-400 font-bold text-lg">{fmt(quote.platform_fee)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const PayoutsTable: React.FC = () => {
  const { t } = useT();
  const [rows, setRows] = useState<Payout[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    try {
      const r = await api.get<{ payouts: Payout[] }>('/payouts');
      setRows(r.data.payouts || []);
    } catch (e: any) {
      if (e?.response?.status !== 401) toast.error('Could not load payouts');
    }
  };

  useEffect(() => { reload(); }, []);

  const disburse = async (id: string) => {
    setBusy(id);
    try {
      const r = await api.post<{ provider_ref: string }>(`/payouts/${id}/disburse`);
      toast.success(`Disbursed · ref ${r.data.provider_ref}`);
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Disbursement failed');
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0) {
    return <div className="glass rounded-2xl p-10 text-center text-ink-400" data-testid="payouts-empty">{t('ledger.no_payouts')}</div>;
  }

  return (
    <div className="glass rounded-2xl overflow-hidden" data-testid="payouts-table">
      <table className="w-full text-sm">
        <thead className="bg-ink-900 text-ink-400 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left">Order</th>
            <th className="px-4 py-3 text-left">{t('ledger.payout.role')}</th>
            <th className="px-4 py-3 text-left">{t('ledger.payout.dest')}</th>
            <th className="px-4 py-3 text-right">{t('ledger.payout.amount')}</th>
            <th className="px-4 py-3 text-center">{t('ledger.payout.status')}</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700">
          {rows.map((p) => (
            <tr key={p.payout_id} data-testid={`payout-row-${p.payout_id}`}>
              <td className="px-4 py-3 text-ink-300 font-mono text-xs">{p.order_id.slice(0, 14)}…</td>
              <td className="px-4 py-3 text-white capitalize">{p.beneficiary_role}</td>
              <td className="px-4 py-3 text-ink-400">{p.destination || '—'}</td>
              <td className="px-4 py-3 text-right text-emerald-400 font-bold">{fmt(p.amount)}</td>
              <td className="px-4 py-3 text-center"><StatusPill status={p.status} /></td>
              <td className="px-4 py-3 text-right">
                {p.status === 'queued' ? (
                  <button
                    type="button"
                    data-testid={`disburse-${p.payout_id}`}
                    onClick={() => disburse(p.payout_id)}
                    disabled={busy === p.payout_id}
                    className="px-3 py-1.5 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 text-xs font-bold hover:from-gold-400 disabled:opacity-50"
                  >
                    {busy === p.payout_id ? t('ledger.payout.disbursing') : t('ledger.payout.disburse')}
                  </button>
                ) : (
                  <span className="text-ink-500 text-xs">{p.provider_ref || '—'}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DisputesTable: React.FC = () => {
  const { t } = useT();
  const [rows, setRows] = useState<Dispute[]>([]);

  const reload = async () => {
    try {
      const r = await api.get<{ disputes: Dispute[] }>('/disputes');
      setRows(r.data.disputes || []);
    } catch (e: any) {
      if (e?.response?.status !== 401) toast.error('Could not load disputes');
    }
  };

  useEffect(() => { reload(); }, []);

  const resolve = async (id: string, resolution: string) => {
    try {
      await api.post(`/disputes/${id}/resolve`, { resolution });
      toast.success('Resolved');
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Resolve failed');
    }
  };

  if (rows.length === 0) {
    return <div className="glass rounded-2xl p-10 text-center text-ink-400" data-testid="disputes-empty">{t('ledger.no_disputes')}</div>;
  }

  return (
    <div className="space-y-3" data-testid="disputes-list">
      {rows.map((d) => (
        <div
          key={d.dispute_id}
          data-testid={`dispute-row-${d.dispute_id}`}
          className="glass rounded-xl p-4 grid md:grid-cols-[1fr_auto] gap-4 items-start"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-white font-semibold font-mono text-sm">{d.order_id}</span>
              <StatusPill status={d.status} />
            </div>
            <p className="text-ink-300 text-sm">
              <span className="text-ink-500">{t('ledger.dispute.reason')}:</span> {d.reason}
            </p>
            {d.status === 'open' && d.auto_resolve_at && (
              <p className="text-ink-500 text-xs mt-1">
                {t('ledger.dispute.auto_resolves')}: {new Date(d.auto_resolve_at).toLocaleString()}
              </p>
            )}
            {d.resolution && (
              <p className="text-ink-400 text-xs mt-1">
                {t('ledger.dispute.resolution')}: <strong>{d.resolution}</strong>
              </p>
            )}
          </div>
          {d.status === 'open' && (
            <div className="flex md:flex-col gap-2 md:items-end">
              <button
                type="button"
                data-testid={`resolve-seller-${d.dispute_id}`}
                onClick={() => resolve(d.dispute_id, 'release_to_seller')}
                className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30"
              >
                {t('ledger.dispute.resolve_seller')}
              </button>
              <button
                type="button"
                data-testid={`resolve-buyer-${d.dispute_id}`}
                onClick={() => resolve(d.dispute_id, 'refund_to_buyer')}
                className="px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold hover:bg-rose-500/30"
              >
                {t('ledger.dispute.resolve_buyer')}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const AccountsTable: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => {
    api.get<{ accounts: Account[] }>('/ledger/accounts').then((r) => setAccounts(r.data.accounts || []));
  }, []);
  return (
    <div className="glass rounded-2xl overflow-hidden" data-testid="accounts-table">
      <table className="w-full text-sm">
        <thead className="bg-ink-900 text-ink-400 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left">Code</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700">
          {accounts.map((a) => (
            <tr key={a.code}>
              <td className="px-4 py-3 text-gold-300 font-mono">{a.code}</td>
              <td className="px-4 py-3 text-white">{a.name}</td>
              <td className="px-4 py-3 text-ink-300 capitalize">{a.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const LedgerAdminPage: React.FC = () => {
  const { t } = useT();
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<'payouts' | 'disputes' | 'accounts'>('payouts');

  const tabs = useMemo(() => ([
    { id: 'payouts',  label: t('ledger.tab.payouts'),  icon: Wallet },
    { id: 'disputes', label: t('ledger.tab.disputes'), icon: Scale },
    { id: 'accounts', label: t('ledger.tab.accounts'), icon: BookOpen },
  ]), [t]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 flex items-center justify-center">
        <p className="text-ink-300">{t('watch.login_required')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 pt-20" data-testid="ledger-admin-page">
      <SEO title="Financial Ledger" description="Biz-Salama financial ledger admin" url="/admin/ledger" noindex />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-6 h-6 text-gold-400" />
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">{t('ledger.title')}</h1>
        </div>
        <p className="text-ink-400 text-sm mb-6">{t('ledger.subtitle')}</p>

        <FeeCalculator />

        <div className="mt-6 flex items-center gap-2 border-b border-ink-700">
          {tabs.map((tt) => (
            <button
              key={tt.id}
              type="button"
              data-testid={`ledger-tab-${tt.id}`}
              onClick={() => setTab(tt.id as any)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                tab === tt.id
                  ? 'border-gold-500 text-gold-400'
                  : 'border-transparent text-ink-400 hover:text-ink-200'
              }`}
            >
              <tt.icon className="w-4 h-4" />
              {tt.label}
            </button>
          ))}
        </div>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          {tab === 'payouts' && <PayoutsTable />}
          {tab === 'disputes' && <DisputesTable />}
          {tab === 'accounts' && <AccountsTable />}
        </motion.div>
      </div>
    </div>
  );
};

export default LedgerAdminPage;
