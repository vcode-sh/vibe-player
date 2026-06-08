import type { PropsWithChildren, ReactNode } from "react";
import { VibePlayerShell } from "./vibe-player-shell";

export interface VibePlayerInlineProps extends PropsWithChildren {
  footer?: ReactNode;
  header?: ReactNode;
  title?: string;
}

export function VibePlayerInline({
  children,
  footer,
  header,
  title,
}: VibePlayerInlineProps) {
  return (
    <div className="vibe-player-inline">
      <VibePlayerShell footer={footer} header={header} title={title}>
        {children}
      </VibePlayerShell>
    </div>
  );
}
