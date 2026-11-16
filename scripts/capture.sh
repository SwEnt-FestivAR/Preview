#!/usr/bin/env bash
# Captures every @Preview of FestivAR at <ref> and records it in the sprint containing <date>.
# The FestivAR folder is a throwaway clone: the capture test is copied into it, never pushed.
# Paths below (weeklydemo test folder, app/build/weekly-demo) match scripts/lib/config.mjs.
# Usage: scripts/capture.sh <festivar-dir> <ref> <date> <history-dir>
set -euo pipefail
FA="$1"; REF="$2"; DATE="$3"; HIST="$4"
HERE="$(cd "$(dirname "$0")/.." && pwd)"

git -C "$FA" checkout -q --force "$REF"
git -C "$FA" clean -fdq app/src/test || true
COMMIT="$(git -C "$FA" rev-parse HEAD)"
echo "::group::Capture $REF ($COMMIT) for sprint of $DATE"
# FestivAR's own unit tests are neither run nor needed: remove them from the clone so Gradle only
# compiles our capture test (Robolectric can only render Compose inside a test).
rm -rf "$FA/app/src/test/java" "$FA/app/src/test/kotlin"
node "$HERE/scripts/scan-previews.mjs" "$FA" "$HERE/previews.json"
# A preview that cannot render only fails its own capture; the others still run. When nothing at
# all was captured (typically Robolectric failing to download its Android jar), show the cause and
# retry once.
for TRY in 1 2; do
  rm -rf "$FA/app/build/weekly-demo"
  (cd "$FA" && ./gradlew :app:testDebugUnitTest --tests 'weeklydemo.*' --continue --no-daemon -q) ||
    echo "Some captures failed (listed on the site)."
  if ls "$FA"/app/build/weekly-demo/*.json > /dev/null 2>&1; then break; fi
  echo "::warning::No capture written (try $TRY). First test failure:"
  grep -h -m1 -A15 "<failure" "$FA"/app/build/test-results/testDebugUnitTest/*.xml 2>/dev/null | head -20 || true
done
node "$HERE/scripts/build-sprint.mjs" --captures "$FA/app/build/weekly-demo" --previews "$HERE/previews.json" \
  --history "$HIST" --date "$DATE" --commit "$COMMIT"
git -C "$FA" checkout -q --force "$REF" -- app/src/test 2>/dev/null || true
git -C "$FA" clean -fdq app/src/test
echo "::endgroup::"
