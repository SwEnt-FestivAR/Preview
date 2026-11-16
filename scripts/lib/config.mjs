// Settings shared by the Node scripts. The variant names are also hard-coded in
// capture/WeeklyDemoCapture.kt and site/js/util.js: change all three together.

/** GitHub repository that is captured (read-only). */
export const REPO = 'SwEnt-FestivAR/FestivAR';

/** Kotlin sources scanned for @Preview functions, relative to the FestivAR root. */
export const SOURCE_ROOT = 'app/src/main/java';

/** Where the capture test is copied inside the throwaway FestivAR clone. */
export const TEST_DEST = 'app/src/test/java/weeklydemo/WeeklyDemoCapture.kt';

/**
 * Sprints run from Friday 12:00 to the next Friday 12:00, Swiss time. `anchor` is the Friday a
 * known sprint starts on; every other sprint is counted from it (one sprint every 7 days).
 */
export const SPRINTS = { anchor: { number: 6, friday: '2026-11-13' }, hour: 12, timeZone: 'Europe/Zurich' };

/** Oldest sprint kept: a push rebuilds every sprint from this one on (it is the reference). */
export const FIRST_SPRINT = 4;

/** Size every screen is rendered at (dp), whatever its @Preview says, so all phones look alike. */
export const PHONE = { w: 412, h: 915 };

/** Variants rendered for each kind of preview. `light` must always come first. */
export const VARIANTS = {
  screen: ['light', 'dark', 'font'],
  component: ['light', 'dark', 'font'],
};

/** A capture counts as changed when more than this share of its pixels differ (0.1 %). */
export const CHANGE_THRESHOLD = 0.001;

/**
 * Below this share of successful captures the run is treated as broken (FestivAR not compiling,
 * say): no sprint is saved, so the history never shows every screen as removed.
 */
export const MIN_SUCCESS_RATIO = 0.5;

/** Maximum number of merged PRs listed for one sprint. */
export const MAX_PRS = 80;
