// Light / dark toggle. Without a saved choice the page follows the system theme; the choice is
// kept in localStorage (per browser) and applied as data-theme on <html> (see css/base.css).
import { $ } from './util.js';

const KEY = 'weekly-demo-theme';

function saved() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // storage blocked (private window...): just follow the system
  }
}

function current() {
  return saved() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  const button = $('#theme');
  button.textContent = theme === 'dark' ? '☀' : '☾';
  button.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
}

/** Applies the saved or system theme and wires the toggle button. */
export function initTheme() {
  apply(current());
  $('#theme').onclick = () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* not persisted, still applied */
    }
    apply(next);
  };
}
