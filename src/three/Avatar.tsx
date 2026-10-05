import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Expression, PersonId } from '../types';
import { family } from '../config/family';
import { mergeParts, vertexMat } from './merge';
import { humanArm, humanBody, humanDims, isPet, petBody, petDims, petTail, petTailPivot } from './avatarParts';
import { useFaceTexture } from './faces';
import { useAvatarExpression, setExpression } from '../state/expressions';
import { useCloset } from '../state/closet';
import { sfx } from '../audio/engine';
import { Wand } from './Wand';
import type { V3 } from './prims';

const NO_EQUIP: string[] = [];

function roundedRectGeometry(w: number, h: number, r: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 4);
  const uv = g.getAttribute('uv');
  const pos = g.getAttribute('position');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

const shadowGeo = new THREE.CircleGeometry(1, 20);
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
  /** Offsets idle animation so a row of avatars does not move in lockstep. */
  phase?: number;
  /** Per-frame hook (pets use it for walking bob / tricks); runs on the inner group. */
  hopRef?: RefObject<{ hop: number } | null>;
}

/** Brick figure (people) or brick pet. Faces on a flat plate that shows the portrait for the current expression. */
export function Avatar(props: AvatarProps) {
  const { id, wave = false, scale = 1, position, rotationY = 0, wand = false, partyHat = false, interactive = true, phase = 0 } = props;
  const pet = isPet(id);
  const storeEquipped = useCloset((s) => s.equipped);
  const equipped = props.equipped ?? (id === 'luna' ? storeEquipped : NO_EQUIP);
  const storeExpr = useAvatarExpression(id);
  const expr = props.expression ?? storeExpr;
  const tex = useFaceTexture(id, expr);

  const equipKey = equipped.join('|');
  const geo = useMemo(() => {
    const parts = pet ? petBody(id, partyHat) : humanBody(id, equipped);
    const body = mergeParts(parts);
    const arm = pet ? null : mergeParts(humanArm(id));
    const tail = pet ? mergeParts(petTail(id)) : null;
    return { body, arm, tail };
    // equipped is represented by equipKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, pet, partyHat, equipKey]);
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
  const plate = useMemo(() => (pet ? roundedRectGeometry(pd!.plateW, pd!.plateH, 0.14) : roundedRectGeometry(0.84, 0.78, 0.16)), [pet, pd]);
  useEffect(() => () => plate.dispose(), [plate]);
  // Portraits have transparent backgrounds: let the skin-coloured head show through around the face.
  const plateMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, alphaTest: 0.05, depthWrite: false }),
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
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
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

  return (
    <group position={position} rotation-y={rotationY} scale={scale}>
      <mesh geometry={shadowGeo} material={shadowMat} position={[0, 0.015, 0]} scale={pet ? [0.8, 1, 1] : [0.85, 1, 0.7]} raycast={noRaycast} />
      <group ref={inner}>
        <mesh geometry={geo.body} material={vertexMat} raycast={noRaycast} />
        {pet && pd && (
          <>
            <mesh geometry={plate} material={plateMat} position={[0, pd.headY, pd.plateZ]} raycast={noRaycast} />
            <group ref={tailRef} position={petTailPivot(id)}>
              <mesh geometry={geo.tail!} material={vertexMat} raycast={noRaycast} />
            </group>
          </>
        )}
        {!pet && dims && (
          <>
            <mesh geometry={plate} material={plateMat} position={[0, dims.headY - 0.03, dims.headD / 2 + 0.012]} raycast={noRaycast} />
            <group ref={armL} position={[-0.66, dims.shoulderY, 0]}>
              <mesh geometry={geo.arm!} material={vertexMat} raycast={noRaycast} />
              {wand && (
                <group position={[0, -0.66, 0.12]} rotation={[1.15 + 0.25, 0, 0]}>
                  <Wand scale={0.9} />
                </group>
              )}
            </group>
            <group ref={armR} position={[0.66, dims.shoulderY, 0]}>
              <mesh geometry={geo.arm!} material={vertexMat} raycast={noRaycast} />
            </group>
          </>
        )}
      </group>
      {interactive && (
        <mesh visible={false} geometry={hitGeo} position={hit.p} scale={hit.s} onClick={tap} />
      )}
    </group>
  );
}

function noRaycast(): void {
  /* only the hit proxy is a tap target */
}
