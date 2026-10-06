import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';

/** Widens the field of view on short (phone) viewports so a scene authored for iPad framing still fits. */
export function FitFov({ base, boost = 1.28 }: { base: number; boost?: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const height = useThree((s) => s.size.height);
  useLayoutEffect(() => {
    camera.fov = height < 500 ? Math.min(75, base * boost) : base;
    camera.updateProjectionMatrix();
  }, [camera, height, base, boost]);
  return null;
}
