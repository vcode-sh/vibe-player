import type { ReactNode } from "react";
import { VibePlayerTooltip } from "./vibe-player-tooltip";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";

interface VibePlayerToggleButtonProps {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
  /** Exposes `aria-pressed` for a two-state toggle such as fullscreen. */
  pressed?: boolean | undefined;
  shortcut?: string | undefined;
  tooltipAlign?: "center" | "end" | "start";
}

export function VibePlayerToggleButton({
  active,
  children,
  label,
  onClick,
  pressed,
  shortcut,
  tooltipAlign,
}: VibePlayerToggleButtonProps) {
  const { classNames } = useVibePlayerUI();
  return (
    <VibePlayerTooltip align={tooltipAlign} label={label} shortcut={shortcut}>
      <button
        aria-label={label}
        aria-pressed={pressed}
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
