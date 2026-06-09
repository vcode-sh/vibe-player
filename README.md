# Vibe Player

Cinematic, provider-agnostic React video player primitives for direct files,
HLS, YouTube embeds, and compliant YouTube external handoff surfaces.

`@vibe-code/vibe-player` is built as a standalone package first. Product apps
own routing, telemetry, persistence, SEO, billing/auth state, and media asset
policy; the package owns playback runtime, normalized controls, captions,
keyboard behavior, and the default cinematic skin.

## Features

- direct MP4/WebM playback through native `HTMLVideoElement`
- HLS playback through managed `hls.js` when available, with native fallback
- YouTube playback through the iframe API, plus an external handoff
  presentation for headless-style surfaces that should not create an iframe
- package-owned controls, timeline, keyboard shortcuts, captions, PiP, and
  fullscreen where the provider supports them
- compact package-owned volume popover, quality menu, and exported state
  helpers for custom/headless control surfaces
- package-owned control and timeline tooltips with shortcut hints instead of
  native browser titles
- opt-in analytics and resume seams
- ambient/background preview primitives
- neutral cinematic default skin with stable class-name hooks

## Quick Start

Import the package stylesheet once from the app root:

```ts
import "@vibe-code/vibe-player/styles.css";
```

Render the stage with a package source:

```tsx
import {
  cinematicDefaultSkin,
  type VibePlayerSource,
  VibePlayerStage,
} from "@vibe-code/vibe-player";

const source: VibePlayerSource = {
  id: "launch-film",
  manifestUrl: "https://example.com/video/master.m3u8",
  posterUrl: "https://example.com/video/poster.jpg",
  title: "Launch film",
  type: "hls",
};

export function ProductVideo() {
  return (
    <section className={cinematicDefaultSkin.classNames.root}>
      <VibePlayerStage autoPlay={false} source={source} />
    </section>
  );
}
```

## Source Shapes

```ts
import type { VibePlayerSource } from "@vibe-code/vibe-player";

export const fileSource: VibePlayerSource = {
  id: "file-demo",
  posterUrl: "/video/poster.jpg",
  sources: [{ mimeType: "video/mp4", url: "/video/file.mp4" }],
  title: "Direct file",
  type: "file",
};

export const hlsSource: VibePlayerSource = {
  id: "hls-demo",
  manifestUrl: "https://example.com/video/master.m3u8",
  title: "Adaptive stream",
  type: "hls",
};

export const youtubeSource: VibePlayerSource = {
  id: "youtube-demo",
  title: "Embedded provider",
  type: "youtube",
  youtubeVideoId: "M7lc1UVf-VE",
};

export const youtubeExternalSource: VibePlayerSource = {
  externalActionLabel: "Watch on YouTube",
  id: "youtube-link-demo",
  posterUrl: "/video/youtube-poster.jpg",
  presentation: "external",
  startSeconds: 12,
  title: "Headless handoff",
  type: "youtube",
  youtubeVideoId: "M7lc1UVf-VE",
};
```

## YouTube Presentations

`type: "youtube"` defaults to `presentation: "iframe"` and uses the official
YouTube IFrame Player API. This is the only in-player YouTube playback mode.

Use `presentation: "external"` when a surface needs a headless-style YouTube
experience without iframe chrome. The package renders a premium handoff card,
hides playback controls, and opens the YouTube watch URL instead of pretending
to own YouTube audio/video playback.

## Consumer Contract

- Import `@vibe-code/vibe-player/styles.css` exactly once.
- Add `@vibe-code/vibe-player` to the consuming framework's transpilation
  allowlist when using a local `file:` dependency or source package.
- Leave `crossOrigin` unset unless the media origin sends matching CORS
  headers.
- Use `VibePlayerStage autoPlay` for package-owned startup. It uses muted
  bootstrap by default and keeps successful bootstrap playback muted until the
  user chooses audio.
- Set `autoPlayMutedBootstrap={false}` only when opening the player from an
  explicit user gesture and audible playback is intended.
- Treat `VibePlayerFileSource.autoPlay` as native-video parity only: it mirrors
  the file adapter's `video.autoplay` attribute and does not replace the Stage
  startup contract.
- Use HLS for long videos, adaptive delivery, or progressive MP4 assets that
  are not `faststart`.
- Map `onAnalyticsEvent` into the host telemetry system instead of coupling the
  package to product event names.
- Pass `resumeStore` explicitly when the host wants resume persistence.
- Use `useVibePlayerController` plus exported volume/quality helpers when a
  host wants custom controls, including Base UI-backed controls. The default
  package entry stays free of a mandatory Base UI runtime dependency.

See [docs/integration.md](./docs/integration.md) for the full integration
checklist.

## Local File Dependency Workflow

When a consumer uses `file:../vibe-player`, refresh the package deliberately
after changes to source, exports, CSS, or build scripts:

1. Run `bun run build` in this package.
2. Run the consumer package-manager install so its `file:` cache is refreshed.
3. Restart the consumer dev server after stylesheet or export changes.
4. From the consumer app cwd, verify the stylesheet resolver:

```bash
bun -e "console.log(import.meta.resolve('@vibe-code/vibe-player/styles.css'))"
```

The resolved path should end in `@vibe-code/vibe-player/dist/styles.css`.
If a framework still reports a missing split source stylesheet, it is serving a
stale dependency or transform cache, not the public package stylesheet.

## Local Demo

The package demo lives in `demo/vite` and exercises the real package player
against direct file, HLS, and YouTube sources without mimicking a product app.
The dev server is bound to `http://localhost:5173/` by default.

```bash
bun run demo:vite
bun run demo:vite:check
bun run demo:vite:build
bun run demo:vite:packaged:build
```

`demo:vite` uses source aliases for fast package development. The packaged
demo build first runs `bun run build`, then consumes the package through its
published `exports` surface.

## Media Delivery Audit

Use the media audit before wiring large direct-file assets into a product
surface:

```bash
bun run media:audit -- https://example.com/video.mp4 --origin https://app.example.com
```

Use `--json --strict` in CI to emit a machine-readable report and fail when
range, faststart, direct-file size, rollout-readiness, or requested-origin CORS
checks fail. In this repo, use `bun --silent run` for JSON mode so stdout stays
parseable:

```bash
bun --silent run media:audit -- https://example.com/video.mp4 --origin https://app.example.com --max-size-mb 500 --json --strict --require-direct-file-ready
```

The same checker is shipped as `vibe-player-media-audit` for packaged installs.
See [docs/media-delivery.md](./docs/media-delivery.md) for JSON fields, rollout
decisions, CORS/credentials rules, size handling, and human-output details.

## Commands

```bash
bun install
bun run check
bun run check-types
bun run test
bun run build
bun run media:audit -- <url> --origin <origin>
bun --silent run media:audit -- <url> --origin <origin> --max-size-mb 500 --json --strict --require-direct-file-ready
bun --silent run media:audit -- <url> --origin <origin> --credentials --json --strict
bun run package:rules
bun run package:boundaries
bun run package:dependencies
bun run package:release-state
bun run package:styles
bun run package:size
bun run package:surface
bun run package:tarball
bun run package:publint
bun run package:attw
```

## Package Stance

The repo is private today and intentionally scaffolded so it can be released
later with limited churn:

- ESM-only package shape
- clean `exports`
- `dist` build output
- package lint/type/test/build scripts
- publint and ATTW validation
- changesets-based versioning

Until that transition happens, the license stays `UNLICENSED`.

Tests use Vitest. Bun is the package manager and local command runner.
