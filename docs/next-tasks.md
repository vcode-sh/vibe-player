# Development Status and Next Tasks

Release target: **0.2.0, unreleased**. The original T01–T17 backlog is
implemented. This checkpoint extends the modular-provider work in `ca6882f`;
it does not prepare a release or change package ownership.

## Implemented backlog

| Task | Result                                                                                                                        | Verification boundary                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| T01  | Persistence, analytics and subscribers cannot interrupt playback/cleanup; synchronous and asynchronous failures are isolated. | Real controller with throwing/rejecting host integrations and valid controls.                                      |
| T02  | Seek dispatch, resume and analytics use the duration-normalized accepted target; obsolete/reentrant work stops.               | Controller regression with clamped positions, non-seekable sources and source replacement.                         |
| T03  | Pending pause protects stale events until acknowledgment; later provider play updates state.                                  | Controller/provider-event contract.                                                                                |
| T04  | Explicit HLS credentials configure XHR and Fetch playlist, segment and key requests.                                          | SDK boundary plus protected two-origin Chromium playback for playlists/segments.                                   |
| T05  | Fatal HLS errors remain terminal; recoverable faults preserve playback; native errors retain code/message.                    | Real adapters with controlled media/SDK events.                                                                    |
| T06  | Native dialog, initial/restored focus, explicit Tab wrapping, scroll lock, nested Escape and immediate media disposal.        | DOM interactions and actual Chromium focus/lifecycle.                                                              |
| T07  | All supported controls fit narrow containers without removing capabilities.                                                   | Chromium geometry and hit targets at 240/280px embedded widths and 320/390/768px viewports.                        |
| T08  | Presentation belongs to the stage/custom container, exposes browser state and supports exit/cleanup.                          | Real Chromium fullscreen/PiP, F toggles and external browser API exit; controlled async disposal races.            |
| T09  | Repeated YouTube mounting preserves the live SDK node.                                                                        | SDK replacement/pending-creation boundary; browsing-context preservation on relocation needs `Element.moveBefore`. |
| T10  | Failed YouTube SDK initialization permits a later retry while preserving host ownership.                                      | Script failure/success and concurrent-attempt boundary.                                                            |
| T11  | SDK-confirmed autoplay blocking drives the notice; elapsed buffering does not.                                                | Official callback translation and stale/pause cancellation cases.                                                  |
| T12  | Controls cycle normalized provider-supported playback rates.                                                                  | Provider capability/choice tests and real controls.                                                                |
| T13  | Preview work cannot restart disposed media; motion-preference changes and host pause are observed.                            | Controlled lifecycle regressions and the local Chromium preview fixture.                                           |
| T14  | Caption status/retry is available to ready-made/headless consumers without failing video.                                     | Real hook/Stage, cancellation, synchronous errors, retry and replacement callbacks.                                |
| T15  | Deterministic browser acceptance uses built package exports and local MP4/HLS/VTT.                                            | Maintained `test:browser` lane; no production media or CDN dependency.                                             |
| T16  | A real archive is installed outside the repo; shipped recipes, strict types, SSR, CSS, CLI and consumer builds are checked.   | Normal and exact-minimum runtime lanes plus disposable invalid-signature/missing-CSS sensitivity probes.           |
| T17  | A total audit deadline bounds all network/body work and honors host cancellation.                                             | Real Fetch/loopback stalls and resource cleanup, including cancellation-ignoring Fetch implementations.            |

Independent delta reviews also exposed and fixed reentrant notifications and
old event side effects, stale presentation/observer completions, nested menu
Escape defects, callback-driven caption reload loops, wrong initial byte-range
offsets, and successful CORS headers hiding failed origin HTTP responses.

Seek acknowledgment means the command was dispatched, not that an asynchronous
provider getter has settled. The accepted target is deliberately separate from
subsequent observed playback time. No heuristic infers settlement from a stale
SDK getter.

## Verification checkpoint

- **432 Vitest tests / 100 files** pass using the testing-patterns skill.
- **19 Chromium cases / zero skips** cover playback, rerenders, source replacement,
  headless lifecycle, captions, quality, authenticated HLS, modal focus/cleanup,
  narrow controls and presentation. Preview coverage includes real motion
  preference changes and host pause.
- TypeScript, Biome, coding/layer/dependency rules, release state, build, CSS,
  size, public surface, tarball, publint, ATTW and both demo builds pass.
- Installed consumers pass on **Node 22.0.0 / React 19.2.7**, **Node 24.22.0 /
  React 19.3.1**, and the local Node 26.5.0 development runtime. Fourteen shipped
  TypeScript recipes compile. Node 22 intentionally skips Vite's newer build
  toolchain; its package runtime, SSR, types, CSS and CLI are checked.
- Runtime ESM remains within its existing budget: **162,571 bytes raw /
  35,544 bytes gzip**. No size budget was raised.

Run the maintained gates via `bun run ci`; install Chromium first as described
in [test/browser/README.md](../test/browser/README.md). Use
`npm exec --yes --package=node@22.0.0 -- node scripts/assert-packed-consumer.mjs --react-version 19.2.7 --skip-build`
for the exact minimum consumer locally. CI also maintains the Node 24 lane.

## Next bounded tasks

### N01 — Validate tail-range evidence in the media audit (P2)

**Confirmed source gap:** the tail probe currently consumes `.bytes` without
checking its HTTP status or returned `Content-Range` start. MP4 diagnostics add
the requested tail offset to a discovered marker. A server that ignores or
changes the requested tail can therefore produce an inaccurate diagnostic
offset. Initial-range validation is fixed; this separate path is not covered.

Start with independently constructed 200, wrong-offset 206, truncated and valid
206 fixtures. Validate the response before interpreting absolute offsets and
keep initial faststart detection independent. Do not widen this into a complete
MP4 validator or claim the current informational offset proves faststart.

### N02 — Establish native WebKit/Safari acceptance (P2)

**Verified coverage gap:** the browser project currently runs Chromium only.
Native HLS fallback and WebKit presentation have controlled contract coverage,
but no maintained real WebKit lane. This is not evidence of incompatibility.

Add local native-HLS playback, fullscreen/PiP capability behavior and modal
keyboard acceptance on supported WebKit targets. Include actual Safari/iOS
where platform UI requires it; do not assume Playwright WebKit proves every
native OS behavior. Keep platform-specific failures distinct from package bugs.

### N03 — Complete live YouTube acceptance (P2)

**Verified coverage gap:** official SDK behavior is tested through controlled
boundaries. Live playback remains unconfirmed; the earlier session timed out
and browser-tool document interception was observed. Its cause is not proven.

Use an official public sample in an ordinary browser and verify readiness,
play/pause, supported rates, blocked-autoplay signaling and repeated mounting.
Keep this network-dependent smoke separate from deterministic CI. Record the
actual origin/browser and any restrictions without guessing their cause.

### N04 — Verify physical keyboard and assistive technology (P2)

**Verified automation limit:** CDP Escape does not exit fullscreen even on a bare
page without package code, in both headless Chromium and headed Chromium under
Xvfb. The maintained test proves F toggling and actual
`document.exitFullscreen()` event/state synchronization. It does not claim a
physical browser Escape test.

Verify physical Escape and screen-reader behavior for native dialog, popovers,
caption status/retry and fullscreen on target browsers. Automated roles, focus
and native presentation assertions remain useful but do not replace that lane.

## Continue to defer

Multi-track caption selection, new providers, DRM/DASH, live DVR, a provider
registry, monorepo/subpath split and a runtime skin engine still lack a concrete
consumer requirement. Preserve opt-in persistence/telemetry, provider-neutral
UI and explicit root/CSS exports. Do not upgrade the toolchain merely for novelty
or bump/publish 0.2.0 as part of this work.

[testing-audit.md](./testing-audit.md) remains a historical cleanup record, with
its checkpoint and old counts explicitly labeled. Current behavior and commands
are documented in [usage.md](./usage.md), [integration.md](./integration.md),
[media-delivery.md](./media-delivery.md) and the maintained acceptance fixtures.
