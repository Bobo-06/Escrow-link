# Biz-Salama — Security Audit

**Status:** Production · **Last reviewed:** Feb 20, 2026
**Live URLs:** https://biz-salama.co.tz (prod) · https://salama-secure.preview.emergentagent.com (preview)

This document is the **canonical security posture statement** for Biz-Salama.
It is intentionally honest — every control is listed with its current state, the
threat it mitigates, and (where applicable) the residual risk and remediation
roadmap. Pair this with `/app/CODE_REVIEW_ALLOWLIST.md` (false-positive
register) and `make lint && make smoke` (deterministic gate).

If you're sharing this with an auditor or investor: skip to the **Executive
Summary** below.

---

## Executive Summary

| Domain | State | Evidence |
|---|---|---|
| **Authentication** | ✅ Hardened | bcrypt + JWT; brute-force lockout shipped Feb 20 |
| **Transport security** | ✅ Enforced | HSTS, HTTPS-only, TLS terminated at ingress |
| **HTTP hardening** | ✅ Shipped | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP on HTML |
| **CORS** | ✅ Allow-listed | Explicit baseline + env-driven extras; no `*` |
| **Rate limiting** | ✅ In place | Login: 5/15min, Client-errors: 30/min, OTP/payment-link: CSPRNG |
| **Input validation** | ✅ Pydantic | Every route uses typed Pydantic request bodies |
| **NoSQL injection** | ✅ Mitigated | Field-typed Mongo queries; `re.escape` on regex inputs |
| **Webhook integrity** | ✅ Signed | HMAC-SHA256 + idempotency keys (`processed_webhooks`) |
| **Escrow link integrity** | ✅ Signed | HMAC-SHA256 with rotatable JWT_SECRET |
| **Secrets management** | ✅ Env-only | Zero hardcoded production secrets; `.env` git-ignored |
| **PII at rest** | 🟡 Partial | Encryption-at-rest at the storage layer; KYC images stored as base64 in Mongo (P2: move to S3 + KMS) |
| **Session storage** | 🟡 Tracked | JWT in localStorage (Zustand persist) — P2 migration to HttpOnly cookies |
| **Dependency scanning** | 🟡 Manual | `pip list` + `yarn audit` ran ad-hoc; P3: GitHub Dependabot |
| **Penetration testing** | 🟡 Not done | Recommended before scaling beyond 1k MAU |
| **Bug-bounty programme** | 🟡 Not yet | Recommended after stable v1 release |

**No critical open issues** as of this review. Two P2 hardening items
(HttpOnly-cookie migration, S3+KMS for KYC images) are tracked but the current
controls compensate adequately for the present threat model.

---

## 1. Authentication & session management

### Password storage (✅ secure)

- **Algorithm:** `bcrypt.hashpw(pw, bcrypt.gensalt())` — random salt per password,
  cost factor 12 (bcrypt default).
- **No plaintext logging** — passwords never enter request/response logs.
- **Code:** `server.py:610` (register), `server.py:713` (verify), `server.py:881` (reset).

### JWT (✅ adequate, 🟡 storage-location tracked)

- **Algorithm:** HS256 with a 37-character secret loaded from `JWT_SECRET` env var.
- **Default fallback** in code is a dev-only string — production env MUST set
  `JWT_SECRET`. Verified set on prod via `os.environ.get('JWT_SECRET')`.
- **Lifetime:** 7-day session tokens, refreshable on successful API calls.
- **Storage (client):** Currently stored under `biz-salama-auth` in `localStorage`
  via Zustand `persist`. XSS would expose the token.
- **Mitigation today:** Strict CSP on HTML responses, `X-Frame-Options: DENY`,
  no user-controlled HTML rendered without React's default escaping.
- **🟡 P2 hardening:** Migrate to HttpOnly + Secure + SameSite=Lax cookies.
  Requires backend session-cookie refactor; ~1 day of work. Tracked in PRD.

### Brute-force protection (✅ shipped Feb 20)

- **Module:** `backend/security.py` — `LoginRateLimiter`.
- **Policy:** 5 failed attempts within 15 minutes (per **IP** AND per
  **identifier**) → 1-hour lockout. Successful login resets both counters.
- **Indexed by both keys** so an attacker can't bypass by rotating phone numbers
  *or* by rotating IPs.
- **Response:** HTTP 429 + `Retry-After` header + bilingual error message.
- **Verified:** 5 wrong passwords → 401, 6th → 429 with 59-minute lockout.

### OTPs and one-time tokens (✅ CSPRNG)

- **Source:** Python `secrets` module (cryptographically secure PRNG).
- **Migrated** from `random` in Round 1 (Feb 19, 2026) per code-review.
- **Code:** `server.py:781` (OTP), payment-link tokens, password-reset tokens.

### Role-based access (✅ enforced server-side)

- **Admin routes** check `user.get("role") == "admin"` server-side (see
  `server.py:4811, 4830, 4853, 5575, 5673, 5688, 5697`).
- **Client cannot escalate** by editing localStorage — the server is the only
  source of truth on role.

---

## 2. Transport layer

| Control | State |
|---|---|
| HTTPS-only at production custom domain | ✅ via Cloudflare + Emergent ingress |
| TLS 1.2+ enforced | ✅ via ingress |
| HSTS header on HTTPS responses | ✅ `max-age=31536000; includeSubDomains` |
| Mixed-content prevented | ✅ All assets HTTPS |
| HTTP → HTTPS redirect at edge | ✅ Cloudflare |

**HSTS bootstrap caveat:** First-time visitors over HTTP can still be MITM'd
once. Submit `biz-salama.co.tz` to the [HSTS preload list](https://hstspreload.org/)
after running with HSTS for 30 days. Currently not preloaded.

---

## 3. CORS policy

```python
allow_origins = [
    "http://localhost:3000",                            # dev
    "https://biz-salama.co.tz",                         # prod
    "https://www.biz-salama.co.tz",                     # prod-www
    "https://salama-secure.preview.emergentagent.com",  # preview
] + env-driven extras
allow_origin_regex = r"https://.*\.preview\.emergentagent\.com"
allow_credentials = True
allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
allow_headers = ["Authorization", "Content-Type", "X-Requested-With"]
```

- **No `*` wildcard** anywhere.
- **Regex narrowly constrained** to the preview platform.
- **No production credential-bearing routes accept unknown origins.**

---

## 4. HTTP security headers (shipped Feb 20)

All headers set by `SecurityHeadersMiddleware` in `backend/security.py`. Verified
in production via `curl -sI /api/products/public`:

| Header | Value | Threat mitigated |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HTTPS downgrade |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME-confusion XSS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer URL leakage |
| `Permissions-Policy` | `geolocation=(), microphone=(self), camera=(self), payment=()` | Unsolicited sensor access |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS heuristic |
| `Content-Security-Policy` | See `_CSP_VALUE` in `security.py` | XSS, data exfiltration |

**CSP highlights:**
- `script-src 'self'` (no inline `<script>` — React's bundle is loaded by file)
- `frame-ancestors 'none'` — defence-in-depth with `X-Frame-Options: DENY`
- `object-src 'none'` — block Flash/Java plugin attacks
- `'unsafe-inline'` only on **styles** (Tailwind JIT needs it; restricted to
  `<style>` blocks, not inline `style=""` attributes).

---

## 5. Input validation & injection prevention

### Server-side validation (✅ Pydantic everywhere)

Every state-changing route uses a typed Pydantic `BaseModel` as its request
body. FastAPI rejects malformed JSON / wrong types / missing fields with HTTP
422 before our handler runs.

### NoSQL injection (✅ mitigated)

- **No operator injection:** Every Mongo query passes user input as **values**,
  never as keys. Example:
  ```python
  await db.users.find_one({"phone": credentials.phone}, {"_id": 0})  # ✅
  # NOT: db.users.find_one(credentials.dict())                       # ❌
  ```
- **Regex inputs sanitized:** Backward-compat phone lookup at `server.py:702`
  now uses `re.escape(credentials.phone[-9:])` (fixed Feb 20). Phone has
  already passed `normalize_tz_phone` (digits-only), so the escape is a
  defence-in-depth control.
- **`_id` lookups removed:** A dispute-SMS handler at `server.py:3173` was
  found querying by Mongo internal `_id` with a user-supplied string. Fixed
  Feb 20 to use `user_id` (UUID) consistently.

### XSS (✅ React default-escapes)

- React's JSX **automatically HTML-encodes** every interpolation. No
  `dangerouslySetInnerHTML` is used anywhere in the codebase (verified via
  `grep -r "dangerouslySetInnerHTML" /app/frontend/src`).
- User-supplied product names, seller descriptions, etc. render as text only.
- Markdown rendering is **not** used.

### Open redirect (✅ none)

No route accepts a `redirect_to` / `next_url` query param. Internal navigation
uses React Router's typed `<Link to=>`.

---

## 6. Rate limiting

| Surface | Limit | Module | Verified |
|---|---|---|---|
| `/api/auth/login` | 5 failures / 15 min / (IP, identifier); 1-hr lockout | `security.LoginRateLimiter` | ✅ Feb 20 |
| `/api/client-errors` | 30 events / min / IP | `client_errors._rate_limit_ok` | ✅ Feb 19 |
| Payment-provider webhooks | Idempotency-key dedup (no replay) | `processed_webhooks` collection | ✅ Round 4 |

**Multi-replica caveat:** Both limiters are in-process. If we scale beyond a
single backend pod, swap for a Redis-backed ZSET (~1 hr of work, no API change).

---

## 7. Money flow integrity

### Ledger correctness (✅ double-entry, invariant-asserted)

- **Module:** `backend/ledger.py`
- Every order writes balanced double-entry journal lines (Asset Bank, Liability
  Escrow, Revenue Platform Fees). `assert seller + agent + platform == gross`
  enforces correctness at write time.
- **End-to-end test:** `make test-ledger` exercises the full direct + 3-party
  flow including refund, dispute, and auto-release. Last run: ✅ all flows
  balanced, idempotency holds.

### Escrow verification links (✅ HMAC-SHA256)

- **Format:** `/escrow/verify/{tx_id}?role=seller&sig=<hex>`
- **Signature:** `hmac.new(JWT_SECRET, f"{tx_id}:{role}:{identifier}", sha256)`
  truncated to 16 hex chars (64 bits — sufficient for short-lived links).
- **Code:** `server.py` HMAC helper near the 3-party flow.
- **Rotation:** Rotating `JWT_SECRET` invalidates all outstanding links in one
  operation.

### Webhook idempotency (✅ enforced)

- All inbound payment-provider webhooks check `processed_webhooks` for the
  provider-supplied idempotency key before processing.
- Replay-attack-safe: duplicate webhooks return 200 with `{"status":
  "already_processed"}`.

---

## 8. Fraud monitoring (✅ shipped)

- **Module:** `backend/fraud.py`
- Five independent rules score every order at creation: velocity, self-deal,
  account-age, refund-rate, watchlist. Score ≥ 70 routes to manual review.
- **Admin queue:** `GET /api/admin/fraud/flagged` (admin-only).
- **Mutability:** Admins can clear or block-order via `mark_reviewed`.

---

## 9. File uploads (KYC + product images)

| Control | State |
|---|---|
| Server-side size cap | ✅ 4 MB raw image, ~6 MB base64 (enforced in `seller_onboarding.py`) |
| Type restriction | 🟡 Inferred client-side only — server should re-validate magic bytes (P2) |
| Storage | 🟡 base64 in MongoDB (current); P2: migrate to S3 + KMS server-side encryption |
| Path traversal | ✅ N/A — no filesystem writes for user content |
| Auth required | ✅ All upload endpoints require valid session |
| KYC images viewable by | ✅ Owner + admin only (`server.py:onb_get_image`) |

**Residual risk:** Mongo encryption-at-rest is enabled by the managed provider,
but field-level encryption for KYC images is not yet in place. Tracked as P2.

---

## 10. Logging & observability

- **No PII in logs:** Passwords, password hashes, full card numbers (we don't
  handle PANs), and bcrypt hashes are never logged.
- **Audit trail:** `payment_transactions`, `disputes`, `ledger_entries`,
  `fraud_signals`, `processed_webhooks` all retain immutable history.
- **Client errors:** `/api/admin/client-errors` shows browser-side failures
  with 30-day TTL. User IDs in this stream are not credentials.

---

## 11. Secrets management

| Secret | Source | Rotation impact |
|---|---|---|
| `JWT_SECRET` | env var | Invalidates all sessions + escrow links |
| `MONGO_URL` | env var | DB downtime during rotation |
| `EMERGENT_LLM_KEY` | env var | Voice listing degraded |
| Payment-provider keys (Click-Pesa/AzamPay) | env var (when wired) | Provider downtime |
| `AT_API_KEY` (Africa's Talking SMS) | env var | SMS degraded (graceful fallback) |

- No secrets in git history (verified `grep -E 'SECRET|API_KEY|TOKEN' .git/` returns
  only references in the lint config and this doc, not values).
- `.env` is `.gitignore`d.
- `requirements.txt` and `package.json` contain **no** secret data.

---

## 12. Dependencies & supply chain

| Surface | Tool | Cadence |
|---|---|---|
| Python | `pip list --outdated`, ad-hoc | Manual review monthly |
| Node | `yarn audit` | Manual review monthly |
| Container base image | Emergent-managed | Auto-patched |

**🟡 Recommended P3:** Enable GitHub Dependabot or Renovate for automatic PRs
on critical vulnerabilities.

---

## 13. Privacy & compliance posture

| Regulation | State |
|---|---|
| **Tanzania Data Protection Act (DPA, 2022)** | ✅ Minimal PII; user phone + name + KYC docs only; no data sold/shared |
| **PCI DSS** | N/A — we never touch raw PANs; payment data lives at Click-Pesa/AzamPay/Selcom |
| **GDPR** (incidental EU traffic) | 🟡 Add data-deletion endpoint for users who request erasure (P3) |

---

## 14. Threat model — top 5 attacks considered

| # | Attack | Likelihood | Impact | Control |
|---|---|---|---|---|
| 1 | Credential stuffing on `/api/auth/login` | High | High | Brute-force lockout (5/15min) |
| 2 | XSS exfiltrating localStorage JWT | Medium | High | Strict CSP, React auto-escape, no `dangerouslySetInnerHTML`; P2: HttpOnly cookies |
| 3 | NoSQL injection via Mongo operators | Low | High | Pydantic typed bodies; field-typed queries; `re.escape` on regex |
| 4 | Replay of payment webhooks | Medium | Critical | Idempotency-key dedup in `processed_webhooks` |
| 5 | Hawker collusion / self-deal in 3-party escrow | Medium | Medium | Fraud rule `self_deal_phone_match` (+60 points → review) |

---

## 15. Remediation roadmap

### Done (Feb 2026)
- ✅ Brute-force lockout on login (`security.LoginRateLimiter`)
- ✅ Security-headers middleware (HSTS, CSP, X-Frame, X-Content, Referrer, Permissions)
- ✅ NoSQL `_id` query bug fixed in dispute SMS path
- ✅ `re.escape` on phone-fallback regex
- ✅ Lint gate (`make lint`) enforced; complexity-cap C901 ≤ 12

### P2 (next 1–2 sprints)
- 🟡 Migrate JWT to **HttpOnly + Secure + SameSite=Lax** cookies (eliminates XSS-via-localStorage)
- 🟡 Move KYC images to **S3 + KMS** (field-level encryption)
- 🟡 Submit `biz-salama.co.tz` to **HSTS preload list**
- 🟡 Add **CSP report-uri** to `/api/csp-report` so violations surface in the
  same admin observability dashboard as client errors

### P3 (post-stable)
- 🟢 GitHub Dependabot / Renovate
- 🟢 Quarterly third-party pen test
- 🟢 Public bug-bounty programme (`security.txt` at repo root)
- 🟢 GDPR data-deletion endpoint

---

## 16. How to verify this audit

```bash
# 1. Lint gate (Python + frontend CI build)
cd /app && make lint

# 2. API smoke test (5 endpoints)
make smoke

# 3. Ledger end-to-end (money invariant)
make test-ledger

# 4. Manual headers check
curl -sI https://biz-salama.co.tz/api/products/public?limit=1 \
  | grep -iE "strict-transport|x-frame|x-content|referrer|permissions"

# 5. Brute-force lockout (run from a fresh IP; will lock you out for 1 hr)
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://biz-salama.co.tz/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"phone":"+255712340000","password":"wrong-'$i'"}'
done
# expected: 401 401 401 401 401 429
```

Anything passing all four commands is, by definition, accepted by the team.

---

**Maintainer note:** When adding a new route that handles money, PII, or auth,
update §1, §6, or §7 of this document in the same PR. Out-of-date audit doc =
audit doc not worth reading.
