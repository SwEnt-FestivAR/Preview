// Reads and writes the history folder (a checkout of the `data` branch). Layout:
//   shots/<hash>.png   every distinct image ever captured
//   weeks/<id>.json    one week, as shown by the site (format: AGENTS.md)
//   index.json         [{ id, start, end, commit, stats }], newest first
import fs from 'node:fs';
import path from 'node:path';

const readJSON = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);

/** Creates the folders if needed and returns the weeks index. */
export function openHistory(dir) {
  for (const sub of ['shots', 'weeks']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  return readJSON(path.join(dir, 'index.json'), []);
}

/** The latest week strictly before `weekId`, or null. */
export function previousWeek(dir, index, weekId) {
  const entry = index.filter((w) => w.id < weekId).sort((a, b) => b.id.localeCompare(a.id))[0];
  return entry ? readJSON(path.join(dir, 'weeks', entry.id + '.json'), null) : null;
}

/** Writes the week and adds (or replaces) it in the index. */
export function saveWeek(dir, index, week) {
  fs.writeFileSync(path.join(dir, 'weeks', week.id + '.json'), JSON.stringify(week));
  const entry = { id: week.id, start: week.start, end: week.end, commit: week.commit, stats: week.stats };
  const next = index.filter((w) => w.id !== week.id).concat(entry).sort((a, b) => b.id.localeCompare(a.id));
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(next, null, 2));
}
