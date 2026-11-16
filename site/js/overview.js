// The scrolling page: week header, stats, new and changed screens, PRs, other screens.
import { $, h, esc, shotUrl, weekNumber, shortDate, STATUS } from './util.js';
import { screenCard } from './card.js';

/**
 * Renders a week into `main`. `openDemo(screens?)` starts the demo mode, on the given screens
 * or on the whole week.
 */
export function renderOverview(main, week, openDemo) {
  const byStatus = (status, kind) => week.screens.filter((s) => s.status === status && (!kind || s.kind === kind));
  main.innerHTML = '';
  main.append(header(week), stats(week.stats));
  main.append(section('New screens', 'Added this week, with all their states and variants.', byStatus('new', 'screen'), week, openDemo));
  main.append(section('Changed screens', 'Drag the slider to compare with last week.', byStatus('changed', 'screen'), week, openDemo));
  const components = [...byStatus('new', 'component'), ...byStatus('changed', 'component')];
  if (components.length) main.append(section('Components', 'Small UI pieces that are new or changed.', components, week, openDemo));
  main.append(pullRequests(week));
  const same = byStatus('same');
  if (same.length) main.append(otherScreens(same, openDemo));
  if (week.removed.length) {
    main.append(h(`<section><h2>Removed</h2><p class="sub">${week.removed.map(esc).join(', ')}</p></section>`));
  }
  if (week.failed.length) main.append(failures(week.failed));
}

function header(week) {
  const commit = week.commit
    ? ` · <a href="https://github.com/${week.repo}/commit/${week.commit}">${week.commit.slice(0, 7)}</a>`
    : '';
  const compared = week.previous ? ` · compared with ${esc(week.previous)}` : ' · baseline week';
  const lastWeek = week.previous
    ? `<a class="prev-week" href="#${esc(week.previous)}/demo">▶ Week ${weekNumber(week.previous)} demo</a>`
    : '';
  return h(`<div class="hero"><div class="hero-row"><h1>Week ${weekNumber(week.id)}</h1>${lastWeek}</div>
    <p>${shortDate(week.start)} → ${shortDate(week.end)}${commit}${compared}</p></div>`);
}

function stats(s) {
  const tile = (n, label) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;
  return h(`<div class="stats">${tile(s.newScreens, 'new screens')}${tile(s.changedScreens, 'changed screens')}
    ${tile(s.prs, 'merged PRs')}${tile(s.contributors, 'contributors')}${tile(s.screens, 'screens captured')}</div>`);
}

function section(title, subtitle, screens, week, openDemo) {
  const sec = h(`<section><h2>${title}</h2><p class="sub">${subtitle}</p></section>`);
  if (!screens.length) {
    sec.append(h('<p class="empty">Nothing this week.</p>'));
    return sec;
  }
  const grid = h('<div class="grid"></div>');
  for (const screen of screens) grid.append(screenCard(screen, week.repo, () => openDemo([screen])));
  sec.append(grid);
  return sec;
}

function pullRequests(week) {
  const sec = h(`<section><h2>Merged this week</h2>
    <p class="sub">${week.prs.length} PRs. Those touching a screen are tagged.</p></section>`);
  if (!week.prs.length) {
    sec.append(h('<p class="empty">No PR merged in this period.</p>'));
    return sec;
  }
  const rows = week.prs.map((p) => {
    const tag = p.groups.length ? `<span class="badge changed">${p.groups.length} screen${p.groups.length > 1 ? 's' : ''}</span>` : '';
    return `<div class="pr"><span class="num">#${p.number}</span>
      <a class="title" href="${esc(p.url)}">${esc(p.title)}</a>${tag}<span class="who">${esc(p.author)}</span></div>`;
  });
  sec.append(h(`<div class="pr-list">${rows.join('')}</div>`));
  return sec;
}

function otherScreens(screens, openDemo) {
  const sec = h(`<section><details><summary>All other screens (${screens.length}, ${STATUS.same.toLowerCase()})</summary>
    <div class="thumbs"></div></details></section>`);
  for (const screen of screens) {
    const n = screen.states.length;
    const thumb = h(`<button class="thumb"><img loading="lazy" src="${shotUrl(screen.states[0].variants.light.img)}" alt="">
      <b>${esc(screen.title)}</b><br><span class="muted">${n} state${n > 1 ? 's' : ''}</span></button>`);
    thumb.onclick = () => openDemo([screen]);
    $('.thumbs', sec).append(thumb);
  }
  return sec;
}

function failures(failed) {
  const rows = failed.map((f) => `<div class="fail">${esc(f.id)} @${esc(f.variant)}: ${esc(f.error)}</div>`).join('');
  return h(`<section><details><summary>${failed.length} capture(s) failed</summary>
    <p class="sub">Usually a preview that needs Firebase or a real ViewModel.</p>${rows}</details></section>`);
}
