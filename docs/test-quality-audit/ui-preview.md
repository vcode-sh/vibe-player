# UI and preview test-quality audit

All 24 original test files were read together with their component, interaction,
and lifecycle owners. The audit also checked their immediate consumers:
`VibePlayerControls`, `VibePlayerBottomControls`, `VibePlayerStage`, inline/modal
assemblies, thumbnail rendering, and the background/ambient preview composition.
The current testing-patterns skill and repository reference governed decisions.
No original test file was deleted: the existing cases protect distinct behavior
or an explicit accessibility/presentation contract. Presence assertions were
retained where absence, exposure, or a normalized provider capability is the rule.

## Original file decisions

Paths in this table are relative to `src/`.

| File                                                      | Decision | Contract, meaningful failure, and additional role                                                                                                                                                                                |
| --------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/select-vibe-player-seek-thumbnail.test.ts`            | KEEP     | Independently specified inclusive starts, exclusive ends, final-duration exception, unsorted overlap priority, gaps and malformed crops. Catches wrong comparisons and invalid-first-entry selection.                            |
| `ui/vibe-player-caption-overlay.test.tsx`                 | KEEP     | Literal text, line separation and expired-caption removal. The absence of a rendered `b` element protects text handling rather than merely recording markup.                                                                     |
| `ui/vibe-player-controls.test.tsx`                        | REWRITE  | Keeps action wiring and optional-control capability partitions; strengthens unsupported volume absence so a mislabeled volume trigger cannot escape the assertion. Handoff chrome remains explicitly protected.                  |
| `ui/vibe-player-inline.test.tsx`                          | REWRITE  | Keeps actual inline assembly, caption toggles, command forwarding and source removal. Reuses the existing stateful stage adapter instead of a separate 100-line fake and now observes Pause after playback.                      |
| `ui/vibe-player-modal-accessibility.test.tsx`             | REWRITE  | Keeps opener restoration, consumed Escape, nested scroll-lock ownership, CSS priority and unmount coverage. Registers manually appended opener cleanup in `afterEach`, including assertion-failure paths.                        |
| `ui/vibe-player-modal-popover-escape.test.tsx`            | KEEP     | Real volume/quality composites inside a real modal catch first-Escape bubbling and focus-restoration regressions. Complements the synthetic consumed-event case.                                                                 |
| `ui/vibe-player-modal-tab.test.tsx`                       | KEEP     | Wraps forward/backward around disabled, hidden, inert and negative-tabindex elements; static-content fallback distinguishes no-op focus handling. Browser lane owns native tab traversal.                                        |
| `ui/vibe-player-modal.test.tsx`                           | KEEP     | Exit accessibility/inert boundary at 179/180 ms, outside-versus-content dismissal, and media disposal before animation completion. Distinct timing and resource contracts.                                                       |
| `ui/vibe-player-presentation-controls.test.tsx`           | KEEP     | Active fullscreen/PiP exit actions and provider-specific rate choices catch using entry actions or unsupported default rates.                                                                                                    |
| `ui/vibe-player-seek-preview.test.tsx`                    | KEEP     | Real selector/image consumer covers shared-sheet crop changes, gaps, late old-image events, replacement errors and decoded-size bounds. DOM events do not establish real image decoding/layout.                                  |
| `ui/vibe-player-stage-caption-focus.test.tsx`             | KEEP     | Real retry removes a focused button and must retain modal-contained focus; distinct from caption loader correctness.                                                                                                             |
| `ui/vibe-player-stage-captions.test.tsx`                  | KEEP     | Caption failure/retry stays independent of video playback/error reporting and does not create another adapter.                                                                                                                   |
| `ui/vibe-player-stage-integration.test.tsx`               | KEEP     | Equivalent source identity, shared wrapper option forwarding, current error observer, normalized visibility and StrictMode disposal. Exercises assembled owners instead of a mocked hook answer.                                 |
| `ui/vibe-player-stage-observers.test.tsx`                 | KEEP     | Synchronous/asynchronous observer failures, failed reporter containment, stale source/controller work and unmount. Controlled promise completion reaches the actual owner fence.                                                 |
| `ui/vibe-player-stage-presentation.test.tsx`              | KEEP     | Provider mode delegates its playback bar while retaining package host chrome/shortcuts; outside mode exposes exactly one bar. Structure is the normalized capability contract.                                                   |
| `ui/vibe-player-stage-status.test.tsx`                    | KEEP     | Busy delay at 319/320 ms, canceled/restarted delay, paused suppression, blocked/error labels. These boundaries detect flicker and stale timers.                                                                                  |
| `ui/vibe-player-stage-thumbnails.test.tsx`                | KEEP     | Stage forwards new frames without creating/loading another playback session. Adds composition coverage beyond image helper tests.                                                                                                |
| `ui/vibe-player-stage.test.tsx`                           | KEEP     | Media-surface toggle, open/close disposal, blocked retry, load error, PiP command and unmute-resume behavior. Real controller with a controlled provider boundary.                                                               |
| `ui/vibe-player-timeline-preview.test.tsx`                | KEEP     | Pointer preview never seeks; keyboard updates supersede a stationary pointer until it moves. Independent image/time outcomes detect stale hover state.                                                                           |
| `ui/vibe-player-timeline.test.tsx`                        | REWRITE  | Adds foreign-pointer interference and mid-drag capability loss, including no resumption after re-enable. Keeps geometry-derived literal seeks, clamping, primary-button rejection and release behavior.                          |
| `ui/vibe-player-tooltip.test.tsx`                         | REWRITE  | Geometry fixture now includes the applied margin, so repeated resize/scroll catches feedback from already-corrected bounds. Keeps independent collision examples, larger-boundary reset, blur and competing-popover suppression. |
| `ui/vibe-player-volume-control.test.tsx`                  | REWRITE  | Retains Escape focus, keyboard clamps/unmute rules and orientation. Names the actual hover/commit-dismiss policy and unmounts before restoring fake timers on every exit path.                                                   |
| `preview/vibe-player-background-layer-lifecycle.test.tsx` | KEEP     | Queued visibility callbacks, dynamic motion policy, host pause, disposal and competing pending play completions distinguish active versus stale playback ownership.                                                              |
| `preview/vibe-player-background-preview.test.tsx`         | REWRITE  | Adds equivalent-source reconstruction during retirement. Keeps decorative media exposure, host pause, frame-ready replacement, same-id asset changes, preservation-key isolation, reduced motion and ambient activation.         |

## Added boundaries

- `ui/vibe-player-volume-pointer.test.tsx`: literal 25% and 75% positions in
  vertical and horizontal sliders; rejects right-click and foreign pointers,
  preserves the original drag and stops after lost capture.
- `ui/vibe-player-quality-control.test.tsx`: opens at the selected option,
  navigates/wraps with arrows and Home/End without committing, then commits once
  with Enter and restores the trigger. Existing click/Escape tests did not cover
  this keyboard selection path.

## Confirmed defects and fixes

1. **Timeline drag ownership:** after pointer 1 started at 25 seconds, pointer 2
   movement emitted an unwanted seek to 90 seconds; pointer 2 release also ended
   the first drag. Capture now belongs to the starting pointer and ends on its
   release/cancel/lost-capture event. Disabling seek clears/relinquishes capture;
   previously a subsequent move emitted 50 seconds despite a disabled slider.
2. **Volume pointer ownership:** right-click emitted a 0.25 volume change. The
   slider now requires the primary button and matching captured pointer, and
   lost capture ends dragging. Both orientations retain their real coordinate
   mapping and normal changes.
3. **Tooltip collision feedback:** after applying -68 px, an unchanged resize
   measured the corrected rectangle and reset the correction to zero, returning
   the tooltip outside its boundary. Collision calculation now removes the
   currently applied margin before deriving the next absolute correction.
   Widening the stage still clears unnecessary correction.
4. **Preview retirement reset:** reconstructing identical source assets halfway
   through the 300 ms retirement canceled retirement and retained the hidden old
   video until a new readiness fallback. Snapshot memoization now depends on
   source identity/assets, preserving readiness for equivalent object instances.
   Existing same-id asset replacement remains covered.

No public props, adapter/core contracts, stylesheet contracts, or persistence
policy changed. Source/config files remain below 280 lines. Preview playback
still uses visibility/motion events and bounded readiness/retirement timers;
there is no recurring animation-frame loop in these owners. Tooltip measurement
uses one cancellable frame per visibility change plus resize/scroll events.

## Verification and limits

Focused behavioral RED before fixes:

```sh
bun run test --project dom src/ui/vibe-player-timeline.test.tsx src/ui/vibe-player-tooltip.test.tsx src/preview/vibe-player-background-preview.test.tsx
bun run test --project dom src/ui/vibe-player-volume-pointer.test.tsx
```

The first run had four assertion failures: foreign seek, disabled seek,
collision reset and retained previous video. The second had two right-button
volume failures, one per orientation. Both passed after the corresponding
implementation fixes; these were behavior failures rather than setup failures.

Final scoped checks:

```sh
bun run test --project dom src/ui src/preview
bunx biome check src/ui src/preview docs/test-quality-audit/ui-preview.md
bunx biome lint src/ui src/preview
git diff --check -- src/ui src/preview docs/test-quality-audit/ui-preview.md
```

The final UI/preview lane passes 26 files and 97 tests. The lead owns root
TypeScript/package checks and built-package Chromium/WebKit acceptance. Browser
follow-up was requested for stable tooltip correction after repeated geometry
events and pointer interactions. Happy-dom does not establish actual layout,
native pointer capture, browser modality, decoding, autoplay permission or
physical keyboard/screen-reader acceptance. Existing browser focus, seek,
thumbnail, responsive controls, preview lifecycle and playback lanes remain
required; no substitute claim is made here.

Tests use only local DOM state, controlled media methods, listeners, promises
and fake time. React Testing Library registers automatic cleanup through Vitest
globals; manually appended openers now have explicit cleanup. Preview
fixtures restore globals/media methods; deferred play results are settled; fake
timers are restored. No server, browser, external service, persistent database,
or GPU resource was started by this workstream.
