import type { ReactNode } from "react";
import { isVibePlayerSurfacePlaying } from "./vibe-player-surface-phase";
import type {
  VibePlayerCompactSlots,
  VibePlayerSurface,
  VibePlayerSurfacePhase,
} from "./vibe-player-surface-types";
import type { VibePlayerLabels } from "./vibe-player-ui-types";

export interface VibePlayerSkinProps {
  slots?: VibePlayerCompactSlots | undefined;
  surface: VibePlayerSurface;
}

/** A host slot for the current phase: `undefined` keeps the default parts. */
export function renderVibePlayerSlot(
  { slots, surface }: VibePlayerSkinProps,
  phase: keyof VibePlayerCompactSlots
): { custom: boolean; node: ReactNode } {
  const slot = surface.state.phase === phase ? slots?.[phase] : undefined;
  if (slot === undefined) {
    return { custom: false, node: null };
  }
  return { custom: true, node: slot ? slot(surface) : null };
}

/** The primary action's accessible name for a phase. */
export function getVibePlayerPrimaryLabel(
  phase: VibePlayerSurfacePhase,
  labels: VibePlayerLabels
): string {
  if (phase === "ended") {
    return labels.replay;
  }
  if (phase === "loading") {
    return labels.loading;
  }
  return isVibePlayerSurfacePlaying(phase) ? labels.pause : labels.play;
}
