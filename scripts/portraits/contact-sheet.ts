import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { EXPRESSIONS } from '../../src/types';
import { PORTRAIT_DIR, ROOT, portraitPath, previewPath } from './paths';
import { SUBJECTS } from './subjects';

const rel = (p: string) => encodeURI(path.relative(PORTRAIT_DIR, p).split(path.sep).join('/'));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function writeContactSheet(): string {
  fs.mkdirSync(PORTRAIT_DIR, { recursive: true });
  const rows = SUBJECTS.map((s) => {
    const photos = s.photos
      .map((p) => `<figure><img src="${esc(rel(path.join(ROOT, p)))}" alt="source"><figcaption>${esc(path.basename(p))}</figcaption></figure>`)
      .join('');
    const cells = EXPRESSIONS.map((e) => {
      const png = portraitPath(s.id, e);
      if (!fs.existsSync(png)) return `<figure class="missing"><div>missing</div><figcaption>${e}</figcaption></figure>`;
      const prev = fs.existsSync(previewPath(s.id, e)) ? previewPath(s.id, e) : png;
      return `<figure><img class="p" src="${esc(rel(prev))}" alt="${s.id} ${e}"><figcaption>${e}</figcaption></figure>`;
    }).join('');
    return `<section><h2>${s.id}</h2><div class="row"><div class="src">${photos}</div><div class="out">${cells}</div></div></section>`;
  }).join('\n');
  const html = `<!doctype html><meta charset="utf-8"><title>Portrait contact sheet</title>
<style>body{font:14px system-ui;margin:16px;background:#fafafa}.row{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}
.src,.out{display:flex;gap:8px}figure{margin:0;text-align:center}img{height:220px;max-width:260px;object-fit:contain}
.p{width:220px;border-radius:50%;background:#ddd}.missing div{width:220px;height:220px;border:3px dashed #aaa;border-radius:50%;display:grid;place-items:center;color:#888}</style>
<h1>Portrait contact sheet</h1>${rows}`;
  const out = path.join(PORTRAIT_DIR, 'contact-sheet.html');
  fs.writeFileSync(out, html);
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`Wrote ${writeContactSheet()}`);
}
