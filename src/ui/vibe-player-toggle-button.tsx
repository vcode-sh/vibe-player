import type { ReactNode } from "react";
import { VibePlayerTooltip } from "./vibe-player-tooltip";

interface VibePlayerToggleButtonProps {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string | undefined;
  tooltipAlign?: "center" | "end" | "start";
}

export function VibePlayerToggleButton({
  active,
  children,
  label,
  onClick,
  shortcut,
  tooltipAlign,
}: VibePlayerToggleButtonProps) {
  return (
    <VibePlayerTooltip align={tooltipAlign} label={label} shortcut={shortcut}>
      <button
        aria-label={label}
        className="vibe-player-controls__button"
        data-active={active}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    </VibePlayerTooltip>
  );
}
