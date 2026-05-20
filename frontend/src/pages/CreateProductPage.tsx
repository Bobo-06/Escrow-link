import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, Loader2, ChevronLeft, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useLang } from '../i18n';
import SEO from '../components/SEO';
import { processImageForUpload, formatSize, type ProcessedImage } from '../lib/imageUpload';

/**
 * /sell/new — the single canonical entry point for sellers to add a product
 * with a photo. Replaces the previous broken FormData flow.
 *
 * Design priorities (per user feedback Feb 20):
 *   1. Big, obvious "Take photo / Pick from gallery" buttons that visibly
 *      respond to a tap (no more "button does nothing").
 *   2. Auto-resize ANY image to ≤1.5 MB JPEG via `processImageForUpload` so
 *      no upload ever fails on a 5–10 MB camera shot.
 *   3. Live progress bar + preview + size badge before submit.
 *   4. Product is stamped with the authenticated `seller_id` server-side
 *      (in `server.py:create_product`), so it always sticks to the seller.
 */

const CATEGORIES = [
  { value: 'fashion',     sw: 'Mavazi',          en: 'Fashion / Clothing' },
  { value: 'electronics', sw: 'Vifaa vya Umeme', en: 'Electronics' },
  { value: 'beauty',      sw: 'Urembo',          en: 'Beauty / Cosmetics' },
  { value: 'home',        sw: 'Nyumbani',        en: 'Home & Living' },
  { value: 'food',        sw: 'Chakula',         en: 'Food & Groceries' },
  { value: 'services',    sw: 'Huduma',          en: 'Services' },
  { value: 'general',     sw: 'Nyingine',        en: 'Other' },
];

export default function CreateProductPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { lang } = useLang();

  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    category: 'general',
    location: '',
  });
  const [image, setImage] = useState<ProcessedImage | null>(null);
  const [imgProgress, setImgProgress] = useState<number>(0);
  const [imgProcessing, setImgProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6">
        <SEO title="Sign in to sell" url="/sell/new" noindex />
        <div className="max-w-md mx-auto bg-ink-800 border border-ink-700 rounded-2xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">
            {lang === 'sw' ? 'Ingia ili uorodheshe bidhaa' : 'Sign in to list a product'}
          </h2>
          <button
            onClick={() => navigate('/login')}
            data-testid="signin-to-sell-btn"
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
    setImgProcessing(true);
    setImgProgress(0);
    try {
      const result = await processImageForUpload(file, {
        onProgress: setImgProgress,
      });
      setImage(result);
      toast.success(
        lang === 'sw'
          ? `Picha imeandaliwa (${formatSize(result.sizeKB)})`
          : `Photo ready (${formatSize(result.sizeKB)})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image processing failed';
      toast.error(msg);
    } finally {
      setImgProcessing(false);
    }
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error(lang === 'sw' ? 'Jina la bidhaa linahitajika' : 'Product name required');
      return;
    }
    const price = Number(form.price);
    if (!price || price <= 0) {
      toast.error(lang === 'sw' ? 'Bei lazima iwe zaidi ya sifuri' : 'Price must be greater than zero');
      return;
    }
    setSubmitting(true);
    try {
      const res = await productsAPI.create({
        name: form.name.trim(),
        price,
        currency: 'TZS',
        description: form.description.trim() || undefined,
        category: form.category,
        location: form.location.trim() || undefined,
        image_b64: image?.base64,
      });
      toast.success(lang === 'sw' ? 'Bidhaa imeorodheshwa!' : 'Product listed!');
      const pid = res?.data?.product?.product_id;
      // Always return to the seller's own page so the upload "sticks to the seller".
      navigate(pid ? `/seller/${user?.user_id}` : `/seller/${user?.user_id}`);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = e?.response?.data?.detail || e?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-16 px-4 sm:px-6">
      <SEO title={lang === 'sw' ? 'Orodhesha bidhaa' : 'List a product'} url="/sell/new" noindex />
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          data-testid="create-product-back"
          className="inline-flex items-center gap-1 text-ink-400 text-sm hover:text-white mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> {lang === 'sw' ? 'Rudi' : 'Back'}
        </button>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl font-bold text-white"
        >
          {lang === 'sw' ? 'Orodhesha bidhaa mpya' : 'List a new product'}
        </motion.h1>
        <p className="text-ink-400 text-sm mt-1">
          {lang === 'sw'
            ? 'Picha yako itashushwa kiotomatiki ili ifit kwa mtandao wowote.'
            : 'Your photo will be auto-resized so it uploads on any network.'}
        </p>

        {/* PHOTO PICKER — two BIG visible buttons so mobile users can't miss them. */}
        <div className="mt-6 bg-ink-800 border border-ink-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-gold-400" />
            <span className="text-white font-semibold">
              {lang === 'sw' ? 'Picha ya bidhaa' : 'Product photo'}
            </span>
            <span className="text-ink-500 text-xs">
              {lang === 'sw' ? '(hiari)' : '(optional)'}
            </span>
          </div>

          {image ? (
            <div className="space-y-3">
              <img
                src={image.dataUrl}
                alt="preview"
                data-testid="product-image-preview"
                className="w-full max-h-80 object-contain rounded-xl border border-ink-700 bg-ink-900"
              />
              <div className="flex items-center justify-between text-xs text-ink-400">
                <span>
                  {image.width}×{image.height} · {formatSize(image.sizeKB)} · JPEG
                </span>
                <button
                  type="button"
                  onClick={() => { setImage(null); setImgProgress(0); }}
                  data-testid="remove-product-image"
                  className="text-rose-400 hover:text-rose-300"
                >
                  {lang === 'sw' ? 'Ondoa' : 'Remove'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={imgProcessing}
                data-testid="open-camera-btn"
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-gold-500/10 border-2 border-dashed border-gold-500/40 text-gold-300 hover:bg-gold-500/15 hover:border-gold-500/70 transition active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-7 h-7" />
                <span className="text-sm font-semibold">
                  {lang === 'sw' ? 'Piga picha' : 'Take photo'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={imgProcessing}
                data-testid="open-gallery-btn"
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-ink-900 border-2 border-dashed border-ink-700 text-ink-300 hover:bg-ink-800 hover:border-gold-500/40 transition active:scale-95 disabled:opacity-50"
              >
                <ImagePlus className="w-7 h-7" />
                <span className="text-sm font-semibold">
                  {lang === 'sw' ? 'Toka kwenye picha' : 'Pick from gallery'}
                </span>
              </button>
            </div>
          )}

          {/* Progress bar — visible only while processing so the user sees the button did something. */}
          {imgProcessing && (
            <div className="mt-3" data-testid="image-progress">
              <div className="flex items-center justify-between text-xs text-ink-400 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {lang === 'sw' ? 'Inaandaa picha…' : 'Preparing photo…'}
                </span>
                <span>{imgProgress}%</span>
              </div>
              <div className="h-1.5 bg-ink-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-500 transition-all"
                  style={{ width: `${imgProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Hidden inputs — `capture="environment"` opens the rear camera on Android/iOS. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { void handleFile(e.target.files?.[0]); e.currentTarget.value = ''; }}
            data-testid="camera-input"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={(e) => { void handleFile(e.target.files?.[0]); e.currentTarget.value = ''; }}
            data-testid="gallery-input"
          />
        </div>

        {/* PRODUCT FIELDS */}
        <div className="mt-5 bg-ink-800 border border-ink-700 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">
              {lang === 'sw' ? 'Jina la bidhaa' : 'Product name'} *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={lang === 'sw' ? 'mfano: Kitenge cha bei rahisi' : 'e.g. Kitenge fabric'}
              data-testid="product-name-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-400 uppercase tracking-wider">
                {lang === 'sw' ? 'Bei (TZS)' : 'Price (TZS)'} *
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="12000"
                data-testid="product-price-input"
                className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-ink-400 uppercase tracking-wider">
                {lang === 'sw' ? 'Aina' : 'Category'}
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                data-testid="product-category-select"
                className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-3 text-white text-base outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{lang === 'sw' ? c.sw : c.en}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">
              {lang === 'sw' ? 'Eneo' : 'Location'}
            </label>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder={lang === 'sw' ? 'Kariakoo, Dar es Salaam' : 'Kariakoo, Dar es Salaam'}
              data-testid="product-location-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">
              {lang === 'sw' ? 'Maelezo' : 'Description'}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder={
                lang === 'sw'
                  ? 'Kitenge mita 5, rangi nzuri, hali ya juu…'
                  : '5m of fabric, vibrant colour, premium quality…'
              }
              data-testid="product-description-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none resize-none"
            />
          </div>
        </div>

        {/* SUBMIT */}
        <button
          onClick={submit}
          disabled={submitting || imgProcessing || !form.name.trim() || !form.price}
          data-testid="submit-product-btn"
          className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gold-500 text-ink-900 font-bold text-base hover:bg-gold-400 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> {lang === 'sw' ? 'Inatuma…' : 'Submitting…'}</>
          ) : (
            <><Sparkles className="w-5 h-5" /> {lang === 'sw' ? 'Orodhesha bidhaa' : 'List product'}</>
          )}
        </button>

        <p className="text-center text-xs text-ink-500 mt-3">
          {lang === 'sw'
            ? 'Bidhaa itahifadhiwa kwa profaili yako ya muuzaji.'
            : 'Product will be saved to your seller profile.'}
        </p>
      </div>
    </div>
  );
}
