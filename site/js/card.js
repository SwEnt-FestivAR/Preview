// One screen card of the overview: screenshot (or before/after slider), state chips, variant switch.
import { $, h, esc, shotUrl, prLink, variantsOf, STATUS, VARIANTS } from './util.js';
import { openLineup } from './lineup.js';

const PATH_PREFIX = 'app/src/main/java/com/android/festivar/';

/** Builds the card of `screen`. `onDemo` opens the demo mode on this screen. */
export function screenCard(screen, repo, onDemo) {
  let state = screen.states.find((s) => s.status !== 'same') || screen.states[0];
  let variant = 'light';
  const prs = screen.prs.length ? `<div class="prs-inline">PRs: ${screen.prs.map((n) => prLink(repo, n)).join(' ')}</div>` : '';
  const card = h(`<div class="card">
    <div class="card-head">
      <div><h3>${esc(screen.title)}</h3><small>${esc(screen.file.replace(PATH_PREFIX, ''))}</small></div>
      <span class="badge ${screen.status}">${STATUS[screen.status]}</span>
    </div>
    <div class="viewer"></div>
    <div class="chips states"></div>
    <div class="seg variants"></div>
    ${prs}
    <div class="card-actions">
      <button class="ghost lineup-btn" title="All states side by side">⇆ Lineup</button>
      <button class="ghost demo-btn">▶ Play as demo</button>
    </div>
  </div>`);
  $('.demo-btn', card).onclick = onDemo;

  const draw = () => {
    if (!state.variants[variant]) variant = 'light';
    drawViewer($('.viewer', card), screen, state, variant);
    fill($('.states', card), screen.states, (s) => {
      const dot = s.status !== 'same' ? `<i class="${s.status}"></i>` : '';
      return [`<button class="chip${s === state ? ' on' : ''}">${esc(s.label)}${dot}</button>`, () => (state = s)];
    }, draw);
    fill($('.variants', card), variantsOf(state), (v) => [`<button class="${v === variant ? 'on' : ''}">${VARIANTS[v]}</button>`, () => (variant = v)], draw);
  };
  $('.lineup-btn', card).onclick = () => openLineup(screen, variant, state, (s, v) => {
    state = s;
    variant = v;
    draw();
  });
  draw();
  return card;
}

/** Replaces the children of `el` by one button per item; clicking runs its action then `redraw`. */
function fill(el, items, toButton, redraw) {
  el.innerHTML = '';
  for (const item of items) {
    const [html, action] = toButton(item);
    const button = h(html);
    button.onclick = () => {
      action();
      redraw();
    };
    el.append(button);
  }
}

/** Screenshot of the state, or a before/after slider when it changed since the previous sprint. */
function drawViewer(el, screen, state, variant) {
  const current = state.variants[variant];
  const before = state.before?.[variant];
  const frame = screen.kind === 'component' ? 'shot component' : 'shot';
  if (!before || before === current.img) {
    el.innerHTML = `<div class="${frame}"><img src="${shotUrl(current.img)}" alt="${esc(state.label)}"></div>`;
    return;
  }
  el.innerHTML = `<div class="compare"><div class="${frame}">
      <img src="${shotUrl(before)}" alt="Before">
      <div class="after"><img src="${shotUrl(current.img)}" alt="After"></div><div class="line"></div>
      <span class="lbl b">Before</span><span class="lbl a">After · ${state.diff}%</span>
    </div><input class="slider" type="range" min="0" max="100" value="50" aria-label="Before / after"></div>`;
  const after = $('.after', el);
  const line = $('.line', el);
  $('.slider', el).oninput = (e) => {
    after.style.clipPath = `inset(0 0 0 ${e.target.value}%)`;
    line.style.left = `${e.target.value}%`;
  };
}
