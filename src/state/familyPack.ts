import { create } from 'zustand';
import type { FamilyPack } from '../types';
import { COUPON_IDS, EXPRESSIONS, PERSON_IDS } from '../types';

export const PASSWORD_RE = /^[A-Z]{3,8}-[A-Z]{3,8}-\d{2}$/;
const DATA_URL_RE = /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/i;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Hand-written validation. Throws descriptive Errors. */
export function parseFamilyPack(input: unknown): FamilyPack {
  if (!isObj(input)) throw new Error('Family pack must be a JSON object');
  if (input.schemaVersion !== 1) throw new Error(`Unsupported family pack schemaVersion: ${String(input.schemaVersion)} (expected 1)`);

  if (!isObj(input.portraits)) throw new Error('Family pack "portraits" must be an object');
  const portraits: FamilyPack['portraits'] = {};
  for (const [id, exprs] of Object.entries(input.portraits)) {
    if (!PERSON_IDS.includes(id as never)) throw new Error(`Unknown person id in portraits: "${id}"`);
    if (!isObj(exprs)) throw new Error(`portraits.${id} must be an object`);
    const out: Partial<Record<(typeof EXPRESSIONS)[number], string>> = {};
    for (const [expr, url] of Object.entries(exprs)) {
      if (!EXPRESSIONS.includes(expr as never)) throw new Error(`Unknown expression "${expr}" for ${id}`);
      if (typeof url !== 'string' || !DATA_URL_RE.test(url)) throw new Error(`portraits.${id}.${expr} must be a base64 image data URL`);
      out[expr as (typeof EXPRESSIONS)[number]] = url;
    }
    portraits[id as keyof FamilyPack['portraits']] = out;
  }

  if (!Array.isArray(input.album)) throw new Error('Family pack "album" must be an array');
  input.album.forEach((url, i) => {
    if (typeof url !== 'string' || !DATA_URL_RE.test(url)) throw new Error(`album[${i}] must be a base64 image data URL`);
  });

  if (!isObj(input.passwords)) throw new Error('Family pack "passwords" must be an object');
  const passwords = {} as FamilyPack['passwords'];
  for (const id of COUPON_IDS) {
    const p = input.passwords[id];
    if (typeof p !== 'string') throw new Error(`Missing password for coupon "${id}"`);
    if (!PASSWORD_RE.test(p)) throw new Error(`Password for coupon "${id}" must look like WORD-WORD-NN`);
    passwords[id] = p;
  }

  if (input.message !== undefined && typeof input.message !== 'string') throw new Error('Family pack "message" must be a string');

  const pack: FamilyPack = { schemaVersion: 1, portraits, album: input.album as string[], passwords };
  if (typeof input.message === 'string') pack.message = input.message;
  return pack;
}

const DB_NAME = 'brick-birthday';
const STORE = 'pack';
const KEY = 'pack-v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    });
  } finally {
    db.close();
  }
}

export async function savePack(pack: FamilyPack): Promise<void> {
  await withStore('readwrite', (s) => s.put(pack, KEY));
}

export async function loadPack(): Promise<FamilyPack | null> {
  const raw = await withStore<unknown>('readonly', (s) => s.get(KEY));
  if (raw === undefined) return null;
  try {
    return parseFamilyPack(raw);
  } catch {
    return null;
  }
}

export async function removePack(): Promise<void> {
  await withStore('readwrite', (s) => s.delete(KEY));
}

interface PackState {
  pack: FamilyPack | null;
  loaded: boolean;
  error: string | null;
  init: () => Promise<void>;
  importFromFile: (file: File) => Promise<void>;
  remove: () => Promise<void>;
}

export const useFamilyPack = create<PackState>((set) => ({
  pack: null,
  loaded: false,
  error: null,
  init: async () => {
    let pack: FamilyPack | null = null;
    try {
      pack = await loadPack();
    } catch {
      /* IndexedDB unavailable */
    }
    if (!pack && import.meta.env.DEV) {
      try {
        const res = await fetch('/__family-pack.json');
        if (res.ok) pack = parseFamilyPack(await res.json());
      } catch {
        /* no dev pack */
      }
    }
    set({ pack, loaded: true });
  },
  importFromFile: async (file) => {
    try {
      const pack = parseFamilyPack(JSON.parse(await file.text()));
      await savePack(pack);
      set({ pack, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Could not read that file' });
    }
  },
  remove: async () => {
    try {
      await removePack();
    } catch {
      /* ignore */
    }
    set({ pack: null, error: null });
  },
}));
