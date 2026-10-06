export interface Line { speaker: string; text: string }

export const CHEERS = ['Woo! Great shot!', 'Nice one, Luna!', 'Boing! Right back at you!', 'You are a tennis star!'];
export const TRY_AGAIN = 'Nice try! Again!';
export const SUPER_AGAIN = 'Again!';
export const DARIAN_OOPS = 'Oops! Bonked my own head!';
export const DARIAN_OOPS_2 = 'Whoa! Where did the ball go?';
export const BRICK_LINE = 'You earned a Birthday Brick!';
export const REPLAY_WIN_LINE = 'What a rally! Great job, Luna!';
export const CHALLENGE_INTRO = 'Coupon challenge: win the Shopping coupon!';
export const CHALLENGE_GO = 'Fifteen in a row! Ready?';
export const CHALLENGE_DONE = 'Super Rally! You did it, Luna!';
export const BURIED_LINE = 'Something is buried near the Tennis Court…';
export const WELCOME = 'Tap anywhere to swing!';
export const MILESTONES: Record<number, string> = { 3: 'Three in a row!', 5: 'Five! Keep going!' };

/** Every static line the Tennis Court speaks aloud (auto-discovered by voices:extract). */
export const lines: Line[] = [
  ...CHEERS.map((text) => ({ speaker: 'darian', text })),
  { speaker: 'darian', text: TRY_AGAIN },
  { speaker: 'darian', text: SUPER_AGAIN },
  { speaker: 'darian', text: DARIAN_OOPS },
  { speaker: 'darian', text: DARIAN_OOPS_2 },
  { speaker: 'darian', text: REPLAY_WIN_LINE },
  { speaker: 'darian', text: CHALLENGE_GO },
  { speaker: 'darian', text: CHALLENGE_DONE },
  ...Object.values(MILESTONES).map((text) => ({ speaker: 'darian', text })),
  { speaker: 'narrator', text: BRICK_LINE },
  { speaker: 'narrator', text: BURIED_LINE },
  { speaker: 'luna', text: 'Again!' },
];
