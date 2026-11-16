# Weekly demo

Every Friday at 07:30 (Swiss time), a GitHub Actions workflow builds a visual demo of what changed in
[FestivAR](https://github.com/SwEnt-FestivAR/FestivAR) during the current sprint (Friday 12:00 →
Friday 12:00; Sprint 6 = 13 → 20 Nov 2026) and publishes it to GitHub Pages: new screens, modified
screens (before/after slider), every state and variant (light, dark, font ×1.5), the merged PRs,
and a **demo mode** (floating phone, arrows ← →, a hand that taps the button leading to the next
state). The previous sprint's demo stays one click away, and the page has a dark mode.

**FestivAR is only read, never modified.** The workflow clones it into a temporary folder, copies
a capture test into that clone, runs it, and throws the clone away. Nothing is committed or pushed
to FestivAR.

## How it works

1. `scripts/scan-previews.mjs` finds every `@Preview` without arguments in the FestivAR clone and
   copies the capture test (`capture/WeeklyDemoCapture.kt`) into that clone.
2. The test renders each preview with Robolectric (no emulator, no new dependency: Compose test
   and Robolectric are already in FestivAR) and saves a PNG plus the clickable areas.
3. `scripts/build-sprint.mjs` (helpers in `scripts/lib/`) stores the images on the `data` branch (one copy per distinct image),
   compares them with the previous sprint, fetches the merged PRs and writes `sprints/<id>.json`.
4. `site/` is a static page (plain ES modules, no build step) that reads that data.

Repository layout, data formats and the rules for contributors and AI agents: [AGENTS.md](AGENTS.md).

Only screens that have a `@Preview` appear. All previews in the same file are one screen and
its states (for example `TaskDetailsOpenPreview`, `TaskDetailsDonePreview`).

## Friday run

Automatic, every Friday at 07:30 Swiss time, just before the sprint ends at noon (GitHub may start
it a few minutes late).
Nothing to do by hand.

- Rebuild a sprint: Actions → *Weekly demo* → *Run workflow* (optional date `YYYY-MM-DD` inside it).
- The first run also captures the end of the previous sprint, so the first page already has comparisons.
- Every run is complete (captures included), including runs started by a push to `main`.

Setup, once: Settings → Pages → Source = **GitHub Actions**.

## Tuning the demo mode

`demo.json` (optional), by screen (the file name without `.kt`): `skip`, `order` (preview
function names), `taps` (label of the element the hand should tap from a state) and `notes`
(text shown under the title). Format: [AGENTS.md](AGENTS.md#data-contracts).

## Local preview

```bash
npm install
bash scripts/capture.sh <festivar-clone> origin/main 2026-11-16 history
node scripts/serve.mjs history   # http://localhost:8090
```
