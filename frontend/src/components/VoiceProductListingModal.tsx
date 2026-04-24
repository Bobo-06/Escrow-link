import React, { useState } from 'react';
import { X, Loader2, Sparkles, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import VoiceRecorder from './VoiceRecorder';
import { productsAPI } from '../lib/api';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface ParsedFields {
  name?: string;
  price?: number;
  description?: string;
  category?: string;
}

/**
 * Records the seller's spoken description, transcribes via Whisper,
 * then lets them tap "Parse & create". Uses simple heuristics to pre-fill
 * name, price and category from the transcript — keeps it offline-friendly
 * so we don't burn tokens on a second LLM call for every listing.
 */
const VoiceProductListingModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [transcript, setTranscript] = useState('');
  const [fields, setFields] = useState<ParsedFields>({});
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const parseTranscript = (text: string): ParsedFields => {
    const out: ParsedFields = { description: text };
    // Price: match TSh / TZS / shilingi / 'at 50000'
    const priceMatch = text.match(/(?:tsh|tzs|shilingi|sh|\bbei\b|\bprice\b|\bat\b|-)\s*([\d][\d,\.\s]*)/i);
    if (priceMatch) {
      const n = parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10);
      if (!isNaN(n) && n > 100) out.price = n;
    }
    // Name: first 6 words before "for"/"at"/"price"
    const nameSeg = text.split(/\b(for|at|price|bei|tsh|tzs)\b/i)[0].trim();
    if (nameSeg) out.name = nameSeg.split(/\s+/).slice(0, 10).join(' ').replace(/[.,!?]+$/, '');
    // Category heuristic
    const lc = text.toLowerCase();
    if (/kitenge|kanga|dress|shirt|shoe|sandal|kanzu|fashion|nguo/.test(lc)) out.category = 'fashion';
    else if (/phone|samsung|tecno|laptop|speaker|solar|electronic|simu/.test(lc)) out.category = 'electronics';
    else if (/honey|coffee|rice|spice|pilau|food|chakula|cashew/.test(lc)) out.category = 'food';
    else if (/shea|baobab|soap|oil|beauty|moringa/.test(lc)) out.category = 'beauty';
    else if (/table|chair|basket|painting|shuka|home|samani/.test(lc)) out.category = 'home';
    else if (/chicks|goat|seed|irrigation|farm|kilimo/.test(lc)) out.category = 'agriculture';
    return out;
  };

  const handleTranscribed = (text: string) => {
    setTranscript(text);
    setFields(parseTranscript(text));
    toast.success('Transcribed! Review and publish.');
  };

  const handlePublish = async () => {
    if (!fields.name || !fields.price) {
      toast.error('Name and price are required.');
      return;
    }
    setSaving(true);
    try {
      // Use JSON create (backend accepts ProductCreate via /api/products).
      // Using raw fetch because productsAPI.create posts FormData.
      const token = (JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token);
      const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name: fields.name,
          price: fields.price,
          currency: 'TZS',
          description: fields.description,
          listed_via_voice: true,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Create failed');
      }
      toast.success('Product listed!');
      setTranscript('');
      setFields({});
      onCreated?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to list product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/80 backdrop-blur-sm"
      data-testid="voice-listing-modal"
      onClick={onClose}
    >
      <div
        className="glass max-w-lg w-full rounded-2xl p-6 border border-gold-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-400" />
            <h2 className="text-xl font-bold text-white">List by Voice</h2>
          </div>
          <button
            onClick={onClose}
            data-testid="voice-listing-close-btn"
            className="text-ink-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-ink-300 text-sm mb-5">
          Tap the mic and describe your product in Swahili or English. E.g.{' '}
          <em className="text-gold-300">"Samsung A54 kwa TSh 850,000 — mpya, warranty ya mwaka mmoja."</em>
        </p>

        {!transcript ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <VoiceRecorder
              context="listing"
              onTranscribed={handleTranscribed}
              size="md"
              title="Tap & describe your product"
            />
            <p className="text-ink-400 text-xs flex items-center gap-1">
              <Mic className="w-3 h-3" /> Tap mic to start · tap again to stop
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-ink-400 block mb-1">Name</label>
              <input
                type="text"
                value={fields.name || ''}
                onChange={(e) => setFields({ ...fields, name: e.target.value })}
                className="w-full px-3 py-2 bg-ink-800 border border-ink-600 rounded-lg text-white"
                data-testid="voice-listing-name-input"
              />
            </div>
            <div>
              <label className="text-xs text-ink-400 block mb-1">Price (TZS)</label>
              <input
                type="number"
                value={fields.price ?? ''}
                onChange={(e) => setFields({ ...fields, price: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-ink-800 border border-ink-600 rounded-lg text-white"
                data-testid="voice-listing-price-input"
              />
            </div>
            <div>
              <label className="text-xs text-ink-400 block mb-1">Description (transcript)</label>
              <textarea
                value={fields.description || ''}
                onChange={(e) => setFields({ ...fields, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-ink-800 border border-ink-600 rounded-lg text-white text-sm"
                data-testid="voice-listing-desc-input"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setTranscript('');
                  setFields({});
                }}
                className="flex-1 py-2 border border-ink-600 text-white rounded-lg hover:bg-ink-700"
                data-testid="voice-listing-redo-btn"
              >
                Re-record
              </button>
              <button
                onClick={handlePublish}
                disabled={saving}
                data-testid="voice-listing-publish-btn"
                className="flex-1 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 rounded-lg font-semibold hover:from-gold-400 disabled:opacity-50 flex items-center justify-center"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceProductListingModal;
