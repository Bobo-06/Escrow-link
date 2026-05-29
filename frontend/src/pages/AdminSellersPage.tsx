import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Loader2, ShieldCheck, UserCheck, RefreshCw, EyeOff, Eye, Upload, X, FileSpreadsheet, FileText, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import SEO from '../components/SEO';
import { processImageForUpload, type ProcessedImage } from '../lib/imageUpload';

interface Seller {
  user_id: string;
  name: string;
  phone: string;
  email?: string | null;
  business_name?: string | null;
  location?: string | null;
  bio?: string | null;
  picture?: string | null;
  is_verified?: boolean;
  is_active?: boolean;
  auth_type?: string;
  kyc_status?: string;
  created_at?: string;
  products_count?: number;
}

/**
 * /admin/sellers — Admin-only directory of every seller account.
 *
 * Created by either:
 *   • the admin-direct flow at /admin/sellers/new (this module);
 *   • the field-rep onboarding flow → /admin/onboarding/queue → approve.
 * Both surface here so the back office has one screen to find / pause /
 * resend-password-link any seller.
 */
export default function AdminSellersPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { lang } = useT();

  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [importerOpen, setImporterOpen] = useState(false);
  const [docsModalFor, setDocsModalFor] = useState<Seller | null>(null);
  const [editFor, setEditFor] = useState<Seller | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/sellers', { params: search ? { search } : {} });
      setSellers(res.data?.sellers || []);
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } };
      if (e?.response?.status === 403) {
        toast.error(lang === 'sw' ? 'Hii ni ukurasa wa admin tu' : 'Admin only');
      } else {
        toast.error(e?.response?.data?.detail || 'Failed to load');
      }
      setSellers([]);
    }
  }, [search, lang]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    void load();
  }, [isAuthenticated, user?.role, load]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6">
        <SEO title="Admin only" url="/admin/sellers" noindex />
        <div className="max-w-md mx-auto bg-ink-800 border border-ink-700 rounded-2xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">
            {lang === 'sw' ? 'Ingia kama admin' : 'Sign in as admin'}
          </h2>
        </div>
      </div>
    );
  }

  const toggleActive = async (s: Seller) => {
    setBusy(s.user_id);
    try {
      await api.patch(`/admin/sellers/${s.user_id}`, { is_active: !s.is_active });
      toast.success(!s.is_active ? (lang === 'sw' ? 'Imewashwa' : 'Activated') : (lang === 'sw' ? 'Imezimwa' : 'Deactivated'));
      await load();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  const resendLink = async (s: Seller) => {
    setBusy(s.user_id);
    try {
      const res = await api.post(`/admin/sellers/${s.user_id}/resend-password-link`);
      const link = res.data?.set_password_link as string | undefined;
      if (link) {
        await navigator.clipboard.writeText(link).catch(() => {});
        toast.success(lang === 'sw' ? 'SMS imetumwa. Kiungo kimenakiliwa.' : 'SMS sent. Link copied to clipboard.');
      } else {
        toast.success(lang === 'sw' ? 'SMS imetumwa' : 'SMS sent');
      }
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Resend failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-16 px-4 sm:px-6">
      <SEO title="Sellers" url="/admin/sellers" noindex />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold">Admin · Sellers</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              {lang === 'sw' ? 'Wauzaji' : 'Sellers'}
            </h1>
            <p className="text-ink-400 text-sm mt-1">
              {lang === 'sw' ? 'Sajili na hudumia wauzaji.' : 'Register and manage seller accounts.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setImporterOpen(true)}
              data-testid="admin-bulk-import-btn"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-ink-700 text-white font-semibold hover:bg-ink-600 transition border border-gold-500/30"
            >
              <Upload className="w-4 h-4 text-gold-400" /> {lang === 'sw' ? 'Pakia CSV' : 'Import CSV'}
            </button>
            <Link
              to="/admin/sellers/new"
              data-testid="admin-add-seller-btn"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gold-500 text-ink-900 font-bold hover:bg-gold-400 transition"
            >
              <Plus className="w-4 h-4" /> {lang === 'sw' ? 'Sajili muuzaji' : 'Register seller'}
            </Link>
          </div>
        </div>

        <div className="bg-ink-800 border border-ink-700 rounded-2xl p-4 mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'sw' ? 'Tafuta kwa jina, biashara au simu…' : 'Search by name, business or phone…'}
              data-testid="admin-sellers-search"
              className="w-full bg-ink-900 border border-ink-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-gold-500/60"
            />
          </div>
        </div>

        {sellers === null && (
          <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gold-400 mx-auto" /></div>
        )}

        {sellers && sellers.length === 0 && (
          <div data-testid="admin-sellers-empty" className="bg-ink-800 border border-ink-700 rounded-2xl p-10 text-center">
            <UserCheck className="w-10 h-10 text-ink-500 mx-auto mb-3" />
            <p className="text-ink-300">
              {search
                ? (lang === 'sw' ? 'Hakuna muuzaji aliyepatikana.' : 'No sellers match that search.')
                : (lang === 'sw' ? 'Bado hujasajili muuzaji yeyote.' : "You haven't registered any sellers yet.")}
            </p>
            <Link to="/admin/sellers/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 text-ink-900 font-bold">
              <Plus className="w-4 h-4" /> {lang === 'sw' ? 'Sajili wa kwanza' : 'Register the first one'}
            </Link>
          </div>
        )}

        {sellers && sellers.length > 0 && (
          <div data-testid="admin-sellers-list" className="space-y-3">
            {sellers.map((s) => (
              <motion.div
                key={s.user_id}
                layout
                data-testid={`seller-row-${s.user_id}`}
                className={`flex items-start gap-4 bg-ink-800 border ${s.is_active === false ? 'border-rose-500/20 opacity-70' : 'border-ink-700'} rounded-2xl p-4`}
              >
                <div className="w-12 h-12 rounded-full bg-ink-900 border border-ink-700 overflow-hidden flex items-center justify-center shrink-0">
                  {s.picture ? (
                    <img src={s.picture} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg text-ink-500">{(s.name || 'S').slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-bold truncate">{s.business_name || s.name}</h3>
                    {s.is_verified && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">VERIFIED</span>}
                    {s.is_active === false && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">DEACTIVATED</span>}
                    {s.auth_type === 'password_pending' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">PWD PENDING</span>}
                  </div>
                  <p className="text-ink-400 text-xs mt-0.5 truncate">
                    {s.name} · {s.phone} {s.location ? `· ${s.location}` : ''}
                  </p>
                  <p className="text-ink-500 text-xs mt-0.5">
                    {(s.products_count || 0)} {lang === 'sw' ? 'bidhaa' : 'product(s)'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    to={`/seller/${s.user_id}`}
                    data-testid={`seller-view-${s.user_id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-ink-700 text-ink-200 hover:bg-ink-600"
                  >
                    {lang === 'sw' ? 'Tazama' : 'View'}
                  </Link>
                  <button
                    onClick={() => setEditFor(s)}
                    data-testid={`seller-edit-${s.user_id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gold-500/15 text-gold-300 hover:bg-gold-500/25 inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> {lang === 'sw' ? 'Hariri' : 'Edit'}
                  </button>
                  <button
                    onClick={() => setDocsModalFor(s)}
                    data-testid={`seller-docs-${s.user_id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 inline-flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> {lang === 'sw' ? 'Hati' : 'Docs'}
                  </button>
                  {s.auth_type === 'password_pending' && (
                    <button
                      onClick={() => resendLink(s)}
                      disabled={busy === s.user_id}
                      data-testid={`seller-resend-link-${s.user_id}`}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" /> {lang === 'sw' ? 'Tuma kiungo' : 'Resend link'}
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(s)}
                    disabled={busy === s.user_id}
                    data-testid={`seller-toggle-${s.user_id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-ink-700 text-ink-200 hover:bg-ink-600 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {s.is_active === false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {s.is_active === false ? (lang === 'sw' ? 'Wezesha' : 'Activate') : (lang === 'sw' ? 'Zima' : 'Deactivate')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      {importerOpen && (
        <BulkImportModal
          lang={lang}
          onClose={() => setImporterOpen(false)}
          onDone={() => { setImporterOpen(false); void load(); }}
        />
      )}
      {docsModalFor && (
        <SellerDocsModal
          seller={docsModalFor}
          lang={lang}
          onClose={() => setDocsModalFor(null)}
          onChanged={() => { void load(); }}
        />
      )}
      {editFor && (
        <EditSellerModal
          seller={editFor}
          lang={lang}
          onClose={() => setEditFor(null)}
          onSaved={() => { setEditFor(null); void load(); }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Bulk CSV import modal
// ──────────────────────────────────────────────────────────────────────────
const SAMPLE_CSV = `name,phone,business_name,location,bio
Mama Asha,0712111222,Asha Mavazi,Kariakoo,
John Mwambapa,+255713555666,Mwambapa Electronics,Mwanza,Vifaa vya umeme
Neema Boutique,0754999888,Neema Boutique,Arusha,Mavazi ya kisasa`;

interface BulkImportResult {
  created: { user_id: string; name: string; phone: string; set_password_link?: string | null }[];
  errors: { row?: string | number; phone?: string; error: string }[];
  summary: { created: number; failed: number; total_rows?: number };
}

function BulkImportModal({
  lang, onClose, onDone,
}: { lang: 'sw' | 'en'; onClose: () => void; onDone: () => void }) {
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 256 * 1024) {
      toast.error(lang === 'sw' ? 'Faili ni kubwa sana (zaidi ya 256 KB)' : 'File too large (>256 KB)');
      return;
    }
    const text = await file.text();
    setCsvText(text);
  };

  const submit = async () => {
    if (!csvText.trim()) {
      toast.error(lang === 'sw' ? 'Weka CSV kwanza' : 'Paste or upload a CSV first');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/admin/sellers/bulk-csv', { csv_text: csvText });
      setResult(res.data as BulkImportResult);
      toast.success(
        lang === 'sw'
          ? `Wamesajiliwa ${res.data.summary.created} / ${res.data.summary.total_rows ?? '?'}`
          : `Created ${res.data.summary.created} / ${res.data.summary.total_rows ?? '?'} sellers`,
      );
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="bulk-import-modal"
      className="fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-ink-800 border border-ink-700 rounded-2xl w-full max-w-2xl my-8"
      >
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-gold-400" />
            <h2 className="text-white font-bold">
              {lang === 'sw' ? 'Pakia wauzaji kupitia CSV' : 'Bulk-import sellers via CSV'}
            </h2>
          </div>
          <button onClick={onClose} data-testid="bulk-import-close" className="p-1 rounded hover:bg-ink-700">
            <X className="w-5 h-5 text-ink-400" />
          </button>
        </div>

        {!result ? (
          <div className="p-5 space-y-4">
            <p className="text-ink-300 text-sm">
              {lang === 'sw'
                ? 'Safu zinazohitajika: '
                : 'Required columns: '}
              <code className="text-gold-300">name, phone</code>.{' '}
              {lang === 'sw' ? 'Hiari: ' : 'Optional: '}
              <code className="text-ink-400">email, business_name, location, bio</code>.{' '}
              {lang === 'sw'
                ? 'Kila muuzaji atapata SMS yenye kiungo cha kuweka nenosiri.'
                : 'Each seller gets an SMS with a set-password link.'}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                data-testid="bulk-import-file-btn"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gold-500/15 text-gold-300 hover:bg-gold-500/25 text-sm font-semibold"
              >
                <Upload className="w-4 h-4" /> {lang === 'sw' ? 'Pakia .csv' : 'Upload .csv'}
              </button>
              <button
                onClick={() => setCsvText(SAMPLE_CSV)}
                data-testid="bulk-import-sample-btn"
                className="text-xs text-ink-400 hover:text-gold-400 underline"
              >
                {lang === 'sw' ? 'Tumia mfano' : 'Use sample'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                data-testid="bulk-import-file-input"
                onChange={(e) => { void onFile(e.target.files?.[0]); e.currentTarget.value = ''; }}
              />
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={10}
              placeholder={`name,phone,business_name,location,bio\nMama Asha,0712111222,Asha Mavazi,Kariakoo,`}
              data-testid="bulk-import-textarea"
              className="w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-white text-xs font-mono outline-none focus:border-gold-500/60 resize-y"
            />

            <button
              onClick={submit}
              disabled={submitting || !csvText.trim()}
              data-testid="bulk-import-submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold-500 text-ink-900 font-bold hover:bg-gold-400 transition disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {lang === 'sw' ? 'Inapakia…' : 'Importing…'}</>
                : <><Upload className="w-4 h-4" /> {lang === 'sw' ? 'Pakia wauzaji' : 'Import sellers'}</>}
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4" data-testid="bulk-import-result">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                <p className="text-emerald-300 text-2xl font-bold" data-testid="bulk-import-created-count">{result.summary.created}</p>
                <p className="text-emerald-400 text-xs uppercase mt-1">{lang === 'sw' ? 'Imefanikiwa' : 'Created'}</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                <p className="text-rose-300 text-2xl font-bold" data-testid="bulk-import-failed-count">{result.summary.failed}</p>
                <p className="text-rose-400 text-xs uppercase mt-1">{lang === 'sw' ? 'Imeshindwa' : 'Failed'}</p>
              </div>
              <div className="bg-ink-900 border border-ink-700 rounded-xl p-3">
                <p className="text-white text-2xl font-bold">{result.summary.total_rows ?? (result.created.length + result.errors.length)}</p>
                <p className="text-ink-400 text-xs uppercase mt-1">{lang === 'sw' ? 'Jumla' : 'Total'}</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-ink-900 border border-rose-500/20 rounded-xl p-3 max-h-40 overflow-y-auto">
                <p className="text-rose-300 text-xs font-bold uppercase mb-2">{lang === 'sw' ? 'Makosa' : 'Errors'}</p>
                <ul className="space-y-1 text-xs">
                  {result.errors.map((e, i) => (
                    <li key={`${e.row || i}-${e.phone || ''}`} className="text-ink-300">
                      <span className="text-ink-500">{lang === 'sw' ? 'Mstari' : 'Row'} {e.row ?? '?'}:</span>{' '}
                      {e.phone && <span className="text-ink-400">{e.phone} · </span>}
                      <span className="text-rose-300">{e.error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.created.length > 0 && (
              <div className="bg-ink-900 border border-emerald-500/20 rounded-xl p-3 max-h-40 overflow-y-auto">
                <p className="text-emerald-300 text-xs font-bold uppercase mb-2">{lang === 'sw' ? 'Wamesajiliwa' : 'Newly created'}</p>
                <ul className="space-y-1 text-xs">
                  {result.created.map((c) => (
                    <li key={c.user_id} className="text-ink-200 truncate">
                      {c.name} · <span className="text-ink-500">{c.phone}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setResult(null); setCsvText(''); }}
                data-testid="bulk-import-again-btn"
                className="flex-1 px-4 py-2.5 rounded-xl bg-ink-700 text-white text-sm font-semibold hover:bg-ink-600"
              >
                {lang === 'sw' ? 'Pakia tena' : 'Import another'}
              </button>
              <button
                onClick={onDone}
                data-testid="bulk-import-done-btn"
                className="flex-1 px-4 py-2.5 rounded-xl bg-gold-500 text-ink-900 text-sm font-bold hover:bg-gold-400"
              >
                {lang === 'sw' ? 'Maliza' : 'Done'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────────
// SellerDocsModal — admin attaches / reviews KYC docs for an existing seller
// ──────────────────────────────────────────────────────────────────────────

interface DocStatus { captured: boolean; uploaded_at?: string; size_bytes?: number; review_status?: string; rejection_reason?: string | null }
interface DocLabel { en: string; sw: string }
interface DocsData {
  kyc_status: string;
  is_verified: boolean;
  documents: Record<string, DocStatus>;
  required: string[];
  labels: Record<string, DocLabel>;
}

function SellerDocsModal({
  seller, lang, onClose, onChanged,
}: { seller: Seller; lang: 'sw' | 'en'; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<DocsData | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/sellers/${seller.user_id}/documents`);
      setData(res.data as DocsData);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Failed to load');
    }
  }, [seller.user_id]);

  useEffect(() => { void load(); }, [load]);

  const upload = async (docKey: string, file?: File) => {
    if (!file) return;
    setBusyKey(docKey);
    try {
      const img: ProcessedImage = await processImageForUpload(file, { maxEdge: 1600, maxKB: 1500 });
      await api.post(`/admin/sellers/${seller.user_id}/documents`, { doc_type: docKey, image_b64: img.base64 });
      toast.success(lang === 'sw' ? 'Imepakiwa' : 'Uploaded');
      await load();
      onChanged();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Upload failed');
    } finally {
      setBusyKey(null);
    }
  };

  const review = async (approve: boolean) => {
    setReviewing(true);
    try {
      await api.post(`/admin/sellers/${seller.user_id}/kyc/review`, { approve });
      toast.success(approve ? (lang === 'sw' ? 'Imethibitishwa' : 'Approved') : (lang === 'sw' ? 'Imekataliwa' : 'Rejected'));
      await load();
      onChanged();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Review failed');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div
      data-testid="seller-docs-modal"
      className="fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="bg-ink-800 border border-ink-700 rounded-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <div>
            <h2 className="text-white font-bold">{lang === 'sw' ? 'Hati za' : 'Documents for'} {seller.business_name || seller.name}</h2>
            <p className="text-ink-400 text-xs mt-0.5">{seller.phone}</p>
          </div>
          <button onClick={onClose} data-testid="seller-docs-close" className="p-1 rounded hover:bg-ink-700">
            <X className="w-5 h-5 text-ink-400" />
          </button>
        </div>
        {!data ? (
          <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-gold-400 mx-auto" /></div>
        ) : (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm" data-testid="seller-docs-kyc-status">
              <span className="text-ink-400">KYC:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${data.kyc_status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' : data.kyc_status === 'rejected' ? 'bg-rose-500/15 text-rose-300' : data.kyc_status === 'pending_review' ? 'bg-amber-500/15 text-amber-300' : 'bg-ink-700 text-ink-300'}`}>
                {data.kyc_status}
              </span>
              {data.is_verified && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">VERIFIED</span>}
            </div>

            {data.required.map((docKey) => {
              const doc = data.documents[docKey];
              const label = data.labels[docKey];
              const captured = !!doc?.captured;
              const busy = busyKey === docKey;
              return (
                <div key={docKey} data-testid={`admin-doc-card-${docKey}`} className={`flex items-center gap-3 p-3 rounded-xl border ${captured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-ink-700 bg-ink-900'}`}>
                  <FileText className={`w-5 h-5 shrink-0 ${captured ? 'text-emerald-400' : 'text-ink-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{lang === 'sw' ? label?.sw : label?.en}</p>
                    <p className="text-ink-500 text-xs">
                      {captured ? (
                        <>
                          {(((doc?.size_bytes || 0) / 1024) | 0)} KB
                          {doc?.uploaded_at ? ` · ${new Date(doc.uploaded_at).toLocaleDateString()}` : ''}
                        </>
                      ) : (lang === 'sw' ? 'Hakuna' : 'Not uploaded')}
                    </p>
                  </div>
                  <button
                    onClick={() => fileRefs.current[docKey]?.click()}
                    disabled={busy}
                    data-testid={`admin-doc-upload-${docKey}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gold-500/15 text-gold-300 hover:bg-gold-500/25 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {captured ? (lang === 'sw' ? 'Badili' : 'Replace') : (lang === 'sw' ? 'Pakia' : 'Upload')}
                  </button>
                  <input
                    ref={(el) => { fileRefs.current[docKey] = el; }}
                    type="file" accept="image/*,.heic,.heif" className="hidden"
                    onChange={(e) => { void upload(docKey, e.target.files?.[0]); e.currentTarget.value = ''; }}
                    data-testid={`admin-doc-input-${docKey}`}
                  />
                </div>
              );
            })}

            <div className="flex gap-2 pt-3 border-t border-ink-700">
              <button
                onClick={() => review(true)}
                disabled={reviewing || data.kyc_status === 'approved'}
                data-testid="seller-docs-approve-btn"
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 disabled:opacity-50"
              >
                {reviewing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (lang === 'sw' ? 'Thibitisha' : 'Approve KYC')}
              </button>
              <button
                onClick={() => review(false)}
                disabled={reviewing || data.kyc_status === 'rejected'}
                data-testid="seller-docs-reject-btn"
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500/15 text-rose-300 text-sm font-bold hover:bg-rose-500/25 disabled:opacity-50"
              >
                {lang === 'sw' ? 'Kataa' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// EditSellerModal — admin edits a seller's profile + avatar + active/verified state
// ──────────────────────────────────────────────────────────────────────────
function EditSellerModal({
  seller, lang, onClose, onSaved,
}: { seller: Seller; lang: 'sw' | 'en'; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: seller.name || '',
    business_name: seller.business_name || '',
    location: seller.location || '',
    bio: seller.bio || '',
    is_active: seller.is_active !== false,
    is_verified: !!seller.is_verified,
  });
  const [avatar, setAvatar] = useState<ProcessedImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const handleAvatar = async (file?: File) => {
    if (!file) return;
    try {
      const r = await processImageForUpload(file, { maxEdge: 800, maxKB: 500 });
      setAvatar(r);
      toast.success(lang === 'sw' ? 'Picha tayari' : 'Photo ready');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image failed');
    }
  };

  const submit = async () => {
    if (!form.name.trim()) {
      return toast.error(lang === 'sw' ? 'Jina linahitajika' : 'Name required');
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        business_name: form.business_name.trim() || null,
        location: form.location.trim() || null,
        bio: form.bio.trim() || null,
        is_active: form.is_active,
        is_verified: form.is_verified,
      };
      if (avatar?.dataUrl) payload.picture = avatar.dataUrl;
      await api.patch(`/admin/sellers/${seller.user_id}`, payload);
      toast.success(lang === 'sw' ? 'Imehifadhiwa' : 'Saved');
      onSaved();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const previewSrc = avatar?.dataUrl || seller.picture || '';

  return (
    <div
      data-testid="edit-seller-modal"
      className="fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="bg-ink-800 border border-ink-700 rounded-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <div>
            <h2 className="text-white font-bold">{lang === 'sw' ? 'Hariri muuzaji' : 'Edit seller'}</h2>
            <p className="text-ink-400 text-xs mt-0.5">{seller.phone}</p>
          </div>
          <button onClick={onClose} data-testid="edit-seller-close" className="p-1 rounded hover:bg-ink-700">
            <X className="w-5 h-5 text-ink-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-ink-900 border border-ink-700 overflow-hidden flex items-center justify-center shrink-0" data-testid="edit-seller-avatar-preview">
              {previewSrc ? <img src={previewSrc} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-2xl text-ink-500">{(form.name || 'S').slice(0, 1).toUpperCase()}</span>}
            </div>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              data-testid="edit-seller-avatar-btn"
              className="text-xs px-3 py-2 rounded-xl bg-gold-500/15 text-gold-300 hover:bg-gold-500/25 font-semibold inline-flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" /> {avatar ? (lang === 'sw' ? 'Picha mpya' : 'New photo') : (lang === 'sw' ? 'Badili picha' : 'Change photo')}
            </button>
            <input
              ref={avatarRef}
              type="file" accept="image/*,.heic,.heif" className="hidden"
              onChange={(e) => { void handleAvatar(e.target.files?.[0]); e.currentTarget.value = ''; }}
              data-testid="edit-seller-avatar-input"
            />
          </div>

          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">{lang === 'sw' ? 'Jina kamili' : 'Full name'} *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              data-testid="edit-seller-name-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold-500/60" />
          </div>
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">{lang === 'sw' ? 'Jina la biashara' : 'Business name'}</label>
            <input value={form.business_name} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
              data-testid="edit-seller-business-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold-500/60" />
          </div>
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">{lang === 'sw' ? 'Eneo' : 'Location'}</label>
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              data-testid="edit-seller-location-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold-500/60" />
          </div>
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">{lang === 'sw' ? 'Maelezo' : 'Bio'}</label>
            <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={2} data-testid="edit-seller-bio-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold-500/60 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2 p-3 rounded-xl border border-ink-700 cursor-pointer hover:border-gold-500/40">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                data-testid="edit-seller-active-toggle" />
              <span className="text-white text-sm">{lang === 'sw' ? 'Inafanya kazi' : 'Active'}</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-xl border border-ink-700 cursor-pointer hover:border-emerald-500/40">
              <input type="checkbox" checked={form.is_verified} onChange={(e) => setForm((f) => ({ ...f, is_verified: e.target.checked }))}
                data-testid="edit-seller-verified-toggle" />
              <span className="text-white text-sm">{lang === 'sw' ? 'Imethibitishwa' : 'Verified'}</span>
            </label>
          </div>

          <button
            onClick={submit}
            disabled={submitting || !form.name.trim()}
            data-testid="edit-seller-save-btn"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold-500 text-ink-900 font-bold hover:bg-gold-400 transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
            {submitting ? (lang === 'sw' ? 'Inahifadhi…' : 'Saving…') : (lang === 'sw' ? 'Hifadhi mabadiliko' : 'Save changes')}
          </button>
        </div>
      </div>
    </div>
  );
}

