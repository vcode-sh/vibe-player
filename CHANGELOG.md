# Changelog

## [Unreleased]

### Improved

- Strengthened testing guidelines and regression tests for playback, controls,
  captions, and media delivery, replacing checks that did not verify behavior.

### Fixed

- Correctly decode caption text and clear old captions when switching videos.
- Prevent outdated playback operations from overriding the active source or
  the latest play/pause action.
- Refresh ambient previews when their video or poster URLs change.
- Keep the volume panel closed after Escape restores focus to its button.
- Reject invalid HTTP byte ranges and avoid mistaking partial downloads for
  the full video size in media audits.

## [0.2.0]

### Added

- React video player for direct files, HLS streams, and YouTube, with inline
  and modal layouts, captions, keyboard controls, and a cinematic default skin.
- Ambient video previews and playback quality controls.
- Media audit CLI to diagnose slow starts, seeking issues, and CORS problems.
- Interactive demo and integration guides.

### Improved

- More stable React subscriptions and keyboard handling across rerenders.
- Updated dependencies and expanded release checks to verify demo builds.

### Changed

- Styles are distributed through `vibe-player/styles.css`.

### Fixed

- HLS quality switching no longer flushes the currently playing fragment.
- Fixed React hydration warnings caused by an unstable server snapshot.

## [0.1.0] - 2026-06-08

### Added

- Initial package scaffold.
