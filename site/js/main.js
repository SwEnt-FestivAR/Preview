// Entry point: loads the sprint index, the selected sprint and wires the top bar.
// The page opens on the latest sprint. URL hash: #<sprint id> selects a sprint, #<sprint id>/demo
// also opens its demo mode (used by the "previous sprint demo" link).
import { $, getJSON } from './util.js';
import { initTheme } from './theme.js';
import { renderOverview } from './overview.js';
import { Demo } from './demo.js';

let index = [];
let overrides = {};
let sprint = null;

async function load(id) {
  sprint = await getJSON(`sprints/${id}.json`);
  $('#sprint').value = id;
  renderOverview($('#main'), sprint, (screens) => Demo.open(sprint, overrides, screens));
}

/** Shows the sprint named in the URL hash (latest if none or unknown), and its demo if asked. */
async function route() {
  const [hashId, mode] = location.hash.slice(1).split('/');
  const id = index.some((s) => s.id === hashId) ? hashId : index[0].id;
  if (sprint?.id !== id) await load(id);
  if (mode === 'demo') Demo.open(sprint, overrides);
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
  select.innerHTML = index.map((s) => `<option value="${s.id}">Sprint ${s.number}</option>`).join('');
  select.onchange = () => (location.hash = select.value);
  $('#play').onclick = () => Demo.open(sprint, overrides);
  window.addEventListener('hashchange', route);
  await route();
}

init();
