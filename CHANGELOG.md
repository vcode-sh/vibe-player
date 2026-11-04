# Changelog

## [Unreleased]

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
