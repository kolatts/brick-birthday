import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { coupons } from '../../src/config/coupons';
import { finaleMessage } from '../../src/config/family';
import { parseFamilyPack } from '../../src/state/familyPack';
import { COUPON_IDS, EXPRESSIONS, PERSON_IDS, type CouponId, type Expression, type FamilyPack, type PersonId } from '../../src/types';
import { generatePasswords } from './passwords';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export type PortraitFiles = Partial<Record<PersonId, Partial<Record<Expression, string>>>>;

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|heic)$/i;

const dataUrl = (mime: string, buf: Buffer) => `data:${mime};base64,${buf.toString('base64')}`;

export async function portraitDataUrl(file: string): Promise<string> {
  const buf = await sharp(file).resize(512, 512, { fit: 'cover' }).webp({ quality: 80, alphaQuality: 90 }).toBuffer();
  return dataUrl('image/webp', buf);
}

export async function albumDataUrl(file: string): Promise<string> {
  const buf = await sharp(file).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return dataUrl('image/jpeg', buf);
}

/** Every image file in a folder (sorted); [] if the folder does not exist. */
export function listAlbumFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_RE.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

/** Finds existing portrait PNGs under dir as `<id>-<expression>.png`. */
export function findPortraitFiles(dir: string): PortraitFiles {
  const out: PortraitFiles = {};
  for (const id of PERSON_IDS) {
    for (const e of EXPRESSIONS) {
      const f = path.join(dir, `${id}-${e}.png`);
      if (fs.existsSync(f)) (out[id] ??= {})[e] = f;
    }
  }
  return out;
}

/** Reads the passwords file, keeps valid existing entries unless renew, writes the result back. */
export function loadOrCreatePasswords(file: string, opts: { renew?: boolean } = {}): Record<CouponId, string> {
  let existing: Partial<Record<CouponId, string>> = {};
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (raw && typeof raw === 'object') existing = raw as Partial<Record<CouponId, string>>;
  } catch {
    /* absent or unreadable: generate fresh */
  }
  const passwords = generatePasswords(COUPON_IDS, existing, { renew: opts.renew });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(passwords, null, 2) + '\n');
  return passwords;
}

export function passwordsMarkdown(passwords: Record<CouponId, string>): string {
  const rows = coupons.map((c) => `| ${c.title} | ${c.zone} | \`${passwords[c.id]}\` |`);
  return ['# Coupon passwords (private, do not commit)', '', '| Coupon | Zone | Password |', '| --- | --- | --- |', ...rows, ''].join('\n');
}

export async function buildPack(input: {
  portraitFiles: PortraitFiles;
  albumFiles: string[];
  passwords: Record<CouponId, string>;
  message?: string;
  onMissing?: (id: PersonId, expression: Expression) => void;
}): Promise<FamilyPack> {
  const portraits: FamilyPack['portraits'] = {};
  for (const id of PERSON_IDS) {
    for (const e of EXPRESSIONS) {
      const f = input.portraitFiles[id]?.[e];
      if (!f || !fs.existsSync(f)) {
        input.onMissing?.(id, e);
        continue;
      }
      (portraits[id] ??= {})[e] = await portraitDataUrl(f);
    }
  }
  const album: string[] = [];
  for (const f of input.albumFiles) album.push(await albumDataUrl(f));
  const pack: FamilyPack = { schemaVersion: 1, portraits, album, passwords: input.passwords };
  if (input.message) pack.message = input.message;
  return parseFamilyPack(pack);
}

async function main() {
  const args = process.argv.slice(2);
  const outArg = args.find((a) => a.startsWith('--out='))?.slice(6);
  const out = path.resolve(ROOT, outArg ?? path.join('private', 'family-pack.json'));
  const privateDir = path.join(ROOT, 'private');

  const passwords = loadOrCreatePasswords(path.join(privateDir, 'coupon-passwords.json'), { renew: args.includes('--new-passwords') });
  fs.writeFileSync(path.join(privateDir, 'coupon-passwords.md'), passwordsMarkdown(passwords));

  const missing: string[] = [];
  const pack = await buildPack({
    portraitFiles: findPortraitFiles(path.join(privateDir, 'portraits')),
    albumFiles: listAlbumFiles(path.join(ROOT, 'photos', 'album')),
    passwords,
    message: finaleMessage.startsWith('TODO') ? undefined : finaleMessage,
    onMissing: (id, e) => missing.push(`${id}-${e}`),
  });
  if (missing.length) console.warn(`Warning: ${missing.length} portrait(s) missing (omitted): ${missing.join(', ')}`);
  if (!pack.message) console.warn('Warning: no finale message (finaleMessage is still a TODO).');

  fs.mkdirSync(path.dirname(out), { recursive: true });
  const json = JSON.stringify(pack);
  fs.writeFileSync(out, json);
  const mb = Buffer.byteLength(json) / (1024 * 1024);
  const portraitCount = Object.values(pack.portraits).reduce((n, p) => n + Object.keys(p ?? {}).length, 0);
  console.log(`Wrote ${path.relative(ROOT, out)}: ${mb.toFixed(2)} MB, ${portraitCount} portrait(s), ${pack.album.length} album photo(s)`);
  console.log('Wrote private/coupon-passwords.md');
  if (mb > 8) console.warn('Warning: pack is larger than 8 MB; consider fewer or smaller album photos.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
