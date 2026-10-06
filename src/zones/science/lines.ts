import { FLOAT_ITEMS, MAX_FUEL, POTION_RESULT, TARGETS, hintText } from './logic';

export interface Line { speaker: 'julian' | 'narrator' | 'luna'; text: string }

const J = (text: string): Line => ({ speaker: 'julian', text });

export const WELCOME = 'Welcome to my lab, Luna! Pick an experiment. Do two for a Birthday Brick!';
export const MENU_AGAIN = 'Great science! Pick another experiment.';

// 1. potion
export const POTION_INTRO = 'This is red cabbage juice. Stir it with your wand, then add something!';
export const POTION_STIRRED = 'Nice stirring! Now add lemon or baking soda.';
export const POTION_PINK = `Ooh, pink! ${POTION_RESULT.lemon.why}`;
export const POTION_GREEN = `Ooh, green! ${POTION_RESULT.soda.why}`;
export const POTION_MORE = 'Try the other one too!';
export const POTION_BEAKER = 'Stir first, Luna. Hold the flask or tap it!';

// 2. float
export const FLOAT_INTRO = 'Pick something, then guess: will it sink or float?';
export const FLOAT_GUESS = ['Great guess! Let us see...', 'Ooh, good thinking! Here it goes...'];
export const FLOAT_PICK_FIRST = 'Pick an object first!';

// 3. rocket
export const ROCKET_INTRO = 'Tap to add fuel bricks to the rocket. Then LAUNCH!';
export const ROCKET_FIRST = 'Add at least one fuel brick first!';
export const ROCKET_LAUNCH: string[] = Array.from({ length: MAX_FUEL }, (_, i) => `${i + 1} fuel ${i === 0 ? 'brick' : 'bricks'}! Three, two, one, blast off!`);
export const ROCKET_WHY = 'More fuel means more push, so the rocket goes higher! The parachute slows it down on the way back.';

// 4. crystals
export const CRYSTAL_INTRO = 'We will speed up time! Tap to grow sugar crystals on the string.';
export const CRYSTAL_TAP = ['Sparkle! A new day of growing!', 'Look at those crystals grow!', 'Tap again, time is zooming!', 'So shiny!', 'Almost full!'];
export const CRYSTAL_WHY = 'As the water dries up, called evaporation, the sugar stays behind and builds crystals!';

// 5. seed
export const SEED_INTRO = 'Help the seed grow! Give it water, light, and soil. Any order!';
export const SEED_GOT: Record<'water' | 'light' | 'soil', string> = {
  water: 'Splash! The seed has water.',
  light: 'Bright! The seed has light.',
  soil: 'Cozy! The seed has soil.',
};
export const SEED_NEEDS_MORE = 'Good! What else does the seed need?';
export const SEED_WHY = 'Pop! It sprouted! Seeds need all three: water, light, and soil.';

// Mystery Potion challenge
export const CHALLENGE_TITLE = 'Coupon challenge: win the Video Game Day coupon!';
export const CHALLENGE_INTRO = 'Coupon challenge! Match my mystery potion three times and win the Video Game Day coupon!';
export const CHALLENGE_NEXT = ['Perfect match! One more potion!', 'You are a potion master! Last one!'];
export const CHALLENGE_WIN = 'The lab is glowing like an arcade! You did it, Luna! Something is buried near the Science Lab!';
export const CHALLENGE_GOO = [
  'Whoa! That potion has opinions!',
  'Bloop! Even I did not expect that one.',
  'Oh no, the goo is escaping! Hee hee!',
  'That is not a potion, that is a swamp party!',
];
export const CHALLENGE_PICK_SOMETHING = 'Pick some ingredients first!';
export const targetIntro = (name: string): string => `I need a ${name} potion! What goes in?`;

export const DONE_BANNER = 'Something is buried near the Science Lab...';

/** Every static line the Science Lab speaks aloud (auto-discovered by voices:extract). */
export const lines: Line[] = [
  J(WELCOME), J(MENU_AGAIN),
  J(POTION_INTRO), J(POTION_STIRRED), J(POTION_PINK), J(POTION_GREEN), J(POTION_MORE), J(POTION_BEAKER),
  J(FLOAT_INTRO), ...FLOAT_GUESS.map(J), J(FLOAT_PICK_FIRST),
  ...FLOAT_ITEMS.flatMap((i) => [J(i.why)]),
  J(ROCKET_INTRO), J(ROCKET_FIRST), ...ROCKET_LAUNCH.map(J), J(ROCKET_WHY),
  J(CRYSTAL_INTRO), ...CRYSTAL_TAP.map(J), J(CRYSTAL_WHY),
  J(SEED_INTRO), ...Object.values(SEED_GOT).map(J), J(SEED_NEEDS_MORE), J(SEED_WHY),
  J(CHALLENGE_INTRO), ...CHALLENGE_NEXT.map(J), J(CHALLENGE_WIN), ...CHALLENGE_GOO.map(J), J(CHALLENGE_PICK_SOMETHING),
  ...TARGETS.flatMap((t) => [J(targetIntro(t.name)), J(hintText(t))]),
];
