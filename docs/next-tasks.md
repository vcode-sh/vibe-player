# Next Development Tasks

Release target: **0.2.0, unreleased**. Reviewed implementation: `ca6882f`.
These are proposed tasks, not completed changes or a release commitment.

The previous implementation passed 325 tests and the full package CI. That
verification remains useful; the findings below identify contracts outside its
current protection. No broad gates were repeated solely for this research.

## Research scope and evidence

The review covered core state/events/commands, persistence and analytics,
file/HLS/YouTube bridges, React bindings, ready-made and headless UI, captions,
ambient previews, styles, public types, consumer examples, packaging and CI.
- **Source-confirmed:** traced through the implementation and immediate consumer.
- **Controlled probe:** exercised real owners with replaceable browser, storage
  or SDK boundaries. These probes do not prove live-provider playback.
- **Browser-reproduced:** observed the running packaged demo in Chrome.
- **Unverified support boundary:** a published contract without a maintained
  acceptance lane; this does not establish an incompatibility.

Disposable probes were removed. Research did not change production behavior.
Live YouTube playback remains unconfirmed; the prior iframe session timed out,
with browser-tool document interception also observed. Its cause is not proven.

## Recommended order

1. Start T15's minimal browser harness alongside T01, T02, T04 and T05: correct
   lifecycle side effects, seek outcomes, private HLS requests and fatal errors.
2. Use it to deliver T06-T10: modal/mobile/fullscreen behavior and YouTube
   mounting/retry. Resolve T03's provider-event contract before its regression.
3. Complete T11-T14 and T16-T17 as bounded protocol, reliability and DX work.

P1 tasks affect an existing integration, advertised capability or cleanup
contract. P2 tasks improve narrower behavior or make support repeatable. Each
implementation should retain existing incident regressions and add a focused,
independently derived challenge case under the testing-patterns skill.

## Correctness and integration

### T01 — Isolate persistence and telemetry failures (P1)

- **Evidence, controlled probes:** a throwing storage write escapes a timeupdate
  callback, produces no `onError`, and prevents progress analytics. A throwing
  `onAnalyticsEvent` for `closed` rejects `closeSource` before adapter disposal;
  the old source remains active. See `src/core/vibe-player-controller-events.ts:66`,
  `vibe-player-controller-load.ts:38`, `vibe-player-analytics.ts:30`, and
  `vibe-player-resume-store.ts:54` in the same core directory.
- **Owner:** core integration boundaries and the supplied resume-store helpers.
- **Acceptance:** quota/unavailable-storage and telemetry failures cannot prevent
  media disposal, source replacement, other state notifications or playback.
  Define a small failure-reporting policy without recursive analytics/error
  loops. Exercise storage set/clear and analytics failures with a valid control.

### T02 — Persist and report the actual seek result (P1)

- **Evidence, real file adapter probe:** seeking to 250 in a 100-second video
  sets media time to 100, but the controller then stores 250 and emits seek
  analytics with 250. Native event translation first writes the correct value,
  which the command completion overwrites. See
  `src/core/vibe-player-controller-commands.ts:104` and
  `src/adapters/native/native-video-playback.ts:84`.
- **Owner:** controller command outcome normalization.
- **Acceptance:** clamped/invalid positions and non-seekable sources cannot write
  or report an imaginary successful seek. For the 100/250 fixture, observable
  media, resume and analytics agree on 100. Preserve source ownership when an
  asynchronous seek finishes after replacement.

### T03 — Define provider-initiated playback after a pause (P2)

- **Evidence, controlled probe:** after controller pause, a provider play event
  and advancing timeupdate still yield `paused: true` and `readyState: ready`.
  The broad guard in `src/core/vibe-player-controller-events.ts:141` suppresses
  active events until a controller play command; the existing paused-event
  regression intentionally characterizes that protection.
- **Owner:** core intent/event reconciliation with provider adapters.
- **Acceptance:** explicitly distinguish an obsolete response to a command from
  a later user action in native/provider controls. Keep late-event protection,
  while allowing genuine provider playback to update controls and analytics.
  Validate the chosen acknowledgment contract at the real adapter boundary.

### T04 — Propagate HLS credentials to SDK requests (P1)

- **Evidence, source and installed SDK:** `crossOrigin: use-credentials` reaches
  the video element, while `src/adapters/hls/hls-managed-runtime.ts:11` constructs
  Hls without loader credential settings. The installed SDK's XHR path has no
  configured withCredentials, and its Fetch loader defaults to same-origin.
  Cross-origin authenticated manifests/segments therefore lack the requested
  credential policy; same-origin delivery may still work.
- **Owner:** managed HLS runtime boundary.
- **Acceptance:** explicit credentialed sources configure manifest, segment and
  key requests; default/anonymous sources retain their policy. Test SDK options
  and a disposable two-origin browser fixture with matching credentialed CORS.
  Browser cookie restrictions remain an external constraint.

### T05 — Normalize terminal media errors and preserve native details (P1)

- **Evidence, real adapter/controller probes:** fatal HLS network failure leaves
  snapshot state playing while error details say `fatal: true`. Stage status
  only renders unavailable for snapshot error. Native MediaError code 4 and
  message "Unsupported codec" become generic "Playback failed." without details.
  See `src/adapters/hls/hls-adapter-load.ts:54`,
  `src/adapters/native/native-video-dom.ts:69`, and
  `src/ui/vibe-player-stage-status.tsx:68`.
- **Owner:** provider error-to-snapshot translation and normalized diagnostics.
- **Acceptance:** terminal failure reaches error state and unavailable UI;
  recoverable HLS faults preserve viable playback. Native code/message reach
  the host. Keep classification distinct from any retry policy.

## Player surfaces

### T06 — Complete modal accessibility and cleanup ownership (P1)

- **Evidence, controlled component probe:** children-only Modal leaves focus on
  its outside trigger; Escape never calls onClose. The component supplies ARIA,
  presence and outside-pointer dismissal, without focus containment/restoration
  or background interaction management. See `src/ui/vibe-player-modal.tsx:19`
  and source-only autofocus in `src/ui/vibe-player-stage.tsx:70`.
- **Owner:** modal assembly and its lifecycle binding.
- **Acceptance:** focus enters and remains within the open modal; Escape closes
  the appropriate surface; close restores the opener; background interaction
  and scrolling are constrained. Cover both source and children composition,
  nested popovers, immediate media disposal and the existing exit transition.
  Verify keyboard/focus in an actual browser against the WAI dialog pattern.

### T07 — Fit complete controls into narrow player containers (P1)

- **Evidence, browser-reproduced:** at a 390px viewport, HLS Stage width was
  325px and timeline width was 0px. Stage ended at x350; fullscreen extended
  x349-373 and PiP x379-403. The fixed flex row clips capabilities. See
  `src/styles/vibe-player-controls.css:25`, its mobile rules at line157,
  `vibe-player-quality-control.css:9`, and `src/ui/vibe-player-bottom-controls.tsx:58`.
- **Owner:** control assembly and responsive styles.
- **Acceptance:** at 320/390/768px and narrow embedded-container widths, the
  timeline is usable and every supported capability remains reachable through
  layout or an accessible secondary menu. Confirm geometry and keyboard access
  in a browser; do not remove functionality just to fit the row.

### T08 — Make fullscreen/PiP presentation state truthful (P1)

- **Evidence, source-confirmed:** toggle actions only enter; there is no matching
  presentation state for native Escape or exit labels. Native fullscreen
  targets the video, while package controls/captions are siblings. See
  `src/ui/use-vibe-player-stage-actions.ts:62`,
  `src/adapters/native/native-video-playback.ts:137`, and runtime snapshot types.
- **Owner:** normalized presentation events/state and the stage media boundary.
- **Acceptance:** fullscreen contains the intended chrome and captions; a second
  button/F action exits; native Escape updates state; PiP exit is reflected.
  Verify actual browser APIs and honest unsupported-platform behavior. Decide
  container ownership explicitly before adding state fields.

### T09 — Preserve the live YouTube iframe on repeated mount (P1)

- **Evidence, faithful SDK-boundary probe:** the SDK replaces its supplied div
  with an iframe. Repeating mount(target) clears that iframe and appends the
  replaced div: connected iframe count changes from one to zero while snapshot
  remains ready. See `src/adapters/youtube/create-youtube-adapter.ts:123`.
- **Owner:** YouTube adapter mount ownership.
- **Acceptance:** same-target remount is idempotent; another target receives the
  existing live iframe without playback reset; final unmount destroys it.
  Preserve the existing pending-creation and stale-ready protections.

### T10 — Retry a failed YouTube API initialization (P1)

- **Evidence, controlled script-boundary probe:** after script error, initialization
  returns the same cached rejected promise and retains the failed script. See
  `src/adapters/youtube/youtube-iframe-runtime.ts:24`.
- **Owner:** shared YouTube API-script loader.
- **Acceptance:** failure followed by successful initialization works on the
  same page. Concurrent attempts share one active loader; only package-owned
  failed scripts are replaced; host scripts/callbacks survive. Provide explicit
  retry semantics without an unlimited automatic retry loop.

### T11 — Distinguish autoplay blocking from slow YouTube startup (P2)

- **Evidence, source and official protocol:** runtime types omit the SDK's
  onAutoplayBlocked event. The watchdog labels no advancement after 2.5 seconds
  as blocked, including an ordinarily buffering player. See
  `src/adapters/youtube/youtube-iframe-types.ts:61` and
  `youtube-playback-watchdog.ts:58` in that directory.
- **Owner:** YouTube protocol translation and blocked-play notice.
- **Acceptance:** confirmed SDK blocking drives the policy notice; slow buffering
  alone does not claim permission failure. Keep timeouts distinct from policy
  rejection and preserve cancellation, pause and stale-callback protections.

### T12 — Cycle only playback rates supported by the provider (P2)

- **Evidence, source and official protocol:** the common cycle requests 1.25
  after 1; YouTube may expose only [1, 1.5, 2] and rounds unsupported requests
  toward 1. The package then cannot reach 1.5 through that control. See
  `src/core/vibe-player-playback-rate.ts:1`, YouTube capabilities at
  `src/adapters/youtube/youtube-adapter-state.ts:28`, and its handle contract.
- **Owner:** normalized rate choices and provider capability translation.
- **Acceptance:** [1] exposes no misleading rate choice; [1, 1.5, 2] cycles through
  those options; native playback retains appropriate package defaults. Derive
  options from the provider rather than branching on provider names in UI.

### T13 — Dispose ambient-preview work and observe motion preference (P2)

- **Evidence, controlled observer probe:** invoking a captured observer after
  unmount calls old video.play again. Cleanup disconnects without an active
  guard. Reduced motion is sampled without listening for preference changes.
  See `src/preview/vibe-player-background-layer.tsx:53`, line63 and line125.
- **Owner:** decorative preview lifecycle.
- **Acceptance:** late callbacks cannot restart disposed/paused media; the active
  observer still resumes visible media. A motion-preference change follows an
  explicit pause/resume policy. Preserve the poster and layer transitions.

### T14 — Expose caption failure without failing video playback (P2)

- **Evidence, source-confirmed:** the caption hook returns loading/error, but
  Stage consumes activeLines only. A failed VTT can leave enabled CC with no
  text and no host diagnostic. See `src/react/use-vibe-player-captions.ts:24`
  and `src/ui/vibe-player-stage.tsx:52`.
- **Owner:** caption status integration shared by ready-made and custom UI.
- **Acceptance:** failure is observable and meaningful without marking playable
  video unavailable. A successful retry/source change clears the failure;
  stale/cancelled responses remain suppressed. Choose one coherent status seam.

## Repeatable verification and delivery

### T15 — Commit a deterministic real-browser acceptance lane (P1)

- **Evidence:** Vitest runs happy-dom/Node; demo verification only typechecks and
  builds. Browser proof exists as manual sessions and disposable probes, not a
  maintained command. See `vitest.config.ts:9`, `package.json:76`, and CI workflow.
- **Owner:** browser fixtures, packaged-demo acceptance and CI.
- **Acceptance:** a documented Chromium lane uses local MP4/HLS/VTT fixtures and
  fails on duplicate media, host-rerender resets, delayed close cleanup, broken
  keyboard/focus or clipped controls. Cover headless playback, captions and
  quality. Keep live YouTube smoke separate from deterministic CI; introduce
  WebKit/native-HLS acceptance once that platform contract is established.

### T16 — Maintain packed-consumer, recipe and minimum-version checks (P2)

- **Evidence:** packaged demo removes source aliases but still self-references
  repository dist; tarball guard checks file inventory rather than installation.
  Manual consumer probes passed, but no maintained consumer fixture exists.
  CI uses Node24 and development React19.3.1, while the manifest allows Node22
  and React19.2.7. See `demo/vite/vite.config.ts:12`,
  `scripts/assert-package-tarball.mjs:17`, and `.github/workflows/ci.yml:22`.
- **Owner:** package consumer fixture and compatibility policy.
- **Acceptance:** install the real archive outside the repository, typecheck
  ready-made/headless/runtime recipes, render SSR without DOM globals, resolve
  CSS, invoke the installed CLI and build a consumer. Check minimum and normal
  supported versions without repeating all tests in every matrix cell. Wrong
  public argument/prop types must fail even when export names are unchanged.
  Treat the current minimum-version gap as unverified support, not proven breakage.

### T17 — Bound media-audit network time and cancellation (P2)

- **Evidence, source-confirmed:** fetch and streamed reads have byte limits but
  no request/total deadline. See `scripts/media-delivery-audit-fetch.mjs:15` and
  line67; CLI arguments expose no timeout contract.
- **Owner:** audit fetch/stream boundary and runner.
- **Acceptance:** disposable loopback fixtures independently stall headers and
  body; both terminate, cancel resources, stop subsequent probes and return a
  precise failure/nonzero CLI result. A valid response within budget succeeds.
  Preserve existing sampling limits and origin/credential behavior.

## Defer until a concrete consumer need

- Multi-track caption selection is a genuine capability extension: today only
  the default/first declared track is selectable. Prioritize failure visibility
  before adding selection and optional persistence.
- Live DVR, new providers, DRM/DASH, a provider registry, monorepo/subpath split,
  runtime skin engines and broad animation changes have no demonstrated need in
  this review. Current HLS live deliberately disables seek/duration controls.
- Do not upgrade the toolchain merely for novelty or publish/bump 0.2.0 as part
  of these tasks. Preserve opt-in storage/telemetry and provider-neutral UI.
- Keep `docs/testing-audit.md` as historical evidence: its old "current tree"
  counts and pre-move paths need an explicit historical checkpoint, not silent
  replacement with newly passing totals. Fold that documentation cleanup into
  the maintained verification work.

## Authoritative references

- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/):
  focus placement/containment/restoration, Escape and inert background behavior.
- [MDN Storage.setItem](https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem):
  writes can throw QuotaExceededError.
- [MDN XMLHttpRequest.withCredentials](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials):
  cross-origin credential semantics; SDK loader defaults were checked locally.
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference):
  replacement of the supplied element, readiness, onAutoplayBlocked and supported
  playback-rate semantics. See its named event/function sections.
