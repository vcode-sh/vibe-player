import type { PropsWithChildren, ReactNode } from "react";

export interface VibePlayerShellProps extends PropsWithChildren {
  footer?: ReactNode;
  header?: ReactNode;
  title?: string | undefined;
}

export function VibePlayerShell({
  children,
  footer,
  header,
  title,
}: VibePlayerShellProps) {
  return (
    <section className="vibe-player-shell">
      {header ? (
        <div className="vibe-player-shell__header">{header}</div>
      ) : null}
      {title ? <h2 className="vibe-player-shell__title">{title}</h2> : null}
      <div className="vibe-player-shell__body">{children}</div>
      {footer ? (
        <div className="vibe-player-shell__footer">{footer}</div>
      ) : null}
    </section>
  );
}
