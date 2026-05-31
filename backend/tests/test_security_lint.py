"""Regression tests for /app/scripts/security_lint.py.

We assert the guard catches the *exact* pattern that leaked OTPs into
backend.err.log before the fix, and that the cleaned-up replacement no
longer trips it. We also smoke-test the production-config scanner.
"""
from __future__ import annotations

import importlib.util
import textwrap
from pathlib import Path

_HERE = Path(__file__).resolve()
_LINT_PATH = _HERE.parents[2] / "scripts" / "security_lint.py"


def _load_lint_module():
    import sys
    if "security_lint" in sys.modules:
        return sys.modules["security_lint"]
    spec = importlib.util.spec_from_file_location("security_lint", _LINT_PATH)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    # Register BEFORE exec so @dataclass can resolve cls.__module__ via
    # sys.modules during decoration.
    sys.modules["security_lint"] = mod
    spec.loader.exec_module(mod)
    return mod


def _write(tmp_path: Path, name: str, body: str) -> Path:
    p = tmp_path / name
    p.write_text(textwrap.dedent(body), encoding="utf-8")
    return p


def test_catches_original_otp_leak_pattern(tmp_path):
    lint = _load_lint_module()
    _write(
        tmp_path,
        "leak.py",
        """
        import logging
        logger = logging.getLogger(__name__)

        def handler(user, otp):
            # The exact pre-fix line from server.py:841
            logger.info(f"Password reset OTP for {user['phone']}: {otp}")
        """,
    )
    findings = lint.run(tmp_path)
    rules = {f.rule for f in findings}
    assert "log-leak" in rules, f"expected log-leak finding, got {rules}"
    assert any(f.severity == "HIGH" for f in findings)


def test_cleaned_log_line_passes(tmp_path):
    lint = _load_lint_module()
    _write(
        tmp_path,
        "clean.py",
        """
        import logging
        logger = logging.getLogger(__name__)

        def handler(user):
            # Post-fix line: only user_id is logged.
            logger.info(f"Password reset OTP generated for user_id={user['user_id']}")
        """,
    )
    findings = [f for f in lint.run(tmp_path) if f.rule == "log-leak"]
    assert findings == [], f"clean code should not trip log-leak: {findings}"


def test_catches_print_of_token(tmp_path):
    _write(
        tmp_path,
        "p.py",
        """
        def f(jwt):
            print(f"debug jwt={jwt}")
        """,
    )
    rules = {f.rule for f in _load_lint_module().run(tmp_path)}
    assert "log-leak" in rules


def test_catches_demo_response_key(tmp_path):
    lint = _load_lint_module()
    _write(
        tmp_path,
        "api.py",
        """
        def forgot_password():
            return {"ok": True, "demo_otp": "123456"}
        """,
    )
    findings = lint.run(tmp_path)
    rules = {f.rule for f in findings}
    assert "demo-key-in-response" in rules


def test_catches_hardcoded_fallback_secret(tmp_path):
    lint = _load_lint_module()
    _write(
        tmp_path,
        "cfg.py",
        """
        import os
        JWT_SECRET = os.environ.get("JWT_SECRET", "dev-fallback-do-not-ship")
        """,
    )
    rules = {f.rule for f in lint.run(tmp_path)}
    assert "hardcoded-fallback-secret" in rules


def test_catches_leftover_prod_marker(tmp_path):
    lint = _load_lint_module()
    _write(
        tmp_path,
        "x.py",
        """
        def f():
            # DEMO ONLY - remove in production!
            return 42
        """,
    )
    findings = lint.run(tmp_path)
    assert any(f.rule == "leftover-prod-marker" for f in findings)


def test_catches_debug_true(tmp_path):
    lint = _load_lint_module()
    _write(tmp_path, "d.py", "DEBUG = True\n")
    rules = {f.rule for f in lint.run(tmp_path)}
    assert "debug-true" in rules


def test_real_backend_has_no_high_findings():
    """End-to-end: the live backend tree must currently be clean."""
    lint = _load_lint_module()
    findings = lint.run(_LINT_PATH.parents[1] / "backend")
    high = [f for f in findings if f.severity == "HIGH"]
    assert high == [], (
        "Backend has HIGH-severity security findings:\n"
        + "\n".join(f"  {f.file}:{f.line}  [{f.rule}]  {f.snippet}" for f in high)
    )
