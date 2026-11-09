import {
  notifyVibePlayerUnparked,
  vibePlayerParkingClass,
} from "../react/vibe-player-parking";

/** One hidden, inert root per document holds frames no host shows. */
const parkingRoots = new WeakMap<Document, HTMLElement>();

function isParkingRoot(element: Element | null): boolean {
  return (
    element !== null && parkingRoots.get(element.ownerDocument) === element
  );
}

function getParkingRoot(document: Document): HTMLElement {
  const existing = parkingRoots.get(document);
  if (existing?.isConnected) {
    return existing;
  }
  const root = document.createElement("div");
  root.className = vibePlayerParkingClass;
  root.inert = true;
  root.setAttribute("aria-hidden", "true");
  // Off-screen rather than `display: none`, so media keeps decoding.
  root.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none";
  document.body.append(root);
  parkingRoots.set(document, root);
  return root;
}

/** Removes the now empty root `element` belonged to, if it was one. */
function releaseParkingRoot(element: Element | null): void {
  if (element && isParkingRoot(element) && element.childElementCount === 0) {
    element.remove();
    parkingRoots.delete(element.ownerDocument);
  }
}

/**
 * `moveBefore` keeps embedded frames and focus alive where browsers support
 * it; `append` is the same synchronous move, which a playing `<video>` survives.
 */
function moveFrame(frame: HTMLElement, host: HTMLElement): void {
  if (frame.parentElement === host) {
    return;
  }
  // Older engines lack `moveBefore` although the DOM types declare it.
  if (
    typeof host.moveBefore === "function" &&
    frame.isConnected &&
    host.isConnected
  ) {
    try {
      host.moveBefore(frame, null);
      return;
    } catch {
      // A cross-document move is not state-preserving; append instead.
    }
  }
  host.append(frame);
}

/**
 * Media the viewer left playing. Engines pause media that stays out of the
 * page past a microtask; a `pause` while detached is such an interruption,
 * so the media stays listed for `resume()`. Parking normally reconnects the
 * frame before engines pause, so this is a fallback. A resume the browser
 * refuses drops the media, so nothing retries it later.
 */
class PlayingMedia {
  private readonly playing = new Set<HTMLMediaElement>();

  readonly onPlay = (event: Event) => {
    if (event.target instanceof HTMLMediaElement) {
      this.playing.add(event.target);
    }
  };

  readonly onPause = (event: Event) => {
    const media = event.target;
    if (media instanceof HTMLMediaElement && media.isConnected) {
      this.playing.delete(media);
    }
  };

  resume(frame: HTMLElement): void {
    for (const media of this.playing) {
      if (!frame.contains(media)) {
        this.playing.delete(media);
      } else if (media.isConnected && media.paused && !media.ended) {
        media.play().catch(() => this.playing.delete(media));
      }
    }
  }
}

/**
 * The package-owned element a `VibePlayerHostFrame` renders into. It follows
 * the host while the host is on the page, waits in the parking root while it
 * is not, and resumes media a non-atomic move paused.
 */
export class VibePlayerHostDock {
  readonly frame: HTMLDivElement;
  private host: HTMLElement | null = null;
  private readonly media = new PlayingMedia();
  private readonly observer: MutationObserver;

  constructor(document: Document) {
    this.frame = document.createElement("div");
    this.frame.className = "vibe-player-host-frame";
    this.frame.style.display = "contents";
    // Media events do not bubble; capture still reaches the frame.
    this.frame.addEventListener("play", this.media.onPlay, true);
    this.frame.addEventListener("pause", this.media.onPause, true);
    this.observer = new MutationObserver(() => this.place());
    this.observer.observe(document, { childList: true, subtree: true });
    this.place();
  }

  /** `null` keeps the frame where it is while that host stays on the page. */
  follow(host: HTMLElement | null): void {
    this.host = host;
    this.place();
  }

  dispose(): void {
    this.observer.disconnect();
    this.frame.removeEventListener("play", this.media.onPlay, true);
    this.frame.removeEventListener("pause", this.media.onPause, true);
    const parent = this.frame.parentElement;
    this.frame.remove();
    releaseParkingRoot(parent);
  }

  /** Media resumes only when the frame actually moved, never per mutation. */
  private place(): void {
    const { frame, host } = this;
    const from = frame.parentElement;
    if (host?.isConnected) {
      moveFrame(frame, host);
    } else if (!frame.isConnected) {
      moveFrame(frame, getParkingRoot(frame.ownerDocument));
    }
    if (frame.parentElement === from) {
      return;
    }
    releaseParkingRoot(from);
    this.media.resume(frame);
    if (isParkingRoot(from)) {
      notifyVibePlayerUnparked();
    }
  }
}
