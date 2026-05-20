import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ImagePlus, Loader2, ChevronLeft, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import SEO from '../components/SEO';
import { processImageForUpload, formatSize, type ProcessedImage } from '../lib/imageUpload';

/**
 * /profile/edit — seller-facing profile editor.
 *
 * Lets a seller upload an avatar (auto-compressed via `imageUpload.ts` to keep
 * cellular uploads cheap) plus edit their display name, business name, bio,
 * and location. PUTs to `/api/auth/profile` which now accepts these fields.
 */
export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setAuth, token } = useAuthStore();
  const { lang } = useT();

  const u = (user as Record<string, unknown> | null) || null;
  const [form, setForm] = useState({
    name: (u?.name as string) || '',
    business_name: (u?.business_name as string) || '',
    bio: (u?.bio as string) || '',
    location: (u?.location as string) || '',
  });
  const [picture, setPicture] = useState<ProcessedImage | null>(null);
  const [picProcessing, setPicProcessing] = useState(false);
  const [picProgress, setPicProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6">
        <SEO title="Sign in" url="/profile/edit" noindex />
        <div className="max-w-md mx-auto bg-ink-800 border border-ink-700 rounded-2xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">
            {lang === 'sw' ? 'Ingia ili uhariri profaili' : 'Sign in to edit profile'}
          </h2>
          <button
            onClick={() => navigate('/login')}
            data-testid="signin-to-edit-btn"
            className="mt-4 px-5 py-2.5 rounded-xl bg-gold-500 text-ink-900 font-semibold"
          >
            {lang === 'sw' ? 'Ingia' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  const handleFile = async (file?: File) => {
    if (!file) return;
    setPicProcessing(true);
    setPicProgress(0);
    try {
      // Avatars only need to be small — 500 KB max @ 800 px is plenty.
      const result = await processImageForUpload(file, { maxEdge: 800, maxKB: 500, onProgress: setPicProgress });
      setPicture(result);
      toast.success(lang === 'sw' ? `Picha imeandaliwa (${formatSize(result.sizeKB)})` : `Photo ready (${formatSize(result.sizeKB)})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image processing failed';
      toast.error(msg);
    } finally {
      setPicProcessing(false);
    }
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error(lang === 'sw' ? 'Jina linahitajika' : 'Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        business_name: form.business_name.trim() || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
      };
      if (picture?.dataUrl) payload.picture = picture.dataUrl;
      const res = await api.put('/auth/profile', payload);
      const updated = res.data as { name: string; user_id: string; phone: string; picture?: string };
      // Keep the Zustand store in sync so UI updates immediately.
      if (token) {
        setAuth(token, {
          ...(user as object),
          name: updated.name,
          ...(updated.picture ? { picture: updated.picture } : {}),
        } as Parameters<typeof setAuth>[1]);
      }
      toast.success(lang === 'sw' ? 'Profaili imehifadhiwa' : 'Profile saved');
      navigate('/dashboard');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      toast.error(e?.response?.data?.detail || e?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const currentPicture = picture?.dataUrl || (u?.picture as string) || '';

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-16 px-4 sm:px-6">
      <SEO title={lang === 'sw' ? 'Hariri profaili' : 'Edit profile'} url="/profile/edit" noindex />
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          data-testid="profile-edit-back"
          className="inline-flex items-center gap-1 text-ink-400 text-sm hover:text-white mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> {lang === 'sw' ? 'Rudi' : 'Back'}
        </button>

        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          {lang === 'sw' ? 'Hariri profaili' : 'Edit profile'}
        </h1>
        <p className="text-ink-400 text-sm mt-1">
          {lang === 'sw'
            ? 'Picha yako itashushwa kiotomatiki ifit kwa mtandao wowote.'
            : 'Your avatar will be auto-resized so it uploads on any network.'}
        </p>

        {/* AVATAR */}
        <div className="mt-6 bg-ink-800 border border-ink-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-gold-400" />
            <span className="text-white font-semibold">
              {lang === 'sw' ? 'Picha ya profaili' : 'Profile picture'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div
              className="w-28 h-28 rounded-full bg-ink-900 border-2 border-ink-700 overflow-hidden flex items-center justify-center"
              data-testid="profile-avatar-preview"
            >
              {currentPicture ? (
                <img src={currentPicture} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-ink-500">{(form.name || 'S').slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={picProcessing}
                data-testid="avatar-camera-btn"
                className="flex flex-col items-center gap-1 p-4 rounded-xl bg-gold-500/10 border-2 border-dashed border-gold-500/40 text-gold-300 hover:bg-gold-500/15 hover:border-gold-500/70 transition active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs font-semibold">{lang === 'sw' ? 'Piga picha' : 'Take photo'}</span>
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                disabled={picProcessing}
                data-testid="avatar-gallery-btn"
                className="flex flex-col items-center gap-1 p-4 rounded-xl bg-ink-900 border-2 border-dashed border-ink-700 text-ink-300 hover:bg-ink-800 hover:border-gold-500/40 transition active:scale-95 disabled:opacity-50"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs font-semibold">{lang === 'sw' ? 'Toka picha' : 'Pick from gallery'}</span>
              </button>
            </div>
          </div>

          {picProcessing && (
            <div className="mt-3" data-testid="avatar-progress">
              <div className="flex items-center justify-between text-xs text-ink-400 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {lang === 'sw' ? 'Inaandaa…' : 'Preparing…'}
                </span>
                <span>{picProgress}%</span>
              </div>
              <div className="h-1.5 bg-ink-900 rounded-full overflow-hidden">
                <div className="h-full bg-gold-500 transition-all" style={{ width: `${picProgress}%` }} />
              </div>
            </div>
          )}

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => { void handleFile(e.target.files?.[0]); e.currentTarget.value = ''; }}
            data-testid="avatar-camera-input"
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={(e) => { void handleFile(e.target.files?.[0]); e.currentTarget.value = ''; }}
            data-testid="avatar-gallery-input"
          />
        </div>

        {/* FIELDS */}
        <div className="mt-5 bg-ink-800 border border-ink-700 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">
              {lang === 'sw' ? 'Jina kamili' : 'Full name'} *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              data-testid="profile-name-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">
              {lang === 'sw' ? 'Jina la biashara' : 'Business name'}
            </label>
            <input
              value={form.business_name}
              onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
              placeholder={lang === 'sw' ? 'Mfano: Mama Biashara Store' : 'e.g. Mama Biashara Store'}
              data-testid="profile-business-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">
              {lang === 'sw' ? 'Eneo' : 'Location'}
            </label>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Kariakoo, Dar es Salaam"
              data-testid="profile-location-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">
              {lang === 'sw' ? 'Maelezo mafupi' : 'Bio'}
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              placeholder={lang === 'sw' ? 'Tuambie kuhusu duka lako…' : 'Tell buyers about your shop…'}
              data-testid="profile-bio-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none resize-none"
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={submitting || picProcessing || !form.name.trim()}
          data-testid="save-profile-btn"
          className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gold-500 text-ink-900 font-bold text-base hover:bg-gold-400 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> {lang === 'sw' ? 'Inahifadhi…' : 'Saving…'}</>
          ) : (
            <><Sparkles className="w-5 h-5" /> {lang === 'sw' ? 'Hifadhi profaili' : 'Save profile'}</>
          )}
        </button>
      </div>
    </div>
  );
}
