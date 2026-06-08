export function getVibePlayerChromeClassName(
  hidden: boolean,
  direction: "top" | "bottom"
): string {
  if (!hidden) {
    return "vibe-player-controls__chrome--shown";
  }
  return direction === "top"
    ? "vibe-player-controls__chrome--hide-top"
    : "vibe-player-controls__chrome--hide-bottom";
}
