# Code-Review Allowlist — Biz-Salama

Single source of truth for **what we have decided is not a bug**, even though
some automated scanners flag it. Each entry includes:

1. The pattern the scanner flags.
2. Why it's actually correct.
3. Concrete file:line evidence (so a future reviewer can verify in 30 seconds).
4. What the lint config does about it.

If a future code-quality report flags an item below, dismiss it with a link to
this file. If a report flags something NOT below, it is a genuine finding and
must be triaged.

> **How to run the same checks the team uses:**
> ```
> cd /app/backend && ruff check .         # Python
> cd /app/frontend && yarn build          # TypeScript + ESLint
> ```
> Anything those two commands accept is, by definition, accepted by the team.

---

## Python false positives

### 1. `is None` / `is not None`

**Scanner says:** "Comparison anti-pattern: use `==` instead of `is`."
**Reality:** PEP 8 [explicitly mandates](https://peps.python.org/pep-0008/#programming-recommendations)
`is None`. Using `==` with `None` is wrong because `None`-like objects (e.g. NumPy NaN)
can override `__eq__`.

**Evidence — every flagged line across multiple rounds is `is None`, not `is True/False`:**

| File:line | Actual code |
|---|---|
| `server.py:453` | `return normalize_tz_phone(raw) is not None` |
| `server.py:528, 873` | `if expires_at.tzinfo is None:` |
| `server.py:4074-4082` | 5 lines of `if request.<field> is not None:` |
| `server.py:4414, 5571` | `is None` |
| `ledger.py:167` | `if supplier_cost is None:` |
| `ledger.py:193` | `if res.upserted_id is not None:` |
| `ledger.py:409` | `return existing is not None` |
| `client_errors.py:60` | `if value is None:` (inside `_truncate` guard) |
| `client_errors.py:77` | `sv = str(v) if v is not None else ""` |
| `client_errors.py:246` | `if older_than_days is None:` (signature default check) |

**Lint config:** `E711` remains **enabled** (which is what catches the *real* bug —
`== None`). Ruff correctly distinguishes the two. **If this entry triggers a
fourth time, please point the scanner vendor at this section.**

### 2. `random` in test files

**Scanner says:** "Use `secrets` instead of `random` (security)."
**Reality:** Tests generate unique phone-number suffixes and price jitter. None of
that touches authentication, tokens, or money flows in production.

**Evidence:** Production paths (`server.py`, `kyc.py`, `seller_onboarding.py`) use
`secrets` for OTPs, payment-link tokens, and HMAC keys. `grep -rn "import random" /app/backend/server.py` returns nothing.

**Lint config:** `S311` is in the global ignore list; tests additionally ignore it
via `per-file-ignores`.

### 3. Hardcoded test credentials

**Scanner says:** "Hardcoded secret in `LOGIN_PHONE = '+255712345678'`."
**Reality:** That's the **documented local-dev fixture** in `/app/memory/test_credentials.md`.
Real CI sets `TEST_LOGIN_PHONE` / `TEST_LOGIN_PASSWORD` env vars; the literal is just
a fallback so `pytest` works out of the box.

**Evidence:** All 6 test files now read via `os.environ.get("TEST_LOGIN_PHONE", "+255712345678")`.

**Lint config:** `S105/S106/S107` ignored globally (Pydantic also triggers them on
field defaults that contain the word "password").

### 4. "Possibly undefined variables (11 instances)"

**Scanner says:** "11 undefined variables across the backend."
**Reality:** `ruff check . --select F821,F823` reports **zero**. We
suspect this scanner trips on string interpolation patterns like `f"…{x or ''}"`
that aren't actually unbound.

**Verified false positives (concrete examples surfaced in later rounds):**

| Reported line | Actual code | Why it's safe |
|---|---|---|
| `server.py:3989` — "`update` possibly undefined" | `return {..., "status": update["status"]}` | `update` is assigned in **every** branch of the preceding `if/elif/else` (lines ~3940, 3958, 3972). All paths set it before line 3989. |
| `server.py:4292` — "`update` possibly undefined" | `return {..., "status": update["status"]}` | Same pattern — `update` set in 3 branches at lines 4264, 4272, 4284 covering all `payload.accepted/counter_offer` combinations. |

**Action if flagged again:** Ask the report author for the *exact* execution
path where `update` would be unbound. Ruff's `F823` (local-variable-referenced-
before-assignment) flags real cases; this scanner does not.

---

## TypeScript / React false positives

### 5. Missing hook dependencies (`useEffect`, `useCallback`)

**Scanner says:** "useEffect missing 9+ dependencies including SellerInfo, alive, api, …"
**Reality:** What the scanner counts as "missing" includes:

| Item flagged | Why it's not a real dep |
|---|---|
| `SellerInfo`, `Product` | TypeScript **type** — compile-only, no runtime value. |
| `alive` | Local variable scoped *inside* the effect closure. |
| `api` | Module-level singleton import. Importing it doesn't make it a dep. |
| `setLoading`, `setNotFound`, `setProducts` | React state setters — **guaranteed stable** by React (see [React docs](https://react.dev/reference/react/useState#setstate)). |
| `STORAGE_KEY` | Module-level constant. |

The actual deps (`[id]`, `[limit]`, `[level, q, limit]`) are correct. CRA's built-in
`react-hooks/exhaustive-deps` rule does **not** flag these (only this third-party
scanner does).

**Evidence:** `cd /app/frontend && yarn build` produces no `react-hooks/exhaustive-deps`
warnings for any of the flagged files.

### 6. `localStorage` reads (non-credential)

**Scanner says:** "Insecure localStorage usage."
**Reality:** Each flagged read is non-sensitive:

| File:line | What it stores | Why it's OK |
|---|---|---|
| `i18n/index.tsx:410,420` | Language preference (`"sw"` or `"en"`) | Public UI state, not secret. |
| `clientErrorReporter.ts:59` | Reads `user_id` for tagging events | `user_id` is broadcast publicly via `/api/seller/{id}` and seller profile pages. |
| `BuildBadge.tsx:28` | Reads `biz_debug=1` flag | Dev-only debug gate, no credentials. |

The **auth token** is stored via Zustand `persist` under the key `biz-salama-auth`.
Migrating that to HttpOnly cookies is tracked as a P2 task and requires a full
backend session-cookie refactor.

### 7. "Oversized components"

**Scanner says:** "`LandingPage.tsx` is 522 lines — split it."
**Reality:** Landing pages and 3-party wizards are visually dense. Mechanical line-
count splits create one-shot helper components that aren't reused anywhere — net
negative for maintainability. We split when real reuse boundaries emerge.

---

## How to add a new entry

1. Confirm the false positive (run `ruff check` / `yarn build` to verify the
   linters we trust don't flag it).
2. Add a row above with file:line evidence.
3. If applicable, add a `ruff.toml` ignore rule with a comment pointing here.

Last reviewed: **Feb 19, 2026**.
