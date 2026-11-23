// Demo mode: a floating phone that walks through screens state by state, with a hand tapping the
// element that leads to the next state. ← / → (or the arrows) move, space toggles autoplay,
// Escape closes.
import { $, h, esc, shotUrl, prLink, segment, variantsOf, sleep, STATUS, VARIANTS } from './util.js';
import { pickTap, animateTap, hideHand } from './tap.js';
import { buildSteps } from './steps.js';

const AUTOPLAY_MS = 3200;

/** The demo mode (one at a time): its state and the methods that drive the #demo block of index.html. */
export const Demo = {
  sprint: null,
  overrides: {},
  steps: [],
  i: 0,
  variant: 'light',
  busy: false,
  timer: null,

  /** Opens the demo on `screens` (all their states), or the sprint demo. */
  open(sprint, overrides, screens) {
    Object.assign(this, { sprint, overrides, steps: buildSteps(sprint, overrides, screens), i: 0, variant: 'light', whole: !screens });
    $('#demo').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#prev').onclick = () => this.go(-1);
    $('#next').onclick = () => this.go(1);
    $('#demo-close').onclick = () => this.close();
    $('#demo-auto').onclick = () => this.toggleAutoplay();
    document.onkeydown = (e) => this.onKey(e);
    this.show(true);
  },

  /** Hides the demo, stops autoplay and drops the /demo suffix from the URL hash. */
  close() {
    this.stopAutoplay();
    $('#demo').hidden = true;
    document.body.style.overflow = '';
    if (location.hash.endsWith('/demo')) history.replaceState(null, '', `#${this.sprint.id}`);
  },

  /** Keyboard shortcuts while the demo is open: ← / → move, Escape closes, space toggles autoplay. */
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

  /** Starts autoplay (one step every AUTOPLAY_MS, stopping at the end) or stops it. */
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

  /** Stops autoplay and resets its button. */
  stopAutoplay() {
    clearTimeout(this.timer);
    this.timer = null;
    $('#demo-auto').textContent = '⏵ Auto';
  },

  /** Variant actually shown for a step (falls back to light when the state lacks it). */
  variantOf(step) {
    return step.state.variants[this.variant] ? this.variant : 'light';
  },

  /** Moves by `d` steps. Going forward first plays the tap leading there, when there is one. */
  async go(d) {
    const j = this.i + d;
    if (this.busy || j < 0 || j >= this.steps.length) return;
    this.busy = true;
    const from = this.steps[this.i];
    const to = this.steps[j];
    if (d > 0 && (from.screen === to.screen || from.state.link?.to === to.state.id)) await this.tap(from, to);
    this.i = j;
    this.show(false, d);
    this.busy = false;
  },

  /** Hand tap on `from` that leads to `to`: its link to another screen, a demo.json tap or a match. */
  async tap(from, to) {
    const shot = from.state.variants[this.variantOf(from)];
    const wanted = this.overrides[from.screen.group]?.taps?.[from.state.fn];
    const link = from.state.link?.to === to.state.id ? from.state.link.tap : null;
    const target = pickTap(shot.taps, wanted || to.state.label, { link, exact: Boolean(wanted) });
    if (!target) return;
    const label = target.label.length > 40 ? `${target.label.slice(0, 40)}…` : target.label;
    $('#caption .tapnote').textContent = label ? `Tap “${label}”` : 'Tap';
    await animateTap(target, shot);
  },

  /** Displays the current step. `first`: no slide-in; `dir`: slide direction. */
  show(first, dir = 1) {
    const step = this.steps[this.i];
    const variant = this.variantOf(step);
    const kind = step.screen.kind === 'component' ? ' component' : '';
    $('#device').className = `device${kind}`;
    if (first || dir < 0) hideHand(true);
    else setTimeout(() => !this.busy && hideHand(false), 450);
    this.showImage(step, variant, dir);
    this.showCaption(step);
    this.showControls(step, variant);
  },

  /**
   * Puts the step's capture on the phone, sliding the old one out in direction `dir`. A changed state
   * (`step.wipe`) first shows its previous-sprint capture, then wipes in the new one.
   */
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
    // Changed state: show the previous sprint's version, then wipe in the new one.
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

  /** Fills the caption beside the phone: position, screen, state, status, notes, PRs, replay button. */
  showCaption(step) {
    const { screen, state, k, n, wipe } = step;
    const previous = this.steps[this.i - 1];
    const openedFrom = previous?.state.link?.to === state.id ? previous.screen.title : null;
    const position = `${this.i + 1}/${this.steps.length}`;
    const kicker = this.whole ? `Sprint ${this.sprint.number} · ${position}` : position;
    const status = state.status === 'same' ? screen.status : state.status;
    const note = this.overrides[screen.group]?.notes?.[state.fn];
    $('#caption').innerHTML = `
      <div class="kicker">${esc(kicker)}</div>
      <h2>${esc(screen.title)}</h2>
      <div class="state">${esc(state.label)}${n > 1 ? ` <span class="dim">· state ${k + 1}/${n}</span>` : ''}</div>
      <span class="badge ${status}">${STATUS[status]}${wipe ? ` · ${state.diff}% of pixels` : ''}</span>
      ${wipe ? '<div class="meta"><button class="ghost replay">↺ Replay before → after</button></div>' : ''}
      ${openedFrom ? `<div class="meta">Opened from ${esc(openedFrom)}</div>` : ''}
      ${note ? `<div class="meta note">${esc(note)}</div>` : ''}
      ${screen.prs.length ? `<div class="meta">PRs ${screen.prs.map((p) => prLink(this.sprint.repo, p)).join(' ')}</div>` : ''}
      <div class="tapnote"></div>`;
    const replay = $('#caption .replay');
    if (replay) replay.onclick = () => this.showImage(step, this.variantOf(step), 0);
  },

  /** Updates the variant switch, the progress bar and the arrows for the step. */
  showControls(step, variant) {
    segment($('#demo-variant'), variantsOf(step.state), variant, (v) => VARIANTS[v], (v) => {
      this.variant = v;
      this.show(true);
    });
    $('#demo-bar').style.width = `${((this.i + 1) / this.steps.length) * 100}%`;
    $('#prev').style.visibility = this.i > 0 ? 'visible' : 'hidden';
    $('#next').style.visibility = this.i < this.steps.length - 1 ? 'visible' : 'hidden';
  },
};
