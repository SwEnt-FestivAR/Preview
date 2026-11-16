# AGENTS.md

Guide for anyone (human or AI agent) changing this repository. Read it before editing.

## What this repo does

Every Friday at 07:30 Swiss time, a GitHub Actions workflow builds a visual weekly demo of
[FestivAR](https://github.com/SwEnt-FestivAR/FestivAR) (Android, Kotlin, Jetpack Compose) and
publishes it to GitHub Pages:

- every `@Preview` of the app is rendered to PNG with Robolectric (no emulator), in several
  variants (light, dark, font ×1.5, tablet);
- the captures are compared with last week: new screens, changed screens (with a before/after
  slider), unchanged screens;
- the merged pull requests of the week are listed and linked to the screens they touched;
- a **demo mode** shows the screens on a floating phone, state after state, with a hand that taps
  the element leading to the next state.

## Golden rules

1. **FestivAR is read-only.** Never commit, push, open a PR or add a file, dependency or setting
   to FestivAR to make this repo work. The workflow clones it into a temporary folder, copies the
   capture test into that clone, runs it, and throws the clone away. Anything the demo needs must
   live here.
2. **No new dependency in the capture test.** It only uses what FestivAR already has (Compose UI
   test, Robolectric). Adding a Gradle plugin or library would need a change to FestivAR.
3. **Only screens with a `@Preview` (without parameters) are shown.** Do not try to render real
   screens with ViewModels or Firebase: it would make the capture slow and flaky.
4. **The weekly run must stay hands-off.** A change must not require a manual step on Friday.
5. **The `data` branch is history.** Never rewrite or force-push it; the workflow only appends.
6. **Everything is in English**: code, comments, UI text, docs, commit messages.

## Repository layout

```
.github/workflows/weekly.yml   Schedule (Friday 07:30 Swiss), capture, save history, deploy Pages
capture/WeeklyDemoCapture.kt   Robolectric test template copied into the FestivAR clone
scripts/
  capture.sh                   One full capture of FestivAR at a ref, recorded as one week
  scan-previews.mjs            Finds @Preview functions, fills the test template
  build-week.mjs               Turns captures into weeks/<id>.json (orchestration only)
  serve.mjs                    Local preview server
  lib/
    config.mjs                 Shared settings: repo, paths, variants, thresholds
    names.mjs                  Week ids, readable names and state labels
    shots.mjs                  Stores images by content hash, pixel diff
    compare.mjs                Groups previews into screens, new/changed/same status
    github.mjs                 Merged PRs of the week (GitHub REST API)
    history.mjs                Reads/writes the history folder (index + weeks)
site/                          Static page published to GitHub Pages
  index.html                   Page shell and demo-mode markup
  css/base.css                 Theme tokens (light/dark), base elements, top bar
  css/overview.css             Overview page
  css/demo.css                 Demo mode
  js/main.js                   Entry point: loads data, week picker, URL hash
  js/util.js                   DOM/format helpers, variant and status labels
  js/overview.js               Overview sections (header, stats, PRs, other screens)
  js/card.js                   One screen card (states, variants, before/after slider)
  js/demo.js                   Demo mode (steps, navigation, autoplay, transitions)
  js/tap.js                    The tapping hand (target choice and animation)
demo.json                      Optional per-screen tweaks of the demo mode
```

Generated, never committed on `main` (see `.gitignore`): `previews.json`, `site/data/`,
`history/`, `festivar/`, `node_modules/`.

## How a weekly run works

1. `weekly.yml` checks out this repo and the `data` branch (into `history/`), clones FestivAR.
2. `scripts/capture.sh <festivar> <ref> <date> history`:
   1. checks out `<ref>` in the clone;
   2. `scan-previews.mjs` writes `previews.json` and copies the filled test into the clone
      (`app/src/test/java/weeklydemo/`);
   3. runs `./gradlew :app:testDebugUnitTest --tests 'weeklydemo.*'`. Each preview × variant is
      one test; a failing preview only fails its own capture and is listed on the site;
   4. `build-week.mjs` stores the images, compares with the previous week, fetches the PRs and
      writes the week.
3. On the very first run (no `history/index.json`), step 2 also runs for the commit of one week
   earlier, so the first page already has comparisons.
4. The history is pushed to the `data` branch, `site/` + `history/` (as `site/data/`) +
   `demo.json` are deployed to Pages.

Triggers: the Friday schedule, the manual "Run workflow" button (optional date to rebuild a past
week), and a push to `main` touching the site, scripts, capture test, `demo.json` or workflow.
Every run is a full run (capture, compare, save, deploy); a run in a week that already has a
build replaces that week.

A run whose captures mostly fail (FestivAR not compiling, say) fails on purpose before saving
anything (`MIN_SUCCESS_RATIO` in `scripts/lib/config.mjs`): the previous site stays online.

GitHub cron is UTC only: two crons are listed and the `when` job keeps the one matching the
current Swiss offset. Keep both when editing the schedule.

## Data contracts

Change both sides together when you change one of these.

**Capture output** (`capture/WeeklyDemoCapture.kt` → `scripts/lib/shots.mjs`), in the clone's
`app/build/weekly-demo/`: `<previewId>__<variant>.png` and `<previewId>__<variant>.json`:
`{ "ok": true, "w": px, "h": px, "taps": [{ "x", "y", "w", "h", "label" }] }` (tap boxes are
fractions of the image) or `{ "ok": false, "error": "..." }`.

**Variant ids** `light`, `dark`, `font`, `tablet`: defined in `scripts/lib/config.mjs`, handled in
`capture/WeeklyDemoCapture.kt`, labelled in `site/js/util.js`.

**History** (`data` branch, served as `site/data/`):

- `shots/<hash>.png`: every distinct image, stored once (16 hex chars of its SHA-1).
- `index.json`: `[{ id, start, end, commit, stats }]`, newest first.
- `weeks/<id>.json` (id like `2026-W47`):

```jsonc
{
  "id": "2026-W47", "start": "ISO date", "end": "ISO date",
  "commit": "FestivAR sha", "repo": "SwEnt-FestivAR/FestivAR", "previous": "2026-W46" | null,
  "stats": { "newScreens", "changedScreens", "screens", "prs", "contributors", "failed" },
  "screens": [{
    "group": "TaskDetailsScreen",            // Kotlin file name = one screen
    "title": "Task Details Screen",
    "file": "app/src/main/java/.../TaskDetailsScreen.kt",
    "kind": "screen" | "component",          // component = under a components/ folder
    "status": "new" | "changed" | "same",
    "prs": [512],
    "states": [{                             // one per @Preview, in source order
      "id": "TaskDetailsScreen.TaskDetailsOpenPreview", "fn": "TaskDetailsOpenPreview",
      "label": "Open", "status": "new" | "changed" | "same", "diff": 12.5,   // % of pixels
      "variants": { "light": { "img": "<hash>", "w", "h", "taps": [...] }, "dark": {...} },
      "before": { "light": "<hash>", ... }   // only when status = "changed"
    }]
  }],
  "removed": ["OldScreen"],
  "prs": [{ "number", "title", "author", "url", "groups": ["TaskDetailsScreen"] }],
  "failed": [{ "id", "variant", "error" }]
}
```

**`demo.json`** (optional), keyed by screen group:
`{ "skip": bool, "order": ["PreviewFn", ...], "taps": { "PreviewFn": "label to tap" }, "notes": { "PreviewFn": "text" } }`.
Keys starting with `_` are documentation and ignored.

## Do

- Keep modules small and single-purpose (target: under ~200 lines per file). Split rather than
  grow a file.
- Put shared settings in `scripts/lib/config.mjs`, never repeat a constant across Node scripts.
- Compute derived data (titles, labels, statuses) in the Node scripts, not in the page: the site
  only displays `weeks/<id>.json`.
- Document every exported function with a short comment saying what it returns.
- Escape every value inserted in HTML with `esc()` (`site/js/util.js`).
- Test locally before pushing (below). For site-only changes, reuse an existing `history/`.
- Keep the page dependency-free: plain ES modules, no bundler, no framework, no CDN script.

## Don't

- Don't modify FestivAR in any way (see golden rule 1).
- Don't add npm dependencies without a strong reason (today: only `pngjs`).
- Don't commit generated files (`site/data/`, `previews.json`, `history/`).
- Don't store images inside week files or duplicate images: always go through `storeShots`.
- Don't make one failing preview fail the whole run: the capture test catches errors per shot.
- Don't use `getBoundingClientRect` for positions inside the demo phone: it is tilted in 3D;
  use `offset*` (see `site/js/tap.js`).

## Local workflow

Requirements: Node 24, JDK 21, Android SDK (`ANDROID_HOME` or `local.properties` in the clone).

```bash
npm install
git clone https://github.com/SwEnt-FestivAR/FestivAR.git festivar      # throwaway clone
bash scripts/capture.sh festivar origin/main 2026-11-16 history       # ~3 min after Gradle warm-up
node scripts/serve.mjs history                                          # http://localhost:8090
```

To get a comparison locally, run `capture.sh` twice with an older ref and date first.
`GITHUB_TOKEN` (optional) avoids the GitHub API rate limit when fetching PRs.

## Setup (once)

Settings → Pages → Source = **GitHub Actions**. The workflow creates the `data` branch itself.
