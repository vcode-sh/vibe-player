# Vibe Player Integration Guide

This package is a provider-agnostic player. Product apps own routing,
telemetry, storage, SEO, watched state, and media asset policy.

## Consumption Policy

Use one of these modes intentionally:

- `file:../../../vibe-player`: active private integration only, useful while
  package and consumer code move together.
- versioned internal package: preferred for stable app branches once the API
  surface stops changing daily.
- public npm package: only after the repository release checklist is complete.

Do not silently copy package source into a product app. Product apps should
import the package API and adapt their own data into `VibePlayerSource`.

## App Setup

Import the package stylesheet once from the app's global CSS entrypoint or root
layout:

```ts
import "@vibe-code/vibe-player/styles.css";
```

If the consuming app uses a local `file:` dependency or a framework that does
not transpile package source automatically, add `@vibe-code/vibe-player` to the
app transpilation allowlist.

Use the exported skin preset when the host wants a scoped wrapper:

```tsx
import { cinematicDefaultSkin, VibePlayerStage } from "@vibe-code/vibe-player";

export function PlayerSurface() {
  return (
    <section className={cinematicDefaultSkin.classNames.root}>
      <VibePlayerStage source={source} />
    </section>
  );
}
```

## Media Source Rules

Direct file sources are for MP4/WebM assets that can start quickly and support
browser range requests. Long progressive MP4 files should be encoded with the
metadata atom at the beginning of the file, for example via `ffmpeg -movflags
+faststart`.

Before rollout, audit large direct-file assets:

```bash
bun run media:audit -- https://cdn.example.com/video.mp4 --origin https://app.example.com
```

The audit checks range delivery, optional CORS headers for supplied origins, and
MP4 `moov`/`mdat` ordering. Treat failed faststart or range checks as an asset
delivery issue, not as a player-control bug.

For CI or asset ingestion jobs in this repo, use silent JSON mode:

```bash
bun --silent run media:audit -- https://cdn.example.com/video.mp4 --origin https://app.example.com --json --strict
```

That emits a stable JSON payload with `passed`, `failures`, CORS results, and
MP4 box offsets while returning a non-zero exit code when delivery checks fail.
The same payload includes `recommendations` with remediation guidance for range,
faststart, and requested-origin CORS failures.

Add `--credentials` only for sources that will use
`crossOrigin="use-credentials"`. Credentialed media requires an exact
`Access-Control-Allow-Origin` origin match and
`Access-Control-Allow-Credentials: true`; wildcard `*` is not enough.

Packaged installations expose the same checker as `vibe-player-media-audit`.

Use HLS for long videos, adaptive delivery, or assets where progressive MP4
startup is unreliable. HLS sources can expose package quality selection when
managed `hls.js` playback is available.

YouTube sources stay iframe-provider owned. The package exposes normalized
playback shell behavior, but does not fake YouTube captions, PiP, or quality
menus as package controls.

Use the default `presentation: "iframe"` for in-player YouTube playback. The
package sets the IFrame API `origin` parameter from the current page origin by
default and lets hosts override `origin` or pass `widgetReferrer` on the source
when embedding from wrapper or WebView environments.

Use `presentation: "external"` for a compliant headless-style YouTube surface.
That mode renders a package-owned handoff card, does not mount a YouTube iframe,
does not expose playback controls, and opens the YouTube watch URL. It is a
handoff mode, not hidden/background/raw-stream playback.

## Autoplay And Audio

`VibePlayerStage autoPlay` requests package playback after the selected source
loads. It uses muted bootstrap by default. When the bootstrap start succeeds,
the package keeps the media muted and exposes the `Unmute` control. Hosts should
not expect audible autoplay without a real user gesture.

Use `autoPlayMutedBootstrap={false}` only when opening the player from an
explicit user gesture and audible playback is intended. This preserves
native-video modal handoff behavior for hosts such as Discovery, while leaving
muted bootstrap as the safer default for inline, background, and non-gesture
starts.

For direct file sources, `VibePlayerFileSource.autoPlay` mirrors the native
`video.autoplay` attribute. It is useful for native-video parity, but it does
not replace `VibePlayerStage autoPlay` and does not override the Stage muted
bootstrap setting.

When a user unmutes a playing source, the package retries playback in the same
control path. Browser automation may still block or pause audible playback, so
consumer QA should include one real human-click audio smoke test on the target
origin.

## CORS And Credentials

Leave `crossOrigin` unset unless the media host sends matching CORS headers for
the exact consuming origin. A forced `crossOrigin="anonymous"` can block
metadata and playback for otherwise valid same-path media URLs.

When a host enables `crossOrigin`, verify:

- the media response includes `Access-Control-Allow-Origin` for the app origin;
- `use-credentials` sources also include `Access-Control-Allow-Credentials:
  true` and do not use wildcard `Access-Control-Allow-Origin`;
- range requests still work;
- captions are accessible from the same browser context;
- local, staging, and production origins behave the same way.

## Host-Owned Hooks

Resume persistence is opt-in through `VibePlayerResumeStore`. The package never
enables localStorage by default.

Analytics is opt-in through `onAnalyticsEvent`. Consumers should map normalized
package events into their own telemetry pipeline and ignore package events that
duplicate host-owned lifecycle events.

Top-level product actions, such as "Watch on YouTube", should be passed as
host-owned UI through player composition props rather than hardcoded in the
package.

## Verification Checklist

Before replacing an existing product player, verify:

- file, HLS, and YouTube sources render through the same package shell;
- CSS is present in the app bundle;
- opening and closing removes the active media element;
- re-opening creates exactly one active media element;
- controls reflect adapter capabilities honestly;
- captions show only when a track is available;
- resume restore skips near-ended finite videos;
- telemetry is deduped in the host integration;
- long progressive MP4 files are faststart or replaced with HLS;
- browser automation and a real human click both pass playback smoke tests.
