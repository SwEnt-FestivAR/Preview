// Timeline page (#timeline): how every screen evolved across the saved sprints. One block per
// screen, one row per state (@Preview), one column per sprint, oldest on the left. A capture is
// shown only where it differs from the sprint before (or where the state appears), so each block
// reads as the history of the screen. Clicking a capture opens the lineup of that screen in that
// sprint. The variant switch applies to every block; "Evolved" hides the screens that never moved.
import { $, h, esc, shotUrl, segment, frameClass, VARIANTS } from './util.js';
import { lineupHash } from './lineup.js';

/**
 * Renders the timeline of `sprints` (sprint files, newest first, as in index.json) into `main`,
 * scrolled to `focus` (a screen group) when given. Returns nothing.
 */
export function renderTimeline(main, sprints, focus) {
  const order = [...sprints].reverse(); // oldest first, the column order
  const screens = mergeScreens(sprints);
  let variant = 'light';
  let onlyEvolved = !focus; // a link to one screen shows it even if it never changed

  main.innerHTML = '';
  main.append(h(`<div class="hero"><h1>Timeline</h1>
    <p>Every screen across Sprint ${order[0].number} → Sprint ${order.at(-1).number}. A capture is shown when it differs from the sprint before; click one to open that sprint's lineup.</p></div>`));
  const tools = h(`<div class="tl-tools"><div class="seg variants"></div><div class="seg filter"></div>
    <select class="jump" aria-label="Go to screen"></select></div>`);
  const list = h('<div class="tl-list"></div>');
  main.append(tools, list);

  const draw = () => {
    const histories = screens.map((screen) => ({ screen, rows: historyOf(screen, order, variant) }));
    const evolved = histories.filter(({ rows }) => rows.some((row) => row.cells.some((c) => c.change === 'changed' || c.change === 'new')));
    const shown = onlyEvolved ? evolved : histories;
    segment($('.variants', tools), Object.keys(VARIANTS), variant, (v) => VARIANTS[v], (v) => ((variant = v), draw()));
    segment($('.filter', tools), [true, false], onlyEvolved, (b) => (b ? `Evolved (${evolved.length})` : `All (${histories.length})`), (b) => ((onlyEvolved = b), draw()));
    const jump = $('.jump', tools);
    jump.innerHTML = '<option value="">Go to screen…</option>' +
      shown.map(({ screen }) => `<option value="${esc(screen.group)}">${esc(screen.title)}</option>`).join('');
    jump.onchange = () => scrollToScreen(jump.value);
    list.innerHTML = '';
    for (const { screen, rows } of shown) list.append(screenBlock(screen, rows, order));
    if (!shown.length) list.append(h('<p class="empty">No screen changed in these sprints.</p>'));
  };
  draw();
  if (focus) scrollToScreen(focus);
}

/** Scrolls to the block of `group` and records it in the URL hash (without routing again). */
function scrollToScreen(group) {
  const block = document.getElementById(`tl-${group}`);
  if (!block) return;
  history.replaceState(null, '', `#timeline/${encodeURIComponent(group)}`);
  block.scrollIntoView({ block: 'start' });
}

/**
 * Every screen of every sprint as `{ group, title, kind, fns }` (fns: its preview functions), in
 * the latest sprint's order, removed screens after; screens before components.
 */
function mergeScreens(sprints) {
  const byGroup = new Map();
  for (const sprint of sprints) {
    for (const screen of sprint.screens) {
      const entry = byGroup.get(screen.group) || { group: screen.group, title: screen.title, kind: screen.kind, fns: [] };
      for (const state of screen.states) if (!entry.fns.includes(state.fn)) entry.fns.push(state.fn);
      byGroup.set(screen.group, entry);
    }
  }
  const list = [...byGroup.values()];
  return [...list.filter((s) => s.kind === 'screen'), ...list.filter((s) => s.kind !== 'screen')];
}

/** The state `fn` of `group` in `sprint`, or undefined. */
const stateIn = (sprint, group, fn) => sprint.screens.find((s) => s.group === group)?.states.find((s) => s.fn === fn);

/**
 * The history of `screen` in `variant`: one row per state, `{ fn, label, cells }`, with one cell
 * per sprint of `order`: `{ sprint, state, img, change }`, where `change` is
 * 'first' (shown in the screen's first sprint), 'new' (state added later), 'changed', 'same',
 * 'missing' (state there but this variant failed), 'absent' (not yet there) or 'removed'.
 */
function historyOf(screen, order, variant) {
  const first = order.find((s) => s.screens.some((x) => x.group === screen.group));
  return screen.fns.map((fn) => {
    let last = null; // last capture of this state, to compare with
    const cells = order.map((sprint) => {
      const state = stateIn(sprint, screen.group, fn);
      const img = state?.variants[variant]?.img;
      const change = !state ? (last ? 'removed' : 'absent')
        : !img ? 'missing'
        : img === last ? 'same'
        : last ? 'changed'
        : sprint === first ? 'first' : 'new';
      if (img) last = img;
      return { sprint, state, img, change };
    });
    const label = cells.map((c) => c.state?.label).filter(Boolean).at(-1); // latest label
    return { fn, label, cells };
  });
}

/** One screen: its title, then a grid with a row per state of `rows` and a column per sprint of `order`. */
function screenBlock(screen, rows, order) {
  const latest = order.findLast((s) => s.screens.some((x) => x.group === screen.group));
  const gone = latest !== order.at(-1) ? ` · removed after Sprint ${latest.number}` : '';
  const block = h(`<section class="tl-screen" id="tl-${esc(screen.group)}">
    <div class="tl-head"><h2>${esc(screen.title)}</h2><small>${screen.kind}${gone}</small></div>
    <div class="tl-scroll"><div class="tl-grid${screen.kind === 'component' ? ' tl-component' : ''}" style="grid-template-columns: auto repeat(${order.length}, auto)"></div></div>
  </section>`);
  const grid = $('.tl-grid', block);
  grid.append(h('<div class="tl-corner"></div>'));
  for (const sprint of order) grid.append(h(`<div class="tl-sprint">Sprint ${sprint.number}</div>`));
  for (const row of rows) {
    grid.append(h(`<div class="tl-state">${esc(row.label)}</div>`));
    for (const c of row.cells) grid.append(cell(screen, c));
  }
  return block;
}

/** Text of the cells that show no capture, by change. */
const MARKERS = { absent: '·', removed: 'removed', missing: 'no capture', same: '=' };

/** One cell of the grid: the capture (linking to that sprint's lineup), or a small marker. */
function cell(screen, { sprint, state, img, change }) {
  if (MARKERS[change]) {
    const title = change === 'same' ? ' title="Same as the sprint before"' : '';
    return h(`<div class="tl-cell tl-${change === 'same' ? 'same' : 'none'}"${title}>${MARKERS[change]}</div>`);
  }
  const tag = { changed: 'Changed', new: 'New' }[change];
  const href = lineupHash(sprint.id, screen.group, state.fn);
  return h(`<a class="tl-cell tl-shot" href="${esc(href)}" title="Open in Sprint ${sprint.number}">
    <div class="${frameClass(screen.kind)}"><img src="${shotUrl(img)}" alt="${esc(state.label)}, Sprint ${sprint.number}" loading="lazy">${tag ? `<span class="lbl b">${tag}</span>` : ''}</div></a>`);
}
