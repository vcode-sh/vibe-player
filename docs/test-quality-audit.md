# Test-quality audit and implementation repair

Audit date: 2026-11-04. Scope: every repository test file, its behavior owner,
relevant callers and required verification lanes. The current repository-local
`testing-patterns` skill governed the audit. The pre-existing skill changes were
preserved; no commit, push, release or production operation is part of this work.

## Coverage of the audit

The initial tree passed 481 Vitest cases in 111 files, Biome and TypeScript.
Green execution was a baseline, not evidence of sufficient protection. All
127 original files received a semantic decision: 111 unit/DOM/script files and
16 browser/live-provider files. A filename comparison verified no omission.
The decisions were 94 KEEP and 33 REWRITE. No original file was classified
DELETE or UNRESOLVED; removals below apply to redundant individual cases or
assertions within retained files.

| Owner                                | Original files | Evidence and per-file decisions                        |
| ------------------------------------ | -------------: | ------------------------------------------------------ |
| Controller and core                  |             23 | [core](test-quality-audit/core.md)                     |
| Native, file and HLS adapters        |             14 | [media adapters](test-quality-audit/media-adapters.md) |
| React hooks and captions             |             15 | [React/captions](test-quality-audit/react-captions.md) |
| UI and ambient previews              |             24 | [UI/preview](test-quality-audit/ui-preview.md)         |
| Media-audit and package scripts      |             23 | [scripts](test-quality-audit/scripts.md)               |
| Browser and live-provider acceptance |             16 | [acceptance](test-quality-audit/acceptance.md)         |

No entire original test file needed deletion. Redundant individual cases and
assertions were removed where replacement protection was identified, including
one caption rejection case, a duplicate provider-option case and repeated
media-audit finding/action payload checks. A duplicated Inline adapter fixture was
replaced by the existing focused assembly fixture. Structural package checks,
meaningful mock interactions, valid presence assertions and complementary browser
checks were retained. There was no count-reduction or coverage-score target.

## Confirmed behavior repairs

- Source replacement during observer notification now stops old subscription,
  mount, analytics and resume work. Errors from a prior host-callback session
  cannot contaminate a reload using the same source object. Nonfinite stored
  resume positions do not reach the adapter.
- Native file/HLS playback preserves the latest play intent when an earlier
  promise resolves. HLS quality selection accepts only advertised option IDs.
- WebVTT parsing preserves valid prefixed cue IDs and payload whitespace while
  rejecting malformed timestamp components. Intentional comma compatibility was
  retained. A suspected malformed-NOTE issue was not treated as a proven defect.
- Equal reconstructed caption tracks retain one request instead of cancelling
  and starting another; changed URLs still reload. Closed chrome handlers cannot
  recreate hide timers. Equal preview assets no longer restart retirement.
- Seek and volume drags belong to their initiating pointer; disabled seek and
  lost capture terminate dragging. Repeated layout notifications preserve tooltip
  collision correction. Real-browser geometry complements the unit regression.
- The media audit requires a consistent initial range/body, including one-byte
  overflow evidence at the 4 MiB sampling boundary. Ordinary 200 prefix reads
  remain capped; malformed evidence is not reported as direct-file readiness.

Every listed behavior repair had a focused failing assertion before its fix.
Independent integration review found two further cases after the owner audits:
synchronous subscription replacement and overflow hidden by prefix truncation.
The lead reproduced and fixed both with focused RED/GREEN evidence.

## Cost, performance and build output

One equivalent-track rerender previously made two loader calls and now makes
one, while the same-ID changed-URL case still makes a new request. Preview
retirement and cancellation fixes remove unnecessary retained work. These are
bounded behavior/cost observations, not broad throughput or latency benchmarks.

The corrected unminified runtime exceeded the existing gzip budget: 37,452 bytes
against 36,864. The existing tsdown build now enables standard minification,
producing 94,380 raw bytes and 26,672 gzip bytes in the measured build. No budget,
assertion, exclusion or CI gate was weakened. Type declarations stayed at
35,571 bytes. Package exports, installed consumers and browser behavior must
verify the actual minified artifact, not only source-level tests.

## Verification

The final code tree passed `bun run ci` on Node 26.13.0 with Bun 1.4.4.

| Lane                                                                           | Executed result                                                                                                                           |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Biome, coding rules, package boundaries/dependencies/release-state, TypeScript | Passed; 427 checked files, 388 coding-rule files, 227 production-boundary files.                                                          |
| Vitest                                                                         | 114 files, 522 tests passed.                                                                                                              |
| Build, flattened CSS, size, public surface, tarball, publint and ATTW          | Passed for the minified package; reviewed runtime/declaration exports unchanged; archive contains 21 files.                               |
| Source and packaged demo builds                                                | Passed, including demo typecheck.                                                                                                         |
| Installed consumer, Node 26.13.0 / React 19.3.1                                | Isolated archive install, 17 shipped recipes, types, ESM, SSR, CSS, CLI and consumer build passed.                                        |
| Deterministic Playwright                                                       | All 52 Chromium/WebKit tests passed, including the new tooltip regression, real local decoding and credentialed HLS.                      |
| Minimum Node 22.0.0 / React 19.2.7                                             | Installed consumer and all 17 recipes passed with compatible npm 10.9.9; consumer build intentionally skipped as in the release workflow. |
| Native accessibility, `bun run test:accessibility:native`                      | Isolated Xvfb/D-Bus, native XTest input, AT-SPI and Orca generated-speech checks passed in Chrome 157.0.8103.38.                          |

The first minimum-Node attempt picked up incompatible npm 12 and failed during
packing with `ERR_REQUIRE_ESM`. A combined npm-exec attempt selected Node 26,
so that success was not counted as minimum-Node evidence. The final run used the
verified absolute Node 22.0.0 executable and a process-local compatible npm PATH;
the consumer itself reported Node 22.0.0. No global tool configuration changed.

Existing tool warnings about TypeScript's experimental build API, future Vite
config loading, the separate HLS demo chunk, and unavailable FUSE/PipeWire in the
isolated accessibility session did not fail their gates. No warning was hidden
by changing checks or acceptance thresholds.

Owner reports retain focused RED/GREEN evidence and checkpoint counts; the table
above is the integrated final result after review fixes. Documentation-only
updates after this run receive scoped formatting/whitespace/link checks; they do
not invalidate the unchanged runtime/browser evidence.

## Cleanup and remaining limits

All evaluation-owned servers exited; ports 5197, 5198 and 5203 were free on
readback. The isolated baseline copy, consumer temporary directories, private
native environment and its processes were removed. No process retained the
native environment's XDG paths. Shared services and prior skill work were
preserved. Diagnostic artifacts remain under ignored `test-results/`, including
live-provider evidence and selected native accessibility transcripts/trees.

This audit does not prove the absence of all defects or establish general latency
improvements. Physical Safari/iOS, VoiceOver, NVDA, hardware keyboard input and
human listening remain separate acceptance boundaries. Public API shape, provider
separation, dependencies and CI budgets remain intact. Nothing was committed,
pushed, published or deployed.
