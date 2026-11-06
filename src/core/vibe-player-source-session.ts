import type {
  VibePlayerControllerOptions,
  VibePlayerLoadMode,
} from "./vibe-player-controller-types";
import type {
  VibePlayerAdapterEvent,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import {
  canRenew,
  expiresSoon,
  getRecoveryPosition,
  isPlayableSnapshot,
} from "./vibe-player-source-recovery";
import type { SourceSessionHost } from "./vibe-player-source-session-host";
import type { VibePlayerSource } from "./vibe-player-source-types";

/** Owns one renewable delivery and fences every asynchronous attachment. */
export class VibePlayerSourceSession {
  private generation = 0;
  private wantsPlay = false;
  private retried = false;
  private source: VibePlayerSource | null = null;
  private attachment: Promise<void> | null = null;
  private renewal: Promise<void> | null = null;
  private position: VibePlayerSnapshot | null = null;
  private lastGoodPosition: VibePlayerSnapshot | null = null;
  private readonly host: SourceSessionHost;
  private readonly options: VibePlayerControllerOptions;

  constructor(host: SourceSessionHost, options: VibePlayerControllerOptions) {
    this.host = host;
    this.options = options;
  }

  get playbackRequested(): boolean {
    return this.wantsPlay;
  }

  load(source: VibePlayerSource, mode: VibePlayerLoadMode): Promise<void> {
    this.clear();
    this.source = source;
    this.retried = false;
    if (mode !== "eager") {
      return this.host.prepare(source);
    }
    return this.attach(source);
  }

  async activate(): Promise<void> {
    const pending = this.renewal ?? this.attachment;
    if (pending) {
      await pending;
      return;
    }
    if (this.source && !this.host.hasAdapter()) {
      await this.attach(this.source);
    }
  }

  play(): Promise<void> {
    this.wantsPlay = true;
    const { generation, source } = this;
    if (!source) {
      return Promise.resolve();
    }
    if (expiresSoon(source) && this.options.renewSource && !this.retried) {
      return this.renew();
    }
    if (
      this.host.hasAdapter() &&
      !this.attachment &&
      !this.renewal &&
      this.host.getState().snapshot.readyState !== "ended"
    ) {
      return this.host.command("play");
    }
    return this.playActivated(generation);
  }

  private async playActivated(generation: number): Promise<void> {
    await this.activate();
    if (generation === this.generation && this.wantsPlay) {
      if (this.host.getState().snapshot.readyState === "ended") {
        await this.host.restore({
          ...this.host.getState().snapshot,
          currentTime: 0,
        });
      }
      if (generation === this.generation && this.wantsPlay) {
        await this.host.command("play");
      }
    }
  }

  /** Swaps an idle delivery for a renewed one; attached media keeps its own. */
  replaceIdle(previous: VibePlayerSource, next: VibePlayerSource): boolean {
    const busy = this.attachment || this.renewal || this.host.hasAdapter();
    if (busy || this.source !== previous) {
      return false;
    }
    this.source = next;
    return true;
  }

  pause(): void {
    this.wantsPlay = false;
  }

  async stop(): Promise<void> {
    this.position ??= this.capturePosition();
    this.cancel();
    await this.host.suspend(false);
  }

  async retry(): Promise<void> {
    this.wantsPlay = true;
    this.retried = false;
    if (this.options.renewSource) {
      await this.renew();
    } else {
      const { generation } = this;
      this.position ??= this.capturePosition();
      await this.host.suspend(true);
      if (generation === this.generation && this.wantsPlay) {
        await this.play();
      }
    }
  }

  cancel(): void {
    this.generation += 1;
    this.wantsPlay = false;
    this.attachment = null;
    if (this.renewal) {
      this.renewal = null;
      this.host.renewing(false);
    }
  }

  clear(): void {
    this.cancel();
    this.source = null;
    this.position = null;
    this.lastGoodPosition = null;
  }

  private capturePosition(): VibePlayerSnapshot {
    return getRecoveryPosition(
      this.host.getState().snapshot,
      this.position,
      this.lastGoodPosition
    );
  }

  handle(event: VibePlayerAdapterEvent): boolean {
    if (event.type === "timeupdate" && isPlayableSnapshot(event.snapshot)) {
      this.lastGoodPosition = event.snapshot;
    }
    if (event.type === "playing") {
      this.retried = false;
      this.wantsPlay = true;
    } else if (event.type === "play") {
      this.wantsPlay = true;
    } else if (
      (event.type === "pause" && event.snapshot.readyState !== "error") ||
      event.type === "ended"
    ) {
      this.wantsPlay = false;
    }
    if (!(canRenew(event) && this.options.renewSource && this.source)) {
      return false;
    }
    if (this.renewal) {
      return true;
    }
    if (this.retried) {
      return false;
    }
    this.position = getRecoveryPosition(
      event.snapshot,
      this.host.getState().snapshot,
      this.lastGoodPosition
    );
    this.renew().catch(() => undefined);
    return true;
  }

  private attach(source: VibePlayerSource, renewing = false): Promise<void> {
    const { generation, position } = this;
    const pending = this.host
      .attach(source)
      .catch(async (cause: unknown) => {
        if (!renewing && generation === this.generation && this.renewal) {
          await this.renewal;
          return;
        }
        throw cause;
      })
      .then(async () => {
        if (generation === this.generation && position) {
          await this.host.restore(position);
          if (generation === this.generation) {
            this.position = null;
          }
        }
      });
    this.attachment = pending;
    pending
      .finally(() => {
        if (this.attachment === pending) {
          this.attachment = null;
        }
      })
      .catch(() => undefined);
    return pending;
  }

  private renew(): Promise<void> {
    if (this.renewal) {
      return this.renewal;
    }
    const { generation, source } = this;
    const renew = this.options.renewSource;
    if (!(source && renew)) {
      return Promise.resolve();
    }
    this.retried = true;
    this.position ??= this.capturePosition();
    const pending = this.renewAndAttach(source, renew, generation);
    this.renewal = pending;
    this.host.renewing(true);
    pending
      .finally(() => {
        if (this.renewal === pending) {
          this.renewal = null;
          this.host.renewing(false);
        }
      })
      .catch(() => undefined);
    return pending;
  }

  private async renewAndAttach(
    previous: VibePlayerSource,
    renew: () => Promise<VibePlayerSource>,
    generation: number
  ): Promise<void> {
    try {
      await this.host.suspend(true);
      if (generation !== this.generation) {
        return;
      }
      const source = await renew();
      if (generation !== this.generation) {
        return;
      }
      this.source = source;
      await this.attach(source, true);
      if (generation !== this.generation) {
        return;
      }
      this.host.renewed(previous, source);
      if (generation === this.generation && this.wantsPlay) {
        await this.host.command("play");
      }
    } catch (cause) {
      if (generation === this.generation) {
        this.host.fail(cause);
      }
    }
  }
}
