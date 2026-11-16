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

