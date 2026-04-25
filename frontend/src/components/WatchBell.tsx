import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';

interface WatchBellProps {
  productId: string;
  productName?: string;
  /** "card" = compact pill on marketplace cards; "pdp" = larger button on product detail */
  variant?: 'card' | 'pdp';
  className?: string;
  /** Fired after a successful add/remove so the parent can refresh state */
  onChange?: (watching: boolean) => void;
}

const WatchBell: React.FC<WatchBellProps> = ({
  productId,
  productName,
  variant = 'card',
  className = '',
  onChange,
}) => {
  const { t } = useT();
  const { isAuthenticated } = useAuthStore();
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);

  // Pull current watch state on mount (auth users only — anonymous can't watch).
  useEffect(() => {
    let alive = true;
    if (!isAuthenticated || !productId) return;
    (async () => {
      try {
        const r = await api.get<{ watching: boolean }>(`/watches/check/${productId}`);
        if (alive) setWatching(!!r.data?.watching);
      } catch {
        // 401/network errors are silently ignored — bell just stays "off".
      }
    })();
    return () => {
      alive = false;
    };
  }, [productId, isAuthenticated]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast(t('watch.login_required'));
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (watching) {
        // Need watch_id to delete — fetch fresh state to grab it.
        const chk = await api.get<{ watching: boolean; watch_id?: string }>(
          `/watches/check/${productId}`
        );
        const wid = chk.data?.watch_id;
        if (wid) await api.delete(`/watches/${wid}`);
        setWatching(false);
        toast.success(t('watch.removed_toast'));
        onChange?.(false);
      } else {
        await api.post('/watches', { product_id: productId });
        setWatching(true);
        toast.success(t('watch.added_toast'));
        onChange?.(true);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('watch.error'));
    } finally {
      setBusy(false);
    }
  };

  const label = watching ? t('watch.added') : t('watch.add');

  if (variant === 'pdp') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        data-testid={`watch-bell-pdp-${productId}`}
        title={productName ? `${label} · ${productName}` : label}
        className={`p-4 rounded-xl transition-colors border disabled:opacity-50 ${
          watching
            ? 'bg-emerald-500 text-ink-900 border-emerald-500'
            : 'glass border-ink-700 hover:bg-ink-700 text-ink-300'
        } ${className}`}
        aria-pressed={watching}
        aria-label={label}
      >
        {watching ? <BellRing className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      data-testid={`watch-bell-${productId}`}
      title={label}
      aria-pressed={watching}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-full border transition-all disabled:opacity-50 ${
        watching
          ? 'bg-emerald-500 text-ink-900 border-emerald-500 w-8 h-8'
          : 'bg-ink-900/80 text-ink-200 border-ink-600 hover:text-emerald-300 hover:border-emerald-400/60 w-8 h-8'
      } ${className}`}
    >
      {watching ? (
        <BellRing className="w-4 h-4" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
    </button>
  );
};

export default WatchBell;

// helper exports for tooling/tests
export const WatchBellOff = BellOff;
