import { Component, Suspense, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { availableModels } from '../config/models';

const url = (name: string): string => `${import.meta.env.BASE_URL}models/${name}.glb`;

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

function Glb({ name }: { name: string }) {
  const gltf = useGLTF(url(name));
  return <primitive object={gltf.scene.clone()} />;
}

interface ModelProps {
  /** File name in public/models without the .glb extension. */
  name: string;
  /** Procedural stand-in rendered when the glb is not listed in src/config/models.ts (or fails to load). */
  fallback: ReactNode;
}

/** Swap procedural props for .glb files with no code changes: list the file in src/config/models.ts. */
export function Model({ name, fallback }: ModelProps) {
  if (!availableModels.includes(name)) return <>{fallback}</>;
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Glb name={name} />
      </Suspense>
    </ModelBoundary>
  );
}
