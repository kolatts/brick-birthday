#!/usr/bin/env node
/**
 * Visual QC with the Codex CLI (gpt-6-astra): attaches a batch of screenshots and asks for a
 * ruthless art-director critique with concrete, code-actionable fixes.
 *
 *   npm run review:visual                # every *-ipad-webkit.png in test-results/screens
 *   npm run review:visual -- hub closet  # only screenshots whose name contains these words
 *   VISUAL_REVIEW_MODEL=gpt-6-astra      # default model
 *
 * Output: test-results/visual-review.md (and echoed). Read-only sandbox; Codex never edits files.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SCREENS = join(ROOT, 'test-results', 'screens');
const OUT = join(ROOT, 'test-results', 'visual-review.md');
const MODEL = process.env.VISUAL_REVIEW_MODEL ?? 'gpt-6-astra';
const filters = process.argv.slice(2).map((s) => s.toLowerCase());

if (!existsSync(SCREENS)) {
  console.error(`No screenshots in ${SCREENS}; run the e2e suite first.`);
  process.exit(2);
}
let files = readdirSync(SCREENS)
  .filter((f) => f.endsWith('-ipad-webkit.png'))
  .filter((f) => filters.length === 0 || filters.some((w) => f.toLowerCase().includes(w)))
  .sort();
if (files.length === 0) {
  console.error('No screenshots matched.');
  process.exit(2);
}
// Codex accepts many images, but keep a batch reviewable.
files = files.slice(0, 16);

const prompt = `You are a senior art director and UX lead for a premium children's game (ages 6-8, iPad Safari, touch only).
These screenshots are from "Luna's Brick Birthday Island", a personalised birthday game built with React Three Fiber:
a brick-built toy world with original chunky figures (round heads, tapered torsos, C-hands; NOT a copy of any brand) that
carry cartoon portrait face plates. Style target: glossy toy plastic, bright palette (pink #FF5CA8, red #E63946, blue #3A86FF,
yellow #FFD60A, mint #7AE582, cream #FFF4E0, navy #1D2A44), warm, funny, impossible to fail.

Review EVERY image (named in order: ${files.join(', ')}). For each, give:
1. A one-line verdict (ship / polish / rework).
2. The 3 most valuable concrete fixes, each phrased so a developer can act in code (geometry, materials, lighting, camera,
   layout, typography, spacing, colour, motion). Call out anything that looks like programmer art, clipping, unreadable text,
   tap targets that look under 64px, muddy lighting, flat shading, odd proportions, or empty composition.
3. Any accessibility/kid-usability problem.
Then finish with a prioritised "Top 10 across the game" list and a short note on overall visual consistency.
Be specific and critical; praise only what is genuinely good. Do not modify any files.`;

const args = ['exec', '-m', MODEL, '-s', 'read-only', '-C', ROOT, '--skip-git-repo-check', '--color', 'never'];
for (const f of files) args.push('-i', join(SCREENS, f));
// The prompt goes in on stdin ('-'): the Windows shim drops long positional prompts.
args.push('-');

console.log(`Reviewing ${files.length} screenshot(s) with ${MODEL}...`);
const res = spawnSync('codex', args, { encoding: 'utf8', input: prompt, maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' });
if (res.error) {
  console.error(res.error.message);
  process.exit(1);
}
const body = (res.stdout ?? '') + (res.stderr ? `\n\n<!-- stderr -->\n${res.stderr}` : '');
mkdirSync(join(ROOT, 'test-results'), { recursive: true });
writeFileSync(OUT, `# Visual review (${MODEL}) — ${new Date().toISOString()}\n\nImages: ${files.join(', ')}\n\n${body}\n`);
console.log(res.stdout);
console.log(`\nSaved to ${OUT}`);
process.exit(res.status ?? 0);
