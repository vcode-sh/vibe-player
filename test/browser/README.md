# Browser acceptance

Build the public package, then run the local browser lanes:

```bash
bun run build
bunx playwright install chromium webkit
bun run test:browser
# Run one engine while debugging:
bun run test:browser --project=webkit
bun run test:browser --project=chromium
```

The dedicated fixture imports `vibe-player` and `vibe-player/styles.css` through
the package exports. It has no source alias and no live media/CDN dependency.
It exercises ready-made and headless consumers, including deliberately fresh
source objects and callbacks when the host rerenders. A separate preview page
verifies real muted decoding, dynamic reduced-motion preference, host pause
ownership and active-media cleanup. Tarball installation is
verified by the separate packed-consumer gate.

The WebKit project runs its own native-HLS fixture through the public
`createHlsAdapter` runtime injection, with managed playback unavailable. It
keeps the browser's media APIs intact and requires real local manifest/segment
decoding, modal keyboard containment and honest fullscreen/PiP controls. Native
playback must expose the manifest URL rather than a managed MediaSource blob;
managed-only quality selection must be absent.

Linux WebKitGTK/WPE disables native HLS by default. Only the WebKit project sets
`WEBKIT_GST_ENABLE_HLS_SUPPORT=1`, the engine's documented opt-in, to exercise
that backend with installed GStreamer plugins. See the
[WebKitGTK release note](https://webkitgtk.org/2023/02/02/webkitgtk2.38.4-released.html).
This selects a real engine backend; it does not emulate Safari or patch media
support detection. Unsupported presentation APIs require their controls to be
absent and receive an explicit test annotation.

The lane checks native modal focus containment/restoration, nested popover
Escape handling, cleanup on close/provider replacement, HLS quality changes,
captions and package fullscreen controls. Geometry and pointer reachability run
at 320/390/768px viewports and 240/280px embedded widths in a wider viewport.
Seek preview acceptance covers decoded sprite crops and standalone frames,
hover without seeking, pointer/keyboard seeking, image failure fallback, and
preview bounds in Chromium and WebKit at 240/320/390/1100px player widths.
The selector tests own exact-duration frame selection. Browser keyboard checks
use Home and ArrowRight: during acceptance, Linux WebKit intermittently reported
zero after an exact-end seek, even after initially reporting the requested end.

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
Chromium and Playwright WebKit decoding and package interactions. Playwright's
Linux WebKit build is not physical Safari/iOS: OS fullscreen/PiP, VoiceOver and
mobile hardware behavior still require those devices. Live YouTube, audible
autoplay policy and physical assistive-technology behavior remain separate
acceptance boundaries.
