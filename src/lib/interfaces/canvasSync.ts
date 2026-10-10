import type { IReferenceNodeData, THandleId, TNodeStatus } from './canvas';

export type TSaveStatus = 'idle' | 'saving' | 'retrying' | 'saved' | 'error' | 'offline';

export type TVisibleSaveStatus = Extract<TSaveStatus, 'retrying' | 'error' | 'offline'>;

export interface ISaveState {
  status: TSaveStatus;
  lastSavedAt: number | null;
  retryAttempt: number;
  pendingCount: number;
  failedCount: number;
}

interface IIdScoped {
  id: string;
}

interface IThreadScoped extends IIdScoped {
  threadId: string;
}

interface IPositioned extends IThreadScoped {
  x: number;
  y: number;
}

interface ICreateCanvasNodeOperation extends IPositioned {
  type: 'createCanvasNode';
  label: string;
}

interface ICreateReferenceNodeOperation extends IPositioned {
  type: 'createReferenceNode';
  data: IReferenceNodeData;
}

interface IDeleteNodeOperation extends IIdScoped {
  type: 'deleteNode';
}

interface IUpdateNodePositionOperation extends IIdScoped {
  type: 'updateNodePosition';
  x: number;
  y: number;
}

interface IUpdateNodeLabelOperation extends IIdScoped {
  type: 'updateNodeLabel';
  label: string;
}

interface IUpdateNodeStatusOperation extends IIdScoped {
  type: 'updateNodeStatus';
  status: TNodeStatus;
}

interface IUpdateNodeAnswerOperation extends IIdScoped {
  type: 'updateNodeAnswer';
  isAnswer: boolean;
}

interface ICreateEdgeOperation extends IThreadScoped {
  type: 'createEdge';
  source: string;
  target: string;
  sourceHandle: THandleId;
  targetHandle: THandleId;
}

interface IDeleteEdgeOperation extends IIdScoped {
  type: 'deleteEdge';
}

interface ICreateNodeCommentOperation extends IIdScoped {
  type: 'createComment';
  nodeId: string;
  text: string;
}

interface IDeleteNodeCommentOperation extends IIdScoped {
  type: 'deleteComment';
}

export type TNodeUpdateOperation =
  IUpdateNodePositionOperation | IUpdateNodeLabelOperation | IUpdateNodeStatusOperation | IUpdateNodeAnswerOperation;

export type TCanvasOperation =
  | ICreateCanvasNodeOperation
  | ICreateReferenceNodeOperation
  | IDeleteNodeOperation
  | TNodeUpdateOperation
  | ICreateEdgeOperation
  | IDeleteEdgeOperation
  | ICreateNodeCommentOperation
  | IDeleteNodeCommentOperation;

export type TCanvasOperationListener = (operation: TCanvasOperation) => void;

export type TSaveStatusListener = (state: ISaveState) => void;

export interface ICanvasQueueState {
  pending: TCanvasOperation[];
  failed: TCanvasOperation[];
  flushTimer: number | null;
  retryTimer: number | null;
  pollTimer: number | null;
  retries: number;
  inflight: TCanvasOperation[] | null;
  retryRequested: boolean;
  online: boolean;
  saveState: ISaveState;
  listeners: Set<TSaveStatusListener>;
  windowListenersBound: boolean;
}
