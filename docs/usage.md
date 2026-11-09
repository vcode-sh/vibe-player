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

| Entry                    | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| `vibe-player/compact`    | `VibePlayerCompact`, compact/feed chrome and its types    |
| `vibe-player/stage`      | `VibePlayerStage`, full controls and assemblies           |
| `vibe-player/hook`       | `useVibePlayer`, controller bindings and host audio focus |
| `vibe-player/styles.css` | Scoped styles and host-overridable CSS variables          |
| `vibe-player/chips.css`  | The Ink Chips skin, only when a player uses it            |
| `vibe-player`            | Complete API, adapters, captions, previews and skins      |

Client entry points carry `"use client"`; imports are safe during SSR.
JavaScript is side-effect-free so bundlers can discard unused variants.
`hls.js` is a peer dependency (`^1.6.0`); the host provides its one installed
copy, and MP4 playback never imports it. A host serving private HLS can pass
`loadHls={() => import("hls.js/light")}` to load the lighter build on first
use.

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

Source collections accept both ordinary arrays and readonly arrays, including
values declared with `as const`. The package reads source and caption collections
without mutating them. Replace the source value when media changes instead of
mutating an already supplied source in place.

## Seek Thumbnails

Pass `seekThumbnails` to `VibePlayerStage`, `VibePlayerInline`, or
`VibePlayerModal` to show a frame above the timeline while hovering, dragging,
or seeking with the keyboard. Custom controls and timelines accept the same
prop. `VibePlayerCompact` (glass and chips, compact and feed) accepts it too:
while hovering, scrubbing or seeking with the keyboard, its scrub readout shows
the frame above the time, positioned over the scrub point and kept inside the
player. With a [heatmap](#timeline-background), the frame appears in the
heatmap preview instead, so only one frame shows. Supply generated images and
their time map from your application:

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

A storyboard sheet of equal tiles, left to right and row by row, needs only its
geometry. Tile `n` covers `[n * interval, (n + 1) * interval)`; with
`duration`, the last tile reaches the end of the media:

```tsx
import { createVibePlayerSeekThumbnails } from "vibe-player";

// A 1600 x 900 sheet: 10 columns of 160 x 90 tiles, one every 5 seconds.
const thumbnails = createVibePlayerSeekThumbnails({
  columns: 10,
  count: 96,
  duration: 478.4,
  height: 90,
  interval: 5,
  url: "https://media.example.com/v/42/storyboard.jpg",
  width: 160,
});
```

A WebVTT thumbnail track (cues naming `sheet.jpg#xywh=x,y,w,h` or a standalone
image) converts with `parseVibePlayerSeekThumbnailsVtt(text, trackUrl)`;
relative image URLs resolve against `trackUrl`. Fetch the track yourself.

Times are seconds: start is inclusive and end is exclusive. At the exact media
duration, a frame ending at that duration remains available. The first matching
valid entry wins; sorting is not required. Use finite, nonnegative times with
`startTime < endTime`. Sprite coordinates must be finite and nonnegative, with
positive dimensions, and the rectangle must fit inside the loaded image.

Gaps, invalid entries, loading images, and failed images keep the time-only
tooltip. Thumbnail preview does not seek the video; moving over the timeline
leaves playback untouched. Clicking, dragging, and keyboard commands retain
their normal seek behavior. The package does not generate frames, fetch a
WebVTT thumbnail track, or obtain thumbnails from provider APIs.

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

### System Media Controls

`mediaSession` (off by default) connects a player to the browser's
[Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API):
lock screens, notifications, media hubs and hardware media keys show the
video and control it. Every assembly and `useVibePlayer` accept it.

```tsx
import { VibePlayerInline } from "vibe-player/stage";

declare function playNext(): void;

<VibePlayerInline
  mediaSession={{
    metadata: {
      album: "Season two",
      artist: "Ana Berg",
      artwork: [
        { sizes: "512x512", src: "/art/episode-4.jpg", type: "image/jpeg" },
      ],
    },
    onNextTrack: () => playNext(),
    seekBackwardSeconds: 15,
  }}
  source={source}
/>;
```

- `mediaSession` (or `true`) uses `source.title` and `source.posterUrl`;
  `metadata` overrides any field. Nothing is hard-coded.
- Play, pause and stop are always offered. Seek backward, forward and to a
  position (offsets default to the player's `seekStep`, 10 s unless set;
  `seekBackwardSeconds` / `seekForwardSeconds` and a system offset win) need a seekable
  provider; a burst of `fastSeek` positions while scrubbing keeps only the
  latest. Previous and next track appear only with `onPreviousTrack` /
  `onNextTrack`.
- `enterpictureinpicture` is registered when the provider supports
  Picture-in-Picture. Desktop Chrome then also opens it automatically when the
  viewer switches tabs during audible playback; `pictureInPicture: false`
  turns that off.
- Playback state and position (duration, rate, position) follow the player;
  live and unknown durations clear the position.
- A page has one media session. A player claims it when it becomes audible
  and keeps it while paused, so the lock screen can resume it. Stopping,
  closing, failing or unmounting releases it, clearing only what this player
  set; another player becoming audible takes it over.
- Hosts with their own audio focus registry pass `active`: `true` for the
  player that owns the session, `false` for every other one.
- Where the API is
  missing (server rendering, older browsers) the option does nothing; its code
  loads only for players that opt in.

## Seeking

One option, `seekStep`, sets how far every relative seek moves: skip buttons,
the arrow keys and J/L, double-tap seeking and the Media Session
`seekbackward` / `seekforward` defaults. It accepts any positive number of
seconds; 10 (default), 15 and 30 are the common choices. Every assembly and
`useVibePlayer` accept it.

```tsx
import { VibePlayerCompact } from "vibe-player/compact";
import { VibePlayerStage } from "vibe-player/stage";

<VibePlayerStage seekStep={15} source={source} />;

<VibePlayerCompact
  controls={{ skip: true }}
  gestures={{ doubleTapSeek: true }}
  seekStep={15}
  source={source}
  variant="feed"
/>;
```

- **Keyboard.** On the focused player, ← / → and J / L all move by the step
  (one number to learn; there is no separate fine step). Space / K, M, F and C
  are unchanged. Compact and full-stage players behave the same, except that
  the full stage's focused timeline keeps its native slider arrows.
- **Skip buttons.** ⟲ and ⟳ show the step inside the icon and are named from
  `labels.seekBackward(seconds)` / `labels.seekForward(seconds)` ("Back 10
  seconds", "Forward 10 seconds"). The full stage puts them around Play
  (`controls={{ skip: false }}` removes them). Compact and feed opt in with
  `controls={{ skip: true }}`: the glass capsule puts them around its play
  toggle, chips beside the corner controls. Every skin shows them from 280 px
  wide, where the rest of the bar still fits.
  They are absent wherever the provider cannot seek (live streams, or a
  provider whose capabilities say so). Replace the glyphs with
  `icons.seekBackward` / `icons.seekForward`; the step is still drawn inside.
  A custom bar built from `VibePlayerControls` shows them when given
  `onSkip(seconds)` and `seekStep`.
- **Double tap.** On touch, a double tap on the left or right third of the
  picture seeks back or forward by the step; each further tap on that side
  within 700 ms adds another step (−10, −20, −30), switching sides starts
  again. A soft wash on that side shows the total
  (`labels.seekOffset(seconds)`, "20 seconds"), a wave plays once per tap, and
  the indicator fades 700 ms after the last tap. It is decorative and announces
  nothing. On by default in the full stage; opt-in for compact and feed with
  `gestures={{ doubleTapSeek: true }}`, whose small gesture chunk then loads.
  - Thirds, not halves: the centre third keeps an undelayed single tap, which
    is where the primary Play button sits.
  - A single tap keeps its meaning. A side tap waits 300 ms (the platform
    double-tap timeout) for a second tap; centre taps, and every tap with the
    gesture off or the media unable to seek, act at once.
  - Only taps count: a scroll or a chips drag never fires it, a double tap
    never zooms the page (`touch-action: manipulation`), and taps on controls
    keep their own meaning.
  - A mouse never seeks this way. A mouse double-click on
    the full-stage picture toggles full screen; compact players keep a click as
    play/pause.
  - Reduced motion shows the same wash and total without the travelling wave.

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
recheck. A file conceals it too: an expired or forbidden file URL fails as an
unsupported source before media data loads, so that failure is rechecked the
same way. Managed HLS reports HTTP failures itself, so its media element
failures are not rechecked. A custom adapter whose media hides the HTTP status
sets `concealedStatus: true` on the error payload to get the same recheck. A
second failure before `playing` becomes terminal.

`onEvent` exposes a typed union of playback, renewal, stop, command-error and
integration-error events. Optional command failures emit `commanderror` with the
original error and reject their command promise, without interrupting playback.
`play()` resolves instead when a pause interrupts it (your own `pause()` or
`load()`, native controls, Picture-in-Picture or the system); a media failure
that interrupts it still reaches `state.error` and `onError`.
`timeupdate` also fires on the media's `progress`, `resize` and `stalled`
events to refresh the buffered amount and video size, so the time may not have
moved.
Convenience callbacks receive normalized controller state for `onPlay`,
`onPause`, `onEnded`, throttled `onProgress`, and `onQualityChange`; `onRenew`
receives the refreshed source. `onPlay`, `onPause` and `onEnded` normally run
after `onEvent` and `controller.on()` listeners received the event; when an
event listener itself causes the play, pause or end, that event is queued
behind the current one and the callback can run first. A callback is skipped
when a listener changed the state again before it ran. Nonfatal engine/integration diagnostics remain
events; terminal playback failures reach `state.error` and `onError`.
The ready-made UI retains its existing `onError` reporting for exceptions thrown
by state/caption observers (`phase: "integration"`), without changing playback
state. Progress callbacks are limited to one leading event per 250 ms.

Use `onAnalyticsEvent` to map normalized package events into your telemetry.
Use `resumeStore` when your app wants resume persistence. The package does not
write localStorage by default. `onStateChange` observes normalized player state;
`onError` receives a source-aware error with its lifecycle phase, a `kind` and
available provider details. `kind` is `"network"` (the connection failed),
`"decode"` (the media cannot be decoded), `"source"` (the media could not be
loaded or is not supported: unreachable, forbidden or an unsupported format)
or `"unknown"`. Updating these callbacks does not restart the player.

```tsx
<VibePlayerStage
  onAnalyticsEvent={(event) => analytics.track(event.type, event)}
  resumeStore={resumeStore}
  source={source}
/>;
```

Every seek sends one `seek` event, whoever started it. `initiator` is
`controller` for `seekTo()` (the package controls, shortcuts, Media Session or
your code) and `media` for a seek the media made itself (native controls,
Picture-in-Picture, the browser). `from` is the position the seek left and
`currentTime` the position it went to. Restoring a resume or recovery position
and rewinding to replay are not seeks. Each native `seeking` counts, so a scrub
on native controls can report several seeks in a row; coalesce events that
arrive close together if you want one per gesture. The browser and hls.js
also seek on their own, for example to skip a small gap or catch up to the
live edge. Those count as `media` seeks too: they send a `seek` event, start a
fresh watched batch and can save a resume position. Filter on `initiator` if
you only care about viewer-driven seeks.

Analytics follow one session per source. `opened` and `closed` bracket it:
retry, renewal, stop, offscreen release and remounting the same source keep
it, while loading a source (even the same one again), a renewal that returns
another source id, `closeSource()` and teardown close it. `closed` only
follows an `opened`. Each playback reports `started`, `progress_25`,
`progress_50`, `progress_75` and `completed` once; playing again after
`ended` starts a new playback, so they fire again. Milestones measure watched
coverage: the unique seconds the current playback actually played, divided by
the duration. Jumping ahead, scrubbing and rewatching do not count, and media
with an unknown duration (such as a live stream) reports no milestones.

The resume store hears `set(sourceId, seconds, context)` with
`context.duration` and `context.reason`. While media plays, the controller
saves at most once per 2 seconds of movement (`progress`). It always saves
once a seek settled (`seek`), on pause or stop (`pause`), when the page is
hidden (`hidden`) and when the source closes, loads again, changes or
unmounts (`close`).
The React bindings report a hidden page themselves; with a manual controller,
call `controller.flushWatchedRanges("hidden")`. Positions the controller
restores are not saved again, `ended` clears the position, and live sources
never touch the store. The built-in stores accept `minPositionSeconds` and
`minDurationSeconds`: saving an earlier position, or a shorter source, clears
the entry instead, so it starts over next time. Players do not coordinate:
players or tabs that share a source id overwrite each other's position, and
the last write wins.

```ts
import {
  createLocalStorageVibePlayerResumeStore,
  type VibePlayerResumeStore,
} from "vibe-player";

export const localResume = createLocalStorageVibePlayerResumeStore({
  minDurationSeconds: 120,
  minPositionSeconds: 10,
});

/** Your API; `null` forgets the position. */
declare function savePosition(sourceId: string, seconds: number | null): void;

/** Saves every position locally and sends only the boundaries to your API. */
export const syncedResume: VibePlayerResumeStore = {
  clear: (sourceId) => {
    localResume.clear(sourceId);
    savePosition(sourceId, null);
  },
  get: (sourceId) => localResume.get(sourceId),
  set: (sourceId, seconds, context) => {
    localResume.set(sourceId, seconds, context);
    if (context?.reason !== "progress") {
      savePosition(sourceId, localResume.get(sourceId));
    }
  },
};
```

`onWatchedRanges` (opt-in) reports which parts of the media actually played,
for "most replayed" data or completion that ignores skipping. Each report holds
the merged, sorted ranges (seconds) since the previous one and why it was
sent: `pause` (including stop and offscreen release), `ended`, `seek` (a seek
started, from `seekTo()` or the media), `reload` (retry or renewal reattached
the source), `close` (source changed, loaded again, closed or unmounted),
`hidden` (page hidden or `pagehide`), `limit` (64 separate ranges) or `flush`
(`controller.flushWatchedRanges()`). Every seek begins a fresh batch so
replayed stretches retain their playback time. Only
unpaused media progress counts, and only as fast as the wall clock allows, so
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

Each report names its playback. `playbackId` is guaranteed unique within the
page, and its random part makes a repeat across pages very unlikely: a new
playback starts when a source loads (even the same one again) and when media
plays again after it ended, while pause, seek, stop, retry and renewal keep
it. `sequence` numbers a playback's reports from 1. Together they identify a
report, so store it under your own session or user plus `playbackId` and
`sequence` (a unique key makes a retried delivery harmless), add up one
viewing per `playbackId`, and combine playbacks per `sourceId` for "most
replayed". This recipe counts one source's reports:

```ts
import type { VibePlayerWatchedRangesReport } from "vibe-player";

/** Unique seconds of one source the reports cover; duplicates count once. */
export function getWatchedSeconds(
  reports: readonly VibePlayerWatchedRangesReport[]
): number {
  const unique = new Map(
    reports.map((report) => [`${report.playbackId}:${report.sequence}`, report])
  );
  const ranges = [...unique.values()]
    .flatMap((report) => report.ranges)
    .sort((a, b) => a.start - b.start);
  let total = 0;
  let reached = Number.NEGATIVE_INFINITY;
  for (const { end, start } of ranges) {
    total += Math.max(0, end - Math.max(start, reached));
    reached = Math.max(reached, end);
  }
  return total;
}
```

`VibePlayerInline` and `VibePlayerModal` accept the same playback options,
including autoplay, callbacks, and `topActions`. Controls hide while media
plays; use `autoHideControls={false}` when they should remain visible.

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
are 44 px by default; see [Sizing The Compact Chrome](#sizing-the-compact-chrome). Reduced motion reaches the same states instantly; spinners
keep turning because loading is real.

Options:
- `controls={{ fullscreen, mute, seek, time }}` switches off default parts
  (capabilities still apply). `skip: true` opts in to skip back/forward
  buttons and `gestures={{ doubleTapSeek: true }}` to double-tap seeking; both
  move by `seekStep` (see [Seeking](#seeking)). `pictureInPicture: true` opts in to a
  Picture-in-Picture button where the provider supports it (file and HLS in
  browsers with the API). The compact skins have no volume
  slider. `centerButton: "except-paused"` hides the glass centre button while
  paused, when the capsule already offers Play, so a small player shows one
  Play; idle, loading and ended keep it (`"always"`, the default, shows it
  whenever the media is not playing; chips has no centre button).
- `host` renders the player into an element you own and moves it there while
  playing; see [Detached Hosts](#detached-hosts).
- `timelineBackground` draws with the scrubber, e.g. the "most replayed"
  heatmap, and `seekThumbnails` feeds its frame preview (without a heatmap,
  the scrub readout shows the frame); see
  [Timeline Background](#timeline-background).
- `onExpand` replaces fullscreen on the expand control, e.g. to open a viewer.
- `slots={{ idle, ended, error }}` replaces one state panel; `null` renders
  nothing there.
- `renderOverlay={(surface) => …}` replaces the whole overlay. The shell keeps
  media, poster, timing, keyboard, autoplay and audio focus; the overlay gets
  `surface.state`, `surface.actions` and `surface.controls`.
- `icons` (add `unavailable` for the error glyph, `seekBackward` /
  `seekForward` for skips), `labels`, `formatTime` and
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
`picture-in-picture`, `skip-backward`, `skip-forward`, `seek-ripple` (with
`data-side` and `data-active`), `renewing`, `scrub-bubble`, `error`, `retry`, `poster`,
`timeline-background`, `heatmap` with `data-variant` and `data-active` while
shown). The root exposes
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

## Theming

Styles are scoped to the player and read CSS custom properties from any
ancestor. Full-stage tokens: `--vibe-player-text`, `--vibe-player-surface`,
`--vibe-player-stage-background`, `--vibe-player-accent`,
`--vibe-player-border`, `--vibe-player-radius`, `--vibe-player-control-size`,
`--vibe-player-icon-size`, `--vibe-player-spacing`, `--vibe-player-font` and
`--vibe-player-focus-color`. Compact colours (glass scrim, chips) are listed
under [Compact Skins](#compact-skins). Customize `icons`, `labels`,
`formatTime` and `classNames` part slots as props; times default to `0:07` /
`1:05:09`.

### Sizing The Compact Chrome

Floating and mini players resize, so the compact chrome takes sizing
variables. Each default is the chrome without them; set them on any ancestor:

| Variable                                 | Glass                                   | Chips                      |
| ---------------------------------------- | --------------------------------------- | -------------------------- |
| `--vibe-player-compact-control-size`     | 44 px capsule height and its buttons    | 44 px corner hit areas     |
| `--vibe-player-compact-inset`            | 8 px capsule and length pill from edges | 2 px hit areas from edges  |
| `--vibe-player-compact-gap`              | 0 between capsule parts                 | 0 between corner buttons   |
| `--vibe-player-compact-icon-size`        | 18 px (else `--vibe-player-icon-size`)  | 14 px buttons, 12 px Play  |
| `--vibe-player-compact-time-size`        | 12 px time and length                   | 12 px chip text            |
| `--vibe-player-compact-scrubber-height`  | 4 px rail                               | 6 px rail                  |
| `--vibe-player-compact-chip-size`        | —                                       | 28 px chip height and dots |
| `--vibe-player-compact-center-size`      | 56 px centre button (48 px below 300)   | —                          |
| `--vibe-player-compact-center-icon-size` | 24 px (20 px below 300)                 | —                          |

Control and centre sizes never resolve below 24 px, so a hit area stays at
least 24 px (WCAG 2.2 target size). Keep 44 px on coarse pointers yourself.
The full stage keeps its own `--vibe-player-control-size` and
`--vibe-player-spacing`; the compact names never restyle it.

Container units resolve against the player's own width (each player is a
`vibe-player` size container), so one rule scales the chrome with the frame:

```css
.mini-player {
  /* 28 px controls at 200 px wide, 44 px from about 420 px. */
  --vibe-player-compact-control-size: clamp(28px, 10.5cqw, 44px);
  --vibe-player-compact-inset: clamp(6px, 2cqw, 8px);
  --vibe-player-compact-icon-size: clamp(14px, 4.3cqw, 18px);
  --vibe-player-compact-time-size: clamp(11px, 3cqw, 12px);
  --vibe-player-compact-center-size: clamp(36px, 13.4cqw, 56px);
  --vibe-player-compact-center-icon-size: clamp(16px, 5.8cqw, 24px);
  --vibe-player-compact-chip-size: clamp(22px, 7cqw, 28px);
}

/* Touch keeps 44 px targets at every size. */
@media (pointer: coarse) {
  .mini-player {
    --vibe-player-compact-control-size: 44px;
  }
}
```

```tsx
import { VibePlayerCompact } from "vibe-player/compact";

export function MiniPlayer() {
  return (
    <div className="mini-player">
      <VibePlayerCompact
        controls={{ centerButton: "except-paused" }}
        source={source}
      />
    </div>
  );
}
```

The glass time readout hides below 260 px and skip buttons below 280 px, at
any size.

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
  also state-preserving for focus and embedded frames.
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

`timelineBackground` draws host content with every package timeline: the glass
capsule, the chips rail and the full-stage timeline. It is rendered under the
progress fill, gets no pointer input, and leaves the seek hit area unchanged.
Its context carries `duration` (seconds, 0 until known), the player's
`seekThumbnails`, and `preview`: the moment being previewed. `preview.fraction`
(0..1, or null at rest) follows the pointer, a scrub or a keyboard seek;
`preview.subscribe(listener)` reports each change outside React, so a custom
background can move its parts through refs without re-rendering on every
pointer move. A plain background (chapter marks, ad markers) rests at 45 %
opacity and comes forward while the viewer hovers, focuses or scrubs.

### Most replayed

`VibePlayerHeatmap` draws replay intensity for equal slices of the duration,
normalized to 0..1 (typically 100 values). Nothing shows at rest. While the
viewer hovers or scrubs the timeline (pointer, touch or keyboard):
- `variant="glide"` (default): one thin smooth line reveals left to right over
  the rail (400 ms, retracting in 240 ms from wherever it got to), with a soft
  gradient under it and a dot riding the line at the pointer.
- `variant="curve"`: a filled curve rises over the rail.

Above it, a preview shows the seek frame (when the player has
`seekThumbnails`), the time, and a label: `labels.mostReplayed` near a peak,
otherwise `labels.replayValue(value)` for that slice. `replayValue` returns ""
by default, so only hosts whose values mean something to viewers show them.
The preview replaces the skin's own scrub readout (glass bubble, chips time
chip, full-stage tooltip) and stays inside the player.

```tsx
import {
  createVibePlayerSeekThumbnails,
  VibePlayerCompact,
  VibePlayerHeatmap,
} from "vibe-player/compact";

// From your server: the share of viewers who reached each of 100 slices.
declare const replayShare: readonly number[];

const thumbnails = createVibePlayerSeekThumbnails({
  columns: 10,
  count: 96,
  height: 90,
  interval: 5,
  url: "/v/42/storyboard.jpg",
  width: 160,
});

<VibePlayerCompact
  labels={{
    mostReplayed: "Most replayed",
    replayValue: (share) => `${Math.round(share * 100)}% of viewers`,
  }}
  seekThumbnails={thumbnails}
  source={source}
  timelineBackground={() => <VibePlayerHeatmap values={replayShare} />}
  variant="feed"
/>;
```

Peaks are the top three local maxima at or above `peakThreshold` (default
0.6), ignoring the first 3 % of the video, whose opening is always replayed.
Pass `peaks` (duration fractions, 0..1) to name them yourself. Keep `values`
and `peaks` referentially stable between renders.

CSS custom properties: `--vibe-player-heatmap-color` (defaults to the
timeline's foreground; white on the chips rail), `--vibe-player-heatmap-height`
(40 px glide, 26 px curve, 28 px in players narrower than 360 px),
`--vibe-player-heatmap-gap` (above the rail), `--vibe-player-heatmap-opacity`
(area fill) and `--vibe-player-heatmap-frame-width` (132 px, 96 px narrow).
Reduced motion reaches the same states instantly. The graph moves only
`clip-path`, `transform` and `opacity`. `onWatchedRanges` below supplies the
data a server can aggregate into those values.

## Custom And Headless UI

Choose `VibePlayerCompact` for chat/comments and feed (`variant="feed"`), and
`VibePlayerStage` for the full chrome. Supply `icons`,
`labels`, `formatTime`, `classNames`, `className` and `style` to adapt the surface.
Frame ratios follow source dimensions or decoded metadata and default to a
9:16–16:9 clamp. No minimum height is imposed.

`VibePlayerHeadless` renders a bare video for HLS, MP4 and legacy file sources;
use `useVibePlayer` with a container target for custom media surfaces.
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

`controller.on(type, listener)` listens to the same event stream as `onEvent`,
narrowed and typed to one event type, or every event with `"*"`. It returns an
unsubscribe function. Events and `subscribe()` states arrive in order and none
are skipped, even when a listener changes the player meanwhile, so a listener
can receive a state that is already superseded (`getState()` returns the
latest); a throwing listener becomes a nonfatal `integrationerror`. A
listener added while an update is delivered starts with the next one, and one
removed meanwhile receives nothing more.
`state.lastEvent` names only the latest event, so use `on()` or `onEvent` when
every event matters. `onWatchedRanges` runs before the state reflects the
event that sent the report.

```ts
import type { VibePlayerController } from "vibe-player";

declare const controller: VibePlayerController;

const stopListening = controller.on("seeked", (event) => {
  console.info(event.source.id, event.snapshot.currentTime);
});
// Later, when the owner unmounts:
stopListening();
```

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

## Bundle Size

`bun run package:size` measures built output and enforces an initial combined
compact + hook budget of **27,700 B gzip**, excluding React, React DOM and
`hls.js`. Provider bridges and the Ink Chips skin are separate chunks loaded on
first use; the report also includes their deferred bytes and the complete
consumer bundle. Measurements use a minified Vite application, include
non-peer dependencies, exclude React/React DOM/hls.js, and sum each emitted
chunk's gzip size. The package ships readable, unminified ESM, so all package
ESM files keep separate limits of 343 KiB raw and 85 KiB gzip.

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

The demo has two pages. `/` is the feature showcase: every public feature with
a working example and the props it uses, including a "Skip and double-tap
seek" section with a `seekStep` switch (10, 15, 30 s), skip buttons in glass,
chips and the full stage, and compact players showing seek frames without a
heatmap. Its clips are generated: run `bun run test:browser:host:media` once
after a fresh clone. `?demo=workbench` is the provider workbench (remote file,
HLS and Bunny Stream).
