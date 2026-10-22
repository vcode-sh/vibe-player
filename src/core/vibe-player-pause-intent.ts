import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
} from "./vibe-player-types";

/** Protects a pending pause until the provider acknowledges that it stopped. */
export class VibePlayerPauseIntent {
  private pending = false;

  begin(command: "play" | "pause", adapter: VibePlayerAdapter | null): void {
    this.pending =
      command === "pause" &&
      Boolean(adapter?.capabilities.supportsPlayback) &&
      !adapter?.getSnapshot().paused;
  }

  clear(): void {
    this.pending = false;
  }

  shouldPreserve(event: VibePlayerAdapterEvent): boolean {
    if (
      event.type === "ended" ||
      event.type === "error" ||
      (event.type === "pause" && event.snapshot.paused)
    ) {
      this.clear();
    }
    return this.pending && !event.snapshot.paused;
  }
}
