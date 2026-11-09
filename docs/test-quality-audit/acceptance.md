# Browser and provider test-quality audit

All 16 original acceptance files and their fixtures/helpers were inspected.
These lanes execute built package exports. Local media is committed synthetic
MP4/HLS/VTT.
The separate native accessibility harness uses isolated Xvfb/D-Bus/Orca rather
than the user's active desktop. No browser test was deleted or weakened.

## Original file decisions

Paths are relative to `test/`.

| File                                     | Decision | Contract and distinct protection                                                                                                                                                         |
| ---------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `browser/accessibility.browser.ts`       | KEEP     | Actual Chromium AX semantics, background inertness, polite caption errors, successful keyboard retry and accessible fullscreen exit.                                                     |
| `browser/controls.browser.ts`            | KEEP     | Managed HLS quality action preserves real playback; responsive control geometry, hit testing and fullscreen containment.                                                                 |
| `browser/credentials.browser.ts`         | KEEP     | Real cross-origin HLS manifests and segments require the isolated context cookie; request readback proves delivery.                                                                      |
| `browser/modal.browser.ts`               | KEEP     | Native focus containment/restoration, media disposal/reopen and ordered Escape handling for nested popovers.                                                                             |
| `browser/playback.browser.ts`            | KEEP     | Actual decoding/progress, host rerender stability, provider replacement, caption independence and headless consumers.                                                                    |
| `browser/presentation.browser.ts`        | KEEP     | Keyboard fullscreen and external browser exits update controls; real PiP APIs where available.                                                                                           |
| `browser/preview.browser.ts`             | KEEP     | Real preview responds to changing motion policy, host pause ownership and unmount.                                                                                                       |
| `browser/seek-thumbnails.browser.ts`     | REWRITE  | Preserve real sprite crop/geometry, pointer/keyboard seeking and failed-image fallback; isolate screenshots by test/project instead of overwriting Chromium evidence with WebKit output. |
| `browser/selection.browser.ts`           | KEEP     | Actual browser text selection and editing remain available for meaningful content while seek chrome resists drag selection.                                                              |
| `browser/webkit-native.browser.ts`       | KEEP     | Real native HLS backend, absence of managed quality UI, keyboard containment and media disposal.                                                                                         |
| `browser/webkit-presentation.browser.ts` | KEEP     | Real available platform APIs and explicit absent-control assertions for unsupported APIs.                                                                                                |

## Added browser regression

`test/browser/tooltip.browser.ts` checks an actual caption control placed near
the player edge through consumer CSS. It uses real browser bounding rectangles,
not mocked geometry. After initial correction, repeated resize/scroll events
must leave the tooltip within the same player boundary.

The first draft used the ordinary speed-control layout; it passed on the old
code and did not reach a collision, so its input was corrected before retention.
The final case failed against an isolated build of original HEAD: after the
notification, the tooltip's right edge reached 558.75 px when the maximum was
509.65625 px. The unit regression independently owns the correction calculation;
this browser case owns actual CSS geometry. It is complementary protection.
The isolated baseline and its server were removed before final integration gates.

## Verification ownership

Final execution results, available environments, remaining platform limitations,
and cleanup are recorded in [the audit summary](../test-quality-audit.md).
Happy-dom or local iframe evidence does not replace live-provider, native
presentation, physical keyboard, or human screen-reader acceptance.
