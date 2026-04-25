import React from 'react';
import { Link } from 'react-router-dom';
import { X, Scale, Trash2, CheckCircle } from 'lucide-react';
import { useCompareStore } from '../store/compareStore';
import { useT } from '../i18n';

const fmt = (n: number) => `TZS ${(n || 0).toLocaleString()}`;

const CompareDrawer: React.FC = () => {
  const { t } = useT();
  const { items, open, setOpen, remove, clear } = useCompareStore();

  // Lowest price highlight in the comparison
  const lowestPrice =
    items.length > 1 ? Math.min(...items.map((i) => i.price || Infinity)) : null;

  // Floating action button — only show when at least one item queued
  const fab = items.length > 0 && !open && (
    <button
      type="button"
      data-testid="compare-fab"
      onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 text-ink-900 font-bold shadow-2xl shadow-gold-500/30 hover:from-gold-400 hover:to-gold-500 transition-all"
    >
      <Scale className="w-5 h-5" />
      {t('compare.fab')}
      <span className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-ink-900 text-gold-400 text-xs">
        {items.length}
      </span>
    </button>
  );

  return (
    <>
      {fab}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink-900/80 backdrop-blur-sm flex items-end sm:items-center sm:justify-center"
          data-testid="compare-drawer-overlay"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-5xl bg-ink-800 border-t sm:border border-gold-500/30 sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="compare-drawer"
          >
            {/* header */}
            <div className="sticky top-0 bg-ink-800/95 backdrop-blur border-b border-ink-700 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-gold-400" />
                <h3 className="text-white font-bold text-lg">{t('compare.title')}</h3>
                <span className="text-ink-400 text-sm">({items.length})</span>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={clear}
                    data-testid="compare-clear-btn"
                    className="text-xs text-ink-400 hover:text-rose-400 transition-colors flex items-center gap-1 px-2 py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('compare.clear')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  data-testid="compare-close-btn"
                  className="p-1.5 rounded-lg text-ink-400 hover:text-white hover:bg-ink-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* body */}
            {items.length === 0 ? (
              <div className="p-10 text-center">
                <Scale className="w-12 h-12 text-ink-600 mx-auto mb-3" />
                <p className="text-ink-400">{t('compare.empty')}</p>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((p) => {
                  const isLowest = lowestPrice !== null && p.price === lowestPrice;
                  return (
                    <div
                      key={p.product_id}
                      data-testid={`compare-item-${p.product_id}`}
                      className={`relative bg-ink-900 border rounded-xl overflow-hidden ${
                        isLowest ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10' : 'border-ink-700'
                      }`}
                    >
                      {isLowest && (
                        <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500 text-ink-900 text-[10px] font-bold">
                          <CheckCircle className="w-3 h-3" />
                          {t('mkt.lowest_price')}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(p.product_id)}
                        aria-label={t('compare.remove')}
                        className="absolute top-2 right-2 z-10 p-1 rounded-full bg-ink-800/80 text-ink-300 hover:text-white hover:bg-rose-500/80"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="aspect-square bg-ink-700 relative">
                        {p.image_b64 ? (
                          <img
                            src={`data:image/jpeg;base64,${p.image_b64}`}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : p.image ? (
                          <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
                        )}
                      </div>

                      <div className="p-3 space-y-1.5">
                        <h4 className="text-white text-sm font-semibold line-clamp-2 min-h-[2.5rem]">
                          {p.name}
                        </h4>
                        <p className={`text-base font-bold ${isLowest ? 'text-emerald-400' : 'text-gold-400'}`}>
                          {fmt(p.price)}
                        </p>
                        <p className="text-ink-400 text-xs truncate">
                          {p.seller_name || '—'}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-ink-500">
                          <span className="capitalize">{p.category || '—'}</span>
                          <span>{p.location || '—'}</span>
                        </div>

                        <Link
                          to={`/product/${p.product_id}`}
                          onClick={() => setOpen(false)}
                          className="mt-2 block text-center bg-gold-500/10 border border-gold-500/40 text-gold-300 text-xs font-semibold rounded-lg py-2 hover:bg-gold-500/20"
                        >
                          {t('compare.view')}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CompareDrawer;
