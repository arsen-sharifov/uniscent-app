import {
  Bird,
  Bug,
  Carrot,
  Cat,
  Cherry,
  Citrus,
  Clover,
  Dog,
  Fish,
  Flower,
  Grape,
  Leaf,
  type LucideIcon,
  Panda,
  Rabbit,
  Rose,
  Snail,
  Sprout,
  Squirrel,
  TreePine,
  Turtle,
} from 'lucide-react';

import type { IAvatarIconOption, TAvatarIcon } from '@interfaces';

export const AVATAR_ICONS: readonly IAvatarIconOption[] = [
  { id: 'cat', icon: Cat, labelKey: 'avatarIconCat' },
  { id: 'dog', icon: Dog, labelKey: 'avatarIconDog' },
  { id: 'panda', icon: Panda, labelKey: 'avatarIconPanda' },
  { id: 'rabbit', icon: Rabbit, labelKey: 'avatarIconRabbit' },
  { id: 'squirrel', icon: Squirrel, labelKey: 'avatarIconSquirrel' },
  { id: 'turtle', icon: Turtle, labelKey: 'avatarIconTurtle' },
  { id: 'snail', icon: Snail, labelKey: 'avatarIconSnail' },
  { id: 'bird', icon: Bird, labelKey: 'avatarIconBird' },
  { id: 'fish', icon: Fish, labelKey: 'avatarIconFish' },
  { id: 'bug', icon: Bug, labelKey: 'avatarIconBug' },
  { id: 'flower', icon: Flower, labelKey: 'avatarIconFlower' },
  { id: 'rose', icon: Rose, labelKey: 'avatarIconRose' },
  { id: 'clover', icon: Clover, labelKey: 'avatarIconClover' },
  { id: 'leaf', icon: Leaf, labelKey: 'avatarIconLeaf' },
  { id: 'sprout', icon: Sprout, labelKey: 'avatarIconSprout' },
  { id: 'treePine', icon: TreePine, labelKey: 'avatarIconTreePine' },
  { id: 'cherry', icon: Cherry, labelKey: 'avatarIconCherry' },
  { id: 'grape', icon: Grape, labelKey: 'avatarIconGrape' },
  { id: 'carrot', icon: Carrot, labelKey: 'avatarIconCarrot' },
  { id: 'citrus', icon: Citrus, labelKey: 'avatarIconCitrus' },
];

export const AVATAR_ICON_BY_ID: Record<TAvatarIcon, LucideIcon> = Object.fromEntries(
  AVATAR_ICONS.map((entry) => [entry.id, entry.icon]),
) as Record<TAvatarIcon, LucideIcon>;
