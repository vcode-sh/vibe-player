# Vibe Player Integration Guide

This package is a provider-agnostic player. Product apps own routing,
telemetry, storage, SEO, watched state, and media asset policy.

## Consumption Policy

Use one of these modes intentionally:
- npm package: preferred for app work and stable branches.
- workspace dependency: useful when the app and package share one lockfile and
  one CI boundary.
- local `file:` dependency: useful only for active package development with a
  specific consumer.

Do not silently copy package source into a product app. Product apps should
import the package API and adapt their own data into `VibePlayerSource`.

## App Setup

Import the package stylesheet once from the app's global CSS entrypoint or root
layout:

```ts
import "vibe-player/styles.css";
```

If the consuming app uses a local `file:` dependency or a framework that does
not transpile package source automatically, add `vibe-player` to the
app transpilation allowlist.

For local `file:` consumers, refresh in this order after package source, export,
CSS, or build-script changes:
1. Run `bun run build` in this package.
2. Run the consumer package-manager install to refresh its `file:` cache.
3. Restart the consumer dev server after stylesheet or export changes.
4. From the consumer app cwd, verify:

```bash
bun -e "console.log(import.meta.resolve('vibe-player/styles.css'))"
```

The resolver should point at `vibe-player/dist/styles.css`. If it
points at `src/styles/vibe-player.css`, or the framework still reports a
missing split stylesheet such as `vibe-player-tooltip.css`, the consumer is
serving a stale dependency or transform cache.

Use the exported skin preset when the host wants a scoped wrapper:

```tsx
import {
  cinematicDefaultSkin,
  VibePlayerStage,
  type VibePlayerSource,
} from "vibe-player";

interface PlayerSurfaceProps {
  source: VibePlayerSource;
}

export function PlayerSurface({ source }: PlayerSurfaceProps) {
  return (
    <section className={cinematicDefaultSkin.classNames.root}>
      <VibePlayerStage source={source} />
    </section>
  );
}
```

## Skin Metadata And CSS

`cinematicDefaultSkin` contains preset metadata, stable class names, and reference
design values. Its `tokens` object is descriptive: mutating it does not update
rendered players, CSS, or hook timing. Import the stylesheet to apply the bundled
visuals. Use CSS custom properties for scoped visual overrides, for example:

```css
.product-player {
  --vibe-player-border: rgba(80, 170, 220, 0.45);
  --vibe-player-surface: rgba(8, 18, 28, 0.92);
}
```

The scope can wrap a player stage or assembly. Existing hook options control
behavior such as idle timing; CSS variables control the styles that use them.

## Media Source Rules

Direct file sources are for MP4/WebM assets that can start quickly and support
browser range requests. Long progressive MP4 files should be encoded with the
metadata atom at the beginning of the file, for example via `ffmpeg -movflags
+faststart`.

Before rollout, audit large direct-file assets:

```bash
npx --package vibe-player vibe-player-media-audit https://cdn.example.com/video.mp4 --origin https://app.example.com
```

The audit checks range delivery, optional CORS headers for supplied origins, MP4
`moov`/`mdat` ordering, direct-file size thresholds, and rollout readiness.
Treat failed faststart, range, CORS, or size-threshold checks as asset delivery
issues, not as player-control bugs.

For CI or asset ingestion jobs in this repo, use silent JSON mode and fail on
the direct-file rollout decision:

```bash
bun --silent run media:audit -- https://cdn.example.com/video.mp4 --origin https://app.example.com --max-size-mb 500 --json --strict --require-direct-file-ready
```

See [media-delivery.md](./media-delivery.md) for JSON fields, stable findings,
`nextActions`, rollout decisions, credentials-mode CORS, and human output.

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

Embedded YouTube uses package controls by default (`controls: "custom"`). The
adapter reports `controlsPresentation: "outside"`, and the ready-made UI lays
out the header, the video and the playback bar as separate rows so no package
surface overlaps the iframe. `controls: "native"` reports
`controlsPresentation: "provider"`: YouTube shows its own controls, including
its caption and quality menus, and `hasNativeCaptionsMenu` is `true`. Commands
stay available in both modes (`supportsPlayback` is `true`), so host shortcuts
and buttons keep working. `captionLanguage` and `showCaptionsByDefault` are
startup requests to YouTube; see the YouTube rules in [usage.md](./usage.md)
for what they do and do not guarantee.

Custom UIs built on `useVibePlayer` should read
`state.capabilities.controlsPresentation`: omitted or `"overlay"` allows controls
over the media; `"outside"` means keep every control, menu and notice outside
the media rectangle; `"provider"` means the provider draws playback controls,
so render none of your own. The value is known as soon as a source starts
loading, before the provider is ready.

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
native-video modal handoff behavior for gesture-opened hosts, while leaving
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

The default controls expose volume through a compact package-owned popover. The
popover keeps the bottom chrome dense, renders a vertical `0..100` slider, and
continues to send normalized `0..1` values through the controller and adapter
contract. Raising volume from a muted state unmutes through the same user
interaction path. Hovering or focusing the volume icon opens the slider, while
clicking the icon remains a fast mute/unmute action.

Default controls use package-owned tooltips rather than native `title`
attributes. Supported keyboard shortcuts are shown directly in the tooltip:
`Space / K` for play/pause, `M` for mute, `C` for captions, `F` for fullscreen,
and `← / →` for timeline seek.

## CORS And Credentials

For managed HLS, `crossOrigin: "use-credentials"` also configures `hls.js`
XHR/Fetch requests for playlists, segments and keys. Anonymous/default requests
retain their SDK credential policy. Browser cookie restrictions still apply.

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

`onStateChange` observes the current normalized state. `onError` receives the
source ID, provider, phase (`create`, `mount`, `load`, `playback`, or
`integration`), message, and available cause or provider details. Controller
errors are also available as `state.error`; starting a new source clears the
previous source's error. Failures of UI observers (`onStateChange` and
`onCaptionStatusChange`) go directly to `onError` without mutating controller
state, avoiding a reporting feedback loop. Hosts choose where to report errors.

Rejected control commands include their name in `details.command`. Failures in
auxiliary actions such as fullscreen or PiP preserve ongoing playback. Browser
policy blocking `play()` uses the `playbackBlocked` notice instead of `onError`.
Resume-store, analytics and controller-subscriber failures report as nonfatal
`integration` errors with `details.operation`; they cannot block media cleanup
or remaining state listeners. Rejected asynchronous observer/write callbacks
are contained too. Failure of `onError` itself is contained without recursively
reporting another error. A failed resume read skips restoration; a provider's
failed position-restore command still reports in the `load` phase. The current
`state.error` may therefore describe an integration failure while playback
remains healthy; use the phase and snapshot together.

The package normalizes seek requests to the adapter's duration and `canSeek`
capability before dispatch. Resume and seek analytics use that accepted target;
provider getters can lag immediately after an asynchronous seek. Pending pause
intent suppresses stale active events until a provider pause acknowledgment;
a later provider-initiated play can then update normalized state.

For custom/headless surfaces, use `useVibePlayer`. It owns mounting, source
loading, autoplay, closing, and cleanup. See the complete example in
[usage.md](./usage.md#custom-and-headless-ui). Use the lower-level
`useVibePlayerController` when your integration intentionally owns that sequence.
Both bindings use the default provider factory unless an override is supplied.
`useVibePlayer` accepts an optional `presentationTarget` for a fullscreen
container that includes host controls; changing it does not reload media.
Direct controller/adapter users pass that container as the second argument to
`mount`. Built-in assemblies supply their stage root. Optional snapshot
`isFullscreen`/`isPictureInPicture` fields and matching enter/exit methods keep
custom controls synchronized with browser exits. Unsupported APIs remain gated
by adapter capabilities.

Caption failures have a separate `onCaptionStatusChange` seam and do not fail
video playback. Ready-made stages offer retry; `useVibePlayerCaptions` exposes
`retry()` for custom surfaces. Captions select the default/first declared track;
there is no multi-track menu yet. Changing `loadCaptionText` identity does not
restart a pending request; explicit retry uses the latest loader.

Base UI is an optional host-layer fit for custom sliders and menus, not a runtime
dependency of the package.

An equivalent source object on a later render keeps the active source. Changing
source contents, including a media URL with the same source ID, loads the changed
source. Inline callback updates do not recreate the controller. Changing the
adapter factory or resume store establishes a new controller boundary.

`VibePlayerInline` and `VibePlayerModal` forward playback options, state/error
observers, and `topActions` to the package stage. Set `autoHideControls={false}`
for a persistent control surface; the default follows normalized capabilities.

## Advanced Adapter Integration

The root API exports the built-in factories and named HLS and YouTube runtime
contracts. Override one provider while retaining package defaults for the rest:

```ts
import {
  createHlsAdapter,
  createVibePlayerAdapter,
  type HlsAdapterRuntime,
  type VibePlayerSource,
} from "vibe-player";

export function createPlayerAdapterFactory(runtime: HlsAdapterRuntime) {
  return (source: VibePlayerSource) =>
    source.type === "hls"
      ? createHlsAdapter(runtime)
      : createVibePlayerAdapter(source);
}
```

Pass the resulting stable function as `adapterFactory`. Managed HLS stays the
default when supported, with native fallback after managed attachment failure.
YouTube runtime injection uses `YouTubeAdapterRuntime`; provider SDK objects
remain behind that bridge. A custom runtime must return a usable player handle,
or resolve only after its player is ready. Honor `session.signal` to release
pending creation when a source is replaced, unmounted, or times out. The default
runtime waits for the official `onReady` event.

For direct adapter use, subscribe, mount the target, then load the source and
await commands. Unsubscribe and unmount when the owner disposes the adapter.
Repeating a mount on the same target is idempotent. YouTube target relocation
uses `Element.moveBefore` when available to retain the iframe browsing context;
the legacy node-move fallback can reload embedded content. Unmount releases
media and owned fullscreen/PiP; subscriptions survive until their returned
unsubscribe function is called. The controller owns this sequence for ordinary package use
and creates a fresh adapter per source load. Built-in HLS and YouTube adapters
discard or clean up superseded asynchronous load completions.

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
