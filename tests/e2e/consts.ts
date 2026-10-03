import en from '@/locales/en.json';
import uk from '@/locales/uk.json';

export const COPY = en;

export const COPY_UK = uk;

export const EXAMPLE_SCENES: readonly (keyof typeof en.platform.onboarding.steps)[] = [
  'exampleIntro',
  'exampleHello',
  'exampleThread',
  'exampleCapsule',
  'exampleBean',
  'exampleDoubt',
  'examplePayback',
  'exampleFilter',
  'exampleStale',
  'exampleDropFilter',
  'exampleWaste',
  'exampleDropCapsule',
  'exampleValid',
  'exampleAnswer',
  'exampleResolved',
  'exampleWrap',
];

export const E2E_AUTH_STATE_DIR = 'test-results/e2e-auth';

export const E2E_ACCOUNT_DOMAIN = 'e2e.uniscept.test';

export const E2E_ACCOUNT_PASSWORD = 'Uniscept-E2E-1!';

export const E2E_ACCOUNT_PLAN = 'beta';

export const E2E_MAILPIT_URL = 'http://127.0.0.1:54324';

export const CANVAS_NODE_TYPE = 'canvas-node';

export const QUESTION_NODE_TYPE = 'question-node';

export const REFERENCE_NODE_TYPE = 'reference-node';

export const QUESTION_POSITION = { x: 460, y: 110 };

export const PREFERENCES_ENDPOINT = '/rest/v1/user_preferences';

export const ONBOARDING_ENDPOINT = '/rest/v1/user_onboarding';

export const NODE_SELECTOR = '.react-flow__node';

export const EDGE_SELECTOR = '.react-flow__edge';

export const PANE_SELECTOR = '.react-flow__pane';

export const VIEWPORT_SELECTOR = '.react-flow__viewport';

export const LANDING_WORLD_SELECTOR = '.landing-world';

export const SAVE_STATE_SELECTOR = '[data-canvas-save]';

export const SAVE_STATE_ATTRIBUTE = 'data-canvas-save';

export const SAVE_STATE_SAVED = 'saved';

export const CONTEXT_MENU_TIMEOUT_MS = 2_000;

export const CONTEXT_MENU_ATTEMPTS = 3;

export const LABEL_EDITOR_TIMEOUT_MS = 2_000;

export const LABEL_EDITOR_ATTEMPTS = 3;

export const EXPORT_TIMEOUT_MS = 30_000;

export const EXPORT_THREAD_NAME = 'Export thread';

export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
