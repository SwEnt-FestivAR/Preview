// Demo mode: a floating phone that walks through every state of the new and changed screens.
// ← / → (or the arrows) move between steps, space toggles autoplay, Escape closes.
import { $, h, esc, shotUrl, weekNumber, prLink, variantsOf, sleep, STATUS, VARIANTS } from './util.js';
import { pickTap, animateTap, hideHand } from './tap.js';

const AUTOPLAY_MS = 3200;

/**
 * Steps of the demo: one per state, screens first then components. Without an explicit list,
 * the new and changed screens of the week (or every screen when nothing changed), minus the ones
 * marked `skip` in demo.json. demo.json `order` reorders the states of a screen.
 */
function buildSteps(week, overrides, screens) {
  let list = screens || week.screens.filter((s) => s.status !== 'same' && !overrides[s.group]?.skip);
  if (!list.length) list = week.screens.filter((s) => s.kind === 'screen');
  list = [...list].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'screen' ? -1 : 1));
  const steps = [];
  for (const screen of list) {
    const order = overrides[screen.group]?.order || [];
    const rank = (s) => order.indexOf(s.fn) + 1 || order.length + 1;
    const states = [...screen.states].sort((a, b) => rank(a) - rank(b));
    states.forEach((state, k) => steps.push({ screen, state, k, n: states.length, wipe: state.status === 'changed' && state.before }));
  }
  return steps;
}

export const Demo = {
  week: null,
  overrides: {},
  steps: [],
  i: 0,
  variant: 'light',
  busy: false,
  timer: null,

  /** Opens the demo on `screens`, or on the whole week. */
  open(week, overrides, screens) {
    Object.assign(this, { week, overrides, steps: buildSteps(week, overrides, screens), i: 0, variant: 'light', whole: !screens });
    $('#demo').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#prev').onclick = () => this.go(-1);
    $('#next').onclick = () => this.go(1);
    $('#demo-close').onclick = () => this.close();
    $('#demo-auto').onclick = () => this.toggleAutoplay();
    document.onkeydown = (e) => this.onKey(e);
    this.show(true);
  },

  close() {
    this.stopAutoplay();
    $('#demo').hidden = true;
    document.body.style.overflow = '';
    if (location.hash.endsWith('/demo')) history.replaceState(null, '', `#${this.week.id}`);
  },

  onKey(e) {
    if ($('#demo').hidden) return;
    if (e.key === 'ArrowRight') this.go(1);
    else if (e.key === 'ArrowLeft') this.go(-1);
    else if (e.key === 'Escape') this.close();
    else if (e.key === ' ') {
      e.preventDefault();
      this.toggleAutoplay();
    }
  },

  toggleAutoplay() {
    if (this.timer) return this.stopAutoplay();
    $('#demo-auto').textContent = '⏸ Pause';
    const tick = () => {
      this.timer = setTimeout(async () => {
        if (this.i >= this.steps.length - 1) return this.stopAutoplay();
        await this.go(1);
        tick();
      }, AUTOPLAY_MS);
    };
    tick();
  },

  stopAutoplay() {
    clearTimeout(this.timer);
    this.timer = null;
    $('#demo-auto').textContent = '⏵ Auto';
  },

  /** Variant actually shown for a step (falls back to light when the state lacks it). */
  variantOf(step) {
    return step.state.variants[this.variant] ? this.variant : 'light';
  },

  /** Moves by `d` steps. Going forward within one screen first plays the tap animation. */
  async go(d) {
    const j = this.i + d;
    if (this.busy || j < 0 || j >= this.steps.length) return;
    this.busy = true;
    const from = this.steps[this.i];
    const to = this.steps[j];
    if (d > 0 && from.screen === to.screen) await this.tap(from, to);
    this.i = j;
    this.show(false, d);
    this.busy = false;
  },

  async tap(from, to) {
    const shot = from.state.variants[this.variantOf(from)];
    const wanted = this.overrides[from.screen.group]?.taps?.[from.state.fn];
    const target = pickTap(shot.taps, wanted || to.state.label, Boolean(wanted));
    if (!target) return;
    $('#caption .tapnote').textContent = target.label ? `Tap “${target.label}”` : 'Tap';
    await animateTap(target, shot);
  },

  /** Displays the current step. `first`: no slide-in; `dir`: slide direction. */
  show(first, dir = 1) {
    const step = this.steps[this.i];
    const variant = this.variantOf(step);
    const kind = step.screen.kind === 'component' ? ' component' : variant === 'tablet' ? ' tablet' : '';
    $('#device').className = `device${kind}`;
    if (first || dir < 0) hideHand(true);
    else setTimeout(() => !this.busy && hideHand(false), 450);
    this.showImage(step, variant, dir);
    this.showCaption(step);
    this.showControls(step, variant);
  },

  showImage(step, variant, dir) {
    const screen = $('#screen');
    screen.style.background = variant === 'dark' ? '#121212' : '#fff';
    for (const old of screen.querySelectorAll('img, .wipe-line, .ba-tag')) {
      if (old.tagName === 'IMG') old.classList.add(dir > 0 ? 'leave' : 'enter');
      setTimeout(() => old.remove(), 460);
    }
    const add = (hash, cls) => screen.appendChild(h(`<img src="${shotUrl(hash)}" alt="" class="${cls}">`));
    const current = step.state.variants[variant].img;
    const before = step.wipe && step.state.before[variant];
    if (!before) {
      const img = add(current, dir > 0 ? 'enter' : 'leave');
      requestAnimationFrame(() => requestAnimationFrame(() => img.classList.remove('enter', 'leave')));
      return;
    }
    // Changed state: show last week's version, then wipe in the new one.
    add(before, '');
    const tag = screen.appendChild(h('<span class="ba-tag">Before</span>'));
    const after = add(current, 'wipe');
    const line = screen.appendChild(h('<div class="wipe-line"></div>'));
    sleep(900).then(() => {
      after.classList.remove('wipe');
      line.style.left = '0';
      tag.textContent = 'After';
    });
    sleep(1900).then(() => line.remove());
  },

  showCaption({ screen, state, k, n, wipe }) {
    const position = `${this.i + 1}/${this.steps.length}`;
    const kicker = this.whole ? `Week ${weekNumber(this.week.id)} · ${position}` : position;
    const status = state.status === 'same' ? screen.status : state.status;
    const note = this.overrides[screen.group]?.notes?.[state.fn];
    $('#caption').innerHTML = `
      <div class="kicker">${esc(kicker)}</div>
      <h2>${esc(screen.title)}</h2>
      <div class="state">${esc(state.label)}${n > 1 ? ` <span class="dim">· state ${k + 1}/${n}</span>` : ''}</div>
      <span class="badge ${status}">${STATUS[status]}${wipe ? ` · ${state.diff}% of pixels` : ''}</span>
      ${note ? `<div class="meta note">${esc(note)}</div>` : ''}
      ${screen.prs.length ? `<div class="meta">PRs ${screen.prs.map((p) => prLink(this.week.repo, p)).join(' ')}</div>` : ''}
      <div class="tapnote"></div>`;
  },

  showControls(step, variant) {
    const seg = $('#demo-variant');
    seg.innerHTML = '';
    for (const v of variantsOf(step.state)) {
      const button = seg.appendChild(h(`<button class="${v === variant ? 'on' : ''}">${VARIANTS[v]}</button>`));
      button.onclick = () => {
        this.variant = v;
        this.show(true);
      };
    }
    $('#demo-bar').style.width = `${((this.i + 1) / this.steps.length) * 100}%`;
    $('#prev').style.visibility = this.i > 0 ? 'visible' : 'hidden';
    $('#next').style.visibility = this.i < this.steps.length - 1 ? 'visible' : 'hidden';
  },
};
