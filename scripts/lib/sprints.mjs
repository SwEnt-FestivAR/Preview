// Sprint calendar: Friday 12:00 -> next Friday 12:00, Swiss time (summer and winter time handled).
import { SPRINTS } from './config.mjs';

const DAY = 864e5;

/** Minutes the time zone is ahead of UTC at `date` (+60 in Swiss winter, +120 in summer). */
function offsetMinutes(date, timeZone) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName').value; // "GMT+01:00"
  const m = name.match(/([+-])(\d\d):(\d\d)/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** Start (Date) of sprint `n`: its Friday at SPRINTS.hour, local time. */
export function sprintStart(n) {
  const friday = new Date(`${SPRINTS.anchor.friday}T00:00:00Z`).getTime() + (n - SPRINTS.anchor.number) * 7 * DAY;
  const asUtc = friday + SPRINTS.hour * 36e5;
  // Two passes: the offset can differ between the UTC guess and the real instant around DST.
  let t = asUtc - offsetMinutes(new Date(asUtc), SPRINTS.timeZone) * 6e4;
  t = asUtc - offsetMinutes(new Date(t), SPRINTS.timeZone) * 6e4;
  return new Date(t);
}

/** The sprint containing `date`: { number, id, start, end }. */
export function sprintOf(date) {
  let n = SPRINTS.anchor.number + Math.floor((date - sprintStart(SPRINTS.anchor.number)) / (7 * DAY));
  while (sprintStart(n) > date) n--;
  while (sprintStart(n + 1) <= date) n++;
  return { number: n, id: sprintId(n), start: sprintStart(n), end: sprintStart(n + 1) };
}

/** File/URL id of sprint `n`: "sprint-6". */
export const sprintId = (n) => `sprint-${n}`;
