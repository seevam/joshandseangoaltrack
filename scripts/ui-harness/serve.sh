#!/usr/bin/env bash
# Serves the built harness on :8765 in the background (idempotent).
HERE="$(cd "$(dirname "$0")" && pwd)"
curl -s -o /dev/null http://127.0.0.1:8765/index.html && exit 0
(cd "$HERE/.out" && nohup python3 -m http.server 8765 >/dev/null 2>&1 &)
for _ in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null http://127.0.0.1:8765/index.html && exit 0; sleep 0.3; done
echo "server did not start" >&2; exit 1
