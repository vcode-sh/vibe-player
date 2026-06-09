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
import { VibePlayerStage } from "vibe-player";

export function ProductVideo() {
  return <VibePlayerStage source={source} />;
}
```

## Source Recipes

Direct file:

```ts
const source = {
  id: "file-demo",
  posterUrl: "/video/poster.jpg",
  sources: [{ mimeType: "video/mp4", url: "/video/file.mp4" }],
  title: "Direct file",
  type: "file",
} as const;
```

HLS:

```ts
const source = {
  id: "hls-demo",
  manifestUrl: "https://cdn.example.com/video/master.m3u8",
  posterUrl: "https://cdn.example.com/video/poster.jpg",
  title: "Adaptive stream",
  type: "hls",
} as const;
```

YouTube iframe:

```ts
const source = {
  id: "youtube-demo",
  title: "Official iframe playback",
  type: "youtube",
  youtubeVideoId: "M7lc1UVf-VE",
} as const;
```

YouTube external handoff:

```ts
const source = {
  externalActionLabel: "Watch on YouTube",
  id: "youtube-external-demo",
  posterUrl: "/video/youtube-poster.jpg",
  presentation: "external",
  startSeconds: 12,
  title: "Compliant handoff",
  type: "youtube",
  youtubeVideoId: "M7lc1UVf-VE",
} as const;
```

## Captions

File and HLS sources accept WebVTT caption tracks:

```ts
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
} as const;
```

Pass `loadCaptionText` to `VibePlayerStage` when captions should load through a
host-owned fetch/cache path. Otherwise the package uses `fetch`.

## Autoplay And Audio

`autoPlay` asks the package to start playback after the source loads. By
default, startup uses muted bootstrap because browsers do not owe anyone
audible autoplay.

Use `autoPlayMutedBootstrap={false}` only when opening from a real user
gesture and audible playback is intended:

```tsx
<VibePlayerStage autoPlay autoPlayMutedBootstrap={false} source={source} />
```

## Host Hooks

Use `onAnalyticsEvent` to map normalized package events into your telemetry.
Use `resumeStore` when your app wants resume persistence. The package does not
write localStorage by default.

```tsx
<VibePlayerStage
  onAnalyticsEvent={(event) => analytics.track(event.type, event)}
  resumeStore={resumeStore}
  source={source}
/>
```

## Custom And Headless UI

Use `useVibePlayerController` for custom surfaces. The package also exports
volume and quality helpers so host controls can stay aligned with adapter
capabilities without copying internal UI code.

The default UI intentionally stays dependency-light. Base UI is a good host
layer for custom sliders, menus, and popovers, but it is not a required runtime
dependency of the package.

## YouTube Rules

`presentation: "iframe"` uses the official YouTube IFrame Player API.
`presentation: "external"` renders a package-owned handoff surface and opens
YouTube. It does not fake hidden YouTube playback, raw streams, captions, PiP,
or quality controls.

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
