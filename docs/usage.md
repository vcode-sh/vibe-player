# Usage Guide

Vibe Player is a React package. It owns playback, controls, captions, keyboard
behavior, provider adapters, and the default cinematic skin. Your app owns
routing, telemetry, persistence, auth, billing, SEO, and media policy.

## Install

```bash
npm install vibe-player hls.js
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

The compact API accepts a single URL and optional metadata:

```ts
import type { VibePlayerSource } from "vibe-player";

const source = {
  id: "portrait-clip",
  type: "mp4",
  url: "/video/clip.mp4",
  width: 1080,
  height: 1920,
  durationSeconds: 45,
  posterUrl: "/video/poster.jpg",
} satisfies VibePlayerSource;
```

Use `type: "hls"` with the same URL shape for an HLS manifest. `expiresAt`
accepts an ISO timestamp or epoch milliseconds. Legacy file source lists and
HLS `manifestUrl` remain supported:

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

Inline, compact and headless assemblies default to `load="onPlay"`. Until Play,
only the poster can load, with no attached engine or media request. `load="eager"`
prepares the selected source immediately; `load="visible"` prepares it when the
frame first intersects the configured visibility threshold. The bare hook and
manual controller retain their eager defaults.

Set `autoplayWhenVisible` for an opt-in muted start on the source's first visible
entry. After scrolling away, hiding the tab or manually stopping, returning waits
for a deliberate Play. Ordinary `autoPlay` remains an explicit startup request.

Audible players share an `audioFocus` group (`"default"` unless changed). A
muted source does not interrupt another audible source; unmuting joins focus.
Use a different group for independent surfaces or `audioFocus={false}` when the
host owns policy. `useVibePlayerAudioFocus({ group, onPause })` lets voice notes
claim/release that same group. Hidden tabs and offscreen frames release playback
by default. `pauseWhenHidden={false}` and `stopWhenOffscreen={false}` disable
those policies; `offscreenThreshold` defaults to `0.25`.

`autoPlay` asks the package to start playback after the source loads. By
default, startup uses muted bootstrap because browsers do not owe anyone
audible autoplay.

Use `autoPlayMutedBootstrap={false}` only when opening from a real user
gesture and audible playback is intended:

```tsx
<VibePlayerStage autoPlay autoPlayMutedBootstrap={false} source={source} />;
```

## Host Hooks

`renewSource` returns a fresh source, usually from the media owner's API. The
player calls it if credentials expire within 30 seconds at Play and after a
recoverable fatal network/authorization error. Renewal preserves the current
position and latest playback intent. One automatic renewal is allowed per lapse;
an actual `playing` event resets the budget. Stop, replacement and unmount fence
late completions. Retry explicitly renews and plays again.

An HLS HTTP 401/403 terminates the rejected delivery immediately, even when the
SDK initially considers the request recoverable. Native HLS conceals HTTP status
behind media errors, so a fatal native HLS error gets the same bounded credential
recheck. A second failure before `playing` becomes terminal.

`onEvent` exposes a typed union of playback, renewal, stop, command-error and
integration-error events. Optional command failures emit `commanderror` with the
original error and reject their command promise, without interrupting playback.
Convenience callbacks receive normalized controller state for `onPlay`,
`onPause`, `onEnded`, throttled `onProgress`, and `onQualityChange`; `onRenew`
receives the refreshed source. Nonfatal engine/integration diagnostics remain
events; terminal playback failures reach `state.error` and `onError`.
The ready-made UI retains its existing `onError` reporting for exceptions thrown
by state/caption observers (`phase: "integration"`), without changing playback
state. Progress callbacks are limited to one leading event per 250 ms.

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

`onWatchedRanges` (opt-in) reports which parts of the media actually played,
for "most replayed" data or completion that ignores skipping. Each report holds
the merged, sorted ranges (seconds) since the previous one and why it was
sent: `pause` (including stop and offscreen release), `ended`, `close` (source
changed, closed or unmounted), `hidden` (page hidden or `pagehide`), `limit`
(64 separate ranges) or `flush` (`controller.flushWatchedRanges()`). Only
progress while playing counts, and only as fast as the wall clock allows, so
seeks, scrubs, loops and stalls never do. Nothing is sent or stored by the
package; use `navigator.sendBeacon` or your API client:

```tsx
import { VibePlayerCompact } from "vibe-player/compact";

<VibePlayerCompact
  onWatchedRanges={(report) =>
    navigator.sendBeacon("/api/watched", JSON.stringify(report))
  }
  source={source}
/>;
```

`VibePlayerInline` and `VibePlayerModal` accept the same playback options,
including autoplay, callbacks, and `topActions`. Use `autoHideControls={false}`
when controls should remain visible. The default follows the adapter's normalized
chrome capability.

`VibePlayerModal` starts audible playback when it opens, because opening a
viewer is a deliberate act; pass `autoPlay={false}` to wait for Play. Playing
media hides its controls `controlsHideDelay` ms after the last pointer activity
(compact/feed: 1400 for the glass skin, 1200 for chips; full: 2400); compact and
feed also hide when a mouse leaves. Keyboard focus on a control keeps them
visible; pointer focus does not. `fit="cover"` crops poster and video into a
frame clamped by `minRatio` / `maxRatio` instead of letterboxing.

## Compact Skins

`VibePlayerCompact` (chat, comments, and `variant="feed"`) has two skins over
one surface. `skin` switches them; everything else stays the same:

```tsx
import {
  VibePlayerCompact,
  type VibePlayerMp4Source,
} from "vibe-player/compact";
import "vibe-player/styles.css";
import "vibe-player/chips.css"; // only when a player uses skin="chips"

const source = {
  id: "clip",
  type: "mp4",
  url: "/video/clip.mp4",
} satisfies VibePlayerMp4Source;

export function Clips() {
  return (
    <>
      <VibePlayerCompact source={source} /> {/* skin="glass" by default */}
      <VibePlayerCompact skin="chips" source={source} />
    </>
  );
}
```

- **`glass` (Glass Capsule, default).** Frosted parts inset 8 px. One centre
  button morphs between Play, a delayed spinner, and Replay; a capsule (play,
  a short scrubber with a glass time bubble, time from 260 px, expand from
  400 px, mute) exists only while steering. Hides 1.4 s after the last pointer
  activity; reveal 160 ms, hide 130 ms.
- **`chips` (Ink Chips).** Theme-following chips in the corners: play and
  length at rest, pause and a countdown while playing, Replay after the end.
  A horizontal drag anywhere on the picture scrubs (8 px threshold, the full
  width spans the clip) with a transient rail and a large time readout; arrow
  keys do the same on the focused player. Hides after 1.2 s; 120/100 ms. Its
  JavaScript loads on first use and its CSS is the separate `chips.css`.

Both skins share the binding rules: while playing, nothing is drawn over the
video (feed muted autoplay keeps only its unmute control); a desktop mouse
leaving hides at once; movement reveals instantly; a first touch tap reveals
and never pauses, a second hides; pointer clicks never pin the controls, only
keyboard focus on a control does; paused, ended and error keep their affordance.
Loading feedback waits 320 ms and mid-playback renewal 600 ms. Touch targets
are at least 44 px. Reduced motion reaches the same states instantly; spinners
keep turning because loading is real.

Options:
- `controls={{ fullscreen, mute, seek, time }}` switches off default parts
  (capabilities still apply). `pictureInPicture: true` opts in to a
  Picture-in-Picture button where the provider supports it (file and HLS in
  browsers with the API; never YouTube). The compact skins have no volume
  slider.
- `host` renders the player into an element you own and moves it there while
  playing; see [Detached Hosts](#detached-hosts).
- `timelineBackground` draws under the scrubber; see
  [Timeline Background](#timeline-background).
- `onExpand` replaces fullscreen on the expand control, e.g. to open a viewer.
- `slots={{ idle, ended, error }}` replaces one state panel; `null` renders
  nothing there.
- `renderOverlay={(surface) => …}` replaces the whole overlay. The shell keeps
  media, poster, timing, keyboard, autoplay and audio focus; the overlay gets
  `surface.state`, `surface.actions` and `surface.controls`.
- `icons` (add `unavailable` for the error glyph), `labels`, `formatTime` and
  `classNames` (`playButton`, `duration`, `controls`, `progress`, `time`,
  `unmute`, `error`, `retry`, …) work as elsewhere.

Styling contract for host CSS and tests:

| Root attribute                 | Values                                                               |
| ------------------------------ | -------------------------------------------------------------------- |
| `data-state`                   | `idle`, `loading`, `playing`, `paused`, `ended`, `error`, `renewing` |
| `data-controls`                | `visible`, `hidden`                                                  |
| `data-busy`                    | `true` after the delays above                                        |
| `data-scrubbing`, `data-muted` | `true` / `false`                                                     |
| `data-autoplay`                | `muted` while autoplay muted it and the viewer has not changed it    |
| `data-hold`                    | `phase`, `keyboard-focus`, `scrub`, absent while hiding is allowed   |
| `data-skin`, `data-variant`    | `glass` / `chips`, `compact` / `feed`                                |

Every drawn part carries `data-part` (`overlay`, `play-button`, `duration`,
`controls`, `toggle`, `track`, `time`, `fullscreen`, `mute`, `unmute`,
`picture-in-picture`, `renewing`, `scrub-bubble`, `error`, `retry`, `poster`,
`timeline-background`, `heatmap`). The root exposes
`--vibe-player-progress` (0..1, written only while controls show or a scrub
runs). Theme variables: `--vibe-player-accent` (chip rail fill),
`--vibe-player-focus-color`, `--vibe-player-radius`, `--vibe-player-font`,
`--vibe-player-scrim` and `--vibe-player-scrim-filter` (glass), and
`--vibe-player-chip-background`, `-foreground`, `-solid`, `-shadow` (chips;
defaults follow the host `color-scheme` through `light-dark()`).

`VibePlayerScrubber` is the styleable seek track both skins use: an ARIA slider
with `aria-valuetext`, pointer capture and Home/End, drawn from spans the skin
CSS styles. A custom overlay can reuse it with `surface`.

`controller.getState().renewing` is true while an expired or failed delivery
is renewed; the surface reports it as `renewing` only when it interrupts
playback.

## Detached Hosts

A mini-player, a docked player or a picture that follows the reader needs one
session to move between places without restarting. Give `VibePlayerCompact` a
`host` element; changing it moves the same media element, chrome, React state
and buffer there:

```tsx
import { useState } from "react";
import {
  VibePlayerCompact,
  type VibePlayerMp4Source,
} from "vibe-player/compact";

export function FeedClip({ source }: { source: VibePlayerMp4Source }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [mini, setMini] = useState<HTMLElement | null>(null);
  const [floating, setFloating] = useState(false);
  return (
    <>
      <div className="clip-slot" ref={setSlot} />
      {floating ? <aside className="mini-player" ref={setMini} /> : null}
      <button onClick={() => setFloating((value) => !value)} type="button">
        {floating ? "Dock" : "Float"}
      </button>
      <VibePlayerCompact
        host={floating ? mini : slot}
        source={source}
        stopWhenOffscreen={false}
        variant="feed"
      />
    </>
  );
}
```

- `null` keeps the player in its last host, so a host that mounts one commit
  later (as above) causes no gap. Omitting `host` renders in place as before;
  pick the mode when the player mounts, because switching between the two
  modes remounts it.
- The player renders nothing on the server and appears after the first client
  commit, inside a `display: contents` wrapper appended to the host. Size the
  host; the player fills it like any other frame.
- Moves are synchronous, so `<video>` keeps playing in every engine and fires
  no `emptied` or `loadstart`. Where `Element.moveBefore()` exists the move is
  also state-preserving for focus and iframes.
- **YouTube:** the iframe survives a move only with `moveBefore()` (Chromium).
  Other engines reload a moved iframe, which restarts the YouTube player.
  Offer a floating YouTube player only when
  `"moveBefore" in Element.prototype`, or keep YouTube inline.
- Visibility follows the player: `stopWhenOffscreen` and
  `autoplayWhenVisible` observe it in whichever host shows it. A player that
  floats _because_ its slot scrolled away should pass
  `stopWhenOffscreen={false}` so the release and the float do not race.
- React context and events follow the React tree, not the host's DOM: a click
  inside the floating player still bubbles to the component that renders it.
  CSS custom properties follow the DOM, so set theme variables on (or above)
  every host.
- Picture-in-Picture is separate: the browser window keeps playing while the
  page frame is offscreen or the tab hidden, and the usual release applies
  after it closes.

Custom UI built on `useVibePlayer` can wrap its own markup in
`VibePlayerHostFrame`; the same rules apply:

```tsx
import type { ReactNode } from "react";
import { VibePlayerHostFrame } from "vibe-player/compact";

export function MovablePlayer(props: {
  children: ReactNode;
  host: HTMLElement | null;
}) {
  return (
    <VibePlayerHostFrame host={props.host}>
      {props.children}
    </VibePlayerHostFrame>
  );
}
```

## Timeline Background

`timelineBackground` draws host content under the progress fill of every
package timeline: the glass capsule, the chips rail and the full-stage
timeline. It receives `{ duration }` (seconds, 0 until known), gets no pointer
input, and leaves the seek hit area unchanged. It rests at 45 % opacity and
comes forward while the viewer hovers, focuses or scrubs the timeline; reduced
motion makes that change instant.

`VibePlayerHeatmap` is a ready-made "most replayed" graph for it. Pass replay
intensity for equal slices of the duration, normalized to 0..1:

```tsx
import { VibePlayerCompact, VibePlayerHeatmap } from "vibe-player/compact";

const replayIntensity = [0.2, 0.35, 1, 0.6, 0.3, 0.8];

<VibePlayerCompact
  source={source}
  timelineBackground={() => <VibePlayerHeatmap values={replayIntensity} />}
/>;
```

The layer rises from the rail's bottom edge:
`--vibe-player-timeline-background-height` (16 px compact, 24 px full),
`--vibe-player-timeline-background-rest-opacity`, and for the graph
`--vibe-player-heatmap-color` (defaults to the timeline's foreground) and
`--vibe-player-heatmap-opacity`. Chapter marks or ad markers can use the same
slot with `duration`. `onWatchedRanges` below supplies the data a server can
aggregate into those values.

## Custom And Headless UI

Choose `VibePlayerCompact` for chat/comments and feed (`variant="feed"`), and
`VibePlayerStage` for the full chrome. Supply `icons`,
`labels`, `formatTime`, `classNames`, `className` and `style` to adapt the surface.
Frame ratios follow source dimensions or decoded metadata and default to a
9:16–16:9 clamp. No minimum height is imposed.

`VibePlayerHeadless` renders a bare video for HLS, MP4 and legacy file sources;
use `useVibePlayer` with a container target for iframe providers such as YouTube.
The component accepts `videoProps` for native
video attributes/events. It owns `src`, `poster`, `preload`, `autoPlay`, media
children and its mount ref; put host playback-policy callbacks on the top level and native DOM
handlers inside `videoProps`. It does not render package controls. The host is
responsible for the initial Play affordance.

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

`controllerRef` exposes the same controller from ready-made assemblies.
`stop()` destroys the engine and releases requests while retaining the source
and current position. `play()` creates a new engine when needed, `retry()`
renews then plays, and `seek()` is an alias for `seekTo()`. `subscribe()` and
`getState()` work outside React. Close/unmount a player as well as stopping it
when a host session ends; the package does not own application authorization.

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
