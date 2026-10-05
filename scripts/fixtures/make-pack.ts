// Generates tests/e2e/fixtures/family-pack.fixture.json: obviously fake smiley faces + fake passwords.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { EXPRESSIONS, PERSON_IDS, type FamilyPack } from '../../src/types';

const COLORS = ['#FFD60A', '#FF5CA8', '#7AE582', '#3A86FF', '#E63946', '#FFB347', '#B388FF'];

function smiley(color: string, expr: string, size: number): string {
  const mouth =
    expr === 'surprised'
      ? '<ellipse cx="50" cy="68" rx="9" ry="12" fill="#1D2A44"/>'
      : expr === 'silly'
        ? '<path d="M30 62 Q50 82 70 62" stroke="#1D2A44" stroke-width="5" fill="#FF5CA8" stroke-linecap="round"/><rect x="44" y="70" width="12" height="14" rx="6" fill="#E63946"/>'
        : '<path d="M30 62 Q50 82 70 62" stroke="#1D2A44" stroke-width="5" fill="none" stroke-linecap="round"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="46" fill="${color}" stroke="#1D2A44" stroke-width="4"/>
  <circle cx="35" cy="40" r="6" fill="#1D2A44"/><circle cx="65" cy="40" r="6" fill="#1D2A44"/>${mouth}
  <text x="50" y="97" font-size="9" text-anchor="middle" fill="#1D2A44" font-family="sans-serif">FAKE</text>
</svg>`;
}

async function toDataUrl(svg: string): Promise<string> {
  const buf = await sharp(Buffer.from(svg)).webp({ quality: 50 }).toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

const pack: FamilyPack = {
  schemaVersion: 1,
  portraits: {},
  album: [],
  passwords: { movies: 'TEST-CAKE-11', videogames: 'TEST-STAR-22', shopping: 'TEST-MOON-33', icecream: 'TEST-SUN-44' },
  message: 'FAKE FIXTURE MESSAGE: Happy birthday!',
};

for (const [i, id] of PERSON_IDS.entries()) {
  pack.portraits[id] = {};
  for (const expr of EXPRESSIONS) {
    pack.portraits[id]![expr] = await toDataUrl(smiley(COLORS[i % COLORS.length], expr, 128));
  }
}
for (const [i, c] of ['#FFD60A', '#7AE582'].entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="${c}"/><text x="240" y="170" font-size="40" text-anchor="middle" font-family="sans-serif" fill="#1D2A44">FAKE ALBUM ${i + 1}</text></svg>`;
  pack.album.push(await toDataUrl(svg));
}

const out = path.resolve('tests/e2e/fixtures/family-pack.fixture.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(pack));
console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
