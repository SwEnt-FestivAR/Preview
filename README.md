# Weekly demo

Every Friday, a GitHub Actions workflow builds a visual demo of what changed in
[FestivAR](https://github.com/SwEnt-FestivAR/FestivAR) this week and publishes it to GitHub Pages:
new screens, modified screens (before/after slider), every state and variant (light, dark,
font ×1.5, tablet), the merged PRs, and a **demo mode** (floating phone, arrows ← →, a hand that
taps the button leading to the next state).

**FestivAR is only read, never modified.** The workflow clones it into a temporary folder, copies
a capture test into that clone, runs it, and throws the clone away. Nothing is committed or pushed
to FestivAR.

## How it works

1. `scripts/scan-previews.mjs` finds every `@Preview` without arguments in the FestivAR clone and
   generates `capture/WeeklyDemoCapture.kt` inside that clone.
2. The test renders each preview with Robolectric (no emulator, no new dependency: Compose test
   and Robolectric are already in FestivAR) and saves a PNG plus the clickable areas.
3. `scripts/build-week.mjs` stores the images on the `data` branch (one copy per distinct image),
   compares them with last week, fetches the merged PRs and writes `weeks/<id>.json`.
4. `site/` is a static page that reads that data.

Only screens that have a `@Preview` appear. All previews in the same file are one screen and
its states (for example `TaskDetailsOpenPreview`, `TaskDetailsDonePreview`).

## Weekly run

Automatic, Friday around noon (Swiss time). Nothing to do by hand.

- Rebuild a week: Actions → *Weekly demo* → *Run workflow* (optional date `YYYY-MM-DD`).
- The first run also captures the week before, so the first page already has comparisons.
- Changing only `site/` or `demo.json` republishes without recapturing.

Setup, once: Settings → Pages → Source = **GitHub Actions**.

## Tuning the demo mode

`demo.json` (optional), by screen (the file name without `.kt`): `skip`, `order` (preview
function names), `taps` (label of the element the hand should tap from a state) and `notes`
(text shown under the title).

## Local preview

```bash
npm install
bash scripts/capture.sh <festivar-clone> origin/main 2026-11-16 history
node scripts/serve.mjs history   # http://localhost:8090
```
