// The demo "hand": picks the element to tap and animates the tap on the floating phone.
import { $, h, sleep } from './util.js';

/** Offset of the fingertip inside the 58 px hand icon. */
const FINGERTIP = { x: 23, y: 7 };

/**
 * Picks the clickable area (from the capture JSON) most likely to lead to the next state.
 * With `exact`, `hint` is a label set in demo.json and must be contained in the element label.
 * Otherwise the label sharing most words with `hint` (the next state's name) wins; failing that,
 * the lowest labelled button-sized element. Returns null when nothing fits.
 */
export function pickTap(taps, hint, exact) {
  if (!taps?.length) return null;
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (exact) return taps.find((t) => norm(t.label).includes(norm(hint))) || null;
  const hintWords = norm(hint).split(/\s+/).filter((w) => w.length > 2);
  let best = null;
  let bestScore = 0;
  for (const t of taps) {
    const score = hintWords.filter((w) => norm(t.label).includes(w)).length;
    if (score > bestScore) [best, bestScore] = [t, score];
  }
  if (best) return best;
  const buttons = taps.filter((t) => t.label && t.w * t.h < 0.25 && t.w * t.h > 0.0005);
  return buttons.sort((a, b) => b.y + b.h - (a.y + a.h))[0] || null;
}

/**
 * Where the image pixels really are inside an <img> using object-fit: contain, top-aligned.
 * Uses offset* (local, untransformed) sizes: the phone is tilted in 3D, so client rects would be skewed.
 */
function contentRect(img, shot) {
  const scale = Math.min(img.offsetWidth / shot.w, img.offsetHeight / shot.h);
  const width = shot.w * scale;
  return { left: img.offsetLeft + (img.offsetWidth - width) / 2, top: img.offsetTop, width, height: shot.h * scale };
}

/** Moves the hand to `target` on the displayed `shot`, highlights it and taps. */
export async function animateTap(target, shot) {
  const device = $('#device');
  const screen = $('#screen');
  const img = [...screen.querySelectorAll('img')].pop();
  const r = contentRect(img, shot);
  // Target box in screen coordinates, then its centre in device coordinates (hand and ripple live there).
  const box = { x: r.left + target.x * r.width, y: r.top + target.y * r.height, w: target.w * r.width, h: target.h * r.height };
  const cx = screen.offsetLeft + box.x + box.w / 2;
  const cy = screen.offsetTop + box.y + box.h / 2;

  const hand = $('#hand');
  hand.classList.add('show');
  await sleep(20);
  hand.style.transform = `translate(${cx - FINGERTIP.x}px, ${cy - FINGERTIP.y}px)`;
  const outline = h(`<div class="target" style="left:${box.x - 4}px;top:${box.y - 4}px;width:${box.w + 8}px;height:${box.h + 8}px"></div>`);
  screen.append(outline);
  await sleep(900);

  hand.classList.add('press');
  const ripple = h(`<div class="ripple" style="left:${cx}px;top:${cy}px"></div>`);
  device.append(ripple);
  await sleep(380);
  hand.classList.remove('press');
  setTimeout(() => [ripple, outline].forEach((el) => el.remove()), 700);
  await sleep(120);
}

/** Hides the hand; `reset` also sends it back to its resting place below the phone. */
export function hideHand(reset) {
  const hand = $('#hand');
  hand.classList.remove('show');
  if (reset) hand.style.transform = '';
}
