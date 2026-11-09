import type { VibePlayerController } from "./vibe-player-controller";
import type { VibePlayerControllerParts } from "./vibe-player-controller-parts";
import { trackVibePlayerController } from "./vibe-player-controller-registry";
import { runVibePlayerControllerRetireHooks } from "./vibe-player-controller-retirement";

/**
 * Silences the host first, so releasing media reports nothing: no pending
 * watched batch, no `closed` analytics, no resume save, no listener or
 * callback. The state turns idle at once (unregistering the controller),
 * then retire hooks run (page-wide claims, a mounted React binding's last
 * render) and the media is released.
 */
export function retireVibePlayerControllerParts(
  controller: VibePlayerController,
  parts: Pick<
    VibePlayerControllerParts,
    "observers" | "poster" | "runtime" | "session"
  >
): Promise<void> {
  parts.observers.retire();
  parts.observers.reset();
  trackVibePlayerController(controller, null);
  runVibePlayerControllerRetireHooks(controller);
  parts.poster.reset();
  parts.session.clear();
  return parts.runtime.teardown().catch(() => undefined);
}
