import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Expression, PersonId } from '../types';
import { EXPRESSIONS } from '../types';
import { faceUrl } from '../state/faces';

/** Crop settings: fraction of the alpha bbox width kept, top of the crop (fraction of bbox height) and the plate aspect (w/h). */
const CROPS = {
  human: { w: 1.0, top: 0.1, aspect: 0.85 / 0.74 },
  pet: { w: 0.98, top: 0.06, aspect: 0.78 / 0.56 },
};
export const plateAspect = (pet: boolean): number => (pet ? CROPS.pet.aspect : CROPS.human.aspect);
export function cropToFace(tex: THREE.Texture): void {
  tex.repeat.set(1, 1);
  tex.offset.set(0, 0);
}

/** Face-only crop: find the painted face by alpha bbox, keep its central region, feather it with an elliptical mask. */
function faceCanvas(img: CanvasImageSource & { width: number; height: number }, pet: boolean): HTMLCanvasElement {
  const W = img.width, H = img.height;
  const probe = document.createElement('canvas');
  probe.width = W;
  probe.height = H;
  const pc = probe.getContext('2d', { willReadFrequently: true })!;
  pc.drawImage(img, 0, 0);
  const data = pc.getImageData(0, 0, W, H).data;
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 20) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 <= x0) { x0 = 0; x1 = W - 1; y0 = 0; y1 = H - 1; }
  const c = pet ? CROPS.pet : CROPS.human;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const cw = bw * c.w, ch = cw / c.aspect;
  const cx = x0 + bw / 2;
  const sy = y0 + bh * c.top;
  const out = document.createElement('canvas');
  out.width = 512;
  out.height = Math.round(512 / c.aspect);
  const g = out.getContext('2d')!;
  g.drawImage(img, cx - cw / 2, sy, cw, ch, 0, 0, out.width, out.height);
  // elliptical feather: painted hair / ears at the rim fade into the head colour
  g.globalCompositeOperation = 'destination-in';
  g.save();
  g.translate(out.width / 2, out.height / 2);
  g.scale(out.width / 2, out.height / 2);
  const gr = g.createRadialGradient(0, 0, 0.72, 0, 0, 1.02);
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(-1, -1, 2, 2);
  g.restore();
  return out;
}

interface Entry {
  tex: THREE.Texture;
  ready: boolean;
  waiters: Set<() => void>;
}
const cache = new Map<string, Entry>();
const isPetId = (id: PersonId): boolean => id === 'rudolph' || id === 'jinglebells';
const loader = new THREE.TextureLoader();

function entryFor(url: string, pet: boolean): Entry {
  let e = cache.get(url);
  if (e) return e;
  const created: Entry = { tex: new THREE.Texture(), ready: false, waiters: new Set() };
  e = created;
  cache.set(url, e);
  loader.load(
    url,
    (loaded) => {
      const tex = new THREE.CanvasTexture(faceCanvas(loaded.image as HTMLImageElement, pet));
      loaded.dispose();
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      created.tex = tex;
      created.ready = true;
      created.waiters.forEach((w) => w());
      created.waiters.clear();
    },
    undefined,
    () => {
      /* missing face: the plate simply keeps showing the skin colour */
    },
  );
  return e;
}

/** Texture for the face plate. Keeps showing the previous face until the new one is decoded (no flicker). */
export function useFaceTexture(id: PersonId, expr: Expression): THREE.Texture | null {
  const url = faceUrl(id, expr);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const last = useRef<string>('');

  useEffect(() => {
    // warm every expression so swaps are instant
    for (const x of EXPRESSIONS) entryFor(faceUrl(id, x), isPetId(id));
  }, [id]);

  useEffect(() => {
    const e = entryFor(url, isPetId(id));
    last.current = url;
    if (e.ready) {
      setTex(e.tex);
      return;
    }
    const w = () => {
      if (last.current === url) setTex(e.tex);
    };
    e.waiters.add(w);
    return () => {
      e.waiters.delete(w);
    };
  }, [url, id]);

  return tex;
}
