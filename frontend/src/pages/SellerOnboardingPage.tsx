import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CheckCircle, ChevronRight, ChevronLeft, Upload, Loader2, ShieldCheck, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import SEO from '../components/SEO';
import { useT } from '../i18n';
import { useAuthStore } from '../store/authStore';

interface DocLabel { en: string; sw: string; }
interface DocsConfig {
  required: string[];
  labels: Record<string, DocLabel>;
}
interface OnboardingDoc {
  captured: boolean;
  uploaded_at?: string;
  size_bytes?: number;
}
interface Onboarding {
  onboarding_id: string;
  business_name: string;
  owner_name: string;
  phone: string;
  tin?: string;
  status: string;
  documents: Record<string, OnboardingDoc>;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB raw — base64 will be ~33% larger

/**
 * Convert a File/Blob (from camera or file picker) into a base64 string,
 * shrunk to max 1200px wide / JPEG 0.7 quality so we don't blow the
 * server-side 6 MB base64 cap or the user's mobile data plan.
 */
async function fileToOptimizedBase64(file: File): Promise<string> {
  if (file.size <= MAX_IMAGE_BYTES) {
    // Try to keep original if already reasonable — better OCR fidelity.
    const raw = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    return raw.split(',')[1] || raw;
  }

  // Big file — re-encode via canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 1600;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas ctx'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      resolve(dataUrl.split(',')[1] || dataUrl);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const SellerOnboardingPage: React.FC = () => {
  const { t, lang } = useT();
  const { isAuthenticated } = useAuthStore();
  const [docsConfig, setDocsConfig] = useState<DocsConfig | null>(null);
  const [step, setStep] = useState(0); // 0=intro/info, 1..N=doc N, N+1=review, N+2=success
  const [info, setInfo] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    tin: '',
    location: '',
    business_email: '',
  });
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Bootstrap — fetch the doc list once
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<DocsConfig>('/onboarding/seller/required-docs');
        setDocsConfig(r.data);
      } catch {
        toast.error('Could not load doc requirements');
      }
    })();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <ShieldCheck className="w-12 h-12 text-gold-400 mx-auto mb-4" />
          <p className="text-ink-300 mb-4">{t('watch.login_required')}</p>
          <a href="/login" className="inline-flex items-center px-5 py-2.5 bg-gold-500 text-ink-900 rounded-full font-bold hover:bg-gold-400">
            {t('nav.login')}
          </a>
        </div>
      </div>
    );
  }

  if (!docsConfig) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
      </div>
    );
  }

  const totalSteps = 1 + docsConfig.required.length + 1; // info + 5 docs + review

  // ─── Step 1: Business info → start onboarding ────────────────────────────
  const handleStart = async () => {
    if (!info.business_name || !info.owner_name || !info.phone) {
      toast.error(t('onb.error.required'));
      return;
    }
    setBusy(true);
    try {
      const r = await api.post<{ ok: boolean; onboarding: Onboarding }>(
        '/onboarding/seller/start',
        {
          business_name: info.business_name,
          owner_name: info.owner_name,
          phone: info.phone,
          tin: info.tin || undefined,
          location: info.location || undefined,
          business_email: info.business_email || undefined,
        },
      );
      setOnboarding(r.data.onboarding);
      setStep(1);
    } catch (e: any) {
      const code = e?.response?.status;
      if (code === 409) toast.error(t('onb.error.duplicate'));
      else toast.error(e?.response?.data?.detail || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  // ─── Doc step (one per required doc) ─────────────────────────────────────
  const currentDocIndex = step - 1; // 0..N-1
  const currentDocType = docsConfig.required[currentDocIndex];
  const currentLabel = docsConfig.labels[currentDocType]?.[lang] || currentDocType;

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
  };

  const handleUploadCurrent = async () => {
    if (!fileRef.current?.files?.[0] || !onboarding) return;
    const file = fileRef.current.files[0];
    setBusy(true);
    try {
      const b64 = await fileToOptimizedBase64(file);
      const r = await api.post<{ onboarding: Onboarding }>(
        `/onboarding/seller/${onboarding.onboarding_id}/doc`,
        { doc_type: currentDocType, image_b64: b64 },
      );
      setOnboarding(r.data.onboarding);
      toast.success(`${currentLabel} ✓`);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      setStep(step + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  // ─── Review step ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!onboarding) return;
    setBusy(true);
    try {
      await api.post(`/onboarding/seller/${onboarding.onboarding_id}/submit`);
      setStep(totalSteps); // success
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const handleStartOver = () => {
    setStep(0);
    setInfo({ business_name: '', owner_name: '', phone: '', tin: '', location: '', business_email: '' });
    setOnboarding(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const progressPct = step === 0 ? 0 : Math.min(100, Math.round((step / totalSteps) * 100));

  return (
    <div className="min-h-screen bg-ink-900 pt-20" data-testid="seller-onboarding-page">
      <SEO title="Seller Onboarding" description="Register a new seller on Biz-Salama" url="/onboard/seller" noindex />

      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-gold-400" />
            <h1 className="text-2xl font-display font-bold text-white">{t('onb.title')}</h1>
          </div>
          <p className="text-ink-400 text-sm">{t('onb.subtitle')}</p>

          {/* Download pitch deck — explains Biz-Salama in Kiswahili for sellers
              who want a take-away before signing up, or for sharing on WhatsApp. */}
          <a
            href={`${process.env.REACT_APP_BACKEND_URL}/api/docs/seller-pitch.pptx`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="seller-pitch-download"
            className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-ink-800 border border-gold-500/30 text-gold-300 text-xs hover:bg-gold-500/10 hover:border-gold-500/60 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Pakua mwongozo (.pptx)  ·  Download seller guide
          </a>
        </div>

        {/* Progress bar */}
        {step > 0 && step < totalSteps && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-ink-400 mb-2">
              <span>
                {t('onb.step')} {step + 1} {t('onb.of')} {totalSteps}
              </span>
              <span className="text-gold-400 font-semibold">{progressPct}%</span>
            </div>
            <div
              className="h-1.5 bg-ink-700 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${t('onb.step')} ${step + 1} ${t('onb.of')} ${totalSteps}`}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-gold-500 to-emerald-500"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* === STEP 0 — business info === */}
          {step === 0 && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="glass rounded-2xl p-5"
              data-testid="onb-step-info"
            >
              <h2 className="text-white font-bold mb-4">{t('onb.start.title')}</h2>
              <div className="space-y-3">
                {[
                  { id: 'business_name', label: t('onb.start.business_name'), placeholder: 'Mama Asha Kitenge' },
                  { id: 'owner_name', label: t('onb.start.owner_name'), placeholder: 'Asha Mwakitwange' },
                  { id: 'phone', label: t('onb.start.phone'), placeholder: '+255 712 345 678', type: 'tel' },
                  { id: 'tin', label: t('onb.start.tin'), placeholder: '123456789', type: 'tel' },
                  { id: 'location', label: t('onb.start.location'), placeholder: 'Dar es Salaam' },
                  { id: 'business_email', label: t('onb.start.email'), placeholder: 'shop@example.com', type: 'email' },
                ].map((f) => (
                  <label key={f.id} className="block">
                    <span className="block text-ink-300 text-xs mb-1">{f.label}</span>
                    <input
                      data-testid={`onb-input-${f.id}`}
                      type={f.type || 'text'}
                      value={(info as any)[f.id]}
                      onChange={(e) => setInfo((s) => ({ ...s, [f.id]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-3 text-white text-base focus:outline-none focus:border-gold-500"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                data-testid="onb-start-btn"
                onClick={handleStart}
                disabled={busy}
                className="w-full mt-5 py-3 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('onb.start.next')}<ChevronRight className="w-5 h-5" /></>}
              </button>
            </motion.div>
          )}

          {/* === STEPS 1..N — document capture === */}
          {step > 0 && step <= docsConfig.required.length && (
            <motion.div
              key={`doc-${currentDocType}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="glass rounded-2xl p-5"
              data-testid={`onb-step-${currentDocType}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-gold-400" />
                <h2 className="text-white font-bold">{currentLabel}</h2>
              </div>
              <p className="text-ink-400 text-xs mb-4">{t('onb.cam.hint')}</p>

              {/* Preview area */}
              <div className="aspect-[4/3] bg-ink-800 border border-ink-700 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                {preview ? (
                  <img src={preview} alt="preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Camera className="w-12 h-12 text-ink-600" />
                )}
              </div>

              {/* Camera input — `capture="environment"` opens rear camera on mobile */}
              <input
                ref={fileRef}
                data-testid={`onb-file-${currentDocType}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid={`onb-take-${currentDocType}`}
                  onClick={() => fileRef.current?.click()}
                  className="py-3 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-300 font-semibold flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  {preview ? t('onb.cam.retake') : t('onb.cam.take')}
                </button>
                <button
                  type="button"
                  data-testid={`onb-upload-${currentDocType}`}
                  onClick={handleUploadCurrent}
                  disabled={!preview || busy}
                  className="py-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-ink-900 font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" />{t('onb.cam.continue')}</>}
                </button>
              </div>

              {step > 1 && (
                <button
                  type="button"
                  onClick={() => { setPreview(null); setStep(step - 1); }}
                  className="w-full mt-3 text-ink-400 text-xs flex items-center justify-center gap-1 hover:text-white"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> previous
                </button>
              )}
            </motion.div>
          )}

          {/* === REVIEW === */}
          {step === docsConfig.required.length + 1 && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="glass rounded-2xl p-5"
              data-testid="onb-step-review"
            >
              <h2 className="text-white font-bold mb-1">{t('onb.review.title')}</h2>
              <p className="text-ink-400 text-xs mb-4">{t('onb.review.docs_captured')}: {Object.keys(onboarding?.documents || {}).length}/{docsConfig.required.length}</p>

              <div className="bg-ink-800 rounded-xl p-3 mb-4 text-sm space-y-1.5">
                <p><span className="text-ink-400">{t('onb.start.business_name')}:</span> <span className="text-white font-semibold">{onboarding?.business_name}</span></p>
                <p><span className="text-ink-400">{t('onb.start.owner_name')}:</span> <span className="text-white">{onboarding?.owner_name}</span></p>
                <p><span className="text-ink-400">{t('onb.start.phone')}:</span> <span className="text-white">{onboarding?.phone}</span></p>
                {onboarding?.tin && <p><span className="text-ink-400">TIN:</span> <span className="text-white">{onboarding.tin}</span></p>}
              </div>

              <ul className="space-y-2 mb-5">
                {docsConfig.required.map((d) => {
                  const got = !!(onboarding?.documents || {})[d]?.captured;
                  return (
                    <li
                      key={d}
                      data-testid={`onb-review-${d}`}
                      className="flex items-center gap-3 bg-ink-800 rounded-lg px-3 py-2"
                    >
                      <CheckCircle className={`w-5 h-5 ${got ? 'text-emerald-400' : 'text-ink-600'}`} />
                      <span className="text-ink-200 text-sm flex-1">{docsConfig.labels[d]?.[lang] || d}</span>
                      <span className={`text-xs ${got ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {got ? t('onb.cam.uploaded') : '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                data-testid="onb-submit-btn"
                onClick={handleSubmit}
                disabled={busy}
                className="w-full py-3 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{t('onb.review.submitting')}</> : t('onb.review.submit')}
              </button>
            </motion.div>
          )}

          {/* === SUCCESS === */}
          {step === totalSteps && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-8 text-center"
              data-testid="onb-step-success"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">{t('onb.success.title')}</h2>
              <p className="text-ink-300 text-sm mb-2">
                <span className="text-emerald-300 font-mono">{onboarding?.onboarding_id}</span>
              </p>
              <p className="text-ink-400 text-sm mb-6">{t('onb.success.body')}</p>
              <button
                type="button"
                data-testid="onb-restart-btn"
                onClick={handleStartOver}
                className="px-6 py-2.5 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-300 font-semibold"
              >
                {t('onb.success.new')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SellerOnboardingPage;
