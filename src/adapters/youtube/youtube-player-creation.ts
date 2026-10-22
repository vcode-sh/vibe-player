import type {
  YouTubeIframeApi,
  YouTubeIframePlayerOptions,
  YouTubePlayerHandle,
  YouTubePlayerSession,
  YouTubePlayerState,
} from "./youtube-iframe-types";

class YouTubePlayerCreation {
  private player: YouTubePlayerHandle | null = null;
  private ready = false;
  private settled = false;
  private readonly session: YouTubePlayerSession;
  private readonly resolve: (player: YouTubePlayerHandle) => void;
  private readonly reject: (cause: unknown) => void;

  constructor(
    session: YouTubePlayerSession,
    resolve: (player: YouTubePlayerHandle) => void,
    reject: (cause: unknown) => void
  ) {
    this.session = session;
    this.resolve = resolve;
    this.reject = reject;
  }

  start(api: YouTubeIframeApi): void {
    if (this.session.signal?.aborted) {
      this.abort();
      return;
    }
    this.session.signal?.addEventListener("abort", this.abort, { once: true });
    try {
      this.player = new api.Player(this.session.element, this.createOptions());
      if (this.session.signal?.aborted) {
        this.player.destroy();
      } else if (this.ready) {
        this.handleReady();
      }
    } catch (cause) {
      this.cleanup();
      this.reject(cause);
    }
  }

  private readonly abort = (): void => {
    if (this.settled) {
      return;
    }
    this.settled = true;
    this.cleanup();
    this.player?.destroy();
    this.reject(
      new DOMException("YouTube player creation cancelled.", "AbortError")
    );
  };

  private readonly handleReady = (): void => {
    if (this.settled || this.session.signal?.aborted) {
      return;
    }
    this.ready = true;
    if (!this.player) {
      return;
    }
    this.settled = true;
    this.cleanup();
    this.player
      .getIframe?.()
      .classList.add("vibe-player-youtube-adapter-frame");
    this.resolve(this.player);
    this.session.onReady();
  };

  private cleanup(): void {
    this.session.signal?.removeEventListener("abort", this.abort);
  }

  private createOptions(): YouTubeIframePlayerOptions {
    const { session } = this;
    return {
      events: {
        onAutoplayBlocked: () => {
          if (!session.signal?.aborted) {
            session.onAutoplayBlocked?.();
          }
        },
        onError: (event) => {
          if (!session.signal?.aborted) {
            session.onError({
              code: event.data,
              message: `YouTube player error ${event.data}`,
            });
          }
        },
        onPlaybackRateChange: () => {
          if (!session.signal?.aborted) {
            session.onPlaybackRateChange();
          }
        },
        onReady: this.handleReady,
        onStateChange: (event) => {
          if (!session.signal?.aborted) {
            session.onStateChange(event.data as YouTubePlayerState);
          }
        },
      },
      playerVars: {
        ...(session.captionLanguage
          ? { cc_lang_pref: session.captionLanguage }
          : {}),
        ...(session.showCaptionsByDefault
          ? { cc_load_policy: 1 as const }
          : {}),
        controls: session.controls === "native" ? 1 : 0,
        origin: session.origin || window.location.origin,
        playsinline: 1,
        rel: 0,
        ...(session.startSeconds
          ? { start: Math.floor(session.startSeconds) }
          : {}),
        ...(session.widgetReferrer
          ? { widget_referrer: session.widgetReferrer }
          : {}),
      },
      videoId: session.videoId,
    };
  }
}

/** Resolves only when the official SDK has made the player handle usable. */
export function createReadyYouTubePlayer(
  api: YouTubeIframeApi,
  session: YouTubePlayerSession
): Promise<YouTubePlayerHandle> {
  return new Promise((resolve, reject) => {
    new YouTubePlayerCreation(session, resolve, reject).start(api);
  });
}
