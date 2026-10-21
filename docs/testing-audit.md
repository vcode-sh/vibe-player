# Test quality audit

## Outcome

Applied [testing-patterns](../.claude/skills/testing-patterns/SKILL.md), adapted
from the current WUN and Spreadoo skills, to every configured test file.
The canonical skill lives in `.claude/skills/testing-patterns`; the local
`.agents/skills/testing-patterns` symlink makes the same rules discoverable by
Codex. `CLAUDE.md` and the coding standards direct test work to it.
- Original inventory: 57 files, 184 passing cases.
- Reviewed all 57 files: 45 rewritten/extended, 10 retained, 2 deleted.
- Added 4 focused files; final inventory: 59 files, 250 cases.
- Full suite: 249 passed, 1 failed, 0 skipped. The active failure exposes a
  pre-existing WebVTT character-reference decoding defect, detailed below.
- No production behavior changed. Existing source/config work was preserved;
  source-byte hashes match the baseline captured before the audit.
- 19 targeted mutation probes across the six areas rejected the intended
  defects in disposable copies. These are sensitivity samples, not an exhaustive
  mutation score. The overlay and disabled-caption fixtures were strengthened
  after an initial mutation survived.

The two deleted files are the static skin-token mirrors and a YouTube
state-change suite that mocked internal collaborators. Unique YouTube lifecycle
protection moved to a real adapter test. Other shallow or duplicate cases were
removed inside retained files. Case count increased mainly because unrelated
conditions formerly bundled together now have independently discriminating rows.

## Verification scope

The configured Vitest projects cover `src/**/*.test.ts(x)` in happy-dom and
`scripts/**/*.test.mjs` in Node. File discovery, package scripts, CI configuration,
and demo/docs references revealed no separate automated Playwright/spec lane.
Existing package guard scripts are structural/build acceptance, not additional
unit test files; they were not deleted.

Final verification:
- `bun run check`: passed, 252 files.
- `bun run lint`: passed, 252 files.
- `bun run package:rules`: passed, 226 source/config files.
- `bun run check-types`: passed.
- `git diff --check`: passed.
- `bun run test`: 249 passed, 1 failed, 0 skipped across 59 files.
- After correcting a missing required `details` field in the stale HLS error
  fixture, its focused lane passed both cases and TypeScript passed. No other
  runtime test files changed after the full run.
- Skill frontmatter validation and final documentation readback passed.

Browser playback, visual
motion, native fullscreen/PiP, actual provider/CDN responses and publishing were
not exercised. DOM assertions prove state, protocol, and interaction behavior
only. No dependency, runtime configuration, commit, push, or release was added.

## Core and captions test audit

### Scope and result

Inspected all 13 original test files in `src/core` and `src/captions`, their real
owners, controller/adapter fixtures, and relevant package usage/integration
contracts. Ten original files changed, three stayed unchanged, two focused files
were added, and no entire file was deleted. Removed the static idle-snapshot
assertion; real close-source behavior now proves transition to idle instead.
No production source or test helper was changed.

The original scope had 37 expanded tests. The resulting scope has 60: 59 passing
and one active failing regression for a confirmed caption defect. Matrix
expansion accounts for much of the count increase; counts are not acceptance
criteria.

### Original-file inventory

| File                                                    | Decision                   | Protection and defects caught                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/vibe-player-controller.test.ts`               | Strengthen                 | Kept resume restore, command boundary, deferred play intent, unsupported playback, paused snapshot, blocked/recovered playback, load error, source identity during load, stale provider events, and source replacement cases. Added close-source state assertion before reopening: catches stale source/capabilities/time surviving close while mount must persist. Protocol call assertions here verify the public controller-to-adapter contract. |
| `src/core/vibe-player-controller-analytics.test.ts`     | Strengthen                 | Existing repeated milestone/ended events discriminate duplicate analytics. Added literal payload checks to catch wrong source/time/duration despite correct event names; new session case catches milestones never rearming and attributing the new source to the old source.                                                                                                                                                                       |
| `src/core/vibe-player-controller-paused-events.test.ts` | Keep                       | Mixed late buffering/play/time events cannot override explicit pause or persist stale progress; subsequent intentional play must still work. Both stuck-paused and stale-playing defects are distinguished.                                                                                                                                                                                                                                         |
| `src/core/vibe-player-events.test.ts`                   | Rewrite one, keep one      | Exact 25/50/75 inclusive thresholds, just-below values, sent-event suppression and exhausted milestones catch off-by-one and repeat emission. Retained large jump case: earliest missed milestone must not be skipped.                                                                                                                                                                                                                              |
| `src/core/vibe-player-playback-rate.test.ts`            | Keep                       | Literal user-facing integer/fractional labels; cycle includes wrap and unlisted provider rate fallback. Does not derive expected values from the exported rates constant.                                                                                                                                                                                                                                                                           |
| `src/core/vibe-player-quality-options.test.ts`          | Keep                       | Selected option is deliberately not first; empty/no selection fallback and supported-without-options/unsupported-with-options distinguish wrong OR/AND gates. Input object identity is the selection contract, not a production-derived oracle.                                                                                                                                                                                                     |
| `src/core/vibe-player-resume-store.test.ts`             | Strengthen one, keep three | Persistence test now reopens a store over the same backing storage, separates `video/1` from `video%2F1`, and proves deleting one key preserves another source and another prefix. Retained normalization, corrupt-read eviction, invalid-write deletion and unavailable-storage behavior.                                                                                                                                                          |
| `src/core/vibe-player-resume.test.ts`                   | Rewrite                    | Individually revokes current-operation and seekability, rejects absent/nonpositive positions; independent near-end examples 98.999/99/99.001/100 catch inclusive-end bug. Unknown metadata retains a valid positive position.                                                                                                                                                                                                                       |
| `src/core/vibe-player-shortcuts.test.ts`                | Rewrite                    | Tests all documented actions, unknown key, capability-specific refusal with unrelated playback still enabled, uppercase input, interactive HTML targets, editable content and each modifier. Catches wrongly broad capability gates and hijacked native typing/actions.                                                                                                                                                                             |
| `src/core/vibe-player-time.test.ts`                     | Rewrite three, delete one  | Literal formatting edges 59.999/60 and long minutes catch rounding/wrapping; invalid duration fallback versus valid metadata, finite seek bounds and unknown-duration preservation catch default/branch errors. Deleted `createIdleSnapshot().readyState === idle` constant mirror; controller close behavior owns actual idle transition.                                                                                                          |
| `src/core/vibe-player-volume.test.ts`                   | Keep and add               | Retained independent clamp/percent/ARIA results. New 0.0049/0.005 boundary catches a silent icon based only on mute or raw volume rather than rounded effective percent, without falsely setting muted state.                                                                                                                                                                                                                                       |
| `src/core/vibe-player-youtube.test.ts`                  | Rewrite                    | Default iframe must preserve explicit external presentation; positive fractional offset floors, unusable offsets omit `t`. Catches always-iframe and invalid/rounded timestamp URL generation.                                                                                                                                                                                                                                                      |
| `src/captions/parse-webvtt.test.ts`                     | Rewrite                    | Hand-authored hour/fraction/CRLF/settings/multiline fixture catches conversion or lost text; malformed/reversed/empty cues cannot drop later valid cue. Independent selector fixtures check inclusive starts, exclusive ends, overlap order and deduplication without using parser output as the oracle.                                                                                                                                            |

### New files

- `src/core/vibe-player-controller-load-races.test.ts`: controlled obsolete load
  resolves or rejects after a new source is ready. Catches stale source/error
  state overwrites, stale opened/error analytics, and retained old event
  subscription. The rejection remains observable to its original caller. Uses
  real controller and only substitutes the provider boundary.
- `src/captions/parse-webvtt-character-references.test.ts`: valid WebVTT cue text
  `A &amp; B &lt;3 &gt;2` must produce `A & B <3 >2` after markup removal. This is
  actively failing, not skipped or marked expected-failure.

### Confirmed defect and requirement

`parseWebVtt` currently strips tags but leaves character references encoded.
The overlay renders plain React text, so captions visibly contain `&amp;` and
`&lt;` instead of the intended characters. Independent requirement:
[W3C WebVTT §6.4, cue text parsing rules](https://www.w3.org/TR/webvtt1/#webvtt-cue-text-parsing-rules),
character references produce text nodes. The fixture uses only valid standard
entities. Focused Vitest RED shows expected `A & B <3 >2`, received
`A &amp; B &lt;3 &gt;2`. No production correction made in test-only scope.

An initial suspicion about `NOTE` with an embedded arrow was withdrawn after
checking the standard: authoring forbids arrows in comments, and its parsing
algorithm can treat that malformed input as a cue. No speculative test or
finding remains for it.

### Verification

- `bunx biome check src/core/*.test.ts src/captions/*.test.ts`: 15 files pass.
- `bun run test --project dom src/core`: 13 files, 56 tests pass.
- `bun run test --project dom src/captions/parse-webvtt.test.ts`: 3 tests pass.
- Character-reference regression: 1 test fails for the stated encoded output.
- All final test files are below 200 lines (hard limit 280).
- In a disposable `/tmp/vibe-player-test-audit/core-probe` copy, three targeted
  mutations failed the intended assertions: disabled stale-load generation
  guards failed late successful load; exclusive caption end changed to inclusive
  exposed both adjacent captions at 2 seconds; milestone comparison changed from
  inclusive to strict missed exactly 25%. Original production files were never
  mutated. JSON evidence: `/tmp/vibe-player-test-audit/core-probe-results.json`.
- DOM/project evidence cannot establish real browser playback or layout.


## Adapter audit

Applied `.claude/skills/testing-patterns/SKILL.md` to all 12 original adapter test files, their provider/native boundaries, helper fixtures, and documented provider behavior. Baseline: 52 expanded cases; final: 59 cases in 12 files. Ten existing files were strengthened, one retained unchanged, one deleted, and one replacement file added. No production file or helper was changed.

### File decisions

| Original file                                          | Decision                                             | Contract and reason                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/adapters/create-file-adapter.test.ts`             | Rewrite four cases                                   | Real DOM source/caption setup, event translation, buffering policy and rejection tests remain. Command test now detects missing play/pause forwarding; deferred playback tests now use connected targets and observable paused state; fullscreen now proves delegation and capability reset. |
| `src/adapters/create-hls-adapter-load-session.test.ts` | Strengthen both cases                                | Existing stale-success/unmount and stale-failure/new-source cases are important. Extend stale callbacks to quality/live/error and assert exact surviving loading state.                                                                                                                      |
| `src/adapters/create-hls-adapter-quality.test.ts`      | Strengthen selection case                            | Retain managed/native preference, startup fallback and post-play callbacks. Selecting Auto must clear manual selection; unsupported IDs must not call through or emit change.                                                                                                                |
| `src/adapters/create-hls-adapter.test.ts`              | Rewrite deferred pause case                          | Preserve native/managed selection, live/VOD transition, normalized errors, unavailable-runtime rejection, and default factory routing. Connected media prevents the disconnected guard from hiding cancellation defects.                                                                     |
| `src/adapters/create-youtube-adapter.test.ts`          | Keep                                                 | Real adapter with provider-boundary fixture checks normalized state/output, time sampling, play-blocked discrimination, clamped protocol commands, teardown capability reset, unsupported inputs and startup timeout. Factory kind is a real runtime routing contract, not a type guarantee. |
| `src/adapters/create-youtube-external-adapter.test.ts` | Strengthen two cases                                 | Replace production URL-helper oracle with literal watch URL; factory test now loads source and proves external link/absence of iframe instead of only inspecting static capabilities.                                                                                                        |
| `src/adapters/hls-managed-runtime.test.ts`             | Strengthen oracle                                    | Preserve preexisting untracked regression against currentLevel buffer flushing. Expected projected level metadata is now literal rather than the same mutable provider fixture.                                                                                                              |
| `src/adapters/native-picture-in-picture.test.ts`       | Keep four, add denial matrix                         | Native command dispatch and same-video exit are real browser protocol contracts. Add document-disabled and video-disabled states to reject always-enable behavior.                                                                                                                           |
| `src/adapters/youtube-adapter-state-change.test.ts`    | Delete                                               | Three cases mocked every internal collaborator and pinned call order. Normalized event protection already lives in the real adapter suite; unique sampling/ended behavior moves to real adapter tests below.                                                                                 |
| `src/adapters/youtube-iframe-runtime.test.ts`          | Strengthen callback case                             | Keep cached API, fallback polling, timeout and origin/referrer protocol protection. Concurrent loads must share one injected script and preserve the host callback.                                                                                                                          |
| `src/adapters/youtube-playback-watchdog.test.ts`       | Rewrite stall case, retain progress, add three cases | Assert deadline/once-only semantics, no rescheduling after progress, replacement intent deadline, cancellation and disappeared provider.                                                                                                                                                     |
| `src/adapters/youtube-time-updates.test.ts`            | Rewrite both cases                                   | Pin sampling edge behavior, repeated-start idempotence, silence after stop and fresh sampling after restart.                                                                                                                                                                                 |

### Added or rewritten cases and defects caught

All cases below ran in the Vitest `dom` project. Retained valid-path cases remain where their outputs discriminate against default/no-op/rejection implementations.
- File `forwards playback commands and clamps seek and volume values`: catches missing native play/pause forwarding while preserving seek/volume output checks. A connected target avoids an unrelated post-play auto-pause.
- File `stops a pending playback request after unmount`: catches late native play leaving detached media playing; fake native completion actually switches `paused` to false.
- File `stops a pending playback request after pause`: catches missing generation cancellation. The old detached fixture passed because a separate connectivity guard forced pause.
- File `uses fullscreen only when the mounted video supports it`: catches a no-op fullscreen method and stale capability after unmount.
- HLS `destroys managed HLS when async load resolves after unmount`: catches stale ready/error emissions or stale quality mutation after disposal, in addition to missing late-controller destruction.
- HLS `does not apply stale native fallback after a newer HLS load`: catches old manifest fallback overriding the active managed source; exact `loading` output avoids accepting arbitrary non-error states.
- HLS `exposes and sets managed HLS quality options`: catches Auto leaving a manual option selected and unsupported quality IDs emitting false changes.
- HLS `stops a pending playback request after pause`: catches missing playback generation cancellation, now independently from node connectivity.
- External YouTube `renders a compliant external handoff without an iframe`: catches wrong video/start URL even if production URL construction is wrong.
- External YouTube `uses the external factory branch without loading an iframe`: catches wrong factory routing through real load behavior.
- Managed HLS `switches manual and automatic quality without flushing playback`: catches switching through immediate currentLevel and corrupted projected level metadata.
- PiP `refuses picture-in-picture when disabled by the document/video` (two cases): catches ignoring either independent capability veto, including forbidden request side effects.
- YouTube events `stops time sampling for provider state ...` (four cases): catches continued timeupdate traffic after pause, cue, buffering or end, through the real adapter and timers; also checks paused/ready-state output.
- YouTube events `does not mistake a completed short video for blocked playback`: catches ended playback leaving a pending watchdog that later emits playblocked.
- Iframe `shares a script across concurrent loads and preserves the host callback`: catches duplicate API insertion, unresolved second caller, or lost host readiness callback.
- Watchdog `reports a stalled intent once, only after its full grace period`: catches early timeout, postponed deadline from ensureScheduled, or repeated blocked notifications.
- Watchdog `does not block playback after real time advancement`: also verifies ensureScheduled cannot resurrect a completed intent.
- Watchdog `gives a new play intent a new deadline without firing the old one`: catches a stale timer firing against a fresh play request.
- Watchdog `cancels a user-abandoned intent even when buffering tries to reschedule`: catches cancelled playback later producing false blockage.
- Watchdog `does not report a playback failure after the provider disappears`: catches delayed events without an active provider.
- Sampling `samples once per interval even when playback repeatedly reports playing`: catches duplicate intervals, immediate ticks and restarting the sampling clock on repeated starts.
- Sampling `stops sampling and starts a fresh interval when playback resumes`: catches leaked stopped intervals or stop permanently disabling resume.

### Sensitivity and verification

- `bun run test --project dom src/adapters`: 12 files, 59 tests passed.
- `bunx biome check src/adapters`: passed, 46 files, no fixes on final check.
- `git diff --check -- src/adapters`: passed.
- Every test file remains below 200 lines, within the 280-line hard limit.
- Compared all adapter production files against the parent's pre-task SHA-256 inventory: unchanged.
- Disposable-copy mutation probe removed only playback-generation inequality in `native-video-playback.ts`: both file/HLS pause-race cases failed on `paused` (false instead of true). Shared production files were never changed.
- Disposable-copy mutation probe removed `stopTimeUpdates()` in the YouTube state-change owner: all four replacement lifecycle cases failed on extra emitted events. Logs: `/tmp/vibe-player-test-audit/adapter-probes/native-cancellation.log` and `youtube-sampling-stop.log`.
- Provider/browser doubles prove package translation/lifecycle only. No claim about actual media decoding, native PiP/fullscreen, YouTube network behavior, or visual playback is made.


## React hooks audit

All five original hook test files were inspected with their real hook owners,
controller/adapter boundary, and component callers. Four changed, one retained,
one lifecycle file added. No production changes.

| Original file                                         | Decision | Protection                                                                                                                                    |
| ----------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/react/use-vibe-player-captions.test.tsx`         | Keep     | Default-track selection with distinct tracks, actual selected caption text over time, no disabled load, precise loader error and empty output |
| `src/react/use-vibe-player-chrome.test.tsx`           | Rewrite  | Idle activity resets deadlines, focus prevents hiding, disabling cancels existing timer, closing cancels pending hide and reopening resumes   |
| `src/react/use-vibe-player-controller.test.tsx`       | Extend   | Preserve existing subscription stability and SSR snapshot regression; add actual replacement-controller subscription and cleanup              |
| `src/react/use-vibe-player-overlay-presence.test.tsx` | Extend   | Preserve exclusive exit deadline; add rapid close/reopen/close stale-timer challenge                                                          |
| `src/react/use-vibe-player-shortcuts.test.tsx`        | Extend   | Preserve target cleanup and fresh capability/callback checks; add target migration, cancellation semantics, disabled cleanup                  |

### Changed/new cases and defects

- Chrome `restarts the full idle delay after activity instead of using the old deadline`: catches an uncleared old idle timer and early hiding; tests just before and at the new deadline.
- Chrome `cancels a pending hide when disabled and resumes it when enabled`: catches a stale auto-hide timer after preference change and an always-visible implementation.
- Chrome `resets chrome and clears timers when closed`: closes before expiry so missing cancellation is observable, then proves reopening restores idle hiding.
- Controller `switches subscriptions to the replacement controller and releases both adapters`: catches stale hook subscriptions, failure to read replacement state, and leaked adapters when options change/unmount. Uses the real controller and distinct 12/34/99 event values.
- Overlay `cancels an old exit when reopened and gives the next close a full delay`: catches the first exit timer removing the overlay during a later closing cycle. The initial candidate survived a cancellation mutation; moving the second close before the first deadline made the genuine premature-removal defect observable.
- Shortcuts `moves keyboard ownership to the new target and releases it when disabled`: catches listeners attached to old/disabled targets and unwanted `preventDefault`; accepted events still invoke the public action.
- New `src/react/use-vibe-player-captions-lifecycle.test.tsx`, superseded request resolves/rejects: catches old caption text or errors replacing a pending current request, and old completion clearing the current loading indicator. Both promises settle.
- Caption late success after replacement completion: catches old text overwriting the current caption output.
- Caption disable during load: catches failure to abort and stale completion leaking text when captions are re-enabled before the new request completes.
- Caption default-loader HTTP error: rejects a 403 even if its response body is syntactically valid WebVTT; catches parsing a failed response as successful captions.

### Evidence

The focused React lane passed 20 cases; the centralized full-suite result
includes the final timing and re-enable refinements. Disposable-copy mutation
probes rejected missing caption cancellation guards (four failures), missing
chrome timer cancellation (one failure), and missing overlay timeout cleanup
(one failure after fixture refinement). No shared production files were mutated.
SSR coverage is React hydration in happy-dom, not real-browser hydration/layout
acceptance. No live caption server or browser playback was tested.


## UI and skin test audit

Applied `.claude/skills/testing-patterns/SKILL.md` to all 11 original test files
in `src/ui` and `src/skins`, plus the shared stage adapter fixture. Read the
corresponding components, immediate composition owners, and public usage/audio
contracts. Existing uncommitted test edits were preserved and improved in place.
No production source or shared fixture was changed.

### Inventory decisions

| Original file                                 | Decision                                                                            | Independent protection                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/skins/cinematic-default/tokens.test.ts`  | Delete all 5 cases                                                                  | These mirror CSS recipes, preset metadata, constant exports, and object identity. They do not prove geometry or motion. Actual chrome/presence timing is owned by hook/component behavior tests; export validity remains a package gate.                                                                  |
| `src/ui/vibe-player-caption-overlay.test.tsx` | Merge and rewrite 2 cases into 1 transition                                         | Literal caption text and line breaks are announced politely, replaced rather than appended, escaped rather than interpreted as HTML, and removed on expiry. CSS-class identity/pointer-through claims removed.                                                                                            |
| `src/ui/vibe-player-controls.test.tsx`        | Strengthen capability case; prune structural assertions                             | Supported controls retain action protocol checks. Unsupported optional controls are now tested with playback enabled and every optional callback supplied, so capability guards genuinely run. External handoff still preserves its link without playback chrome.                                         |
| `src/ui/vibe-player-inline.test.tsx`          | Merge bare children render into assembly lifecycle test                             | Real caption toggles hide/reveal loaded cues; inline playback does not autoplay; removing source releases adapter and removes controls/captions while exposing fallback content. Existing user-action wiring retained.                                                                                    |
| `src/ui/vibe-player-modal.test.tsx`           | Rewrite all 3 cases                                                                 | Closing immediately removes dialog from accessibility and makes it inert while preserving exit presence; inner interaction cannot dismiss but outside pointer can; closing releases a playing adapter before exit finishes. Replaced duplicate modal adapter fixture with existing stage adapter fixture. |
| `src/ui/vibe-player-stage-autoplay.test.ts`   | Keep 3 protocol cases; add cancellation race                                        | Muted bootstrap order, already-muted path, and explicitly disabled bootstrap remain distinct. Deferred mute completion after cancellation cannot start playback.                                                                                                                                          |
| `src/ui/vibe-player-stage-status.test.tsx`    | Strengthen delayed/cancelled cases; remove visual-structure assertions              | Buffer status appears at the delay boundary with an accessible name; a restarted buffer gets a fresh full delay despite the cancelled timer; paused states hide busy UI; blocked/error messages remain distinct.                                                                                          |
| `src/ui/vibe-player-stage.test.tsx`           | Remove duplicate blocked-status-only case; strengthen toggle result                 | Recovery case already proves blocked status plus successful retry. Media-surface pause now also requires the visible Play action. Close/unmount, source failure, PiP dispatch, and unmute/resume cases retained.                                                                                          |
| `src/ui/vibe-player-timeline.test.tsx`        | Strengthen drag and unavailable-duration cases                                      | Primary drags use explicit geometry, clamp outside edges, reject secondary input, and stop after release. Duration-zero and capability-disabled timelines refuse pointer seeks. Accessible elapsed/total text and native range dispatch remain.                                                           |
| `src/ui/vibe-player-tooltip.test.tsx`         | Strengthen collision integration; add disabled transition                           | Hand-checked collision offsets retained. Resize must remove obsolete correction; blur hides tooltip. Opening competing popover disables an already visible tooltip and prevents hover from reopening it.                                                                                                  |
| `src/ui/vibe-player-volume-control.test.tsx`  | Replace single unmute case with 4 discriminating keyboard cases; tighten timer edge | Keyboard raises by 5%, Shift raises by 10%, upper bound clamps to 1, lower bound clamps to 0 without unmuting. Inactivity dismissal remains deferred while interacting and fires at 520 ms after leaving following a commit.                                                                              |

### Added or rewritten case defects

All cases below ran in the Vitest `dom` lane.
- `announces literal caption lines and removes expired text`: catches stale/concatenated cues, lost line separation, HTML interpretation, or lost live announcement.
- `hides unsupported optional controls while keeping playback usable`: catches ignoring optional capabilities. Previously the whole playback subtree was absent, so every optional guard could be broken without failure.
- `connects caption controls and releases playback when its source is removed`: catches disconnected caption toggles, unwanted autoplay, or leaked media/captions after source removal.
- `removes a closing dialog from accessibility before its exit completes`: catches interactive/announced closing content, premature removal, or a never-completing exit.
- `dismisses outside pointer presses without dismissing content interaction`: catches unconditional dismissal from bubbled content events.
- `releases media immediately on close while the modal is still exiting`: catches playing media surviving until the visual exit finishes.
- `does not start a source cancelled while muting is pending`: catches autoplay of a source disposed during the awaited bootstrap command.
- `delays compact busy chrome for active playback buffers`: retains exact reveal boundary while asserting accessible status instead of CSS classes/spinner child structure.
- `gives a restarted buffer its full delay instead of reusing a cancelled timer`: catches an obsolete reveal timer exposing a new buffer too early. The former case never crossed the initial deadline and could not prove cancellation.
- `clears visible busy chrome as soon as playback pauses`: preserves the behavioral disappearance check and uses accessible status instead of class identity for setup.
- `autoplays on open and toggles playback from the media surface`: now also catches stale visible playback action after pausing, in addition to the adapter command contract.
- `clamps a primary drag to media bounds and stops seeking on release`: catches unclamped seeks, secondary-pointer hijacking, and seeking after release.
- `refuses pointer seek for 0 seconds, disabled=false`: catches interaction with unavailable duration.
- `refuses pointer seek for 100 seconds, disabled=true`: catches ignored seek capability despite a valid duration.
- `recomputes collision correction on resize and removes it on blur`: catches stale correction after a boundary changes and a tooltip surviving focus exit.
- `suppresses a visible tooltip when its competing popover disables it`: catches disabled-state transitions failing to hide or block tooltip reopening.
- Keyboard volume rows (`0.25`, `1`, `0`, `0.3`): catch wrong normal/Shift step, overflow, underflow, and unmuting silence respectively.
- `auto-dismisses the volume popover after inactivity`: now distinguishes 519 ms from 520 ms instead of using a loose timing window.

### Sensitivity evidence

Six isolated mutations were tested in a disposable source copy and each failed
its intended focused assertion; no shared production file was mutated:
1. Ignore fullscreen capability: unsupported-controls case fails.
2. Leave old busy timeout alive: restarted-buffer case fails.
3. Ignore cancellation after muting: deferred autoplay case fails.
4. Remove pointer-percent clamping: drag-bounds case fails.
5. Unmute even at zero volume: lower-bound keyboard case fails.
6. Dismiss on every bubbled pointer down: inside/outside modal case fails.

Machine-readable probe results: `/tmp/vibe-player-test-audit/ui-mutations.json`.

### Verification and scope

- Baseline: 11 files, 37 cases. Final: 10 files, 35 passing cases.
- Changed 10 existing test files; deleted 1 test file; no new test files.
- `bun run test --project dom src/ui --reporter=json --outputFile=/tmp/vibe-player-test-audit/ui-final-results.json`: passed.
- `bunx biome check src/ui/*.test.ts src/ui/*.test.tsx`: passed, 10 files.
- `git diff --check -- src/ui src/skins`: passed.
- Full repository checks and typecheck are centralized with the lead agent.
- Happy-dom and explicit rectangles verify event/state/computation contracts,
  not rendered layout, animation quality, native media, or actual browser focus.


## Preview audit

Original inventory: `src/preview/vibe-player-background-preview.test.tsx` (7 cases).
Decision: rewrite 5 cases, retain no-key isolation behavior, remove the style-string/visibility-only case, add one pause/resume challenge. Final: 7 cases, one edited test file, one edited helper, zero deleted files. No production changes.

### File decision

| File                                                         | Decision                  | Protection                                                                                                                                              |
| ------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/preview/vibe-player-background-preview.test.tsx`        | Rewrite                   | Playback configuration, consumer pause, frame-driven old-video retirement, cache isolation/remount, reduced-motion suppression, activation availability |
| `src/preview/vibe-player-background-preview-test-helpers.ts` | Remove unused `getPoster` | The deleted helper queried inline CSS; no remaining caller uses it                                                                                      |

### Cases and defects

- `requests playback of a muted inline loop without exposing decorative media`: detects audible/non-looping media, missing inline playback or accessibility exclusion, and playback directed at the wrong element. The previous case checked only one `play()` call.
- `pauses the current loop and resumes it only after the consumer releases pause`: detects ignored pause, playback continuing while paused, and failure to resume the same video. New discriminating transition.
- `retains the previous loop until the replacement has a frame, then retires it`: detects early removal and leaked old video after frame readiness. Replaces private visibility flags with actual media-node lifecycle. Timers advance by a hand-picked 500 ms, not a production timing constant; this is lifecycle evidence, not visual crossfade evidence.
- `does not inherit another preview when no preserve key is supplied`: retained unique isolation behavior; absence of the old source and presence of the new source distinguish global accidental inheritance and an empty render.
- `preserves across matching keys while keeping unrelated previews isolated`: detects global cache contamination and broken remount preservation using distinct keys/sources. Removes redundant poster and private visibility assertions.
- `never requests playback for reduced-motion viewers, including after pause release`: detects pause release overriding the viewer's preference and pause calls aimed at a different video.
- `exposes an activation button only when the consumer provides an action`: detects a dead button when there is no action, a missing accessible action, and click failing to invoke the consumer. Removes generic child-render confirmation.

Deleted `keeps poster fallback and reveals video after the first frame`: inline style text and private `data-visible` flags did not prove poster fallback, frame presentation, or visual reveal. Frame-driven lifecycle is now covered by the replacement retirement challenge. Actual poster rendering/crossfade remains browser acceptance work; no browser claim is made here.

### Evidence

- `bun run test --project dom src/preview/vibe-player-background-preview.test.tsx`: 7/7 passed.
- Scoped Biome check of the test and helper: passed.
- Disposable-copy mutation removing old-layer retirement: the targeted retirement case failed because `/loop.mp4` remained in the document; 1 failed, 6 unselected. Shared production files were never mutated. Probe output: `/tmp/vibe-player-test-audit/preview-mutation.log`.
- happy-dom does not implement the `playsInline` JavaScript property; the assertion uses the actual `playsinline` DOM attribute, which React supplies to browsers.
- No real decoding, browser autoplay policy, motion rendering, or live-provider acceptance was exercised.


## Scripts audit

Inspected all 15 original script test files, the audit/guard implementations,
`docs/media-delivery.md`, and the release policy. The configured Node lane contains
all 15 files. Changed 10 test files; retained 5 unchanged; deleted no whole files.
Cases: 39 before, 69 after. Most growth is replacing one combined release-drift
case with isolated rule cases, not duplicating happy paths.

### File decisions and protection

| File                                                      | Decision            | Independent protection / defect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/media-delivery-audit-args.test.mjs`              | Rewrite             | Remove imported usage constant from expected error; add strict-only invocation to catch switches accidentally enabling credentials/JSON/readiness together. Retain explicit CLI parsing, help, and invalid-argument contracts.                                                                                                                                                                                                                                                                                                                                            |
| `scripts/media-delivery-audit-core.test.mjs`              | Rewrite             | Move tail sample to a nonzero absolute byte offset and assert first/tail/origin Range headers; catches returning a tail-relative MP4 offset or probing the wrong region. Retain mixed allowed/missing origins, MP4 ordering, machine output and remediation propagation.                                                                                                                                                                                                                                                                                                  |
| `scripts/media-delivery-audit-credentialed-cors.test.mjs` | Rewrite             | Add conjunction table: exact origin without ACAC, ACAC false, wrong origin with ACAC true, correct credentialed pair, and anonymous wildcard. Catches accepting only one credential condition or rejecting all wildcards. Existing wildcard+credential rejection and exact-origin success remain.                                                                                                                                                                                                                                                                         |
| `scripts/media-delivery-audit-fetch.test.mjs`             | Rewrite             | Replace same-byte/length-only body with asymmetric chunks; assert exact ordered prefix, cancellation, and Range header. Catches dropped/reordered chunks, over-reading, failure to cancel, and missing range requests. Retain header parsing and redirected URL reporting.                                                                                                                                                                                                                                                                                                |
| `scripts/media-delivery-audit-findings.test.mjs`          | Keep                | Literal error codes/actions, distinct CORS origin, and healthy non-MP4 versus faststart fixtures distinguish missing findings, incorrect remediation, and unconditional MP4 rejection.                                                                                                                                                                                                                                                                                                                                                                                    |
| `scripts/media-delivery-audit-format.test.mjs`            | Keep                | Human-output contracts cover healthy/error distinction, eight-box truncation, CORS details, remediation commands, binary size units, unknown lengths and redirect-only resolved URL. Output is this module's behavior, not source-text matching.                                                                                                                                                                                                                                                                                                                          |
| `scripts/media-delivery-audit-range.test.mjs`             | Keep                | A 200 response must not trigger a tail download; checks forbidden request plus explicit range/faststart findings and known total size.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `scripts/media-delivery-audit-rollout.test.mjs`           | Keep                | Independently specified combined failures prove priority of oversized assets and header repairs; clean report rejects an always-blocking implementation.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `scripts/media-delivery-audit-runner.test.mjs`            | Rewrite             | Add healthy strict+readiness gate and failed report generation with exact stderr, exit 1 and empty stdout. Catches unconditional CI failure and silently successful network errors. Retain strict finding failure, non-strict success, readiness failure, help and argument rejection before network work.                                                                                                                                                                                                                                                                |
| `scripts/media-delivery-audit-size.test.mjs`              | Rewrite             | Add exact 524288000-byte threshold and next byte. Catches `>=` in place of `>` and ignored limits; retain oversized report/remediation/JSON contract.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `scripts/media-delivery-audit-unknown-size.test.mjs`      | Keep                | Partial Content-Length must not become total size when Content-Range has unknown total. Checks no tail request, unknown-size finding and repair action.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `scripts/package-size-rules.test.mjs`                     | Rewrite/delete case | Delete static budget-label mirror. Replace production gzip oracle and ASCII-only raw count with independent UTF-8/binary bytes and the 20-byte empty gzip format. Exact/next-byte budget case rejects character counting and off-by-one comparison.                                                                                                                                                                                                                                                                                                                       |
| `scripts/package-tarball-rules.test.mjs`                  | Rewrite             | Replace imported production allowlist as test input with an independent consumer archive fixture from the release contract; stylesheet omission and workspace leak must be detected. Parser still checks CRLF/noise handling and sorted real paths.                                                                                                                                                                                                                                                                                                                       |
| `scripts/public-surface-rules.test.mjs`                   | Rewrite/delete case | Remove static symbol-list mirror and production-derived declaration fixtures. Test required short identifier versus longer public identifier and exact internal leak versus consumer prefix/suffix. Catches substring matching and missing/leaked-symbol suppression.                                                                                                                                                                                                                                                                                                     |
| `scripts/release-state-rules.test.mjs`                    | Rewrite             | Replace simultaneous invalid fields plus partial containment assertions with isolated drift and exact diagnostic arrays. Cases cover identity/private marker/license; each author field; repository URL/tracker/homepage/funding; ESM/module/types; stylesheet side effects; public access/provenance; CLI entry; exact Bun version; runtime/type/style exports; Node shebang; Changesets access. Catches checks incorrectly gated on an unrelated invalid field, omitted diagnostics, and spurious diagnostics. Valid manifest remains the always-reject counterexample. |

### Sensitivity evidence

Ran focused mutations only in a disposable copy at
`/tmp/vibe-player-test-audit/scripts-probe`; shared production files were untouched.
- UTF-8 byte count replaced by JS string length: expected 6, received 3; focused test failed.
- Credential origin check ignores ACAC: missing/false ACAC cases failed.
- Tail offset loses absolute start: expected 1048576, received 0; focused test failed.
- Size comparison changed from `>` to `>=`: exact-limit case failed with an unwanted oversized finding.

Detailed failure records: `/tmp/vibe-player-test-audit/scripts-probes.json`.
These probes establish sensitivity; they are not claims of existing product defects.

### Verification

- `bun run test --project node`: 15 files, 69 tests passed.
- `bunx biome check scripts/*.test.mjs`: 15 files checked, no fixes/errors.
- `git diff --check -- scripts`: passed.
- All script test files remain under the 280 LOC hard limit (largest: 228).
- No production code, package configuration, or existing helper changed.
- Unit boundary responses are controlled; no live CDN or publishing was invoked.
