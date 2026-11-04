# File, HLS, native, and shared adapter audit

All 14 original test files were read with their implementations, fixtures, and
immediate consumers. Decisions below concern protection, not test-count targets.
No original file or case warranted deletion. Existing provider doubles remain
because the tests execute the real adapter or runtime translation owner.

## Contracts and implementation findings

- Native playback must honor the latest command on the active video. A controlled
  `play → pause → play` sequence exposed an older play completion pausing the
  newer playback in both file and HLS adapters. The shared playback guard now
  checks the latest play generation for that video; pause, replacement, unmount,
  and disconnected-video guards remain in place.
- HLS quality selection must select an advertised option. `level:1junk`,
  `level:1.5`, and `level:9` previously reached the runtime with only levels 0 and
  1 available. The quality state now requires an exact current option ID before
  forwarding a request. Invalid requests preserve the selection and emit no
  quality-change event; valid manual and automatic selections still work.
- Mounted fixtures previously often survived until their happy-dom environment
  ended, retaining document fullscreen listeners. A small shared test scope now
  unmounts tracked adapters/presentation owners in `afterEach`, including failed
  tests. Native error tests tear down controllers in `finally`. Presentation
  fixtures restore the original document property descriptors, rather than
  replacing them with guessed defaults.

The production changes are limited to `native-video-playback.ts` and
`hls-adapter-quality-state.ts`. Reviewed immediate consumers include both adapter
classes, the core controller command bridge and runtime/source contracts, and
the quality control's use of advertised IDs. No public types, requests,
credentials, source loading, or rendering contracts were changed.

## Original-file decisions

Paths below are relative to `src/adapters/`. **KEEP** entries retain their
behavior assertions; their fixture cleanup was improved where necessary.

| Original test file                             | Decision | Contract and distinct failure detected                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file/create-file-adapter.test.ts`             | KEEP     | Real file adapter maps single/multiple sources, captions, poster and CORS policy; translates media events, suppresses paused buffering, clamps commands, and stops late playback after pause/unmount. Mounted fixture ownership is now explicit before loading.                                                                   |
| `hls/create-hls-adapter.test.ts`               | KEEP     | Managed/native selection, manifest and video handoff, live seek denial with a valid VOD control, error payloads, runtime disposal, paused-play cancellation, unavailable runtime rejection, and the default factory's HLS selection. The factory case is a bounded composition contract, not decoding proof.                      |
| `hls/create-hls-adapter-load-session.test.ts`  | KEEP     | Late success is destroyed, old callbacks are ignored after disposal, an obsolete controller cannot replace the newer controller, and stale failure cannot overwrite the current source through native fallback. These races use controlled completion rather than sleeps.                                                         |
| `hls/create-hls-adapter-quality.test.ts`       | REWRITE  | Retains literal rendition labels and manual/auto expectations, managed preference, post-play callback validity, and native fallback. Adds malformed/out-of-range IDs and unchanged selection/event assertions. Removes its duplicate SDK fixture in favor of the existing HLS test helper.                                        |
| `hls/hls-adapter-errors.test.ts`               | KEEP     | Recoverable errors preserve playback; terminal errors persist across ready/time events and reset only on another load or unmount. This protects adapter failure state separately from callback translation.                                                                                                                       |
| `hls/hls-managed-credentials.test.ts`          | KEEP     | Real default runtime receives source policy and creates Fetch/XHR settings for manifest, fragment and key requests. Checks anonymous/default versus credentialed requests, URL and header preservation. The boundary is request configuration, not authenticated CDN delivery.                                                    |
| `hls/hls-managed-runtime.test.ts`              | REWRITE  | Retains manual/auto `nextLevel` setter protection against the immediate `currentLevel` path. Adds actual registered SDK callback execution for manifest readiness, rendition metadata, live/VOD metadata, and recoverable error fields. SDK controllers now always dispose; test wording describes the exercised setter boundary. |
| `native/native-video-lifecycle.test.ts`        | REWRITE  | Retains old-video event isolation through both adapters, including a current-video positive control. Adds the independently specified latest-play regression for both providers; deferred playback settles and adapters unmount in `finally`.                                                                                     |
| `native/native-media-errors.test.ts`           | KEEP     | Real controller plus each adapter preserve native codec error details, source/provider attribution and terminal snapshot state. This is complementary to the lower-level HLS error test. Controller disposal now survives assertion failure.                                                                                      |
| `native/native-picture-in-picture.test.ts`     | KEEP     | Standard capability detection, document/video denial without request side effects, active-video exit, and file/HLS command delegation. Positive controls prevent an always-deny implementation from passing.                                                                                                                      |
| `native/native-presentation.test.ts`           | KEEP     | Fullscreen uses the presentation container including chrome, follows browser exit, preserves media/time when the target changes, and stops events on unmount.                                                                                                                                                                     |
| `native/native-presentation-picture.test.ts`   | KEEP     | Standard PiP state follows native events and ignores disposed videos; the WebKit presentation bridge enters and exits through its distinct API.                                                                                                                                                                                   |
| `native/native-presentation-lifecycle.test.ts` | KEEP     | Late PiP entry is released after disposal, a newer video is preserved, and an element reclaimed by a different owner is not exited by stale work.                                                                                                                                                                                 |
| `shared/adapter-fullscreen-lifecycle.test.ts`  | KEEP     | Target replacement, late fullscreen completion after disposal, a different active target, and a reused container with a new owner exercise separate ownership partitions.                                                                                                                                                         |

## Verification evidence

Focused RED before either production edit:

```sh
bun run test --project dom src/adapters/native/native-video-lifecycle.test.ts src/adapters/hls/create-hls-adapter-quality.test.ts
```

Result: 3 behavioral failures / 5 passes. Both latest-play cases expected
`paused: false` but received `true`; invalid quality selection expected runtime
level `-1` but received `9`. These were assertion failures in executed behavior,
not setup or import failures.

Focused GREEN after the two production edits, including existing cancellation
controls:

```sh
bun run test --project dom src/adapters/native/native-video-lifecycle.test.ts src/adapters/hls/create-hls-adapter-quality.test.ts src/adapters/file/create-file-adapter.test.ts src/adapters/hls/create-hls-adapter.test.ts
```

Result: 4 files / 25 tests passed. After cleanup changes, the full owned scope
passed 14 files / 52 tests; the later SDK callback case and controller cleanup
passed their focused 2 files / 4 tests.

Final stable-source checks:

```sh
bun run test --project dom src/adapters/file src/adapters/hls src/adapters/native src/adapters/shared
bunx biome check src/adapters/file src/adapters/hls src/adapters/native src/adapters/shared docs/test-quality-audit/media-adapters.md
bunx biome lint src/adapters/file src/adapters/hls src/adapters/native src/adapters/shared
git diff --check -- src/adapters/file src/adapters/hls src/adapters/native src/adapters/shared docs/test-quality-audit/media-adapters.md
```

Result: **14 files / 53 tests passed**; Biome check (42 files), lint (41 files),
and scoped diff whitespace validation passed. The final report-only evidence
update was checked separately. The lead agent owns repository typechecking and
broad/browser acceptance.

## Limits and cleanup

These tests establish adapter decisions, state, callback translation, command
effects, and lifecycle ownership using happy-dom and controlled browser/SDK
doubles. They do not establish actual decoding, seamless quality switches,
autoplay policy, physical Safari/iOS behavior, native fullscreen/PiP, or real
credentialed delivery. Installed `hls.js` setter documentation confirms that
`nextLevel` avoids the immediate switch setter but may flush buffer outside the
playing fragment; the test does not claim a performance measurement.

No live network, browser process, GPU workload, temporary probe checkout,
credentials, or production state was used. No commit, push, or deployment was
performed. Existing browser acceptance remains with the lead agent; no test was
deleted or weakened to replace it.
