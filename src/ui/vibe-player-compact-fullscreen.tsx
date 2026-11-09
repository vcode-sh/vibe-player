import { EnterFullscreenIcon, ExitFullscreenIcon } from "./vibe-player-icons";
import type { VibePlayerSurfaceState } from "./vibe-player-surface-types";
import type { VibePlayerLabels } from "./vibe-player-ui-types";

/**
 * Accessible name and state of a compact fullscreen toggle. The name stays
 * `labels.fullscreen` and `aria-pressed` carries the state (WAI-ARIA APG
 * toggle button). An `onExpand` button opens a host view, so it has none.
 */
export function getCompactFullscreenProps(
  state: VibePlayerSurfaceState,
  labels: Required<VibePlayerLabels>
) {
  return {
    "aria-label": labels.fullscreen,
    "aria-pressed": state.fullscreen ?? undefined,
  };
}

export function VibePlayerCompactFullscreenIcon({
  state,
}: {
  state: VibePlayerSurfaceState;
}) {
  return state.fullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />;
}
