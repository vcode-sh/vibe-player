import { useEffect, useRef, useState } from "react";

/** A decoder-level oracle independent of controller resume state. */
export function useOriginalMediaTime() {
  const frame = useRef<HTMLDivElement>(null);
  const [originalTime, setOriginalTime] = useState(0);
  const [renewedStart, setRenewedStart] = useState<number | null>(null);
  useEffect(() => {
    const element = frame.current;
    if (!element) {
      return;
    }
    let originalVideo: HTMLVideoElement | null = null;
    let renewedVideo: HTMLVideoElement | null = null;
    const sample = () => {
      if (originalVideo) {
        const seconds = originalVideo.currentTime;
        setOriginalTime((previous) => Math.max(previous, seconds));
      }
    };
    const recordRenewedStart = () => {
      if (renewedVideo) {
        setRenewedStart(renewedVideo.currentTime);
      }
    };
    const watch = () => {
      const video = element.querySelector("video");
      if (!originalVideo && video) {
        originalVideo = video;
        originalVideo?.addEventListener("timeupdate", sample);
      } else if (video && video !== originalVideo && !renewedVideo) {
        renewedVideo = video;
        renewedVideo.addEventListener("playing", recordRenewedStart, {
          once: true,
        });
      }
    };
    const observer = new MutationObserver(watch);
    observer.observe(element, { childList: true, subtree: true });
    watch();
    return () => {
      observer.disconnect();
      originalVideo?.removeEventListener("timeupdate", sample);
      renewedVideo?.removeEventListener("playing", recordRenewedStart);
    };
  }, []);
  return { frame, originalTime, renewedStart };
}
