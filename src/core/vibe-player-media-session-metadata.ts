import type {
  VibePlayerMediaSessionArtwork,
  VibePlayerMediaSessionMetadata,
} from "./vibe-player-media-session-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

type Artwork = readonly VibePlayerMediaSessionArtwork[] | undefined;

function createMetadataInit(
  { album, artist, title }: VibePlayerMediaSessionMetadata,
  artwork: Artwork,
  source: VibePlayerSource | null
): MediaMetadataInit {
  const poster = source?.posterUrl;
  const images = artwork ?? (poster ? [{ src: poster }] : []);
  return {
    album: album ?? "",
    artist: artist ?? "",
    artwork: images.map(({ sizes, src, type }) => ({
      src,
      ...(sizes ? { sizes } : {}),
      ...(type ? { type } : {}),
    })),
    title: title ?? source?.title ?? "",
  };
}

/**
 * One player's Media Session metadata. An artwork function runs once per
 * source object (a renewal brings a new one), never because the host passed
 * a new function or options object, so signed artwork is not re-signed or
 * refetched on every render.
 */
export class VibePlayerMediaSessionMetadataState {
  private key = "";
  private artworkSource: VibePlayerSource | null = null;
  private artwork: Artwork;

  /** The metadata to publish, or `null` when it did not change. */
  next(
    metadata: VibePlayerMediaSessionMetadata,
    source: VibePlayerSource | null
  ): MediaMetadataInit | null {
    const init = createMetadataInit(
      metadata,
      this.resolveArtwork(metadata.artwork, source),
      source
    );
    const key = JSON.stringify(init);
    if (key === this.key) {
      return null;
    }
    this.key = key;
    return init;
  }

  /** The next call publishes again, e.g. after the session was reclaimed. */
  forget(): void {
    this.key = "";
  }

  /** A failing function means no artwork; the poster stands in. */
  private resolveArtwork(
    artwork: VibePlayerMediaSessionMetadata["artwork"],
    source: VibePlayerSource | null
  ): Artwork {
    if (typeof artwork !== "function") {
      return artwork;
    }
    if (!source) {
      return;
    }
    if (source !== this.artworkSource) {
      this.artworkSource = source;
      try {
        this.artwork = artwork(source);
      } catch {
        this.artwork = undefined;
      }
    }
    return this.artwork;
  }
}
