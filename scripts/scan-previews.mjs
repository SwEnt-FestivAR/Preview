// Finds every no-argument @Preview in a FestivAR checkout, writes previews.json and drops the
// capture test into that checkout (a throwaway clone: nothing is ever pushed to FestivAR).
// Usage: node scripts/scan-previews.mjs <festivar-dir> <previews.json>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [festivar, outFile] = process.argv.slice(2);
if (!festivar || !outFile) throw new Error('usage: scan-previews.mjs <festivar-dir> <previews.json>');
const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(festivar, 'app/src/main/java');

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.kt')) yield p;
  }
}

const PREVIEW = /@Preview(?:\s*\(([^)]*)\))?\s*(?:@[\w.]+(?:\s*\([^)]*\))?\s*)*(?:(?:private|internal|public)\s+)?fun\s+(\w+)\s*\(\s*\)/g;
const num = (args, key) => Number((args.match(new RegExp(`${key}\\s*=\\s*(\\d+)`)) || [])[1] || 0);

