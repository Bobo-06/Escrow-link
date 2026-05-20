import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, RefreshCcw, Trash2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import SEO from '../components/SEO';
import { useAuthStore } from '../store/authStore';

/**
 * /admin/client-errors — operator view of the browser-side error / debug log
 * stream. Pairs with `clientErrorReporter.ts` on the client + `client_errors.py`
 * on the server. A self-hosted Sentry-lite; deliberately keep this page small.
 */

interface ClientErrorEvent {
  event_id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  stack?: string;
  url?: string;
  user_agent?: string;
  user_id?: string | null;
  app_version?: string | null;
  viewport?: string;
  online?: boolean;
  meta?: Record<string, string>;
  created_at?: string;
}

interface Stats {
  total: number;
  last_24h: number;
  last_7d: number;
  by_level_7d: Record<string, number>;
  retention_days: number;
}

const LEVEL_BADGE: Record<string, string> = {
  debug: 'bg-ink-700 text-ink-200 border-ink-600',
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  warn: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  error: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

const StatCard: React.FC<{ label: string; value: string | number; sub?: string }> = ({ label, value, sub }) => (
  <div className="bg-ink-800 border border-ink-700 rounded-2xl p-5">
    <div className="text-xs text-ink-400 uppercase tracking-wider">{label}</div>
    <div className="mt-1 text-3xl font-bold text-white">{value}</div>
    {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
  </div>
);

const ClientErrorsAdminPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [events, setEvents] = useState<ClientErrorEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [level, setLevel] = useState<string>('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(100);
  const [expanded, setExpanded] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps  -- intentional: deps are stable refs or one-shot inits
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit };
      if (level) params.level = level;
      if (q.trim()) params.q = q.trim();
      const [evRes, stRes] = await Promise.all([
        api.get('/admin/client-errors', { params }),
        api.get('/admin/client-errors/stats'),
      ]);
      setEvents(evRes.data.events || []);
      setStats(stRes.data || null);
      setForbidden(false);
    } catch (err: unknown) {
      // Treat 401/403 as the "not admin" branch — the server is the single
      // source of truth on role, so we don't duplicate the check client-side.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        setForbidden(true);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to load events';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps  -- intentional: deps are stable refs or one-shot inits
  }, [level, q, limit]);

  // eslint-disable-next-line react-hooks/exhaustive-deps  -- intentional: deps are stable refs or one-shot inits
  useEffect(() => {
    void fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps  -- intentional: deps are stable refs or one-shot inits
  }, [fetchAll]);

  const purgeAll = async () => {
    if (!window.confirm('Delete ALL captured client-error events? This cannot be undone.')) return;
    try {
      const res = await api.delete('/admin/client-errors');
      toast.success(`Purged ${res.data.deleted} event(s).`);
      void fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Purge failed';
      toast.error(msg);
    }
  };

  const purgeOld = async () => {
    if (!window.confirm('Delete events older than 7 days?')) return;
    try {
      const res = await api.delete('/admin/client-errors', { params: { older_than_days: 7 } });
      toast.success(`Purged ${res.data.deleted} old event(s).`);
      void fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Purge failed';
      toast.error(msg);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps  -- intentional: deps are stable refs or one-shot inits
  const levelCounts = useMemo(() => stats?.by_level_7d || {}, [stats]);

  if (!isAuthenticated || forbidden) {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6">
        <SEO title="Admin Only" url="/admin/client-errors" noindex />
        <div className="max-w-xl mx-auto bg-ink-800 border border-ink-700 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">Admin access required</h2>
          <p className="mt-2 text-ink-400 text-sm">
            Please sign in with an admin account to view captured browser events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 pt-24 pb-16 px-4 sm:px-6">
      <SEO title="Client Errors — Admin" url="/admin/client-errors" noindex />
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6"
        >
          <div>
            <div className="flex items-center gap-2 text-amber-400">
              <Activity className="w-5 h-5" />
              <span className="text-xs uppercase tracking-[0.2em]">Observability</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mt-1">Client errors</h1>
            <p className="text-ink-400 text-sm mt-1 max-w-xl">
              Browser-side errors and intentional debug logs reported by users in the wild.
              Events auto-expire after {stats?.retention_days ?? 30} days.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="client-errors-refresh-btn"
              onClick={() => void fetchAll()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm hover:bg-ink-700 disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              data-testid="client-errors-purge-old-btn"
              onClick={purgeOld}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-sm hover:bg-amber-500/20"
            >
              <Trash2 className="w-4 h-4" />
              Purge &gt;7d
            </button>
            <button
              data-testid="client-errors-purge-all-btn"
              onClick={purgeAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-sm hover:bg-rose-500/20"
            >
              <Trash2 className="w-4 h-4" />
              Purge all
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard label="Last 24h" value={stats?.last_24h ?? '—'} />
          <StatCard label="Last 7 days" value={stats?.last_7d ?? '—'} />
          <StatCard label="All time" value={stats?.total ?? '—'} sub={`auto-deletes >${stats?.retention_days ?? 30}d`} />
          <StatCard
            label="By level (7d)"
            value={`${levelCounts.error || 0}E / ${levelCounts.warn || 0}W`}
            sub={`${levelCounts.info || 0}I · ${levelCounts.debug || 0}D`}
          />
        </div>

        <div className="bg-ink-800 border border-ink-700 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 text-ink-300 text-xs mb-3">
            <Filter className="w-4 h-4" />
            Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              data-testid="client-errors-level-filter"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">All levels</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <input
              data-testid="client-errors-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search message / URL…"
              className="bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-white text-sm sm:col-span-2"
            />
            <select
              data-testid="client-errors-limit-select"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={250}>250 rows</option>
              <option value={500}>500 rows</option>
            </select>
          </div>
        </div>

        <div className="bg-ink-800 border border-ink-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="client-errors-table">
              <thead className="bg-ink-900/70 text-ink-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">When</th>
                  <th className="text-left px-4 py-3 font-medium">Lvl</th>
                  <th className="text-left px-4 py-3 font-medium">Message</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">URL</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {events.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center text-ink-500 py-10">
                      No events yet. Reports will appear here as users hit failures.
                    </td>
                  </tr>
                )}
                {events.map((ev) => {
                  const ts = ev.created_at ? new Date(ev.created_at) : null;
                  const open = expanded === ev.event_id;
                  return (
                    <React.Fragment key={ev.event_id}>
                      <tr
                        className="hover:bg-ink-900/40 cursor-pointer"
                        onClick={() => setExpanded(open ? null : ev.event_id)}
                        data-testid={`client-error-row-${ev.event_id}`}
                      >
                        <td className="px-4 py-3 text-ink-300 whitespace-nowrap">
                          {ts ? ts.toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${LEVEL_BADGE[ev.level] || LEVEL_BADGE.info}`}>
                            {ev.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white max-w-[28rem] truncate">{ev.message}</td>
                        <td className="px-4 py-3 text-ink-400 max-w-[16rem] truncate hidden md:table-cell">
                          {ev.url || '—'}
                        </td>
                        <td className="px-4 py-3 text-ink-400 hidden lg:table-cell">
                          {ev.user_id ? ev.user_id.slice(0, 10) : '—'}
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-ink-900/30">
                          <td colSpan={5} className="px-4 py-4 text-xs text-ink-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-ink-500 mb-1">URL</div>
                                <div className="text-ink-200 break-all">{ev.url || '—'}</div>
                                <div className="text-ink-500 mt-3 mb-1">User agent</div>
                                <div className="text-ink-200 break-all">{ev.user_agent || '—'}</div>
                                <div className="text-ink-500 mt-3 mb-1">Viewport / online</div>
                                <div className="text-ink-200">
                                  {ev.viewport || '—'} · {ev.online ? 'online' : 'offline'}
                                </div>
                                <div className="text-ink-500 mt-3 mb-1">App version</div>
                                <div className="text-ink-200">{ev.app_version || 'dev'}</div>
                              </div>
                              <div>
                                <div className="text-ink-500 mb-1">Stack</div>
                                <pre className="text-ink-200 bg-ink-900 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-48">
                                  {ev.stack || '— no stack —'}
                                </pre>
                                <div className="text-ink-500 mt-3 mb-1">Meta</div>
                                <pre className="text-ink-200 bg-ink-900 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-32">
                                  {JSON.stringify(ev.meta || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientErrorsAdminPage;
