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

const previews = [];
for (const file of walk(srcRoot)) {
  const code = fs.readFileSync(file, 'utf8');
  if (!code.includes('@Preview')) continue;
  const pkg = (code.match(/^package\s+([\w.]+)/m) || [])[1] || '';
  const jvmName = (code.match(/@file:JvmName\("(\w+)"\)/) || [])[1];
  const base = path.basename(file, '.kt');
  const cls = `${pkg ? pkg + '.' : ''}${jvmName || base[0].toUpperCase() + base.slice(1) + 'Kt'}`;
  const rel = path.relative(festivar, file).replaceAll('\\', '/');
  const kind = /\/components?\//.test(rel) ? 'component' : 'screen';
  for (const m of code.matchAll(PREVIEW)) {
    const args = m[1] || '';
    previews.push({
      id: `${base}.${m[2]}`,
      group: base,
      file: rel,
      kind,
      cls,
      fn: m[2],
      w: num(args, 'widthDp') || 412,
      h: num(args, 'heightDp'),
      bg: /showBackground\s*=\s*true/.test(args),
    });
  }
}
// Keep source order: it is the natural order of a screen's states (Open, Taken, Done...).
previews.sort((a, b) => a.file.localeCompare(b.file));

export const variantsFor = (p) => (p.kind === 'screen' ? ['light', 'dark', 'font', 'tablet'] : ['light', 'dark', 'font']);
for (const p of previews) p.variants = variantsFor(p);

fs.writeFileSync(outFile, JSON.stringify(previews, null, 2));

const k = (s) => JSON.stringify(s).replaceAll('$', '\\$');
const shots = previews
  .flatMap((p) => p.variants.map((v) => `Shot(${k(p.id)}, ${k(p.cls)}, ${k(p.fn)}, ${p.w}, ${p.h}, ${p.bg}, ${k(v)}),`))
  .join('\n            ');
const tmpl = fs.readFileSync(path.join(here, '../capture/WeeklyDemoCapture.kt'), 'utf8');
const dest = path.join(festivar, 'app/src/test/java/weeklydemo/WeeklyDemoCapture.kt');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, tmpl.replace('/*SHOTS*/', shots));
console.log(`${previews.length} previews, ${previews.reduce((n, p) => n + p.variants.length, 0)} captures planned`);
