// Entry point: loads the weeks index, the selected week and wires the top bar.
// The page opens on the latest week. URL hash: #<week id> selects a week, #<week id>/demo also
// opens its demo mode (used by the "last week's demo" link).
import { $, getJSON, weekNumber } from './util.js';
import { renderOverview } from './overview.js';
import { Demo } from './demo.js';

let index = [];
let overrides = {};
let week = null;

async function load(id) {
  week = await getJSON(`weeks/${id}.json`);
  $('#week').value = id;
  renderOverview($('#main'), week, (screens) => Demo.open(week, overrides, screens));
}

/** Shows the week named in the URL hash (latest week if none or unknown), and its demo if asked. */
async function route() {
  const [hashWeek, mode] = location.hash.slice(1).split('/');
  const id = index.some((w) => w.id === hashWeek) ? hashWeek : index[0].id;
  if (week?.id !== id) await load(id);
  if (mode === 'demo') Demo.open(week, overrides);
}

async function init() {
  try {
    index = await getJSON('index.json');
  } catch {
    $('#main').innerHTML =
      '<p class="empty">No week built yet. Run the “Weekly demo” workflow once (Actions → Weekly demo → Run workflow).</p>';
    $('.top-actions').style.display = 'none'; // nothing to pick or play yet
    return;
  }
  overrides = await getJSON('demo.json').catch(() => ({}));

  const select = $('#week');
  select.innerHTML = index.map((w) => `<option value="${w.id}">Week ${weekNumber(w.id)} · ${w.id.slice(0, 4)}</option>`).join('');
  select.onchange = () => (location.hash = select.value);
  $('#play').onclick = () => Demo.open(week, overrides);
  window.addEventListener('hashchange', route);
  await route();
}

init();
