// Entry point: loads the sprint index, the selected sprint and wires the top bar.
// The page opens on the latest sprint. URL hash: #<sprint id> selects a sprint, #<sprint id>/demo
// also opens its demo mode (used by the "previous sprint demo" link), #<sprint id>/lineup/<group>[/<fn>]
// opens the lineup of one screen, #timeline[/<group>] shows the timeline of every sprint.
import { $, getJSON } from './util.js';
import { initTheme } from './theme.js';
import { renderOverview } from './overview.js';
import { renderTimeline } from './timeline.js';
import { closeLineup } from './lineup.js';
import { Demo } from './demo.js';

let index = [];
let overrides = {};
let sprint = null;
const cache = {};

/** The sprint file `id`, fetched once. */
const getSprint = (id) => (cache[id] ||= getJSON(`sprints/${id}.json`));

async function load(id) {
  sprint = await getSprint(id);
  renderOverview($('#main'), sprint, (screens) => Demo.open(sprint, overrides, screens));
}

/** Shows what the URL hash names: the timeline, or a sprint (latest if none or unknown) with its demo or a lineup. */
async function route() {
  closeLineup();
  const [hashId, mode, group, fn] = location.hash.slice(1).split('/').map(decodeURIComponent);
  const timeline = hashId === 'timeline';
  $('#play').hidden = timeline;
  if (timeline) {
    $('#sprint').value = 'timeline';
    sprint = null;
    $('#main').innerHTML = '<p class="loading">Loading every sprint…</p>';
    renderTimeline($('#main'), await Promise.all(index.map((s) => getSprint(s.id))), mode);
    return;
  }
  const id = index.some((s) => s.id === hashId) ? hashId : index[0].id;
  $('#sprint').value = id;
  if (sprint?.id !== id) await load(id);
  if (mode === 'demo') Demo.open(sprint, overrides);
  if (mode === 'lineup') {
    const card = [...document.querySelectorAll('.card')].find((c) => c.dataset.group === group);
    card?.scrollIntoView({ block: 'center' });
    card?.openLineup(fn);
  }
}

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
