'use strict';
// FestivAR Weekly demo — static page. Data comes from data/index.json and data/weeks/<id>.json,
// written by scripts/build-week.mjs; images live in data/shots/<sha>.png.

const DATA = 'data/';
const VARIANTS = { light: 'Clair', dark: 'Sombre', font: 'Police ×1.5', tablet: 'Tablette' };
const STATUS = { new: 'Nouveau', changed: 'Modifié', same: 'Inchangé' };
const $ = (s, el = document) => el.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const img = (sha) => `${DATA}shots/${sha}.png`;
const words = (s) => String(s).match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) || [String(s)];
const pretty = (name) => words(name).join(' ');
const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });

let week = null;
let overrides = {};

async function getJSON(p) {
  const r = await fetch(DATA + p, { cache: 'no-cache' });
  if (!r.ok) throw new Error(p + ': ' + r.status);
  return r.json();
}

async function init() {
  let index;
  try {
    index = await getJSON('index.json');
  } catch {
    $('#main').innerHTML = '<p class="empty">Pas encore de semaine construite. Lance le workflow « Weekly demo » une première fois.</p>';
    return;
  }
  try { overrides = await getJSON('demo.json'); } catch { overrides = {}; }
  const sel = $('#week');
  sel.innerHTML = index.map((w) => `<option value="${w.id}">Semaine ${+w.id.split('-W')[1]} · ${w.id.slice(0, 4)}</option>`).join('');
  const [hashWeek, hashMode] = location.hash.slice(1).split('/');
  sel.value = index.some((w) => w.id === hashWeek) ? hashWeek : index[0].id;
  sel.onchange = () => { location.hash = sel.value; load(sel.value); };
  $('#play').onclick = () => Demo.open();
  await load(sel.value);
  if (hashMode === 'demo') Demo.open();
}

async function load(id) {
  week = await getJSON(`weeks/${id}.json`);
  render();
}

// ------------------------------------------------------------------ overview
function render() {
  const w = week;
  const s = w.stats;
  const by = (st, kind) => w.screens.filter((x) => x.status === st && (!kind || x.kind === kind));
  const main = $('#main');
  main.innerHTML = '';
  main.append(h(`<div class="hero">
    <h1>Semaine ${esc(w.id.split('-W')[1])}</h1>
    <p>${fmtDate(w.start)} → ${fmtDate(w.end)}${w.commit ? ` · <a href="https://github.com/${w.repo}/commit/${w.commit}">${w.commit.slice(0, 7)}</a>` : ''}${w.previous ? ` · comparé à ${esc(w.previous)}` : ' · semaine de référence'}</p>
  </div>`));
  main.append(h(`<div class="stats">
    <div class="stat"><b>${s.newScreens}</b><span>écrans nouveaux</span></div>
    <div class="stat"><b>${s.changedScreens}</b><span>écrans modifiés</span></div>
    <div class="stat"><b>${s.prs}</b><span>PR mergées</span></div>
    <div class="stat"><b>${s.contributors}</b><span>contributeurs</span></div>
    <div class="stat"><b>${s.screens}</b><span>écrans capturés</span></div>
  </div>`));

  section(main, 'Nouveaux écrans', 'Apparus cette semaine, avec tous leurs états et variantes.', by('new', 'screen'));
  section(main, 'Écrans modifiés', 'Glisse le curseur pour comparer avec la semaine précédente.', by('changed', 'screen'));
  const comps = [...by('new', 'component'), ...by('changed', 'component')];
  if (comps.length) section(main, 'Composants', 'Petits éléments d’UI nouveaux ou modifiés.', comps);

  const prSec = h(`<section><h2>Mergé cette semaine</h2><p class="sub">${w.prs.length} PR. Celles qui touchent un écran sont étiquetées.</p></section>`);
  prSec.append(w.prs.length
    ? h(`<div class="pr-list">${w.prs.map((p) => `<div class="pr"><span class="num">#${p.number}</span>
        <a class="title" href="${esc(p.url)}">${esc(p.title)}</a>
        ${p.groups.length ? `<span class="badge changed">${p.groups.length} écran${p.groups.length > 1 ? 's' : ''}</span>` : ''}
        <span class="who">${esc(p.author)}</span></div>`).join('')}</div>`)
    : h('<p class="empty">Aucune PR mergée sur la période.</p>'));
  main.append(prSec);

  const same = w.screens.filter((x) => x.status === 'same');
  if (same.length) {
    const d = h(`<section><details><summary>Tous les autres écrans (${same.length}, inchangés)</summary><div class="thumbs"></div></details></section>`);
    for (const sc of same) {
      const t = h(`<button class="thumb"><img loading="lazy" src="${img(sc.states[0].variants.light.img)}" alt=""><b>${esc(pretty(sc.group))}</b><br><span class="muted">${sc.states.length} état${sc.states.length > 1 ? 's' : ''}</span></button>`);
      t.onclick = () => Demo.open([sc]);
      $('.thumbs', d).append(t);
    }
    main.append(d);
  }
  if (w.removed.length) main.append(h(`<section><h2>Retirés</h2><p class="sub">${w.removed.map((r) => esc(pretty(r))).join(', ')}</p></section>`));
  if (w.failed.length) {
    main.append(h(`<section><details><summary>${w.failed.length} capture(s) impossible(s)</summary>
      <p class="sub">Souvent une preview qui dépend de Firebase ou d’un ViewModel réel.</p>
      ${w.failed.map((f) => `<div class="fail">${esc(f.id)} @${esc(f.variant)} — ${esc(f.error)}</div>`).join('')}</details></section>`));
  }
}

function section(main, title, sub, list) {
  const sec = h(`<section><h2>${title}</h2><p class="sub">${sub}</p></section>`);
  if (!list.length) sec.append(h('<p class="empty">Rien cette semaine.</p>'));
  else {
    const grid = h('<div class="grid"></div>');
    list.forEach((sc) => grid.append(card(sc)));
    sec.append(grid);
  }
  main.append(sec);
}

function card(sc) {
  let st = sc.states.find((x) => x.status !== 'same') || sc.states[0];
  let variant = 'light';
  const el = h(`<div class="card">
    <div class="card-head"><div><h3>${esc(pretty(sc.group))}</h3><small>${esc(sc.file.replace('app/src/main/java/com/android/festivar/', ''))}</small></div><span class="badge ${sc.status}">${STATUS[sc.status]}</span></div>
    <div class="viewer"></div>
    <div class="chips states"></div>
    <div class="seg variants"></div>
    ${sc.prs.length ? `<div class="prs-inline">PR : ${sc.prs.map((n) => `<a href="https://github.com/${week.repo}/pull/${n}">#${n}</a>`).join(' ')}</div>` : ''}
    <button class="ghost">▶ Voir en démo</button>
  </div>`);
  $('button.ghost', el).onclick = () => Demo.open([sc]);
  const draw = () => {
    if (!st.variants[variant]) variant = 'light';
    const cur = st.variants[variant];
    const before = st.before?.[variant];
    const comp = sc.kind === 'component' ? ' component' : '';
    const v = $('.viewer', el);
    if (before && before !== cur.img) {
      v.innerHTML = `<div style="width:100%"><div style="display:flex;justify-content:center"><div class="shot${comp}">
        <img src="${img(before)}" alt="Avant"><div class="after"><img src="${img(cur.img)}" alt="Après"></div><div class="line"></div>
        <span class="lbl b">Avant</span><span class="lbl a">Après · ${st.diff}%</span></div></div>
        <input class="slider" type="range" min="0" max="100" value="50" aria-label="Avant / après"></div>`;
      const after = $('.after', v), line = $('.line', v);
      $('.slider', v).oninput = (e) => { after.style.clipPath = `inset(0 0 0 ${e.target.value}%)`; line.style.left = e.target.value + '%'; };
    } else {
      v.innerHTML = `<div class="shot${comp}"><img src="${img(cur.img)}" alt="${esc(st.label)}"></div>`;
    }
    $('.states', el).innerHTML = '';
    sc.states.forEach((x) => {
      const b = h(`<button class="chip${x === st ? ' on' : ''}">${esc(x.label)}${x.status !== 'same' ? `<i class="${x.status}"></i>` : ''}</button>`);
      b.onclick = () => { st = x; draw(); };
      $('.states', el).append(b);
    });
    $('.variants', el).innerHTML = '';
    Object.keys(VARIANTS).filter((k) => st.variants[k]).forEach((k) => {
      const b = h(`<button class="${k === variant ? 'on' : ''}">${VARIANTS[k]}</button>`);
      b.onclick = () => { variant = k; draw(); };
      $('.variants', el).append(b);
    });
  };
  draw();
  return el;
}

// ------------------------------------------------------------------ demo mode
const Demo = {
  steps: [], i: 0, variant: 'light', busy: false, timer: null,

  open(list) {
    const ov = (sc) => overrides[sc.group] || {};
    let screens = list || week.screens.filter((s) => s.status !== 'same');
    this.intro = !list;
    if (!screens.length) screens = week.screens.filter((s) => s.kind === 'screen');
    screens = screens.filter((s) => list || !ov(s).skip)
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'screen' ? -1 : 1));
    this.steps = [];
    for (const sc of screens) {
      const order = ov(sc).order || [];
      const states = [...sc.states].sort((a, b) => (order.indexOf(a.fn) + 1 || 99) - (order.indexOf(b.fn) + 1 || 99));
      states.forEach((st, k) => this.steps.push({ sc, st, k, n: states.length, diff: st.status === 'changed' && st.before }));
    }
    this.i = 0;
    this.variant = 'light';
    $('#demo').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#prev').onclick = () => this.go(-1);
    $('#next').onclick = () => this.go(1);
    $('#demo-close').onclick = () => this.close();
    $('#demo-auto').onclick = () => this.toggleAuto();
    document.onkeydown = (e) => {
      if ($('#demo').hidden) return;
      if (e.key === 'ArrowRight') this.go(1);
      else if (e.key === 'ArrowLeft') this.go(-1);
      else if (e.key === 'Escape') this.close();
      else if (e.key === ' ') { e.preventDefault(); this.toggleAuto(); }
    };
    this.show(true);
  },

  close() {
    this.stopAuto();
    $('#demo').hidden = true;
    document.body.style.overflow = '';
    if (location.hash.endsWith('/demo')) history.replaceState(null, '', '#' + week.id);
  },

  toggleAuto() {
    if (this.timer) return this.stopAuto();
    $('#demo-auto').textContent = '⏸ Pause';
    const tick = () => { this.timer = setTimeout(async () => { if (this.i >= this.steps.length - 1) return this.stopAuto(); await this.go(1); tick(); }, 3200); };
    tick();
  },
  stopAuto() { clearTimeout(this.timer); this.timer = null; $('#demo-auto').textContent = '⏵ Auto'; },

  cur() { return this.steps[this.i]; },
  vOf(step) { return step.st.variants[this.variant] ? this.variant : 'light'; },

  async go(d) {
    const j = this.i + d;
    if (this.busy || j < 0 || j >= this.steps.length) return;
    const a = this.cur(), b = this.steps[j];
    this.busy = true;
    if (d > 0 && a.sc === b.sc) await this.tap(a, b);
    this.i = j;
    this.show(false, d);
    this.busy = false;
  },

  // Finger moves to the element most likely to lead to the next state, taps, then we switch.
  async tap(a, b) {
    const v = a.st.variants[this.vOf(a)];
    const want = (overrides[a.sc.group]?.taps || {})[a.st.fn];
    const target = pickTap(v.taps, want || b.st.label, !!want);
    const note = $('#caption .tapnote');
    if (!target) { if (note) note.textContent = ''; return; }
    // Local (untransformed) coordinates: the device is tilted in 3D, client rects would be skewed.
    const scrEl = $('#screen');
    const shot = [...scrEl.querySelectorAll('img')].pop();
    const r = contentRect(shot, v);
    const scr = { left: scrEl.offsetLeft, top: scrEl.offsetTop }, dev = { left: 0, top: 0 };
    const box = { x: scrEl.offsetLeft + r.left + target.x * r.width, y: scrEl.offsetTop + r.top + target.y * r.height, w: target.w * r.width, h: target.h * r.height };
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    if (note) note.textContent = target.label ? `Appui sur « ${target.label} »` : 'Appui';
    const hand = $('#hand');
    hand.classList.add('show');
    await sleep(20);
    hand.style.transform = `translate(${cx - 23}px, ${cy - 7}px)`;
    const hl = h(`<div class="target" style="left:${box.x - scr.left + dev.left - 4}px;top:${box.y - scr.top + dev.top - 4}px;width:${box.w + 8}px;height:${box.h + 8}px"></div>`);
    $('#screen').append(hl);
    await sleep(900);
    hand.classList.add('press');
    const rp = h(`<div class="ripple" style="left:${cx}px;top:${cy}px"></div>`);
    $('#device').append(rp);
    await sleep(380);
    hand.classList.remove('press');
    setTimeout(() => { rp.remove(); hl.remove(); }, 700);
    await sleep(120);
  },

  show(first, dir = 1) {
    const step = this.cur();
    const { sc, st } = step;
    const vk = this.vOf(step);
    const v = st.variants[vk];
    const ov = overrides[sc.group] || {};
    const device = $('#device');
    device.className = 'device' + (sc.kind === 'component' ? ' component' : vk === 'tablet' ? ' tablet' : '');
    const screen = $('#screen');
    screen.style.background = vk === 'dark' ? '#121212' : '#fff';
    const hand = $('#hand');
    if (first || dir < 0) { hand.classList.remove('show'); hand.style.transform = ''; }
    else setTimeout(() => { if (!this.busy) { hand.classList.remove('show'); } }, 450);

    const old = [...screen.querySelectorAll('img, .wipe-line, .ba-tag')];
    const add = (src, cls) => { const im = h(`<img src="${src}" alt="" class="${cls}">`); screen.append(im); return im; };
    old.forEach((o) => { if (o.tagName === 'IMG') o.classList.add(dir > 0 ? 'leave' : 'enter'); setTimeout(() => o.remove(), 460); });

    if (step.diff && step.st.before[vk]) {
      add(img(step.st.before[vk]), '');
      const tag = h('<span class="ba-tag" style="left:16px">Avant</span>');
      screen.append(tag);
      const after = add(img(v.img), 'wipe');
      const line = h('<div class="wipe-line"></div>');
      screen.append(line);
      setTimeout(() => { after.classList.remove('wipe'); line.style.left = '0'; tag.textContent = 'Après'; }, 900);
      setTimeout(() => line.remove(), 1900);
    } else {
      const im = add(img(v.img), dir > 0 ? 'enter' : 'leave');
      requestAnimationFrame(() => requestAnimationFrame(() => im.classList.remove('enter', 'leave')));
    }

    const intro = this.intro ? `Semaine ${week.id.split('-W')[1]} · ${this.i + 1}/${this.steps.length}` : `${this.i + 1}/${this.steps.length}`;
    $('#caption').innerHTML = `
      <div class="kicker">${esc(intro)}</div>
      <h2>${esc(pretty(sc.group))}</h2>
      <div class="state">${esc(st.label)}${step.n > 1 ? ` <span style="opacity:.6">· état ${step.k + 1}/${step.n}</span>` : ''}</div>
      <span class="badge ${st.status === 'same' ? sc.status : st.status}">${STATUS[st.status === 'same' ? sc.status : st.status]}${step.diff ? ` · ${st.diff}% des pixels` : ''}</span>
      ${ov.notes?.[st.fn] ? `<div class="meta" style="color:#f1efe8">${esc(ov.notes[st.fn])}</div>` : ''}
      ${sc.prs.length ? `<div class="meta">PR ${sc.prs.map((n) => `<a href="https://github.com/${week.repo}/pull/${n}" target="_blank">#${n}</a>`).join(' ')}</div>` : ''}
      <div class="tapnote"></div>`;

    const seg = $('#demo-variant');
    seg.innerHTML = '';
    Object.keys(VARIANTS).filter((k) => st.variants[k]).forEach((k) => {
      const b = h(`<button class="${k === vk ? 'on' : ''}">${VARIANTS[k]}</button>`);
      b.onclick = () => { this.variant = k; this.show(true); };
      seg.append(b);
    });
    $('#demo-bar').style.width = ((this.i + 1) / this.steps.length) * 100 + '%';
    $('#prev').style.visibility = this.i > 0 ? 'visible' : 'hidden';
    $('#next').style.visibility = this.i < this.steps.length - 1 ? 'visible' : 'hidden';
  },
};

// Where the image's pixels really are inside its (object-fit: contain, top) box.
function contentRect(el, v) {
  const b = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
  const s = Math.min(b.width / v.w, b.height / v.h);
  const w = v.w * s, hh = v.h * s;
  return { left: b.left + (b.width - w) / 2, top: b.top, width: w, height: hh };
}

