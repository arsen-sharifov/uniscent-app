'use client';

import { Plus } from 'lucide-react';

import { Mascot } from '@/components';
import { useTranslations } from '@/i18n';
import { useOnboardingStore } from '@/lib/onboarding';
import { usePermissionsStore } from '@/lib/stores';

interface IEmptyCanvasProps {
  hasWorkspace: boolean;
  onCreateThread: () => void;
  onCreateWorkspace: () => void;
}

export const EmptyCanvas = ({ hasWorkspace, onCreateThread, onCreateWorkspace }: IEmptyCanvasProps) => {
  const t = useTranslations();
  const canManageStructure = usePermissionsStore((state) => state.canManageStructure);
  const openOffer = useOnboardingStore((state) => state.openOffer);
  const touring = useOnboardingStore((state) => state.run !== null);

  const canCreate = !hasWorkspace || canManageStructure;
  const label = hasWorkspace ? t.platform.sidebar.newThread : t.platform.sidebar.newWorkspace;
  const create = hasWorkspace ? onCreateThread : onCreateWorkspace;
  const createBody = hasWorkspace ? t.platform.onboarding.emptyPlatformBody : t.platform.onboarding.emptyWorkspaceBody;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Mascot pose="idle" label={t.platform.onboarding.nodiAlt} />

      <p className="font-grotesk text-[13px] font-semibold tracking-tight text-[color:var(--text-strong)]">
        {hasWorkspace ? t.platform.onboarding.emptyPlatformTitle : t.platform.onboarding.emptyWorkspaceTitle}
      </p>

      <p className="max-w-xs font-grotesk text-[12px] leading-relaxed text-[color:var(--text-muted)]">
        {canCreate ? createBody : t.platform.onboarding.emptyViewerBody}
      </p>

      {canCreate && (
        <button
          type="button"
          onClick={() => create()}
          className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[color:var(--accent)] px-3.5 py-1.5 font-grotesk text-[12.5px] font-medium text-[color:var(--on-accent)] transition-opacity duration-200 ease-out hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          {label}
        </button>
      )}

      {!touring && (
        <button
          type="button"
          onClick={openOffer}
          className="cursor-pointer font-mono-ui text-[10.5px] tracking-[0.06em] text-[color:var(--text-subtle)] lowercase underline-offset-4 transition-colors duration-200 ease-out hover:text-[color:var(--text-muted)] hover:underline focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none"
        >
          {t.platform.onboarding.emptyPlatformAction}
        </button>
      )}
    </div>
  );
};
