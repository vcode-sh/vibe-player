import type { VibePlayerController } from "./vibe-player-controller";

const hooks = new WeakMap<VibePlayerController, Set<() => void>>();

/**
 * Runs `hook` once when `controller` retires, so page-wide claims (audio
 * focus, Media Session) release without the controller importing them.
 * Returns a function that drops the hook.
 */
export function onVibePlayerControllerRetire(
  controller: VibePlayerController,
  hook: () => void
): () => void {
  const registered = hooks.get(controller) ?? new Set<() => void>();
  hooks.set(controller, registered);
  const entry = () => hook();
  registered.add(entry);
  return () => {
    registered.delete(entry);
  };
}

/** Called by `retire()`; every hook runs even when another one throws. */
export function runVibePlayerControllerRetireHooks(
  controller: VibePlayerController
): void {
  const registered = hooks.get(controller);
  hooks.delete(controller);
  for (const hook of registered ?? []) {
    try {
      hook();
    } catch {
      // A retired player reports nothing; the remaining releases still run.
    }
  }
}
