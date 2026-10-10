import type { IPreferences } from '@interfaces';

export const REFERENCE_SEARCH_LIMIT = 200;

export const ROWS_PER_PAGE = 1000;

export const IDS_PER_REQUEST = 100;

export const REFERENCE_TARGET_SELECT = 'id, label, thread_id, threads!inner(id, name, workspace_id, workspaces(name))';

export const REFERENCE_TARGET_COUNT_SELECT = 'id, threads!inner(workspace_id)';

export const ANSWERED_THREAD_SELECT = 'thread_id, threads!inner(workspace_id)';

export const CANVAS_NODE_SELECT =
  'id, thread_id, type, position_x, position_y, label, status, is_answer, source_node_id, created_by, created_at, updated_at';

export const CANVAS_EDGE_SELECT =
  'id, thread_id, source_node_id, target_node_id, source_handle, target_handle, created_at';

export const NODE_COMMENT_SELECT = 'id, node_id, author_id, text, created_at';

export const THREAD_SELECT = 'id, workspace_id, folder_id, name, position';

export const FOLDER_SELECT = 'id, workspace_id, parent_folder_id, name, position';

export const WORKSPACE_SELECT = 'id, name, owner_id, created_at';

export const ONBOARDING_SELECT = 'offer_answered, completed_guides';

export const PREFERENCE_COLUMN_BY_KEY: Record<keyof IPreferences, string> = {
  theme: 'theme',
  canvasPattern: 'canvas_pattern',
  language: 'language',
  snapToGrid: 'snap_to_grid',
  defaultZoom: 'default_zoom',
  smartGuides: 'smart_guides',
};

export const PREFERENCE_KEY_BY_COLUMN = Object.fromEntries(
  Object.entries(PREFERENCE_COLUMN_BY_KEY).map(([key, column]) => [column, key]),
) as Record<string, keyof IPreferences>;

export const PREFERENCES_SELECT = Object.values(PREFERENCE_COLUMN_BY_KEY).join(', ');
