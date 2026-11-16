// Prints the capture dates a run must process, oldest first, one per line (ISO dates).
// Each date is captured with the last FestivAR commit before it and saved in its sprint.
//   - normally: just <date>;
//   - when no earlier sprint is saved yet: the end of the previous sprint, then <date>, so the
//     first page already has a comparison;
//   - with <from> (a sprint number, or "first" for FIRST_SPRINT): the end of every sprint from
//     <from> to the one before <date>, then <date>. Sprint <from> becomes the reference (baseline)
//     when nothing older is saved. A push uses "first": it rebuilds every sprint.
// Usage: node scripts/sprint.mjs <date> <history-dir> [from]
import { FIRST_SPRINT } from './lib/config.mjs';
import { sprintOf, sprintStart } from './lib/sprints.mjs';
import { openHistory } from './lib/history.mjs';

const [date, historyDir, from] = process.argv.slice(2);
if (!date || !historyDir) throw new Error('usage: sprint.mjs <date> <history-dir> [from]');

const current = sprintOf(new Date(date)).number;
const lastMinuteOf = (n) => new Date(sprintStart(n + 1).getTime() - 6e4).toISOString();

let first = current;
if (from) first = Math.min(from === 'first' ? FIRST_SPRINT : Number(from), current);
else if (!openHistory(historyDir).some((e) => e.number < current)) first = current - 1;

for (let n = first; n < current; n++) console.log(lastMinuteOf(n));
console.log(new Date(date).toISOString());
