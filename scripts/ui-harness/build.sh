#!/usr/bin/env bash
# UI harness: renders the real pages in Chromium with Clerk, routing and the
# API mocked, so layout and behaviour can be checked without keys or a DB.
#
#   bash scripts/ui-harness/build.sh          # bundle + CSS into .out/
#   bash scripts/ui-harness/serve.sh          # http://127.0.0.1:8765/index.html#/home
#   node scripts/ui-harness/scan.mjs          # text-overflow + sideways-scroll scan
#
# Needs devDependencies: esbuild, playwright. Chromium comes from
# PLAYWRIGHT_BROWSERS_PATH or /opt/pw-browsers/chromium.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
OUT="$HERE/.out"
mkdir -p "$OUT"

npx --no-install esbuild "$HERE/entry.tsx" --bundle --outfile="$OUT/bundle.js" --format=esm --jsx=automatic \
  --alias:@clerk/nextjs="$HERE/mocks/clerk.tsx" \
  --alias:next/navigation="$HERE/mocks/navigation.ts" \
  --alias:next/link="$HERE/mocks/link.tsx" \
  --alias:next/image="$HERE/mocks/image.tsx" \
  --alias:@="$ROOT" \
  --define:process.env.NODE_ENV='"production"' \
  --define:process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID='"harness.apps.googleusercontent.com"' \
  --log-level=warning

(cd "$ROOT" && npx --no-install tailwindcss -i app/globals.css -o "$OUT/app.css" 2>/dev/null)

ln -sfn "$ROOT/public/rank-emblems" "$OUT/rank-emblems"
ln -sfn "$ROOT/public/achievement-badges" "$OUT/achievement-badges"

cat > "$OUT/index.html" <<'HTML'
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="app.css">
<style>:root{--font-sans:"Space Grotesk",system-ui,sans-serif;--font-display:"Bebas Neue",Impact,sans-serif}</style>
</head><body><div id="root"></div><script type="module" src="bundle.js"></script></body></html>
HTML

# The real fonts, so measurements match production. Best effort: without
# network the fallbacks are used and widths are approximate.
if [ ! -s "$OUT/fonts.css" ]; then
  curl -s --max-time 10 -H "User-Agent: Mozilla/5.0 Chrome/120" \
    "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&display=swap" \
    -o "$OUT/fonts.css" || true
  for u in $(grep -o "https://fonts.gstatic.com[^)]*" "$OUT/fonts.css" 2>/dev/null | sort -u); do
    f="$(basename "$u")"; curl -s --max-time 10 "$u" -o "$OUT/$f" && sed -i "s#$u#$f#g" "$OUT/fonts.css"
  done
fi
echo "built → $OUT"
