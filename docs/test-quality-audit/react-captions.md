# React and captions test audit

Inspected all 15 original test files, their production owners, source/controller
contracts, and the immediate Stage/Modal consumers. Kept the real hooks,
controller, and parser under test; adapter fakes and controlled caption loaders
remain appropriate boundaries. No test file was deleted or left unresolved.

## File decisions

Paths are relative to `src/`.

| Original file                                         | Decision | Protection and action                                                                                                                                                                                                         |
| ----------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `captions/parse-webvtt.test.ts`                       | REWRITE  | Retain fractional/CRLF/multiline, invalid-range recovery, and inclusive-start/exclusive-end cases. Add discriminating malformed timestamps, valid signature-prefixed identifiers, and explicit comma-timestamp compatibility. |
| `captions/parse-webvtt-character-references.test.ts`  | REWRITE  | Retain literal entity, once-only decoding, and tag-boundary cases. Add plain indentation and tabs that markup-wrapped fixtures previously concealed.                                                                          |
| `react/use-vibe-player-captions.test.tsx`             | REWRITE  | Keep default-track selection, active-line changes, and disabled no-load behavior. Delete one redundant asynchronous rejection test; status/recovery tests already verify the same rejected-error state and useful recovery.   |
| `react/use-vibe-player-captions-lifecycle.test.tsx`   | KEEP     | Controlled old/new completion orders protect immediate clearing, stale success/rejection, disabled cancellation, and HTTP-error refusal at the real hook.                                                                     |
| `react/use-vibe-player-captions-loader.test.tsx`      | REWRITE  | Keep latest-loader/stable-retry and pending callback replacement contracts. Add equal reconstructed tracks versus changed delivery URLs, asserting request count, cancellation, and visible text.                             |
| `react/use-vibe-player-captions-status.test.tsx`      | KEEP     | Synchronous exceptions, disable/re-enable recovery, explicit retry, old retry completion, and old-error attribution cover distinct transitions.                                                                               |
| `react/use-vibe-player-chrome.test.tsx`               | REWRITE  | Retain exact idle deadlines, focus hold/release, and disabling. Extend closing to activity callbacks; unmount before restoring fake timers and verify no timer remains.                                                       |
| `react/use-vibe-player-overlay-presence.test.tsx`     | REWRITE  | Keep exit thresholds and close/reopen/close races. Unmount before restoring fake timers and verify no timer remains.                                                                                                          |
| `react/use-vibe-player-controller.test.tsx`           | REWRITE  | Keep stable subscription, SSR hydration, replacement-controller ownership, and adapter release. Put manually hydrated root cleanup in `finally`.                                                                              |
| `react/use-vibe-player-controller-callbacks.test.tsx` | KEEP     | Latest analytics callback receives a real controller event without replacing the controller or stopping playback.                                                                                                             |
| `react/use-vibe-player-shortcuts.test.tsx`            | KEEP     | Actual DOM events verify target ownership, current callback/capabilities, preventDefault, disable, and unmount. Pure key mapping remains core-owned.                                                                          |
| `react/use-vibe-player-presentation.test.tsx`         | KEEP     | Changing the presentation container preserves media/session/time while updating the adapter mount target.                                                                                                                     |
| `react/use-vibe-player.test.tsx`                      | KEEP     | Equal/changed file sources, autoplay enablement, pending close/reopen, detached targets, and StrictMode disposal protect actual hook/controller integration.                                                                  |
| `react/vibe-player-autoplay.test.ts`                  | REWRITE  | Keep command ordering, muting cancellation, already-muted, and bootstrap-disabled branches. Remove assertions against fake-owned mutable state and the unnecessary fake state mutation; assert the real helper's commands.    |

## Confirmed repairs and sensitivity

1. **WebVTT timestamps:** coercion accepted signed components, seconds/minutes
   outside `0..59`, short minute fields, and missing/short milliseconds. Six
   literal invalid inputs failed before repair and now skip only the invalid
   cue; an independently calculated `100:01:02.003` cue remains valid. The
   [WebVTT timestamp parsing rules](https://www.w3.org/TR/webvtt1/#collect-a-webvtt-timestamp)
   supply the oracle. The explicit comma normalization in existing code is
   retained and characterized as compatibility, despite differing from WebVTT.
2. **Cue content:** a valid `WEBVTT-intro` identifier was discarded as a header,
   and ordinary leading/trailing whitespace was removed. Both regressions
   failed on visible cue output before repair. Header recognition now applies
   only to the first block, and payload lines retain their original whitespace.
   Existing once-only entity decoding remains unchanged.
3. **Caption request cost/lifecycle:** rebuilding an equal track object caused
   **2 loader calls and cancellation instead of 1 live request** for one host
   rerender. Stable selection by the track's declared fields removes the extra
   request. The same test changes the URL under the same track ID and verifies
   a second load plus replacement captions, excluding an always-cache fix.
4. **Closed chrome:** invoking activity handlers while closed restarted the hide
   timer and changed `chromeHidden` to true. The existing closing test now
   reproduces that failure and passes after scheduling checks `open`. Reopening
   still gets the full idle delay.

The initial combined RED run failed on all new parser/content/loader probes,
including a provisional comma rejection. Source review identified explicit
comma normalization as intentional compatibility, so that provisional oracle
was replaced with the compatibility case before implementation. The final
six invalid timestamp cases all had behavioral RED evidence. Chrome had its
own focused RED/GREEN run.

## Verification and limits

- `bun run test --project dom src/react src/captions`: **15 files, 62 tests
  passed**. After the final autoplay-fixture simplification, its 4 tests passed
  again; the other files were unchanged.
- `bunx biome check src/react src/captions` and `bunx biome lint src/react
  src/captions`: **25 files passed**, no fixes in the final run.
- `git diff --check -- src/react src/captions`: passed. All source files remain
  below the 280-line limit.
- React trees use Testing Library cleanup; timer suites additionally verify zero
  timers after unmount, manually hydrated roots have unconditional cleanup, and
  all controlled requests are explicitly settled. No processes, network fixtures,
  or persistent environments were created.

The suspected NOTE-with-timing-example issue was not changed: `-->` makes that
comment malformed, and the specification's block-recovery algorithm can treat
the second line as cue timing. It is not evidence of a valid-comment bug.
This is not a wholesale WebVTT conformance rewrite. Browser caption positioning,
actual motion, native playback, and autoplay policy require the lead agent's
surface acceptance lanes; happy-dom and injected adapters do not establish them.
Root typecheck and broad/browser verification remain centrally owned by the lead.
