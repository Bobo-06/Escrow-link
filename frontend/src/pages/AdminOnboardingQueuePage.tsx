import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, ChevronLeft, Check, X, FileText, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import SEO from '../components/SEO';

/**
 * /admin/onboarding/queue — Admin reviews seller onboardings submitted via the
 * field-rep flow (/onboard/seller). Each submission carries the rep's user_id
 * and 5 documents. Admin can preview each doc and approve or reject the whole
 * batch.
 *
 * Distinct from `/admin/sellers` (already-created seller accounts) and
 * `/my-documents` (self-service KYC for existing sellers).
 */

interface DocMeta { captured: boolean; uploaded_at?: string; size_bytes?: number; note?: string }
interface Onboarding {
  onboarding_id: string;
  status: string;
  name: string;
  phone: string;
  business_name?: string;
  business_type?: string;
  location?: string;
  rep_id?: string;
  submitted_at?: string;
  created_at?: string;
  documents: Record<string, DocMeta>;
  rejection_reason?: string;
}

const DOC_LABELS: Record<string, { sw: string; en: string }> = {
  national_id:           { sw: 'Kitambulisho cha Taifa', en: 'National ID' },
  business_registration: { sw: 'Usajili wa Biashara',    en: 'Business registration' },
  memart_extract:        { sw: 'MEMART extract',         en: 'MEMART extract' },
  tin_certificate:       { sw: 'Cheti cha TIN',          en: 'TIN certificate' },
  business_license:      { sw: 'Leseni ya Biashara',     en: 'Business license' },
};

const STATUS_TONE: Record<string, string> = {
  submitted: 'bg-amber-500/15 text-amber-300',
  verified:  'bg-emerald-500/15 text-emerald-300',
  rejected:  'bg-rose-500/15 text-rose-300',
  draft:     'bg-ink-700 text-ink-300',
};

export default function AdminOnboardingQueuePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { lang } = useT();

  const [filter, setFilter] = useState('submitted');
  const [submissions, setSubmissions] = useState<Onboarding[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<{ doc_type: string; image_b64: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/onboarding/queue', { params: { status: filter } });
      setSubmissions(res.data?.submissions || []);
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } };
      if (e?.response?.status === 403) {
        toast.error(lang === 'sw' ? 'Hii ni ukurasa wa admin tu' : 'Admin only');
      } else {
        toast.error(e?.response?.data?.detail || 'Failed to load');
      }
      setSubmissions([]);
    }
  }, [filter, lang]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    void load();
  }, [isAuthenticated, user?.role, load]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6">
        <SEO title="Admin only" url="/admin/onboarding/queue" noindex />
        <div className="max-w-md mx-auto bg-ink-800 border border-ink-700 rounded-2xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">
            {lang === 'sw' ? 'Ingia kama admin' : 'Sign in as admin'}
          </h2>
        </div>
      </div>
    );
  }

  const previewDoc = async (onboardingId: string, docType: string) => {
    try {
      const res = await api.get(`/admin/onboarding/${onboardingId}/doc/${docType}`);
      setDocPreview({ doc_type: docType, image_b64: res.data?.image_b64 });
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Failed to load image');
    }
  };

  const review = async (onboardingId: string, decision: 'verified' | 'rejected') => {
    let reason: string | null = null;
    if (decision === 'rejected') {
      reason = window.prompt(lang === 'sw' ? 'Sababu ya kukataa?' : 'Reason for rejection?') || '';
      if (!reason.trim()) {
        toast.error(lang === 'sw' ? 'Sababu inahitajika' : 'Reason required');
        return;
      }
    }
    setBusy(onboardingId);
    try {
      await api.post(`/admin/onboarding/${onboardingId}/review`, {
        decision,
        rejection_reason: reason,
      });
      toast.success(
        decision === 'verified'
          ? (lang === 'sw' ? 'Imethibitishwa & SMS imetumwa' : 'Approved & SMS sent')
          : (lang === 'sw' ? 'Imekataliwa' : 'Rejected'),
      );
      setOpenId(null);
      await load();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Review failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-16 px-4 sm:px-6">
      <SEO title="Onboarding queue" url="/admin/onboarding/queue" noindex />
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} data-testid="onboarding-queue-back" className="inline-flex items-center gap-1 text-ink-400 text-sm hover:text-white mb-4">
          <ChevronLeft className="w-4 h-4" /> {lang === 'sw' ? 'Rudi' : 'Back'}
        </button>
        <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold">Admin · Field-rep submissions</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          {lang === 'sw' ? 'Foleni ya kukagua' : 'Onboarding queue'}
        </h1>
        <p className="text-ink-400 text-sm mt-1">
          {lang === 'sw'
            ? 'Wauzaji waliosajiliwa na wawakilishi wakisubiri ukaguzi.'
            : 'Sellers registered by field reps awaiting review.'}
        </p>

        {/* FILTER */}
        <div className="mt-5 flex flex-wrap gap-2">
          {['submitted', 'verified', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              data-testid={`queue-filter-${s}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === s ? 'bg-gold-500 text-ink-900' : 'bg-ink-800 text-ink-300 hover:bg-ink-700'}`}
            >
              {s === 'submitted' ? (lang === 'sw' ? 'Inasubiri' : 'Pending') :
                s === 'verified' ? (lang === 'sw' ? 'Imethibitishwa' : 'Approved') :
                (lang === 'sw' ? 'Imekataliwa' : 'Rejected')}
            </button>
          ))}
        </div>

        {submissions === null && (
          <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gold-400 mx-auto" /></div>
        )}

        {submissions && submissions.length === 0 && (
          <div data-testid="onboarding-queue-empty" className="mt-6 bg-ink-800 border border-ink-700 rounded-2xl p-10 text-center">
            <Clock className="w-10 h-10 text-ink-500 mx-auto mb-3" />
            <p className="text-ink-300">
              {filter === 'submitted'
                ? (lang === 'sw' ? 'Hakuna foleni kwa sasa.' : 'Nothing in the queue.')
                : (lang === 'sw' ? 'Hakuna kumbukumbu.' : 'No records.')}
            </p>
          </div>
        )}

        {submissions && submissions.length > 0 && (
          <div data-testid="onboarding-queue-list" className="mt-6 space-y-3">
            {submissions.map((s) => {
              const captured = Object.values(s.documents || {}).filter((d) => d?.captured).length;
              const total = Object.keys(s.documents || {}).length;
              return (
                <motion.div
                  key={s.onboarding_id}
                  layout
                  data-testid={`onboarding-row-${s.onboarding_id}`}
                  className="bg-ink-800 border border-ink-700 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenId(openId === s.onboarding_id ? null : s.onboarding_id)}
                    className="w-full p-4 flex items-start justify-between gap-3 hover:bg-ink-700/40 transition text-left"
                    data-testid={`onboarding-toggle-${s.onboarding_id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-bold truncate">{s.business_name || s.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${STATUS_TONE[s.status] || STATUS_TONE.draft}`}>{s.status}</span>
                      </div>
                      <p className="text-ink-400 text-xs mt-0.5 truncate">
                        {s.name} · {s.phone} {s.location ? `· ${s.location}` : ''} · {captured}/{total} {lang === 'sw' ? 'hati' : 'docs'}
                      </p>
                      {s.submitted_at && (
                        <p className="text-ink-500 text-[11px] mt-0.5">
                          {lang === 'sw' ? 'Imewasilishwa' : 'Submitted'}: {new Date(s.submitted_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </button>

                  {openId === s.onboarding_id && (
                    <div className="p-4 border-t border-ink-700 space-y-3">
                      {s.rep_id && (
                        <p className="text-xs text-ink-400">{lang === 'sw' ? 'Mwakilishi' : 'Field rep'}: <span className="font-mono text-ink-300">{s.rep_id}</span></p>
                      )}
                      {s.rejection_reason && (
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                          {lang === 'sw' ? 'Sababu' : 'Reason'}: {s.rejection_reason}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(s.documents || {}).map(([dType, dMeta]) => (
                          <div
                            key={dType}
                            data-testid={`onboarding-doc-${dType}-${s.onboarding_id}`}
                            className={`flex items-center gap-2 p-2 rounded-lg border ${dMeta?.captured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-ink-700 bg-ink-900'}`}
                          >
                            <FileText className={`w-4 h-4 ${dMeta?.captured ? 'text-emerald-400' : 'text-ink-500'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-semibold truncate">{lang === 'sw' ? DOC_LABELS[dType]?.sw : DOC_LABELS[dType]?.en}</p>
                              <p className="text-ink-500 text-[10px]">
                                {dMeta?.captured
                                  ? `${Math.round((dMeta.size_bytes || 0) / 1024)} KB`
                                  : (lang === 'sw' ? 'Haijapakiwa' : 'Not uploaded')}
                              </p>
                            </div>
                            {dMeta?.captured && (
                              <button
                                onClick={() => previewDoc(s.onboarding_id, dType)}
                                data-testid={`onboarding-preview-${dType}-${s.onboarding_id}`}
                                className="text-[10px] px-2 py-1 rounded bg-gold-500/15 text-gold-300 hover:bg-gold-500/25 font-semibold"
                              >
                                {lang === 'sw' ? 'Tazama' : 'Preview'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {s.status === 'submitted' && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => review(s.onboarding_id, 'verified')}
                            disabled={busy === s.onboarding_id}
                            data-testid={`onboarding-approve-${s.onboarding_id}`}
                            className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                          >
                            {busy === s.onboarding_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {lang === 'sw' ? 'Thibitisha' : 'Approve'}
                          </button>
                          <button
                            onClick={() => review(s.onboarding_id, 'rejected')}
                            disabled={busy === s.onboarding_id}
                            data-testid={`onboarding-reject-${s.onboarding_id}`}
                            className="flex-1 px-4 py-2 rounded-xl bg-rose-500/15 text-rose-300 text-sm font-bold hover:bg-rose-500/25 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" /> {lang === 'sw' ? 'Kataa' : 'Reject'}
                          </button>
                        </div>
                      )}
                      {s.status !== 'submitted' && (
                        <p className="text-ink-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {lang === 'sw' ? 'Imeshakaguliwa' : 'Already reviewed'}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* IMAGE PREVIEW MODAL */}
      {docPreview && (
        <div
          data-testid="doc-preview-modal"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setDocPreview(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-ink-800 border border-ink-700 rounded-2xl max-w-3xl w-full">
            <div className="flex items-center justify-between p-4 border-b border-ink-700">
              <h3 className="text-white font-bold">{lang === 'sw' ? DOC_LABELS[docPreview.doc_type]?.sw : DOC_LABELS[docPreview.doc_type]?.en}</h3>
              <button onClick={() => setDocPreview(null)} data-testid="doc-preview-close" className="p-1 rounded hover:bg-ink-700">
                <X className="w-5 h-5 text-ink-400" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={docPreview.image_b64.startsWith('data:') ? docPreview.image_b64 : `data:image/jpeg;base64,${docPreview.image_b64}`}
                alt={docPreview.doc_type}
                className="w-full max-h-[70vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
