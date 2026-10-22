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
- Interactive demo and integration guides.

### Improved

- Modular provider adapters, stable React playback across rerenders, and
  consistent options for inline, modal, and custom player integrations.
- Readonly source inputs, complete usage examples, and explicit public exports.
- Architecture, package, and demo-build checks, with behavior-focused regression
  tests for playback, controls, captions, and media delivery.

### Changed

- Styles are distributed through `vibe-player/styles.css`.

### Fixed

- Prevent stale media events and outdated operations from overriding the active
  source or latest playback action, including premature autoplay on reopening.
- Wait for YouTube readiness and dispose pending players on timeout or unmount.
- Correctly decode captions and clear old text when switching videos.
- Preserve playing HLS fragments during quality changes and provide a stable
  server snapshot for React hydration.
- Refresh ambient previews when video or poster URLs change.
- Keep the volume panel closed after Escape restores focus to its button.
- Reject invalid HTTP byte ranges and avoid mistaking partial downloads for
  the full video size in media audits.

## [0.1.0] - 2026-06-08

### Added

- Initial package scaffold.
