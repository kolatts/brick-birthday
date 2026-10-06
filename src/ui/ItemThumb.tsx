import { Icon } from './Icons';

/** Wardrobe item thumbnail: the same sticker art style as the rest of the game's icons. */
export function ItemThumb({ id, size = 56 }: { id: string; size?: number | string }) {
  return <Icon id={`closet-${id}`} size={size} />;
}
