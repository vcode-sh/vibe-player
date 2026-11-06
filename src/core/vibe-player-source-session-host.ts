import type { VibePlayerControllerState } from "./vibe-player-controller-types";
import type { VibePlayerSnapshot } from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

/** Controller operations a source session drives. */
export interface SourceSessionHost {
  attach(source: VibePlayerSource): Promise<void>;
  command(command: "play" | "pause"): Promise<void>;
  fail(cause: unknown): void;
  getState(): VibePlayerControllerState;
  hasAdapter(): boolean;
  prepare(source: VibePlayerSource): Promise<void>;
  renewed(previous: VibePlayerSource, source: VibePlayerSource): void;
  /** A media delivery renewal started (true) or settled/was cancelled (false). */
  renewing(active: boolean): void;
  restore(snapshot: VibePlayerSnapshot): Promise<void>;
  suspend(loading: boolean): Promise<void>;
}
