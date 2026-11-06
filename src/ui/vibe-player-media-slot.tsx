import { memo } from "react";
import { vibePlayerClassName } from "./vibe-player-ui-context";

export interface VibePlayerMediaSlotProps {
  className?: string | undefined;
  onTarget: (element: HTMLDivElement | null) => void;
}

export const VibePlayerMediaSlot = memo(function VibePlayerMediaSlotContent({
  className,
  onTarget,
}: VibePlayerMediaSlotProps) {
  return (
    <div
      className={vibePlayerClassName("vibe-player-stage__media", className)}
      ref={onTarget}
    />
  );
});
