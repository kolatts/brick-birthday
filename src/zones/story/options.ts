import { faceUrl } from '../../state/faces';
import { family } from '../../config/family';
import { cameos } from '../../config/cameos';

export type HeroKind = 'family' | 'pet' | 'cameo';

export interface Hero {
  id: string;
  name: string;
  kind: HeroKind;
  they: string;
  them: string;
  their: string;
  /** Cartoon portrait (family and pets); otherwise `icon` is used. */
  image?: string;
  /** Sticker icon id (public/art/icons), resolved by the renderer. */
  icon?: string;
  label: string;
  /** Short kid-facing blurb (cameos only). */
  blurb?: string;
}

export interface Tile {
  id: string;
  /** Sticker icon id (public/art/icons), resolved by the renderer. */
  icon?: string;
  /** Cartoon portrait URL (heroes); takes priority over `icon`. */
  image?: string;
  label: string;
  /** Text dropped into story templates. */
  text: string;
  /** Prepositional form for places, e.g. "on the Piano Cloud". */
  at?: string;
}

const SHE = { they: 'she', them: 'her', their: 'her' };
const HE = { they: 'he', them: 'him', their: 'his' };
const THEY = { they: 'they', them: 'them', their: 'their' };

const cameo = (id: 'moon' | 'babylady' | 'cottontail') => cameos.find((c) => c.id === id)!;

export const heroes: Hero[] = [
  { id: 'luna', name: family.luna.displayName, kind: 'family', ...SHE, image: faceUrl('luna', 'happy'), label: 'Luna' },
  { id: 'mom', name: family.mom.displayName, kind: 'family', ...SHE, image: faceUrl('mom', 'happy'), label: 'Mom' },
  { id: 'dad', name: family.dad.displayName, kind: 'family', ...HE, image: faceUrl('dad', 'happy'), label: 'Daddy' },
  { id: 'julian', name: family.julian.displayName, kind: 'family', ...HE, image: faceUrl('julian', 'happy'), label: 'Julian' },
  { id: 'darian', name: family.darian.displayName, kind: 'family', ...HE, image: faceUrl('darian', 'happy'), label: 'Darian' },
  { id: 'rudolph', name: family.rudolph.displayName, kind: 'pet', ...THEY, image: faceUrl('rudolph', 'happy'), label: 'Rudolph' },
  { id: 'jinglebells', name: family.jinglebells.displayName, kind: 'pet', ...THEY, image: faceUrl('jinglebells', 'happy'), label: 'Jingle Bells' },
  { id: 'princessmoon', name: cameo('moon').name, kind: 'cameo', ...cameo('moon').pronouns, icon: 'princess-moon', label: 'Princess Moon', blurb: cameo('moon').blurb },
  { id: 'babylady', name: cameo('babylady').name, kind: 'cameo', ...cameo('babylady').pronouns, icon: 'baby-lady', label: 'Baby Lady', blurb: cameo('babylady').blurb },
  { id: 'babyjag', name: cameo('cottontail').name, kind: 'cameo', ...cameo('cottontail').pronouns, icon: 'baby-jag', label: 'Baby Jag', blurb: cameo('cottontail').blurb },
];

export const places: Tile[] = [
  { id: 'teagarden', icon: 'teapot', label: 'Brick Tea Garden', text: 'the Brick Tea Garden', at: 'at the Brick Tea Garden' },
  { id: 'island', icon: 'island', label: 'Floating Island', text: 'the Floating Island', at: 'on the Floating Island' },
  { id: 'pianocloud', icon: 'piano-cloud', label: 'Piano Cloud', text: 'the Piano Cloud', at: 'on the Piano Cloud' },
  { id: 'teacupboat', icon: 'teacup-boat', label: 'Giant Teacup Boat', text: 'the Giant Teacup Boat', at: 'aboard the Giant Teacup Boat' },
  { id: 'woods', icon: 'pine-tree', label: 'Whispering Woods', text: 'the Whispering Woods', at: 'in the Whispering Woods' },
  { id: 'tennismoon', icon: 'tennis-moon', label: 'Tennis Moon', text: 'the Tennis Moon', at: 'on the Tennis Moon' },
  { id: 'blanketfort', icon: 'blanket-fort', label: 'Cozy Blanket Fort', text: 'the Cozy Blanket Fort', at: 'in the Cozy Blanket Fort' },
  { id: 'chailake', icon: 'chai-latte', label: 'Chai Latte Lake', text: 'Chai Latte Lake', at: 'beside Chai Latte Lake' },
  { id: 'chickencastle', icon: 'chicken-castle', label: 'Orange Chicken Castle', text: 'the Orange Chicken Castle', at: 'at the Orange Chicken Castle' },
];

export const problems: Tile[] = [
  { id: 'sock', icon: 'sock', label: 'A lost sock', text: 'a lost sock that wanted to find its twin' },
  { id: 'dragon', icon: 'dragon', label: 'Snoring dragon', text: 'a sleepy dragon who snored way too loudly' },
  { id: 'broccoli', icon: 'broccoli', label: 'Broccoli rain', text: 'a rain of tiny broccoli trees' },
  { id: 'teapot', icon: 'glitter-teapot', label: 'Glitter teapot', text: 'a teapot that only poured glitter' },
  { id: 'rainbow', icon: 'rainbow', label: 'Hiccupy rainbow', text: 'a very hiccupy rainbow' },
  { id: 'piano', icon: 'piano', label: 'One-song piano', text: 'a piano that could only play Jingle Bells' },
  { id: 'tennisball', icon: 'tennis-ball', label: 'Giggly ball', text: 'a tennis ball that would not stop giggling' },
  { id: 'cloud', icon: 'cloud', label: 'Sinky cloud', text: 'a cloud that forgot how to float' },
  { id: 'snowman', icon: 'snowman', label: 'Carrot-less snowman', text: 'a snowman who had lost his carrot nose' },
  { id: 'drum', icon: 'drum', label: 'Boingy drum', text: 'a drum that kept going boom-boom-boing' },
];

export const powers: Tile[] = [
  { id: 'giggle', icon: 'giggle', label: 'Giggle beam', text: 'a giggle beam' },
  { id: 'timefreeze', icon: 'time-freeze', label: 'Tea-time freeze', text: 'a tea-time time-freeze' },
  { id: 'bubble', icon: 'bubble', label: 'Bubble shield', text: 'a bubble shield' },
  { id: 'sprout', icon: 'sprout', label: 'Sprout wand', text: 'a sprout-anything wand' },
  { id: 'whistle', icon: 'whistle', label: 'Rainbow whistle', text: 'a rainbow whistle' },
  { id: 'hop', icon: 'hop', label: 'Super hop', text: 'a super-bouncy hop' },
  { id: 'cape', icon: 'cape', label: 'Blanket cape', text: 'a cozy-blanket cape' },
  { id: 'animals', icon: 'paw', label: 'Animal charm', text: 'a talk-to-animals charm' },
  { id: 'sneeze', icon: 'sneeze', label: 'Sparkle sneeze', text: 'a sparkle sneeze' },
];

export const heroTile = (h: Hero): Tile => ({ id: h.id, icon: h.icon, image: h.image, label: h.label, text: h.name });

export interface Picks {
  hero: string;
  place: string;
  problem: string;
  power: string;
}

export const bonusSentences: string[] = [
  'Then a tiny wand sneeze made every cup of chai do a happy dance, and everyone said, "Bless you, teacups!"',
  'And just for fun, a parade of orange chickens marched by, wearing very tiny party hats.',
  'A friendly broccoli waved hello, and for once, nobody ran away from it. Well, almost nobody!',
  'Suddenly, a yorkie-shaped cloud floated past and winked, and it sneezed a little glitter.',
  'A surprise drum solo from a polite squirrel made everybody giggle until their tummies hurt.',
  'Jingle Bells jingled, Rudolph woofed, and the whole sky sang, "Ho ho HOORAY!"',
];
