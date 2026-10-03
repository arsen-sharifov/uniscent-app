import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { EmptyCanvas } from '@/app/platform/components/EmptyCanvas';
import { useOnboardingStore } from '@/lib/onboarding';
import { usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onCreateThread = vi.fn();
const onCreateWorkspace = vi.fn();

const renderEmptyCanvas = (hasWorkspace: boolean) =>
  render(
    <EmptyCanvas hasWorkspace={hasWorkspace} onCreateThread={onCreateThread} onCreateWorkspace={onCreateWorkspace} />,
  );

afterEach(() => {
  usePermissionsStore.getState().clearAccess();
  useOnboardingStore.getState().forget();
});

describe('EmptyCanvas', () => {
  describe('GIVEN an account without a workspace', () => {
    describe('WHEN the empty canvas renders', () => {
      beforeEach(() => {
        renderEmptyCanvas(false);
      });

      test('THEN it explains workspaces and offers to create the first one', () => {
        expect(screen.getByText(TRANSLATIONS.platform.onboarding.emptyWorkspaceTitle)).toBeInTheDocument();
        expect(screen.getByText(TRANSLATIONS.platform.onboarding.emptyWorkspaceBody)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.newWorkspace })).toBeInTheDocument();
      });
    });

    describe('WHEN the create button is clicked', () => {
      beforeEach(() => {
        renderEmptyCanvas(false);
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.newWorkspace }));
      });

      test('THEN a workspace is created', () => {
        expect(onCreateWorkspace).toHaveBeenCalledOnce();
        expect(onCreateThread).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a workspace where the member may create threads', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: true });
    });

    describe('WHEN the empty canvas renders', () => {
      beforeEach(() => {
        renderEmptyCanvas(true);
      });

      test('THEN it says no thread is open and offers a new one', () => {
        expect(screen.getByText(TRANSLATIONS.platform.onboarding.emptyPlatformTitle)).toBeInTheDocument();
        expect(screen.getByText(TRANSLATIONS.platform.onboarding.emptyPlatformBody)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.newThread })).toBeInTheDocument();
      });
    });

    describe('WHEN the create button is clicked', () => {
      beforeEach(() => {
        renderEmptyCanvas(true);
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.newThread }));
      });

      test('THEN a top-level thread is created without the click event passed as a folder', () => {
        expect(onCreateThread).toHaveBeenCalledExactlyOnceWith();
      });
    });
  });

  describe('GIVEN a workspace where the member may not create threads', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: false });
    });

    describe('WHEN the empty canvas renders', () => {
      beforeEach(() => {
        renderEmptyCanvas(true);
      });

      test('THEN it points to the existing threads instead of offering a new one', () => {
        expect(screen.getByText(TRANSLATIONS.platform.onboarding.emptyViewerBody)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: TRANSLATIONS.platform.sidebar.newThread })).not.toBeInTheDocument();
      });

      test('THEN the tour stays one click away', () => {
        expect(
          screen.getByRole('button', { name: TRANSLATIONS.platform.onboarding.emptyPlatformAction }),
        ).toBeInTheDocument();
      });
    });

    describe('WHEN the tour link is clicked', () => {
      beforeEach(() => {
        renderEmptyCanvas(true);
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.onboarding.emptyPlatformAction }));
      });

      test('THEN the tour offer opens', () => {
        expect(useOnboardingStore.getState().offerOpen).toBe(true);
      });
    });
  });

  describe('GIVEN a guide already running', () => {
    beforeEach(() => {
      useOnboardingStore.getState().startGuide('base');
    });

    describe('WHEN the empty canvas renders', () => {
      beforeEach(() => {
        renderEmptyCanvas(true);
      });

      test('THEN the tour link steps aside', () => {
        expect(
          screen.queryByRole('button', { name: TRANSLATIONS.platform.onboarding.emptyPlatformAction }),
        ).not.toBeInTheDocument();
      });
    });
  });
});
