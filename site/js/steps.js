// Which screens and states the demo mode walks through.

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
 * Steps of the demo, one per state. Sprint demo (no `screens`): the new and changed screens only
 * (not components, not those marked `skip` in demo.json), each with its highlights(); when nothing
 * changed, the first normal state of every screen. Screen demo (`screens` given, from a card): all
 * states. demo.json `order` reorders the states of a screen.
 */
export function buildSteps(sprint, overrides, screens) {
  let plan;
  if (screens) plan = screens.map((screen) => [screen, screen.states]);
  else {
    const candidates = sprint.screens.filter((s) => s.kind === 'screen' && !overrides[s.group]?.skip);
    plan = candidates.filter((s) => s.status !== 'same').map((s) => [s, highlights(s)]).filter(([, st]) => st.length);
    if (!plan.length) plan = candidates.map((s) => [s, highlights({ ...s, status: 'new' }).slice(0, 1)]);
  }
  const steps = [];
  for (const [screen, chosen] of plan) {
    const order = overrides[screen.group]?.order || [];
    const rank = (s) => order.indexOf(s.fn) + 1 || order.length + 1;
    const states = [...chosen].sort((a, b) => rank(a) - rank(b));
    states.forEach((state, k) => steps.push({ screen, state, k, n: states.length, wipe: state.status === 'changed' && state.before }));
  }
  return steps;
}
