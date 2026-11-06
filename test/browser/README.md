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

A YouTube layout page drives the real package YouTube adapter through an
injected runtime that mounts a local `srcdoc` iframe, so no YouTube network is
used. In Chromium it checks custom and native control presentation at 960, 640
and 320px container widths and in fullscreen: package header, playback bar,
tooltips, seek previews, the horizontal volume slider and notices must stay
outside the iframe rectangle and inside the stage, the iframe stays at least
200 by 200 pixels and receives hit-testing and keyboard focus, and the iframe's
edge pixels must not change while package popovers are open (shadow bleed).
A modal page checks that the outside layout fits 1280x800 and 390x844 viewports.
The live provider behavior is covered by `test/youtube-live`.

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

## Host acceptance

The separate `playwright.host.config.ts` lane uses the built package and
synthetic portrait, landscape and 60-second fMP4 HLS ladders generated from
FFmpeg test signals (no external or private media). The media is git-ignored;
generate it once per checkout with FFmpeg/libx264 installed. The lane checks
lazy loading with three mounted players, 236-pixel chat frames and
portrait/landscape modals at 400/1280-pixel viewports, end/replay, expiring
tokens, failed renewal/retry, keyboard scope, reduced motion and touch controls.

```bash
bun run test:browser:host:media
bun run build
bunx playwright install chromium firefox webkit
bun run test:browser:check
bun run test:browser:host
```

The isolated Vite/token server owns loopback ports 5221/5222 and has a 15-minute
deadline. Playwright closes both at the end. A numeric capability in each media
URL expires in real time and returns HTTP 403; the 60-second stream is paced so
the short inline buffer crosses the expiry boundary. The HLS decoder and HTTP
transport are not mocked. Successful cases save poster, playing, ended, renewed,
error and input screenshots under `build/host-browser-results/`. The separate
output directory preserves this evidence when the legacy browser lane clears its
own results. Firefox touch emulation is explicitly skipped because Playwright
does not provide it; its other cases run against the installed Firefox engine. A
fixture declaration supplies the missing upstream `hls.js/light` type entry.

Three additional WebKit cases use the public HLS runtime injection to select
the real native HLS backend. They leave the native decoder, media events and
HTTP transport intact, and require a manifest `currentSrc` rather than a managed
blob URL. They cover explicit lazy loading, expiry with position restoration,
and an expired manifest followed by Retry. This also exercises native failures
that hide HTTP status behind `MediaError` code 4. Engine diagnostics and actual
server request logs are saved as JSON beside the recovery screenshots.
