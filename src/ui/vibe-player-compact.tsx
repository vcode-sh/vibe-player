import { type CSSProperties, lazy, type ReactNode, Suspense } from "react";
import { useVibePlayerStatusAnnouncement } from "./use-vibe-player-announcer";
import { useVibePlayerStageObservers } from "./use-vibe-player-stage-observers";
import {
  type UseVibePlayerSurfaceOptions,
  useVibePlayerSurface,
} from "./use-vibe-player-surface";
import { VibePlayerAnnouncer } from "./vibe-player-announcer";
import { getVibePlayerFrameStyle } from "./vibe-player-frame-style";
import { VibePlayerGlassSkin } from "./vibe-player-glass-skin";
import { VibePlayerHostFrame } from "./vibe-player-host-frame";
import { VibePlayerMediaSlot } from "./vibe-player-media-slot";
import { VibePlayerPoster } from "./vibe-player-start-surface";
import type {
  VibePlayerCompactSkin,
  VibePlayerCompactSlots,
  VibePlayerSurface,
} from "./vibe-player-surface-types";
import {
  useVibePlayerUI,
  VibePlayerUIProvider,
  vibePlayerClassName,
} from "./vibe-player-ui-context";

const VibePlayerChipsSkin = lazy(() => import("./vibe-player-chips-skin"));

/** Inline chrome for chat, comments and feed cards. */
export interface VibePlayerCompactProps
  extends Omit<UseVibePlayerSurfaceOptions, "variant"> {
  /**
   * Detached mode: the player renders into this host element and moves, still
   * playing, whenever it changes (inline slot, mini-player, dock). `null`
   * keeps it in the current host. Omit it to render in place; choose the mode
   * at mount, because switching between them remounts the player.
   */
  host?: HTMLElement | null | undefined;
  /** Replaces the skin overlay; the shell keeps media, poster and policy. */
  renderOverlay?: ((surface: VibePlayerSurface) => ReactNode) | undefined;
  /** `glass` (default) or `chips`; the chips chunk loads on first use. */
  skin?: VibePlayerCompactSkin | undefined;
  slots?: VibePlayerCompactSlots | undefined;
  variant?: "compact" | "feed" | undefined;
}

const emptyCaptionStatus = { error: null, loading: false, track: null };

function VibePlayerCompactContent({
  load = "onPlay",
  renderOverlay,
  skin = "glass",
  slots,
  variant = "compact",
  ...props
}: VibePlayerCompactProps) {
  const { classNames, labels } = useVibePlayerUI();
  const { events, indicator, playback, surface } = useVibePlayerSurface(
    { ...props, load },
    skin
  );
  const { activeSource, controller, playerTitle, state } = playback;
  useVibePlayerStageObservers({
    captionStatus: emptyCaptionStatus,
    controller,
    onCaptionStatusChange: props.onCaptionStatusChange,
    onError: props.onError,
    onStateChange: props.onStateChange,
    source: activeSource,
    state,
  });
  const view = surface.state;
  let status: string | null = null;
  if (view.busy) {
    status = view.phase === "loading" ? labels.loading : labels.buffering;
  } else if (view.phase === "error") {
    status = labels.unavailable;
  }
  useVibePlayerStatusAnnouncement(playback.announcer.announce, status);
  let overlay: ReactNode = null;
  if (renderOverlay) {
    overlay = renderOverlay(surface);
  } else if (skin === "chips") {
    overlay = (
      <Suspense fallback={null}>
        <VibePlayerChipsSkin slots={slots} surface={surface} />
      </Suspense>
    );
  } else {
    overlay = <VibePlayerGlassSkin slots={slots} surface={surface} />;
  }
  const progress = view.duration > 0 ? view.time / view.duration : 0;
  const frame = getVibePlayerFrameStyle({
    maxRatio: props.maxRatio,
    minRatio: props.minRatio,
    snapshot: state.snapshot,
    source: activeSource,
    style: props.style,
  });
  return (
    <section
      aria-label={
        playerTitle ? labels.videoPlayerTitle(playerTitle) : labels.videoPlayer
      }
      className={vibePlayerClassName(
        "vibe-player-stage vibe-player-compact",
        props.className,
        classNames.root
      )}
      data-autoplay={view.autoplayMuted ? "muted" : undefined}
      data-busy={view.busy}
      data-controls={view.controlsVisible ? "visible" : "hidden"}
      data-fit={props.fit === "cover" ? "cover" : undefined}
      data-hold={view.hold ?? undefined}
      data-muted={view.muted}
      data-scrubbing={view.scrubbing}
      data-skin={skin}
      data-state={view.phase}
      data-variant={variant}
      {...events}
      ref={playback.setRootElement}
      style={
        {
          "--vibe-player-progress": Math.min(1, progress).toFixed(4),
          ...frame,
        } as CSSProperties
      }
      // biome-ignore lint/a11y/noNoninteractiveTabindex: The named player region owns focused media keyboard shortcuts.
      tabIndex={0}
    >
      <VibePlayerMediaSlot
        className={classNames.media}
        onTarget={playback.setTarget}
      />
      <VibePlayerPoster
        controller={controller}
        source={activeSource}
        visible={
          view.phase !== "playing" &&
          view.phase !== "paused" &&
          view.phase !== "ended"
        }
      />
      <span aria-hidden className="vibe-player-surface__dim" />
      <VibePlayerAnnouncer message={playback.announcer.message} />
      {indicator}
      {overlay}
    </section>
  );
}

export function VibePlayerCompact({ host, ...props }: VibePlayerCompactProps) {
  const player = (
    <VibePlayerUIProvider {...props}>
      <VibePlayerCompactContent {...props} />
    </VibePlayerUIProvider>
  );
  return host === undefined ? (
    player
  ) : (
    <VibePlayerHostFrame host={host}>{player}</VibePlayerHostFrame>
  );
}
