// Reads and writes the history folder (a checkout of the `data` branch). Layout:
//   shots/<hash>.png     every distinct image ever captured
//   sprints/<id>.json    one sprint, as shown by the site (format: AGENTS.md)
//   index.json           [{ id, number, start, end, commit, stats }], newest first
// Entries of an older format (ISO weeks) are ignored and dropped from the index.
import fs from 'node:fs';
import path from 'node:path';

const readJSON = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);

/** Creates the folders if needed and returns the sprint index. */
export function openHistory(dir) {
  for (const sub of ['shots', 'sprints']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  return readJSON(path.join(dir, 'index.json'), []).filter((e) => Number.isInteger(e.number));
}

/** The latest sprint saved before sprint `number`, or null. */
export function previousSprint(dir, index, number) {
  const entry = index.filter((e) => e.number < number).sort((a, b) => b.number - a.number)[0];
  return entry ? readJSON(path.join(dir, 'sprints', entry.id + '.json'), null) : null;
}

/** Writes the sprint and adds (or replaces) it in the index. */
export function saveSprint(dir, index, sprint) {
  fs.writeFileSync(path.join(dir, 'sprints', sprint.id + '.json'), JSON.stringify(sprint));
  const { id, number, start, end, commit, stats } = sprint;
  const next = index.filter((e) => e.id !== id).concat({ id, number, start, end, commit, stats });
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(next.sort((a, b) => b.number - a.number), null, 2));
}
