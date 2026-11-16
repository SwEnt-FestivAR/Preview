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

