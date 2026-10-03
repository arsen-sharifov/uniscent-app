import type { IReferenceSearchPanelContentProps } from '@/components/Canvas/fragments';

import { nodeReference } from './canvas';

export const referenceSearchProps = (): Omit<IReferenceSearchPanelContentProps, 'onSelect' | 'onClose'> => ({
  nodes: [nodeReference('r1'), nodeReference('r2')],
  loading: false,
  position: { x: 100, y: 200 },
  screenPosition: { x: 300, y: 400 },
});
