#!/usr/bin/env bash
# Run Lighthouse against a production build of KurimaSense and report
# the PWA / Performance / Accessibility / Best Practices scores.
#
# Usage:   npm run audit:pwa
# Output:  lighthouse-report.html in the repo root
#
# Targets:
#   PWA              = 100   (any deduction blocks ship)
#   Performance      > 90
#   Accessibility    > 95
#   Best Practices   > 90

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL="${LIGHTHOUSE_URL:-http://localhost:3000}"
REPORT_HTML="$ROOT/lighthouse-report.html"
REPORT_JSON="$ROOT/lighthouse-report.json"
PORT="${PORT:-3000}"

echo "==> Building production bundle"
npm run build

echo "==> Starting production server on :$PORT"
PORT="$PORT" npm run start >/tmp/kurimasense-prod.log 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "==> Stopping production server (pid=$SERVER_PID)"
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Poll the server instead of a blind sleep — works even on slow startups.
echo "==> Waiting for server to accept connections"
for i in $(seq 1 30); do
  if curl --silent --fail --max-time 1 "$URL" >/dev/null 2>&1; then
    echo "    server up after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "    server did not respond within 30s — aborting" >&2
    tail -n 50 /tmp/kurimasense-prod.log >&2 || true
    exit 1
  fi
  sleep 1
done

echo "==> Running Lighthouse against $URL"
npx --yes lighthouse "$URL" \
  --only-categories=pwa,performance,accessibility,best-practices \
  --output=html --output=json \
  --output-path="$ROOT/lighthouse-report" \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --quiet

echo
echo "==> Scores"
if [ -f "$REPORT_JSON" ]; then
  node - <<'JS' "$REPORT_JSON"
const fs = require("node:fs");
const path = process.argv[2];
const report = JSON.parse(fs.readFileSync(path, "utf8"));
const targets = {
  pwa: { min: 100, label: "PWA            " },
  performance: { min: 90, label: "Performance    " },
  accessibility: { min: 95, label: "Accessibility  " },
  "best-practices": { min: 90, label: "Best Practices " },
};
let failed = 0;
for (const [key, { min, label }] of Object.entries(targets)) {
  const cat = report.categories?.[key];
  if (!cat) {
    console.log(`${label} (not measured)`);
    continue;
  }
  const score = Math.round((cat.score ?? 0) * 100);
  const verdict = score >= min ? "PASS" : "FAIL";
  if (verdict === "FAIL") failed++;
  console.log(`${label} ${String(score).padStart(3)} / target ≥ ${min}  ${verdict}`);
}
if (failed > 0) {
  console.log(`\n${failed} categor${failed === 1 ? "y" : "ies"} below target — see lighthouse-report.html`);
  process.exit(1);
}
JS
else
  echo "    JSON report missing — see $REPORT_HTML"
  exit 1
fi

echo
echo "HTML report: $REPORT_HTML"
