import { useEffect, useRef, useState } from "react";
import type { VibePlayerBackgroundLayerState } from "./vibe-player-preview-types";

export interface VibePlayerBackgroundLayerProps
  extends VibePlayerBackgroundLayerState {
  onFrameReady: (layerId: string) => void;
  paused: boolean;
}

export function VibePlayerBackgroundLayer({
  fallbackPosterUrl,
  id,
  onFrameReady,
  paused,
  posterUrl,
  previewVideoUrl,
  visible,
}: VibePlayerBackgroundLayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [frameReady, setFrameReady] = useState(false);

  useEffect(() => {
    if (!previewVideoUrl) {
      onFrameReady(id);
      return;
    }
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const markFrameReady = () => {
      setFrameReady(true);
      onFrameReady(id);
    };
    if (hasRenderableFrame(video)) {
      markFrameReady();
    }
    video.addEventListener("canplay", markFrameReady);
    video.addEventListener("loadeddata", markFrameReady);
    video.addEventListener("playing", markFrameReady);
    return () => {
      video.removeEventListener("canplay", markFrameReady);
      video.removeEventListener("loadeddata", markFrameReady);
      video.removeEventListener("playing", markFrameReady);
    };
  }, [id, onFrameReady, previewVideoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!(video && previewVideoUrl)) {
      return;
    }
    if (paused || prefersReducedMotion()) {
      video.pause();
      return;
    }

    playBackgroundVideo(video);
    if (typeof window.IntersectionObserver === "undefined") {
      return;
    }

    const observer = new window.IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting && !paused) {
        playBackgroundVideo(video);
        return;
      }
      video.pause();
    });

    observer.observe(video);
    return () => observer.disconnect();
  }, [paused, previewVideoUrl]);

  return (
    <>
      <div
        aria-hidden
        className="vibe-player-background-preview__poster"
        data-visible={visible}
        style={{
          backgroundImage: getBackgroundImage(posterUrl, fallbackPosterUrl),
        }}
      />
      {previewVideoUrl ? (
        <video
          aria-hidden
          className="vibe-player-background-preview__video"
          data-frame-ready={frameReady}
          data-visible={visible && frameReady}
          loop
          muted
          playsInline
          preload="metadata"
          ref={videoRef}
          src={previewVideoUrl}
        />
      ) : null}
    </>
  );
}

function getBackgroundImage(
  posterUrl: string,
  fallbackPosterUrl: string | undefined
): string {
  const primary = `url(${JSON.stringify(posterUrl)})`;
  if (fallbackPosterUrl && fallbackPosterUrl !== posterUrl) {
    return `${primary}, url(${JSON.stringify(fallbackPosterUrl)})`;
  }
  return primary;
}

function hasRenderableFrame(video: HTMLVideoElement): boolean {
  return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
}

function playBackgroundVideo(video: HTMLVideoElement): void {
  video.play().catch(() => {
    // Muted preview autoplay is best-effort and must never break rendering.
  });
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
