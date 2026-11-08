# Changelog

## [Unreleased]

## [0.7.0] - 2026-11-08

### Added

- Public sizing variables for the compact chrome, so a resizable mini player
  can scale it: `--vibe-player-compact-control-size` (glass capsule height
  and buttons, chips hit areas; 44 px), `-inset` (glass 8 px, chips 2 px),
  `-gap` (0), `-icon-size` (glass 18 px, falling back to
  `--vibe-player-icon-size`; chips 14 px and 12 px in the Play chip),
  `-time-size` (12 px), `-scrubber-height` (glass 4 px, chips 6 px),
  `-chip-size` (28 px), `-center-size` (56 px, 48 px below 300 px) and
  `-center-icon-size` (24 px, 20 px below 300 px). Defaults are the current
  sizes, so nothing changes without them. Container units resolve against the
  player, and control and centre sizes never go below 24 px; keep 44 px on
  coarse pointers. The full stage's `--vibe-player-control-size` and
  `--vibe-player-spacing` are unaffected.
- `controls={{ centerButton: "except-paused" }}` hides the glass centre button
  while paused, when the capsule already offers Play, so small players show
  one Play. `"always"` (default) keeps the current behaviour.

### Documentation

- README rewritten as a short current overview; entry points, theming tokens
  and bundle size moved into `docs/usage.md`, which gains a Theming section
  with a container-query example for scaling the compact chrome.
- The demo showcase gains a "Sizing" section: glass and chips players in a
  frame from 200 to 420 px wide whose chrome scales with it.

## [0.6.0] - 2026-11-08

### Added

- `seekStep` on `useVibePlayer` and every assembly: the seconds one relative
  seek moves (any positive number; 10 by default, 15 and 30 are common). It
  drives skip buttons, the arrow keys and J/L, double-tap seeking and the
  Media Session `seekbackward` / `seekforward` defaults (explicit
  `seekBackwardSeconds` / `seekForwardSeconds` and a system offset still win).
- J and L seek back and forward by the step on the focused player, beside
  ← and →.
- Skip back/forward buttons showing the step inside a ring icon, named
  "Back 10 seconds" / "Forward 10 seconds". On by default around Play in the
  full stage (`controls={{ skip: false }}` removes them); opt-in in compact and
  feed with `controls={{ skip: true }}` (glass capsule and chips). Every skin
  shows them from 280 px wide; they are absent where the provider cannot seek. Custom bars get them from
  `VibePlayerControls` with `onSkip` and `seekStep`.
- Touch double-tap seeking: a double tap on the left or right third seeks by
  the step, further taps add up (−10, −20, −30) and a side wash shows the
  total, then fades. A side tap waits 300 ms for a second tap; centre taps
  stay immediate. On by default in the full stage; opt-in in compact and feed
  with `gestures={{ doubleTapSeek: true }}`, which loads a small chunk only
  then. Reduced motion keeps the same states without the wave.
- Compact and feed players (glass and chips) show `seekThumbnails` without a
  heatmap: the scrub readout draws the seek frame above the time while
  hovering, scrubbing or seeking with the keyboard, with the heatmap
  preview's frame size, radius and shadow, kept inside the player. Before,
  compact players showed frames only inside a `VibePlayerHeatmap` preview;
  with a heatmap that preview still owns the single frame.
- A mouse double-click on the full-stage picture toggles full screen
  (YouTube's desktop behavior); a single click still toggles playback.
- Types `VibePlayerGestures` and `VibePlayerStageControls`; icons
  `seekBackward` and `seekForward`; optional labels `seekBackward`,
  `seekForward` and `seekOffset` with English defaults. `VibePlayerSurfaceState`
  gains `seekStep` and `VibePlayerCompactControls` gains `skip`. New
  `data-part` values: `skip-backward`, `skip-forward`, `seek-ripple`.

### Changed

- Keyboard seeking is unified on `seekStep`: compact and feed players now move
  10 s per arrow press (previously 5 s), the same as the full stage, and both
  follow a configured step.
- The full stage gains skip buttons around Play and double-tap seeking on
  touch by default. Hosts that want the previous chrome pass
  `controls={{ skip: false }}` and `gestures={{ doubleTapSeek: false }}`.

### Upgrading

- The new labels are optional, so a complete `VibePlayerLabels` object
  (for example one checked with `satisfies VibePlayerLabels`) needs no
  change.
- Compact and feed arrow keys move 10 s instead of 5 s; pass `seekStep={5}`
  to keep the old distance (skip buttons, J/L and double taps then use 5 s
  too).

### Documentation

- 0.5.0 upgrading note that the release notes missed: `VibePlayerLabels`
  gained two required fields, `mostReplayed` and `replayValue`. Apps that
  pass a complete labels object checked against the type (for example with
  `satisfies VibePlayerLabels`) must add them; the defaults are
  `"Most replayed"` and `() => ""`.

## [0.5.0] - 2026-11-08

### Changed

- `VibePlayerHeatmap` no longer shows at rest. While the viewer hovers or
  scrubs the timeline (pointer, touch or keyboard) it reveals a "most
  replayed" graph: `variant="glide"` (default) draws one smooth line left to
  right with a dot riding it under the pointer; `variant="curve"` raises a
  filled curve. Above it, a preview shows the seek frame, the time, and
  `labels.mostReplayed` near a peak or `labels.replayValue(value)` elsewhere
  (empty by default). The preview replaces each skin's own scrub readout.
  Peaks are detected (top three local maxima at or above `peakThreshold`,
  default 0.6, ignoring the first 3 %) or passed as `peaks`. Reduced motion
  reaches the same states instantly. New CSS properties:
  `--vibe-player-heatmap-height`, `-gap` and `-frame-width`.

### Added

- `VibePlayerCompact` accepts `seekThumbnails`; glass and chips show the frame
  in the heatmap preview.
- `createVibePlayerSeekThumbnails({ url, columns, count, width, height,
interval })` maps a storyboard sprite sheet to seek thumbnails, and
  `parseVibePlayerSeekThumbnailsVtt(text, trackUrl)` reads a WebVTT thumbnail
  track (`sheet.jpg#xywh=x,y,w,h`).
- The `timelineBackground` context adds `seekThumbnails` and `preview`
  (`VibePlayerTimelinePreview`): the previewed fraction of the duration, with
  `subscribe` for updates outside React rendering.
- Opt-in `mediaSession` on `useVibePlayer` and every assembly connects the
  audible player to the browser Media Session API: title, artist, album and
  artwork (defaulting to the source title and poster), play, pause, stop,
  seek backward/forward/to (configurable offsets; `fastSeek` bursts keep the
  latest position), previous/next track only with `onPreviousTrack` /
  `onNextTrack`, and `enterpictureinpicture` where the provider supports
  Picture-in-Picture (desktop Chrome's automatic PiP; `pictureInPicture: false`
  opts out). Playback state and position stay in sync. One player owns the
  page session: the one that last became audible, or the one the host marks
  `active`; stopping, closing or unmounting releases only what it set.
  YouTube sources do not claim it, and its code loads only for players that
  opt in.

### Upgrading

- `VibePlayerHeatmap` is now hidden at rest (changed from 0.4.0, where it was
  always drawn under the timeline). It appears only while the viewer hovers or
  scrubs; hosts that relied on an always-visible graph have no switch to keep
  the old behavior. Its preview replaces the skin's own scrub readout while a
  heatmap is present.
- The published `styles.css` and `chips.css` are now minified. Class names,
  `data-*` attributes and CSS custom properties are unchanged.
- Size budgets move: runtime ESM gzip 42 -> 47 KiB, types 76 -> 86 KiB, and
  the initial compact + hook gzip budget 19,500 -> 20,500 B.

## [0.4.0] - 2026-11-08

### Added

- `VibePlayerCompact host={element}` renders the compact or feed player into a
  host element and moves it, still playing, whenever `host` changes (inline
  slot, mini-player, dock): no remount, re-buffer, `emptied` or `loadstart`.
  `null` keeps it in its last host. `VibePlayerHostFrame` offers the same move
  to custom UI built on `useVibePlayer`. File and HLS media move in every
  engine; a YouTube iframe keeps playing only where `Element.moveBefore()`
  exists (Chromium) and reloads elsewhere.
- `timelineBackground={({ duration }) => …}` draws host content under the
  progress fill of the glass, chips and full-stage timelines without changing
  their seek hit area. `VibePlayerHeatmap values={…}` is a ready-made "most
  replayed" graph for it (`--vibe-player-heatmap-color`, `-opacity`,
  `--vibe-player-timeline-background-height`).
- `onWatchedRanges` (opt-in, every assembly and the controller) reports the
  merged media ranges that actually played since the last report, on pause,
  end, close, page hide, at 64 separate ranges or on
  `controller.flushWatchedRanges()`. Seeks, scrubs, loops and stalls never
  count. The package sends and stores nothing.
- `controls={{ pictureInPicture: true }}` adds an opt-in Picture-in-Picture
  button to both compact skins where the provider supports it
  (`data-part="picture-in-picture"`, `surface.actions.togglePictureInPicture`,
  `surface.state.pictureInPicture`).

### Fixed

- Resuming a paused compact or feed player no longer flashes the poster over
  the paused frame or ignores presses for a moment: the resume stays
  `playing`, and a slow resume shows the ordinary stall spinner. A resume that
  must renew expired media still reports `loading`.
- Picture-in-Picture keeps playing when its inline frame scrolls offscreen or
  the tab is hidden. Closing it while the frame is still offscreen (or the tab
  hidden) applies the usual release.

### Upgrading

- No breaking changes. `VibePlayerSurfaceActions` gained
  `togglePictureInPicture`, `VibePlayerSurfaceState` gained `pictureInPicture`
  and `VibePlayerCompactControls` gained `pictureInPicture`; custom
  `renderOverlay` code compiles unchanged, but a hand-built object typed as
  `VibePlayerSurface` (for example in tests) needs the new fields.
- The initial compact + hook gzip budget moves from 18,500 B to 19,500 B.

## [0.3.0] - 2026-11-06

### Added

- Compact chat/comment, feed and bare-video headless surfaces alongside the
  existing full stage, inline shell, modal, captions, previews and YouTube modes.
- `load="onPlay" | "eager" | "visible"`, renewable sources, `stop()` and `retry()`.
  Playback retains its position and latest pause/play intent through one renewal
  per credential lapse; stopped and replaced sessions reject late results.
- URL sources for HLS and progressive MP4, optional dimensions, known duration,
  poster and expiry metadata. Legacy HLS `manifestUrl` and file source lists remain.
- Injectable HLS loader/runtime/config, inline buffer defaults, recent shared
  bandwidth estimates and data-saver startup.
- Named audible-media focus groups, a host-media participant hook, hidden-tab and
  offscreen release policies, and opt-in muted playback while visible.
- Controller refs, typed playback/renewal/progress/quality callbacks and diagnostic
  events; injectable icons, complete labels, time formatting and part class names.
- Client entry points at `/hook`, `/stage`, `/compact`, scoped styles, SSR-safe
  imports and a local gzip budget for the initial compact-plus-hook consumer
  (see the README's Bundle Size section).
- Local fMP4 adoption demos and token-expiry browser acceptance for private HLS
  hosts that keep authorization, copy, icons and session policy themselves.
- `fit="contain" | "cover"` on stage, compact, feed and modal crops poster and
  video into a host-clamped frame instead of letterboxing; fullscreen still
  letterboxes.
- `controlsHideDelay` (ms) sets how long playing media keeps its controls after
  the last pointer activity: 1400 (glass) or 1200 (chips) for compact/feed,
  2400 for full.
- Two compact/feed skins over one surface, switched with
  `VibePlayerCompact skin`: `glass` (Glass Capsule, default) and `chips` (Ink
  Chips; its JavaScript loads on first use, its CSS is `vibe-player/chips.css`).
  While playing nothing is drawn over the video (feed muted autoplay keeps
  only an unmute control); a mouse leaving hides at once, movement reveals,
  a first touch tap reveals and never pauses, and only keyboard focus on a
  control holds them. Glass: a morphing centre button, a capsule with a
  styleable scrubber and glass time bubble, a designed error panel. Chips:
  corner chips with a countdown, drag-anywhere scrub with a transient rail
  and time readout (arrow keys on the focused player), a chip error panel.
- Compact customisation: `controls` (`fullscreen`, `mute`, `seek`, `time`),
  `onExpand`, `slots` (`idle`, `ended`, `error`), and `renderOverlay`, which
  receives the `VibePlayerSurface` state and actions. Root `data-state`,
  `data-controls`, `data-busy`, `data-scrubbing`, `data-muted`,
  `data-autoplay`, `data-hold`, `data-skin`; `data-part` on every part;
  `--vibe-player-progress`, scrim and chip theme variables; new `classNames`
  parts and an `unavailable` icon. `VibePlayerScrubber` is the reusable
  ARIA seek track.
- `VibePlayerControllerState.renewing` reports a media delivery renewal in
  progress; compact shows it after 600 ms only when it interrupts playback.
- `--vibe-player-icon-size` themes control icons (18 px in the glass capsule,
  16 px full, 14 px in narrow full chrome).
- `controller.renewPoster()` renews an idle delivery once per load without
  loading media. Ready-made posters call it when their image fails, so a
  short-lived private poster grant shows the renewed poster.

### Fixed

- Compact and feed controls hide while playing again. A pressed Play/Pause kept
  pointer focus (and the removed start button never blurred), which pinned the
  controls forever. Only keyboard focus on a control now holds them; they hide
  after the skin's delay and at once when the mouse leaves, and focus stays on
  the player region so shortcuts keep working.
- The error state shows only its message and Retry; the idle Play button,
  playback bar and time badge are gone.
- Escape that closes the package's own volume or quality popover no longer
  reaches a host dialog (Base UI ignores `defaultPrevented`); the next Escape
  propagates normally.
- The first fragment is no longer requested twice on Play: the inline HLS config
  turns off hls.js's start-up bitrate test (`testBandwidth: false`), which
  downloaded and discarded the lowest lane's first fragment.
- Players share one `IntersectionObserver` per threshold instead of one each,
  and idle posters load lazily: 100 idle compact players used 100 observers
  and 100 poster requests, now 1 observer and only the posters near view.
- The modal renders its title once, in the stage overlay.
- Inline mount no longer downloads playlists or video segments before Play.
- Portrait frames use source or decoded dimensions without a fixed minimum height.
- Paused, ended, errored and focused players keep their controls; ended playback
  offers Replay, failures offer Retry, and loading feedback waits 300 ms.
- Video clicks remain reachable in narrow frames; a touch tap first reveals
  controls. Control transitions respect reduced motion and have no permanent
  `will-change` promotion.
- Native HLS explicitly calls `load()` after setting its source. Classic
  MediaSource uses hls.js even when Chrome advertises native HLS support.
- Stop/unmount destroy the engine, release source URLs and abort owned requests.
- Recoverable HLS diagnostics and integration observers no longer become fatal
  playback state.

### Migration from 0.2.x

- **Time format:** default times read `0:07` and `1:05:09` instead of `00:07`.
  Compact playback shows `0:07 / 0:30` (remaining time past an hour). Pass
  `formatTime` to keep the old format.
- **Viewer autoplay:** `VibePlayerModal` starts audible playback when it opens.
  Pass `autoPlay={false}` to wait for Play; a browser that still blocks sound
  shows the play-to-start notice.

- **Install the HLS peer:** add `hls.js@^1.6.0` to the host. It is no longer a
  pinned package dependency. A host that already ships hls.js can keep its copy
  and pass
  `loadHls={() => import("hls.js/light")}`. The default full loader preserves
  HLS features omitted by the light build.
- **React Server Components:** React entrypoints now carry `"use client"`.
  Place player integration in a client component; ordinary Node SSR imports
  remain safe.
- **Inline loading:** `VibePlayerInline`, `VibePlayerCompact` and headless video
  wait for Play. Add `load="eager"` to restore mount-time preparation. Manual
  controller loading and the bare hook retain their eager defaults.
- **Frame sizing:** remove compensating fixed-ratio/min-height overrides when
  source dimensions are available. Set `style={{ aspectRatio: "16 / 9" }}` or
  an explicit host rectangle if the former fixed frame was intentional.
- **Scoped theme tokens:** defaults no longer attach to `:root`. Set host theme
  values on the player or an ancestor; supply explicit values to unrelated CSS.
- **Engine choice:** MMS-only browsers with native HLS use the native path, which
  does not expose managed quality selection. Classic MSE retains hls.js; an
  injected runtime can own a different deliberate engine policy.
- **Manual lifecycle:** unmount retires the adapter and subscription. Mount binds
  the next target; Play activates its engine. Use `stop()` to retain position
  while releasing a mounted player. Configured adapter factories may now return
  a promise, so await a configured factory when invoking it directly.
- **Focus:** mount does not focus an inline/stage player. Set `autoFocus` when
  that behavior is required; the modal still manages viewer focus.
- **Coordination:** hidden tabs and offscreen players release playback; audible
  players use the default shared group. Set `pauseWhenHidden={false}`,
  `stopWhenOffscreen={false}` or `audioFocus={false}` where the host already owns
  the corresponding policy. Join voice notes to the same group before rollout.
- **Errors:** use `onEvent` for nonfatal engine and core integration diagnostics.
  `state.error` is reserved for terminal playback failures. Ready-made UI observer
  exceptions retain the existing `onError` callback with `phase: "integration"`
  while leaving playback state healthy. Rejected optional commands, including
  fullscreen and PiP, now emit `commanderror` and reject their promise without
  setting `state.error`.
- **Touch input:** the video surface reveals controls. Use the labeled Play/Pause
  button to change playback. Desktop focused-player shortcuts remain available.
- **Source readers/custom adapters:** HLS may contain `url` instead of
  `manifestUrl`, and `type: "mp4"` is a new source branch. Handle those additive
  branches in exhaustive source switches. Emit `playing` only when playback
  actually starts so renewal budgets reset at the correct boundary, and handle
  the new `playing` event in exhaustive adapter-event switches.

## [0.2.1] - 2026-11-04

We went looking for weak tests and found a few bugs hiding behind green
checkmarks. Awkward for us; smoother playback for you.

### Fixed

- Rapid play, pause, and play again now follows your latest action. An older
  playback request no longer gets the last word.
- Switching videos retires old subscriptions and callbacks before they can
  interfere with the new source. Invalid saved playback positions are ignored.
- YouTube reports ready only once its player is usable, and cancelled loads
  release their timers promptly.
- Captions keep valid cue identifiers and spacing, reject malformed timestamps,
  and avoid repeat downloads when a host recreates an equivalent caption track.
- Seeking and volume changes follow the pointer that started the drag. Tooltips
  stay inside the player after resize and scroll events.
- Ambient previews release the previous video on schedule, even across host
  rerenders. Closed players stop scheduling control-hide timers.
- HLS quality selection accepts only options the stream actually offers.
- The media audit catches incomplete or oversized range responses instead of
  declaring a file ready on the strength of optimistic HTTP headers.

### Improved

- A smaller, minified runtime with the same public API and readable type
  declarations. Existing package size limits remain in place.
- Stronger regression tests, fewer duplicate checks, and more reliable cleanup
  of timers, listeners, media, and test environments.

## [0.2.0] - 2026-10-22

### Added

- React video player for direct files, HLS streams, and YouTube, with inline
  and modal layouts, captions, keyboard controls, and a cinematic default skin.
- Ambient video previews, playback quality controls, and a media audit CLI for
  startup, seeking, and CORS diagnostics.
- Shared headless playback hook, source-aware state/error callbacks, and named
  provider runtime contracts.
- Caption availability callbacks and retry actions for ready-made and custom UI.
- Optional seek thumbnails from timed images or sprite sheets, with time-only
  fallback when a frame is unavailable.
- Embedded YouTube playback uses package controls by default, laid out above
  and below the video so no package control, menu or notice covers the YouTube
  player. `controls: "native"` switches to YouTube's own controls, including its
  caption and quality menus, and `captionLanguage` / `showCaptionsByDefault`
  request startup captions. Custom caption and quality menus for YouTube remain
  unavailable because the IFrame API does not support them.
- `controlsPresentation` capability (`overlay`, `outside` or `provider`) so
  custom UIs can tell where playback controls belong.
- Interactive demo and integration guides.

### Improved

- Modular provider adapters, stable React playback across rerenders, and
  consistent options for inline, modal, and custom player integrations.
- Accessible modal focus, nested Escape behavior, container-responsive controls,
  and fullscreen/PiP state and exit actions.
- Readonly source inputs, complete usage examples, and explicit public exports.
- Source-dependent capabilities are published when a source starts loading,
  so layout does not wait for slow provider readiness.
- Media-audit deadlines, cancellation, and origin-specific HTTP diagnostics.
- Maintained Chromium/WebKit acceptance, live YouTube smoke, native keyboard
  and screen-reader checks, plus installed-consumer verification of documented
  recipes and minimum Node/React compatibility.

### Changed

- Styles are distributed through `vibe-player/styles.css`.

### Fixed

- Prevent accidental text selection while dragging seek and using player controls.
- Prevent stale media events and outdated operations from overriding the active
  source or latest playback action, including premature autoplay on reopening.
- Isolate host persistence and observer failures, normalize seek targets, and
  accept provider playback after pause acknowledgment.
- Honor managed HLS credentials and preserve terminal media errors and details.
- Wait for YouTube readiness, retry failed SDK loading, preserve repeated mounts,
  and use provider autoplay-blocked events and supported playback rates.
- Correctly decode captions and clear old text when switching videos.
- Preserve playing HLS fragments during quality changes and provide a stable
  server snapshot for React hydration.
- Refresh ambient previews when asset URLs change, observe motion preferences,
  and stop disposed work from restarting media.
- Keep caption requests stable across callback updates, report failures without
  interrupting playback, and preserve keyboard focus after caption retry.
- Keep the volume panel closed after Escape restores focus to its button.
- Keep the playback speed tooltip inside narrow players.
- Reject invalid initial byte ranges, validate tail responses before computing
  MP4 diagnostic offsets, and distinguish partial downloads from full file size.

## [0.1.0] - 2026-06-08

### Added

- Initial package scaffold.
