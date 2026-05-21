import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, Loader2, ChevronLeft, ShieldCheck, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import SEO from '../components/SEO';
import { processImageForUpload, formatSize, type ProcessedImage } from '../lib/imageUpload';

/**
 * /sell/edit/:productId — Seller edits a single product.
 *
 * Pre-loads the existing record (server-side ownership-scoped via
 * `GET /api/products/{id}`) and PATCHes only the fields that changed. Reuses
 * the same image-compression helper as `CreateProductPage` so re-uploads
 * stay within FastAPI's payload limit on flaky 3G.
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

export default function EditProductPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { lang } = useT();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({
    name: '', price: '', description: '', category: 'general', location: '',
  });
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<ProcessedImage | null>(null);
  const [imgProgress, setImgProgress] = useState(0);
  const [imgProcessing, setImgProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated || !productId) return;
    let alive = true;
    (async () => {
      try {
        const res = await productsAPI.getOneMine(productId);
        if (!alive) return;
        const p = res.data || {};
        setForm({
          name: p.name || '',
          price: String(p.price || ''),
          description: p.description || '',
          category: p.category || 'general',
          location: p.location || '',
        });
        const img = p.image_b64
          ? (p.image_b64.startsWith('data:') ? p.image_b64 : `data:image/jpeg;base64,${p.image_b64}`)
          : (p.image || null);
        setExistingImage(img);
      } catch (err) {
        const e = err as { response?: { status?: number } };
        if (e?.response?.status === 404) setNotFound(true);
        else toast.error('Failed to load product');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [isAuthenticated, productId]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6">
        <SEO title="Sign in" url={`/sell/edit/${productId}`} noindex />
        <div className="max-w-md mx-auto bg-ink-800 border border-ink-700 rounded-2xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">
            {lang === 'sw' ? 'Ingia ili uhariri' : 'Sign in to edit'}
          </h2>
          <button onClick={() => navigate('/login')} className="mt-4 px-5 py-2.5 rounded-xl bg-gold-500 text-ink-900 font-semibold">
            {lang === 'sw' ? 'Ingia' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold-400 mx-auto" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-ink-900 pt-24 px-6 text-center">
        <p className="text-white">{lang === 'sw' ? 'Bidhaa haijapatikana' : 'Product not found'}</p>
        <button onClick={() => navigate('/my-products')} data-testid="edit-not-found-back-btn" className="mt-4 px-4 py-2 rounded-xl bg-ink-700 text-white">
          {lang === 'sw' ? 'Rudi kwa bidhaa zangu' : 'Back to my products'}
        </button>
      </div>
    );
  }

  const handleFile = async (file?: File) => {
    if (!file) return;
    setImgProcessing(true);
    setImgProgress(0);
    try {
      const result = await processImageForUpload(file, { onProgress: setImgProgress });
      setNewImage(result);
      toast.success(lang === 'sw' ? `Picha imeandaliwa (${formatSize(result.sizeKB)})` : `Photo ready (${formatSize(result.sizeKB)})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image failed');
    } finally {
      setImgProcessing(false);
    }
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error(lang === 'sw' ? 'Jina linahitajika' : 'Name required');
    const price = Number(form.price);
    if (!price || price <= 0) return toast.error(lang === 'sw' ? 'Bei si sahihi' : 'Invalid price');

    setSubmitting(true);
    try {
      const payload: Parameters<typeof productsAPI.update>[1] = {
        name: form.name.trim(),
        price,
        description: form.description.trim() || null,
        category: form.category,
        location: form.location.trim() || null,
      };
      if (newImage?.base64) payload.image_b64 = newImage.base64;
      await productsAPI.update(productId!, payload);
      toast.success(lang === 'sw' ? 'Imehifadhiwa' : 'Saved');
      navigate('/my-products');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    const msg = lang === 'sw'
      ? `Una uhakika unataka kufuta "${form.name}"? Kitendo hiki hakirudiwi.`
      : `Are you sure you want to delete "${form.name}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setSubmitting(true);
    try {
      await productsAPI.remove(productId!);
      toast.success(lang === 'sw' ? 'Imefutwa' : 'Deleted');
      navigate('/my-products');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Delete failed');
      setSubmitting(false);
    }
  };

  const previewSrc = newImage?.dataUrl || existingImage || '';

  return (
    <div className="min-h-screen bg-ink-900 pt-20 pb-16 px-4 sm:px-6">
      <SEO title={lang === 'sw' ? 'Hariri bidhaa' : 'Edit product'} url={`/sell/edit/${productId}`} noindex />
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          data-testid="edit-product-back"
          className="inline-flex items-center gap-1 text-ink-400 text-sm hover:text-white mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> {lang === 'sw' ? 'Rudi' : 'Back'}
        </button>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl font-bold text-white"
        >
          {lang === 'sw' ? 'Hariri bidhaa' : 'Edit product'}
        </motion.h1>

        <div className="mt-6 bg-ink-800 border border-ink-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-gold-400" />
            <span className="text-white font-semibold">
              {lang === 'sw' ? 'Picha ya bidhaa' : 'Product photo'}
            </span>
          </div>
          {previewSrc ? (
            <div className="space-y-3">
              <img src={previewSrc} alt="preview" data-testid="edit-image-preview" className="w-full max-h-80 object-contain rounded-xl border border-ink-700 bg-ink-900" />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => cameraRef.current?.click()} disabled={imgProcessing} data-testid="edit-camera-btn"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gold-500/10 border-2 border-dashed border-gold-500/40 text-gold-300 hover:bg-gold-500/15 transition active:scale-95 disabled:opacity-50">
                  <Camera className="w-4 h-4" /> <span className="text-sm font-semibold">{lang === 'sw' ? 'Piga mpya' : 'New photo'}</span>
                </button>
                <button type="button" onClick={() => galleryRef.current?.click()} disabled={imgProcessing} data-testid="edit-gallery-btn"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-ink-900 border-2 border-dashed border-ink-700 text-ink-300 hover:bg-ink-800 transition active:scale-95 disabled:opacity-50">
                  <ImagePlus className="w-4 h-4" /> <span className="text-sm font-semibold">{lang === 'sw' ? 'Badili' : 'Replace'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => cameraRef.current?.click()} disabled={imgProcessing} data-testid="edit-camera-btn"
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-gold-500/10 border-2 border-dashed border-gold-500/40 text-gold-300 hover:bg-gold-500/15 transition active:scale-95 disabled:opacity-50">
                <Camera className="w-7 h-7" />
                <span className="text-sm font-semibold">{lang === 'sw' ? 'Piga picha' : 'Take photo'}</span>
              </button>
              <button type="button" onClick={() => galleryRef.current?.click()} disabled={imgProcessing} data-testid="edit-gallery-btn"
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-ink-900 border-2 border-dashed border-ink-700 text-ink-300 hover:bg-ink-800 transition active:scale-95 disabled:opacity-50">
                <ImagePlus className="w-7 h-7" />
                <span className="text-sm font-semibold">{lang === 'sw' ? 'Toka kwenye picha' : 'Pick from gallery'}</span>
              </button>
            </div>
          )}
          {imgProcessing && (
            <div className="mt-3" data-testid="edit-image-progress">
              <div className="flex items-center justify-between text-xs text-ink-400 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {lang === 'sw' ? 'Inaandaa…' : 'Preparing…'}
                </span>
                <span>{imgProgress}%</span>
              </div>
              <div className="h-1.5 bg-ink-900 rounded-full overflow-hidden">
                <div className="h-full bg-gold-500 transition-all" style={{ width: `${imgProgress}%` }} />
              </div>
            </div>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { void handleFile(e.target.files?.[0]); e.currentTarget.value = ''; }} data-testid="edit-camera-input" />
          <input ref={galleryRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={(e) => { void handleFile(e.target.files?.[0]); e.currentTarget.value = ''; }} data-testid="edit-gallery-input" />
        </div>

        <div className="mt-5 bg-ink-800 border border-ink-700 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">
              {lang === 'sw' ? 'Jina la bidhaa' : 'Product name'} *
            </label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              data-testid="edit-name-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-400 uppercase tracking-wider">
                {lang === 'sw' ? 'Bei (TZS)' : 'Price (TZS)'} *
              </label>
              <input type="number" inputMode="numeric" value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                data-testid="edit-price-input"
                className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none" />
            </div>
            <div>
              <label className="text-xs text-ink-400 uppercase tracking-wider">
                {lang === 'sw' ? 'Aina' : 'Category'}
              </label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                data-testid="edit-category-select"
                className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-3 text-white text-base outline-none">
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
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              data-testid="edit-location-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none" />
          </div>
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">
              {lang === 'sw' ? 'Maelezo' : 'Description'}
            </label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3} data-testid="edit-description-input"
              className="mt-1 w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-white text-base focus:border-gold-500/60 outline-none resize-none" />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={submitting || imgProcessing || !form.name.trim() || !form.price}
          data-testid="save-product-btn"
          className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gold-500 text-ink-900 font-bold text-base hover:bg-gold-400 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> {lang === 'sw' ? 'Inahifadhi…' : 'Saving…'}</>
            : <><Save className="w-5 h-5" /> {lang === 'sw' ? 'Hifadhi mabadiliko' : 'Save changes'}</>}
        </button>

        <button
          onClick={remove}
          disabled={submitting}
          data-testid="delete-product-btn"
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition text-sm font-semibold disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" /> {lang === 'sw' ? 'Futa bidhaa' : 'Delete product'}
        </button>
      </div>
    </div>
  );
}
