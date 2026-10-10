'use client';

import {
  ECanvasNodeType,
  type IExampleCopy,
  type TExampleCanvasAct,
  type TExampleNodeKey,
  type TExampleTarget,
} from '@interfaces';
import {
  EXAMPLE_CANVAS_TIMEOUT_MS,
  EXAMPLE_COMMENT_FIT_PADDING,
  EXAMPLE_FIT_PADDING,
  EXAMPLE_NODES,
  EXAMPLE_STEP_DELAY_MS,
} from '@constants';
import { ECanvasTool } from '@/components/tools';
import { findNearestHandlePair } from '@/lib/canvas';
import { useCanvasStore } from '@/lib/stores';

const EXAMPLE_KEYS = Object.keys(EXAMPLE_NODES) as TExampleNodeKey[];

const pause = () => new Promise<void>((resolve) => window.setTimeout(resolve, EXAMPLE_STEP_DELAY_MS));

const inTurn = (moves: readonly (() => void)[], isLive: () => boolean) =>
  moves.reduce<Promise<void>>(async (previous, move) => {
    await previous;
    if (!isLive()) return;

    move();
    await pause();
  }, Promise.resolve());

const pickTool = (tool: ECanvasTool) => () => useCanvasStore.getState().setActiveTool(tool);

const findNode = (id: string) => useCanvasStore.getState().nodes.find((node) => node.id === id) ?? null;

const placeNode = (key: TExampleNodeKey, copy: IExampleCopy, ids: Record<TExampleTarget, string>) => {
  const { x, y } = EXAMPLE_NODES[key];
  const store = useCanvasStore.getState();
  store.addNode({ x, y }, copy.placeholder, ids[key]);
  store.requestFit(EXAMPLE_FIT_PADDING);
};

const linkNode = (key: TExampleNodeKey, ids: Record<TExampleTarget, string>) => {
  const source = findNode(ids[EXAMPLE_NODES[key].parent]);
  const target = findNode(ids[key]);
  if (!source || !target) return;

  useCanvasStore
    .getState()
    .connectNodes({ source: source.id, target: target.id, ...findNearestHandlePair(source, target) });
};

const movesOf = (act: TExampleCanvasAct, copy: IExampleCopy, ids: Record<TExampleTarget, string>) => {
  const store = useCanvasStore.getState();

  switch (act.type) {
    case 'argue':
      return act.keys.flatMap((key) => [
        pickTool(ECanvasTool.AddNode),
        () => placeNode(key, copy, ids),
        () => store.updateNodeLabel(ids[key], copy.nodes[key]),
        () => {
          store.setActiveTool(ECanvasTool.Connect);
          store.requestFit(EXAMPLE_FIT_PADDING);
        },
        () => linkNode(key, ids),
      ]);
    case 'comment':
      return [
        () => store.requestFit(EXAMPLE_COMMENT_FIT_PADDING),
        () => store.setOpenCommentsNodeId(ids[act.key]),
        () => store.addComment(ids[act.key], copy.comments[act.key]),
      ];
    case 'status':
      return [
        pickTool(act.status === 'valid' ? ECanvasTool.ValidPath : ECanvasTool.InvalidPath),
        ...act.keys.map((key) => () => store.setNodeStatus(ids[key], act.status)),
      ];
    case 'answer':
      return [pickTool(ECanvasTool.Answer), () => store.setNodeAnswer(ids[act.key])];
  }
};

const findQuestionId = (threadId: string): string | null => {
  const { threadId: loadedThreadId, hydrated, nodes } = useCanvasStore.getState();
  if (loadedThreadId !== threadId || !hydrated) return null;

  return nodes.find((node) => node.type === ECanvasNodeType.Question)?.id ?? null;
};

export const waitForExampleCanvas = (threadId: string): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const stop = () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
    const settle = () => {
      const questionId = findQuestionId(threadId);
      if (!questionId) return;

      stop();
      resolve(questionId);
    };
    const unsubscribe = useCanvasStore.subscribe(settle);
    const timer = window.setTimeout(() => {
      stop();
      reject(new Error('The example canvas did not load'));
    }, EXAMPLE_CANVAS_TIMEOUT_MS);

    settle();
  });

export const createExampleIds = (questionId: string): Record<TExampleTarget, string> =>
  Object.fromEntries([['question', questionId], ...EXAMPLE_KEYS.map((key) => [key, crypto.randomUUID()])]) as Record<
    TExampleTarget,
    string
  >;

export const writeExampleQuestion = (
  copy: IExampleCopy,
  ids: Record<TExampleTarget, string>,
  isLive: () => boolean,
): Promise<void> => {
  const store = useCanvasStore.getState();

  return inTurn(
    [
      () => store.setEditingNodeId(null),
      () => {
        store.updateNodeLabel(ids.question, copy.question);
        store.requestFit(EXAMPLE_FIT_PADDING);
      },
    ],
    isLive,
  );
};

export const playExampleAct = async (
  act: TExampleCanvasAct,
  copy: IExampleCopy,
  ids: Record<TExampleTarget, string>,
  isLive: () => boolean,
): Promise<void> => {
  await inTurn(movesOf(act, copy, ids), isLive);
  if (isLive()) useCanvasStore.getState().setActiveTool(ECanvasTool.Select);
};
