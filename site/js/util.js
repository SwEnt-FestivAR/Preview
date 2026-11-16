// Small DOM and formatting helpers shared by the page modules.

/** Folder holding index.json, sprints/ and shots/ (the `data` branch, copied at deploy time). */
export const DATA = 'data/';

/** Variant ids written by the capture test, with their labels. Keep in sync with scripts/lib/config.mjs. */
export const VARIANTS = { light: 'Light', dark: 'Dark', font: 'Font ×1.5' };

/** Status ids written by scripts/lib/compare.mjs, with their labels. */
export const STATUS = { new: 'New', changed: 'Changed', same: 'Unchanged' };

/** querySelector shorthand. */
export const $ = (selector, root = document) => root.querySelector(selector);

/** Builds one element from an HTML string. Always pass user data through esc(). */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Escapes text for HTML. */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** URL of a stored capture. */
export const shotUrl = (hash) => `${DATA}shots/${hash}.png`;

/** "2026-11-13T11:00:00Z" -> "Fri 13 Nov, 12:00" (Swiss time, like the sprint boundaries). */
export const shortDate = (iso) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });

/** Link to a FestivAR pull request. */
export const prLink = (repo, n) => `<a href="https://github.com/${repo}/pull/${n}" target="_blank" rel="noopener">#${n}</a>`;

/** Variant ids available for a state, in display order. */
export const variantsOf = (state) => Object.keys(VARIANTS).filter((v) => state.variants[v]);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetches a JSON file from the data folder. */
export async function getJSON(file) {
  const res = await fetch(DATA + file, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}
