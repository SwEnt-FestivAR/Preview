// Settings shared by the Node scripts. The variant names are also hard-coded in
// capture/WeeklyDemoCapture.kt and site/js/util.js: change all three together.

/** GitHub repository that is captured (read-only). */
export const REPO = 'SwEnt-FestivAR/FestivAR';

/** Kotlin sources scanned for @Preview functions, relative to the FestivAR root. */
export const SOURCE_ROOT = 'app/src/main/java';

/** Where the capture test is copied inside the throwaway FestivAR clone. */
export const TEST_DEST = 'app/src/test/java/weeklydemo/WeeklyDemoCapture.kt';

/** Where the capture test writes its PNG/JSON files, relative to the FestivAR root. */
export const CAPTURE_OUT = 'app/build/weekly-demo';

/** Variants rendered for each kind of preview. `light` must always come first. */
export const VARIANTS = {
  screen: ['light', 'dark', 'font', 'tablet'],
  component: ['light', 'dark', 'font'],
};

/** A capture counts as changed when more than this share of its pixels differ (0.1 %). */
export const CHANGE_THRESHOLD = 0.001;

/** Maximum number of merged PRs listed for one week. */
export const MAX_PRS = 80;
