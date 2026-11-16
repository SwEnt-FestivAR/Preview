// Stores capture images in the history (one file per distinct image) and compares them.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';

/**
 * Reads the PNG + JSON written by the capture test for every preview and variant, copies each
 * distinct image to <history>/shots/<hash>.png and returns:
 *   shots:  { [previewId]: { [variant]: { img, w, h, taps } } }
 *   failed: [{ id, variant, error }]
 */
export function storeShots(capturesDir, previews, historyDir) {
  const shots = {};
  const failed = [];
  for (const p of previews) {
    for (const variant of p.variants) {
      const base = path.join(capturesDir, `${p.id}__${variant}`);
      const meta = readMeta(base + '.json');
      if (!meta.ok || !fs.existsSync(base + '.png')) {
        failed.push({ id: p.id, variant, error: meta.error });
        continue;
      }
      const img = saveImage(fs.readFileSync(base + '.png'), historyDir);
      const taps = meta.taps.filter((t) => t.w > 0 && t.h > 0);
      (shots[p.id] ||= {})[variant] = { img, w: meta.w, h: meta.h, taps };
    }
  }
  dropDuplicateVariants(shots);
  return { shots, failed };
}

function readMeta(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { ok: false, error: 'not captured (the test did not run)' };
  }
}

/** Saves the image under its content hash (if new) and returns that hash. */
function saveImage(buffer, historyDir) {
  const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
  const dest = path.join(historyDir, 'shots', hash + '.png');
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, buffer);
  return hash;
}

/** A variant rendered exactly like `light` (a preview forcing its theme, say) adds nothing. */
function dropDuplicateVariants(shots) {
  for (const variants of Object.values(shots)) {
    for (const v of Object.keys(variants)) {
      if (v !== 'light' && variants.light && variants[v].img === variants.light.img) delete variants[v];
    }
  }
}

/** Share (0..1) of pixels that visibly differ between two stored images; 1 if sizes differ. */
export function diffRatio(hashA, hashB, historyDir) {
  if (hashA === hashB) return 0;
  const read = (h) => PNG.sync.read(fs.readFileSync(path.join(historyDir, 'shots', h + '.png')));
  const a = read(hashA);
  const b = read(hashB);
  if (a.width !== b.width || a.height !== b.height) return 1;
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const delta =
      Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (delta > 24) changed++;
  }
  return changed / (a.width * a.height);
}
