import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { canvasProps, StaticBatch } from '../../three/Brick';
import { Lights } from '../../three/Lights';
import { Avatar } from '../../three/Avatar';
import { Sparkles } from '../../three/Wand';
import { Builder, type Prim, type V3 } from '../../three/prims';
import { cameos } from '../../config/cameos';
import type { PersonId } from '../../types';
import type { Picks } from './options';

/* ----------------------------------------------------------------- helpers ------- */

const DEEP = '#E63946';
const CREAM = '#FFF4E0';

function useCanvasTexture(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, deps: unknown[]): THREE.CanvasTexture {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (g) draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function BrickWall({ position, size }: { position: V3; size: [number, number] }) {
  const tex = useCanvasTexture(
    (g, w, h) => {
      g.fillStyle = '#E8588F';
      g.fillRect(0, 0, w, h);
      const bw = w / 2, bh = h / 4;
      for (let r = 0; r < 4; r++) {
        for (let c = -1; c < 3; c++) {
          const x = c * bw + (r % 2 ? bw / 2 : 0);
          g.fillStyle = (r + c) % 3 === 0 ? '#FF9EC4' : '#FF86B5';
          g.beginPath();
          g.roundRect(x + 4, r * bh + 4, bw - 8, bh - 8, 10);
          g.fill();
        }
      }
    },
    256,
    256,
    [],
  );
  useMemo(() => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(size[0] / 2.4, size[1] / 1.2);
  }, [tex, size]);
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

function Rig({ pos, look }: { pos: V3; look: V3 }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
    camera.updateProjectionMatrix();
  }, [camera, pos, look]);
  return null;
}

/* -------------------------------------------------------------------- tower ------ */

function towerPrims(): Prim[] {
  const b = new Builder();
  // floor plate + wainscot ledge with studs
  b.box([3, -0.2, 3], [26, 0.4, 14], '#FFB3D1', { studs: 1 });
  b.box([3, 0.45, -0.35], [26, 0.9, 0.7], '#E63946', { studs: true });
  // arched windows (cream frame + sky + clouds + roof peek)
  for (const x of [2.2, 8.9]) {
    b.box([x, 3.1, 0.12], [2.5, 3.4, 0.2], CREAM);
    b.cyl([x, 4.8, 0.12], 1.25, 0.2, CREAM, [Math.PI / 2, 0, 0]);
    b.box([x, 3.1, 0.25], [2.1, 3.4, 0.12], '#8EC8FF');
    b.cyl([x, 4.8, 0.25], 1.05, 0.12, '#8EC8FF', [Math.PI / 2, 0, 0]);
    b.sph([x - 0.4, 3.9, 0.36], [0.5, 0.25, 0.1], '#FFFFFF');
    b.sph([x + 0.1, 4.05, 0.36], [0.4, 0.22, 0.1], '#FFFFFF');
    b.box([x + 0.5, 2.5, 0.34], [0.5, 0.9, 0.1], '#E63946');
    b.cone([x + 0.5, 3.3, 0.34], 0.42, 0.7, '#3A86FF');
    b.box([x, 1.95, 0.3], [2.7, 0.18, 0.4], CREAM, { studs: true });
  }
  // bookshelf of brick books (right edge)
  const bx = -0.4;
  b.box([bx, 3.2, 0.2], [2.5, 4.4, 0.5], '#B5651D');
  for (const [i, y] of [1.35, 2.6, 3.85].entries()) {
    b.box([bx, y - 0.5, 0.45], [2.3, 0.14, 0.6], '#8B4A12');
    const cols = ['#E63946', '#3A86FF', '#FFD60A', '#7AE582', '#FF5CA8', '#FF8C42'];
    for (let k = 0; k < 6; k++) b.box([bx - 0.95 + k * 0.38, y, 0.5], [0.3, 0.8 - (k % 2) * 0.12, 0.45], cols[(k + i * 2) % cols.length], { studs: 0.3 });
  }
  // reading-nook cushion + pouf under Mom
  b.cyl([4.5, 0.3, 0.3], 1.0, 0.6, '#FF5CA8');
  b.cyl([4.5, 0.64, 0.3], 0.95, 0.12, '#FFD3E6');
  // table in front
  b.box([5.4, 0.85, 2.8], [3.6, 0.2, 1.4], '#C98A4B', { studs: true });
  for (const sx of [-1.5, 1.5]) for (const sz of [-0.5, 0.5]) b.box([5.4 + sx, 0.4, 2.8 + sz], [0.2, 0.8, 0.2], '#8B4A12');
  // cone roof peeking above the wall
  b.cone([-4, 6.4, -0.8], 2.2, 2.6, '#3A86FF');
  return b.prims;
}

const LIGHT_COLORS = ['#FFD60A', '#FFFFFF', '#FF5CA8', '#7AE582', '#3A86FF'];
function FairyLights() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const pts = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: -4 + i * 0.95, y: 6.1 - Math.sin((i / 21) * Math.PI) * 0.7, c: LIGHT_COLORS[i % LIGHT_COLORS.length] })), []);
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const s = 0.8 + 0.45 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3 + i * 1.7));
      m.scale.setScalar(s);
    });
  });
  return (
    <group position={[0, 0, 0.25]}>
      {pts.map((p, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)} position={[p.x, p.y, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.14, 8]} />
          <meshBasicMaterial color={p.c} />
        </mesh>
      ))}
    </group>
  );
}

function OpenBook() {
  const b = useMemo(() => {
    const p = new Builder();
    p.box([-0.34, 0, 0], [0.62, 0.08, 0.5], DEEP, { rot: [0, 0, 0.0] });
    p.box([0.34, 0, 0], [0.62, 0.08, 0.5], DEEP);
    p.box([-0.34, 0.07, 0], [0.54, 0.05, 0.42], '#FFFFFF');
    p.box([0.34, 0.07, 0], [0.54, 0.05, 0.42], '#FFFFFF');
    return p.prims;
  }, []);
  return (
    <group position={[4.5, 2.05, 0.95]} rotation={[-0.95, 0, 0]}>
      <StaticBatch prims={b} />
    </group>
  );
}

/* ---------------------------------------------------------------- hero figures --- */

const AVATAR_IDS: Record<string, PersonId> = {
  luna: 'luna', mom: 'mom', dad: 'dad', julian: 'julian', darian: 'darian', rudolph: 'rudolph', jinglebells: 'jinglebells',
};

function cameoPrims(id: string): Prim[] {
  const b = new Builder();
  const eye = (x: number, y: number, z: number) => b.sph([x, y, z], 0.07, '#1D2A44');
  if (id === 'princessmoon') {
    const c = cameos.find((x) => x.id === 'moon')!.brick;
    b.cone([0, 0.8, 0], 0.55, 1.6, '#C9D8E8', [Math.PI, 0, 0]); // silver tail, tip up -> flipped so it flares at the bottom
    b.cone([0, 0.1, 0.02], 0.7, 0.35, '#E6EEF8');
    b.box([0, 1.7, 0], [0.8, 0.8, 0.6], '#F5D5BD');
    b.box([0, 1.15, 0], [0.7, 0.9, 0.45], '#E8B6D8');
    b.box([0, 1.95, -0.12], [1.05, 0.9, 0.35], c.hairColor);
    b.box([0, 2.15, 0.2], [0.9, 0.2, 0.3], c.hairColor);
    b.box([0, 2.5, 0.05], [0.7, 0.18, 0.3], c.accent);
    for (const s of [-1, 1]) {
      b.box([s * 0.9, 1.5, -0.2], [0.1, 1.2, 0.7], '#FFD60A', { rot: [0, 0, s * 0.45] });
      b.box([s * 0.52, 1.1, 0.05], [0.18, 0.7, 0.2], '#F5D5BD');
    }
    eye(-0.2, 1.75, 0.31);
    eye(0.2, 1.75, 0.31);
  } else if (id === 'babylady') {
    const c = cameos.find((x) => x.id === 'babylady')!.brick;
    b.sph([0, 0.9, -0.1], [0.65, 0.6, 0.85], c.bodyColor);
    b.cone([0, 0.45, -0.85], 0.4, 1.0, '#E3C5D6', [-Math.PI / 2 - 0.4, 0, 0]);
    b.sph([0, 1.65, 0.5], 0.55, c.bodyColor);
    b.sph([0, 1.55, 0.95], [0.25, 0.2, 0.2], '#F7E7F0');
    for (const s of [-1, 1]) {
      b.sph([s * 0.55, 1.5, 0.45], [0.2, 0.45, 0.2], '#E0C690');
      b.box([s * 0.85, 1.35, -0.2], [0.08, 0.9, 0.55], '#F7E7F0', { rot: [0, 0, s * 0.5] });
      b.sph([s * 0.22, 1.75, 0.95], 0.07, '#1D2A44');
      b.sph([s * 0.3, 0.3, 0.35], [0.14, 0.3, 0.14], '#F3D9A4');
    }
    b.sph([0, 1.63, 1.1], 0.09, '#1D2A44');
  } else {
    const c = cameos.find((x) => x.id === 'cottontail')!.brick;
    b.sph([0, 0.95, -0.1], [0.65, 0.6, 0.85], c.bodyColor);
    b.sph([0, 1.65, 0.45], 0.55, c.bodyColor);
    b.cone([0, 2.3, 0.35], 0.3, 0.55, c.hairColor);
    for (const s of [-1, 1]) {
      b.sph([s * 0.4, 2.05, 0.3], 0.2, c.bodyColor);
      b.sph([s * 0.22, 1.75, 0.93], 0.07, '#1D2A44');
      b.sph([s * 0.3, 0.3, 0.35], [0.14, 0.32, 0.14], c.bodyColor);
      b.sph([s * 0.3, 0.3, -0.65], [0.14, 0.32, 0.14], c.bodyColor);
    }
    for (const [x, y, z] of [[-0.35, 1.1, 0.2], [0.3, 1.2, -0.2], [0.2, 0.8, 0.4], [-0.3, 0.8, -0.4], [0.45, 1.0, -0.5]] as V3[]) b.sph([x, y, z], 0.08, '#1D2A44');
    b.sph([0, 1.62, 1.0], 0.09, '#1D2A44');
    b.sph([0.7, 0.9, 0.2], 0.08, '#7AE582');
    b.cone([0, 0.75, -1.0], 0.12, 0.8, c.bodyColor, [-Math.PI / 2 - 0.5, 0, 0]);
  }
  return b.prims;
}

function CameoFigure({ id, hopRef }: { id: string; hopRef: React.RefObject<{ hop: number } | null> }) {
  const prims = useMemo(() => cameoPrims(id), [id]);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    const s = hopRef.current;
    if (!s || !g.current) return;
    if (s.hop > 0) s.hop = Math.max(0, s.hop - dt * 1.6);
    g.current.position.y = Math.sin(s.hop * Math.PI) * 0.35 + Math.sin(clock.elapsedTime * 2.2) * 0.02;
  });
  return (
    <group ref={g}>
      <StaticBatch prims={prims} />
    </group>
  );
}

/** Pops in with a bouncy scale. */
function PopIn({ children, position, rotationY = 0, scale = 1 }: { children: React.ReactNode; position: V3; rotationY?: number; scale?: number }) {
  const g = useRef<THREE.Group>(null);
  const t0 = useRef(0);
  useFrame(({ clock }) => {
    if (!g.current) return;
    if (!t0.current) t0.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - t0.current) / 0.5);
    const e = t < 1 ? 1 + 0.25 * Math.sin(t * Math.PI) - (1 - t) * (1 - t) : 1;
    g.current.scale.setScalar(Math.max(0.001, scale * (t < 1 ? Math.min(1.15, t * 1.4) * (1 + (e - 1) * 0.3) : 1)));
  });
  return (
    <group ref={g} position={position} rotation-y={rotationY} scale={0.001}>
      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ table props -- */

function propPrims(id: string): Prim[] {
  const b = new Builder();
  switch (id) {
    // problems
    case 'teapot': b.sph([0, 0.3, 0], [0.34, 0.28, 0.34], '#FF5CA8'); b.sph([0, 0.6, 0], 0.12, '#FFD60A'); b.cyl([0.38, 0.38, 0], 0.07, 0.3, '#FF5CA8', [0, 0, -0.9]); b.sph([-0.4, 0.3, 0], [0.1, 0.16, 0.06], '#FFD60A'); b.sph([0.55, 0.7, 0], 0.07, '#FFD60A'); break;
    case 'cloud': case 'pianocloud': b.sph([0, 0.35, 0], 0.3, '#FFFFFF'); b.sph([0.3, 0.3, 0], 0.24, '#FFFFFF'); b.sph([-0.3, 0.3, 0], 0.24, '#F2F7FF'); b.sph([0, 0.2, 0.15], 0.3, '#FFFFFF'); break;
    case 'sock': b.box([0, 0.35, 0], [0.3, 0.6, 0.25], '#3A86FF'); b.box([0.14, 0.05, 0], [0.5, 0.2, 0.25], '#3A86FF'); b.box([0, 0.55, 0], [0.32, 0.1, 0.27], '#FFD60A'); b.box([0, 0.35, 0], [0.32, 0.1, 0.27], '#FFD60A'); break;
    case 'dragon': b.sph([0, 0.35, 0], [0.4, 0.3, 0.4], '#7AE582'); b.cone([-0.18, 0.7, 0], 0.08, 0.25, '#FFD60A'); b.cone([0.18, 0.7, 0], 0.08, 0.25, '#FFD60A'); b.sph([0, 0.25, 0.38], [0.2, 0.14, 0.14], '#4CC96B'); b.sph([-0.14, 0.45, 0.3], 0.05, '#1D2A44'); b.sph([0.14, 0.45, 0.3], 0.05, '#1D2A44'); b.sph([0, 0.7, 0], 0.07, '#FFFFFF'); break;
    case 'broccoli': case 'woods': b.cyl([0, 0.2, 0], 0.1, 0.4, '#8B6B3E'); b.sph([0, 0.55, 0], 0.3, '#2E8B57'); b.sph([0.2, 0.45, 0.1], 0.2, '#3CB371'); b.sph([-0.2, 0.45, 0], 0.2, '#3CB371'); break;
    case 'rainbow': ['#E63946', '#FF8C42', '#FFD60A', '#7AE582', '#3A86FF'].forEach((c, i) => b.cyl([0, 0.4, -i * 0.01], 0.45 - i * 0.07, 0.06, c, [Math.PI / 2, 0, 0])); break;
    case 'piano': b.box([0, 0.2, 0], [0.8, 0.3, 0.4], '#1D2A44'); b.box([0, 0.38, 0.05], [0.7, 0.08, 0.28], '#FFFFFF'); b.box([0, 0.5, -0.2], [0.8, 0.3, 0.06], '#1D2A44'); break;
    case 'tennisball': case 'tennismoon': b.sph([0, 0.3, 0], 0.3, id === 'tennismoon' ? '#FFF3A0' : '#D4F000'); b.sph([0, 0.3, 0.02], [0.31, 0.04, 0.31], '#FFFFFF'); break;
    case 'snowman': b.sph([0, 0.25, 0], 0.28, '#FFFFFF'); b.sph([0, 0.7, 0], 0.2, '#FFFFFF'); b.cone([0, 0.7, 0.28], 0.05, 0.25, '#FF8C42', [Math.PI / 2, 0, 0]); break;
    case 'drum': b.cyl([0, 0.25, 0], 0.32, 0.5, '#E63946'); b.cyl([0, 0.52, 0], 0.32, 0.05, '#FFFFFF'); b.cyl([0.12, 0.75, 0], 0.03, 0.4, '#C98A4B', [0, 0, 0.5]); b.cyl([-0.12, 0.75, 0], 0.03, 0.4, '#C98A4B', [0, 0, -0.5]); break;
    // places
    case 'teagarden': b.cyl([0, 0.08, 0], 0.5, 0.16, '#7AE582'); b.cyl([0, 0.3, 0], 0.18, 0.3, '#FFF4E0'); b.sph([0.3, 0.3, 0.1], 0.1, '#FF5CA8'); b.sph([-0.3, 0.3, 0], 0.1, '#FFD60A'); break;
    case 'island': b.cyl([0, 0.2, 0], 0.5, 0.2, '#7AE582'); b.cone([0, -0.15, 0], 0.5, 0.5, '#8B6B3E', [Math.PI, 0, 0]); b.cyl([0, 0.6, 0], 0.06, 0.5, '#8B6B3E'); b.sph([0, 0.95, 0], 0.25, '#2E8B57'); break;
    case 'teacupboat': b.cyl([0, 0.2, 0], 0.4, 0.3, '#FFF4E0'); b.cyl([0, 0.1, 0], 0.25, 0.1, '#FFF4E0'); b.cyl([0, 0.6, 0], 0.03, 0.7, '#8B6B3E'); b.box([0.2, 0.75, 0], [0.4, 0.3, 0.03], '#E63946'); break;
    case 'blanketfort': b.box([0, 0.25, 0], [0.7, 0.5, 0.5], '#FF5CA8'); b.cone([0, 0.7, 0], 0.55, 0.45, '#3A86FF'); b.box([0, 0.2, 0.26], [0.2, 0.3, 0.02], '#1D2A44'); break;
    case 'chailake': b.cyl([0, 0.08, 0], 0.5, 0.16, '#B5651D'); b.cyl([0, 0.17, 0], 0.4, 0.04, '#E8C39E'); b.cyl([0.3, 0.3, 0.1], 0.08, 0.25, '#FFFFFF'); break;
    case 'chickencastle': b.box([0, 0.3, 0], [0.7, 0.6, 0.5], '#FF8C42'); for (const x of [-0.3, 0, 0.3]) b.box([x, 0.68, 0.2], [0.14, 0.14, 0.1], '#FF8C42'); b.cone([0, 0.9, -0.1], 0.2, 0.4, '#E63946'); break;
    // powers
    case 'giggle': case 'sneeze': b.sph([0, 0.4, 0], 0.22, id === 'sneeze' ? '#FF9ED2' : '#FFD60A'); [0, 1, 2, 3, 4, 5].forEach((i) => b.cone([Math.cos(i * 1.047) * 0.34, 0.4 + Math.sin(i * 1.047) * 0.34, 0], 0.07, 0.25, '#FFD60A', [0, 0, i * 1.047 - Math.PI / 2])); break;
    case 'timefreeze': b.cyl([0, 0.4, 0], 0.32, 0.1, '#3A86FF', [Math.PI / 2, 0, 0]); b.box([0, 0.5, 0.07], [0.05, 0.22, 0.03], '#FFFFFF'); b.box([0.08, 0.4, 0.07], [0.2, 0.05, 0.03], '#FFFFFF'); break;
    case 'bubble': b.sph([0, 0.4, 0], 0.38, '#BDE6FF'); b.sph([-0.12, 0.52, 0.2], 0.08, '#FFFFFF'); break;
    case 'sprout': b.cyl([0, 0.3, 0], 0.04, 0.6, '#C98A4B'); b.sph([-0.12, 0.7, 0], [0.16, 0.08, 0.1], '#7AE582'); b.sph([0.12, 0.76, 0], [0.16, 0.08, 0.1], '#7AE582'); b.sph([0, 0.62, 0], 0.07, '#FFD60A'); break;
    case 'whistle': b.cyl([0, 0.3, 0], 0.1, 0.5, '#FF5CA8', [0, 0, 1.4]); ['#E63946', '#FFD60A', '#3A86FF'].forEach((c, i) => b.sph([-0.3 + i * 0.1, 0.55 + i * 0.1, 0], 0.07, c)); break;
    case 'hop': for (let i = 0; i < 5; i++) b.cyl([0, 0.1 + i * 0.12, 0], 0.22, 0.05, i % 2 ? '#3A86FF' : '#FFD60A'); b.sph([0, 0.8, 0], 0.18, '#FF5CA8'); break;
    case 'cape': b.box([0, 0.35, 0], [0.55, 0.65, 0.05], '#E63946'); b.sph([0, 0.7, 0.04], 0.1, '#FFD60A'); break;
    case 'animals': b.sph([0, 0.25, 0], [0.26, 0.22, 0.15], '#8B6B3E'); for (const x of [-0.25, -0.08, 0.08, 0.25]) b.sph([x, 0.52 - Math.abs(x) * 0.4, 0], 0.09, '#8B6B3E'); break;
    default: b.sph([0, 0.3, 0], 0.3, '#FF5CA8');
  }
  return b.prims;
}

function TableProp({ id, x }: { id: string; x: number }) {
  const prims = useMemo(() => propPrims(id), [id]);
  return (
    <PopIn position={[x, 0.95, 2.8]} scale={1.15}>
      <StaticBatch prims={prims} />
    </PopIn>
  );
}

/* ----------------------------------------------------------------- tower scene --- */

export interface TowerSceneProps {
  picks: Partial<Picks>;
  heroKind?: 'family' | 'pet' | 'cameo';
  /** Increment to make the hero hop (sentence start). */
  hop: number;
  /** Increment to fire a sparkle burst on the hero. */
  burst: number;
  talking?: boolean;
}

function Tower({ picks, hop, burst }: TowerSceneProps) {
  const prims = useMemo(towerPrims, []);
  const heroId = picks.hero;
  const heroHop = useRef<{ hop: number } | null>({ hop: 0 });
  const momHop = useRef<{ hop: number } | null>({ hop: 0 });
  const heroIsMom = heroId === 'mom';
  useEffect(() => {
    if (!hop) return;
    const r = heroIsMom ? momHop : heroHop;
    if (r.current) r.current.hop = 1;
  }, [hop, heroIsMom]);
  const avatarId = heroId ? AVATAR_IDS[heroId] : undefined;
  const heroPos: V3 = [6.5, 0, 0.9];
  return (
    <>
      <Rig pos={[2, 4.2, 15.5]} look={[2, 2.7, 0]} />
      <Lights />
      <BrickWall position={[3, 4, -0.4]} size={[30, 10]} />
      <StaticBatch prims={prims} />
      <FairyLights />
      <OpenBook />
      <group position={[4.5, 0.66, 0.3]}>
        <Avatar id="mom" scale={0.82} expression="happy" interactive={false} hopRef={momHop} />
      </group>
      {heroId && !heroIsMom && (
        <PopIn key={heroId} position={[heroPos[0], 0, heroPos[2]]} rotationY={-0.25}>
          {avatarId ? (
            <Avatar id={avatarId} scale={avatarId === 'rudolph' || avatarId === 'jinglebells' ? 1.0 : 0.82} expression="happy" interactive={false} hopRef={heroHop} phase={1.3} />
          ) : (
            <CameoFigure id={heroId} hopRef={heroHop} />
          )}
        </PopIn>
      )}
      {picks.place && <TableProp key={picks.place} id={picks.place} x={3.9} />}
      {picks.problem && <TableProp key={picks.problem} id={picks.problem} x={5.4} />}
      {picks.power && <TableProp key={picks.power} id={picks.power} x={6.9} />}
      {burst > 0 && <Sparkles at={[heroIsMom ? 4.5 : 6.5, 2.3, 1.2]} burstKey={burst} count={48} />}
    </>
  );
}

/* --------------------------------------------------------------------- theater --- */

function iconTexture(icon: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createLinearGradient(0, 0, 0, 320);
    grad.addColorStop(0, '#2C3E73');
    grad.addColorStop(1, '#101A3D');
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 320);
    g.font = '200px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(icon, 256, 170);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function theaterPrims(): Prim[] {
  const b = new Builder();
  b.box([0, -0.2, 3], [16, 0.4, 16], '#7A1E3A', { studs: 1 });
  b.box([0, 0.1, -1.5], [11, 0.4, 3], '#B5651D', { studs: true }); // stage
  for (const s of [-1, 1]) b.box([s * 5.3, 3.4, -3], [1.2, 7, 1.0], DEEP, { studs: true });
  b.box([0, 6.9, -3], [11.8, 1.1, 1.0], DEEP, { studs: true });
  // seats
  for (const x of [-4.2, -1.4, 1.4, 4.2]) {
    b.box([x, 0.2, 3.2], [1.8, 0.4, 1.0], '#C1121F', { studs: true });
    b.box([x, 0.7, 3.75], [1.8, 0.7, 0.25], '#C1121F');
  }
  // popcorn buckets on the stage edge
  for (const x of [-3.6, -1.2, 1.2, 3.6]) {
    b.cyl([x, 0.62, 0.3], 0.38, 0.6, '#FFFFFF');
    b.cyl([x, 0.62, 0.3], 0.39, 0.2, '#E63946');
    for (const [dx, dz] of [[-0.15, 0], [0.12, 0.1], [0, -0.12], [0.2, -0.1]] as [number, number][]) b.sph([x + dx, 1.0, 0.3 + dz], 0.15, '#FFF3C4');
  }
  return b.prims;
}

function Curtain({ side, open }: { side: -1 | 1; open: boolean }) {
  const g = useRef<THREE.Group>(null);
  const p = useRef(0);
  useFrame((_, dt) => {
    p.current += ((open ? 1 : 0) - p.current) * Math.min(1, dt * 2.6);
    if (g.current) g.current.scale.x = 1 - p.current * 0.85;
  });
  return (
    <group ref={g} position={[side * 4.7, 3.4, -2.3]}>
      <mesh position={[-side * 2.35, 0, 0]}>
        <boxGeometry args={[4.7, 6.4, 0.35]} />
        <meshStandardMaterial color="#C1121F" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-side * (0.5 + i * 0.95), 0, 0.2]}>
          <boxGeometry args={[0.16, 6.4, 0.12]} />
          <meshStandardMaterial color="#8E0D18" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

const SEATED: { id: PersonId; x: number }[] = [
  { id: 'luna', x: -4.2 },
  { id: 'dad', x: -1.4 },
  { id: 'julian', x: 1.4 },
  { id: 'darian', x: 4.2 },
];

export interface TheaterSceneProps {
  icon: string;
  curtainsOpen: boolean;
}

function Theater({ icon, curtainsOpen }: TheaterSceneProps) {
  const prims = useMemo(theaterPrims, []);
  const tex = useMemo(() => iconTexture(icon), [icon]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <>
      <Rig pos={[0, 3.8, 14]} look={[0, 3.2, -3]} />
      <Lights />
      <mesh position={[0, 3.4, -3.4]}>
        <planeGeometry args={[11, 8]} />
        <meshBasicMaterial color="#5B1230" />
      </mesh>
      <mesh position={[0, 3.4, -3.1]}>
        <planeGeometry args={[8.4, 5.25]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      <StaticBatch prims={prims} />
      <Curtain side={-1} open={curtainsOpen} />
      <Curtain side={1} open={curtainsOpen} />
      {SEATED.map((s, i) => (
        <group key={s.id} position={[s.x, 0.4, 3.3]} rotation-y={Math.PI + (s.x > 0 ? -0.35 : 0.35)}>
          <Avatar id={s.id} scale={0.5} expression="happy" interactive={false} phase={i} />
        </group>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------------- canvas ---- */

export function SceneCanvas({ children }: { children: React.ReactNode }) {
  return (
    <Canvas
      {...canvasProps}
      camera={{ position: [3, 3.6, 13], fov: 40, near: 0.5, far: 80 }}
      data-testid="story-canvas"
      style={{ position: 'absolute', inset: 0 }}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}

export function TowerCanvas(props: TowerSceneProps) {
  return (
    <SceneCanvas>
      <Tower {...props} />
    </SceneCanvas>
  );
}

export function TheaterCanvas(props: TheaterSceneProps) {
  return (
    <SceneCanvas>
      <Theater {...props} />
    </SceneCanvas>
  );
}
