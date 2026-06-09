export function isInteractiveClickTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(
    target.closest(
      "a, button, input, select, textarea, .vibe-player-controls__top, .vibe-player-controls__bottom"
    )
  );
}
