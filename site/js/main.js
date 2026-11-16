// Entry point: loads the weeks index, the selected week and wires the top bar.
// URL hash: #<week id> selects a week, #<week id>/demo also opens the demo mode.
import { $, getJSON, weekNumber } from './util.js';
import { renderOverview } from './overview.js';
import { Demo } from './demo.js';

let overrides = {};
let week = null;

async function load(id) {
  week = await getJSON(`weeks/${id}.json`);
  renderOverview($('#main'), week, (screens) => Demo.open(week, overrides, screens));
}

async function init() {
  let index;
  try {
    index = await getJSON('index.json');
  } catch {
    $('#main').innerHTML = '<p class="empty">No week built yet. Run the “Weekly demo” workflow once.</p>';
    return;
  }
  overrides = await getJSON('demo.json').catch(() => ({}));

  const select = $('#week');
  select.innerHTML = index.map((w) => `<option value="${w.id}">Week ${weekNumber(w.id)} · ${w.id.slice(0, 4)}</option>`).join('');
  const [hashWeek, hashMode] = location.hash.slice(1).split('/');
  select.value = index.some((w) => w.id === hashWeek) ? hashWeek : index[0].id;
  select.onchange = () => {
    location.hash = select.value;
    load(select.value);
  };
  $('#play').onclick = () => Demo.open(week, overrides);

  await load(select.value);
  if (hashMode === 'demo') Demo.open(week, overrides);
}

init();
