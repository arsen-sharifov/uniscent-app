import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TReferenceNode } from '@interfaces';

import { nodeProps, referenceNode } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { router } from '@mocks/navigation';
import { FULL_ACCESS } from '@mocks/roles';
import { ReferenceNode } from '@/components/Canvas/fragments';
import { usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('next/navigation', () => import('@mocks/navigation'));

const TARGET_URL = '/platform/ws-2/th-2?focus=ref&node=origin';

const renderReference = (node: TReferenceNode) =>
  render(
    <ReactFlowProvider>
      <ReferenceNode {...nodeProps(node)} />
    </ReactFlowProvider>,
  );

const openButton = () =>
  screen.queryByRole('button', {
    name: TRANSLATIONS.platform.canvas.reference.openLabel.replace('{name}', referenceNode('ref').data.sourceNodeLabel),
  });

afterEach(() => {
  usePermissionsStore.getState().clearAccess();
});

describe('ReferenceNode', () => {
  describe('GIVEN a reference to a node in another thread', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      renderReference(referenceNode('ref'));
    });

    describe('WHEN it renders', () => {
      test('THEN the source node, its workspace and thread show under the reference band', () => {
        expect(screen.getByText(TRANSLATIONS.platform.canvas.reference.badge)).toBeInTheDocument();
        expect(screen.getByText('Origin node')).toBeInTheDocument();
        expect(screen.getByText('Other workspace')).toBeInTheDocument();
        expect(screen.getByText('Other thread')).toBeInTheDocument();
        expect(openButton()).toBeInTheDocument();
      });
    });

    describe('WHEN the open button is clicked', () => {
      beforeEach(() => {
        fireEvent.click(openButton()!);
      });

      test('THEN the referenced node opens in its thread', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith(TARGET_URL);
      });
    });
  });

  describe('GIVEN a reference whose source node id is missing', () => {
    beforeEach(() => {
      const node = referenceNode('ref');

      renderReference({ ...node, data: { ...node.data, sourceNodeId: '', sourceWorkspaceName: '' } });
    });

    describe('WHEN it renders', () => {
      test('THEN no open button is offered and the workspace falls back to the generic name', () => {
        expect(openButton()).not.toBeInTheDocument();
        expect(screen.getByText(TRANSLATIONS.platform.canvas.reference.workspaceFallback)).toBeInTheDocument();
      });
    });
  });
});
