// Generates public/faces/default/<id>-<expression>.webp: generic friendly cartoon faces (no real likeness).
// Run: npx tsx scripts/faces/make-defaults.ts
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { family } from '../../src/config/family';
import { EXPRESSIONS, PERSON_IDS, type Expression, type PersonId } from '../../src/types';

const SIZE = 256;
const INK = '#2B1D1A';

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function humanFace(id: PersonId, expr: Expression): string {
  const skin = family[id].avatar.skinTone;
  const hair = family[id].avatar.hairColor;
  const cheek = shade(skin, -0.12);
  const eyeW = expr === 'surprised' ? 17 : 13;
  const eyeH = expr === 'surprised' ? 23 : 18;
  const browY = expr === 'surprised' ? 70 : 82;
  let eyes = `
    <ellipse cx="84" cy="124" rx="${eyeW}" ry="${eyeH}" fill="${INK}"/><ellipse cx="172" cy="124" rx="${eyeW}" ry="${eyeH}" fill="${INK}"/>
    <circle cx="89" cy="116" r="6" fill="#fff"/><circle cx="177" cy="116" r="6" fill="#fff"/>`;
  if (expr === 'silly') {
    eyes = `
    <ellipse cx="84" cy="124" rx="13" ry="18" fill="${INK}"/><circle cx="89" cy="116" r="6" fill="#fff"/>
    <path d="M150 128 Q172 106 194 128" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  }
  const brows = `<path d="M62 ${browY + 6} Q84 ${browY - 8} 106 ${browY + 6}" stroke="${hair === '#2B1B12' ? '#3B2418' : hair}" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M150 ${browY + 6} Q172 ${browY - 8} 194 ${browY + 6}" stroke="${hair === '#2B1B12' ? '#3B2418' : hair}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  let mouth = `<path d="M82 170 Q128 214 174 170 Q128 186 82 170Z" fill="#7A2230" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M100 178 Q128 194 156 178 Q128 184 100 178Z" fill="#fff"/>`;
  if (expr === 'surprised') mouth = `<ellipse cx="128" cy="184" rx="18" ry="24" fill="#7A2230" stroke="${INK}" stroke-width="7"/>`;
  if (expr === 'silly')
    mouth = `<path d="M80 166 Q128 208 176 166" stroke="${INK}" stroke-width="8" fill="#7A2230" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M108 184 Q128 232 148 184Z" fill="#FF6F91" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M128 188 L128 208" stroke="#D94870" stroke-width="4" stroke-linecap="round"/>`;
  const beard = id === 'dad'
    ? `<path d="M40 150 Q44 232 128 240 Q212 232 216 150 Q196 170 172 168 Q128 150 84 168 Q60 170 40 150Z" fill="#2B1B12"/>`
    : '';
  const lashes = id === 'mom' || id === 'luna'
    ? `<path d="M64 108 L52 100 M70 100 L62 90 M192 108 L204 100 M186 100 L194 90" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`
    : '';
  const freckles = id === 'julian' ? `<g fill="${cheek}"><circle cx="70" cy="156" r="3"/><circle cx="82" cy="162" r="3"/><circle cx="186" cy="156" r="3"/><circle cx="174" cy="162" r="3"/></g>` : '';
  const mouthPlace = id === 'dad' ? `<g transform="translate(0,-6)">${mouth}</g>` : mouth;
  return `<ellipse cx="56" cy="160" rx="22" ry="14" fill="#FF8FA3" opacity="0.55"/><ellipse cx="200" cy="160" rx="22" ry="14" fill="#FF8FA3" opacity="0.55"/>
    ${beard}
    ${freckles}${eyes}${lashes}${brows}${mouthPlace}`;
}

function petFace(id: PersonId, expr: Expression): string {
  const dog = id === 'rudolph';
  const fur = family[id].avatar.bodyColor;
  const muzzle = dog ? '#E8D9BF' : '#6B4A3A';
  const patch = dog ? shade(fur, -0.25) : '#8A5A2B';
  const eyeCol = dog ? INK : '#C9D93B';
  const big = expr === 'surprised' ? 1.25 : 1;
  const eye = (cx: number) => expr === 'silly' && cx > 128
    ? `<path d="M${cx - 24} 112 Q${cx} 90 ${cx + 24} 112" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${cx}" cy="108" rx="${22 * big}" ry="${26 * big}" fill="${eyeCol}" stroke="${INK}" stroke-width="5"/>
       <ellipse cx="${cx}" cy="108" rx="${dog ? 14 * big : 6 * big}" ry="${17 * big}" fill="${INK}"/><circle cx="${cx + 6}" cy="98" r="6" fill="#fff"/>`;
  const mouth =
    expr === 'surprised'
      ? `<ellipse cx="128" cy="200" rx="14" ry="18" fill="#7A2230" stroke="${INK}" stroke-width="6"/>`
      : expr === 'silly'
        ? `<path d="M96 178 Q128 206 160 178" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M114 192 Q128 238 142 192Z" fill="#FF6F91" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
        : `<path d="M96 176 Q112 200 128 182 Q144 200 160 176" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const whiskers = dog ? '' : `<g stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M20 150 L72 160 M18 176 L72 172 M236 150 L184 160 M238 176 L184 172"/></g>`;
  return `
    <path d="M128 40 Q164 60 168 104 Q128 90 88 104 Q92 60 128 40Z" fill="${patch}" opacity="${dog ? 0.7 : 0.9}"/>
    <ellipse cx="128" cy="170" rx="62" ry="50" fill="${muzzle}"/>
    ${eye(80)}${eye(176)}
    <path d="M104 150 Q128 134 152 150 Q150 170 128 178 Q106 170 104 150Z" fill="${dog ? '#2B2B33' : '#F28AA6'}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    ${mouth}${whiskers}`;
}

function svg(id: PersonId, expr: Expression): string {
  const isPet = id === 'rudolph' || id === 'jinglebells';
  const base = isPet ? family[id].avatar.bodyColor : family[id].avatar.skinTone;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${base}"/>
  ${isPet ? petFace(id, expr) : humanFace(id, expr)}
</svg>`;
}

const outDir = path.resolve('public/faces/default');
fs.mkdirSync(outDir, { recursive: true });
for (const id of PERSON_IDS) {
  for (const expr of EXPRESSIONS) {
    const file = path.join(outDir, `${id}-${expr}.webp`);
    await sharp(Buffer.from(svg(id, expr))).resize(SIZE, SIZE).webp({ quality: 82 }).toFile(file);
  }
}
console.log(`wrote ${PERSON_IDS.length * EXPRESSIONS.length} faces to ${outDir}`);
