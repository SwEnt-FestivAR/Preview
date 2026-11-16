// Small DOM and formatting helpers shared by the page modules.

/** Folder holding index.json, weeks/ and shots/ (the `data` branch, copied at deploy time). */
export const DATA = 'data/';

/** Variant ids written by the capture test, with their labels. Keep in sync with scripts/lib/config.mjs. */
export const VARIANTS = { light: 'Light', dark: 'Dark', font: 'Font ×1.5', tablet: 'Tablet' };

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

/** "2026-W47" -> 47 */
export const weekNumber = (id) => Number(id.split('-W')[1]);

/** "2026-11-16T..." -> "16 Nov" */
export const shortDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

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
