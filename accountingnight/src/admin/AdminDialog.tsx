import type { MouseEvent, PropsWithChildren } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface AdminDialogProps extends PropsWithChildren {
  titleId: string;
  onClose: () => void;
  wide?: boolean;
}

export function AdminDialog({ titleId, onClose, wide = false, children }: AdminDialogProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="admin-dialog-backdrop" role="presentation" onMouseDown={handleBackdrop}>
      <div
        ref={dialogRef}
        className={`admin-dialog ${wide ? 'admin-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
