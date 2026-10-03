import { describe, expect, test } from 'vitest';

import { canvasNode, questionNode } from '@mocks/canvas';
import { EDITOR, OWNER, VIEWER } from '@mocks/roles';
import { canDeleteNode, canEditNode, roleLabel } from '@/lib/utils';
import en from '@/locales/en.json';

describe('canEditNode', () => {
  describe('GIVEN an editor who is not the workspace owner', () => {
    describe('WHEN they edit their own node', () => {
      test('THEN the edit is allowed', () => {
        expect(canEditNode('user-1', EDITOR)).toBe(true);
      });
    });

    describe("WHEN they edit someone else's node", () => {
      test('THEN the edit is denied', () => {
        expect(canEditNode('user-2', EDITOR)).toBe(false);
      });
    });

    describe('WHEN they edit a legacy node without an author', () => {
      test('THEN the edit is denied', () => {
        expect(canEditNode(undefined, EDITOR)).toBe(false);
      });
    });
  });

  describe('GIVEN the workspace owner', () => {
    describe("WHEN they edit someone else's node", () => {
      test('THEN the edit is allowed', () => {
        expect(canEditNode('user-2', OWNER)).toBe(true);
      });
    });

    describe('WHEN they edit a legacy node without an author', () => {
      test('THEN the edit is allowed', () => {
        expect(canEditNode(undefined, OWNER)).toBe(true);
      });
    });
  });

  describe('GIVEN a viewer without canvas edit access', () => {
    describe('WHEN they edit their own node', () => {
      test('THEN the edit is denied', () => {
        expect(canEditNode('user-1', VIEWER)).toBe(false);
      });
    });
  });

  describe('GIVEN an owner whose role lacks canvas edit access', () => {
    describe('WHEN they edit any node', () => {
      test('THEN the edit is denied', () => {
        expect(canEditNode('user-2', { ...OWNER, canEditCanvas: false })).toBe(false);
      });
    });
  });
});

describe('roleLabel', () => {
  describe('GIVEN a system role key', () => {
    describe('WHEN the label is resolved', () => {
      test('THEN the translated role name wins over the stored name', () => {
        expect(roleLabel('owner', 'Ignored', en)).toBe(en.platform.workspaceSettings.roleNames.owner);
      });
    });
  });

  describe('GIVEN no role key', () => {
    describe('WHEN the label is resolved', () => {
      test('THEN the stored name is used as a fallback', () => {
        expect(roleLabel(null, 'Reviewer', en)).toBe('Reviewer');
      });
    });
  });
});

describe('canDeleteNode', () => {
  describe('GIVEN an editor who is not the workspace owner', () => {
    describe('WHEN they delete their own node', () => {
      test('THEN the deletion is allowed', () => {
        expect(canDeleteNode(canvasNode('n1', { createdBy: 'user-1' }), EDITOR)).toBe(true);
      });
    });

    describe("WHEN they delete someone else's node", () => {
      test('THEN the deletion is denied', () => {
        expect(canDeleteNode(canvasNode('n1', { createdBy: 'user-2' }), EDITOR)).toBe(false);
      });
    });
  });

  describe('GIVEN the workspace owner', () => {
    describe('WHEN they delete the question', () => {
      test('THEN the deletion is denied', () => {
        expect(canDeleteNode(questionNode('q1'), OWNER)).toBe(false);
      });
    });
  });
});
