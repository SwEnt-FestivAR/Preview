// Turns one capture run into a week of the demo site, kept in the history folder (the `data` branch):
//   shots/<sha1>.png   every distinct image ever captured (unchanged images are stored once)
//   weeks/<id>.json    what the site shows for that week
//   index.json         list of the weeks
// Usage: node scripts/build-week.mjs --captures <dir> --previews <previews.json> --history <dir>
//          [--date <ISO date, default now>] [--commit <sha>]
// Env: GITHUB_TOKEN (optional, for the merged PRs of the week)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';

const REPO = 'SwEnt-FestivAR/FestivAR';
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const captures = args.captures;
const history = args.history;
const previews = JSON.parse(fs.readFileSync(args.previews, 'utf8'));
const end = args.date ? new Date(args.date) : new Date();
const start = new Date(end.getTime() - 7 * 864e5);
const weekId = isoWeek(end);

for (const d of ['shots', 'weeks']) fs.mkdirSync(path.join(history, d), { recursive: true });

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = d.getUTCFullYear();
  const w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

const words = (s) => s.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) || [s];
function stateLabels(fns) {
  const split = fns.map((f) => words(f.replace(/Preview\d*$/, '')));
  let common = 0;
  if (split.length > 1)
    while (split.every((w) => w[common] && w[common] === split[0][common] && w.length > common + 1)) common++;
  return split.map((w) => {
    const rest = w.slice(common).join(' ');
    return split.length === 1 || !rest ? 'Par défaut' : rest;
  });
}

// ---- 1. store this run's images ------------------------------------------------------------------
const failed = [];
const shotOf = {};
for (const p of previews) {
  for (const v of p.variants) {
    const base = path.join(captures, `${p.id}__${v}`);
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
    } catch {
      meta = { ok: false, error: 'not captured (test did not run)' };
    }
    if (!meta.ok || !fs.existsSync(base + '.png')) {
      failed.push({ id: p.id, variant: v, error: meta.error });
      continue;
    }
    const buf = fs.readFileSync(base + '.png');
    const sha = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
    const dest = path.join(history, 'shots', sha + '.png');
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, buf);
    (shotOf[p.id] ||= {})[v] = { img: sha, w: meta.w, h: meta.h, taps: meta.taps.filter((t) => t.w > 0 && t.h > 0) };
  }
}

// A variant that renders exactly like the light one (e.g. a preview forcing its theme) adds nothing.
for (const vs of Object.values(shotOf))
  for (const v of Object.keys(vs)) if (v !== 'light' && vs.light && vs[v].img === vs.light.img) delete vs[v];

// ---- 2. compare with the previous week -----------------------------------------------------------
const indexFile = path.join(history, 'index.json');
const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : [];
const prevEntry = index.filter((w) => w.id < weekId).sort((a, b) => b.id.localeCompare(a.id))[0];
const prev = prevEntry ? JSON.parse(fs.readFileSync(path.join(history, 'weeks', prevEntry.id + '.json'), 'utf8')) : null;
const prevStates = {};
for (const s of prev?.screens || []) for (const st of s.states) prevStates[st.id] = st;

function diffRatio(a, b) {
  if (a === b) return 0;
  const A = PNG.sync.read(fs.readFileSync(path.join(history, 'shots', a + '.png')));
  const B = PNG.sync.read(fs.readFileSync(path.join(history, 'shots', b + '.png')));
  if (A.width !== B.width || A.height !== B.height) return 1;
  let n = 0;
  for (let i = 0; i < A.data.length; i += 4)
    if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) > 24) n++;
  return n / (A.width * A.height);
}

const groups = {};
for (const p of previews) if (shotOf[p.id]?.light) (groups[p.group] ||= []).push(p);

const screens = Object.entries(groups).map(([group, ps]) => {
  const labels = stateLabels(ps.map((p) => p.fn));
  const states = ps.map((p, i) => {
    const before = prevStates[p.id];
    const st = { id: p.id, fn: p.fn, label: labels[i], variants: shotOf[p.id], status: 'same', diff: 0 };
    if (!prev) st.status = 'same';
    else if (!before) st.status = 'new';
    else {
      const d = diffRatio(before.variants.light.img, st.variants.light.img);
      if (d > 0.001) {
        st.status = 'changed';
        st.diff = Math.round(d * 1000) / 10;
        st.before = Object.fromEntries(Object.entries(before.variants).map(([v, x]) => [v, x.img]));
      }
    }
    return st;
  });
  const hadGroup = prev?.screens.some((s) => s.group === group);
  const status = prev && !hadGroup ? 'new' : states.some((s) => s.status !== 'same') ? 'changed' : 'same';
  return { group, file: ps[0].file, kind: ps[0].kind, status, prs: [], states };
});
const removed = (prev?.screens || []).filter((s) => !groups[s.group]).map((s) => s.group);
