// The scrolling page: sprint header, stats, then every screen and component of the sprint as a
// card (states, variants, before/after, its own demo), grouped by what happened to it, then PRs.
import { h, esc, shortDate } from './util.js';
import { screenCard } from './card.js';

/**
 * Renders a sprint into `main`. `openDemo(screens?)` starts the demo mode, on the given screens
 * (every state) or, without argument, the sprint demo (notable changes only).
 */
export function renderOverview(main, sprint, openDemo) {
  const of = (kind, test) => sprint.screens.filter((s) => s.kind === kind && test(s));
  const isNew = (s) => s.status === 'new';
  const isChanged = (s) => s.status === 'changed';
  // Touched by a PR but pixel-identical: the change is in a state no @Preview shows. Meaningless on
  // a baseline sprint, where nothing is compared.
  const isTouched = (s) => Boolean(sprint.previous) && s.status === 'same' && s.prs.length > 0;
  const isUnchanged = (s) => s.status === 'same' && !isTouched(s);
  const baseline = 'Baseline sprint: there is no earlier sprint to compare with.';
  const groups = [
    ['New screens', 'Added this sprint, with all their states and variants.', of('screen', isNew), sprint.previous ? 'Nothing this sprint.' : baseline],
    ['Changed screens', 'Drag the slider to compare with the previous sprint.', of('screen', isChanged), sprint.previous ? 'Nothing this sprint.' : baseline],
    ['New and changed components', 'Small UI pieces.', of('component', (s) => isNew(s) || isChanged(s))],
    ['Touched without visible change', 'A PR of this sprint changed these files, but their previews look the same: the change is in a state no @Preview shows (a dialog, a saving state...). Adding a preview for it makes it appear as changed.', sprint.screens.filter(isTouched)],
    [sprint.previous ? 'Unchanged screens' : 'All screens', 'Every captured screen, with all its states.', of('screen', isUnchanged)],
    [sprint.previous ? 'Unchanged components' : 'All components', '', of('component', isUnchanged)],
  ];
  main.innerHTML = '';
  main.append(header(sprint), stats(sprint.stats));
  for (const [title, subtitle, screens, emptyText] of groups) {
    if (screens.length || emptyText) main.append(section(title, subtitle, screens, emptyText, sprint, openDemo));
  }
  main.append(pullRequests(sprint));
  if (sprint.removed.length) {
    main.append(h(`<section><h2>Removed</h2><p class="sub">${sprint.removed.map(esc).join(', ')}</p></section>`));
  }
  if (sprint.failed.length) main.append(failures(sprint.failed));
}

function header(sprint) {
  const commit = sprint.commit
    ? ` · <a href="https://github.com/${sprint.repo}/commit/${sprint.commit}">${sprint.commit.slice(0, 7)}</a>`
    : '';
  const previousNumber = sprint.previous?.split('-')[1];
  const compared = sprint.previous ? ` · compared with Sprint ${esc(previousNumber)}` : ' · baseline sprint';
  const previousDemo = sprint.previous
    ? `<a class="prev-sprint" href="#${esc(sprint.previous)}/demo">▶ Sprint ${esc(previousNumber)} demo</a>`
    : '';
  return h(`<div class="hero"><div class="hero-row"><h1>Sprint ${sprint.number}</h1>${previousDemo}</div>
    <p>${shortDate(sprint.start)} → ${shortDate(sprint.end)}${commit}${compared}</p></div>`);
}

function stats(s) {
  const tile = (n, label) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;
  return h(`<div class="stats">${tile(s.newScreens, 'new screens')}${tile(s.changedScreens, 'changed screens')}
    ${tile(s.prs, 'merged PRs')}${tile(s.contributors, 'contributors')}${tile(s.screens, 'screens captured')}</div>`);
}

/** A titled grid of screen cards, or `emptyText` when there are none. */
function section(title, subtitle, screens, emptyText, sprint, openDemo) {
  const sec = h(`<section><h2>${title}</h2>${subtitle ? `<p class="sub">${subtitle}</p>` : ''}</section>`);
  if (!screens.length) {
    sec.append(h(`<p class="empty">${emptyText}</p>`));
    return sec;
  }
  const grid = h('<div class="grid"></div>');
  for (const screen of screens) grid.append(screenCard(screen, sprint.repo, () => openDemo([screen])));
  sec.append(grid);
  return sec;
}

function pullRequests(sprint) {
  const sec = h(`<section><h2>Merged this sprint</h2>
    <p class="sub">${sprint.prs.length} PRs. Those touching a screen are tagged.</p></section>`);
  if (!sprint.prs.length) {
    sec.append(h('<p class="empty">No PR merged in this period.</p>'));
    return sec;
  }
  const rows = sprint.prs.map((p) => {
    const tag = p.groups.length ? `<span class="badge changed">${p.groups.length} screen${p.groups.length > 1 ? 's' : ''}</span>` : '';
    return `<div class="pr"><span class="num">#${p.number}</span>
      <a class="title" href="${esc(p.url)}">${esc(p.title)}</a>${tag}<span class="who">${esc(p.author)}</span></div>`;
  });
  sec.append(h(`<div class="pr-list">${rows.join('')}</div>`));
  return sec;
}

function failures(failed) {
  const rows = failed.map((f) => `<div class="fail">${esc(f.id)} @${esc(f.variant)}: ${esc(f.error)}</div>`).join('');
  return h(`<section><details><summary>${failed.length} capture(s) failed</summary>
    <p class="sub">Usually a preview that needs Firebase or a real ViewModel.</p>${rows}</details></section>`);
}
