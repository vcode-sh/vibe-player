import { vi } from "vitest";

type Handler = (details: MediaSessionActionDetails) => void;

/** Records what a page writes to `navigator.mediaSession`. */
export class FakeMediaSession {
  readonly handlers = new Map<string, Handler>();
  metadata: MediaMetadata | null = null;
  playbackState: MediaSessionPlaybackState = "none";
  readonly positions: (MediaPositionState | undefined)[] = [];
  /** Actions this fake browser rejects with a TypeError. */
  readonly unsupported = new Set<string>();

  setActionHandler(action: string, handler: Handler | null): void {
    if (this.unsupported.has(action)) {
      throw new TypeError(`Unknown media session action: ${action}`);
    }
    if (handler) {
      this.handlers.set(action, handler);
    } else {
      this.handlers.delete(action);
    }
  }

  setPositionState(state?: MediaPositionState): void {
    this.positions.push(state);
  }

  /** Invokes a registered handler the way system controls would. */
  trigger(action: string, details: Partial<MediaSessionActionDetails> = {}) {
    const handler = this.handlers.get(action);
    if (!handler) {
      throw new Error(`No handler for ${action}`);
    }
    handler({ action, ...details } as MediaSessionActionDetails);
  }

  get actions(): string[] {
    return [...this.handlers.keys()].sort();
  }
}

class FakeMediaMetadata {
  album: string;
  artist: string;
  artwork: readonly MediaImage[];
  title: string;

  constructor(init: MediaMetadataInit = {}) {
    this.album = init.album ?? "";
    this.artist = init.artist ?? "";
    this.artwork = init.artwork ?? [];
    this.title = init.title ?? "";
  }
}

export function installFakeMediaSession(): FakeMediaSession {
  const session = new FakeMediaSession();
  vi.stubGlobal("MediaMetadata", FakeMediaMetadata);
  Object.defineProperty(navigator, "mediaSession", {
    configurable: true,
    value: session,
  });
  return session;
}

export function uninstallFakeMediaSession(): void {
  Reflect.deleteProperty(navigator, "mediaSession");
  vi.unstubAllGlobals();
}
