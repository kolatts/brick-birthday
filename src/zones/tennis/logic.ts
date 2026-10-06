/** Pure rally simulation for the Tennis Court: no React, no audio, fully deterministic (unit-tested). */
export type V3 = [number, number, number];
export type Mode = 'zone' | 'challenge';
export type Phase = 'idle' | 'wait' | 'incoming' | 'returning' | 'miss' | 'darianMiss' | 'won';
export type MissKind = 'pot' | 'rudolph';

export const GOALS: Record<Mode, number> = { zone: 7, challenge: 15 };
/** Seconds either side of the ball arrival in which a tap is a hit. */
export const WINDOW = 0.5;
/** A tap this much earlier than the window is a (silly) early-swing miss; even earlier is a harmless practice swing. */
export const EARLY_MISS = 0.9;
export const BASE_FLIGHT: Record<Mode, number> = { zone: 2.2, challenge: 1.9 };
export const MIN_FLIGHT: Record<Mode, number> = { zone: 1.5, challenge: 1.25 };
export const SPEEDUP = 0.07;
export const SWING_COOLDOWN = 0.25;
export const WAIT_FIRST = 1.4;
export const WAIT_NEXT = 1.0;
export const MISS_DURATION = 2.3;
export const DARIAN_MISS_DURATION = 1.6;

/** Height of the ball centre when it rests on the court. */
export const GROUND = 0.5;
export const DARIAN_HIT: V3 = [0.3, 1.5, -6.6];
export const DARIAN_HEAD: V3 = [0.3, 2.7, -7.6];
export const POT_POS: V3 = [2.6, 0.5, 9.2];
export const RUDOLPH_HOME: V3 = [4.8, 0, 6.8];

/** Seconds a ball takes to cross the court after `rally` successful hits: gets quicker, never past the cap. */
export function flightTime(mode: Mode, rally: number): number {
  return Math.max(MIN_FLIGHT[mode], BASE_FLIGHT[mode] - SPEEDUP * Math.max(0, rally));
}

export type TapJudgement = 'hit' | 'early' | 'swing';
/** `dt` = tap time minus arrival time (seconds). */
export function judgeTap(dt: number): TapJudgement {
  if (Math.abs(dt) <= WINDOW) return 'hit';
  if (dt < -WINDOW && dt >= -EARLY_MISS) return 'early';
  return 'swing';
}

/** Deterministic pseudo-random in [0,1) from an integer. */
export function rand01(n: number): number {
  let x = (Math.imul(n | 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

/** Darian sometimes fumbles his return (never right away, never in the Super Rally). */
export function sillyMiss(mode: Mode, rally: number, seed: number): boolean {
  if (mode !== 'zone' || rally < 2) return false;
  return rand01(seed * 31 + rally) < 0.22;
}

export interface Sim {
  mode: Mode;
  goal: number;
  phase: Phase;
  /** Seconds in the current phase. */
  t: number;
  /** Duration of the current flight (incoming / returning). */
  flight: number;
  rally: number;
  from: V3;
  to: V3;
  /** Where the ball was when a miss began. */
  missFrom: V3;
  missKind: MissKind;
  misses: number;
  swingCool: number;
  seed: number;
  won: boolean;
  /** Set by the host so the ball can leave a sparkle trail on the current flight. */
  trail: boolean;
  /** Seconds since the sim was created, for animations. */
  clock: number;
  lastSwing: number;
  /** Darian will fumble the ball coming at him on this return flight. */
  darianFumble: boolean;
  /** Whether the very first serve has happened (first wait is longer). */
  served: boolean;
}

export type SimEvent =
  | { type: 'serve' }
  | { type: 'swing' }
  | { type: 'hit'; rally: number }
  | { type: 'win' }
  | { type: 'miss'; kind: MissKind; early: boolean }
  | { type: 'missDone' }
  | { type: 'darianReturn' }
  | { type: 'darianMiss' };

export function createSim(mode: Mode, seed = 1): Sim {
  return {
    mode, goal: GOALS[mode], phase: 'idle', t: 0, flight: flightTime(mode, 0), rally: 0,
    from: [...DARIAN_HIT], to: [0, 1.2, 6.2], missFrom: [0, 0.3, 8], missKind: 'pot', misses: 0, swingCool: 0,
    seed, won: false, trail: false, clock: 0, lastSwing: -10, darianFumble: false, served: false,
  };
}

/** Leaves idle (or restarts after a win) and begins serving. */
export function startSim(sim: Sim): void {
  sim.phase = 'wait';
  sim.t = 0;
  sim.rally = 0;
  sim.won = false;
  sim.darianFumble = false;
  sim.trail = false;
}

function landing(sim: Sim): V3 {
  return [(rand01(sim.seed++) - 0.5) * 2.6, 1.15, 6.3];
}
function darianSpot(sim: Sim): V3 {
  return [DARIAN_HIT[0] + (rand01(sim.seed++) - 0.5) * 1.6, DARIAN_HIT[1], DARIAN_HIT[2]];
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Ball position along a parabolic arc; u beyond 1 keeps falling (a late ball). */
export function arc(from: V3, to: V3, u: number, peak: number): V3 {
  const y = lerp(from[1], to[1], u) + peak * 4 * u * (1 - u);
  return [lerp(from[0], to[0], u), Math.max(GROUND, y), lerp(from[2], to[2], u)];
}

function beginFlight(sim: Sim, phase: 'incoming' | 'returning', from: V3, to: V3): void {
  sim.phase = phase;
  sim.t = 0;
  sim.from = from;
  sim.to = to;
  sim.flight = flightTime(sim.mode, sim.rally);
}

/** Rudolph trots in, picks up the ball and trots off (only during a rudolph miss). */
export function rudolph(sim: Sim): { active: boolean; x: number; z: number; carrying: boolean; facing: number } {
  if (sim.phase !== 'miss' || sim.missKind !== 'rudolph') return { active: false, x: RUDOLPH_HOME[0], z: RUDOLPH_HOME[2], carrying: false, facing: -Math.PI / 2 };
  const restX = sim.missFrom[0] + 0.4 + 0.5;
  const restZ = sim.missFrom[2] + 1.6;
  const t = sim.t;
  if (t < 1.2) {
    const k = Math.max(0, (t - 0.1) / 1.1);
    return { active: true, x: lerp(RUDOLPH_HOME[0], restX, k), z: lerp(RUDOLPH_HOME[2], restZ, k), carrying: false, facing: -Math.PI / 2 };
  }
  const k = Math.min(1, (t - 1.2) / 1.1);
  return { active: true, x: lerp(restX, RUDOLPH_HOME[0], k), z: lerp(restZ, RUDOLPH_HOME[2], k), carrying: true, facing: Math.PI / 2 };
}

/** Current ball position. */
export function ballPos(sim: Sim): V3 {
  switch (sim.phase) {
    case 'idle':
    case 'wait':
      return [DARIAN_HIT[0] + 0.5, 1.35, DARIAN_HIT[2] + 0.3];
    case 'incoming':
      return arc(sim.from, sim.to, sim.t / sim.flight, 2.3);
    case 'returning':
    case 'won': {
      const u = sim.phase === 'won' ? 1 : Math.min(1, sim.t / sim.flight);
      return arc(sim.from, sim.to, u, 2.1);
    }
    case 'darianMiss': {
      const u = Math.min(1, sim.t / 0.9);
      const dest: V3 = [DARIAN_HEAD[0] + 1.6, GROUND, DARIAN_HEAD[2] + 1.8];
      if (u < 1) return arc(DARIAN_HEAD, dest, u, 1.3);
      return [dest[0], GROUND + Math.abs(Math.sin((sim.t - 0.9) * 9)) * Math.max(0, 0.25 - (sim.t - 0.9)), dest[2]];
    }
    case 'miss': {
      if (sim.missKind === 'pot') {
        const u = Math.min(1, sim.t / 0.55);
        if (u < 1) return arc(sim.missFrom, POT_POS, u, 0.5);
        const v = Math.min(1, (sim.t - 0.55) / 0.8);
        return arc(POT_POS, [POT_POS[0] - 2.2, GROUND, POT_POS[2] + 1.2], v, 1.2);
      }
      const rest: V3 = [sim.missFrom[0] + 0.4, GROUND, sim.missFrom[2] + 1.6];
      const r = rudolph(sim);
      if (r.carrying) return [r.x, 1.05, r.z];
      return arc(sim.missFrom, rest, Math.min(1, sim.t / 0.6), 0.9);
    }
  }
}

function startMiss(sim: Sim, early: boolean, events: SimEvent[]): void {
  sim.missFrom = ballPos(sim);
  sim.missKind = sim.misses % 2 === 0 ? 'pot' : 'rudolph';
  if (sim.missKind === 'rudolph') {
    // keep the ball inside the apron so the fetch looks right
    sim.missFrom = [Math.max(-2.5, Math.min(2.5, sim.missFrom[0])), sim.missFrom[1], Math.min(8.2, sim.missFrom[2])];
  }
  sim.misses++;
  sim.phase = 'miss';
  sim.t = 0;
  sim.rally = 0;
  sim.trail = false;
  events.push({ type: 'miss', kind: sim.missKind, early });
}

/** The player tapped. Returns the events it caused. */
export function tapSim(sim: Sim): SimEvent[] {
  const events: SimEvent[] = [];
  if (sim.phase === 'idle' || sim.phase === 'won') return events;
  if (sim.phase === 'incoming') {
    const verdict = judgeTap(sim.t - sim.flight);
    if (verdict === 'hit') {
      sim.swingCool = SWING_COOLDOWN;
      sim.lastSwing = sim.clock;
      sim.rally++;
      events.push({ type: 'swing' });
      events.push({ type: 'hit', rally: sim.rally });
      const here = ballPos(sim);
      if (sim.rally >= sim.goal) {
        sim.won = true;
        beginFlight(sim, 'returning', here, darianSpot(sim));
        events.push({ type: 'win' });
      } else {
        sim.darianFumble = sillyMiss(sim.mode, sim.rally, sim.seed);
        beginFlight(sim, 'returning', here, sim.darianFumble ? DARIAN_HEAD : darianSpot(sim));
      }
      return events;
    }
    if (verdict === 'early' && sim.swingCool <= 0) {
      sim.lastSwing = sim.clock;
      events.push({ type: 'swing' });
      startMiss(sim, true, events);
      return events;
    }
  }
  if (sim.swingCool <= 0) {
    sim.swingCool = SWING_COOLDOWN;
    sim.lastSwing = sim.clock;
    events.push({ type: 'swing' });
  }
  return events;
}

/** Advances the simulation by `dt` seconds. */
export function stepSim(sim: Sim, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  sim.clock += dt;
  if (sim.swingCool > 0) sim.swingCool = Math.max(0, sim.swingCool - dt);
  if (sim.phase === 'idle' || sim.phase === 'won') return events;
  sim.t += dt;
  switch (sim.phase) {
    case 'wait':
      if (sim.t >= (sim.served ? WAIT_NEXT : WAIT_FIRST)) {
        sim.served = true;
        beginFlight(sim, 'incoming', [...DARIAN_HIT], landing(sim));
        events.push({ type: 'serve' });
      }
      break;
    case 'incoming':
      if (sim.t > sim.flight + WINDOW) startMiss(sim, false, events);
      break;
    case 'returning':
      if (sim.t >= sim.flight) {
        if (sim.won) {
          sim.phase = 'won';
        } else if (sim.darianFumble) {
          sim.phase = 'darianMiss';
          sim.t = 0;
          events.push({ type: 'darianMiss' });
        } else {
          const at = ballPos(sim);
          beginFlight(sim, 'incoming', at, landing(sim));
          events.push({ type: 'darianReturn' });
        }
      }
      break;
    case 'darianMiss':
      if (sim.t >= DARIAN_MISS_DURATION) {
        sim.phase = 'wait';
        sim.t = 0;
        sim.darianFumble = false;
      }
      break;
    case 'miss':
      if (sim.t >= MISS_DURATION) {
        sim.phase = 'wait';
        sim.t = 0;
        events.push({ type: 'missDone' });
      }
      break;
  }
  return events;
}

/** Milliseconds until the ball reaches Luna (negative = not currently incoming). Test hook. */
export function msToArrival(sim: Sim): number {
  return sim.phase === 'incoming' ? (sim.flight - sim.t) * 1000 : -1;
}

/** Test helper: plays perfectly timed taps until the goal is reached. Returns all events. */
export function playPerfect(sim: Sim, maxSeconds = 600): SimEvent[] {
  const all: SimEvent[] = [];
  if (sim.phase === 'idle') startSim(sim);
  const dt = 1 / 60;
  for (let s = 0; s < maxSeconds && !sim.won; s += dt) {
    all.push(...stepSim(sim, dt));
    if (sim.phase === 'incoming' && sim.t >= sim.flight) all.push(...tapSim(sim));
  }
  return all;
}
