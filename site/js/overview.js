// The scrolling page: sprint header, stats, new and changed screens, PRs, other screens.
import { $, h, esc, shotUrl, shortDate, prLink, STATUS } from './util.js';
import { screenCard } from './card.js';

/**
 * Renders a sprint into `main`. `openDemo(screens?)` starts the demo mode, on the given screens
 * or on the whole sprint.
 */
export function renderOverview(main, sprint, openDemo) {
  const byStatus = (status, kind) => sprint.screens.filter((s) => s.status === status && (!kind || s.kind === kind));
  main.innerHTML = '';
  main.append(header(sprint), stats(sprint.stats));
  main.append(section('New screens', 'Added this sprint, with all their states and variants.', byStatus('new', 'screen'), sprint, openDemo));
  main.append(section('Changed screens', 'Drag the slider to compare with the previous sprint.', byStatus('changed', 'screen'), sprint, openDemo));
  const components = [...byStatus('new', 'component'), ...byStatus('changed', 'component')];
  if (components.length) main.append(section('Components', 'Small UI pieces that are new or changed.', components, sprint, openDemo));
  // Touched by a PR but pixel-identical: the change is in a state no @Preview shows.
  const touched = byStatus('same').filter((s) => s.prs.length);
  if (touched.length) main.append(touchedScreens(touched, sprint.repo, openDemo));
  main.append(pullRequests(sprint));
  const same = byStatus('same');
  if (same.length) main.append(otherScreens(same, openDemo));
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

function section(title, subtitle, screens, sprint, openDemo) {
  const sec = h(`<section><h2>${title}</h2><p class="sub">${subtitle}</p></section>`);
  if (!screens.length) {
    const text = sprint.previous ? 'Nothing this sprint.' : 'Baseline sprint: there is no earlier sprint to compare with.';
    sec.append(h(`<p class="empty">${text}</p>`));
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

/** Grid of small screenshots; `extra(screen)` adds a line of HTML under the title. */
function thumbs(screens, openDemo, extra = () => '') {
  const grid = h('<div class="thumbs"></div>');
  for (const screen of screens) {
    const n = screen.states.length;
    const thumb = h(`<div class="thumb" role="button" tabindex="0">
      <img loading="lazy" src="${shotUrl(screen.states[0].variants.light.img)}" alt="">
      <b>${esc(screen.title)}</b><br><span class="muted">${n} state${n > 1 ? 's' : ''}</span>${extra(screen)}</div>`);
    thumb.onclick = (e) => e.target.tagName !== 'A' && openDemo([screen]);
    grid.append(thumb);
  }
  return grid;
}

function touchedScreens(screens, repo, openDemo) {
  const sec = h(`<section><h2>Touched without visible change</h2>
    <p class="sub">A PR of this sprint changed these files, but their previews look the same: the change is
    in a state no @Preview shows (a dialog, a saving state...). Adding a preview for it makes it appear here.</p></section>`);
  sec.append(thumbs(screens, openDemo, (s) => `<br><span class="prs-inline">PRs ${s.prs.map((n) => prLink(repo, n)).join(' ')}</span>`));
  return sec;
}

function otherScreens(screens, openDemo) {
  const sec = h(`<section><details><summary>All other screens (${screens.length}, ${STATUS.same.toLowerCase()})</summary>
    </details></section>`);
  $('details', sec).append(thumbs(screens, openDemo));
  return sec;
}

function failures(failed) {
  const rows = failed.map((f) => `<div class="fail">${esc(f.id)} @${esc(f.variant)}: ${esc(f.error)}</div>`).join('');
  return h(`<section><details><summary>${failed.length} capture(s) failed</summary>
    <p class="sub">Usually a preview that needs Firebase or a real ViewModel.</p>${rows}</details></section>`);
}
