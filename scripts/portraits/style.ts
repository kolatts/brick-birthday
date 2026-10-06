import type { Expression } from '../../src/types';

/** One shared style prompt so the whole family looks consistent. */
export const STYLE_PROMPT = [
  'Create a bright, friendly, ORIGINAL cartoon portrait illustration.',
  'Style: clean dark outlines, soft simple cel shading, warm colors, consistent look across a whole family set.',
  "Clearly preserve the subject's real features from the reference photo(s): face shape, exact skin tone (never lighten darker skin; match the photo's depth of color), hair color and style, eye color, glasses, facial hair.",
  'Composition: FACE ONLY, filling the square. Show just the face from the top of the forehead to the chin and from ear to ear: skin, eyebrows, eyes, nose, mouth, cheeks, and for adults any facial hair. Do NOT draw hair on top of the head, do NOT draw ears sticking out, no neck, no shoulders, no clothing, no accessories (no tiara, no glasses). The face is applied onto a 3D toy figure that supplies its own hair, so the painted area must stop at the hairline with a soft edge.',
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
  "This is a pet: draw ONLY the animal's face (muzzle, nose, eyes, brows, mouth, cheek fur) filling the square, in the same cartoon style, keeping its real fur pattern and colors. Do NOT draw the ears or the body: the 3D toy figure supplies them. Make the expression read clearly through eyes and mouth.";

export function buildPrompt(opts: { expression: Expression; isPet: boolean; notes: string; reference: string }): string {
  return [STYLE_PROMPT, opts.isPet ? PET_GUIDANCE : '', opts.reference, `Features: ${opts.notes}`, EXPRESSION_PROMPTS[opts.expression]]
    .filter(Boolean)
    .join('\n');
}
