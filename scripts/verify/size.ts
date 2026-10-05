import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const BUDGET = 1.5 * 1024 * 1024;
const dist = path.resolve('dist');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

if (!fs.existsSync(dist)) {
  console.error('dist/ missing; run `npm run build` first');
  process.exit(1);
}

let total = 0;
for (const f of walk(dist).filter((f) => /\.(m?js)$/.test(f))) {
  const gz = zlib.gzipSync(fs.readFileSync(f)).length;
  total += gz;
  console.log(`${(gz / 1024).toFixed(1).padStart(8)} KB gz  ${path.relative(dist, f)}`);
}
console.log(`total JS gzip: ${(total / 1024).toFixed(1)} KB (budget ${(BUDGET / 1024).toFixed(0)} KB)`);
if (total > BUDGET) {
  console.error('SIZE BUDGET EXCEEDED');
  process.exit(1);
}
