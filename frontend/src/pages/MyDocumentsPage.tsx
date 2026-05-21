import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, Loader2, ChevronLeft, ShieldCheck, FileText, Check, AlertCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import SEO from '../components/SEO';
import { processImageForUpload, type ProcessedImage } from '../lib/imageUpload';

/**
 * /my-documents — Self-service KYC for an already-registered seller.
 *
 * Each of the 5 docs is uploaded individually via POST /api/auth/kyc/documents
 * (image_b64 only; auto-compressed client-side). Once all 5 are captured, the
 * seller can "Submit for review" to push their account into the admin queue.
 *
 * Distinct from `/onboard/seller` (used by field reps for new sellers) and
 * `/admin/sellers/new` (admin attaches docs to a brand-new seller).
 */
interface DocStatus {
  captured: boolean;
  uploaded_at?: string;
  size_bytes?: number;
  review_status?: string;
  rejection_reason?: string | null;
}
interface DocLabel { en: string; sw: string }

const KYC_STATUS_LABEL: Record<string, { sw: string; en: string; tone: string }> = {
  unsubmitted:    { sw: 'Haijawasilishwa',   en: 'Not submitted',        tone: 'bg-ink-700 text-ink-300' },
  pending_review: { sw: 'Inakaguliwa',       en: 'Under review',         tone: 'bg-amber-500/15 text-amber-300' },
  approved:       { sw: 'Imethibitishwa',    en: 'Approved',             tone: 'bg-emerald-500/15 text-emerald-300' },
  rejected:       { sw: 'Imekataliwa',       en: 'Rejected',             tone: 'bg-rose-500/15 text-rose-300' },
};

export default function MyDocumentsPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { lang } = useT();

  const [data, setData] = useState<{
    kyc_status: string;
    is_verified: boolean;
    documents: Record<string, DocStatus>;
    required: string[];
    labels: Record<string, DocLabel>;
  } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const res = await api.get('/auth/kyc/documents');
      setData(res.data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Failed to load');
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated, load]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6">
        <SEO title="Sign in" url="/my-documents" noindex />
        <div className="max-w-md mx-auto bg-ink-800 border border-ink-700 rounded-2xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">
            {lang === 'sw' ? 'Ingia ili upakie hati' : 'Sign in to upload documents'}
          </h2>
          <button
            onClick={() => navigate('/login')}
            data-testid="signin-to-mydocs-btn"
            className="mt-4 px-5 py-2.5 rounded-xl bg-gold-500 text-ink-900 font-semibold"
          >
            {lang === 'sw' ? 'Ingia' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  const handleUpload = async (docKey: string, file?: File) => {
    if (!file) return;
    setBusyKey(docKey);
    try {
      const img: ProcessedImage = await processImageForUpload(file, { maxEdge: 1600, maxKB: 1500 });
      await api.post('/auth/kyc/documents', {
        doc_type: docKey,
        image_b64: img.base64,
      });
      toast.success(`${lang === 'sw' ? 'Imepakiwa' : 'Uploaded'} (${Math.round(img.sizeKB)} KB)`);
      await load();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      toast.error(e?.response?.data?.detail || e?.message || 'Upload failed');
    } finally {
      setBusyKey(null);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/auth/kyc/submit');
      toast.success(lang === 'sw' ? 'Imewasilishwa kwa ukaguzi' : 'Submitted for review');
      await load();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold-400 mx-auto" />
      </div>
    );
  }

  const capturedCount = data.required.filter((k) => data.documents[k]?.captured).length;
  const allCaptured = capturedCount === data.required.length;
  const statusLabel = KYC_STATUS_LABEL[data.kyc_status] || KYC_STATUS_LABEL.unsubmitted;
  const canSubmit = allCaptured && (data.kyc_status === 'unsubmitted' || data.kyc_status === 'rejected');

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-16 px-4 sm:px-6">
      <SEO title={lang === 'sw' ? 'Hati zangu' : 'My documents'} url="/my-documents" noindex />
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} data-testid="mydocs-back-btn" className="inline-flex items-center gap-1 text-ink-400 text-sm hover:text-white mb-4">
          <ChevronLeft className="w-4 h-4" /> {lang === 'sw' ? 'Rudi' : 'Back'}
        </button>

        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-3xl sm:text-4xl font-bold text-white">
          {lang === 'sw' ? 'Hati za KYC' : 'My KYC documents'}
        </motion.h1>
        <p className="text-ink-400 text-sm mt-1">
          {lang === 'sw'
            ? 'Pakia hati zako 5 za biashara kuthibitisha akaunti yako. Tutahakiki ndani ya saa 48.'
            : 'Upload your 5 KYC documents to verify your account. We review within 48 hours.'}
        </p>

        {/* KYC STATUS BANNER */}
        <div className="mt-5 p-4 bg-ink-800 border border-ink-700 rounded-2xl flex items-center justify-between gap-3" data-testid="kyc-status-banner">
          <div className="flex items-center gap-3">
            {data.is_verified ? <Check className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
            <div>
              <p className="text-white text-sm font-semibold">
                {lang === 'sw' ? 'Hali' : 'Status'}: <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel.tone}`}>{lang === 'sw' ? statusLabel.sw : statusLabel.en}</span>
              </p>
              <p className="text-ink-500 text-xs mt-0.5">
                {capturedCount} / {data.required.length} {lang === 'sw' ? 'zimepakiwa' : 'captured'}
              </p>
            </div>
          </div>
          <div className="h-2 w-24 bg-ink-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-500 to-emerald-400 transition-all"
              style={{ width: `${(capturedCount / data.required.length) * 100}%` }}
            />
          </div>
        </div>

        {/* DOCUMENT CARDS */}
        <div className="mt-5 space-y-3">
          {data.required.map((docKey) => {
            const doc = data.documents[docKey];
            const label = data.labels[docKey];
            const captured = !!doc?.captured;
            const status = doc?.review_status;
            const busy = busyKey === docKey;
            return (
              <div
                key={docKey}
                data-testid={`kyc-card-${docKey}`}
                className={`p-4 rounded-2xl border ${captured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-ink-700 bg-ink-800'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${captured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-ink-700 text-ink-400'}`}>
                    {captured ? <Check className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-bold text-sm">{lang === 'sw' ? label?.sw : label?.en}</h3>
                      {status === 'rejected' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">{lang === 'sw' ? 'IMEKATALIWA' : 'REJECTED'}</span>
                      )}
                      {status === 'approved' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">{lang === 'sw' ? 'IMEPITISHWA' : 'APPROVED'}</span>
                      )}
                    </div>
                    {captured && (
                      <p className="text-ink-500 text-xs mt-0.5">
                        {Math.round((doc?.size_bytes || 0) / 1024 / 1.33)} KB
                        {doc?.uploaded_at ? ` · ${new Date(doc.uploaded_at).toLocaleString()}` : ''}
                      </p>
                    )}
                    {doc?.rejection_reason && (
                      <p className="text-rose-300 text-xs mt-1">{doc.rejection_reason}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraRefs.current[docKey]?.click()}
                    disabled={busy}
                    data-testid={`kyc-camera-btn-${docKey}`}
                    className="flex items-center justify-center gap-1 py-2 rounded-lg bg-gold-500/15 text-gold-300 hover:bg-gold-500/25 transition text-xs font-semibold disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    {captured ? (lang === 'sw' ? 'Badili picha' : 'Retake') : (lang === 'sw' ? 'Piga picha' : 'Take photo')}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRefs.current[docKey]?.click()}
                    disabled={busy}
                    data-testid={`kyc-gallery-btn-${docKey}`}
                    className="flex items-center justify-center gap-1 py-2 rounded-lg bg-ink-700 text-ink-200 hover:bg-ink-600 transition text-xs font-semibold disabled:opacity-50"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    {lang === 'sw' ? 'Toka kwenye picha' : 'Pick from gallery'}
                  </button>
                  <input
                    ref={(el) => { cameraRefs.current[docKey] = el; }}
                    type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { void handleUpload(docKey, e.target.files?.[0]); e.currentTarget.value = ''; }}
                    data-testid={`kyc-camera-input-${docKey}`}
                  />
                  <input
                    ref={(el) => { fileRefs.current[docKey] = el; }}
                    type="file" accept="image/*,.heic,.heif" className="hidden"
                    onChange={(e) => { void handleUpload(docKey, e.target.files?.[0]); e.currentTarget.value = ''; }}
                    data-testid={`kyc-gallery-input-${docKey}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* SUBMIT FOR REVIEW */}
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          data-testid="kyc-submit-btn"
          className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gold-500 text-ink-900 font-bold text-base hover:bg-gold-400 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> {lang === 'sw' ? 'Inawasilisha…' : 'Submitting…'}</>
            : <><Send className="w-5 h-5" /> {lang === 'sw' ? 'Wasilisha kwa ukaguzi' : 'Submit for review'}</>}
        </button>
        {data.kyc_status === 'pending_review' && (
          <p className="text-amber-300 text-xs text-center mt-2">
            {lang === 'sw' ? 'Hati zako zimewasilishwa. Tutakujulisha tutakapomaliza ukaguzi.' : 'Your documents have been submitted. We will notify you when review is done.'}
          </p>
        )}
        {data.kyc_status === 'approved' && (
          <p className="text-emerald-300 text-xs text-center mt-2 inline-flex items-center justify-center gap-1 w-full">
            <Check className="w-3.5 h-3.5" /> {lang === 'sw' ? 'Akaunti yako imethibitishwa rasmi.' : 'Your account is fully verified.'}
          </p>
        )}

        <Link
          to="/dashboard"
          className="mt-3 inline-block text-center w-full text-sm text-ink-400 hover:text-white"
        >
          {lang === 'sw' ? '← Rudi kwenye dashboard' : '← Back to dashboard'}
        </Link>
      </div>
    </div>
  );
}
