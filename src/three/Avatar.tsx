import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { createPortal, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Expression, PersonId } from '../types';
import { family } from '../config/family';
import { mergeParts, vertexMat } from './merge';
import { humanArm, humanBody, humanDims, humanPlateGeometry, isPet, petBody, petDims, petPlateGeometry, petTail, petTailPivot } from './avatarParts';
import type { Detail } from './figureGeometry';
import { Model } from './Model';
import { availableModels } from '../config/models';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useFaceTexture } from './faces';
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

/** Brick figure (people) or brick pet. Faces on a flat plate that shows the portrait for the current expression. */
export function Avatar(props: AvatarProps) {
  const { id, wave = false, scale = 1, position, rotationY = 0, wand = false, partyHat = false, interactive = true, phase = 0, detail = 'high' } = props;
  useFigureEnv();
  const pet = isPet(id);
  const storeEquipped = useCloset((s) => s.equipped);
  const equipped = props.equipped ?? (id === 'luna' ? storeEquipped : NO_EQUIP);
  const storeExpr = useAvatarExpression(id);
  const expr = props.expression ?? storeExpr;
  const tex = useFaceTexture(id, expr);

  const equipKey = equipped.join('|');
  const geo = useMemo(() => {
    const body = mergeParts(pet ? petBody(id, partyHat, detail) : humanBody(id, equipped, detail), detail);
    const arm = pet ? null : mergeParts(humanArm(id, detail, equipped), detail);
    const tail = pet ? mergeParts(petTail(id, detail), detail) : null;
    return { body, arm, tail };
    // equipped is represented by equipKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, pet, partyHat, equipKey, detail]);
  useEffect(
    () => () => {
      geo.body.dispose();
      geo.arm?.dispose();
      geo.tail?.dispose();
    },
    [geo],
  );

  const dims = pet ? null : humanDims(id);
  const pd = pet ? petDims(id) : null;
  const plate = useMemo(() => (pet ? petPlateGeometry(id, detail) : humanPlateGeometry(detail)), [pet, id, detail]);
  useEffect(() => () => plate.dispose(), [plate]);
  // Portraits have transparent backgrounds: let the skin-coloured head show through around the face.
  const plateMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, metalness: 0, transparent: true, alphaTest: 0.02, depthWrite: false, }),
    [],
  );
  useEffect(() => () => plateMat.dispose(), [plateMat]);
  useEffect(() => {
    plateMat.map = tex;
    plateMat.needsUpdate = true;
  }, [tex, plateMat]);
  // before the texture decodes, show the skin / fur colour rather than white
  const fallbackColor = family[id].avatar.skinTone;
  useEffect(() => {
    plateMat.color.set(tex ? '#ffffff' : fallbackColor);
  }, [tex, plateMat, fallbackColor]);

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
          <mesh geometry={plate} material={plateMat} position={[0, pd.headY, pd.headZ]} raycast={noRaycast} />
          <group ref={tailRef} position={petTailPivot(id)}>
            <mesh geometry={geo.tail!} material={vertexMat} raycast={noRaycast} />
          </group>
        </>
      )}
      {!pet && dims && (
        <>
          <mesh geometry={plate} material={plateMat} position={[0, dims.headY, 0]} raycast={noRaycast} />
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
              <GlbRig scene={scene} tex={tex} fallbackColor={fallbackColor} equipped={equipped} wand={wand} partyHat={partyHat} refs={{ armL, armR, head: headNode, tail: tailRef }} />
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

/** A Blender-built figure: portrait on the `FacePlate` mesh, `ArmL`/`ArmR`/`Head`/`Tail` nodes animated, garment/prop nodes toggled. */
function GlbRig(props: { scene: THREE.Object3D; tex: THREE.Texture | null; fallbackColor: string; equipped: string[]; wand: boolean; partyHat: boolean; refs: RigRefs }) {
  const { scene, tex, fallbackColor, equipped, wand, partyHat, refs } = props;
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, metalness: 0, transparent: true, alphaTest: 0.02, depthWrite: false, }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  // glTF uv origin is top-left, so the portrait needs flipY=false (clone shares the decoded image).
  const faceTex = useMemo(() => {
    if (!tex) return null;
    const t = tex.clone();
    t.flipY = false;
    t.needsUpdate = true;
    return t;
  }, [tex]);
  useEffect(() => {
    mat.map = faceTex;
    mat.color.set(faceTex ? '#ffffff' : fallbackColor);
    mat.needsUpdate = true;
    return () => faceTex?.dispose();
  }, [faceTex, mat, fallbackColor]);
  const nodes = useMemo(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.raycast = noRaycast;
      if (o.name === 'FacePlate') m.material = mat;
      else m.material = vertexMat; // every other mesh: vertex colours + the shared molded-plastic material
    });
    return { armL: scene.getObjectByName('ArmL') ?? null, armR: scene.getObjectByName('ArmR') ?? null, head: scene.getObjectByName('Head') ?? null, tail: scene.getObjectByName('Tail') ?? null };
  }, [scene, mat]);
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
