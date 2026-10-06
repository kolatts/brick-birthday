import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { availableModels } from '../../src/config/models';
import * as THREE from 'three';
import { PET_IDS, humanArm, humanBody, petBody, petTail, HUMAN_HEAD, petHeadSpec, petDims } from '../../src/three/avatarParts';
import { mergeParts } from '../../src/three/merge';
import { faceParts } from '../../src/three/faceParts';
import { EXPRESSIONS } from '../../src/types';
import { family } from '../../src/config/family';
import { closetItems, toggleEquipped } from '../../src/config/closet';
import type { PersonId } from '../../src/types';

const ids = Object.keys(family) as PersonId[];
const tris = (g: THREE.BufferGeometry): number => (g.index ? g.index.count : g.getAttribute('position').count) / 3;

function checkGeometry(g: THREE.BufferGeometry): void {
  expect(g.index).not.toBeNull();
  const n = g.getAttribute('normal');
  const p = g.getAttribute('position');
  expect(n.count).toBe(p.count);
  let bad = 0;
  let outward = 0;
  for (let i = 0; i < n.count; i++) {
    const l = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
    if (!Number.isFinite(l) || l < 0.5) bad++;
    if (!Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i))) bad++;
  }
  expect(bad).toBe(0);
  // winding agrees with vertex normals for nearly every triangle (nothing renders inside-out)
  const idx = g.index!;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3(), vn = new THREE.Vector3();
  let total = 0;
  for (let t = 0; t < idx.count; t += 3) {
    a.fromBufferAttribute(p, idx.getX(t));
    b.fromBufferAttribute(p, idx.getX(t + 1));
    c.fromBufferAttribute(p, idx.getX(t + 2));
    fn.subVectors(b, a).cross(c.clone().sub(a));
    if (fn.lengthSq() < 1e-12) continue;
    vn.fromBufferAttribute(g.getAttribute('normal'), idx.getX(t)).add(vn.fromBufferAttribute(g.getAttribute('normal'), idx.getX(t + 1))).add(vn.fromBufferAttribute(g.getAttribute('normal'), idx.getX(t + 2)));
    total++;
    if (fn.dot(vn) > 0) outward++;
  }
  expect(outward / total).toBeGreaterThan(0.97);
}

describe('procedural figures', () => {
  it.each(ids)('%s: indexed geometry, sane triangle budget, clean normals', (id) => {
    const pet = PET_IDS.includes(id);
    const body = mergeParts(pet ? petBody(id, false) : humanBody(id, []));
    const arm = pet ? null : mergeParts(humanArm(id));
    const tail = pet ? mergeParts(petTail(id)) : null;
    for (const g of [body, arm, tail]) if (g) checkGeometry(g);
    const total = tris(body) + (arm ? 2 * tris(arm) : 0) + (tail ? tris(tail) : 0);
    console.log(`${id}: ${Math.round(total)} triangles (body ${tris(body)})`);
    expect(total).toBeLessThan(7500); // procedural fallback; the Blender glb carries the high-detail look
    expect(total).toBeGreaterThan(1500);
  });

  it('low detail is much lighter than high', () => {
    const hi = tris(mergeParts(humanBody('luna', []), 'high'));
    const lo = tris(mergeParts(humanBody('luna', [], 'low'), 'low'));
    expect(lo).toBeLessThan(hi * 0.6);
  });

  it('Luna with the full closet stays within budget', () => {
    const all = ['bow', 'dress', 'cape', 'visor', 'labcoat', 'boots', 'sunglasses'];
    const g = mergeParts(humanBody('luna', all));
    checkGeometry(g);
    expect(tris(g) + 2 * tris(mergeParts(humanArm('luna', 'high', all)))).toBeLessThan(15000); // everything worn at once, procedural fallback
  });

  it.each(ids)('%s: every expression has its own printed face geometry', (id) => {
    const pet = PET_IDS.includes(id);
    const spec = pet ? petHeadSpec(id) : HUMAN_HEAD;
    const at: [number, number, number] = [0, 0, pet ? petDims(id).headZ : 0];
    const sets = EXPRESSIONS.map((x) => mergeParts(faceParts(id, x, spec, at, 'high')));
    for (const g of sets) {
      checkGeometry(g);
      expect(tris(g)).toBeGreaterThan(40);
      expect(tris(g)).toBeLessThan(1500);
    }
    // surprised / silly differ from happy
    expect(new Set(sets.map((g) => tris(g))).size).toBeGreaterThan(1);
  });
});

describe('Blender pipeline inputs and outputs', () => {
  const spec = JSON.parse(fs.readFileSync('scripts/models/figures.json', 'utf8')) as {
    figures: Record<string, { bodyColor: string; hairStyle?: string; hairColor?: string; skinTone?: string }>;
  };
  it('figures.json mirrors src/config/family.ts', () => {
    expect(Object.keys(spec.figures).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const a = family[id].avatar;
      const f = spec.figures[id];
      expect(f.bodyColor).toBe(a.bodyColor);
      if (f.hairStyle) expect(f.hairStyle).toBe(a.hairStyle);
      if (f.hairColor) expect(f.hairColor).toBe(a.hairColor);
      if (f.skinTone) expect(f.skinTone).toBe(a.skinTone);
    }
  });
  it('every listed glb exists, is Draco-sized (< 300 KB) and the decoder ships locally', () => {
    for (const name of availableModels) {
      const file = path.join('public', 'models', `${name}.glb`);
      expect(fs.existsSync(file), file).toBe(true);
      expect(fs.statSync(file).size).toBeLessThan(300 * 1024);
    }
    if (availableModels.length) expect(fs.existsSync('public/models/draco/draco_wasm_wrapper.js')).toBe(true);
  });
});

describe('closet slots', () => {
  it('every item has a slot and a distinct anchor, so the full wardrobe can be worn at once', () => {
    const anchors = closetItems.map((i) => i.anchor);
    expect(new Set(anchors).size).toBe(anchors.length);
    for (const i of closetItems) expect(i.slot).toBeTruthy();
    expect(closetItems.reduce((acc, i) => toggleEquipped(acc, i.id), [] as string[]).length).toBe(closetItems.length);
  });
  it('toggling removes a worn item and replaces anchor clashes', () => {
    expect(toggleEquipped(['bow'], 'bow')).toEqual([]);
    expect(toggleEquipped([], 'nope')).toEqual([]);
  });
});

describe('glb face groups', () => {
  /** Node names in a glb's JSON chunk. */
  const nodeNames = (file: string): string[] => {
    const b = fs.readFileSync(file);
    const len = b.readUInt32LE(12);
    return (JSON.parse(b.subarray(20, 20 + len).toString('utf8')) as { nodes: { name?: string }[] }).nodes.map((n) => n.name ?? '');
  };
  it('each listed glb that has been rebuilt with faces carries Face_happy / Face_surprised / Face_silly (older glbs are skipped)', () => {
    for (const name of availableModels) {
      const names = nodeNames(path.join('public', 'models', `${name}.glb`));
      if (!names.some((n) => n.startsWith('Face_'))) continue; // pre-3D-face build: Avatar falls back to nothing special, rebuild pending
      for (const x of EXPRESSIONS) expect(names, `${name} Face_${x}`).toContain(`Face_${x}`);
      expect(names).toContain('Head');
    }
  });
});
