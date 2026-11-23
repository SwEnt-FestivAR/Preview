// Lineup: every state of one screen side by side in a full-screen overlay, to compare them.
// One variant for all states, or "All" (each state shows its variants next to each other);
// changed states can show their previous-sprint image. Clicking a state (or ← / →) selects it in
// the card. The URL hash follows it (#<sprint>/lineup/<group>/<preview fn>), so the link can be
// shared. Escape closes.
import { $, h, esc, shotUrl, segment, variantsOf, VARIANTS } from './util.js';

/** Hash of the lineup of `group` in `sprintId`, on the state whose preview function is `fn`. */
export const lineupHash = (sprintId, group, fn) => `#${sprintId}/lineup/${encodeURIComponent(group)}${fn ? `/${encodeURIComponent(fn)}` : ''}`;

let closeCurrent = null;

/** Closes the open lineup, if any, leaving the URL hash as it is (the page is navigating). */
export const closeLineup = () => closeCurrent?.(true);

/**
 * Opens the lineup of `screen` (of sprint `sprintId`), starting on `variant`, with `selected`
 * outlined. `onPick(state, variant)` runs when a state is selected (the card shows it). Returns nothing.
 */
export function openLineup({ screen, sprintId, variant, selected, onPick }) {
  closeLineup();
  let mode = variant;
  let picked = variant; // last variant shown in the card, kept while `mode` is 'all'
  let before = false;
  const hasBefore = screen.states.some((s) => s.before);
  const modes = [...new Set(screen.states.flatMap(variantsOf))];
  const box = h(`<div class="lineup" role="dialog" aria-modal="true" aria-label="${esc(screen.title)} lineup">
    <div class="lineup-top">
      <div><h2>${esc(screen.title)}</h2><small>${screen.states.length} state${screen.states.length > 1 ? 's' : ''} side by side · click one or use ← → to select it</small></div>
      <div class="lineup-tools">
        ${hasBefore ? '<div class="seg when"></div>' : ''}
        <div class="seg modes"></div>
        <button class="ghost copy" title="Copy a link to this lineup">🔗 Link</button>
        <button class="ghost close" title="Close (Escape)">✕</button>
      </div>
    </div>
    <div class="lineup-row"></div>
  </div>`);

  const setHash = () => history.replaceState(null, '', lineupHash(sprintId, screen.group, selected.fn));
  const close = (keepHash) => {
    box.remove();
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    closeCurrent = null;
    if (!keepHash) history.replaceState(null, '', `#${sprintId}`);
  };
  closeCurrent = close;
  const pick = (state, v) => {
    selected = state;
    picked = v;
    onPick(state, v);
    setHash();
    draw();
    $('.tile.on', box)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  };
  const onKey = (e) => {
    if (e.key === 'Escape') return close();
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    const next = step && screen.states[screen.states.indexOf(selected) + step];
    if (!next) return;
    e.preventDefault();
    const v = mode === 'all' ? picked : mode;
    pick(next, next.variants[v] ? v : 'light');
  };
  $('.close', box).onclick = () => close();
  $('.copy', box).onclick = async (e) => {
    try {
      await navigator.clipboard.writeText(location.href);
      e.target.textContent = '✓ Copied';
    } catch {
      e.target.textContent = 'Copy the address bar';
    }
    setTimeout(() => (e.target.textContent = '🔗 Link'), 1800);
  };

  const draw = () => {
    segment($('.modes', box), [...modes, 'all'], mode, (m) => (m === 'all' ? 'All' : VARIANTS[m]), (m) => ((mode = m), draw()));
    if (hasBefore) segment($('.when', box), [false, true], before, (b) => (b ? 'Before' : 'Now'), (b) => ((before = b), draw()));
    const row = $('.lineup-row', box);
    row.innerHTML = '';
    for (const state of screen.states) row.append(stateTile(screen, state, mode, before, state === selected, (v) => pick(state, v)));
  };

  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
  document.body.append(box);
  setHash();
  draw();
  $('.tile.on', box)?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

/** One column of the lineup: the state's label and its image(s) for `mode` (a variant or 'all'). */
function stateTile(screen, state, mode, before, on, pick) {
  const variants = mode === 'all' ? variantsOf(state) : state.variants[mode] ? [mode] : [];
  const dot = state.status !== 'same' ? `<i class="${state.status}"></i>` : '';
  const diff = state.status === 'changed' ? ` <span class="muted">${state.diff}%</span>` : '';
  const tile = h(`<div class="tile${on ? ' on' : ''}">
    <div class="tile-label">${esc(state.label)}${dot}${diff}</div>
    <div class="tile-shots"></div>
  </div>`);
  const frame = screen.kind === 'component' ? 'shot component' : 'shot';
  for (const v of variants) {
    const old = before ? state.before?.[v] : null;
    const img = old || state.variants[v].img;
    const tag = [mode === 'all' ? VARIANTS[v] : '', before ? (old ? 'Before' : state.status === 'new' ? 'New' : 'Unchanged') : '']
      .filter(Boolean).join(' · ');
    const shot = h(`<button class="tile-shot" title="Select ${esc(state.label)} · ${esc(VARIANTS[v])}">
      <div class="${frame}"><img src="${shotUrl(img)}" alt="${esc(state.label)}" loading="lazy">${tag ? `<span class="lbl b">${esc(tag)}</span>` : ''}</div>
    </button>`);
    shot.onclick = () => pick(v);
    $('.tile-shots', tile).append(shot);
  }
  if (!variants.length) $('.tile-shots', tile).append(h(`<div class="tile-none">No ${esc(VARIANTS[mode])} capture</div>`));
  return tile;
}
