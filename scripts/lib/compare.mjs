// Groups previews into screens and compares them with the previous sprint.
import { CHANGE_THRESHOLD } from './config.mjs';
import { prettyName, stateLabels } from './names.mjs';
import { diffRatio } from './shots.mjs';

/**
 * Builds the `screens` of a sprint. All previews of one Kotlin file form one screen; each preview
 * is one of its states. Status is "new", "changed" or "same" compared with `previous` (a sprint
 * object, or null for the first sprint, where everything is "same").
 */
export function buildScreens(previews, shots, previous, historyDir) {
  const before = {};
  for (const s of previous?.screens || []) for (const st of s.states) before[st.id] = st;
  const hadGroup = new Set((previous?.screens || []).map((s) => s.group));

  const groups = {};
  for (const p of previews) if (shots[p.id]?.light) (groups[p.group] ||= []).push(p);

  return Object.entries(groups).map(([group, ps]) => {
    const labels = stateLabels(ps.map((p) => p.fn));
    const states = ps.map((p, i) => compareState(p, labels[i], shots[p.id], previous && before, historyDir));
    let status = 'same';
    if (previous && !hadGroup.has(group)) status = 'new';
    else if (states.some((s) => s.status !== 'same')) status = 'changed';
    return { group, title: prettyName(group), file: ps[0].file, kind: ps[0].kind, status, prs: [], states };
  });
}

function compareState(preview, label, variants, before, historyDir) {
  const state = { id: preview.id, fn: preview.fn, label, variants, status: 'same', diff: 0 };
  if (!before) return state;
  const old = before[preview.id];
  if (!old) return { ...state, status: 'new' };
  const ratio = diffRatio(old.variants.light.img, variants.light.img, historyDir);
  if (ratio <= CHANGE_THRESHOLD) return state;
  return {
    ...state,
    status: 'changed',
    diff: Math.round(ratio * 1000) / 10,
    before: Object.fromEntries(Object.entries(old.variants).map(([v, x]) => [v, x.img])),
  };
}

/** Groups present in the previous sprint and gone now. */
export function removedScreens(previous, screens) {
  const now = new Set(screens.map((s) => s.group));
  return (previous?.screens || []).filter((s) => !now.has(s.group)).map((s) => s.group);
}

/** New first, then changed, then unchanged; screens before components; then by name. */
export function sortScreens(screens) {
  const order = { new: 0, changed: 1, same: 2 };
  return screens.sort(
    (a, b) => order[a.status] - order[b.status] || (a.kind > b.kind ? -1 : a.kind < b.kind ? 1 : 0) || a.group.localeCompare(b.group),
  );
}
