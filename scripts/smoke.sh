#!/usr/bin/env bash
# Smoke-test the key public API endpoints. Use after every backend deploy or
# refactor; prints PASS / FAIL per endpoint.
set -euo pipefail
URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)

check() {
  local name=$1 path=$2 jq_expr=$3 expect=$4
  local actual
  if [[ "$path" == "/api/client-errors" ]]; then
    actual=$(curl -s -X POST "$URL$path" \
      -H "Content-Type: application/json" \
      -d '{"level":"debug","message":"smoke-check ping","url":"smoke-test"}' \
      | python3 -c "import sys,json; d=json.load(sys.stdin); print($jq_expr)" 2>/dev/null || echo "ERR")
  else
    actual=$(curl -s "$URL$path" | python3 -c "import sys,json; d=json.load(sys.stdin); print($jq_expr)" 2>/dev/null || echo "ERR")
  fi
  if [[ "$actual" == "ERR" ]] || [[ -z "$actual" ]]; then
    printf "  %-26s %s\n" "$name" "FAIL (no response)"
    return 1
  fi
  if [[ "$expect" == "any" ]] || (( actual >= expect )); then
    printf "  %-26s PASS (%s)\n" "$name" "$actual"
  else
    printf "  %-26s FAIL (got %s, want >= %s)\n" "$name" "$actual" "$expect"
    return 1
  fi
}

echo "Biz-Salama API smoke @ $URL"
echo "─────────────────────────────────────────────"
check "GET /products/public"        "/api/products/public?limit=3"            "d['count']"                          1
check "GET /products/voice-listed"  "/api/products/voice-listed?limit=3"      "len(d.get('products',[]))"           0
check "GET /sellers/trending"       "/api/sellers/trending?limit=3"           "len(d.get('sellers',[]))"            0
check "GET /onboarding/required"    "/api/onboarding/seller/required-docs"    "len(d.get('required',[]))"           5
check "POST /client-errors"         "/api/client-errors"                      "1 if d.get('accepted') else 0"       1
echo "─────────────────────────────────────────────"
echo "Done."
