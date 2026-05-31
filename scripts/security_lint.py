#!/usr/bin/env python3
"""
Biz-Salama security & production-config CI guard.

Runs two scanners over the backend source tree and exits non-zero on any
HIGH-severity finding. Intended for use both locally (pre-commit) and in
CI (GitHub Actions / GitLab CI).

Scanner 1 — Log-leak detector
    Catches any logger.* / print() call that interpolates a sensitive
    identifier (otp, password, token, secret, nin, pin, jwt, api_key,
    bcrypt hash, session_token) into its message.

Scanner 2 — Production-config safety
    a) `demo_*` keys in JSON responses without an env gate.
    b) Hardcoded fallback secrets, e.g. os.environ.get("X", "default").
    c) Leftover `# remove in production` / `# DEMO ONLY` markers.
    d) DEBUG = True at module scope.

Allow-list lives in `LOG_LEAK_ALLOWED` / `PROD_SAFE_ALLOWED` below — add
file:line entries with a short justification when you intentionally need
to keep a flagged line (e.g. a docstring example).

Usage:
    python3 scripts/security_lint.py                # default: /app/backend
    python3 scripts/security_lint.py path/to/src    # scan a specific tree
    python3 scripts/security_lint.py --json         # machine-readable output

Exit codes:
    0 — no HIGH findings
    1 — at least one HIGH finding
    2 — script invocation error
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path

# ─────────────────────────── Configuration ──────────────────────────────

DEFAULT_SCAN_ROOT = Path(__file__).resolve().parent.parent / "backend"
EXCLUDE_DIRS = {"__pycache__", "tests", ".venv", "node_modules", ".git"}

# Sensitive identifiers — case-insensitive whole-word match in interpolation.
# Keep this list tight; broad terms (e.g. "auth") cause false positives.
SENSITIVE_TERMS = (
    "otp",
    "password",
    "passwd",
    "secret",
    "api_key",
    "apikey",
    "session_token",
    "reset_token",
    "jwt",
    "bearer",
    "nin",
    "pin",
    "private_key",
    "bcrypt_hash",
)

# logger.{level}(  OR  print(   — we match the call anywhere on the line, then
# search the rest of the line for an f-string interpolation of a sensitive name.
# Using a wide msg regex breaks on f-strings like f"...{user['phone']}..." which
# contain inner quotes — so we just confirm "is this a log/print call?" and then
# scan the full line for sensitive interpolation.
LOG_CALL_RE = re.compile(
    r"(?:(?:logger|log|logging|_logger)\.(?:debug|info|warning|warn|error|exception|critical)|^[^#]*\bprint)\s*\("
)
SENSITIVE_INTERP_RE = re.compile(
    r"\{[^}]*\b(?:" + "|".join(SENSITIVE_TERMS) + r")\b[^}]*\}",
    re.IGNORECASE,
)

# Scanner 2 patterns
DEMO_KEY_RE = re.compile(r'["\'](demo_[a-z_]+)["\']\s*:')
FALLBACK_SECRET_RE = re.compile(
    r"""os\.environ\.get\(\s*['"](?:[A-Z_]*(?:SECRET|KEY|TOKEN|PASSWORD|PASS|JWT|API)[A-Z_]*)['"]
        \s*,\s*
        ['"](?P<fallback>[^'"]{4,})['"]
    """,
    re.VERBOSE,
)
LEFTOVER_MARKER_RE = re.compile(
    r"#\s*(?:remove\s+in\s+production|demo\s+only|DEMO\s+ONLY|FIXME\s*:\s*prod|TODO\s*:\s*prod)",
    re.IGNORECASE,
)
DEBUG_TRUE_RE = re.compile(r"^\s*DEBUG\s*=\s*True\b")

# File:line allow-list (rare, only when truly needed)
LOG_LEAK_ALLOWED: set[tuple[str, int]] = set()
PROD_SAFE_ALLOWED: set[tuple[str, int]] = {
    # demo_otp is gated on AT_API_KEY being unset; documented in PRD.md.
    # The runtime startup check `_assert_prod_safety()` in server.py refuses
    # to boot in ENV=production without AT_API_KEY, so this can never trigger
    # in prod.
    ("server.py", 871),
}

# ───────────────────────────── Data types ───────────────────────────────


@dataclass
class Finding:
    file: str
    line: int
    severity: str  # "HIGH" | "MEDIUM" | "LOW"
    rule: str
    snippet: str
    message: str


# ───────────────────────────── Scanners ─────────────────────────────────


def iter_py_files(root: Path):
    for p in root.rglob("*.py"):
        if any(part in EXCLUDE_DIRS for part in p.parts):
            continue
        yield p


def scan_log_leaks(path: Path) -> list[Finding]:
    out: list[Finding] = []
    text = path.read_text(encoding="utf-8", errors="replace")
    for lineno, line in enumerate(text.splitlines(), start=1):
        if (path.name, lineno) in LOG_LEAK_ALLOWED:
            continue
        m = LOG_CALL_RE.search(line)
        if not m:
            continue
        if not SENSITIVE_INTERP_RE.search(line):
            continue
        out.append(
            Finding(
                file=str(path),
                line=lineno,
                severity="HIGH",
                rule="log-leak",
                snippet=line.strip()[:160],
                message=(
                    "Log/print call appears to interpolate a sensitive value "
                    "(otp/password/token/secret/jwt/nin/pin/api_key). "
                    "Log identifiers (user_id) only — never credentials."
                ),
            )
        )
    return out


def scan_prod_safety(path: Path) -> list[Finding]:
    out: list[Finding] = []
    text = path.read_text(encoding="utf-8", errors="replace")
    for lineno, line in enumerate(text.splitlines(), start=1):
        if (path.name, lineno) in PROD_SAFE_ALLOWED:
            continue

        # a) demo_* response keys
        m = DEMO_KEY_RE.search(line)
        if m:
            out.append(
                Finding(
                    file=str(path),
                    line=lineno,
                    severity="HIGH",
                    rule="demo-key-in-response",
                    snippet=line.strip()[:160],
                    message=(
                        f"Response field '{m.group(1)}' must be gated on a "
                        "non-production env var or stripped before deploy."
                    ),
                )
            )

        # b) hardcoded fallback secret in os.environ.get(...)
        m = FALLBACK_SECRET_RE.search(line)
        if m and m.group("fallback") not in {"", "None"}:
            out.append(
                Finding(
                    file=str(path),
                    line=lineno,
                    severity="HIGH",
                    rule="hardcoded-fallback-secret",
                    snippet=line.strip()[:160],
                    message=(
                        "os.environ.get(...) has a hardcoded fallback for a "
                        "secret/key/token. Omit the default so missing config "
                        "fails fast at boot."
                    ),
                )
            )

        # c) leftover production markers
        if LEFTOVER_MARKER_RE.search(line):
            out.append(
                Finding(
                    file=str(path),
                    line=lineno,
                    severity="MEDIUM",
                    rule="leftover-prod-marker",
                    snippet=line.strip()[:160],
                    message=(
                        "Comment indicates this code must change before "
                        "production. Resolve or remove the marker."
                    ),
                )
            )

        # d) DEBUG = True at module scope
        if DEBUG_TRUE_RE.match(line):
            out.append(
                Finding(
                    file=str(path),
                    line=lineno,
                    severity="HIGH",
                    rule="debug-true",
                    snippet=line.strip()[:160],
                    message="DEBUG=True at module scope is unsafe in production.",
                )
            )
    return out


# ───────────────────────────── Runner ───────────────────────────────────


def run(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    for f in iter_py_files(root):
        findings.extend(scan_log_leaks(f))
        findings.extend(scan_prod_safety(f))
    return findings


def format_human(findings: list[Finding]) -> str:
    if not findings:
        return "OK — 0 findings. Backend is clean.\n"
    lines = []
    by_sev = {"HIGH": [], "MEDIUM": [], "LOW": []}
    for f in findings:
        by_sev[f.severity].append(f)
    for sev in ("HIGH", "MEDIUM", "LOW"):
        items = by_sev[sev]
        if not items:
            continue
        lines.append(f"\n{sev}  ({len(items)} finding{'s' if len(items) != 1 else ''})")
        lines.append("-" * 64)
        for f in items:
            rel = os.path.relpath(f.file, start=str(DEFAULT_SCAN_ROOT.parent))
            lines.append(f"  {rel}:{f.line}  [{f.rule}]")
            lines.append(f"    > {f.snippet}")
            lines.append(f"    → {f.message}")
    lines.append("")
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "root", nargs="?", default=str(DEFAULT_SCAN_ROOT), help="Root dir to scan."
    )
    parser.add_argument("--json", action="store_true", help="Machine-readable output.")
    args = parser.parse_args(argv)

    root = Path(args.root)
    if not root.exists():
        print(f"error: scan root does not exist: {root}", file=sys.stderr)
        return 2

    findings = run(root)
    if args.json:
        print(json.dumps([asdict(f) for f in findings], indent=2))
    else:
        print(format_human(findings))

    return 1 if any(f.severity == "HIGH" for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
