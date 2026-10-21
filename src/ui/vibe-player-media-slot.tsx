import { memo } from "react";

export interface VibePlayerMediaSlotProps {
  onTarget: (element: HTMLDivElement | null) => void;
}

export const VibePlayerMediaSlot = memo(function VibePlayerMediaSlotContent({
  onTarget,
}: VibePlayerMediaSlotProps) {
  return <div className="vibe-player-stage__media" ref={onTarget} />;
});
