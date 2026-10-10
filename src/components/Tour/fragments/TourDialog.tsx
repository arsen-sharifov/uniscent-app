import type { ReactNode } from 'react';

import { Modal } from '@/components/Modal';

interface ITourDialogProps {
  open: boolean;
  onClose: () => void;
  width: string;
  labelledBy: string;
  children: ReactNode;
}

export const TourDialog = ({ open, onClose, width, labelledBy, children }: ITourDialogProps) => (
  <Modal open={open} onClose={onClose} width={width} layerClassName="z-80" labelledBy={labelledBy}>
    <div data-tour-panel className="p-6">
      {children}
    </div>
  </Modal>
);
