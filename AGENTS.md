# AGENTS.md

Guide for anyone (human or AI agent) changing this repository. Read it before editing.

## What this repo does

Every Friday at 07:30 Swiss time, a GitHub Actions workflow builds a visual demo of the current
sprint of [FestivAR](https://github.com/SwEnt-FestivAR/FestivAR) (Android, Kotlin, Jetpack
Compose) and publishes it to GitHub Pages:

- **sprints** run from Friday 12:00 to the next Friday 12:00, Swiss time; Sprint 6 is
  13 → 20 Nov 2026 and the others are counted from it (`SPRINTS` in `scripts/lib/config.mjs`);
- every `@Preview` of the app is rendered to PNG with Robolectric (no emulator), in light, dark
  and font ×1.5; screens are always rendered at one phone size (412×915 dp) so they all look alike;
- the captures are compared with the previous sprint: new screens, changed screens (with a
  before/after slider), unchanged screens;
- the PRs merged during the sprint are listed and linked to the screens they touched; a screen
  touched by a PR whose previews look identical is listed apart ("Touched without visible
  change"): the change is in a state no `@Preview` shows;
- a **demo mode** shows screens on a floating phone, state after state, with a hand that taps the
  element leading to the next state. A tap that opens another screen (an announcement card opens
  its details) is followed by that screen (`scripts/lib/links.mjs`); when nothing plausible leads
  to the next state, there is no tap, the phone just slides. Changed states replay their
  before → after wipe on demand. The sprint demo ("Play the demo") shows only the normal use
  of new and changed screens; a card's "Play as demo" shows every state of that screen;
- the page shows **every** screen and component of the sprint as a card (states, variants,
  before/after, its own demo), grouped: new, changed, touched without visible change, unchanged;
- the page has a light/dark toggle and links to the previous sprint's demo.

## Golden rules

1. **FestivAR is read-only.** Never commit, push, open a PR or add a file, dependency or setting
   to FestivAR to make this repo work. The workflow clones it into a temporary folder, copies the
   capture test into that clone, runs it, and throws the clone away. Anything the demo needs must
   live here.
2. **No new dependency in the capture test.** It only uses what FestivAR already has (Compose UI
   test, Robolectric). Adding a Gradle plugin or library would need a change to FestivAR.
3. **Only screens with a `@Preview` (without parameters) are shown.** Do not try to render real
   screens with ViewModels or Firebase: it would make the capture slow and flaky.
4. **The Friday run must stay hands-off.** A change must not require a manual step on Friday.
5. **The `data` branch is history.** Never rewrite or force-push it; the workflow only appends.
6. **Everything is in English**: code, comments, UI text, docs, commit messages.

## Repository layout

```
.github/workflows/weekly.yml   Schedule (Friday 07:30 Swiss), capture, save history, deploy Pages
capture/WeeklyDemoCapture.kt   Robolectric test template copied into the FestivAR clone
scripts/
  capture.sh                   One full capture of FestivAR at a ref, recorded in one sprint
  scan-previews.mjs            Finds @Preview functions, screen/component, fills the test template
  build-sprint.mjs             Turns captures into sprints/<id>.json (orchestration only)
  sprint.mjs                   Lists the dates a run captures (baseline, backfill, current)
  serve.mjs                    Local preview server
  lib/
    config.mjs                 Shared settings: repo, sprints, first sprint, phone size, variants
    sprints.mjs                Sprint calendar (Friday 12:00 Swiss -> Friday 12:00)
    names.mjs                  Readable names and state labels
    shots.mjs                  Stores images by content hash, pixel diff
    compare.mjs                Groups previews into screens, new/changed/same status
    github.mjs                 PRs merged during the sprint (GitHub REST API)
    links.mjs                  Guesses which screen a tap opens (for the demo hand)
    history.mjs                Reads/writes the history folder (index + sprints)
site/                          Static page published to GitHub Pages
  index.html                   Page shell and demo-mode markup
  logo.svg                     FestivAR logo (app_logo.xml of the app, coloured), also the favicon
  css/base.css                 Theme tokens (light-dark()), base elements, top bar
  css/overview.css             Overview page
  css/demo.css                 Demo mode
  js/main.js                   Entry point: loads data, sprint picker, URL hash
  js/theme.js                  Light/dark toggle (saved per browser)
  js/util.js                   DOM/format helpers, variant and status labels
  js/overview.js               Overview sections (header, stats, PRs, other screens)
  js/card.js                   One screen card (states, variants, before/after slider)
  js/steps.js                  Which screens and states a demo walks through (following links)
  js/demo.js                   Demo mode (navigation, autoplay, transitions)
  js/tap.js                    The tapping hand (target choice and animation)
demo.json                      Optional per-screen tweaks of the demo mode
```

Generated, never committed on `main` (see `.gitignore`): `previews.json`, `site/data/`,
`history/`, `festivar/`, `node_modules/`.

## How a run works

1. `weekly.yml` checks out this repo and the `data` branch (into `history/`), clones FestivAR.
2. `scripts/capture.sh <festivar> <ref> <date> history`:
   1. checks out `<ref>` in the clone and removes its own unit tests there (never run, only
      slowing the compilation);
   2. `scan-previews.mjs` writes `previews.json` and copies the filled test into the clone
      (`app/src/test/java/weeklydemo/`);
   3. runs `./gradlew :app:testDebugUnitTest --tests 'weeklydemo.*'`. Each preview × variant is
      one test; a failing preview only fails its own capture and is listed on the site;
   4. `build-sprint.mjs` stores the images, compares with the previous sprint, fetches the PRs
      and writes the sprint containing `<date>`.
3. `scripts/sprint.mjs` decides which dates step 2 runs for, oldest first: normally only now;
   when no earlier sprint is saved, also the end of the previous sprint (a baseline to compare
   with); with the `backfill` input (a sprint number), the end of every sprint from that one on;
   on a **push**, every sprint from `FIRST_SPRINT` (`scripts/lib/config.mjs`, today 4) on.
   The oldest captured sprint with nothing before it is a "baseline sprint" (nothing new/changed).
4. The history is pushed to the `data` branch, `site/` + `history/` (as `site/data/`) +
   `demo.json` are deployed to Pages.

Triggers: the Friday schedule, the manual "Run workflow" button (optional `date` to rebuild a
past sprint, optional `backfill` sprint number to (re)build older sprints first), and a push to
`main` touching the site, scripts, capture test, `demo.json` or workflow (it rebuilds all sprints
from `FIRST_SPRINT`, about 4-5 minutes of capture per sprint).
Every run is a full run (capture, compare, save, deploy); a run in a sprint that already has a
build replaces that sprint. The Friday 07:30 run captures the sprint just before it ends at noon.

A capture whose tests all fail without writing anything (typically Robolectric failing to
download its Android jar, cached between runs under `~/.m2/repository/org/robolectric`) is retried
once, and the first test failure is printed in the log. A capture that still mostly fails
(`MIN_SUCCESS_RATIO` in `scripts/lib/config.mjs`) saves nothing: for an older sprint (baseline or
backfill) the run skips it with a warning and goes on; for the current sprint the run fails and the
previous site stays online.

GitHub cron is UTC only: two crons are listed and the `when` job keeps the one matching the
current Swiss offset. Keep both when editing the schedule.

## Data contracts

Change both sides together when you change one of these.

**Capture output** (`capture/WeeklyDemoCapture.kt` → `scripts/lib/shots.mjs`), in the clone's
`app/build/weekly-demo/`: `<previewId>__<variant>.png` and `<previewId>__<variant>.json`:
`{ "ok": true, "w": px, "h": px, "taps": [{ "x", "y", "w", "h", "label" }], "texts": ["..."] }`
(tap boxes are fractions of the image; `texts` = shown text, used by `links.mjs` then dropped)
or `{ "ok": false, "error": "..." }`.

**Variant ids** `light`, `dark`, `font`: defined in `scripts/lib/config.mjs`, handled in
`capture/WeeklyDemoCapture.kt`, labelled in `site/js/util.js`.

**History** (`data` branch, served as `site/data/`):

- `shots/<hash>.png`: every distinct image, stored once (16 hex chars of its SHA-1).
- `index.json`: `[{ id, number, start, end, commit, stats }]`, newest first.
- `sprints/<id>.json` (id like `sprint-6`):

```jsonc
{
  "id": "sprint-6", "number": 6, "start": "ISO date", "end": "ISO date", "capturedAt": "ISO date",
  "commit": "FestivAR sha", "repo": "SwEnt-FestivAR/FestivAR", "previous": "sprint-5" | null,
  "stats": { "newScreens", "changedScreens", "screens", "prs", "contributors", "failed" },
  "screens": [{
    "group": "TaskDetailsScreen",            // Kotlin file name = one screen
    "title": "Task Details Screen",
    "file": "app/src/main/java/.../TaskDetailsScreen.kt",
    "kind": "screen" | "component",          // screen: *Screen.kt or a preview >= 600 dp tall,
                                             // never under components/; rendered at 412x915 dp
    "status": "new" | "changed" | "same",
    "prs": [512],
    "states": [{                             // one per @Preview, in source order
      "id": "TaskDetailsScreen.TaskDetailsOpenPreview", "fn": "TaskDetailsOpenPreview",
      "label": "Open", "status": "new" | "changed" | "same", "diff": 12.5,   // % of pixels
      "variants": { "light": { "img": "<hash>", "w", "h", "taps": [...] }, "dark": {...} },
      "before": { "light": "<hash>", ... },  // only when status = "changed"
      "link": { "to": "<state id>", "tap": { "x", "y", "w", "h", "label" } }  // optional: the tap opens that state
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
  only displays `sprints/<id>.json`.
- Document every exported function with a short comment saying what it returns.
- Escape every value inserted in HTML with `esc()` (`site/js/util.js`).
- Test locally before pushing (below). For site-only changes, reuse an existing `history/`.
- Keep the page dependency-free: plain ES modules, no bundler, no framework, no CDN script.

## Don't

- Don't modify FestivAR in any way (see golden rule 1).
- Don't add npm dependencies without a strong reason (today: only `pngjs`).
- Don't commit generated files (`site/data/`, `previews.json`, `history/`).
- Don't store images inside sprint files or duplicate images: always go through `storeShots`.
- Don't make one failing preview fail the whole run: the capture test catches errors per shot.
- Don't use `getBoundingClientRect` for positions inside the demo phone: it is tilted in 3D;
  use `offset*` (see `site/js/tap.js`).

## Local workflow

Requirements: Node 24, JDK 21, Android SDK (`ANDROID_HOME` or `local.properties` in the clone).

```bash
npm install
git clone https://github.com/SwEnt-FestivAR/FestivAR.git festivar      # throwaway clone
bash scripts/capture.sh festivar origin/main 2026-11-16 history       # ~2-3 min after Gradle warm-up
node scripts/serve.mjs history                                          # http://localhost:8090
```

To get a comparison locally, first run `capture.sh` with an older ref and a date in the previous sprint.
`GITHUB_TOKEN` (optional) avoids the GitHub API rate limit when fetching PRs.

## Setup (once)

Settings → Pages → Source = **GitHub Actions**. The workflow creates the `data` branch itself.
