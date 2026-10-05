import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Expression, PersonId } from '../types';
import { EXPRESSIONS } from '../types';
import { useFamilyPack } from '../state/familyPack';

interface Entry {
  tex: THREE.Texture;
  ready: boolean;
  waiters: Set<() => void>;
}
const cache = new Map<string, Entry>();
const loader = new THREE.TextureLoader();

function entryFor(url: string): Entry {
  let e = cache.get(url);
  if (e) return e;
  const created: Entry = { tex: new THREE.Texture(), ready: false, waiters: new Set() };
  e = created;
  cache.set(url, e);
  loader.load(
    url,
    (tex) => {
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

/** Family-pack portrait for (id, expression) if loaded, else the committed default cartoon face. */
export function faceUrl(id: PersonId, expr: Expression, packUrl?: string): string {
  return packUrl ?? `${import.meta.env.BASE_URL}faces/default/${id}-${expr}.webp`;
}

/** Texture for the face plate. Keeps showing the previous face until the new one is decoded (no flicker). */
export function useFaceTexture(id: PersonId, expr: Expression): THREE.Texture | null {
  const pack = useFamilyPack((s) => s.pack);
  const url = faceUrl(id, expr, pack?.portraits[id]?.[expr]);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const last = useRef<string>('');

  useEffect(() => {
    // warm every expression so swaps are instant
    for (const x of EXPRESSIONS) entryFor(faceUrl(id, x, pack?.portraits[id]?.[x]));
  }, [id, pack]);

  useEffect(() => {
    const e = entryFor(url);
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
  }, [url]);

  return tex;
}
