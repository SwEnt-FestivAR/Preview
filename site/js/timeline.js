// Timeline page (#timeline): how every screen evolved across the saved sprints. One block per
// screen, one row per state (@Preview), one column per sprint, oldest on the left. A capture is
// shown only where it differs from the previous sprint, so each block reads as the history of the
// screen. Clicking a capture opens the lineup of that screen in that sprint.
import { $, h, esc, shotUrl, segment, VARIANTS } from './util.js';
import { lineupHash } from './lineup.js';

/**
 * Renders the timeline of `sprints` (sprint files, newest first, as in index.json) into `main`,
 * scrolled to `focus` (a screen group) when given. Returns nothing.
 */
export function renderTimeline(main, sprints, focus) {
  const order = [...sprints].reverse(); // oldest first
  const screens = mergeScreens(sprints);
  let variant = 'light';
  let onlyEvolved = !focus;

  main.innerHTML = '';
  main.append(h(`<div class="hero"><h1>Timeline</h1>
    <p>Every screen across Sprint ${order[0].number} → Sprint ${order.at(-1).number}. A capture is shown when it differs from the sprint before; click one to open that sprint's lineup.</p></div>`));
  const tools = h(`<div class="tl-tools"><div class="seg variants"></div><div class="seg filter"></div>
    <select class="jump" aria-label="Go to screen"></select></div>`);
  const list = h('<div class="tl-list"></div>');
  main.append(tools, list);

  const draw = () => {
    segment($('.variants', tools), Object.keys(VARIANTS), variant, (v) => VARIANTS[v], (v) => ((variant = v), draw()));
    const changing = screens.filter((s) => evolved(s, order, variant));
    segment($('.filter', tools), [true, false], onlyEvolved, (b) => (b ? `Evolved (${changing.length})` : `All (${screens.length})`), (b) => ((onlyEvolved = b), draw()));
    const shown = onlyEvolved ? changing : screens;
    const jump = $('.jump', tools);
    jump.innerHTML = '<option value="">Go to screen…</option>' + shown.map((s) => `<option value="${esc(s.group)}">${esc(s.title)}</option>`).join('');
    jump.onchange = () => scrollToScreen(jump.value);
    list.innerHTML = '';
    for (const screen of shown) list.append(screenBlock(screen, order, variant));
    if (!shown.length) list.append(h('<p class="empty">No screen changed in these sprints.</p>'));
  };
  draw();
  if (focus) scrollToScreen(focus);
}

/** Scrolls to the block of `group` and records it in the URL. */
function scrollToScreen(group) {
  const block = document.getElementById(`tl-${group}`);
  if (!block) return;
  history.replaceState(null, '', `#timeline/${encodeURIComponent(group)}`);
  block.scrollIntoView({ block: 'start' });
}

/** Every screen of every sprint, in the latest sprint's order (removed ones last), with its states' fns. */
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

/** True when a state of `screen` changed in `variant`, or appeared after the screen's first sprint. */
function evolved(screen, order, variant) {
  const first = order.findIndex((s) => s.screens.some((x) => x.group === screen.group));
  return screen.fns.some((fn) => {
    let last = null;
    return order.some((sprint, i) => {
      const img = stateIn(sprint, screen.group, fn)?.variants[variant]?.img;
      const moved = img && ((last && img !== last) || (!last && i > first));
      if (img) last = img;
      return moved;
    });
  });
}

/** One screen: a grid with a row per state and a column per sprint. */
function screenBlock(screen, order, variant) {
  const first = order.find((s) => s.screens.some((x) => x.group === screen.group));
  const latest = order.findLast((s) => s.screens.some((x) => x.group === screen.group));
  const gone = latest !== order.at(-1) ? ` · removed after Sprint ${latest.number}` : '';
  const block = h(`<section class="tl-screen" id="tl-${esc(screen.group)}">
    <div class="tl-head"><h2>${esc(screen.title)}</h2><small>${screen.kind}${gone}</small></div>
    <div class="tl-scroll"><div class="tl-grid${screen.kind === 'component' ? ' tl-component' : ''}" style="grid-template-columns: auto repeat(${order.length}, auto)"></div></div>
  </section>`);
  const grid = $('.tl-grid', block);
  grid.append(h('<div class="tl-corner"></div>'));
  for (const sprint of order) grid.append(h(`<div class="tl-sprint">Sprint ${sprint.number}</div>`));
  for (const fn of screen.fns) {
    const label = order.map((s) => stateIn(s, screen.group, fn)?.label).filter(Boolean).at(-1);
    grid.append(h(`<div class="tl-state">${esc(label)}</div>`));
    let last = null;
    for (const sprint of order) {
      const state = stateIn(sprint, screen.group, fn);
      const img = state?.variants[variant]?.img;
      grid.append(cell(sprint, first, screen, state, img, last));
      if (img) last = img;
    }
  }
  return block;
}

/** One sprint of one state: its capture when it differs from `last`, else a small marker. `first`: the screen's first sprint. */
function cell(sprint, first, screen, state, img, last) {
  if (!state) return h(`<div class="tl-cell tl-none">${last ? 'removed' : '·'}</div>`);
  if (!img) return h('<div class="tl-cell tl-none">no capture</div>');
  if (img === last) return h('<div class="tl-cell tl-same" title="Same as the sprint before">=</div>');
  const tag = last ? '<span class="lbl b">Changed</span>' : sprint !== first ? '<span class="lbl b">New</span>' : '';
  const href = lineupHash(sprint.id, screen.group, state.fn);
  return h(`<a class="tl-cell tl-shot" href="${esc(href)}" title="Open in Sprint ${sprint.number}">
    <div class="shot${screen.kind === 'component' ? ' component' : ''}"><img src="${shotUrl(img)}" alt="${esc(state.label)}, Sprint ${sprint.number}" loading="lazy">${tag}</div></a>`);
}
