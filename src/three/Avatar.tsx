import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Expression, PersonId } from '../types';
import { EXPRESSIONS } from '../types';
import { mergeParts, vertexMat } from './merge';
import { HUMAN_HEAD, humanArm, humanBody, humanDims, isPet, petBody, petDims, petHeadSpec, petTail, petTailPivot } from './avatarParts';
import type { Detail } from './figureGeometry';
import { Model } from './Model';
import { availableModels } from '../config/models';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { faceParts } from './faceParts';
import { useAvatarExpression, setExpression } from '../state/expressions';
import { useCloset } from '../state/closet';
import { sfx } from '../audio/engine';
import { Wand } from './Wand';
import type { V3 } from './prims';

const NO_EQUIP: string[] = [];

const envCache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();
/** Soft studio reflections for the molded-plastic look (no network: three's built-in RoomEnvironment). */
function useFigureEnv(): void {
  const gl = useThree((st) => st.gl);
  useEffect(() => {
    let tex = envCache.get(gl);
    if (!tex) {
      const pm = new THREE.PMREMGenerator(gl);
      tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      pm.dispose();
      envCache.set(gl, tex);
    }
    if (vertexMat.envMap !== tex) {
      vertexMat.envMap = tex;
      vertexMat.needsUpdate = true;
    }
  }, [gl]);
}

/** Flat printed finish for facial features. */
const faceMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

const shadowGeo = new THREE.CircleGeometry(1, 36);
shadowGeo.rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ color: '#1D2A44', transparent: true, opacity: 0.2, depthWrite: false });
const hitGeo = new THREE.BoxGeometry(1, 1, 1);

export interface AvatarProps {
  id: PersonId;
  /** Forces an expression; by default the shared expression store drives it (auto-reverts to happy). */
  expression?: Expression;
  wave?: boolean;
  scale?: number;
  position?: V3;
  rotationY?: number;
  /** Closet items to wear; defaults to Luna's saved outfit for Luna and nothing for everyone else. */
  equipped?: string[];
  /** Luna's wand in the left hand. */
  wand?: boolean;
  /** Party hat (pets). */
  partyHat?: boolean;
  /** Tap = silly face + pop. Pets pass false and handle taps themselves. */
  interactive?: boolean;
  /** Geometry detail: `low` for big crowds. */
  detail?: Detail;
  /** Offsets idle animation so a row of avatars does not move in lockstep. */
  phase?: number;
  /** Per-frame hook (pets use it for walking bob / tricks); runs on the inner group. */
  hopRef?: RefObject<{ hop: number } | null>;
}

/** Brick figure (people) or brick pet. The face is geometry (printed-toy eyes, brows, blush, mouth); one expression is visible at a time. */
export function Avatar(props: AvatarProps) {
  const { id, wave = false, scale = 1, position, rotationY = 0, wand = false, partyHat = false, interactive = true, phase = 0, detail = 'high' } = props;
  useFigureEnv();
  const pet = isPet(id);
  const storeEquipped = useCloset((s) => s.equipped);
  const equipped = props.equipped ?? (id === 'luna' ? storeEquipped : NO_EQUIP);
  const storeExpr = useAvatarExpression(id);
  const expr = props.expression ?? storeExpr;

  const equipKey = equipped.join('|');
  const geo = useMemo(() => {
    const body = mergeParts(pet ? petBody(id, partyHat, detail) : humanBody(id, equipped, detail), detail);
    const arm = pet ? null : mergeParts(humanArm(id, detail, equipped), detail);
    const tail = pet ? mergeParts(petTail(id, detail), detail) : null;
    const spec = pet ? petHeadSpec(id) : HUMAN_HEAD;
    const at: V3 = pet ? [0, 0, petDims(id).headZ] : [0, 0, 0];
    const faces = Object.fromEntries(EXPRESSIONS.map((x) => [x, mergeParts(faceParts(id, x, spec, at, detail), detail)])) as Record<Expression, THREE.BufferGeometry>;
    return { body, arm, tail, faces };
    // equipped is represented by equipKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, pet, partyHat, equipKey, detail]);
  useEffect(
    () => () => {
      geo.body.dispose();
      geo.arm?.dispose();
      geo.tail?.dispose();
      EXPRESSIONS.forEach((x) => geo.faces[x].dispose());
    },
    [geo],
  );

  const dims = pet ? null : humanDims(id);
  const pd = pet ? petDims(id) : null;
  const inner = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Object3D | null>(null);
  const armR = useRef<THREE.Object3D | null>(null);
  const headNode = useRef<THREE.Object3D | null>(null);
  const tailRef = useRef<THREE.Group>(null);
  const state = useRef({ hop: 0 });

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + phase;
    const g = inner.current;
    if (!g) return;
    const s = state.current;
    if (s.hop > 0) s.hop = Math.max(0, s.hop - dt * 1.6);
    const hopY = Math.sin(s.hop * Math.PI) * 0.35;
    g.position.y = hopY + Math.sin(t * 2.2) * 0.012;
    g.scale.y = 1 + Math.sin(t * 2.2) * 0.012;
    if (!pet) {
      const l = armL.current, r = armR.current;
      if (l) {
        l.rotation.x = wand ? -1.15 + Math.sin(t * 3) * 0.05 : Math.sin(t * 1.6) * 0.06;
        l.rotation.z = wand ? -0.5 : -0.08;
      }
      if (r) {
        if (wave) {
          r.rotation.z = -(2.55 + Math.sin(t * 7) * 0.4);
          r.rotation.x = 0;
        } else {
          r.rotation.z = 0.08;
          r.rotation.x = Math.sin(t * 1.6 + 1) * 0.06;
        }
      }
    } else if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 8) * 0.5;
      tailRef.current.rotation.z = Math.sin(t * 8 + 1) * 0.12;
    }
  });

  useEffect(() => {
    if (props.hopRef) props.hopRef.current = state.current;
  }, [props.hopRef]);

  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    setExpression(id, 'silly', 1500);
    sfx('pop');
    state.current.hop = 1;
  };

  // hit proxy covers the whole figure
  const hit: { s: V3; p: V3 } = pet ? { s: [0.9, 1.5, 1.4], p: [0, 0.75, 0.1] } : { s: [1.5, 2.6, 0.9], p: [0, 1.3, 0] };

  const glbName = availableModels.includes(id) ? id : null;
  const procedural = (
    <>
      <mesh geometry={geo.body} material={vertexMat} raycast={noRaycast} />
      {pet && pd && (
        <>
          <group position={[0, pd.headY, 0]}>{FaceMeshes(geo.faces, expr)}</group>
          <group ref={tailRef} position={petTailPivot(id)}>
            <mesh geometry={geo.tail!} material={vertexMat} raycast={noRaycast} />
          </group>
        </>
      )}
      {!pet && dims && (
        <>
          <group position={[0, dims.headY, 0]}>{FaceMeshes(geo.faces, expr)}</group>
          <group ref={(o) => { armL.current = o; }} position={[-0.66, dims.shoulderY, 0]}>
            <mesh geometry={geo.arm!} material={vertexMat} raycast={noRaycast} />
            {wand && (
              <group position={[0, -0.66, 0.12]} rotation={[1.15 + 0.25, 0, 0]}>
                <Wand scale={0.9} />
              </group>
            )}
          </group>
          <group ref={(o) => { armR.current = o; }} position={[0.66, dims.shoulderY, 0]}>
            <mesh geometry={geo.arm!} material={vertexMat} raycast={noRaycast} />
          </group>
        </>
      )}
    </>
  );

  return (
    <group position={position} rotation-y={rotationY} scale={scale}>
      <mesh geometry={shadowGeo} material={shadowMat} position={[0, 0.015, 0]} scale={pet ? [0.8, 1, 1] : [0.85, 1, 0.7]} raycast={noRaycast} />
      <group ref={inner}>
        {glbName ? (
          <Model
            name={glbName}
            fallback={procedural}
            render={(scene) => (
              <GlbRig scene={scene} expr={expr} procFace={<group position={[0, pet ? pd!.headY : dims!.headY, 0]}>{FaceMeshes(geo.faces, expr)}</group>} equipped={equipped} wand={wand} partyHat={partyHat} refs={{ armL, armR, head: headNode, tail: tailRef }} />
            )}
          />
        ) : (
          procedural
        )}
      </group>
      {interactive && <mesh visible={false} geometry={hitGeo} position={hit.p} scale={hit.s} onClick={tap} />}
    </group>
  );
}

interface RigRefs {
  armL: RefObject<THREE.Object3D | null>;
  armR: RefObject<THREE.Object3D | null>;
  head: RefObject<THREE.Object3D | null>;
  tail: RefObject<THREE.Object3D | null>;
}

/** The three face geometries of the procedural figure, only the current expression visible. */
function FaceMeshes(faces: Record<Expression, THREE.BufferGeometry>, expr: Expression) {
  return EXPRESSIONS.map((x) => <mesh key={x} geometry={faces[x]} material={faceMat} visible={x === expr} raycast={noRaycast} />);
}

/** A Blender-built figure: `Face_<expression>` groups toggled, `ArmL`/`ArmR`/`Head`/`Tail` nodes animated, `Item_*` garments/props toggled. */
function GlbRig(props: { scene: THREE.Object3D; expr: Expression; procFace: ReactNode; equipped: string[]; wand: boolean; partyHat: boolean; refs: RigRefs }) {
  const { scene, expr, procFace, equipped, wand, partyHat, refs } = props;
  // glbs built before the 3D faces have no Face_* groups: keep the procedural face (and hide the old portrait plate)
  const hasFace = useMemo(() => {
    let found = false;
    scene.traverse((o) => {
      if (o.name.startsWith('Face_')) found = true;
    });
    scene.traverse((o) => {
      if (!found && o.name === 'FacePlate') o.visible = false;
    });
    return found;
  }, [scene]);
  const nodes = useMemo(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.raycast = noRaycast;
      let inFace = false;
      for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.name.startsWith('Face_')) inFace = true;
      if (inFace) {
        // printed-toy features keep the glb's own flat material, nudged toward the camera so they never z-fight the skin
        const fm = m.material as THREE.Material;
        fm.polygonOffset = true;
        fm.polygonOffsetFactor = -2;
        fm.polygonOffsetUnits = -2;
      } else m.material = vertexMat; // everything else: vertex colours + the shared molded-plastic material
    });
    return { armL: scene.getObjectByName('ArmL') ?? null, armR: scene.getObjectByName('ArmR') ?? null, head: scene.getObjectByName('Head') ?? null, tail: scene.getObjectByName('Tail') ?? null };
  }, [scene]);
  useEffect(() => {
    refs.armL.current = nodes.armL;
    refs.armR.current = nodes.armR;
    refs.head.current = nodes.head;
    refs.tail.current = nodes.tail;
    return () => {
      refs.armL.current = null;
      refs.armR.current = null;
      refs.head.current = null;
      refs.tail.current = null;
    };
  }, [nodes, refs]);
  // only the current expression's face group is visible
  useEffect(() => {
    scene.traverse((o) => {
      if (o.name.startsWith('Face_') && o.parent && !o.parent.name.startsWith('Face_')) o.visible = o.name === `Face_${expr}`;
    });
  }, [scene, expr]);
  // toggle named garment / prop nodes (closet slot items are separate meshes in the glb: "Item_<id>")
  useEffect(() => {
    scene.traverse((o) => {
      if (!o.name.startsWith('Item_')) return;
      const item = o.name.slice(5).split('__')[0]; // Item_<id> or Item_<id>__<part>
      o.visible = item === 'pethats' ? partyHat : equipped.includes(item);
    });
  }, [scene, equipped, partyHat]);
  useFrame(({ clock }) => {
    const h = nodes.head;
    if (h) h.rotation.y = Math.sin(clock.elapsedTime * 0.9) * 0.06;
  });
  return (
    <>
      <primitive object={scene} />
      {!hasFace && procFace}
      {wand && nodes.armL && createPortal(
        <group position={[0, -0.66, 0.12]} rotation={[1.15 + 0.25, 0, 0]}>
          <Wand scale={0.9} />
        </group>,
        nodes.armL,
      )}
    </>
  );
}

function noRaycast(): void {
  /* only the hit proxy is a tap target */
}
