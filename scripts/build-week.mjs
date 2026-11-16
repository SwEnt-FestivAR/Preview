// Turns one capture run into one week of the demo site, saved in the history folder.
// Usage: node scripts/build-week.mjs --captures <dir> --previews <previews.json> --history <dir>
//          [--date <ISO date, default now>] [--commit <FestivAR sha>]
// Env: GITHUB_TOKEN (optional) for the merged PRs of the week.
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { REPO } from './lib/config.mjs';
import { isoWeek } from './lib/names.mjs';
import { storeShots } from './lib/shots.mjs';
import { buildScreens, removedScreens, sortScreens } from './lib/compare.mjs';
import { fetchMergedPRs } from './lib/github.mjs';
import { openHistory, previousWeek, saveWeek } from './lib/history.mjs';

const { values: args } = parseArgs({
  options: {
    captures: { type: 'string' },
    previews: { type: 'string' },
    history: { type: 'string' },
    date: { type: 'string' },
    commit: { type: 'string' },
  },
});
for (const required of ['captures', 'previews', 'history']) {
  if (!args[required]) throw new Error(`missing --${required}`);
}

const end = args.date ? new Date(args.date) : new Date();
const start = new Date(end.getTime() - 7 * 864e5);
const weekId = isoWeek(end);
const previews = JSON.parse(fs.readFileSync(args.previews, 'utf8'));

const index = openHistory(args.history);
const previous = previousWeek(args.history, index, weekId);
const { shots, failed } = storeShots(args.captures, previews, args.history);
const screens = sortScreens(buildScreens(previews, shots, previous, args.history));
const prs = await fetchMergedPRs(start, end, screens);

const week = {
  id: weekId,
  start: start.toISOString(),
  end: end.toISOString(),
  commit: args.commit || null,
  repo: REPO,
  previous: previous?.id || null,
  stats: {
    newScreens: screens.filter((s) => s.status === 'new').length,
    changedScreens: screens.filter((s) => s.status === 'changed').length,
    screens: screens.length,
    prs: prs.length,
    contributors: new Set(prs.map((p) => p.author)).size,
    failed: failed.length,
  },
  screens,
  removed: removedScreens(previous, screens),
  prs,
  failed,
};
saveWeek(args.history, index, week);
console.log(weekId, JSON.stringify(week.stats));
