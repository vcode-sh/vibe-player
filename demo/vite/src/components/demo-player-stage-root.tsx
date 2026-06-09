import { shouldRevealVibePlayerChromeForKey } from "@vibe-code/vibe-player";
import type { ReactNode } from "react";
import { isInteractiveClickTarget } from "./demo-player-stage-dom";

interface DemoPlayerStageRootProps {
  children: ReactNode;
  chromeHidden: boolean;
  holdChrome: () => void;
  releaseChrome: () => void;
  setRootElement: (element: HTMLDivElement | null) => void;
  showChrome: () => void;
  togglePlay: () => void;
}

export function DemoPlayerStageRoot({
  children,
  chromeHidden,
  holdChrome,
  releaseChrome,
  setRootElement,
  showChrome,
  togglePlay,
}: DemoPlayerStageRootProps) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/noNoninteractiveElementInteractions lint/a11y/useKeyWithClickEvents: the focused demo stage mirrors package stage pointer playback while keyboard shortcuts are handled on the same target.
    <div
      className="vibe-player-stage"
      data-chrome-hidden={chromeHidden}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(nextTarget)
        ) {
          return;
        }
        releaseChrome();
      }}
      onClick={(event) => {
        if (!isInteractiveClickTarget(event.target)) {
          togglePlay();
        }
      }}
      onFocusCapture={(event) => {
        if (event.target === event.currentTarget) {
          showChrome();
          return;
        }
        holdChrome();
      }}
      onKeyDownCapture={(event) => {
        if (
          shouldRevealVibePlayerChromeForKey({
            chromeHidden,
            key: event.key,
          })
        ) {
          showChrome();
        }
      }}
      onPointerDown={showChrome}
      onPointerMove={showChrome}
      ref={setRootElement}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
