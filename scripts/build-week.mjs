// Turns one capture run into a week of the demo site, kept in the history folder (the `data` branch):
//   shots/<sha1>.png   every distinct image ever captured (unchanged images are stored once)
//   weeks/<id>.json    what the site shows for that week
//   index.json         list of the weeks
// Usage: node scripts/build-week.mjs --captures <dir> --previews <previews.json> --history <dir>
//          [--date <ISO date, default now>] [--commit <sha>]
// Env: GITHUB_TOKEN (optional, for the merged PRs of the week)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';

const REPO = 'SwEnt-FestivAR/FestivAR';
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const captures = args.captures;
const history = args.history;
const previews = JSON.parse(fs.readFileSync(args.previews, 'utf8'));
const end = args.date ? new Date(args.date) : new Date();
const start = new Date(end.getTime() - 7 * 864e5);
const weekId = isoWeek(end);

for (const d of ['shots', 'weeks']) fs.mkdirSync(path.join(history, d), { recursive: true });
