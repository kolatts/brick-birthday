import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { V3 } from './prims';

export interface FlyOptions {
  radius?: number;
  azimuth?: number;
  polar?: number;
  duration?: number;
}

export interface CameraRigHandle {
  /** Fly toward `target`; `onArrive` fires once when the camera lands. */
  flyTo: (target: V3, opts?: FlyOptions, onArrive?: () => void) => void;
}

interface CameraRigProps {
  apiRef?: Ref<CameraRigHandle>;
  /** Point the camera orbits. */
  target?: V3;
  radius?: number;
  azimuth?: number;
  polar?: number;
  /** Polar clamp (radians from straight up). */
  minPolar?: number;
  maxPolar?: number;
  enabled?: boolean;
}

const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Drag-to-rotate orbit camera for the hub: rotate only (no zoom/pan), clamped polar angle, inertia,
 * plus an animated flyTo() used when entering a building. Allocation-free in the frame loop.
 */
export function CameraRig({
  apiRef,
  target = [0, 1.6, 0],
  radius = 19,
  azimuth = Math.PI / 4,
  polar = 1.0,
  minPolar = 0.7,
  maxPolar = 1.3,
  enabled = true,
}: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  // keep the whole island in view on narrow screens
  const fit = Math.max(1, 1.62 / aspect);

  const st = useRef({
    az: azimuth, pol: polar, rad: radius,
    tx: target[0], ty: target[1], tz: target[2],
    vAz: 0, vPol: 0,
    dragging: false, pointer: -1, lastX: 0, lastY: 0, lastT: 0,
    flying: false, t0: 0, dur: 1,
    fAz: 0, fPol: 0, fRad: 0, fTx: 0, fTy: 0, fTz: 0,
    tAz: 0, tPol: 0, tRad: 0, tTx: 0, tTy: 0, tTz: 0,
    onArrive: null as (() => void) | null,
    baseRad: radius,
  });
  st.current.baseRad = radius * fit;

  const cfg = useRef({ enabled, minPolar, maxPolar });
  cfg.current = { enabled, minPolar, maxPolar };

  useEffect(() => {
    const s = st.current;
    if (!s.flying) s.rad = s.baseRad;
  }, [radius, fit]);

  useImperativeHandle(
    apiRef,
    () => ({
      flyTo: (t, opts = {}, onArrive) => {
        const s = st.current;
        s.fAz = s.az; s.fPol = s.pol; s.fRad = s.rad; s.fTx = s.tx; s.fTy = s.ty; s.fTz = s.tz;
        s.tTx = t[0]; s.tTy = t[1]; s.tTz = t[2];
        s.tRad = opts.radius ?? 9;
        s.tPol = opts.polar ?? 1.05;
        // take the shortest way round to the requested azimuth
        let az = opts.azimuth ?? s.az;
        while (az - s.az > Math.PI) az -= Math.PI * 2;
        while (az - s.az < -Math.PI) az += Math.PI * 2;
        s.tAz = az;
        s.dur = (opts.duration ?? (window.__skipAnim ? 0.25 : 0.9)) * 1000;
        s.t0 = performance.now();
        s.flying = true;
        s.vAz = 0; s.vPol = 0;
        s.onArrive = onArrive ?? null;
      },
    }),
    [],
  );

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'none';
    const s = st.current;
    const down = (e: PointerEvent) => {
      if (!cfg.current.enabled || s.flying || s.pointer !== -1) return;
      s.pointer = e.pointerId;
      s.dragging = true;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.lastT = performance.now();
      s.vAz = 0; s.vPol = 0;
    };
    const move = (e: PointerEvent) => {
      if (!s.dragging || e.pointerId !== s.pointer) return;
      const now = performance.now();
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      const dts = Math.max(0.004, (now - s.lastT) / 1000);
      s.az -= dx * 0.006;
      s.pol = Math.min(cfg.current.maxPolar, Math.max(cfg.current.minPolar, s.pol - dy * 0.004));
      s.vAz = (-dx * 0.006) / dts;
      s.vPol = (-dy * 0.004) / dts;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.lastT = now;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== s.pointer) return;
      s.dragging = false;
      s.pointer = -1;
      // a held-still finger should not fling
      if (performance.now() - s.lastT > 80) { s.vAz = 0; s.vPol = 0; }
      s.vAz = Math.max(-4, Math.min(4, s.vAz));
      s.vPol = Math.max(-1.5, Math.min(1.5, s.vPol));
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const s = st.current;
    const d = Math.min(dt, 0.05);
    if (s.flying) {
      const k = Math.min(1, (performance.now() - s.t0) / s.dur);
      const e = ease(k);
      s.az = s.fAz + (s.tAz - s.fAz) * e;
      s.pol = s.fPol + (s.tPol - s.fPol) * e;
      s.rad = s.fRad + (s.tRad - s.fRad) * e;
      s.tx = s.fTx + (s.tTx - s.fTx) * e;
      s.ty = s.fTy + (s.tTy - s.fTy) * e;
      s.tz = s.fTz + (s.tTz - s.fTz) * e;
      if (k >= 1) {
        s.flying = false;
        const cb = s.onArrive;
        s.onArrive = null;
        cb?.();
      }
    } else if (!s.dragging) {
      if (s.vAz !== 0 || s.vPol !== 0) {
        s.az += s.vAz * d;
        s.pol = Math.min(cfg.current.maxPolar, Math.max(cfg.current.minPolar, s.pol + s.vPol * d));
        const damp = Math.exp(-4 * d);
        s.vAz *= damp;
        s.vPol *= damp;
        if (Math.abs(s.vAz) < 0.01) s.vAz = 0;
        if (Math.abs(s.vPol) < 0.01) s.vPol = 0;
      }
    }
    const sp = Math.sin(s.pol);
    camera.position.set(s.tx + s.rad * sp * Math.sin(s.az), s.ty + s.rad * Math.cos(s.pol), s.tz + s.rad * sp * Math.cos(s.az));
    camera.lookAt(s.tx, s.ty, s.tz);
  });

  return null;
}
