/**
 * Browser-side error + debug-log reporter.
 *
 * Ships small JSON payloads to `POST /api/client-errors` so the team can see
 * failures hitting real Tanzanian users on flaky cellular — without paying
 * for a Sentry SaaS plan. Deliberately minimal:
 *
 *   • One global `error` handler + one `unhandledrejection` handler.
 *   • A `reportClientError(level, message, meta)` helper for call-sites that
 *     already swallow errors (e.g. Web Share API rejections).
 *   • Throttled: max 20 events / minute, deduped by message+url+level. This
 *     stops a noisy loop from DDoS-ing our own backend.
 *   • `navigator.sendBeacon` first (won't be cancelled on page unload), with
 *     a `fetch({ keepalive: true })` fallback for browsers that lack beacon.
 *
 * The backend hard-caps payload sizes, so we don't need to be paranoid about
 * trimming here — but we still trim message + stack so the network frame
 * stays small on 3G.
 */

const ENDPOINT_PATH = '/api/client-errors';
const MAX_PER_MINUTE = 20;
const DEDUPE_WINDOW_MS = 30_000;
const MAX_MESSAGE_LEN = 2_000;
const MAX_STACK_LEN = 3_000;

export type ClientErrorLevel = 'debug' | 'info' | 'warn' | 'error';

interface ReportMeta {
  [key: string]: unknown;
}

// In-memory state — cleared on full reload, which is fine for a debug tool.
const recentEvents: number[] = []; // timestamps (ms)
const recentSignatures = new Map<string, number>(); // sig -> last-seen ms
let installed = false;

function backendUrl(): string {
  const base = process.env.REACT_APP_BACKEND_URL;
  return base ? `${base}${ENDPOINT_PATH}` : ENDPOINT_PATH;
}

function appVersion(): string {
  // CRA inlines process.env.REACT_APP_* at build time. Falls back to "dev"
  // for local runs where the value isn't set.
  return process.env.REACT_APP_VERSION || 'dev';
}

function viewport(): string {
  if (typeof window === 'undefined') return '';
  return `${window.innerWidth}x${window.innerHeight}`;
}

function readUserId(): string | undefined {
  // Zustand persists the auth slice as JSON in localStorage under
  // `biz-salama-auth`. We read straight from storage to avoid pulling the store
  // into this module (which would create a cycle: store → api client → reporter → store).
  try {
    const raw = window.localStorage.getItem('biz-salama-auth');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.user_id;
  } catch {
    return undefined;
  }
}

function trim(value: unknown, limit: number): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  return s.length <= limit ? s : `${s.slice(0, limit - 3)}...`;
}

function shouldDrop(level: ClientErrorLevel, message: string, url: string): boolean {
  const now = Date.now();
  // Drop old timestamps outside the 1-minute window.
  while (recentEvents.length && now - recentEvents[0] > 60_000) {
    recentEvents.shift();
  }
  if (recentEvents.length >= MAX_PER_MINUTE) return true;

  // Dedupe identical messages within the dedupe window.
  const sig = `${level}|${message.slice(0, 200)}|${url}`;
  const lastSeen = recentSignatures.get(sig);
  if (lastSeen && now - lastSeen < DEDUPE_WINDOW_MS) return true;
  recentSignatures.set(sig, now);

  // Stop the map from growing unbounded.
  if (recentSignatures.size > 200) {
    let oldestKey: string | null = null;
    let oldestTs = Infinity;
    recentSignatures.forEach((ts, key) => {
      if (ts < oldestTs) {
        oldestTs = ts;
        oldestKey = key;
      }
    });
    if (oldestKey) recentSignatures.delete(oldestKey);
  }

  recentEvents.push(now);
  return false;
}

function send(payload: Record<string, unknown>): void {
  const url = backendUrl();
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const queued = navigator.sendBeacon(url, blob);
      if (queued) return;
    }
  } catch {
    // Fall through to fetch.
  }
  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Network down — swallow. The whole point of this module is to be invisible
    // when it fails. We never want the reporter itself to spam errors.
  }
}

export function reportClientError(
  level: ClientErrorLevel,
  message: string,
  meta?: ReportMeta,
): void {
  if (typeof window === 'undefined') return;
  const trimmedMessage = trim(message, MAX_MESSAGE_LEN);
  if (!trimmedMessage) return;
  const currentUrl = window.location?.href || '';
  if (shouldDrop(level, trimmedMessage, currentUrl)) return;

  const stackFromMeta = meta && (meta.stack as string | undefined);
  const payload: Record<string, unknown> = {
    level,
    message: trimmedMessage,
    stack: trim(stackFromMeta, MAX_STACK_LEN),
    url: currentUrl,
    user_agent: navigator.userAgent || '',
    user_id: readUserId(),
    app_version: appVersion(),
    online: typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
    viewport: viewport(),
    meta: meta ? { ...meta, stack: undefined } : {},
  };
  send(payload);
}

export function installGlobalErrorReporter(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    const err = event.error as Error | undefined;
    reportClientError('error', event.message || 'window.onerror', {
      stack: err?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      source: 'window.error',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    reportClientError('error', message, {
      stack: reason instanceof Error ? reason.stack : undefined,
      source: 'unhandledrejection',
    });
  });
}
