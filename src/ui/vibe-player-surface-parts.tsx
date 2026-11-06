import type { ReactNode } from "react";
import { PauseIcon, PlayIcon, ReplayIcon } from "./vibe-player-icons";
import { vibePlayerClassName } from "./vibe-player-ui-context";

/**
 * Reveal attributes: hidden parts fade out, then lose visibility, and are
 * inert at once so neither Tab nor assistive technology reaches them.
 */
export function revealProps(
  visible: boolean,
  className: string,
  part: string,
  hostClass?: string
) {
  return {
    "aria-hidden": visible ? undefined : true,
    className: vibePlayerClassName(
      `vibe-player-surface__reveal ${className}`,
      hostClass
    ),
    "data-part": part,
    "data-visible": visible,
    inert: visible ? undefined : true,
  };
}

export interface VibePlayerSwapItem {
  icon: ReactNode;
  key: string;
  visible: boolean;
}

/** Icon crossfade with a short blur bridge; one item is visible at a time. */
export function VibePlayerSwap({ items }: { items: VibePlayerSwapItem[] }) {
  return (
    <span aria-hidden className="vibe-player-surface__swap">
      {items.map((item) => (
        <span
          className="vibe-player-surface__swap-item"
          data-visible={item.visible}
          key={item.key}
        >
          {item.icon}
        </span>
      ))}
    </span>
  );
}

export function VibePlayerSpinner() {
  return <span aria-hidden className="vibe-player-surface__spinner" />;
}

interface PlaybackSwapInput {
  busy: boolean;
  ended: boolean;
  playing: boolean;
}

/** Play, pause, spinner and replay as one morphing glyph. */
export function playbackSwapItems({
  busy,
  ended,
  playing,
}: PlaybackSwapInput): VibePlayerSwapItem[] {
  return [
    {
      icon: <PlayIcon />,
      key: "play",
      visible: !(busy || ended || playing),
    },
    { icon: <PauseIcon />, key: "pause", visible: playing && !busy },
    { icon: <VibePlayerSpinner />, key: "busy", visible: busy },
    { icon: <ReplayIcon />, key: "replay", visible: ended && !busy },
  ];
}
