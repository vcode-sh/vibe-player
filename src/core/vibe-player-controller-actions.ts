import { runVibePlayerControllerCommand } from "./vibe-player-controller-command-error";
import {
  handleVibePlayerControllerPause,
  handleVibePlayerControllerPlay,
  handleVibePlayerControllerSeek,
} from "./vibe-player-controller-commands";
import type { VibePlayerEvent } from "./vibe-player-host-events";
import { VibePlayerPauseIntent } from "./vibe-player-pause-intent";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerState,
  VibePlayerResumeStore,
  VibePlayerSnapshot,
} from "./vibe-player-types";

interface ControllerActionsHost {
  adapter(): VibePlayerAdapter | null;
  emitAnalytics(event: VibePlayerAnalyticsEvent): void;
  emitEvent(event: VibePlayerEvent): void;
  generation(): number;
  state(): VibePlayerControllerState;
  sync(): void;
  update(next: Partial<VibePlayerControllerState>): void;
}

/** Commands preserve the latest intent even when provider acknowledgments race. */
export class VibePlayerControllerActions {
  private playbackGeneration = 0;
  private readonly pauseIntent = new VibePlayerPauseIntent();
  private readonly preferences: Partial<
    Pick<VibePlayerSnapshot, "muted" | "volume" | "playbackRate">
  > = {};
  private readonly host: ControllerActionsHost;
  private readonly resumeStore: VibePlayerResumeStore | undefined;

  constructor(
    host: ControllerActionsHost,
    resumeStore: VibePlayerResumeStore | undefined
  ) {
    this.host = host;
    this.resumeStore = resumeStore;
  }

  clear(): void {
    this.playbackGeneration += 1;
    this.pauseIntent.clear();
  }

  preservePause(event: VibePlayerAdapterEvent): boolean {
    return this.pauseIntent.shouldPreserve(event);
  }

  async restore(snapshot: VibePlayerSnapshot): Promise<void> {
    const adapter = this.host.adapter();
    const generation = this.host.generation();
    if (!adapter) {
      return;
    }
    if (snapshot.currentTime > 0 || snapshot.readyState === "ended") {
      await adapter.seekTo(snapshot.currentTime);
    }
    if (
      generation === this.host.generation() &&
      adapter === this.host.adapter()
    ) {
      this.host.sync();
    }
  }

  async applyPreferences(): Promise<void> {
    const adapter = this.host.adapter();
    if (!adapter) {
      return;
    }
    if (this.preferences.muted !== undefined) {
      await adapter.setMuted(this.preferences.muted);
    }
    if (this.preferences.volume !== undefined) {
      await adapter.setVolume(this.preferences.volume);
    }
    if (this.preferences.playbackRate !== undefined) {
      await adapter.setPlaybackRate(this.preferences.playbackRate);
    }
    this.host.sync();
  }

  playback(command: "play" | "pause"): Promise<void> {
    this.playbackGeneration += 1;
    const adapter = this.host.adapter();
    if (command === "pause" && !adapter) {
      this.host.update({
        lastEvent: "pause",
        snapshot: { ...this.host.state().snapshot, paused: true },
      });
    }
    if (!adapter && command === "pause") {
      this.host.update({
        snapshot: { ...this.host.state().snapshot, paused: true },
      });
    }
    this.pauseIntent.begin(command, adapter);
    const execute =
      command === "play"
        ? handleVibePlayerControllerPlay
        : handleVibePlayerControllerPause;
    return this.run(
      command,
      (updateState) => execute({ adapter, updateState }),
      this.playbackGeneration
    );
  }

  seekTo(seconds: number): Promise<void> {
    const adapter = this.host.adapter();
    const generation = this.host.generation();
    return this.run("seekTo", () =>
      handleVibePlayerControllerSeek({
        adapter,
        currentSource: this.host.state().currentSource,
        emitAnalytics: this.host.emitAnalytics,
        isCurrent: () =>
          generation === this.host.generation() &&
          adapter === this.host.adapter(),
        resumeStore: this.resumeStore,
        seconds,
        syncFromAdapter: () => this.host.sync(),
      })
    );
  }

  setMuted(value: boolean): Promise<void> {
    this.preferences.muted = value;
    return this.preference("setMuted", { muted: value }, () =>
      this.host.adapter()?.setMuted(value)
    );
  }

  setVolume(value: number): Promise<void> {
    this.preferences.volume = value;
    return this.preference("setVolume", { volume: value }, () =>
      this.host.adapter()?.setVolume(value)
    );
  }

  setPlaybackRate(value: number): Promise<void> {
    this.preferences.playbackRate = value;
    return this.preference("setPlaybackRate", { playbackRate: value }, () =>
      this.host.adapter()?.setPlaybackRate(value)
    );
  }

  setQuality(value: string): Promise<void> {
    return this.run("setQuality", () =>
      this.host.adapter()?.setQuality?.(value)
    );
  }

  presentation(
    command:
      | "enterFullscreen"
      | "exitFullscreen"
      | "enterPictureInPicture"
      | "exitPictureInPicture"
  ): Promise<void> {
    return this.run(command, () => this.host.adapter()?.[command]?.());
  }

  private preference(
    command: string,
    snapshot: Partial<VibePlayerSnapshot>,
    execute: () => Promise<void> | undefined
  ): Promise<void> {
    if (!this.host.adapter()) {
      this.host.update({
        snapshot: { ...this.host.state().snapshot, ...snapshot },
      });
    }
    return this.run(command, execute);
  }

  private run(
    command: string,
    execute: (
      update: (next: Partial<VibePlayerControllerState>) => void
    ) => Promise<void> | undefined,
    playbackGeneration?: number
  ): Promise<void> {
    const generation = this.host.generation();
    const isCurrent = () =>
      generation === this.host.generation() &&
      (playbackGeneration === undefined ||
        playbackGeneration === this.playbackGeneration);
    const updateState = (next: Partial<VibePlayerControllerState>) => {
      if (isCurrent()) {
        if (next.lastEvent === "error") {
          this.pauseIntent.clear();
        }
        this.host.update(next);
      }
    };
    return runVibePlayerControllerCommand({
      adapter: this.host.adapter(),
      command,
      emitAnalytics: this.host.emitAnalytics,
      emitEvent: this.host.emitEvent,
      execute: () => execute(updateState),
      getState: this.host.state,
      isCurrent,
      updateState,
    });
  }
}
