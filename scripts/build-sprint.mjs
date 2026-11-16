// Turns one capture run into one sprint of the demo site, saved in the history folder.
// Usage: node scripts/build-sprint.mjs --captures <dir> --previews <previews.json> --history <dir>
//          [--date <ISO date, default now>] [--commit <FestivAR sha>]
// The sprint is the one containing --date (Friday 12:00 -> Friday 12:00, Swiss time).
// Env: GITHUB_TOKEN (optional) for the merged PRs of the sprint.
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { MIN_SUCCESS_RATIO, REPO } from './lib/config.mjs';
import { sprintOf } from './lib/sprints.mjs';
import { storeShots } from './lib/shots.mjs';
import { buildScreens, removedScreens, sortScreens } from './lib/compare.mjs';
import { fetchMergedPRs } from './lib/github.mjs';
import { addLinks } from './lib/links.mjs';
import { openHistory, previousSprint, saveSprint } from './lib/history.mjs';

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

const capturedAt = args.date ? new Date(args.date) : new Date();
const sprint = sprintOf(capturedAt);
const previews = JSON.parse(fs.readFileSync(args.previews, 'utf8'));

const index = openHistory(args.history);
const previous = previousSprint(args.history, index, sprint.number);
const { shots, failed } = storeShots(args.captures, previews, args.history);
const planned = previews.reduce((n, p) => n + p.variants.length, 0);
if (planned === 0 || (planned - failed.length) / planned < MIN_SUCCESS_RATIO) {
  console.error(`Only ${planned - failed.length}/${planned} captures succeeded. First errors:`);
  for (const f of failed.slice(0, 5)) console.error(`  ${f.id} @${f.variant}: ${f.error}`);
  throw new Error('Capture run looks broken: sprint not saved.');
}
const screens = sortScreens(buildScreens(previews, shots, previous, args.history));
addLinks(screens);
const prs = await fetchMergedPRs(sprint.start, capturedAt, screens);

const result = {
  id: sprint.id,
  number: sprint.number,
  start: sprint.start.toISOString(),
  end: sprint.end.toISOString(),
  capturedAt: capturedAt.toISOString(),
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
saveSprint(args.history, index, result);
console.log(sprint.id, JSON.stringify(result.stats));
