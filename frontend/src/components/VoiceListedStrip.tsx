import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, ArrowRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

interface VoiceProduct {
  product_id: string;
  name: string;
  price: number;
  image?: string;
  image_b64?: string;
  seller_name?: string;
  location?: string;
  created_at?: string;
}

const fmt = (n: number) => `TSh ${Math.round(n).toLocaleString()}`;

/**
 * Landing page engagement strip — surfaces the 3 most-recently-voice-listed
 * products with a "Listed by voice in 20 seconds" badge. Converts hesitant
 * sellers by showing real usage, and nudges buyers toward fresh listings.
 *
 * Hides itself when there are zero voice products, so it never looks empty.
 */
const VoiceListedStrip: React.FC = () => {
  const [products, setProducts] = useState<VoiceProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/voice-listed?limit=3`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch {
        /* silent */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Don't render a half-baked strip before data loads, or when empty
  if (!loaded || products.length === 0) return null;

  return (
    <section
      id="voice-listed"
      className="py-16 bg-gradient-to-b from-ink-900 via-ink-800 to-ink-900 border-y border-gold-500/10"
      data-testid="voice-listed-strip"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 mb-3">
              <Mic className="w-3.5 h-3.5 text-gold-400" />
              <span className="text-gold-300 text-xs font-medium uppercase tracking-wider">
                New — Voice Listing
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white leading-tight">
              Listed by voice in{' '}
              <span className="gradient-text">20 seconds</span>
            </h2>
            <p className="text-ink-400 mt-2 max-w-xl">
              Sellers are now speaking their listings into existence — in Swahili
              or English. Here are the latest.
            </p>
          </div>
          <Link
            to="/dashboard"
            data-testid="voice-listed-cta"
            className="flex items-center gap-2 px-5 py-3 bg-gold-500/10 border border-gold-500/30
                     text-gold-300 rounded-xl font-semibold hover:bg-gold-500/20 transition-colors whitespace-nowrap"
          >
            <Mic className="w-4 h-4" />
            Try voice listing
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p, idx) => {
            const img = p.image_b64
              ? `data:image/jpeg;base64,${p.image_b64}`
              : p.image;
            return (
              <motion.div
                key={p.product_id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
              >
                <Link
                  to={`/product/${p.product_id}`}
                  className="group block glass rounded-2xl overflow-hidden hover:border-gold-500/50 transition-all"
                  data-testid={`voice-listed-card-${idx}`}
                >
                  <div className="aspect-[5/3] bg-ink-700 relative overflow-hidden">
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold-500/20 to-emerald-500/20">
                        <Mic className="w-12 h-12 text-gold-400" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 bg-ink-900/80 backdrop-blur-sm rounded-full border border-gold-500/30">
                      <Mic className="w-3 h-3 text-gold-400" />
                      <span className="text-gold-300 text-[10px] font-semibold uppercase tracking-wider">
                        Voice
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-semibold group-hover:text-gold-400 transition-colors line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="text-gold-400 font-bold text-lg mt-1">{fmt(p.price)}</p>
                    <p className="text-ink-400 text-xs mt-2">
                      {p.seller_name || 'Verified seller'}
                      {p.location && ` · ${p.location}`}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default VoiceListedStrip;
