import type { PropsWithChildren, ReactNode } from "react";
import type { VibePlayerSource } from "../core";
import { VibePlayerShell } from "./vibe-player-shell";
import { VibePlayerStage } from "./vibe-player-stage";
import type { VibePlayerPlaybackOptions } from "./vibe-player-stage-types";

export interface VibePlayerInlineProps
  extends PropsWithChildren,
    VibePlayerPlaybackOptions {
  footer?: ReactNode;
  header?: ReactNode;
  source?: VibePlayerSource | null;
  title?: string;
}

export function VibePlayerInline({
  children,
  footer,
  header,
  source = null,
  title,
  ...playback
}: VibePlayerInlineProps) {
  const playerTitle = title ?? source?.title;
  return (
    <div className="vibe-player-inline">
      <VibePlayerShell footer={footer} header={header} title={playerTitle}>
        {source ? (
          <VibePlayerStage {...playback} source={source} title={playerTitle} />
        ) : (
          children
        )}
      </VibePlayerShell>
    </div>
  );
}
