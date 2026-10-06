import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { ROOT } from '../portraits/paths';
import { readApiKey } from '../portraits/generate';

const MODEL = 'gpt-image-1';
const COST: Record<string, number> = { low: 0.011, medium: 0.042, high: 0.167 };
const MASTER_DIR = path.join(ROOT, '.claude', 'image-generation', '261006-icons');
const OUT_DIR = path.join(ROOT, 'public', 'art', 'icons');
const STYLE =
  'flat-shaded chunky toy-brick sticker illustration, bright palette (pink #FF5CA8, red #E63946, blue #3A86FF, yellow #FFD60A, mint #7AE582, cream #FFF4E0, navy #1D2A44 outlines), thin white sticker outline, centered, transparent background, no text, no people, no brand logos';

interface IconDef {
  id: string;
  prompt: string;
  size: number;
}

export const loadIcons = (): IconDef[] => JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'art', 'icons.json'), 'utf8')) as IconDef[];

async function generate(prompt: string, key: string, quality: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt: `${prompt}. ${STYLE}`, size: '1024x1024', quality, background: 'transparent', output_format: 'png', n: 1 }),
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw new Error('No image data in response');
      return Buffer.from(b64, 'base64');
    }
    if ((res.status !== 429 && res.status < 500) || attempt >= 3) {
      throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300).split(key).join('***')}`);
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
  }
}

/** Trim to the alpha bounding box, pad a little, fit into size x size, write webp. */
export async function toWebp(png: Buffer, size: number, out: string): Promise<void> {
  // Wipe faint alpha haze (the model sometimes leaves a near-invisible background) so trim finds the real subject.
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) if (data[i] < 28) data[i] = 0;
  const cleaned = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const trimmed = await sharp(cleaned).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).toBuffer();
  const inner = Math.round(size * 0.94);
  const body = await sharp(trimmed).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(body)
    .extend({ top: Math.floor((size - inner) / 2), bottom: Math.ceil((size - inner) / 2), left: Math.floor((size - inner) / 2), right: Math.ceil((size - inner) / 2), background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toFile(out);
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (n: string) => args.includes(`--${n}`);
  const val = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const only = val('only')?.split(',').filter(Boolean);
  const quality = val('quality') ?? 'low';
  const all = loadIcons();
  for (const o of only ?? []) if (!all.some((i) => i.id === o)) throw new Error(`Unknown icon: ${o}`);
  if (flag('reprocess')) {
    // Rebuild webps from the saved PNG masters (no API calls).
    for (const i of all) {
      const m = path.join(MASTER_DIR, `${i.id}.png`);
      if ((!only || only.includes(i.id)) && fs.existsSync(m)) await toWebp(fs.readFileSync(m), i.size, path.join(OUT_DIR, `${i.id}.webp`));
    }
    return console.log('Reprocessed from masters.');
  }
  const jobs = all.filter((i) => (!only || only.includes(i.id)) && (flag('force') || !fs.existsSync(path.join(OUT_DIR, `${i.id}.webp`))));
  console.log(`Planned ${jobs.length} icon(s), model ${MODEL}, quality ${quality}, ~$${(jobs.length * COST[quality]).toFixed(2)}`);
  for (const j of jobs) console.log(`- ${j.id}`);
  if (flag('dry-run')) return console.log('Dry run: no network calls made.');
  if (!jobs.length) return;
  const key = readApiKey();
  if (!key) throw new Error('OPENAI_API_KEY not found in .env.local or environment');
  fs.mkdirSync(MASTER_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let n = 0;
  for (const j of jobs) {
    n++;
    process.stdout.write(`[${n}/${jobs.length}] ${j.id} ... `);
    try {
      const png = await generate(j.prompt, key, quality);
      fs.writeFileSync(path.join(MASTER_DIR, `${j.id}.png`), png);
      await toWebp(png, j.size, path.join(OUT_DIR, `${j.id}.webp`));
      console.log('ok');
    } catch (e) {
      console.log(`FAILED: ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
