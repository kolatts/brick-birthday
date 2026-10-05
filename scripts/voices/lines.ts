import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { clipId, normalizeText } from '../../src/audio/voices';
import { isSpeakerId, type SpeakerId } from '../../src/config/voices';

export interface Line {
  speaker: SpeakerId;
  text: string;
}

const ROOT = path.resolve(import.meta.dirname, '../..');

async function tryImport(rel: string): Promise<Record<string, unknown> | null> {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return null;
  try {
    return (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  } catch (e) {
    console.warn(`voices: could not import ${rel}: ${(e as Error).message}`);
    return null;
  }
}

/** Accepts `lines`/`LINES`/`voiceLines`/`copyLines` exports of Line[] (e.g. src/zones/<zone>/lines.ts). */
function linesFromModule(mod: Record<string, unknown>): Line[] {
  const out: Line[] = [];
  for (const key of ['lines', 'LINES', 'voiceLines', 'copyLines']) {
    const v = mod[key];
    if (!Array.isArray(v)) continue;
    for (const l of v as { speaker?: string; text?: string }[]) {
      if (l && typeof l.text === 'string' && typeof l.speaker === 'string' && isSpeakerId(l.speaker)) out.push({ speaker: l.speaker, text: l.text });
    }
  }
  return out;
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * Hand-registered statics from existing zone modules. Speaker convention (zones must use the same
 * speakers when calling say): tree facts -> narrator; friend thanks -> that friend; tea lines -> that
 * guest; tea reactions -> luna; movie scenes + titles -> mom; story bonus sentences -> narrator.
 */
async function zoneStatics(): Promise<Line[]> {
  const out: Line[] = [];
  const woods = await tryImport('src/zones/woods/facts.ts');
  if (woods) {
    for (const t of strs(woods.TREE_FACTS)) out.push({ speaker: 'narrator', text: t });
    for (const f of (woods.FRIENDS as { id: string; thanks: string }[] | undefined) ?? []) if (isSpeakerId(f.id)) out.push({ speaker: f.id, text: f.thanks });
    const gl = (woods.GUEST_LINES as Record<string, { tea: string; treat: string }> | undefined) ?? {};
    for (const [g, l] of Object.entries(gl)) if (isSpeakerId(g)) out.push({ speaker: g, text: l.tea }, { speaker: g, text: l.treat });
    for (const k of ['SPLASH_LINE', 'PERFECT_LINE', 'LOW_LINE', 'OK_LINE']) if (typeof woods[k] === 'string') out.push({ speaker: 'luna', text: woods[k] as string });
    const pets = (woods.PET_LINES as Record<string, { sound: string }> | undefined) ?? {};
    for (const [p, l] of Object.entries(pets)) if (isSpeakerId(p)) out.push({ speaker: p, text: l.sound });
  }
  const movie = await tryImport('src/zones/story/movie.ts');
  if (movie) {
    for (const s of (movie.movieStories as { title: string; scenes: { line: string }[] }[] | undefined) ?? []) {
      out.push({ speaker: 'mom', text: `${s.title}.` });
      for (const sc of s.scenes) out.push({ speaker: 'mom', text: sc.line });
    }
  }
  const opts = await tryImport('src/zones/story/options.ts');
  if (opts) for (const t of strs(opts.bonusSentences)) out.push({ speaker: 'narrator', text: t });
  const logic = await tryImport('src/zones/woods/logic.ts');
  if (logic && typeof logic.CHALLENGE_DONE_LINE === 'string') out.push({ speaker: 'luna', text: logic.CHALLENGE_DONE_LINE });
  return out;
}

/** Every static line in the game, deduplicated by clip id, in stable order. */
export async function collectLines(): Promise<Line[]> {
  const all: Line[] = [];
  const copy = await tryImport('src/config/copy.ts');
  if (copy) all.push(...linesFromModule(copy));
  all.push(...(await zoneStatics()));
  const zonesDir = path.join(ROOT, 'src/zones');
  if (fs.existsSync(zonesDir)) {
    for (const d of fs.readdirSync(zonesDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const mod = await tryImport(`src/zones/${d.name}/lines.ts`);
      if (mod) all.push(...linesFromModule(mod));
    }
  }
  const seen = new Set<string>();
  const out: Line[] = [];
  for (const l of all) {
    const text = normalizeText(l.text);
    if (!text) continue;
    const id = clipId(l.speaker, text);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ speaker: l.speaker, text });
  }
  return out;
}
