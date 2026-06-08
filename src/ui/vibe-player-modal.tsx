import type { PropsWithChildren, ReactNode } from "react";
import { VibePlayerShell } from "./vibe-player-shell";

export interface VibePlayerModalProps extends PropsWithChildren {
  footer?: ReactNode;
  header?: ReactNode;
  open: boolean;
  title?: string;
}

export function VibePlayerModal({
  children,
  footer,
  header,
  open,
  title,
}: VibePlayerModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div aria-modal="true" className="vibe-player-modal" role="dialog">
      <div className="vibe-player-modal__backdrop" />
      <div className="vibe-player-modal__panel">
        <VibePlayerShell footer={footer} header={header} title={title}>
          {children}
        </VibePlayerShell>
      </div>
    </div>
  );
}
