# Vibe Player

[![npm](https://img.shields.io/npm/v/vibe-player?style=flat-square)](https://www.npmjs.com/package/vibe-player)
[![license](https://img.shields.io/npm/l/vibe-player?style=flat-square)](./LICENSE)
[![React](https://img.shields.io/badge/react-19-61dafb?style=flat-square&logo=react&logoColor=111)](https://react.dev/)
[![Sponsor vcode-sh](https://img.shields.io/badge/sponsor-vcode--sh-ea4aaa?style=flat-square&logo=github-sponsors&logoColor=white)](https://github.com/sponsors/vcode-sh)

A cinematic, provider-agnostic React video player. MP4/WebM files and HLS
play behind one controller, with ready-made chrome for chat bubbles,
feed cards, a full stage and modal viewers, plus a headless hook for your own
controls. Your app keeps routing, auth, telemetry and storage.

Built by [Vibe Code](https://x.com/vcode_sh) ·
[hello@vcode.sh](mailto:hello@vcode.sh)

## Install

```bash
npm install vibe-player hls.js
```

`hls.js` is a peer dependency, loaded only for HLS sources. React 19.2.7 or
later and Node 24 or later are supported.

## Example

```tsx
import "vibe-player/styles.css";
import { VibePlayerCompact } from "vibe-player/compact";
import { VibePlayerStage } from "vibe-player/stage";

const clip = {
  id: "launch-film",
  type: "hls",
  url: "https://example.com/video/master.m3u8",
  posterUrl: "https://example.com/video/poster.jpg",
  width: 1080,
  height: 1920,
} as const;

/** A feed card: poster first, nothing downloads until Play. */
export function FeedCard() {
  return <VibePlayerCompact source={clip} variant="feed" />;
}

/** The full player with timeline, captions, quality and fullscreen. */
export function Viewer() {
  return <VibePlayerStage source={clip} />;
}
```

## Features

- **Providers:** files through native video, adaptive HLS through injected
  `hls.js` (native HLS where needed), and renewable private URLs
  (`renewSource`).
- **Surfaces:** `VibePlayerCompact` (chat and feed, Glass Capsule or Ink Chips
  skin), `VibePlayerStage`, `VibePlayerInline`, `VibePlayerModal`, and
  `useVibePlayer` for headless UI.
- **Seeking:** one `seekStep` drives skip buttons (`controls.skip`), ←/→ and
  J/L, touch double-tap seeking (`gestures.doubleTapSeek`) and system seek
  controls.
- **Timeline:** seek thumbnails from sprites or WebVTT
  (`seekThumbnails`, `createVibePlayerSeekThumbnails`) and a "most replayed"
  `VibePlayerHeatmap` in `glide` or `curve` variants (`timelineBackground`).
- **System media controls:** opt-in `mediaSession` for lock screen and media
  keys.
- **Detached hosts:** `host` (or `VibePlayerHostFrame`) moves one playing
  player into a mini player or dock without restarting it.
- **Events:** a lossless, ordered and typed event stream through `onEvent` or
  `controller.on("seeked", listener)`; every seek is reported once, whoever
  started it.
- **Watched ranges:** opt-in `onWatchedRanges` reports what actually played,
  split at every seek, with a `playbackId` and `sequence` for deduplication.
- **Errors:** every error has a `kind` (`network`, `decode`, `source`,
  `unknown`), so you can show a friendly message.
- **Audio and visibility:** `audioFocus` groups with an observable owner,
  lazy `load` policies, and release when hidden or offscreen.
- **Host integration:** `controller.retire()` for sign-out, a read-only
  registry of live players, and detached hosts that park media between hosts.
- **Theming:** scoped CSS variables, including compact sizing variables
  (`--vibe-player-compact-*`) that scale the chrome with container units, plus
  `icons`, `labels` and `classNames`.
- **Accessibility:** keyboard shortcuts, real tooltips, 44 px touch targets by
  default, and reduced-motion support.
- **Media audit CLI:** `vibe-player-media-audit` checks MP4 range delivery,
  faststart, CORS and size.
- **Readable output:** unminified ESM with stable chunk names, so you can read
  and debug what ships; your bundler still minifies it.

## Documentation

- [Usage guide](./docs/usage.md): sources, seeking, compact skins, theming,
  hosts, heatmap, headless UI and bundle size.
- [Integration guide](./docs/integration.md) and
  [media delivery](./docs/media-delivery.md).
- Demo: `bun run demo:vite` serves the feature showcase; see
  [demo/vite/README.md](./demo/vite/README.md).
- [Changelog](./CHANGELOG.md) · [Contributing](./CONTRIBUTING.md)

## License

[Apache-2.0](./LICENSE). If Vibe Player saves you from writing this stack
again, consider [sponsoring Vibe Code](https://github.com/sponsors/vcode-sh).
