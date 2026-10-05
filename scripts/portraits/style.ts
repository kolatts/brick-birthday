import type { Expression } from '../../src/types';

/** One shared style prompt so the whole family looks consistent. */
export const STYLE_PROMPT = [
  'Create a bright, friendly, ORIGINAL cartoon portrait illustration.',
  'Style: clean dark outlines, soft simple cel shading, warm colors, consistent look across a whole family set.',
  "Clearly preserve the subject's real features from the reference photo(s): face shape, exact skin tone (never lighten darker skin; match the photo's depth of color), hair color and style, eye color, glasses, facial hair.",
  'Composition: head and shoulders, centered, with everything important inside the central 80% of the square (it will be masked into a circle).',
  'Background: fully transparent.',
  'Do NOT include any text, border, frame, drawn circle, or brick/toy props.',
  'Do not imitate any studio, franchise, or existing character style.',
].join(' ');

export const EXPRESSION_PROMPTS: Record<Expression, string> = {
  happy: 'Expression: a big warm smile, happy eyes.',
  surprised: 'Expression: surprised, wide eyes, round open mouth, eyebrows raised high.',
  silly: 'Expression: silly, tongue sticking out, one eye winking, goofy grin.',
};

export const PET_GUIDANCE =
  'This is a pet: draw the animal (not a person) in the same cartoon style, keeping its real fur pattern, colors, and ear shape. Make the expression read clearly through eyes, mouth, and ears.';

export function buildPrompt(opts: { expression: Expression; isPet: boolean; notes: string; reference: string }): string {
  return [STYLE_PROMPT, opts.isPet ? PET_GUIDANCE : '', opts.reference, `Features: ${opts.notes}`, EXPRESSION_PROMPTS[opts.expression]]
    .filter(Boolean)
    .join('\n');
}
