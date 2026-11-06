import type { VibePlayerSource } from "./vibe-player-source-types";

interface PosterRenewalHost {
  /** The delivery shown while no engine is attached, or null. */
  idleSource(): VibePlayerSource | null;
  renewSource(): (() => Promise<VibePlayerSource>) | undefined;
  /** Installs the renewed delivery unless media attached meanwhile. */
  replace(previous: VibePlayerSource, next: VibePlayerSource): void;
}

export interface VibePlayerPosterRenewal {
  /** Play, stop or pause after a waiting Play supersedes it. */
  cancelWaits(): void;
  renew(): Promise<void>;
  /** A newly loaded delivery may renew once again. */
  reset(): void;
  /** Runs Play after a pending renewal so it uses the fresh delivery. */
  whenSettled(play: () => Promise<void>): Promise<void>;
}

/**
 * Renews an idle delivery at most once per load, e.g. after its private poster
 * grant expired. It never attaches media, and a renewed poster that fails
 * again cannot start another renewal.
 */
export function createVibePlayerPosterRenewal(
  host: PosterRenewalHost
): VibePlayerPosterRenewal {
  let used = false;
  let generation = 0;
  let waits = 0;
  let pending: Promise<void> | null = null;
  return {
    cancelWaits: () => {
      waits += 1;
    },
    renew() {
      const source = host.idleSource();
      const renew = host.renewSource();
      if (used || !(source && renew)) {
        return pending ?? Promise.resolve();
      }
      used = true;
      const current = generation;
      const request: Promise<void> = renew()
        .then((next) => {
          if (current === generation) {
            host.replace(source, next);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (pending === request) {
            pending = null;
          }
        });
      pending = request;
      return request;
    },
    reset: () => {
      used = false;
      pending = null;
      generation += 1;
      waits += 1;
    },
    whenSettled(play) {
      if (!pending) {
        return play();
      }
      waits += 1;
      const wait = waits;
      return pending.then(() => (wait === waits ? play() : undefined));
    },
  };
}
