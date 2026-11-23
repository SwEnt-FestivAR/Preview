// Guesses where a tap leads, so the demo hand only taps what really opens the next screen.
// A tap on a screen state A leads to state B (of another screen) when B shows a distinctive text
// that is part of the tapped label (an announcement card "Stage B is closed ..." -> its details
// screen; a lone label must be B's title, e.g. "Announcements"), or when B's screen title is what
// the label says ("Create task" -> Create Task Screen). Look-alike screens (create vs edit forms,
// mostly the same texts) never link to each other, and components never link anywhere.
import { words } from './names.mjs';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const MIN_TEXT = 10; // shorter texts ("Save", "Password") are too generic to identify a screen
const TITLE_TEXTS = 3; // a screen's first texts hold its title
const LOOKALIKE = 0.3; // share of common texts above which two screens are variants of one form

/** Words of a screen title, without the "Screen"/"Content" suffixes: "Create Task Screen" -> create, task. */
function titleWords(screen) {
  return words(screen.group).map(norm).filter((w) => w.length > 2 && !['screen', 'content'].includes(w));
}

/**
 * Adds `link: { to, tap }` to states whose light capture has a tap leading to another screen's
 * state (`to` = state id, `tap` = the tapped area). Uses then removes the `texts` of the captures.
 */
export function addLinks(screens) {
  const targets = screens.filter((s) => s.kind === 'screen').flatMap((s) => s.states.map((st) => ({ screen: s, state: st })));
  // How many screens show each text: a text shown on many screens identifies none of them.
  const seenOn = new Map();
  for (const { screen, state } of targets) {
    for (const t of new Set((state.variants.light.texts || []).map(norm))) {
      seenOn.set(t, (seenOn.get(t) || new Set()).add(screen.group));
    }
  }
  for (const screen of screens.filter((s) => s.kind === 'screen')) {
    for (const state of screen.states) {
      const best = bestLink(screen, state, targets, seenOn);
      if (best) state.link = best;
    }
  }
  for (const screen of screens) for (const state of screen.states) for (const v of Object.values(state.variants)) delete v.texts;
}

const textSet = (state) => new Set((state.variants.light.texts || []).map(norm));

/** Share of texts two states have in common (Jaccard index). */
function similarity(a, b) {
  const [x, y] = [textSet(a), textSet(b)];
  const common = [...x].filter((t) => y.has(t)).length;
  return common / (x.size + y.size - common || 1);
}

/**
 * The most plausible link from `state` of `screen`: `{ to: <state id>, tap }` for its tap box whose
 * label best matches one of `targets` (states of other screens that do not look alike), or null.
 */
function bestLink(screen, state, targets, seenOn) {
  let best = null;
  let bestScore = 0;
  for (const tap of state.variants.light.taps) {
    const label = norm(tap.label);
    if (!label) continue;
    for (const target of targets) {
      if (target.screen.group === screen.group || similarity(state, target.state) > LOOKALIKE) continue;
      const score = linkScore(label, target, seenOn);
      if (score > bestScore) [best, bestScore] = [{ to: target.state.id, tap }, score];
    }
  }
  return best;
}

/**
 * How well a tap `label` names a target state: +2 per text of the target found in the label (skipping
 * short texts and texts shown on more than two screens, see `seenOn`), +3 when it names the target's title.
 */
function linkScore(label, { screen, state }, seenOn) {
  let score = 0;
  const texts = (state.variants.light.texts || []).map(norm);
  texts.forEach((t, i) => {
    if (t.length < MIN_TEXT || seenOn.get(t)?.size > 2 || !label.includes(t)) return;
    if (t === label && i >= TITLE_TEXTS) return; // a lone label must be the target's title
    score += 2;
  });
  const title = titleWords(screen);
  const labelWords = label.split(' ');
  if (title.length > 1 && title.every((w) => labelWords.some((l) => l.startsWith(w.slice(0, 4))))) score += 3;
  return score;
}
