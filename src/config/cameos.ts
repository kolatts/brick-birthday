/**
 * Gentle cameos from Luna's own storybook series (Luna's Story Time, "The Castle Everstair Stories").
 * These are the family's original characters, so they are safe to use. Character sheets are copied
 * verbatim from the books so the characters stay on-model in art prompts and 3D builds.
 */
export interface Cameo {
  id: 'moon' | 'babylady' | 'cottontail';
  name: string;
  /** Verbatim visual sheet from the storybooks. */
  sheet: string;
  /** Short kid-facing blurb for the Story Tower hero tile. */
  blurb: string;
  /** Pronouns for story templates. */
  pronouns: { they: string; them: string; their: string };
  /** Azure voice casting used by the storybooks (scripts/voice-cast.json there). */
  voice: { azure: string; pitch: string; rate: string; fallbackPitch: number; fallbackRate: number };
  /** Brick-figure build hints for 3D. */
  brick: { hairColor: string; bodyColor: string; accent: string; features: string[] };
}

export const cameos: Cameo[] = [
  {
    id: 'moon',
    name: 'Princess Moon',
    sheet:
      'Princess Moon: young girl, long wavy pink hair, large dark-blue eyes, rosy cheeks; delicate translucent golden fairy wings with fine filigree veining; silver iridescent mermaid tail with pearl-sheen scales; small gold crown topped with a crescent moon; pearl necklace with a gold crescent pendant.',
    blurb: 'Half fairy, half mermaid, with gold wings and a silver tail.',
    pronouns: { they: 'she', them: 'her', their: 'her' },
    voice: { azure: 'en-US-SaraNeural', pitch: '+22%', rate: '+2%', fallbackPitch: 1.4, fallbackRate: 1.0 },
    brick: { hairColor: '#FF8AC8', bodyColor: '#C9D8E8', accent: '#FFD60A', features: ['gold wings', 'silver tail', 'crescent crown'] },
  },
  {
    id: 'babylady',
    name: 'Baby Lady',
    sheet:
      'Baby Lady: small fluffy cocker-spaniel puppy, golden-cream curly ears, dark round eyes; iridescent pearl-white fairy wings, smaller and softer than Moon\'s; pale silver-pink mermaid tail in place of back legs — she has no back legs and no back paws, her puppy body ends in the mermaid tail, front paws only; tiny gold crescent charm on a pearl collar.',
    blurb: 'A small fluffy puppy with pearl wings and a mermaid tail.',
    pronouns: { they: 'she', them: 'her', their: 'her' },
    voice: { azure: 'en-US-AvaNeural', pitch: '+28%', rate: '+12%', fallbackPitch: 1.6, fallbackRate: 1.1 },
    brick: { hairColor: '#F3D9A4', bodyColor: '#F3D9A4', accent: '#F7E7F0', features: ['pearl wings', 'silver-pink tail', 'crescent charm'] },
  },
  {
    id: 'cottontail',
    name: 'Baby Jag Cottontail',
    sheet:
      'Baby Jag Cottontail: young jaguar cub, soft yellow-gold coat with black rosette spots, a tuft of bright pink wavy hair, warm amber eyes, sturdy ordinary paws with small curved claws; no wings and no mermaid tail; a woven seashell bracelet on one front leg.',
    blurb: 'A yellow jaguar cub with black spots and pink hair.',
    pronouns: { they: 'she', them: 'her', their: 'her' },
    voice: { azure: 'en-US-JaneNeural', pitch: '+12%', rate: '+4%', fallbackPitch: 1.3, fallbackRate: 1.0 },
    brick: { hairColor: '#FF5CA8', bodyColor: '#FFD60A', accent: '#1D2A44', features: ['black rosette spots', 'pink hair tuft', 'seashell bracelet'] },
  },
];

export const STORYBOOK_URL = 'https://kolatts.github.io/luna-story-time/';
