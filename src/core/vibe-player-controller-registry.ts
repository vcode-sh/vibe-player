import type { VibePlayerController } from "./vibe-player-controller";
import { VibePlayerLatestNotifier } from "./vibe-player-latest-notifier";
import type { VibePlayerSource } from "./vibe-player-source-types";

/** Live controllers in registration order, with their current source id. */
const live = new Map<VibePlayerController, string>();
const notifier = new VibePlayerLatestNotifier(() => getVibePlayerControllers());

/**
 * Internal: a controller reports its current source after every change. A
 * source registers it, `null` (closed, torn down) unregisters it, and a
 * retired controller never registers again.
 */
export function trackVibePlayerController(
  controller: VibePlayerController,
  source: VibePlayerSource | null
): void {
  if (!source || controller.retired) {
    if (live.delete(controller)) {
      notifier.publish();
    }
    return;
  }
  const previous = live.get(controller);
  live.set(controller, source.id);
  if (previous !== source.id) {
    notifier.publish();
  }
}

/**
 * The page's live controllers: every controller with a current source (an
 * attached or lazily prepared one) that has not been closed, torn down or
 * retired, in the order they registered. Pass `sourceId` to list only those
 * whose current source has that id, for example to find every player of
 * one video before signing it out. The list is a snapshot; it never changes
 * after it is returned.
 */
export function getVibePlayerControllers(
  sourceId?: string
): readonly VibePlayerController[] {
  const controllers: VibePlayerController[] = [];
  for (const [controller, id] of live) {
    if (sourceId === undefined || id === sourceId) {
      controllers.push(controller);
    }
  }
  return controllers;
}

/**
 * Calls `listener` with the live controllers whenever one registers,
 * unregisters or changes its current source id. A change made while
 * listeners run restarts the delivery with the newer list; a throwing
 * listener cannot stop the others. Returns the unsubscribe function.
 */
export function subscribeVibePlayerControllers(
  listener: (controllers: readonly VibePlayerController[]) => void
): () => void {
  return notifier.add(listener);
}
