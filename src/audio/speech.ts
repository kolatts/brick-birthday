export interface SayOptions {
  pitch?: number;
  rate?: number;
  /** Called with the word index and word as speech reaches it. */
  onWord?: (index: number, word: string) => void;
}

export const isTestMode = (): boolean => typeof location !== 'undefined' && new URLSearchParams(location.search).has('test');

function wordStarts(text: string): { start: number; word: string }[] {
  const out: { start: number; word: string }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ start: m.index, word: m[0] });
  return out;
}

/** Speaks `text`; resolves when finished. Never rejects. Stubbed under ?test=1. */
export function say(text: string, opts: SayOptions = {}): Promise<void> {
  const words = wordStarts(text);
  if (isTestMode() || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
    words.forEach((w, i) => opts.onWord?.(i, w.word));
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = opts.pitch ?? 1;
    u.rate = opts.rate ?? 1;
    u.onboundary = (e) => {
      const idx = words.findIndex((w) => w.start === e.charIndex);
      if (idx >= 0) opts.onWord?.(idx, words[idx].word);
    };
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
