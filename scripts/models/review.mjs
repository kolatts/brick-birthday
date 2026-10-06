#!/usr/bin/env node
/**
 * Second pair of eyes on the figure models: sends turntable screenshots to the Codex CLI (gpt-6-astra).
 *   node scripts/models/review.mjs test-results/tt/all.png test-results/tt/luna_dress.png ...
 * Output: test-results/figure-review.md. The prompt goes in on stdin (the Windows shim drops positional prompts).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const MODEL = process.env.VISUAL_REVIEW_MODEL ?? 'gpt-6-astra';
const files = process.argv.slice(2).map((f) => resolve(f));
if (!files.length) {
  console.error('usage: node scripts/models/review.mjs <png>...');
  process.exit(2);
}
const prompt = `You are a senior 3D character artist reviewing toy figure models for a premium kids' game ("Luna's Brick Birthday Island").
The figures are original chunky toy characters (round head, tapered torso with a chest panel and 4 studs, C-hands) built in Blender
with bevel + subdivision modifiers and exported as Draco glb, rendered here in three.js on a neutral turntable with one hemisphere
light, one key light and a soft studio environment reflection. The face is a cartoon portrait on a curved face plate.
Images (in order): ${files.map((f) => f.split(/[\\/]/).pop()).join(', ')}.
For each image give a verdict: "ship", "polish" or "rework", then the 3 most valuable concrete fixes phrased as geometry/material/lighting
changes a modeller can apply in a bpy script (silhouette, bevels, hair sculpt, hands, proportions, garments clipping, glossiness).
Finish with ONE overall rating (ship / polish / rework) for the figure family and the single most important next change.
Be specific and critical. Do not modify any files.`;
const args = ['exec', '-m', MODEL, '-s', 'read-only', '-C', ROOT, '--skip-git-repo-check', '--color', 'never'];
for (const f of files) args.push('-i', f);
args.push('-');
console.log(`Reviewing ${files.length} image(s) with ${MODEL}...`);
const res = spawnSync('codex', args, { encoding: 'utf8', input: prompt, maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' });
if (res.error) {
  console.error(res.error.message);
  process.exit(1);
}
mkdirSync(join(ROOT, 'test-results'), { recursive: true });
writeFileSync(join(ROOT, 'test-results', 'figure-review.md'), `# Figure review (${MODEL}) ${new Date().toISOString()}\n\n${res.stdout}\n${res.stderr ? '\n<!-- stderr -->\n' + res.stderr : ''}\n`);
console.log(res.stdout);
process.exit(res.status ?? 0);
