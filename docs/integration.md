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

For renewable private HLS, source dimensions, lazy startup, icon/label injection
and host session/audio policy, see [the usage guide](./usage.md).
Use `vibe-player/hook`, `/stage` or `/compact` to keep the consuming bundle scoped;
the package root continues to expose the complete API. Client entries carry
`"use client"` and can be imported safely by SSR frameworks.

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

### Media Session ownership

`mediaSession` is opt-in; see
[System Media Controls](./usage.md#system-media-controls). By default the
player that most recently became audible owns the page's single media session
and keeps it while paused. An application that already decides which media is
audible (its own registry, voice notes, calls) should state the owner
explicitly, so a player never holds the lock screen while the app's own audio
plays:

```tsx
import { useId } from "react";
import { VibePlayerCompact, type VibePlayerSource } from "vibe-player/compact";

// The app's own focus registry.
declare function useAudibleOwner(): string | null;
declare function claimWhenAudible(key: string, state: unknown): void;

function FeedVideo(props: { author: string; source: VibePlayerSource }) {
  const { author, source } = props;
  const key = useId();
  const ownsAudio = useAudibleOwner() === key;
  return (
    <VibePlayerCompact
      audioFocus={false}
      mediaSession={{ active: ownsAudio, metadata: { artist: author } }}
      onStateChange={(state) => claimWhenAudible(key, state)}
      source={source}
    />
  );
}
```

`active: false` releases the session; a release never clears metadata that
other page code set after the player. The package does not pause the app's
other media for the session: audio focus stays the app's decision.

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
enables localStorage by default. `set(sourceId, seconds, context)` receives a
`VibePlayerResumeContext` (`duration` and `reason`), so a store can apply its
own policy. Progress saves at most once per 2 seconds of movement; a settled
seek, pause or stop, page hide and close always save. Restored positions are
not saved, the end clears the position and live sources never save. The
built-in stores take `minPositionSeconds` and `minDurationSeconds`, below
which a save clears the entry. Stores are last-writer-wins: players and tabs
sharing a source id overwrite each other, so a host that needs one owner per
source coordinates that itself.

Analytics is opt-in through `onAnalyticsEvent`. Consumers should map normalized
package events into their own telemetry pipeline and ignore package events that
duplicate host-owned lifecycle events. A session (`opened` to `closed`)
survives retry, renewal, stop and remounting of the same source id; a host
load or another source id starts a new one. `started`, the progress milestones
and `completed` fire once per playback (a replay after `ended` is a new
playback). Milestones use the playback's watched coverage, unique watched
seconds over the duration, never the position; an unknown duration reports
none.

Watched ranges are opt-in through `onWatchedRanges`: merged media ranges that
played since the last report, delivered on pause, end, close, page hide, at 64
ranges, when a seek starts (`seek`), when retry or renewal reattaches the
source (`reload`), or on `controller.flushWatchedRanges()`. `seekTo()` delivers
the batch before it seeks, for every provider; native `seeking` and `seeked`
events keep seek jumps out of watched time and separate replayed ranges.
Watched time follows the provider's own events, so a seek that finishes during
a pending pause still ends, and a seek the provider never finishes ends at the
next pause, end, error or reload. Each report carries `playbackId` (unique
within the page; a new one per load and per replay after `ended`, kept across
retry and renewal) and a 1-based `sequence` within that playback, so the host
can deduplicate by `playbackId` + `sequence` and aggregate per playback. The
host owns transport, sampling and aggregation (for example into the normalized
values that `VibePlayerHeatmap` draws on hover and scrub). Callback failures
report as nonfatal `integrationerror` events with
`operation: "watched-ranges"`.

Offscreen and hidden-tab release never stops a player that is in
Picture-in-Picture; the policy applies again after the window closes.

Top-level product actions, such as "Open in app", should be passed as
host-owned UI through player composition props rather than hardcoded in the
package.

`onStateChange` observes the current normalized state. `onError` receives the
source ID, provider, phase (`create`, `mount`, `load`, `playback`, or
`integration`), `kind` (`network`, `decode`, `source` or `unknown`), message,
and available cause or provider details. Use `kind` to pick a friendly
message, such as "check your connection" for `network`. Controller
errors are also available as `state.error`; starting a new source clears the
previous source's error. Failures of UI observers (`onStateChange` and
`onCaptionStatusChange`) go directly to `onError` without mutating controller
state, avoiding a reporting feedback loop. Hosts choose where to report errors.

Rejected control commands include their name in `details.command`. Failures in
auxiliary actions such as fullscreen or PiP preserve ongoing playback. Browser
policy blocking `play()` uses the `playbackBlocked` notice instead of `onError`.
A pause the media makes itself while `play()` is pending (native controls,
Picture-in-Picture or the system) is a pause, not an error, and the host's own
`pause()` or `load()` likewise resolves the pending `play()` instead of
rejecting it. A media failure that interrupts `play()` still reaches
`state.error` and `onError` through the media's error event.
Resume-store, analytics, controller-subscriber and `controller.on()` listener
failures report as nonfatal `integrationerror` events with
`error.details.operation`; they cannot block media cleanup or remaining
listeners. Every state subscriber and event listener receives every update in
order: a change made while listeners run waits until all of them received the
current one, so a subscriber can receive a state that is already superseded.
`onWatchedRanges` runs before controller state reflects the event that sent
the report. A listener added during a delivery starts with the next state or
event, and one removed meanwhile receives nothing more. Listeners that keep
changing the player during notification are cut off after a bounded number of
updates per delivery, counted across the whole cascade so nesting cannot
multiply it. Every delivery that was cut off is reported once
(`operation` `"state-listener"`, `"event"` or `"provider-events"`), and the
report of the first (or only) delivery cut off in a cascade carries
`details.first: true`.
Provider events have a higher limit of their own, and source releases and
playback starts always reach the controller's own trackers, even during a
runaway. Afterwards every state subscriber that does not change the state
when it receives it ends on the latest state; a subscriber that changes it
again is not called again and stays one state behind. Rejected asynchronous
observer/write callbacks are contained too. Failure of `onError`
itself is contained without recursively reporting another error. A failed
resume read skips restoration; a provider's failed position-restore command
still reports in the `load` phase. The `state.error` is reserved for terminal
playback failures. Integration diagnostics are emitted as `onEvent` events with
`type: "integrationerror"`; healthy playback does not enter the error state.

The package normalizes seek requests to the adapter's duration and `canSeek`
capability before dispatch. Resume and seek analytics use that accepted target;
provider getters can lag immediately after an asynchronous seek. Seek analytics
also cover seeks the media starts itself (`initiator: "media"`, from native
`seeking`), except those an adapter marks `payload.internal: true` (hls.js
stall nudges, gap skips, live-edge catch-up and its start position), which
also keep the watched batch and save no resume position. A custom
`ManagedHlsController` can recognize its engine's own seeks with
`isInternalSeek(time)`. A custom adapter should report the new position as
soon as its `seekTo()` resolves: two progress events at the old position
after that count as "playback moved on", and a later echo of the seek is then
reported as a `media` seek. A `seekTo()` the media echoes as `seeking`/`seeked`
is reported once, and restoring a resume, recovery or replay position is not a
seek. Pending pause intent suppresses stale active events until a provider
pause acknowledgment; a later provider-initiated play can then update
normalized state. That intent shapes `state.lastEvent`; `onEvent`,
`controller.on()` and watched ranges see provider events as reported.

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
observers, and `topActions` to the package stage. Controls hide while media
plays; set `autoHideControls={false}` for a persistent control surface.
`controlsHideDelay` changes the idle delay. `VibePlayerModal` defaults to
`autoPlay`; pass `autoPlay={false}` for a viewer that waits for Play.

A host dialog can contain `VibePlayerStage variant="full"` with `autoFocus`.
Escape first closes the stage's own volume or quality popover and stops there;
otherwise it propagates to the host dialog untouched.

## Advanced Adapter Integration

The root API exports the built-in factories and named HLS runtime
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

Pass the resulting stable function as `adapterFactory`. For ordinary injection,
`loadHls={() => import("hls.js/light")}`, `hlsRuntime` and `hlsConfig` can be passed
directly to the hook or ready-made player. The default loader uses the full peer
build to preserve HLS features omitted by the light build.

Classic MediaSource uses hls.js even if the browser reports native HLS support.
ManagedMediaSource-only devices with native HLS use native playback deliberately,
including iOS 17.1+; when managed HLS is the only supported path, remote playback
is disabled for that engine. Native source assignment always calls `load()` to
start `preload="none"` elements. Inline HLS defaults cap quality to frame size,
use small forward/back buffers, reuse a recent bandwidth estimate for five
minutes and start conservatively for data saver. Host `hlsConfig` can override
those defaults.

For direct adapter use, subscribe, mount the target, then load the source and
await commands. Unsubscribe and unmount when the owner disposes the adapter.
Repeating a mount on the same target is idempotent. Unmount releases
media and owned fullscreen/PiP; subscriptions survive until their returned
unsubscribe function is called. The controller owns this sequence for ordinary package use
and creates a fresh adapter per source load. Built-in file and HLS adapters
discard or clean up superseded asynchronous load completions.

## Verification Checklist

Before replacing an existing product player, verify:
- file and HLS sources render through the same package shell;
- CSS is present in the app bundle;
- opening and closing removes the active media element;
- re-opening creates exactly one active media element;
- controls reflect adapter capabilities honestly;
- captions show only when a track is available;
- resume restore skips near-ended finite videos;
- telemetry is deduped in the host integration;
- long progressive MP4 files are faststart or replaced with HLS;
- browser automation and a real human click both pass playback smoke tests.
