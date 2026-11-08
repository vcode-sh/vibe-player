import { VibePlayerSkipGlyph } from "./vibe-player-skip-glyph";
import type { VibePlayerSeekRippleState } from "./vibe-player-tap-seek";
import { useVibePlayerUI } from "./vibe-player-ui-context";

/**
 * The double-tap indicator on the tapped side: a soft wash, a wave that plays
 * once per tap and the burst total. Decorative; it announces nothing.
 */
export function VibePlayerSeekRipple({
  ripple,
}: {
  ripple: VibePlayerSeekRippleState;
}) {
  const { labels } = useVibePlayerUI();
  return (
    <span
      aria-hidden
      className="vibe-player-seek-ripple"
      data-active={ripple.active}
      data-part="seek-ripple"
      data-side={ripple.side < 0 ? "backward" : "forward"}
    >
      <span
        className="vibe-player-seek-ripple__wave"
        key={ripple.side * ripple.count}
      />
      <span className="vibe-player-seek-ripple__label">
        <VibePlayerSkipGlyph side={ripple.side} />
        {labels.seekOffset(ripple.seconds)}
      </span>
    </span>
  );
}
