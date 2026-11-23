// Entry point: loads the sprint index, the selected sprint and wires the top bar.
// The page opens on the latest sprint. URL hash: #<sprint id> selects a sprint, #<sprint id>/demo
// also opens its demo mode (used by the "previous sprint demo" link), #<sprint id>/lineup/<group>[/<fn>]
// opens the lineup of one screen, #timeline[/<group>] shows the timeline of every sprint.
import { $, esc, getJSON } from './util.js';
import { initTheme } from './theme.js';
import { renderOverview } from './overview.js';
import { renderTimeline } from './timeline.js';
import { closeLineup } from './lineup.js';
import { Demo } from './demo.js';

let index = []; // index.json: every saved sprint, newest first
let overrides = {}; // demo.json
let sprint = null; // the sprint shown by the overview, null on the timeline
let routing = 0; // id of the latest route() call, so a slower earlier one does not render over it
const cache = new Map(); // sprint id -> promise of its file

/** Promise of the sprint file `id`, fetched once (a failed fetch is retried next time). */
function getSprint(id) {
  if (!cache.has(id)) cache.set(id, getJSON(`sprints/${id}.json`).catch((err) => {
    cache.delete(id);
    throw err;
  }));
  return cache.get(id);
}

/** Shows what the URL hash names: the timeline, or a sprint (latest if none or unknown) with its demo or a lineup. */
async function route() {
  const call = ++routing;
  closeLineup();
  const [hashId, mode, group, fn] = location.hash.slice(1).split('/').map(decodeURIComponent);
  const timeline = hashId === 'timeline';
  const main = $('#main');
  $('#play').hidden = timeline;
  try {
    if (timeline) {
      $('#sprint').value = 'timeline';
      sprint = null;
      main.innerHTML = '<p class="loading">Loading every sprint…</p>';
      const sprints = await Promise.all(index.map((s) => getSprint(s.id)));
      if (call === routing) renderTimeline(main, sprints, mode);
      return;
    }
    const id = index.some((s) => s.id === hashId) ? hashId : index[0].id;
    $('#sprint').value = id;
    if (sprint?.id !== id) {
      const loaded = await getSprint(id);
      if (call !== routing) return;
      sprint = loaded;
      renderOverview(main, sprint, (screens) => Demo.open(sprint, overrides, screens));
    }
  } catch (err) {
    if (call === routing) main.innerHTML = `<p class="empty">Could not load the data (${esc(err.message)}). Reload the page to try again.</p>`;
    return;
  }
  if (mode === 'demo') Demo.open(sprint, overrides);
  if (mode === 'lineup') {
    const card = [...document.querySelectorAll('.card')].find((c) => c.dataset.group === group);
    card?.scrollIntoView({ block: 'center' });
    card?.openLineup(fn);
  }
}

/** Loads the index and demo.json, fills the sprint picker, then routes on every hash change. */
async function init() {
  initTheme();
  try {
    index = await getJSON('index.json');
  } catch {
    $('#main').innerHTML =
      '<p class="empty">No sprint built yet. Run the “Weekly demo” workflow once (Actions → Weekly demo → Run workflow).</p>';
    for (const el of [$('#sprint'), $('#play')]) el.style.display = 'none'; // nothing to pick or play yet
    return;
  }
  overrides = await getJSON('demo.json').catch(() => ({}));

  const select = $('#sprint');
  select.innerHTML = index.map((s) => `<option value="${s.id}">Sprint ${s.number}</option>`).join('') +
    (index.length > 1 ? '<option value="timeline">All sprints: timeline</option>' : '');
  select.onchange = () => (location.hash = select.value);
  $('#play').onclick = () => Demo.open(sprint, overrides);
  window.addEventListener('hashchange', route);
  await route();
}

init();
