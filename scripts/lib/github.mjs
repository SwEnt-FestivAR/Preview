// Merged pull requests of a sprint, from the GitHub REST API (read-only).
import { MAX_PRS, REPO } from './config.mjs';

async function api(url) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'weekly-demo' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch('https://api.github.com' + url, { headers });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/**
 * PRs merged between `start` and `end` (exact times). Each PR lists the screens (groups) whose
 * Kotlin file it touched, and each of those screens gets the PR number in its `prs`. Never throws: without
 * network or token the sprint is simply built with fewer or no PRs.
 */
export async function fetchMergedPRs(start, end, screens) {
  const time = (d) => d.toISOString().slice(0, 19) + 'Z';
  const query = encodeURIComponent(`repo:${REPO} is:pr is:merged merged:${time(start)}..${time(end)}`);
  let items;
  try {
    items = (await api(`/search/issues?q=${query}&per_page=100&sort=updated`)).items.slice(0, MAX_PRS);
  } catch (e) {
    console.warn('PRs skipped:', String(e));
    return [];
  }
  const byFile = Object.fromEntries(screens.map((s) => [s.file, s]));
  const prs = [];
  for (const it of items) {
    const pr = { number: it.number, title: it.title, author: it.user.login, url: it.html_url, groups: [] };
    try {
      for (const f of await api(`/repos/${REPO}/pulls/${it.number}/files?per_page=100`)) {
        const screen = byFile[f.filename];
        if (screen && !pr.groups.includes(screen.group)) {
          pr.groups.push(screen.group);
          screen.prs.push(it.number);
        }
      }
    } catch (e) {
      console.warn(String(e));
    }
    prs.push(pr);
  }
  return prs;
}
