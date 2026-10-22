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

YouTube iframe with package controls (the default, `controls: "custom"`):

```ts
import type { VibePlayerSource } from "vibe-player";

const source = {
  id: "youtube-demo",
  title: "Official iframe playback",
  type: "youtube",
  youtubeVideoId: "M7lc1UVf-VE",
} satisfies VibePlayerSource;
```

YouTube iframe with YouTube's own controls, for its caption and quality menus:

```ts
import type { VibePlayerSource } from "vibe-player";

const source = {
  captionLanguage: "en",
  controls: "native",
  id: "youtube-native-demo",
  showCaptionsByDefault: true,
  title: "Native YouTube controls",
  type: "youtube",
  youtubeVideoId: "8S0FDjFBj8o",
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

## Seek Thumbnails

Pass `seekThumbnails` to `VibePlayerStage`, `VibePlayerInline`, or
`VibePlayerModal` to show a frame above the timeline while hovering, dragging,
or seeking with the keyboard. Custom controls and timelines accept the same
prop. Supply generated images and their time map from your application:

```tsx
import { VibePlayerStage, type VibePlayerSeekThumbnail } from "vibe-player";

const thumbnails = [
  { startTime: 0, endTime: 5, url: "/video/frame-0.jpg" },
  { startTime: 5, endTime: 10, url: "/video/frame-5.jpg" },
] as const satisfies readonly VibePlayerSeekThumbnail[];

<VibePlayerStage seekThumbnails={thumbnails} source={source} />;
```

To use a sprite sheet, give each frame its rectangle in original image pixels.
For a 320-by-90 sheet containing two 160-by-90 frames:

```tsx
import { VibePlayerStage, type VibePlayerSeekThumbnail } from "vibe-player";

const thumbnails = [
  {
    startTime: 0,
    endTime: 5,
    url: "/video/seek-sprite.jpg",
    sprite: { x: 0, y: 0, width: 160, height: 90 },
  },
  {
    startTime: 5,
    endTime: 10,
    url: "/video/seek-sprite.jpg",
    sprite: { x: 160, y: 0, width: 160, height: 90 },
  },
] as const satisfies readonly VibePlayerSeekThumbnail[];

<VibePlayerStage seekThumbnails={thumbnails} source={source} />;
```

Times are seconds: start is inclusive and end is exclusive. At the exact media
duration, a frame ending at that duration remains available. The first matching
valid entry wins; sorting is not required. Use finite, nonnegative times with
`startTime < endTime`. Sprite coordinates must be finite and nonnegative, with
positive dimensions, and the rectangle must fit inside the loaded image.

Gaps, invalid entries, loading images, and failed images keep the time-only
tooltip. Thumbnail preview does not seek the video; moving over the timeline
leaves playback untouched. Clicking, dragging, and keyboard commands retain
their normal seek behavior. The package does not generate frames, fetch a
WebVTT thumbnail map, or obtain thumbnails from provider APIs.

Replace the thumbnail array together with the source when switching videos.
Thumbnail updates are presentation changes and do not reload playback. Omit
the prop when the current source has no thumbnails.

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

Embedded YouTube defaults to `controls: "custom"`: the player is created with
`controls=0`, so YouTube's control bar is hidden and the package playback bar
drives play, pause, seek, mute, volume, supported speeds and fullscreen. The
Stage places its header above the video and the playback bar, tooltips, menus,
seek previews and notices below it. Nothing the package renders covers the
iframe, and the video area keeps at least 200 CSS pixels of height.

`controls: "native"` shows YouTube's own controls instead, including its
caption and quality menus when the selected video offers them. The Stage then
omits its playback bar but keeps the header and close action above the video;
controller commands and keyboard shortcuts still work. Switching between the
two modes is a source change and starts a new player session.

Startup caption options are requests to YouTube, not package captions:
- `captionLanguage` sets the preferred caption language (`cc_lang_pref`);
- `showCaptionsByDefault: true` asks YouTube to show captions at start
  (`cc_load_policy=1`). Omitting it or passing `false` leaves the viewer's and
  the video's own caption settings in effect; it does not force captions off.

YouTube may render captions inside the video in either mode. In custom mode
there is no package captions button or caption-language menu, and no quality
menu: the IFrame API has no supported caption-track or quality selection, so
the package reports `canShowCaptions: false` and
`supportsQualitySelection: false` rather than offering controls that do nothing.
Use native mode when viewers need those menus. Package WebVTT captions apply to
file and HLS sources only.

YouTube still draws some of its own elements inside the iframe in custom mode,
such as the video title, share and "Watch on YouTube" links, a pause indicator
and related-video suggestions. YouTube does not offer a way to remove its
branding; `rel=0` only limits suggestions to the same channel.

Hosts that give `.vibe-player-stage` a fixed `aspect-ratio` should scope it to
`[data-controls-presentation="overlay"]`. Outside and provider presentations
add header and control rows around a 16:9 video area.

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
