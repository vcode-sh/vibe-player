# Development Status and Next Tasks

Current release: **0.2.0**, released 2026-10-22. The original T01–T17 backlog and the N01–N04 implementation and available
acceptance lanes are complete. Physical-platform limits remain explicit below. This checkpoint extends the modular-provider work in `ca6882f`;
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

## Current verification checkpoint

- **446 Vitest tests / 102 files** pass using the testing-patterns skill.
- **26 deterministic browser cases pass with zero skips:** 22 Chromium and four
  WebKit. The Linux WebKit PiP case verifies capability absence; it does not
  claim successful PiP on that platform.
- Full `bun run ci` passes: types, formatting, coding/layer/dependency rules,
  release state, tests, build, CSS, size, public surface, tarball, publint, ATTW,
  both demo builds, installed consumer and browser lanes. `bun run lint` passes.
- Installed consumers pass on **Node 22.0.0 / React 19.2.7**, **Node 24.22.1 /
  React 19.3.1**, and local **Node 26.5.0 / React 19.3.1**. Fourteen shipped
  TypeScript recipes compile. The minimum Node lane intentionally skips Vite's
  newer build toolchain; package runtime, SSR, types, CSS and CLI are checked.
- Live YouTube: **two cases pass in both headless and windowed Google Chrome**.
  The isolated native AT-SPI/Orca/OS-key probe also passes on the final build.
- Runtime ESM: **162,683 bytes raw / 35,567 bytes gzip**, within unchanged budgets.

Install both engines before `bun run ci`:
`bunx playwright install --with-deps chromium webkit`. The live provider and
native assistive-tool lanes remain separate from deterministic CI.

## N01–N04 follow-up results

### N01 — Tail-range evidence: implemented and verified

Tail diagnostics now require HTTP 206, the exact requested start/end, the same
known total size and a complete bounded response body. Invalid evidence yields
`mp4.tailMoovOffset: null`, without changing initial faststart/readiness or
adding a new failure code. Thirteen focused RED/GREEN cases cover valid data,
HTTP 200, wrong offsets/end/total, missing headers and truncated bodies. The
media-audit lane passes 87 tests across 17 files; independent delta review found
no regression.

This remains an informational ASCII-marker scan, not a full MP4 or ETag
consistency validator. See [media-delivery.md](./media-delivery.md#tail-diagnostics).

### N02 — Native WebKit acceptance: implemented and verified on Linux

The default deterministic browser command now runs Chromium and a dedicated
WebKit project. Four WebKit cases verify real local native-HLS decoding,
captions/pause, modal keyboard containment/restoration and container fullscreen.
The fixture uses public adapter runtime injection to select native fallback;
media APIs and network responses remain real.

Linux WebKit 27.2 requires `WEBKIT_GST_ENABLE_HLS_SUPPORT=1` to enable its actual
GStreamer HLS backend; only the WebKit test project sets it. PiP is absent on
this platform, and its case verifies absent controls with an unsupported-API
annotation. Actual Chromium PiP remains independently tested. CI/release install
both engines. This does not establish physical Safari/iOS behavior.

### N03 — Live YouTube acceptance: implemented and verified

`bun run test:youtube` uses the built package, default SDK and official public
sample in ordinary installed Google Chrome. Two cases passed both headless and
windowed under Xvfb on Chrome 156.0.8078.47, origin `http://127.0.0.1:5203`.
Readiness, advancing playback, actual provider pause, offered rate application,
same-iframe/player-frame preservation and disposal were observed. Real SDK,
embed and media requests succeeded; no provider restriction occurred.

The explicit audible-autoplay policy test observes the actual SDK blocked event
with no user activation at dispatch. Read-only state uses raw CDP without a user
gesture; tracing is disabled for this case because its snapshots granted
activation in the observed toolchain. Playback navigation assertions track only
the player frame, excluding unrelated measurement/ad descendants.

This network lane stays opt-in; CI typechecks it without contacting YouTube.
See [the live harness](../test/youtube-live/README.md) for exact commands,
diagnostics and the recorded offered rates. Earlier interception/timeouts are
historical observations; their cause remains unproven and was not assumed to be
a package bug.

### N04 — Native accessibility: implemented and verified within available tools

Three Chromium accessibility-tree cases verify native modality/background
exclusion, quality/volume semantics, polite atomic caption failure with reachable
retry, and fullscreen action names. An additional isolated native probe uses
actual AT-SPI, Orca generated speech and OS-synthetic XTest keys in a private
DBus/Xvfb session. It verifies generated speech for caption failure/retry, control roles,
reserved browser fullscreen Escape, nested popover dismissal and opener restore.
It does not change the user's desktop accessibility settings.

The native check exposed a real focus bug: successful caption retry removed its
focused button and left focus outside the modal. A focused DOM/browser RED
preceded the fix; Stage now focuses its existing root before retry removes the
button. This is the only player-runtime correction in this follow-up.

The native launcher is `bun run test:accessibility:native`; it deliberately
requires the local fixture server and installed OS dependencies. Its dummy
speech backend records generated utterances without speaker audio. It fails
instead of replacing an existing Orca process. The exact setup, evidence,
cleanup contract and physical-device protocol are in
[accessibility-acceptance.md](./accessibility-acceptance.md).

## Remaining physical-platform acceptance

No physical Safari/iOS device, VoiceOver or NVDA session was available on this
Linux host. OS-synthetic keys exercise the real browser path but are not a
physical hardware keyboard test. Orca generated-speech verification is not a
human listening or usability session. These limits are not implementation
failures and have no synthetic PASS; the manual protocol records each actual
platform outcome separately.

The deterministic lanes remain independent from the live provider and native
OS/assistive-tool prerequisites:

```bash
bun run ci
bun run test:youtube
# With the documented local fixture server and native OS tools running:
bun run test:accessibility:native
```

## Continue to defer

Multi-track caption selection, new providers, DRM/DASH, live DVR, a provider
registry, monorepo/subpath split and a runtime skin engine still lack a concrete
consumer requirement. Preserve opt-in persistence/telemetry, provider-neutral
UI and explicit root/CSS exports. Do not upgrade the toolchain merely for novelty
or bump/publish a release as part of this work.

[testing-audit.md](./testing-audit.md) remains a historical cleanup record, with
its checkpoint and old counts explicitly labeled. Current behavior and commands
are documented in [usage.md](./usage.md), [integration.md](./integration.md),
[media-delivery.md](./media-delivery.md) and the maintained acceptance fixtures.
