import fs from 'node:fs';
import path from 'node:path';
import { clipId } from '../../src/audio/voices';
import { voices } from '../../src/config/voices';
import { collectLines } from './lines';

const dir = import.meta.dirname;
const lines = await collectLines();
const out = lines.map((l) => ({ id: clipId(l.speaker, l.text), speaker: l.speaker, text: l.text }));
fs.writeFileSync(path.join(dir, 'lines.json'), JSON.stringify(out, null, 2) + '\n');
const cast = Object.fromEntries(Object.entries(voices).map(([k, v]) => [k, { voice: v.voice, pitch: v.pitch, rate: v.rate }]));
fs.writeFileSync(path.join(dir, 'cast.json'), JSON.stringify(cast, null, 2) + '\n');
const chars = out.reduce((n, l) => n + l.text.length, 0);
console.log(`voices: ${out.length} lines, ${chars} characters -> scripts/voices/lines.json, cast.json`);
