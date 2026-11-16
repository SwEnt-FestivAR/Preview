// Tells the workflow whether a baseline capture is needed before capturing <date>.
// Prints shell assignments, to be used with eval:
//   SPRINT=<n>             sprint containing <date>
//   NEED_BASELINE=true     no earlier sprint saved yet: capture the previous sprint first
//   BASELINE_DATE=<iso>    one minute before this sprint starts (= end of the previous sprint)
// Usage: node scripts/sprint.mjs <date> <history-dir>
import { sprintOf } from './lib/sprints.mjs';
import { openHistory } from './lib/history.mjs';

const [date, historyDir] = process.argv.slice(2);
if (!date || !historyDir) throw new Error('usage: sprint.mjs <date> <history-dir>');

const sprint = sprintOf(new Date(date));
const hasEarlier = openHistory(historyDir).some((e) => e.number < sprint.number);
console.log(`SPRINT=${sprint.number}`);
console.log(`NEED_BASELINE=${!hasEarlier}`);
console.log(`BASELINE_DATE=${new Date(sprint.start.getTime() - 6e4).toISOString()}`);
