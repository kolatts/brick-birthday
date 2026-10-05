import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PORTRAIT_DIR = path.join(ROOT, 'private', 'portraits');
export const portraitPath = (id: string, expr: string) => path.join(PORTRAIT_DIR, `${id}-${expr}.png`);
export const previewPath = (id: string, expr: string) => path.join(PORTRAIT_DIR, 'preview', `${id}-${expr}.webp`);
