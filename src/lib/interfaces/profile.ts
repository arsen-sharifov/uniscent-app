import type { LucideIcon } from 'lucide-react';

export type TAvatarIcon =
  | 'cat'
  | 'dog'
  | 'panda'
  | 'rabbit'
  | 'squirrel'
  | 'turtle'
  | 'snail'
  | 'bird'
  | 'fish'
  | 'bug'
  | 'flower'
  | 'rose'
  | 'clover'
  | 'leaf'
  | 'sprout'
  | 'treePine'
  | 'cherry'
  | 'grape'
  | 'carrot'
  | 'citrus';

export type TAvatarIconLabelKey = `avatarIcon${Capitalize<TAvatarIcon>}`;

export interface IAvatarIconOption {
  id: TAvatarIcon;
  icon: LucideIcon;
  labelKey: TAvatarIconLabelKey;
}

export type TBadgeId =
  | 'founder'
  | 'initiate'
  | 'firstSteps'
  | 'workspaceBuilder'
  | 'architect'
  | 'connector'
  | 'critic'
  | 'weaver'
  | 'verdict'
  | 'voice'
  | 'curator'
  | 'collaborator'
  | 'linguist'
  | 'stylist'
  | 'cartographer'
  | 'nightOwl';

export type TBadgeLabelKey = `badge${Capitalize<TBadgeId>}`;

export type TBadgeUnlockKey = `${TBadgeId}Unlock`;

export interface IBadgeDefinition {
  id: TBadgeId;
  icon: LucideIcon;
  labelKey: TBadgeLabelKey;
  unlockKey: TBadgeUnlockKey;
}

export interface IBadgeAward {
  id: TBadgeId;
  announce: boolean;
}

export interface IAwardBadgeOptions {
  quiet?: boolean;
}

export interface IUserProfileUpdate {
  name?: string;
  avatarIcon?: TAvatarIcon | null;
}

export interface IUserMetadata {
  name?: string;
  avatarIcon?: string;
  badges?: string[];
  plan?: string;
}
