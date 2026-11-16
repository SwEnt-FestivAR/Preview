// Finds every no-argument @Preview in a FestivAR checkout, writes previews.json and copies the
// capture test into that checkout with the list of shots filled in. The checkout must be a
// throwaway clone: nothing here is ever committed or pushed to FestivAR.
// Usage: node scripts/scan-previews.mjs <festivar-dir> <previews.json>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE_ROOT, TEST_DEST, VARIANTS } from './lib/config.mjs';

const TEMPLATE = path.join(path.dirname(fileURLToPath(import.meta.url)), '../capture/WeeklyDemoCapture.kt');

// @Preview(...) [other annotations] [visibility] fun Name()   -- previews with parameters are skipped.
const PREVIEW =
  /@Preview(?:\s*\(([^)]*)\))?\s*(?:@[\w.]+(?:\s*\([^)]*\))?\s*)*(?:(?:private|internal|public)\s+)?fun\s+(\w+)\s*\(\s*\)/g;

function* kotlinFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* kotlinFiles(p);
    else if (entry.name.endsWith('.kt')) yield p;
  }
}

const intArg = (args, key) => Number((args.match(new RegExp(`${key}\\s*=\\s*(\\d+)`)) || [])[1] || 0);

/** JVM class holding the top-level functions of a Kotlin file ("Foo.kt" -> "pkg.FooKt"). */
function jvmClass(code, file) {
  const pkg = (code.match(/^package\s+([\w.]+)/m) || [])[1];
  const jvmName = (code.match(/@file:JvmName\("(\w+)"\)/) || [])[1];
  const base = path.basename(file, '.kt');
  const name = jvmName || base[0].toUpperCase() + base.slice(1) + 'Kt';
  return pkg ? `${pkg}.${name}` : name;
}

/** All previews of the checkout, in file order then source order (= natural state order). */
function scanPreviews(festivarDir) {
  const previews = [];
  for (const file of kotlinFiles(path.join(festivarDir, SOURCE_ROOT))) {
    const code = fs.readFileSync(file, 'utf8');
    if (!code.includes('@Preview')) continue;
    const rel = path.relative(festivarDir, file).replaceAll('\\', '/');
    const group = path.basename(file, '.kt');
    const kind = /\/components?\//.test(rel) ? 'component' : 'screen';
    for (const [, args = '', fn] of code.matchAll(PREVIEW)) {
      previews.push({
        id: `${group}.${fn}`,
        group,
        file: rel,
        kind,
        cls: jvmClass(code, file),
        fn,
        w: intArg(args, 'widthDp') || 412,
        h: intArg(args, 'heightDp'),
        bg: /showBackground\s*=\s*true/.test(args),
        variants: VARIANTS[kind],
      });
    }
  }
  return previews.sort((a, b) => a.file.localeCompare(b.file)); // stable: keeps source order
}

/** Kotlin source of the capture test with one Shot(...) per preview and variant. */
function captureTest(previews) {
  const str = (s) => JSON.stringify(s).replaceAll('$', '\\$');
  const shots = previews
    .flatMap((p) => p.variants.map((v) => `Shot(${str(p.id)}, ${str(p.cls)}, ${str(p.fn)}, ${p.w}, ${p.h}, ${p.bg}, ${str(v)}),`))
    .join('\n            ');
  return fs.readFileSync(TEMPLATE, 'utf8').replace('/*SHOTS*/', shots);
}

const [festivarDir, outFile] = process.argv.slice(2);
if (!festivarDir || !outFile) throw new Error('usage: scan-previews.mjs <festivar-dir> <previews.json>');
const previews = scanPreviews(festivarDir);
fs.writeFileSync(outFile, JSON.stringify(previews, null, 2));
const dest = path.join(festivarDir, TEST_DEST);
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, captureTest(previews));
const count = previews.reduce((n, p) => n + p.variants.length, 0);
console.log(`${previews.length} previews, ${count} captures planned`);
