import type { Node } from '@xyflow/react';

import {
  ECanvasNodeType,
  type IGuideDefinition,
  type IGuideRequirement,
  type ITourPermissions,
  type ITourRun,
  type ITourSnapshot,
  type ITourStep,
  type TExampleAct,
  type TGuideId,
  type TMascotCharacter,
  type TMascotPose,
  type TTourAnchor,
  type TTourSignal,
  type TTourStepKey,
} from '@interfaces';

import { ECanvasTool } from '@/components/tools';
import { isCanvasNodeData } from '@/lib/canvas/utils';

const CANVAS_OPEN: readonly TTourAnchor[] = ['canvas', 'toolbar'];

const at =
  (...anchors: readonly TTourAnchor[]) =>
  () =>
    anchors;

const whileTool =
  (tool: ECanvasTool, picked: readonly TTourAnchor[], pending: readonly TTourAnchor[]) =>
  ({ activeTool }: ITourSnapshot) =>
    activeTool === tool ? picked : pending;

const connectFlow = ({ activeTool, pendingConnection }: ITourSnapshot): readonly TTourAnchor[] => {
  if (activeTool !== ECanvasTool.Connect) return ['toolbarConnect'];

  return pendingConnection === null ? ['canvasQuestionNode'] : ['canvasNodeLoose', 'canvasNode'];
};

const narrate = (copyKey: TTourStepKey, pose: TMascotPose = 'think'): ITourStep => ({
  copyKey,
  placement: 'center',
  pose,
});

const SPEAKER_TOOLS: Partial<Record<ECanvasTool, TTourAnchor>> = {
  [ECanvasTool.AddNode]: 'toolbarAddNode',
  [ECanvasTool.Connect]: 'toolbarConnect',
  [ECanvasTool.ValidPath]: 'toolbarValidPath',
  [ECanvasTool.InvalidPath]: 'toolbarInvalidPath',
  [ECanvasTool.Answer]: 'toolbarAnswer',
};

const followSpeaker = ({ activeTool, openCommentsNodeId }: ITourSnapshot): readonly TTourAnchor[] => {
  if (openCommentsNodeId) return ['canvasCommentsPanel'];

  const tool = SPEAKER_TOOLS[activeTool];

  return tool ? [tool] : [];
};

const exampleScene = (
  copyKey: TTourStepKey,
  speaker: TMascotCharacter,
  act?: TExampleAct,
  pose: TMascotPose = 'point',
): ITourStep => ({
  copyKey,
  speaker,
  act,
  anchors: followSpeaker,
  openAnchors: CANVAS_OPEN,
  placement: 'bottom',
  pose,
});

const toolStep = (copyKey: TTourStepKey, anchor: TTourAnchor): ITourStep => ({
  copyKey,
  anchors: at(anchor),
  placement: 'left',
  pose: 'point',
});

const shows =
  (anchor: TTourAnchor) =>
  ({ visibleAnchors }: ITourSnapshot) =>
    visibleAnchors.has(anchor);

const signalled =
  (signal: TTourSignal) =>
  ({ signals }: ITourSnapshot) =>
    signals.has(signal);

const picks =
  (tool: ECanvasTool) =>
  ({ activeTool }: ITourSnapshot) =>
    activeTool === tool;

const lacks =
  (right: keyof ITourPermissions) =>
  ({ permissions }: ITourSnapshot) =>
    !permissions[right];

const isQuestion = (node: Node) => node.type === ECanvasNodeType.Question;

const isCanvasNode = (node: Node) => node.type === ECanvasNodeType.Canvas;

const isReference = (node: Node) => node.type === ECanvasNodeType.Reference;

const hasLabel = (node: Node) => isCanvasNodeData(node.data) && node.data.label.trim().length > 0;

const hasStatus = (status: 'valid' | 'invalid') => (node: Node) =>
  isCanvasNodeData(node.data) && node.data.status === status;

const isAnswer = (node: Node) => isCanvasNodeData(node.data) && node.data.isAnswer;

const hasComment = (node: Node) => isCanvasNodeData(node.data) && node.data.comments.length > 0;

const hasWorkspace = ({ workspaceCount }: ITourSnapshot) => workspaceCount > 0;

const onCanvas = ({ threadId }: ITourSnapshot) => threadId !== null;

const countNodes = ({ nodes }: ITourSnapshot) => nodes.filter(isCanvasNode).length;

const hasCanvasNode = (snapshot: ITourSnapshot) => countNodes(snapshot) > 0;

const countQuestionLinks = ({ nodes, edges }: ITourSnapshot) => {
  const questionIds = new Set(nodes.filter(isQuestion).map((node) => node.id));
  const canvasIds = new Set(nodes.filter(isCanvasNode).map((node) => node.id));
  const linked = edges.filter((edge) => questionIds.has(edge.source) && canvasIds.has(edge.target));

  return new Set(linked.map((edge) => edge.target)).size;
};

const canBuild = ({ permissions }: ITourSnapshot) => permissions.canEditCanvas && permissions.canManageStructure;

const buildsHere = (snapshot: ITourSnapshot) => hasWorkspace(snapshot) && canBuild(snapshot);

const skipsOwnWorkspace = (snapshot: ITourSnapshot) =>
  !hasWorkspace(snapshot) || !snapshot.permissions.resolved || canBuild(snapshot);

const skipsReopeningWorkspaceSettings = (snapshot: ITourSnapshot) =>
  (lacks('canManageMembers')(snapshot) && lacks('canManageRoles')(snapshot)) ||
  shows('workspaceSettingsModal')(snapshot);

const cannotReference = ({ referenceTargetCount, permissions }: ITourSnapshot) =>
  referenceTargetCount === 0 || !permissions.canEditCanvas;

const skipsReferenceThread = ({ referenceTargetCount, permissions }: ITourSnapshot) =>
  referenceTargetCount > 0 || !permissions.canManageStructure || !permissions.canEditCanvas;

const NEEDS_WORKSPACE: IGuideRequirement = { hintKey: 'needsWorkspace', isMet: hasWorkspace };

const NEEDS_CANVAS: IGuideRequirement = { hintKey: 'needsCanvas', isMet: onCanvas };

const NEEDS_NODE: IGuideRequirement = { hintKey: 'needsNode', isMet: hasCanvasNode };

const NEEDS_BUILD_RIGHTS: IGuideRequirement = {
  hintKey: 'needsBuildRights',
  isMet: (snapshot) => canBuild(snapshot) && snapshot.permissions.canComment,
};

const ADD_NODE_ANCHORS = whileTool(ECanvasTool.AddNode, ['canvas'], ['toolbarAddNode']);

const CREATE_THREAD = {
  anchors: at('sidebarNewThreadCta', 'sidebarCreateThread'),
  openAnchors: ['sidebarCreateThread'],
  placement: 'right',
  pose: 'point',
} as const satisfies Omit<ITourStep, 'copyKey'>;

const OPEN_WORKSPACE_SETTINGS = {
  anchors: at(
    'sidebarWorkspaceRowSettings',
    'sidebarWorkspaceRow',
    'sidebarWorkspacePanel',
    'sidebarWorkspaceSwitcher',
  ),
  openAnchors: ['sidebarWorkspaceSwitcher'],
  placement: 'right',
  pose: 'point',
  isDone: shows('workspaceSettingsModal'),
} as const satisfies Omit<ITourStep, 'copyKey'>;

export const GUIDES: readonly IGuideDefinition[] = [
  {
    id: 'base',
    requires: [],
    steps: [
      narrate('baseIntro'),
      {
        copyKey: 'baseWorkspace',
        anchors: at('sidebarWorkspaceCreate', 'sidebarNewWorkspace', 'sidebarWorkspaceSwitcher'),
        openAnchors: ['sidebarNewWorkspace', 'sidebarWorkspaceSwitcher'],
        placement: 'right',
        pose: 'point',
        isDone: hasWorkspace,
      },
      {
        copyKey: 'baseOwnWorkspace',
        isSkipped: skipsOwnWorkspace,
        anchors: at('sidebarWorkspaceCreate', 'sidebarWorkspaceSwitcher'),
        openAnchors: ['sidebarWorkspaceSwitcher'],
        placement: 'right',
        pose: 'point',
        isDone: buildsHere,
      },
      { copyKey: 'baseThread', ...CREATE_THREAD, isDone: onCanvas },
      {
        copyKey: 'baseQuestion',
        anchors: at('canvasQuestionNode'),
        openAnchors: CANVAS_OPEN,
        placement: 'bottom',
        pose: 'point',
        isDone: ({ nodes }) => nodes.some((node) => isQuestion(node) && hasLabel(node)),
      },
      narrate('baseArgue'),
      {
        copyKey: 'baseNode',
        anchors: ADD_NODE_ANCHORS,
        openAnchors: CANVAS_OPEN,
        placement: 'left',
        pose: 'point',
        isDone: hasCanvasNode,
      },
      {
        copyKey: 'baseNodeText',
        anchors: whileTool(ECanvasTool.Select, ['canvasNode'], ['toolbarSelect']),
        openAnchors: CANVAS_OPEN,
        placement: 'left',
        pose: 'point',
        isDone: signalled('nodeLabelled'),
      },
      {
        copyKey: 'baseConnect',
        anchors: connectFlow,
        openAnchors: CANVAS_OPEN,
        placement: 'left',
        pose: 'point',
        isDone: (snapshot) => countQuestionLinks(snapshot) > 0,
      },
      narrate('baseDirection'),
      {
        copyKey: 'baseObjection',
        anchors: ADD_NODE_ANCHORS,
        openAnchors: CANVAS_OPEN,
        placement: 'left',
        pose: 'point',
        isDone: (snapshot) => countNodes(snapshot) > 1,
      },
      {
        copyKey: 'baseSecondLink',
        anchors: connectFlow,
        openAnchors: CANVAS_OPEN,
        placement: 'left',
        pose: 'point',
        isDone: (snapshot) => countQuestionLinks(snapshot) > 1,
      },
      {
        copyKey: 'baseValid',
        anchors: whileTool(ECanvasTool.ValidPath, ['canvasNode'], ['toolbarValidPath']),
        openAnchors: CANVAS_OPEN,
        placement: 'left',
        pose: 'point',
        isDone: ({ nodes }) => nodes.some(hasStatus('valid')),
      },
      {
        copyKey: 'baseInvalid',
        anchors: whileTool(ECanvasTool.InvalidPath, ['canvasNodeUnmarked', 'canvasNode'], ['toolbarInvalidPath']),
        openAnchors: CANVAS_OPEN,
        placement: 'left',
        pose: 'point',
        isDone: ({ nodes }) => nodes.some(hasStatus('invalid')),
      },
      narrate('baseVerdict'),
      {
        copyKey: 'baseAnswerTool',
        anchors: at('toolbarAnswer'),
        openAnchors: CANVAS_OPEN,
        placement: 'left',
        pose: 'point',
        isDone: picks(ECanvasTool.Answer),
      },
      {
        copyKey: 'baseAnswer',
        anchors: at('canvasNodeValid', 'canvasNode'),
        openAnchors: CANVAS_OPEN,
        placement: 'right',
        pose: 'point',
        isDone: ({ nodes }) => nodes.some(isAnswer),
      },
      {
        copyKey: 'baseResolvedMark',
        anchors: at('sidebarThreadResolved'),
        placement: 'right',
        pose: 'point',
      },
      narrate('baseResolved', 'cheer'),
    ],
  },
  {
    id: 'canvas',
    requires: [NEEDS_WORKSPACE, NEEDS_CANVAS, NEEDS_NODE],
    steps: [
      narrate('toolsWhat'),
      {
        copyKey: 'toolsSheet',
        anchors: at('helpMenuShortcuts', 'toolbarHelp'),
        openAnchors: ['toolbarHelp'],
        placement: 'left',
        pose: 'point',
        isDone: shows('shortcutsSheet'),
      },
      {
        copyKey: 'toolsSheetRead',
        anchors: at('shortcutsSheet'),
        placement: 'right',
        pose: 'think',
      },
      {
        copyKey: 'toolsClose',
        anchors: at('shortcutsClose', 'shortcutsSheet'),
        placement: 'left',
        pose: 'point',
        isDone: (snapshot) => !shows('shortcutsSheet')(snapshot),
      },
      toolStep('toolsSelect', 'toolbarSelect'),
      toolStep('toolsPan', 'toolbarPan'),
      toolStep('toolsZoom', 'toolbarZoomIn'),
      toolStep('toolsUndo', 'toolbarUndo'),
      toolStep('toolsAdd', 'toolbarAddNode'),
      toolStep('toolsConnect', 'toolbarConnect'),
      toolStep('toolsDelete', 'toolbarDelete'),
      toolStep('toolsValid', 'toolbarValidPath'),
      toolStep('toolsInvalid', 'toolbarInvalidPath'),
      toolStep('toolsAnswer', 'toolbarAnswer'),
      toolStep('toolsReference', 'toolbarCrossReference'),
      narrate('commentsWhat'),
      {
        copyKey: 'commentsOpen',
        isSkipped: lacks('canComment'),
        anchors: at('canvasNodeComments', 'canvasNode'),
        openAnchors: CANVAS_OPEN,
        placement: 'right',
        pose: 'point',
        isDone: ({ openCommentsNodeId }) => openCommentsNodeId !== null,
      },
      {
        copyKey: 'commentsWrite',
        isSkipped: lacks('canComment'),
        anchors: at('canvasCommentsPanel', 'canvasNode'),
        openAnchors: CANVAS_OPEN,
        placement: 'right',
        pose: 'point',
        isDone: ({ nodes }) => nodes.some(hasComment),
      },
      {
        copyKey: 'commentsWho',
        isSkipped: lacks('canComment'),
        anchors: at('canvasCommentsPanel', 'canvasNode'),
        placement: 'right',
        pose: 'think',
      },
      narrate('referencesWhat'),
      {
        copyKey: 'referencesThread',
        isSkipped: skipsReferenceThread,
        ...CREATE_THREAD,
        isDone: ({ referenceTargetCount }) => referenceTargetCount > 0,
      },
      {
        copyKey: 'referencesTool',
        isSkipped: cannotReference,
        anchors: at('toolbarCrossReference'),
        openAnchors: CANVAS_OPEN,
        placement: 'left',
        pose: 'point',
        isDone: picks(ECanvasTool.CrossReference),
      },
      {
        copyKey: 'referencesPlace',
        isSkipped: cannotReference,
        anchors: at('canvas'),
        openAnchors: CANVAS_OPEN,
        placement: 'top',
        pose: 'point',
        isDone: shows('canvasReferenceSearch'),
      },
      {
        copyKey: 'referencesPick',
        isSkipped: cannotReference,
        anchors: at('canvasReferenceSearch', 'canvas'),
        openAnchors: CANVAS_OPEN,
        placement: 'right',
        pose: 'point',
        isDone: ({ nodes }) => nodes.some(isReference),
      },
      narrate('referencesBoundary'),
      narrate('exportWhat'),
      {
        copyKey: 'exportMenu',
        anchors: at('toolbarExport'),
        placement: 'left',
        pose: 'point',
        isDone: shows('exportMenu'),
      },
      {
        copyKey: 'exportFormat',
        anchors: at('exportMenu', 'toolbarExport'),
        openAnchors: ['toolbarExport'],
        placement: 'left',
        pose: 'point',
        isDone: signalled('canvasExported'),
      },
      narrate('exportNote'),
    ],
  },
  {
    id: 'workspace',
    requires: [NEEDS_WORKSPACE],
    steps: [
      narrate('structureWhat'),
      {
        copyKey: 'structureFolder',
        isSkipped: lacks('canManageStructure'),
        anchors: at('sidebarCreateFolder'),
        placement: 'right',
        pose: 'point',
        isDone: ({ folderCount }) => folderCount > 0,
      },
      {
        copyKey: 'structureNest',
        isSkipped: lacks('canManageStructure'),
        anchors: at('sidebarTree'),
        placement: 'right',
        pose: 'point',
        isDone: ({ nestedThreadCount }) => nestedThreadCount > 0,
      },
      {
        copyKey: 'structureSearch',
        anchors: at('sidebarSearch', 'sidebarTree'),
        placement: 'right',
        pose: 'think',
      },
      {
        copyKey: 'structureMove',
        anchors: at('sidebarTree'),
        placement: 'right',
        pose: 'think',
      },
      narrate('workspacesWhat'),
      {
        copyKey: 'workspacesSwitcher',
        anchors: at('sidebarWorkspaceSwitcher'),
        placement: 'right',
        pose: 'point',
        isDone: shows('sidebarWorkspacePanel'),
      },
      { copyKey: 'workspacesSettings', ...OPEN_WORKSPACE_SETTINGS },
      {
        copyKey: 'workspacesGeneral',
        anchors: at('workspaceSettingsGeneral', 'workspaceSettingsModal'),
        placement: 'right',
        pose: 'think',
      },
      {
        copyKey: 'workspacesOwner',
        anchors: at('workspaceSettingsGeneral', 'workspaceSettingsModal'),
        placement: 'right',
        pose: 'think',
      },
      narrate('membersWhat'),
      { copyKey: 'membersOpen', isSkipped: skipsReopeningWorkspaceSettings, ...OPEN_WORKSPACE_SETTINGS },
      {
        copyKey: 'membersSection',
        isSkipped: lacks('canManageMembers'),
        anchors: at('workspaceSettingsMembersNav', 'workspaceSettingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: shows('workspaceSettingsMembers'),
      },
      {
        copyKey: 'membersInvite',
        isSkipped: lacks('canManageMembers'),
        anchors: at('workspaceSettingsMembers', 'workspaceSettingsModal'),
        placement: 'right',
        pose: 'think',
      },
      {
        copyKey: 'membersRoles',
        isSkipped: lacks('canManageRoles'),
        anchors: at('workspaceSettingsRolesNav', 'workspaceSettingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: shows('workspaceSettingsRoles'),
      },
      {
        copyKey: 'membersPermissions',
        isSkipped: lacks('canManageRoles'),
        anchors: at('workspaceSettingsRoles', 'workspaceSettingsModal'),
        placement: 'right',
        pose: 'think',
      },
    ],
  },
  {
    id: 'settings',
    requires: [],
    steps: [
      narrate('settingsWhat'),
      {
        copyKey: 'settingsOpen',
        anchors: at('userMenuSettings', 'sidebarUserMenu'),
        openAnchors: ['sidebarUserMenu'],
        placement: 'right',
        pose: 'point',
        isDone: shows('settingsModal'),
      },
      {
        copyKey: 'settingsProfile',
        anchors: at('settingsProfile', 'settingsProfileNav', 'settingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: signalled('profileSaved'),
      },
      {
        copyKey: 'settingsSecurity',
        anchors: at('settingsSecurityNav', 'settingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: shows('settingsSecurity'),
      },
      {
        copyKey: 'settingsSecurityNote',
        anchors: at('settingsSecurity', 'settingsModal'),
        placement: 'right',
        pose: 'think',
      },
      {
        copyKey: 'settingsNotifications',
        anchors: at('settingsNotificationsNav', 'settingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: shows('settingsNotifications'),
      },
      {
        copyKey: 'settingsAppearance',
        anchors: at('settingsAppearanceNav', 'settingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: shows('settingsAppearance'),
      },
      {
        copyKey: 'settingsTheme',
        anchors: at('settingsAppearance', 'settingsAppearanceNav', 'settingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: signalled('themePicked'),
      },
      {
        copyKey: 'settingsPattern',
        anchors: at('settingsAppearance', 'settingsAppearanceNav', 'settingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: signalled('patternPicked'),
      },
      {
        copyKey: 'settingsEditor',
        anchors: at('settingsEditorNav', 'settingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: shows('settingsEditor'),
      },
      {
        copyKey: 'settingsTune',
        anchors: at('settingsEditor', 'settingsEditorNav', 'settingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: signalled('editorTuned'),
      },
      {
        copyKey: 'settingsPlan',
        anchors: at('settingsPlanNav', 'settingsNav'),
        placement: 'right',
        pose: 'point',
        isDone: shows('settingsPlan'),
      },
      {
        copyKey: 'settingsScope',
        anchors: at('settingsModal'),
        placement: 'right',
        pose: 'think',
      },
    ],
  },
  {
    id: 'example',
    requires: [NEEDS_WORKSPACE, NEEDS_BUILD_RIGHTS],
    steps: [
      { ...narrate('exampleIntro', 'point'), speaker: 'nodi' },
      { ...narrate('exampleHello', 'cheer'), speaker: 'ergo' },
      { ...exampleScene('exampleThread', 'nodi', { type: 'thread' }), anchors: at('canvasQuestionNode') },
      exampleScene('exampleCapsule', 'ergo', { type: 'argue', keys: ['capsule', 'oneButton'] }),
      exampleScene('exampleBean', 'nodi', { type: 'argue', keys: ['bean', 'perCup'] }),
      exampleScene('exampleDoubt', 'ergo', { type: 'comment', key: 'bean' }, 'think'),
      exampleScene('examplePayback', 'nodi', { type: 'argue', keys: ['payback'] }),
      exampleScene('exampleFilter', 'ergo', { type: 'argue', keys: ['filter', 'cheapest'] }),
      exampleScene('exampleStale', 'nodi', { type: 'comment', key: 'filter' }, 'think'),
      exampleScene('exampleDropFilter', 'ergo', { type: 'status', status: 'invalid', keys: ['filter'] }),
      exampleScene('exampleWaste', 'nodi', { type: 'comment', key: 'capsule' }),
      exampleScene('exampleDropCapsule', 'ergo', { type: 'status', status: 'invalid', keys: ['capsule'] }, 'think'),
      exampleScene('exampleValid', 'nodi', { type: 'status', status: 'valid', keys: ['bean', 'perCup', 'payback'] }),
      exampleScene('exampleAnswer', 'ergo', { type: 'answer', key: 'bean' }),
      { ...exampleScene('exampleResolved', 'nodi'), anchors: at('sidebarThreadResolved') },
      exampleScene('exampleWrap', 'ergo', undefined, 'cheer'),
      exampleScene('exampleKeep', 'nodi', undefined, 'idle'),
    ],
  },
];

export const BASE_GUIDE_ID: TGuideId = 'base';

export const EXAMPLE_GUIDE_ID: TGuideId = 'example';

export const findGuide = (id: TGuideId) => GUIDES.find((guide) => guide.id === id) ?? null;

export const findUnmetRequirement = (guide: IGuideDefinition, snapshot: ITourSnapshot): IGuideRequirement | null =>
  guide.requires.find(({ isMet }) => !isMet(snapshot)) ?? null;

export const hasEarnedBadge = (completedGuides: readonly TGuideId[]): boolean => {
  const completed = new Set(completedGuides);

  return GUIDES.every((guide) => completed.has(guide.id));
};

export const isFirstRun = (run: ITourRun | null, completedGuides: readonly TGuideId[]): boolean =>
  run?.guideId === BASE_GUIDE_ID && !completedGuides.includes(BASE_GUIDE_ID);
