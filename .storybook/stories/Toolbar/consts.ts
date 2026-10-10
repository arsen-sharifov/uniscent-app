import type { TCanvasNode } from '@interfaces';

import { ECanvasTool } from '@/components';

import { createCanvasNode } from '../../utils';

export const EXPORT_THREAD_ID = 'sb-export-menu';

export const EXPORT_THREAD_NAME = 'Export thread';

export const exportMenuNodes: TCanvasNode[] = [createCanvasNode('claim', 40, 40, 'A node worth exporting')];

export const HISTORY_TOOL_IDS = new Set<string>([ECanvasTool.Undo, ECanvasTool.Redo]);

export const DENSE_DISABLED_TOOL_IDS = new Set<string>([
  ECanvasTool.Pan,
  ECanvasTool.ZoomOut,
  ECanvasTool.Delete,
  ECanvasTool.InvalidPath,
  ECanvasTool.Undo,
  ECanvasTool.Redo,
]);

export const READ_ONLY_DISABLED_TOOL_IDS = new Set<string>([
  ECanvasTool.AddNode,
  ECanvasTool.Connect,
  ECanvasTool.Delete,
  ECanvasTool.ValidPath,
  ECanvasTool.InvalidPath,
  ECanvasTool.Answer,
  ECanvasTool.CrossReference,
]);
