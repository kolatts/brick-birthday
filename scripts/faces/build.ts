// Converts private/portraits/<id>-<expression>.png (gitignored sources) to public/faces/<id>-<expression>.webp
// (512px, alpha kept, quality 82). Outputs are committed. Run: npm run faces:build
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { EXPRESSIONS, PERSON_IDS } from '../../src/types';

const SRC = path.resolve('private/portraits');
const OUT = path.resolve('public/faces');
fs.mkdirSync(OUT, { recursive: true });

let written = 0;
const missing: string[] = [];
for (const id of PERSON_IDS) {
  for (const expr of EXPRESSIONS) {
    const name = `${id}-${expr}`;
    const src = path.join(SRC, `${name}.png`);
    if (!fs.existsSync(src)) {
      missing.push(name);
      continue;
    }
    await sharp(src).resize(512, 512, { fit: 'cover' }).webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(OUT, `${name}.webp`));
    written++;
  }
}
console.log(`wrote ${written} faces to ${path.relative(process.cwd(), OUT)}`);
if (missing.length) console.warn(`missing sources (skipped): ${missing.join(', ')}`);
