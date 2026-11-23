// Lineup: every state of one screen side by side in a full-screen overlay, to compare them.
// One variant for all states, or "All" (each state shows its variants next to each other);
// changed states can show their previous-sprint image. Clicking a state selects it in the card.
// Escape closes.
import { $, h, esc, shotUrl, variantsOf, VARIANTS } from './util.js';

/**
 * Opens the lineup of `screen`, starting on `variant`, with `selected` outlined.
 * `onPick(state, variant)` runs when a state is clicked (the card shows it). Returns nothing.
 */
export function openLineup(screen, variant, selected, onPick) {
  let mode = variant;
  let before = false;
  const hasBefore = screen.states.some((s) => s.before);
  const modes = [...new Set(screen.states.flatMap(variantsOf))];
  const box = h(`<div class="lineup" role="dialog" aria-modal="true" aria-label="${esc(screen.title)} lineup">
    <div class="lineup-top">
      <div><h2>${esc(screen.title)}</h2><small>${screen.states.length} state${screen.states.length > 1 ? 's' : ''} side by side · click one to select it</small></div>
      <div class="lineup-tools">
        ${hasBefore ? '<div class="seg when"></div>' : ''}
        <div class="seg modes"></div>
        <button class="ghost close" title="Close (Escape)">✕</button>
      </div>
    </div>
    <div class="lineup-row"></div>
  </div>`);

  const close = () => {
    box.remove();
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  };
  const onKey = (e) => e.key === 'Escape' && close();
  $('.close', box).onclick = close;

  const draw = () => {
    segment($('.modes', box), [...modes, 'all'], mode, (m) => (m === 'all' ? 'All' : VARIANTS[m]), (m) => ((mode = m), draw()));
    if (hasBefore) segment($('.when', box), [false, true], before, (b) => (b ? 'Before' : 'Now'), (b) => ((before = b), draw()));
    const row = $('.lineup-row', box);
    row.innerHTML = '';
    for (const state of screen.states) row.append(stateTile(screen, state, mode, before, state === selected, (v) => {
      selected = state;
      onPick(state, v);
      draw();
    }));
  };

  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
  document.body.append(box);
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

/** Fills `el` with one button per value, `current` highlighted; clicking calls `choose(value)`. */
function segment(el, values, current, label, choose) {
  el.innerHTML = '';
  for (const value of values) {
    const button = h(`<button class="${value === current ? 'on' : ''}">${esc(label(value))}</button>`);
    button.onclick = () => choose(value);
    el.append(button);
  }
}
