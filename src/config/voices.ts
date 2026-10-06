import { cameos } from './cameos';

/**
 * Voice cast. Azure AI Speech neural voices (generation time) plus a Web Speech
 * fallback {pitch, rate} (runtime, only when no pre-generated clip exists).
 * Never repoint an existing speaker at a different voice without regenerating
 * its clips (`npm run voices:generate -- --force`).
 */
export const SPEAKER_IDS = [
  'narrator', 'luna', 'mom', 'dad', 'julian', 'darian', 'rudolph', 'jinglebells',
  'fox', 'deer', 'songbird', 'squirrel', 'rabbit',
  'moon', 'babylady', 'cottontail',
] as const;
export type SpeakerId = (typeof SPEAKER_IDS)[number];

export interface VoiceDef {
  /** Azure neural voice name. */
  voice: string;
  /** SSML prosody pitch, e.g. "+12%". */
  pitch: string;
  /** SSML prosody rate, e.g. "-5%". */
  rate: string;
  /** speechSynthesis fallback. */
  fallback: { pitch: number; rate: number };
  note: string;
}

const cameoVoice = (id: 'moon' | 'babylady' | 'cottontail'): VoiceDef => {
  const c = cameos.find((x) => x.id === id)!;
  return { voice: c.voice.azure, pitch: c.voice.pitch, rate: c.voice.rate, fallback: { pitch: c.voice.fallbackPitch, rate: c.voice.fallbackRate }, note: `Storybook cameo: ${c.name}.` };
};

export const voices: Record<SpeakerId, VoiceDef> = {
  moon: cameoVoice('moon'),
  babylady: cameoVoice('babylady'),
  cottontail: cameoVoice('cottontail'),
  narrator: { voice: 'en-US-AnaNeural', pitch: '+0%', rate: '-4%', fallback: { pitch: 1.2, rate: 0.95 }, note: 'The storybook voice Luna knows.' },
  luna: { voice: 'en-US-AnaNeural', pitch: '+10%', rate: '+2%', fallback: { pitch: 1.5, rate: 1.0 }, note: 'Luna herself, a touch brighter.' },
  mom: { voice: 'en-US-JennyNeural', pitch: '+0%', rate: '-4%', fallback: { pitch: 1.2, rate: 0.95 }, note: 'Warm, kind, storytelling.' },
  dad: { voice: 'en-US-DavisNeural', pitch: '+9%', rate: '-3%', fallback: { pitch: 1.05, rate: 0.97 }, note: 'Deep, warm, easygoing.' },
  julian: { voice: 'en-US-AndrewNeural', pitch: '+4%', rate: '+4%', fallback: { pitch: 1.0, rate: 1.05 }, note: 'Older brother, quick and friendly.' },
  darian: { voice: 'en-US-BrandonNeural', pitch: '+2%', rate: '+0%', fallback: { pitch: 0.95, rate: 1.0 }, note: 'Older brother, relaxed.' },
  rudolph: { voice: 'en-US-AnaNeural', pitch: '+18%', rate: '+8%', fallback: { pitch: 1.7, rate: 1.1 }, note: 'Pet: bouncy and eager.' },
  jinglebells: { voice: 'en-US-AnaNeural', pitch: '+28%', rate: '+14%', fallback: { pitch: 1.9, rate: 1.2 }, note: 'Pet: tiny and playful.' },
  fox: { voice: 'en-US-AnaNeural', pitch: '+12%', rate: '+8%', fallback: { pitch: 1.6, rate: 1.1 }, note: 'Forest friend: quick and sly-sweet.' },
  deer: { voice: 'en-GB-MaisieNeural', pitch: '+0%', rate: '-6%', fallback: { pitch: 1.4, rate: 0.95 }, note: 'Forest friend: gentle.' },
  songbird: { voice: 'en-US-AnaNeural', pitch: '+34%', rate: '+16%', fallback: { pitch: 2, rate: 1.2 }, note: 'Forest friend: chirpy.' },
  squirrel: { voice: 'en-US-AnaNeural', pitch: '+26%', rate: '+22%', fallback: { pitch: 1.9, rate: 1.25 }, note: 'Forest friend: fast and excited.' },
  rabbit: { voice: 'en-GB-MaisieNeural', pitch: '+14%', rate: '+6%', fallback: { pitch: 1.7, rate: 1.1 }, note: 'Forest friend: hoppy.' },
};

export const isSpeakerId = (s: string): s is SpeakerId => (SPEAKER_IDS as readonly string[]).includes(s);
