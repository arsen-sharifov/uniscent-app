import type { IExampleNodeLayout, TBadgeId, TExampleNodeKey, TFitPadding, TGuideId, TTourAnchor } from '@interfaces';

export const ONBOARDING_BADGE_ID: TBadgeId = 'initiate';

export const GUIDE_IDS: readonly TGuideId[] = ['base', 'canvas', 'workspace', 'settings', 'example'];

export const TOUR_ANCHORS: readonly TTourAnchor[] = [
  'sidebarCreateThread',
  'sidebarCreateFolder',
  'sidebarTree',
  'sidebarThreadResolved',
  'sidebarWorkspaceSwitcher',
  'sidebarNewWorkspace',
  'sidebarWorkspaceCreate',
  'sidebarWorkspaceRow',
  'sidebarWorkspaceRowSettings',
  'sidebarNewThreadCta',
  'sidebarWorkspacePanel',
  'sidebarUserMenu',
  'userMenuSettings',
  'canvas',
  'canvasQuestionNode',
  'canvasNode',
  'canvasNodeComments',
  'canvasNodeUnmarked',
  'canvasNodeValid',
  'canvasNodeLoose',
  'canvasCommentsPanel',
  'canvasReferenceSearch',
  'toolbar',
  'toolbarSelect',
  'toolbarPan',
  'toolbarZoomIn',
  'toolbarUndo',
  'toolbarAddNode',
  'toolbarConnect',
  'toolbarDelete',
  'toolbarValidPath',
  'toolbarInvalidPath',
  'toolbarAnswer',
  'toolbarCrossReference',
  'toolbarExport',
  'toolbarHelp',
  'helpMenuShortcuts',
  'exportMenu',
  'shortcutsSheet',
  'shortcutsClose',
  'settingsModal',
  'settingsNav',
  'settingsAppearanceNav',
  'settingsEditorNav',
  'settingsAppearance',
  'settingsEditor',
  'workspaceSettingsModal',
  'workspaceSettingsNav',
  'workspaceSettingsMembersNav',
  'workspaceSettingsMembers',
  'settingsProfileNav',
  'settingsSecurityNav',
  'settingsNotificationsNav',
  'settingsPlanNav',
  'settingsProfile',
  'settingsSecurity',
  'settingsNotifications',
  'settingsPlan',
  'workspaceSettingsGeneralNav',
  'workspaceSettingsRolesNav',
  'workspaceSettingsGeneral',
  'workspaceSettingsRoles',
  'sidebarSearch',
];

export const TOUR_ANCHOR_SELECTORS: Partial<Record<TTourAnchor, string>> = {
  canvasNodeUnmarked: '[data-tour="canvasNode"][data-tour-state="unmarked"]',
  canvasNodeValid: '[data-tour="canvasNode"][data-tour-state="valid"]',
  canvasNodeLoose: '[data-tour="canvasNode"][data-tour-linked="false"]',
};

export const ANCHOR_SEPARATOR = '|';

const TOUR_CARD_ATTRIBUTE = 'data-tour-card';

export const TOUR_CARD_SELECTOR = `[${TOUR_CARD_ATTRIBUTE}]`;

const TOUR_HINT_ATTRIBUTE = 'data-tour-hint';

export const APP_OVERLAY_SELECTOR = `dialog:not([${TOUR_CARD_ATTRIBUTE}]):not([${TOUR_HINT_ATTRIBUTE}]), [role="dialog"], [role="alertdialog"], [role="menu"]`;

const TOUR_SCRIM_ATTRIBUTE = 'data-tour-scrim';

export const TOUR_PANEL_ATTRIBUTE = 'data-tour-panel';

export const TOUR_FOCUS_ATTRIBUTE = 'data-tour-focus';

export const TOUR_SURFACE_SELECTOR = `[${TOUR_CARD_ATTRIBUTE}], [${TOUR_SCRIM_ATTRIBUTE}], [${TOUR_PANEL_ATTRIBUTE}]`;

export const SPOTLIGHT_PADDING = 10;
export const SPOTLIGHT_RADIUS = 14;

export const TOUR_CARD_WIDTH = 332;
export const TOUR_HINT_WIDTH = 284;
export const TOUR_CARD_GAP = 18;
export const TOUR_VIEWPORT_MARGIN = 12;

export const ANCHOR_POLL_MS = 120;

export const SCRIM_BOUND = 10000;

export const LOST_TARGET_MS = 700;

export const EXAMPLE_NODES: Record<TExampleNodeKey, IExampleNodeLayout> = {
  capsule: { parent: 'question', x: -400, y: 200 },
  oneButton: { parent: 'capsule', x: -400, y: 360 },
  bean: { parent: 'question', x: 35, y: 200 },
  perCup: { parent: 'bean', x: -110, y: 360 },
  payback: { parent: 'bean', x: 180, y: 360 },
  filter: { parent: 'question', x: 470, y: 200 },
  cheapest: { parent: 'filter', x: 470, y: 360 },
};

export const EXAMPLE_STEP_DELAY_MS = 450;

export const EXAMPLE_CANVAS_TIMEOUT_MS = 10000;

export const EXAMPLE_FIT_PADDING: TFitPadding = { top: '6%', x: '4%', bottom: '300px' };

export const EXAMPLE_COMMENT_FIT_PADDING: TFitPadding = { ...EXAMPLE_FIT_PADDING, right: '340px' };
