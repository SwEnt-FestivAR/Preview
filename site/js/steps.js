// Which screens and states the demo mode walks through, in an order that follows real taps.

/** States that are not the normal use of a screen; the sprint demo leaves them out. */
const UNUSUAL = /error|fail|denied|loading|empty|retry|offline|discard|confirm|sending|saving|waiting/i;

/**
 * States worth showing in the sprint demo: the normal states of a new screen, or the normal
 * states that changed on a changed screen (none when only error states changed).
 */
function highlights(screen) {
  const normal = screen.states.filter((s) => !UNUSUAL.test(s.label));
  if (screen.status === 'changed') return normal.filter((s) => s.status !== 'same');
  return normal.length ? normal : screen.states.slice(0, 1);
}

/**
 * Screens and states to show, before following links. In a screen demo, the state that opens
 * another screen comes last, so that screen closes the demo instead of interrupting it.
 */
function plan(sprint, overrides, screens) {
  const linkLast = (states) => [...states].sort((a, b) => Boolean(a.link) - Boolean(b.link));
  if (screens) return screens.map((screen) => [screen, linkLast(screen.states)]);
  const candidates = sprint.screens.filter((s) => s.kind === 'screen' && !overrides[s.group]?.skip);
  const changes = candidates.filter((s) => s.status !== 'same').map((s) => [s, highlights(s)]).filter(([, st]) => st.length);
  return changes.length ? changes : candidates.map((s) => [s, highlights({ ...s, status: 'new' }).slice(0, 1)]);
}

/**
 * Puts the screen a state opens (its `link`, from scripts/lib/links.mjs) right after it: moved there
 * when it is already planned later, added otherwise. One pass, so chains stay finite.
 */
function followLinks(steps, sprint) {
  const byId = new Map(sprint.screens.flatMap((screen) => screen.states.map((state) => [state.id, { screen, state }])));
  for (let i = 0; i < steps.length; i++) {
    const target = steps[i].state.link && byId.get(steps[i].state.link.to);
    if (!target || steps[i + 1]?.state === target.state) continue;
    const j = steps.findIndex((s) => s.state === target.state);
    if (j !== -1 && j < i) continue; // already shown before: don't go back
    const step = j === -1 ? { ...target, linked: true } : steps.splice(j, 1)[0];
    steps.splice(i + 1, 0, step);
  }
  return steps;
}

/**
 * Steps of the demo, one per state, each { screen, state, k, n, wipe, linked? }.
 * Sprint demo (no `screens`): the new and changed screens only (not components, not those marked
 * `skip` in demo.json), each with its highlights(); when nothing changed, the first normal state of
 * every screen. Screen demo (`screens` given, from a card): all its states. In both, a state that
 * opens another screen is followed by that screen. demo.json `order` reorders a screen's states.
 */
export function buildSteps(sprint, overrides, screens) {
  const steps = [];
  for (const [screen, chosen] of plan(sprint, overrides, screens)) {
    const order = overrides[screen.group]?.order || [];
    const rank = (s) => order.indexOf(s.fn) + 1 || order.length + 1;
    for (const state of [...chosen].sort((a, b) => rank(a) - rank(b))) steps.push({ screen, state });
  }
  followLinks(steps, sprint);
  // Position of each step among the steps of its screen ("state 2/3"), and the before/after wipe.
  for (const step of steps) {
    const same = steps.filter((s) => s.screen === step.screen);
    Object.assign(step, { k: same.indexOf(step), n: same.length, wipe: step.state.status === 'changed' && step.state.before });
  }
  return steps;
}
