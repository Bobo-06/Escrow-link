import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

type State =
  | { kind: 'loading' }
  | { kind: 'fresh'; host: string }
  | { kind: 'stale'; host: string }
  | { kind: 'unknown'; host: string };

/**
 * Dev-only badge that diffs the running build against the "expected"
 * brand icon. If the live /logo192.png center pixel is the React
 * default cyan (97,218,251) instead of our gold (251,191,36),
 * the badge flags the page as "Stale build — redeploy needed".
 *
 * Visible only when ?debug=1 is in URL OR localStorage.biz_debug === '1'
 * OR when running on localhost / *.preview.emergentagent.com.
 */
const BuildBadge: React.FC = () => {
  const [state, setState] = useState<State>({ kind: 'loading' });

  // Gate visibility — we don't want to scare real users.
  const visible = (() => {
    if (typeof window === 'undefined') return false;
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('debug') === '1') return true;
    try {
      if (localStorage.getItem('biz_debug') === '1') return true;
    } catch {
      /* ignore */
    }
    const host = window.location.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.preview.emergentagent.com')
    );
  })();

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const run = async () => {
      try {
        const host = window.location.hostname;
        // Cache-bust to avoid seeing a stale browser-cached icon
        const url = `/logo192.png?probe=${Date.now()}`;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error('load'));
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas');
        ctx.drawImage(img, 0, 0);
        // Sample center pixel
        const { data } = ctx.getImageData(
          Math.floor(img.width / 2),
          Math.floor(img.height / 2),
          1,
          1,
        );
        const [r, g, b] = [data[0], data[1], data[2]];
        if (cancelled) return;
        const isGold = r > 180 && g > 130 && b < 120;       // Biz-Salama gold
        const isCyan = r < 150 && g > 180 && b > 200;        // React cyan
        if (isGold) setState({ kind: 'fresh', host });
        else if (isCyan) setState({ kind: 'stale', host });
        else setState({ kind: 'unknown', host });
      } catch {
        if (!cancelled) setState({ kind: 'unknown', host: window.location.hostname });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible || state.kind === 'loading') {
    if (!visible) return null;
    return (
      <div
        data-testid="build-badge-loading"
        className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-ink-800 border border-ink-700 text-ink-400 text-[10px] font-mono"
        title="Checking build freshness"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        build
      </div>
    );
  }

  if (state.kind === 'fresh') {
    return (
      <div
        data-testid="build-badge-fresh"
        className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono"
        title={`Build is fresh (gold icon served from ${state.host})`}
      >
        <CheckCircle2 className="w-3 h-3" />
        FRESH
      </div>
    );
  }

  if (state.kind === 'stale') {
    return (
      <a
        data-testid="build-badge-stale"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          alert(
            'Stale build detected on ' +
              state.host +
              '\n\nThe live site is still serving the old React-atom icon, which means a newer preview build has not been deployed yet. ' +
              'Run an Emergent redeploy to push the latest fixes.',
          );
        }}
        className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/40 text-red-300 text-[10px] font-mono animate-pulse hover:bg-red-500/20"
        title={`STALE build on ${state.host} — icon is still React cyan. Redeploy needed.`}
      >
        <AlertTriangle className="w-3 h-3" />
        STALE
      </a>
    );
  }

  return (
    <div
      data-testid="build-badge-unknown"
      className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-ink-800 border border-ink-700 text-ink-400 text-[10px] font-mono"
      title={`Build unknown on ${state.host}`}
    >
      ?
      build
    </div>
  );
};

export default BuildBadge;
