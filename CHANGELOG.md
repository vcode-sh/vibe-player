# Changelog

## [Unreleased]

Development version: **0.2.0**. This version has not been released.

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
- Interactive demo and integration guides.

### Improved

- Modular provider adapters, stable React playback across rerenders, and
  consistent options for inline, modal, and custom player integrations.
- Accessible modal focus, nested Escape behavior, container-responsive controls,
  and fullscreen/PiP state and exit actions.
- Readonly source inputs, complete usage examples, and explicit public exports.
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
- Reject invalid initial byte ranges, validate tail responses before computing
  MP4 diagnostic offsets, and distinguish partial downloads from full file size.

## [0.1.0] - 2026-06-08

### Added

- Initial package scaffold.
