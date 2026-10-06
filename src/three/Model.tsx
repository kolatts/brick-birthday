import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import type * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { availableModels } from '../config/models';

const url = (name: string): string => `${import.meta.env.BASE_URL}models/${name}.glb`;
// Draco decoder is served locally (copied by `npm run models:build`); never the gstatic CDN.
useGLTF.setDecoderPath(`${import.meta.env.BASE_URL}models/draco/`);

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(): void {
    /* a bad glb must never break the scene: the procedural fallback stays */
  }
  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Glb({ name, render }: { name: string; render?: (scene: THREE.Object3D) => ReactNode }) {
  const gltf = useGLTF(url(name));
  const scene = useMemo(() => cloneSkinned(gltf.scene), [gltf.scene]);
  return <>{render ? render(scene) : <primitive object={scene} />}</>;
}

interface ModelProps {
  /** File name in public/models without the .glb extension. */
  name: string;
  /** Procedural stand-in rendered when the glb is not listed in src/config/models.ts (or fails to load). */
  fallback: ReactNode;
  /** Custom rendering of the (per-instance cloned) glb scene, e.g. to bind the portrait texture and animate named nodes. */
  render?: (scene: THREE.Object3D) => ReactNode;
}

/** Warm a glb (and the Draco decoder) before it is first rendered, e.g. the title-screen figure. */
export function preloadModel(name: string): void {
  if (availableModels.includes(name)) useGLTF.preload(url(name));
}

/** Swap procedural props for .glb files with no code changes: list the file in src/config/models.ts. */
export function Model({ name, fallback, render }: ModelProps) {
  if (!availableModels.includes(name)) return <>{fallback}</>;
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Glb name={name} render={render} />
      </Suspense>
    </ModelBoundary>
  );
}
