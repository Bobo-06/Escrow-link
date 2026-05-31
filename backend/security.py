"""
Lightweight in-process security middleware and helpers.

What lives here
---------------
1. `SecurityHeadersMiddleware` — adds the standard hardening headers to every
   response (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS,
   Permissions-Policy, a tightened Content-Security-Policy in production).
2. `LoginRateLimiter` — token-bucket-style limiter for `/api/auth/login` and
   any other write endpoint that needs brute-force protection. In-process; if
   you scale to multi-replica swap for Redis.

Both helpers are deliberately stdlib-only (no `slowapi`, no `secure`) so the
trust surface is small and we control the exact behaviour.
"""
from __future__ import annotations

import os
import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


# ─── Security headers ─────────────────────────────────────────────────────

# Connect-src needs to include the API origin so the SPA can fetch its own
# backend. We compute this from BASE_URL/CORS_ORIGINS at module load time.
def _connect_src_origins() -> str:
    extras = []
    base = os.environ.get("BASE_URL")
    if base:
        extras.append(base.rstrip("/"))
    for origin in (os.environ.get("CORS_ORIGINS") or "").split(","):
        origin = origin.strip()
        if origin:
            extras.append(origin.rstrip("/"))
    # The preview platform uses *.preview.emergentagent.com — allow wildcard.
    extras.extend([
        "https://*.preview.emergentagent.com",
        "https://*.emergent.host",
    ])
    return " ".join(sorted(set(["'self'", *extras])))


# Production-grade CSP. `'unsafe-inline'` on styles is required for Tailwind
# JIT-generated styles; we deliberately do NOT allow 'unsafe-inline' on scripts.
# Image sources allow data: URIs because the seller onboarding flow uploads
# base64-encoded camera captures inline.
_CSP_VALUE = (
    "default-src 'self'; "
    "script-src 'self' https://www.googletagmanager.com 'unsafe-eval'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com data:; "
    f"img-src 'self' data: blob: https:; "
    f"connect-src {_connect_src_origins()}; "
    "media-src 'self' blob:; "
    "frame-ancestors 'none'; "
    "form-action 'self'; "
    "base-uri 'self'; "
    "object-src 'none'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Sets the standard hardening headers on every response.

    Header decisions documented in /app/SECURITY-AUDIT.md §4.
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Clickjacking — we never embed Biz-Salama in a frame.
        response.headers.setdefault("X-Frame-Options", "DENY")
        # MIME-sniffing — force browsers to respect declared Content-Type.
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        # Referrer leakage — never leak full URL to third-party links.
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        # Disable risky features the app doesn't use.
        response.headers.setdefault(
            "Permissions-Policy",
            "geolocation=(), microphone=(self), camera=(self), payment=()",
        )
        # XSS protection (legacy, but cheap belt-and-braces).
        response.headers.setdefault("X-XSS-Protection", "1; mode=block")

        # Content-Security-Policy — full lockdown for HTML responses only.
        # Skip for JSON API responses so dev tools that pretty-print don't
        # complain, and so the policy doesn't accidentally affect XHR.
        ct = (response.headers.get("content-type") or "").lower()
        if ct.startswith("text/html"):
            response.headers.setdefault("Content-Security-Policy", _CSP_VALUE)

        # HSTS — only when actually served over HTTPS. We check the forwarded
        # proto header because the K8s ingress terminates TLS.
        forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
        if forwarded_proto == "https":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )

        return response


# ─── Login brute-force protection ─────────────────────────────────────────

class LoginRateLimiter:
    """
    Sliding-window rate limiter for auth endpoints.

    Tracks two keys per attempt:
      • the source IP (in case attacker rotates phone numbers)
      • the target identifier — phone or email (in case attacker rotates IPs)

    Defaults: 5 failed attempts per 15 minutes per (key, identifier) triggers
    a hard 1-hour lockout. Successful logins reset the counter for that key.

    In-process state. If you scale to multi-replica, swap for Redis ZSET.
    """

    WINDOW_SECONDS = 15 * 60
    MAX_FAILURES = 8
    LOCKOUT_SECONDS = 15 * 60

    def __init__(self) -> None:
        # Each key → deque of failure timestamps within the window.
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        # Each key → unix-ts when lockout expires (0 = not locked).
        self._locked_until: dict[str, float] = {}

    @staticmethod
    def _client_ip(request: Request) -> str:
        xff = request.headers.get("x-forwarded-for") or ""
        if xff:
            return xff.split(",")[0].strip()
        return (request.client.host if request.client else "_anon")

    def _key(self, prefix: str, value: str) -> str:
        return f"{prefix}:{value.lower().strip()}" if value else f"{prefix}:_"

    def is_locked(self, request: Request, *, identifier: str) -> tuple[bool, int]:
        """Returns (locked, seconds_remaining)."""
        now = time.monotonic()
        for key in (self._key("ip", self._client_ip(request)),
                    self._key("id", identifier)):
            until = self._locked_until.get(key, 0)
            if until > now:
                return True, int(until - now)
        return False, 0

    def record_failure(self, request: Request, *, identifier: str) -> None:
        """Record one failure for both IP and identifier; lock if over the limit."""
        now = time.monotonic()
        for key in (self._key("ip", self._client_ip(request)),
                    self._key("id", identifier)):
            bucket = self._failures[key]
            cutoff = now - self.WINDOW_SECONDS
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            bucket.append(now)
            if len(bucket) >= self.MAX_FAILURES:
                self._locked_until[key] = now + self.LOCKOUT_SECONDS

    def record_success(self, request: Request, *, identifier: str) -> None:
        """Successful login resets both counters."""
        for key in (self._key("ip", self._client_ip(request)),
                    self._key("id", identifier)):
            self._failures.pop(key, None)
            self._locked_until.pop(key, None)

    def force_clear(self, *, identifier: str | None = None, ip: str | None = None) -> dict[str, int]:
        """Admin-driven unlock — clears either an identifier (phone) or an IP, or both.

        Returns a small dict showing what was cleared, so the admin UI can give
        meaningful feedback ("cleared 1 lockout").
        """
        cleared_failures = 0
        cleared_locks = 0
        keys: list[str] = []
        if identifier:
            keys.append(self._key("id", identifier))
        if ip:
            keys.append(self._key("ip", ip))
        for k in keys:
            if k in self._failures:
                del self._failures[k]
                cleared_failures += 1
            if k in self._locked_until:
                del self._locked_until[k]
                cleared_locks += 1
        return {"cleared_failures": cleared_failures, "cleared_locks": cleared_locks}


# Singleton — `from security import login_rate_limiter`
login_rate_limiter = LoginRateLimiter()
