# Usage Guide

Vibe Player is a React package. It owns playback, controls, captions, keyboard
behavior, provider adapters, and the default cinematic skin. Your app owns
routing, telemetry, persistence, auth, billing, SEO, and media policy.

## Install

```bash
npm install vibe-player
```

Import the stylesheet once from the app root:

```ts
import "vibe-player/styles.css";
```

## Render A Player

```tsx
import { VibePlayerStage, type VibePlayerSource } from "vibe-player";

interface ProductVideoProps {
  source: VibePlayerSource;
}

export function ProductVideo({ source }: ProductVideoProps) {
  return <VibePlayerStage source={source} />;
}
```

## Source Recipes

Direct file:

```ts
import type { VibePlayerSource } from "vibe-player";

const source = {
  id: "file-demo",
  posterUrl: "/video/poster.jpg",
  sources: [{ mimeType: "video/mp4", url: "/video/file.mp4" }],
  title: "Direct file",
  type: "file",
} satisfies VibePlayerSource;
```

HLS:

```ts
import type { VibePlayerSource } from "vibe-player";

const source = {
  id: "hls-demo",
  manifestUrl: "https://cdn.example.com/video/master.m3u8",
  posterUrl: "https://cdn.example.com/video/poster.jpg",
  title: "Adaptive stream",
  type: "hls",
} satisfies VibePlayerSource;
```

YouTube iframe:

```ts
import type { VibePlayerSource } from "vibe-player";

const source = {
  id: "youtube-demo",
  title: "Official iframe playback",
  type: "youtube",
  youtubeVideoId: "M7lc1UVf-VE",
} satisfies VibePlayerSource;
```

YouTube external handoff:

```ts
import type { VibePlayerSource } from "vibe-player";

const source = {
  externalActionLabel: "Watch on YouTube",
  id: "youtube-external-demo",
  posterUrl: "/video/youtube-poster.jpg",
  presentation: "external",
  startSeconds: 12,
  title: "Compliant handoff",
  type: "youtube",
  youtubeVideoId: "M7lc1UVf-VE",
} satisfies VibePlayerSource;
```

Source collections accept both ordinary arrays and readonly arrays, including
values declared with `as const`. The package reads source and caption collections
without mutating them. Replace the source value when media changes instead of
mutating an already supplied source in place.

## Captions

File and HLS sources accept WebVTT caption tracks:

```ts
import type { VibePlayerSource } from "vibe-player";

const source = {
  captions: [
    {
      default: true,
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "/captions/en.vtt",
    },
  ],
  id: "captioned-file",
  sources: [{ mimeType: "video/mp4", url: "/video/file.mp4" }],
  type: "file",
} satisfies VibePlayerSource;
```

Pass `loadCaptionText` to `VibePlayerStage` when captions should load through a
host-owned fetch/cache path. Otherwise the package uses `fetch`.

Caption failures leave video playback available. The stage shows a retry action;
`onCaptionStatusChange` reports `{ error, loading, track }` without firing on
every playback tick. Custom controls can use `useVibePlayerCaptions`, which
exposes the same status, `activeLines`, and a stable `retry()` action. Selection
currently uses the default track or the first declared track.

## Autoplay And Audio

`autoPlay` asks the package to start playback after the source loads. By
default, startup uses muted bootstrap because browsers do not owe anyone
audible autoplay.

Use `autoPlayMutedBootstrap={false}` only when opening from a real user
gesture and audible playback is intended:

```tsx
<VibePlayerStage autoPlay autoPlayMutedBootstrap={false} source={source} />;
```

## Host Hooks

Use `onAnalyticsEvent` to map normalized package events into your telemetry.
Use `resumeStore` when your app wants resume persistence. The package does not
write localStorage by default. `onStateChange` observes normalized player state;
`onError` receives a source-aware error with its lifecycle phase and available
provider details. Updating these callbacks does not restart the player.

```tsx
<VibePlayerStage
  onAnalyticsEvent={(event) => analytics.track(event.type, event)}
  resumeStore={resumeStore}
  source={source}
/>;
```

`VibePlayerInline` and `VibePlayerModal` accept the same playback options,
including autoplay, callbacks, and `topActions`. Use `autoHideControls={false}`
when controls should remain visible. The default follows the adapter's normalized
chrome capability.

## Custom And Headless UI

Use `useVibePlayer` when building your own controls. It owns media mounting,
source loading, autoplay, closing, and cleanup, so a custom surface does not need
to copy the package stage's effects:

```tsx
import { useVibePlayer, type VibePlayerSource } from "vibe-player";

const source = {
  id: "custom-file",
  sources: [{ mimeType: "video/mp4", url: "/video/file.mp4" }],
  type: "file",
} satisfies VibePlayerSource;

export function CustomPlayer() {
  const { controller, setTarget, state } = useVibePlayer({ source });

  return (
    <section aria-label="Custom video player">
      <div ref={setTarget} />
      <button
        disabled={!state.capabilities?.supportsPlayback}
        onClick={() => controller.play().catch(() => undefined)}
        type="button"
      >
        Play
      </button>
      <button
        disabled={!state.capabilities?.supportsPlayback}
        onClick={() => controller.pause().catch(() => undefined)}
        type="button"
      >
        Pause
      </button>
      {state.error ? <p role="status">{state.error.message}</p> : null}
    </section>
  );
}
```

Give the media mount a size in your own layout. Add `autoPlay`, `open`,
`onAnalyticsEvent`, `onError`, or `resumeStore` when needed. Volume and quality
helpers remain available for controls that follow normalized capabilities.

For fullscreen that includes custom chrome, pass its container element as
`presentationTarget` to `useVibePlayer`; it defaults to the media mount.
Changing only that container preserves the current source. Built-in assemblies
use the stage root. `snapshot.isFullscreen` and `snapshot.isPictureInPicture`
reflect browser presentation; matching controller enter/exit methods support
custom toggles. Custom adapters can add these optional fields and methods.

`snapshot.playbackRates` supplies provider-supported rate choices when present.
Pass it as the second argument to `getNextVibePlayerPlaybackRate`; omitted choices
use package defaults. Always honor the normalized capability flags.

`useVibePlayerController` is the lower-level binding for integrations that own
mounting and source loading themselves. Its default adapter factory is optional;
a custom factory or resume store defines a new controller, while callback
updates do not restart playback. Resume-store and telemetry failures are
nonfatal integration errors: `onError` receives `phase: "integration"` and
`details.operation`. A failed host error reporter is contained to avoid a
reporting loop.

The default UI intentionally stays dependency-light. Base UI is a good host
layer for custom sliders, menus, and popovers, but it is not a required runtime
dependency of the package.

## YouTube Rules

`presentation: "iframe"` uses the official YouTube IFrame Player API.
`presentation: "external"` renders a package-owned handoff surface and opens
YouTube. It does not fake hidden YouTube playback, raw streams, captions, PiP,
or quality controls.

Autoplay blocking follows the official SDK event; slow buffering alone does not
produce a policy warning. Repeating a mount on the same target preserves the
live iframe. Moving it to another target preserves its browsing context when
`Element.moveBefore` is available; older browsers fall back to moving the node
and may reload embedded content. After SDK initialization fails, a later load
can retry without refreshing the page.

## Media Audit

Packaged installs include a CLI:

```bash
npx --package vibe-player vibe-player-media-audit https://cdn.example.com/video.mp4 --origin https://app.example.com
```

In this repo, the same checker runs as:

```bash
bun run media:audit -- https://cdn.example.com/video.mp4 --origin https://app.example.com
```

Use `--json --strict --require-direct-file-ready` for CI or ingestion gates.
See [media-delivery.md](./media-delivery.md) for the full report contract.

## Demo

```bash
bun run demo:vite
bun run demo:vite:check
bun run demo:vite:build
bun run demo:vite:packaged
bun run demo:vite:packaged:build
```

`demo:vite` uses source aliases for fast package work. `demo:vite:packaged`
builds the package first and consumes the published `exports` surface.
