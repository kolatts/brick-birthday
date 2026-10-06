/**
 * `npm run models:build`: finds Blender, runs scripts/models/build_figures.py headless, copies the Draco decoder to
 * public/models/draco, prints sizes and fails if any glb is over 300 KB.
 * Usage: npm run models:build [-- --only luna,rudolph]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const LIMIT = 300 * 1024;
const root = path.resolve(import.meta.dirname, '..', '..');
const outDir = path.join(root, 'public', 'models');

function findBlender(): string | null {
  const candidates: string[] = [];
  if (process.env.BLENDER) candidates.push(process.env.BLENDER);
  const pf = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']].filter(Boolean) as string[];
  for (const base of pf) {
    const dir = path.join(base, 'Blender Foundation');
    if (fs.existsSync(dir)) {
      for (const d of fs.readdirSync(dir).sort().reverse()) candidates.push(path.join(dir, d, 'blender.exe'));
    }
  }
  const where = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['blender'], { encoding: 'utf8' });
  if (where.status === 0) candidates.push(...where.stdout.split(/\r?\n/).filter(Boolean));
  candidates.push('/Applications/Blender.app/Contents/MacOS/Blender');
  return candidates.find((c) => fs.existsSync(c)) ?? null;
}

const blender = findBlender();
if (!blender) {
  console.error('Blender not found. Install it with:  winget install BlenderFoundation.Blender  (or set the BLENDER env var to blender.exe)');
  process.exit(1);
}
console.log(`Blender: ${blender}`);
fs.mkdirSync(outDir, { recursive: true });
const extra = process.argv.slice(2).filter((a) => a !== '--');
const run = spawnSync(blender, ['--background', '--python', path.join(root, 'scripts', 'models', 'build_figures.py'), '--', '--out', outDir, ...extra], {
  stdio: 'inherit',
});
if (run.status !== 0) {
  console.error('Blender build failed');
  process.exit(run.status ?? 1);
}

// Draco decoder served locally (Model.tsx points drei's loader at models/draco/); never the gstatic CDN.
const src = path.join(root, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf');
const dst = path.join(outDir, 'draco');
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));

let bad = 0;
const names: string[] = [];
for (const f of fs.readdirSync(outDir).filter((f) => f.endsWith('.glb')).sort()) {
  const size = fs.statSync(path.join(outDir, f)).size;
  const over = size > LIMIT;
  if (over) bad++;
  names.push(f.replace(/\.glb$/, ''));
  console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${f}${over ? '   <-- OVER 300 KB' : ''}`);
}
console.log(`\nList these in src/config/models.ts: [${names.map((n) => `'${n}'`).join(', ')}]`);
if (bad) {
  console.error(`${bad} glb file(s) exceed 300 KB`);
  process.exit(1);
}
