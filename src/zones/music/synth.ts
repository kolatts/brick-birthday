import type * as ToneNS from 'tone';
import { audioState } from '../../audio/engine';
import { isTestMode } from '../../audio/speech';
import { BPM, STEP_S, padsFor, quantize, type InstrumentId } from './songs';

type Tone = typeof ToneNS;

interface Rig {
  tone: Tone;
  origin: number;
  kick: ToneNS.MembraneSynth;
  snare: ToneNS.NoiseSynth;
  hat: ToneNS.MetalSynth;
  crash: ToneNS.MetalSynth;
  keys: ToneNS.PolySynth;
  strings: ToneNS.PluckSynth[];
  xylo: ToneNS.PolySynth;
  bass: ToneNS.Synth;
  bed: ToneNS.PolySynth;
  bedKick: ToneNS.MembraneSynth;
  bedHat: ToneNS.NoiseSynth;
  loop: ToneNS.Loop | null;
  nodes: { dispose: () => void }[];
}

let rig: Rig | null = null;
let initing: Promise<void> | null = null;

const canPlay = (): boolean => !isTestMode() && audioState.unlocked;

/** Builds all four instruments (once). Silent no-op under ?test=1 or before the first tap. */
export function initSynth(): Promise<void> {
  if (rig || !canPlay()) return Promise.resolve();
  if (initing) return initing;
  initing = (async () => {
    try {
      const tone = await import('tone');
      if (tone.getContext().state !== 'running') return;
      const comp = new tone.Compressor(-14, 4).toDestination();
      const nodes: { dispose: () => void }[] = [comp];
      const mk = <T extends { dispose: () => void }>(n: T): T => { nodes.push(n); return n; };
      const kick = mk(new tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 } }).connect(comp));
      kick.volume.value = -4;
      const snare = mk(new tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.05 } }));
      snare.connect(mk(new tone.Filter(1800, 'highpass').connect(comp)));
      snare.volume.value = -8;
      const hat = mk(new tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.07, release: 0.02 }, harmonicity: 5.1, modulationIndex: 32, resonance: 5000, octaves: 1.5 }).connect(comp));
      hat.frequency.value = 300;
      hat.volume.value = -22;
      const crash = mk(new tone.MetalSynth({ envelope: { attack: 0.001, decay: 1.1, release: 0.4 }, harmonicity: 5.1, modulationIndex: 40, resonance: 3500, octaves: 1.5 }).connect(comp));
      crash.frequency.value = 220;
      crash.volume.value = -20;
      const keys = mk(new tone.PolySynth(tone.Synth, { oscillator: { type: 'triangle8' }, envelope: { attack: 0.01, decay: 0.25, sustain: 0.35, release: 0.5 } }).connect(comp));
      keys.volume.value = -8;
      const strings = Array.from({ length: 6 }, () => mk(new tone.PluckSynth({ attackNoise: 1.2, dampening: 3800, resonance: 0.96 }).connect(comp)));
      strings.forEach((s) => { s.volume.value = 2; });
      const xylo = mk(new tone.PolySynth(tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.28, sustain: 0, release: 0.3 } }).connect(comp));
      xylo.volume.value = -6;
      const bass = mk(new tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.2 } }).connect(comp));
      bass.volume.value = -20;
      const bed = mk(new tone.PolySynth(tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.03, decay: 0.3, sustain: 0.2, release: 0.5 } }).connect(comp));
      bed.volume.value = -26;
      const bedKick = mk(new tone.MembraneSynth({ pitchDecay: 0.04, octaves: 4, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 } }).connect(comp));
      bedKick.volume.value = -22;
      const bedHat = mk(new tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 } }));
      bedHat.connect(mk(new tone.Filter(7000, 'highpass').connect(comp)));
      bedHat.volume.value = -30;
      tone.getTransport().bpm.value = BPM;
      rig = { tone, origin: tone.now(), kick, snare, hat, crash, keys, strings, xylo, bass, bed, bedKick, bedHat, loop: null, nodes };
    } catch {
      /* stay silent */
    } finally {
      initing = null;
    }
  })();
  return initing;
}

/** Plays one pad (quantized to the 16th grid). `base` is the song window's first scale index. */
export function playPad(inst: InstrumentId, pad: number, base = 0): void {
  if (!rig) {
    void initSynth();
    return;
  }
  const { tone } = rig;
  const t = quantize(tone.now(), rig.origin);
  const def = padsFor(inst, base)[pad];
  if (!def) return;
  try {
    switch (inst) {
      case 'drums':
        if (pad === 0) rig.kick.triggerAttackRelease('C1', '8n', t);
        else if (pad === 1) rig.snare.triggerAttackRelease('16n', t);
        else if (pad === 2) rig.hat.triggerAttackRelease(300, '32n', t, 0.8);
        else rig.crash.triggerAttackRelease(220, '2n', t, 0.9);
        break;
      case 'keyboard':
        rig.keys.triggerAttackRelease(def.note!, '8n', t);
        break;
      case 'guitar':
        rig.strings[pad]?.triggerAttack(def.note!, t);
        break;
      case 'xylophone':
        rig.xylo.triggerAttackRelease(def.note!, '16n', t);
        break;
    }
  } catch {
    /* a missed note is better than a crash */
  }
}

const CHORDS: string[][] = [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['A4', 'C5', 'E5']];
const BASS = ['C2', 'F2', 'G2', 'A2'];

/** Gentle C-major backing loop (kick, hat, soft chords) that keeps time in Jam mode. */
export function startBacking(): void {
  if (!rig || rig.loop) return;
  const r = rig;
  const { tone } = r;
  const tr = tone.getTransport();
  let step = 0;
  r.loop = new tone.Loop((time) => {
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    if (s === 0 || s === 8) r.bedKick.triggerAttackRelease('C1', '16n', time);
    if (s % 4 === 2) r.bedHat.triggerAttackRelease(0.04, time);
    if (s === 0) { r.bed.triggerAttackRelease(CHORDS[bar], '2n', time); r.bass.triggerAttackRelease(BASS[bar], '4n', time); }
    if (s === 8) r.bed.triggerAttackRelease(CHORDS[bar], '4n', time);
    step++;
  }, '16n');
  tr.bpm.value = BPM;
  r.loop.start(0);
  if (tr.state !== 'started') tr.start(r.origin + Math.ceil((tone.now() + 0.05 - r.origin) / STEP_S) * STEP_S);
}

export function stopBacking(): void {
  if (!rig?.loop) return;
  rig.loop.stop();
  rig.loop.dispose();
  rig.loop = null;
  rig.tone.getTransport().stop();
}

/** Frees every synth and stops the transport. Called when leaving the zone. */
export function disposeSynth(): void {
  stopBacking();
  const r = rig;
  rig = null;
  initing = null;
  if (!r) return;
  setTimeout(() => {
    for (const n of r.nodes) {
      try {
        n.dispose();
      } catch {
        /* ignore */
      }
    }
  }, 1500);
}
