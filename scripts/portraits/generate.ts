import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { EXPRESSIONS, type Expression } from '../../src/types';
import { writeContactSheet } from './contact-sheet';
import { PORTRAIT_DIR, ROOT, portraitPath, previewPath } from './paths';
import { buildPrompt } from './style';
import { SUBJECTS } from './subjects';

const MODEL = 'gpt-image-1'; // gpt-image-2 rejects background=transparent on edits
const COST: Record<string, number> = { low: 0.01, medium: 0.04, high: 0.17 };

interface Job {
  id: string;
  expression: Expression;
  photos: string[];
  prompt: string;
  out: string;
}

export function readApiKey(): string | undefined {
  try {
    const txt = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*(.*?)\s*$/.exec(line);
      if (m) {
        const v = m[1].replace(/^['"]|['"]$/g, '').trim();
        if (v) return v;
      }
    }
  } catch {
    /* no .env.local */
  }
  return process.env.OPENAI_API_KEY || undefined;
}

export function planJobs(opts: { only?: string[]; expressions?: Expression[]; force?: boolean }): Job[] {
  const jobs: Job[] = [];
  for (const s of SUBJECTS) {
    if (opts.only && !opts.only.includes(s.id)) continue;
    for (const expression of opts.expressions ?? EXPRESSIONS) {
      const out = portraitPath(s.id, expression);
      if (!opts.force && fs.existsSync(out)) continue;
      jobs.push({ id: s.id, expression, photos: s.photos, out, prompt: buildPrompt({ expression, isPet: s.isPet, notes: s.notes, reference: s.reference }) });
    }
  }
  return jobs;
}

async function callEdits(job: Job, key: string, quality: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    const form = new FormData();
    form.append('model', MODEL);
    form.append('prompt', job.prompt);
    form.append('size', '1024x1024');
    form.append('quality', quality);
    form.append('background', 'transparent');
    form.append('output_format', 'png');
    form.append('n', '1');
    for (const p of job.photos) {
      form.append('image[]', new Blob([fs.readFileSync(path.join(ROOT, p))], { type: 'image/jpeg' }), path.basename(p));
    }
    const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
    if (res.ok) {
      const json = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw new Error('No image data in response');
      return Buffer.from(b64, 'base64');
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 3) {
      const body = (await res.text()).slice(0, 300).split(key).join('***');
      throw new Error(`OpenAI ${res.status}: ${body}`);
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
  }
}

/** Normalises to 1024x1024 RGBA and writes the circular 512px preview. Returns the PNG to save. */
export async function postProcess(png: Buffer, id: string, expression: string): Promise<Buffer> {
  const norm = await sharp(png).resize(1024, 1024, { fit: 'cover' }).ensureAlpha().png().toBuffer();
  const mask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="256" r="256"/></svg>');
  const preview = await sharp(norm).resize(512, 512).composite([{ input: mask, blend: 'dest-in' }]).webp({ quality: 85 }).toBuffer();
  fs.mkdirSync(path.dirname(previewPath(id, expression)), { recursive: true });
  fs.writeFileSync(previewPath(id, expression), preview);
  return norm;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (n: string) => args.includes(`--${n}`);
  const val = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  if (flag('sheet')) {
    console.log(`Wrote ${writeContactSheet()}`);
    return;
  }

  const only = val('only')?.split(',').filter(Boolean);
  const exprs = val('expressions')?.split(',').filter(Boolean) as Expression[] | undefined;
  const quality = val('quality') ?? 'medium';
  if (!(quality in COST)) throw new Error('--quality must be low|medium|high');
  const validIds = SUBJECTS.map((s) => s.id as string);
  for (const o of only ?? []) if (!validIds.includes(o)) throw new Error(`Unknown subject: ${o}`);
  for (const e of exprs ?? []) if (!EXPRESSIONS.includes(e)) throw new Error(`Unknown expression: ${e}`);

  const jobs = planJobs({ only, expressions: exprs, force: flag('force') });
  console.log(`Planned ${jobs.length} image(s), model ${MODEL}, quality ${quality}`);
  for (const j of jobs) console.log(`- ${j.id} / ${j.expression}  refs: ${j.photos.join(', ')}  -> ${path.relative(ROOT, j.out)}`);
  console.log(`Estimated cost: ~$${(jobs.length * COST[quality]).toFixed(2)} (about $${COST[quality]} per 1024 image at ${quality}; high is ~$0.17)`);

  if (flag('dry-run')) {
    console.log('Dry run: no network calls made.');
    return;
  }
  if (jobs.length > 10 && !flag('yes')) {
    console.error(`Refusing to generate ${jobs.length} images without --yes.`);
    process.exitCode = 1;
    return;
  }

  if (jobs.length > 0) {
    const key = readApiKey();
    if (!key) throw new Error('OPENAI_API_KEY not found in .env.local or environment');
    fs.mkdirSync(PORTRAIT_DIR, { recursive: true });
    let n = 0;
    for (const j of jobs) {
      n++;
      process.stdout.write(`[${n}/${jobs.length}] ${j.id}/${j.expression} ... `);
      try {
        const raw = await callEdits(j, key, quality);
        fs.writeFileSync(j.out, await postProcess(raw, j.id, j.expression));
        console.log('ok');
      } catch (e) {
        console.log(`FAILED: ${e instanceof Error ? e.message : String(e)}`);
        process.exitCode = 1;
      }
    }
  }
  console.log(`Contact sheet: ${writeContactSheet()}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
