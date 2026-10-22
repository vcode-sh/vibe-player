# Browser acceptance

Build the public package, then run the local Chromium lane:

```bash
bun run build
bunx playwright install chromium
bun run test:browser
```

The dedicated fixture imports `vibe-player` and `vibe-player/styles.css` through
the package exports. It has no source alias and no live media/CDN dependency.
It exercises ready-made and headless consumers, including deliberately fresh
source objects and callbacks when the host rerenders. A separate preview page
verifies real muted decoding, dynamic reduced-motion preference, host pause
ownership and active-media cleanup. Tarball installation is
verified by the separate packed-consumer gate.

The lane checks native modal focus containment/restoration, nested popover
Escape handling, cleanup on close/provider replacement, HLS quality changes,
captions and package fullscreen controls. Geometry and pointer reachability run
at 320/390/768px viewports and 240/280px embedded widths in a wider viewport.

Fullscreen coverage uses the package controls, the F shortcut and the browser's
actual `document.exitFullscreen()` API to verify external state changes.
Playwright's CDP Escape injection does not trigger Chromium's reserved
fullscreen exit action, reproduced both headless and headed under Xvfb without
the package. Physical Escape behavior remains a manual browser check.

An additional loopback origin serves protected HLS media on port 5198. The
credential case uses an isolated test-context cookie and matching CORS headers;
every manifest and segment requires that cookie. No production account or
credential is accessed.

Media is synthetic and generated from FFmpeg's `testsrc2` filter without external
input. The fixture assets are distributed under this repository's Apache-2.0
license. Reproduce them with FFmpeg and libx264 installed:

```bash
bun test/browser/generate-media.mjs
```

The committed MP4/HLS/VTT assets let CI run without FFmpeg. These tests prove
Chromium decoding and package interactions. Live YouTube, native WebKit HLS,
audible autoplay policy, and assistive-technology behavior remain separate
acceptance boundaries.
