import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const failures: string[] = [];

// 1. Nothing under photos/ or private/ may be tracked by git.
try {
  const tracked = execSync('git ls-files photos private', { encoding: 'utf8' }).trim();
  if (tracked) failures.push(`git tracks private files:\n${tracked}`);
} catch (e) {
  failures.push(`could not run git ls-files: ${(e as Error).message}`);
}

// 2. Scan dist/.
const DIST = path.resolve('dist');
const IMAGE_EXT = /\.(png|jpe?g|webp|avif|gif|bmp|tiff?)$/i;
const TEXT_EXT = /\.(js|mjs|css|html|json|map|txt|svg|webmanifest)$/i;
const MAX_IMAGE = 200 * 1024;

const checks: { name: string; re: RegExp }[] = [
  { name: '"family-pack"', re: /family-pack/i },
  { name: 'API key pattern sk-...', re: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: 'OPENAI', re: /OPENAI/ },
  { name: 'coupon password pattern', re: /\b[A-Z]{3,8}-[A-Z]{3,8}-\d{2}\b/ },
  { name: 'inline data:image base64 > 200KB', re: new RegExp(`data:image/[a-z+.-]+;base64,[A-Za-z0-9+/=]{${Math.ceil((MAX_IMAGE * 4) / 3)},}`, 'i') },
];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

if (!fs.existsSync(DIST)) {
  failures.push('dist/ does not exist; run `npm run build` first');
} else {
  for (const file of walk(DIST)) {
    const rel = path.relative(process.cwd(), file);
    const size = fs.statSync(file).size;
    if (IMAGE_EXT.test(file) && size > MAX_IMAGE) failures.push(`${rel}: image is ${Math.round(size / 1024)} KB (> 200 KB)`);
    if (!TEXT_EXT.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const c of checks) {
      const m = c.re.exec(text);
      if (m) failures.push(`${rel}: matched ${c.name} -> ${m[0].slice(0, 40)}`);
    }
  }
}

if (failures.length) {
  console.error('PRIVACY CHECK FAILED');
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log('privacy check ok');
