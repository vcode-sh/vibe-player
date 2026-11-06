import type { ReactNode } from "react";
import { VibePlayerTooltip } from "./vibe-player-tooltip";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";

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
  const { classNames } = useVibePlayerUI();
  return (
    <VibePlayerTooltip align={tooltipAlign} label={label} shortcut={shortcut}>
      <button
        aria-label={label}
        className={vibePlayerClassName(
          "vibe-player-controls__button",
          classNames.button
        )}
        data-active={active}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    </VibePlayerTooltip>
  );
}
