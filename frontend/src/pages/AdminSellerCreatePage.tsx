import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, Loader2, ChevronLeft, ShieldCheck, Sparkles, Copy, Check, ExternalLink, KeyRound, Package, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import SEO from '../components/SEO';
import { processImageForUpload, formatSize, type ProcessedImage } from '../lib/imageUpload';

/**
 * /admin/sellers/new — Single-screen admin-direct seller registration.
 *
 * Pipeline: collect account fields + (optional) avatar + (optional) starter
 * product + (optional) KYC docs → POST /api/admin/sellers with all sections
 * in one payload. Seller is created `verified=true` immediately.
 */

const DOC_TYPES: { key: string; sw: string; en: string }[] = [
  { key: 'national_id',          sw: 'Kitambulisho cha Taifa', en: 'National ID' },
  { key: 'business_registration', sw: 'Cheti cha usajili wa biashara', en: 'Business registration' },
  { key: 'memart_extract',       sw: 'MEMART extract', en: 'MEMART extract' },
  { key: 'tin_certificate',      sw: 'Cheti cha TIN', en: 'TIN certificate' },
  { key: 'business_license',     sw: 'Leseni ya biashara', en: 'Business license' },
];

const CATEGORIES = [
  { value: 'fashion',     sw: 'Mavazi',          en: 'Fashion' },
  { value: 'electronics', sw: 'Vifaa vya Umeme', en: 'Electronics' },
  { value: 'beauty',      sw: 'Urembo',          en: 'Beauty' },
  { value: 'home',        sw: 'Nyumbani',        en: 'Home' },
  { value: 'food',        sw: 'Chakula',         en: 'Food' },
  { value: 'services',    sw: 'Huduma',          en: 'Services' },
  { value: 'general',     sw: 'Nyingine',        en: 'Other' },
];

interface CreatedSeller {
  user_id: string;
  name: string;
  phone: string;
  auth_type: string;
  starter_product_id?: string | null;
  set_password_link?: string | null;
  password_set_link_sent?: boolean;
}

export default function AdminSellerCreatePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { lang } = useT();

  const [form, setForm] = useState({
    name: '', phone: '', email: '', business_name: '', location: '', bio: '',
    password: '', send_set_password_link: true,
  });
  const [avatar, setAvatar] = useState<ProcessedImage | null>(null);
  const [starterEnabled, setStarterEnabled] = useState(false);
  const [starter, setStarter] = useState({ name: '', price: '', description: '', category: 'general' });
  const [starterImage, setStarterImage] = useState<ProcessedImage | null>(null);
  const [docs, setDocs] = useState<Record<string, ProcessedImage | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedSeller | null>(null);
  const [copied, setCopied] = useState(false);

  const avatarRef = useRef<HTMLInputElement>(null);
  const starterImgRef = useRef<HTMLInputElement>(null);
  const docRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6">
        <SEO title="Admin only" url="/admin/sellers/new" noindex />
        <div className="max-w-md mx-auto bg-ink-800 border border-ink-700 rounded-2xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">
            {lang === 'sw' ? 'Ingia kama admin' : 'Sign in as admin'}
          </h2>
        </div>
      </div>
    );
  }

  const handleAvatar = async (file?: File) => {
    if (!file) return;
    try {
      const r = await processImageForUpload(file, { maxEdge: 800, maxKB: 500 });
      setAvatar(r);
      toast.success(`${lang === 'sw' ? 'Picha tayari' : 'Photo ready'} (${formatSize(r.sizeKB)})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image failed');
    }
  };

  const handleStarterImage = async (file?: File) => {
    if (!file) return;
    try {
      const r = await processImageForUpload(file);
      setStarterImage(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image failed');
    }
  };

  const handleDoc = async (key: string, file?: File) => {
    if (!file) return;
    try {
      const r = await processImageForUpload(file, { maxEdge: 1600, maxKB: 1500 });
      setDocs((d) => ({ ...d, [key]: r }));
      toast.success(`${lang === 'sw' ? 'Hati imepakiwa' : 'Doc uploaded'} (${formatSize(r.sizeKB)})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image failed');
    }
  };

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      return toast.error(lang === 'sw' ? 'Jaza jina na simu' : 'Name and phone required');
    }
    if (!form.send_set_password_link && (!form.password || form.password.length < 6)) {
      return toast.error(lang === 'sw' ? 'Nenosiri liwe na herufi 6 au zaidi' : 'Password must be at least 6 chars');
    }
    setSubmitting(true);
    try {
      const documents: Record<string, string> = {};
      for (const [k, v] of Object.entries(docs)) {
        if (v) documents[k] = v.base64;
      }
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        business_name: form.business_name.trim() || undefined,
        location: form.location.trim() || undefined,
        bio: form.bio.trim() || undefined,
        picture: avatar?.dataUrl,
        send_set_password_link: form.send_set_password_link,
      };
      if (!form.send_set_password_link && form.password) {
        payload.password = form.password;
      }
      if (Object.keys(documents).length > 0) payload.documents = documents;
      if (starterEnabled && starter.name.trim() && Number(starter.price) > 0) {
        payload.starter_product = {
          name: starter.name.trim(),
          price: Number(starter.price),
          description: starter.description.trim() || undefined,
          category: starter.category,
          image_b64: starterImage?.base64,
        };
      }
      const res = await api.post('/admin/sellers', payload);
      setCreated(res.data);
      toast.success(lang === 'sw' ? 'Muuzaji amesajiliwa!' : 'Seller registered!');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string }; status?: number } };
      const detail = e?.response?.data?.detail || '';
      if (e?.response?.status === 409 && detail.startsWith('PHONE_EXISTS')) {
        toast.error(lang === 'sw' ? 'Simu hii tayari imesajiliwa' : 'This phone is already registered');
      } else if (e?.response?.status === 409 && detail.startsWith('EMAIL_EXISTS')) {
        toast.error(lang === 'sw' ? 'Barua pepe hii tayari imesajiliwa' : 'This email is already registered');
      } else {
        toast.error(detail || 'Failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!created?.set_password_link) return;
    await navigator.clipboard.writeText(created.set_password_link);
    setCopied(true);
    toast.success(lang === 'sw' ? 'Kiungo kimenakiliwa' : 'Link copied');
    setTimeout(() => setCopied(false), 1800);
  };

  if (created) {
    return (
      <div className="min-h-screen bg-ink-900 pt-20 pb-16 px-4 sm:px-6">
        <SEO title="Seller registered" url="/admin/sellers/new" noindex />
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="admin-seller-created-success"
            className="bg-ink-800 border border-emerald-500/40 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2">
              <Check className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">
                {lang === 'sw' ? 'Muuzaji amesajiliwa!' : 'Seller registered!'}
              </h2>
            </div>
            <p className="text-ink-400 text-sm mt-1">
              {created.name} · {created.phone}
              {created.starter_product_id && (
                <span className="block mt-1">
                  {lang === 'sw' ? 'Bidhaa ya kuanzia imeundwa.' : 'Starter product created.'}
                </span>
              )}
            </p>

            {created.auth_type === 'password_pending' && created.set_password_link && (
              <>
                <div className="mt-4 p-3 bg-ink-900 border border-amber-500/30 rounded-xl">
                  <p className="text-amber-300 text-xs font-bold mb-2 uppercase tracking-wider">
                    {lang === 'sw' ? 'Kiungo cha kuweka nenosiri (SMS imetumwa)' : 'Set-password link (SMS sent)'}
                  </p>
                  <p data-testid="admin-set-password-link" className="font-mono text-xs text-ink-300 break-all">
                    {created.set_password_link}
                  </p>
                </div>
                <button
                  onClick={copyLink}
                  data-testid="admin-copy-password-link-btn"
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition text-sm font-semibold"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {lang === 'sw' ? 'Nakili kiungo' : 'Copy link'}
                </button>
              </>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/seller/${created.user_id}`}
                data-testid="admin-view-seller-link"
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-ink-700 text-white font-semibold hover:bg-ink-600 transition"
              >
                <ExternalLink className="w-4 h-4" /> {lang === 'sw' ? 'Tazama profaili' : 'View profile'}
              </Link>
              <button
                onClick={() => {
                  setCreated(null);
                  setForm({ name: '', phone: '', email: '', business_name: '', location: '', bio: '', password: '', send_set_password_link: true });
                  setAvatar(null);
                  setStarterEnabled(false);
                  setStarter({ name: '', price: '', description: '', category: 'general' });
                  setStarterImage(null);
                  setDocs({});
                }}
                data-testid="admin-register-another-btn"
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-gold-500 text-ink-900 font-bold hover:bg-gold-400 transition"
              >
                + {lang === 'sw' ? 'Sajili mwingine' : 'Register another'}
              </button>
              <button
                onClick={() => navigate('/admin/sellers')}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-transparent text-ink-400 hover:text-white transition"
              >
                {lang === 'sw' ? 'Orodha ya wauzaji →' : 'Sellers list →'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-16 px-4 sm:px-6">
      <SEO title="Register seller" url="/admin/sellers/new" noindex />
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-ink-400 text-sm hover:text-white mb-4">
          <ChevronLeft className="w-4 h-4" /> {lang === 'sw' ? 'Rudi' : 'Back'}
        </button>
        <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold">Admin · Direct registration</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          {lang === 'sw' ? 'Sajili muuzaji' : 'Register seller'}
        </h1>
        <p className="text-ink-400 text-sm mt-1">
          {lang === 'sw' ? 'Akaunti itahakikishwa kiotomatiki.' : 'Account is verified immediately.'}
        </p>

        {/* AVATAR */}
        <div className="mt-6 bg-ink-800 border border-ink-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-gold-400" />
            <span className="text-white font-semibold">{lang === 'sw' ? 'Picha ya muuzaji' : 'Seller photo'}</span>
            <span className="text-ink-500 text-xs">({lang === 'sw' ? 'hiari' : 'optional'})</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-ink-900 border-2 border-ink-700 overflow-hidden flex items-center justify-center" data-testid="admin-avatar-preview">
              {avatar?.dataUrl ? <img src={avatar.dataUrl} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-2xl text-ink-500">{(form.name || 'S').slice(0, 1).toUpperCase()}</span>}
            </div>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              data-testid="admin-avatar-pick-btn"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500/15 border-2 border-dashed border-gold-500/40 text-gold-300 hover:bg-gold-500/25 transition text-sm font-semibold"
            >
              <ImagePlus className="w-4 h-4" /> {avatar ? (lang === 'sw' ? 'Badili' : 'Replace') : (lang === 'sw' ? 'Pakia picha' : 'Upload photo')}
            </button>
            <input ref={avatarRef} type="file" accept="image/*,.heic,.heif" className="hidden"
              onChange={(e) => { void handleAvatar(e.target.files?.[0]); e.currentTarget.value = ''; }}
              data-testid="admin-avatar-input" />
          </div>
        </div>

        {/* ACCOUNT */}
        <div className="mt-5 bg-ink-800 border border-ink-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold">{lang === 'sw' ? 'Maelezo ya akaunti' : 'Account details'}</h3>
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">{lang === 'sw' ? 'Jina kamili' : 'Full name'} *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              data-testid="admin-name-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-gold-500/60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-400 uppercase tracking-wider">{lang === 'sw' ? 'Simu' : 'Phone'} *</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="0712345678"
                data-testid="admin-phone-input"
                className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-gold-500/60" />
            </div>
            <div>
              <label className="text-xs text-ink-400 uppercase tracking-wider">{lang === 'sw' ? 'Barua pepe' : 'Email'}</label>
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="seller@example.com"
                data-testid="admin-email-input"
                className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-gold-500/60" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-400 uppercase tracking-wider">{lang === 'sw' ? 'Jina la biashara' : 'Business name'}</label>
              <input value={form.business_name} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                data-testid="admin-business-input"
                className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-gold-500/60" />
            </div>
            <div>
              <label className="text-xs text-ink-400 uppercase tracking-wider">{lang === 'sw' ? 'Eneo' : 'Location'}</label>
              <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Kariakoo, Dar es Salaam"
                data-testid="admin-location-input"
                className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-gold-500/60" />
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">{lang === 'sw' ? 'Maelezo mafupi' : 'Bio'}</label>
            <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={2} data-testid="admin-bio-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-gold-500/60 resize-none" />
          </div>
        </div>

        {/* PASSWORD STRATEGY */}
        <div className="mt-5 bg-ink-800 border border-ink-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-gold-400" />
            <span className="text-white font-semibold">{lang === 'sw' ? 'Nenosiri' : 'Password'}</span>
          </div>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-700 cursor-pointer hover:border-gold-500/40">
              <input type="radio" checked={form.send_set_password_link} onChange={() => setForm((f) => ({ ...f, send_set_password_link: true }))}
                data-testid="admin-pwd-link-radio" />
              <div>
                <p className="text-white font-semibold text-sm">{lang === 'sw' ? 'Tuma kiungo (SMS)' : 'Send link (SMS)'}</p>
                <p className="text-ink-400 text-xs">{lang === 'sw' ? 'Muuzaji ataweka nenosiri lake mwenyewe.' : 'Seller sets their own password.'}</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-700 cursor-pointer hover:border-gold-500/40">
              <input type="radio" checked={!form.send_set_password_link} onChange={() => setForm((f) => ({ ...f, send_set_password_link: false }))}
                data-testid="admin-pwd-direct-radio" />
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{lang === 'sw' ? 'Weka nenosiri mwenyewe' : 'Set password yourself'}</p>
                <p className="text-ink-400 text-xs">{lang === 'sw' ? 'Mwambie muuzaji nenosiri kwa mdomo.' : 'Share verbally with the seller.'}</p>
                {!form.send_set_password_link && (
                  <input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={lang === 'sw' ? 'Herufi 6 au zaidi' : '6+ characters'}
                    data-testid="admin-password-input"
                    className="mt-2 w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-gold-500/60" />
                )}
              </div>
            </label>
          </div>
        </div>

        {/* STARTER PRODUCT */}
        <div className="mt-5 bg-ink-800 border border-ink-700 rounded-2xl p-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={starterEnabled} onChange={(e) => setStarterEnabled(e.target.checked)}
              data-testid="admin-starter-toggle" />
            <Package className="w-4 h-4 text-gold-400" />
            <span className="text-white font-semibold">{lang === 'sw' ? 'Ongeza bidhaa ya kuanzia' : 'Add starter product'}</span>
            <span className="text-ink-500 text-xs">({lang === 'sw' ? 'hiari' : 'optional'})</span>
          </label>
          {starterEnabled && (
            <div className="mt-4 space-y-3">
              <input value={starter.name} onChange={(e) => setStarter((s) => ({ ...s, name: e.target.value }))}
                placeholder={lang === 'sw' ? 'Jina la bidhaa' : 'Product name'}
                data-testid="admin-starter-name"
                className="w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold-500/60" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" inputMode="numeric" value={starter.price} onChange={(e) => setStarter((s) => ({ ...s, price: e.target.value }))}
                  placeholder={lang === 'sw' ? 'Bei (TZS)' : 'Price (TZS)'}
                  data-testid="admin-starter-price"
                  className="w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold-500/60" />
                <select value={starter.category} onChange={(e) => setStarter((s) => ({ ...s, category: e.target.value }))}
                  data-testid="admin-starter-category"
                  className="w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{lang === 'sw' ? c.sw : c.en}</option>)}
                </select>
              </div>
              <textarea value={starter.description} onChange={(e) => setStarter((s) => ({ ...s, description: e.target.value }))}
                rows={2} placeholder={lang === 'sw' ? 'Maelezo' : 'Description'}
                data-testid="admin-starter-description"
                className="w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold-500/60 resize-none" />
              <div className="flex items-center gap-3">
                {starterImage && <img src={starterImage.dataUrl} alt="starter" className="w-16 h-16 object-cover rounded-lg border border-ink-700" />}
                <button type="button" onClick={() => starterImgRef.current?.click()} data-testid="admin-starter-image-btn"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink-900 border-2 border-dashed border-ink-700 text-ink-300 hover:border-gold-500/40 transition text-xs font-semibold">
                  <ImagePlus className="w-4 h-4" /> {starterImage ? (lang === 'sw' ? 'Badili picha' : 'Replace photo') : (lang === 'sw' ? 'Picha ya bidhaa' : 'Product photo')}
                </button>
                <input ref={starterImgRef} type="file" accept="image/*,.heic,.heif" className="hidden"
                  onChange={(e) => { void handleStarterImage(e.target.files?.[0]); e.currentTarget.value = ''; }}
                  data-testid="admin-starter-image-input" />
              </div>
            </div>
          )}
        </div>

        {/* DOCUMENTS */}
        <div className="mt-5 bg-ink-800 border border-ink-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gold-400" />
            <span className="text-white font-semibold">{lang === 'sw' ? 'Hati za KYC' : 'KYC documents'}</span>
            <span className="text-ink-500 text-xs">({lang === 'sw' ? 'hiari — muuzaji huu ametaifa' : 'optional — seller is admin-trusted'})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DOC_TYPES.map((d) => (
              <div key={d.key} className="flex items-center gap-3 p-2 rounded-xl border border-ink-700">
                {docs[d.key] ? (
                  <img src={docs[d.key]!.dataUrl} alt={d.key} className="w-14 h-14 object-cover rounded-lg" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-ink-900 flex items-center justify-center"><FileText className="w-5 h-5 text-ink-600" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-semibold truncate">{lang === 'sw' ? d.sw : d.en}</p>
                  <button type="button" onClick={() => docRefs.current[d.key]?.click()}
                    data-testid={`admin-doc-pick-${d.key}`}
                    className="mt-1 text-[10px] text-gold-400 hover:underline">
                    {docs[d.key] ? (lang === 'sw' ? 'Badili' : 'Replace') : (lang === 'sw' ? 'Pakia' : 'Upload')}
                  </button>
                  <input
                    ref={(el) => { docRefs.current[d.key] = el; }}
                    type="file" accept="image/*,.heic,.heif" className="hidden"
                    onChange={(e) => { void handleDoc(d.key, e.target.files?.[0]); e.currentTarget.value = ''; }}
                    data-testid={`admin-doc-input-${d.key}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={submitting || !form.name.trim() || !form.phone.trim()}
          data-testid="admin-register-seller-submit"
          className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gold-500 text-ink-900 font-bold text-base hover:bg-gold-400 transition active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> {lang === 'sw' ? 'Inasajili…' : 'Registering…'}</>
            : <><Sparkles className="w-5 h-5" /> {lang === 'sw' ? 'Sajili muuzaji' : 'Register seller'}</>}
        </button>
      </div>
    </div>
  );
}
