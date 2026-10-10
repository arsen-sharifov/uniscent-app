import {
  BookMarked,
  Building2,
  Compass,
  Flag,
  Footprints,
  Gavel,
  GitFork,
  GraduationCap,
  Languages,
  Link2,
  MapIcon,
  MessagesSquare,
  Moon,
  Palette,
  Sparkles,
  Users2,
} from 'lucide-react';

import type { IBadgeDefinition, TBadgeId } from '@interfaces';

export const BADGES: readonly IBadgeDefinition[] = [
  { id: 'founder', icon: Sparkles, labelKey: 'badgeFounder', unlockKey: 'founderUnlock' },
  { id: 'initiate', icon: GraduationCap, labelKey: 'badgeInitiate', unlockKey: 'initiateUnlock' },
  { id: 'firstSteps', icon: Footprints, labelKey: 'badgeFirstSteps', unlockKey: 'firstStepsUnlock' },
  {
    id: 'workspaceBuilder',
    icon: Building2,
    labelKey: 'badgeWorkspaceBuilder',
    unlockKey: 'workspaceBuilderUnlock',
  },
  { id: 'architect', icon: Compass, labelKey: 'badgeArchitect', unlockKey: 'architectUnlock' },
  { id: 'connector', icon: Link2, labelKey: 'badgeConnector', unlockKey: 'connectorUnlock' },
  { id: 'critic', icon: Gavel, labelKey: 'badgeCritic', unlockKey: 'criticUnlock' },
  { id: 'weaver', icon: GitFork, labelKey: 'badgeWeaver', unlockKey: 'weaverUnlock' },
  { id: 'verdict', icon: Flag, labelKey: 'badgeVerdict', unlockKey: 'verdictUnlock' },
  { id: 'voice', icon: MessagesSquare, labelKey: 'badgeVoice', unlockKey: 'voiceUnlock' },
  { id: 'curator', icon: BookMarked, labelKey: 'badgeCurator', unlockKey: 'curatorUnlock' },
  { id: 'collaborator', icon: Users2, labelKey: 'badgeCollaborator', unlockKey: 'collaboratorUnlock' },
  { id: 'linguist', icon: Languages, labelKey: 'badgeLinguist', unlockKey: 'linguistUnlock' },
  { id: 'stylist', icon: Palette, labelKey: 'badgeStylist', unlockKey: 'stylistUnlock' },
  { id: 'cartographer', icon: MapIcon, labelKey: 'badgeCartographer', unlockKey: 'cartographerUnlock' },
  { id: 'nightOwl', icon: Moon, labelKey: 'badgeNightOwl', unlockKey: 'nightOwlUnlock' },
];

export const DEFAULT_BADGES: readonly TBadgeId[] = ['founder'];

export const ARCHITECT_NODE_COUNT = 25;

export const CONNECTOR_EDGE_COUNT = 15;

export const NIGHT_OWL_END_HOUR = 5;
