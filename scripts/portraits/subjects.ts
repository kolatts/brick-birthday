import type { PersonId } from '../../src/types';

export interface Subject {
  id: PersonId;
  isPet: boolean;
  /** Reference photos, primary first (paths relative to repo root). */
  photos: string[];
  /** Which subject to draw (esp. for group photos). */
  reference: string;
  notes: string;
}

const GROUP = 'photos/IMG_6540.jpg';
const ignore = 'Draw ONLY this one subject and ignore everyone else in the photo.';

export const SUBJECTS: Subject[] = [
  {
    id: 'luna',
    isPet: false,
    photos: ['photos/IMG_4183.jpg', 'photos/IMG_6085.jpg'],
    reference: 'Reference: the first image is the primary photo (wearing a tiara); the second is another angle of the same girl.',
    notes: 'medium-brown skin (noticeably darker than a light tan; South Asian and mixed heritage), dark brown eyes, dark brown wavy hair pulled back; include a sparkly silver tiara.',
  },
  {
    id: 'mom',
    isPet: false,
    photos: [GROUP],
    reference: `Reference: a group selfie. Draw the woman in the center with long dark brown hair and sunglasses on her head. ${ignore}`,
    notes: 'fair skin, long straight dark brown hair, warm smile, sunglasses on head.',
  },
  {
    id: 'dad',
    isPet: false,
    photos: [GROUP],
    reference: `Reference: a group selfie. Draw the man on the left: bald, short dark beard with some gray, dark brown skin, a rich deep espresso-brown complexion like dark South Indian skin, much darker than everyone else in the photo (do NOT make it tan or caramel), big smile. ${ignore}`,
    notes: 'bald, short dark beard with some gray, dark brown skin, a rich deep espresso-brown complexion (South Indian), much darker than the rest of the family; never tan or caramel, big smile.',
  },
  {
    id: 'julian',
    isPet: false,
    photos: ['photos/Julian.jpg', GROUP],
    reference: `Reference: the first image is the primary photo of Julian. The second is a group selfie; in it he is the taller teen in the back middle with light-brown wavy hair. ${ignore}`,
    notes: 'fair skin, light brown wavy hair, small earring, sunglasses on head.',
  },
  {
    id: 'darian',
    isPet: false,
    photos: ['photos/Darian.jpg', GROUP],
    reference: `Reference: the first image shows Darian, the teen boy in the white shirt. The second is a group selfie; in it he is the teen on the right with dark fluffy curly hair. ${ignore}`,
    notes: 'fair skin, dark fluffy curly hair, friendly grin.',
  },
  {
    id: 'rudolph',
    isPet: true,
    photos: ['photos/rudolph.jpg', 'photos/rudolph and jingle bells.jpg'],
    reference: 'Reference: the dog Rudolph. In the second photo, draw only the dog and ignore the cat.',
    notes: 'gray-and-tan thick coat, pointy black-tipped ears, curled tail, Norwegian-Elkhound look.',
  },
  {
    id: 'jinglebells',
    isPet: true,
    photos: ['photos/rudolph and jingle bells.jpg'],
    reference: 'Reference: draw only the fluffy dark tortoiseshell cat and ignore the dog.',
    notes: 'long dark mottled fur, green-gold eyes.',
  },
];
