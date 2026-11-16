#!/usr/bin/env bash
# Captures every @Preview of FestivAR at <ref> and records it as the week ending at <date>.
# The FestivAR folder is a throwaway clone: the capture test is copied into it, never pushed.
# Usage: scripts/capture.sh <festivar-dir> <ref> <date> <history-dir>
set -euo pipefail
FA="$1"; REF="$2"; DATE="$3"; HIST="$4"
HERE="$(cd "$(dirname "$0")/.." && pwd)"

git -C "$FA" checkout -q --force "$REF"
git -C "$FA" clean -fdq app/src/test/java/weeklydemo || true
COMMIT="$(git -C "$FA" rev-parse HEAD)"
echo "::group::Capture $REF ($COMMIT) as week of $DATE"
node "$HERE/scripts/scan-previews.mjs" "$FA" "$HERE/previews.json"
rm -rf "$FA/app/build/weekly-demo"
# A preview that cannot render only fails its own capture; the others still run.
(cd "$FA" && ./gradlew :app:testDebugUnitTest --tests 'weeklydemo.*' --continue --no-daemon -q) || echo "Some captures failed (listed on the site)."
node "$HERE/scripts/build-week.mjs" --captures "$FA/app/build/weekly-demo" --previews "$HERE/previews.json" \
  --history "$HIST" --date "$DATE" --commit "$COMMIT"
git -C "$FA" clean -fdq app/src/test/java/weeklydemo
echo "::endgroup::"
