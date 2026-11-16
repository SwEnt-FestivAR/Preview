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

