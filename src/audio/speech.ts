import { voices, type SpeakerId } from '../config/voices';
import { useSettings } from '../state/settings';
import { onUnlock } from './engine';
import { clipUrl, fragmentBases, getManifest, loadManifest, pickClip, wordCues, wordSpans, normalizeText } from './voices';

export type { SpeakerId } from '../config/voices';

export interface SayOptions {
  /** Who is talking; picks the neural voice clip. Defaults to the narrator. */
  speaker?: SpeakerId;
  /** Web Speech fallback overrides only; ignored when a pre-generated clip plays. */
  pitch?: number;
  rate?: number;
  /** Called with the word index and word as speech reaches it. */
  onWord?: (index: number, word: string) => void;
}

export interface Fragment {
  speaker?: SpeakerId;
  text: string;
}

export const isTestMode = (): boolean => typeof location !== 'undefined' && new URLSearchParams(location.search).has('test');

// ---- shared audio element -------------------------------------------------

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
let audio: HTMLAudioElement | null = null;
let current: { cancel: () => void } | null = null;
let generation = 0;

function getAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
  }
  return audio;
}

// iOS Safari: the shared element must be touched inside a user gesture once.
onUnlock(() => {
  const a = getAudio();
  if (!a || !a.paused) return;
  try {
    a.src = SILENT_WAV;
    void a.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
});

function playClip(a: HTMLAudioElement, id: string, text: string, timings: Parameters<typeof wordCues>[1], baseIndex: number, onWord?: SayOptions['onWord']): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const spans = wordSpans(normalizeText(text));
    const cues = wordCues(text, timings);
    let next = 0;
    let done = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      a.onended = a.onerror = null;
      current = null;
      resolve(ok);
    };
    const tick = () => {
      const ms = a.currentTime * 1000;
      while (next < cues.length && cues[next][0] <= ms + 20) {
        const idx = cues[next][1];
        onWord?.(baseIndex + idx, spans[idx]?.word ?? '');
        next++;
      }
    };
    current = {
      cancel: () => {
        a.pause();
        finish(true);
      },
    };
    a.onended = () => {
      tick();
      finish(true);
    };
    a.onerror = () => finish(false);
    try {
      a.src = clipUrl(id);
      a.volume = Math.max(0, Math.min(1, useSettings.getState().volume));
      a.muted = useSettings.getState().muted;
      timer = setInterval(tick, 30);
      void a.play().catch(() => finish(false));
    } catch {
      finish(false);
    }
  });
}

function speakWeb(text: string, pitch: number, rate: number, baseIndex: number, onWord?: SayOptions['onWord']): Promise<void> {
  const words = wordSpans(text);
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = pitch;
    u.rate = rate;
    u.onboundary = (e) => {
      const idx = words.findIndex((w) => w.start === e.charIndex);
      if (idx >= 0) onWord?.(baseIndex + idx, words[idx].word);
    };
    u.onend = () => resolve();
    u.onerror = () => resolve();
    current = { cancel: () => resolve() };
    speechSynthesis.speak(u);
  });
}

function webAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

async function speakOne(frag: Fragment, baseIndex: number, onWord: SayOptions['onWord'], override: { pitch?: number; rate?: number }, gen: number): Promise<void> {
  const speaker = frag.speaker ?? 'narrator';
  const m = getManifest() ?? (await loadManifest());
  if (gen !== generation) return;
  const pick = pickClip(m, speaker, frag.text, override);
  if (pick.kind === 'clip') {
    const a = getAudio();
    if (a && (await playClip(a, pick.id, frag.text, pick.entry.timings, baseIndex, onWord))) return;
    if (gen !== generation) return;
  }
  const fb = pick.kind === 'fallback' ? pick : { pitch: override.pitch ?? voices[speaker].fallback.pitch, rate: override.rate ?? voices[speaker].fallback.rate };
  if (webAvailable()) await speakWeb(frag.text, fb.pitch, fb.rate, baseIndex, onWord);
}

/** Speaks fragments back to back with continuous word indexing. Never rejects. */
export async function sayFragments(fragments: Fragment[], opts: Omit<SayOptions, 'speaker'> = {}): Promise<void> {
  const bases = fragmentBases(fragments);
  if (isTestMode()) {
    fragments.forEach((f, i) => wordSpans(f.text).forEach((w, j) => opts.onWord?.(bases[i] + j, w.word)));
    return;
  }
  stopSpeaking();
  const gen = ++generation;
  const override = { pitch: opts.pitch, rate: opts.rate };
  for (let i = 0; i < fragments.length; i++) {
    if (gen !== generation) return;
    if (!fragments[i].text.trim()) continue;
    try {
      await speakOne(fragments[i], bases[i], opts.onWord, override, gen);
    } catch {
      /* keep going */
    }
  }
}

/** Speaks `text`; resolves when finished. Never rejects. Stubbed under ?test=1. */
export function say(text: string, opts: SayOptions = {}): Promise<void> {
  return sayFragments([{ speaker: opts.speaker, text }], opts);
}

export function stopSpeaking(): void {
  generation++;
  const c = current;
  current = null;
  c?.cancel();
  if (audio && !audio.paused) audio.pause();
  if (webAvailable()) speechSynthesis.cancel();
}

// Fetch the clip manifest once at startup (same-origin static file).
if (typeof window !== 'undefined' && !isTestMode()) void loadManifest();
