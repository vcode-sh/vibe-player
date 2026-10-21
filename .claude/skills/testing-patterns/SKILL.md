---

name: testing-patterns
description: Write, review, rewrite, or delete Vibe Player tests using independently derived behavior contracts and discriminating challenge cases. Use for regressions, fixtures, assertions, test-layer selection, and test-quality audits in this repository.
---

# Testing patterns

A challenge test fails when a requirement is broken. A confirmation test copies
the implementation's assumptions and merely detects edits. Keep the former;
replace or delete the latter. Passing counts and coverage percentages are not
evidence that behavior is correct.

Read [CLAUDE.md](../../../CLAUDE.md) and the affected behavior's immediate
consumer. Repository rules own scope and verification; this skill owns test
quality. Adapted from WUN and Spreadoo, with Vibe Player's actual lanes and
provider boundaries. Do not import those applications' infrastructure rules.

## Establish an independent expectation

Each retained case must identify a requirement, a plausible defect, and an
observable result that distinguishes correct behavior from that defect.
- Use the user's requirement, documented package contract, external protocol,
  or hand-checked example. Existing output alone is not a specification.
- Derive expected values before consulting implementation output. Do not reuse
  the production helper, constant, or a copied algorithm as the oracle.
- Keep fixtures small and asymmetric: distinct sources, times, qualities, or
  payloads make a stale result or wrong branch observable.
- Preserve a valid case when it discriminates against always rejecting,
  disabling, or returning nothing. Challenge does not mean only invalid input.
- Use reachable invalid input at real untyped boundaries: media events, network
  responses, storage, captions, CLI arguments, and provider callbacks. Do not
  invent impossible typed states just to exercise defensive branches.
- Label compatibility characterization honestly; do not call it independent
  correctness evidence. Review snapshot meaning before updating snapshots.

For example, WebVTT's end time is exclusive. For a cue spanning 1 to 2 seconds,
check 1, 1.999, and 2 against literal expected text/absence. A parser round-trip
alone could preserve the same timestamp defect in both directions.

## Test the owner, keep its behavior real

| Contract                                                        | Owner and evidence                                                                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Controller transitions, stale loads, commands, subscriptions    | Real `core` controller with a controllable adapter boundary; assert state/events and forbidden side effects                                |
| Time, volume, quality, resume, shortcut rules                   | Real pure functions or store with explicit inputs and independent expected results                                                         |
| File, HLS, YouTube translation and lifecycle                    | Real adapter; substitute only browser media/provider SDK boundary; emit provider events and inspect normalized results                     |
| WebVTT parsing and cue selection                                | Real parser/selector with hand-authored valid, malformed, overlapping, and boundary fixtures                                               |
| React subscription, cleanup, stale responses                    | Real hooks/controller with controlled external completion and rerenders/unmounts                                                           |
| Controls, captions, modal, keyboard, accessibility              | Real component and owner logic; interact through roles, names, keyboard, and pointer events                                                |
| Geometry, focus in actual browsers, rendering, playback, motion | Browser evidence against the relevant demo; DOM emulation cannot prove these                                                               |
| Media audit HTTP/CORS/ranges and CLI results                    | Real audit logic with controlled Fetch responses or disposable loopback HTTP; assert findings/output, not only fetch calls                 |
| Package/release guard decisions                                 | Real rule functions with independently constructed valid/invalid manifests or tarball entries; built package gates verify actual artifacts |

One owner per rule: a UI test owns the interaction or presentation of an error,
not a duplicate of the parser or controller algorithm. Keep package/provider
boundaries intact. Do not expose production APIs just for tests.

Mock calls can be meaningful protocol evidence: seek position, credential
policy, provider unsubscribe, cancellation, and prohibited requests. A call
count with no contract or observable consequence is not sufficient.

Browser/provider doubles do not prove real autoplay policy, decoding, adaptive
streaming, compositor animation, native fullscreen/PiP, or focus geometry.
Report those limits. Do not claim live-provider acceptance from happy-dom.

## Choose discriminating cases

- Put cases on both sides of meaningful thresholds, including the exact edge.
- Where a rule requires A and B, include reachable inputs where they disagree.
- For lifecycle risk, complete old work after a new source, detach, or unmount;
  assert it cannot replace current output or emit stale events.
- For cleanup, trigger the former callback/event after disposal and prove the
  effect is absent. Checking `removeEventListener` alone is usually weaker.
- For timers, advance to just before and at the deadline; verify cancellation
  and restart only where the contract needs them.
- Assert precise errors/findings and required or forbidden side effects. A
  generic rejection may pass because the fixture itself is broken.
- For ordering, bounds, and normalization, use hand-checked edge tables and
  invariants. No property-testing dependency is currently configured; do not
  add one merely for an audit.
- Prefer one behavior per case. Related assertions may show a transition or
  distinguish both always-accept and always-reject defects.
- Await completion or observable outcomes; do not use arbitrary sleeps.

## Remove tests that do not earn their place

Inspect meaning before deleting; assertion signatures are only leads.
- Delete constant mirrors, static token/config snapshots, source-text checks
  masquerading as runtime tests, empty renders, and type-system restatements.
- Delete orphaned or duplicate cases only after identifying where their unique
  protection lives. Do not delete an incident regression because it is green.
- Replace `toBeDefined`, `toBeTruthy`, bare `not.toThrow`, or unqualified mock
  calls when a precise result is available. Presence/absence is valid when it
  is the actual accessibility or lifecycle contract.
- Avoid class names, child order, private attributes, and stubbed component
  trees as proxies for interaction or layout.
- Explicit package architecture and publish-policy checks belong in existing
  guard scripts. Their rule tests may exercise real structural contracts;
  do not delete those solely because their input is a file name or manifest.
- Do not mechanically rewrite a strong test. Retain its independent protection
  and record why it qualifies when performing a whole-suite audit.

## Prove sensitivity without damaging shared work

Ask whether a no-op, default result, wrong branch, stale completion, or missing
cleanup would pass. Tighten the fixture/assertion if it would.

For an economical bug regression, establish a focused RED for the actual defect
before fixing it. Existing correct behavior may pass immediately; never remove
working code just to manufacture a TDD history.

For subtle existing behavior, use a targeted mutation probe if reading cannot
settle sensitivity. Prefer a disposable copy. Never mutate shared production
files while another agent, test lane, or dev server uses them. Restore exactly
the pre-probe bytes and verify restoration; a failing unrelated test is not a
successful probe. Broad mutation infrastructure is not required.

For test-only assignments, preserve production behavior. Report a newly exposed
implementation defect with its evidence; do not weaken expectations to get green
or silently broaden the task into a product rewrite.

## Repository mechanics

- Vitest is the runner; Bun runs scripts. Never use `bun test` here.
- `src/**/*.test.ts(x)` runs in the `dom` project with happy-dom and
  `test/setup.ts` loading jest-dom. `scripts/**/*.test.mjs` runs in `node`.
- Import Vitest APIs explicitly. Use Testing Library for React interaction;
  use `act` from `@testing-library/react` for state updates and fake clocks.
- Restore mocks, globals, fake timers, provider listeners, storage, mounted
  trees, and disposable servers. Deferred promises must be settled or cancelled.
- Keep existing test helpers focused on fixtures/provider boundaries. Do not
  put expected business behavior in helpers that the implementation also uses.
- Source/config hard limits and coding rules apply to test files too. Split
  by real behavior ownership, not arbitrary numbered batches.
- No production network, credentials, persistent browser data, or live CDN is
  required by unit tests. Network acceptance must have an explicit safe target.

```bash
# Focused behavior or file (verify that the intended cases actually ran).
bun run test --project dom src/core/vibe-player-controller.test.ts
bun run test --project node scripts/media-delivery-audit-range.test.mjs
bun run test src/react/use-vibe-player-captions-lifecycle.test.tsx -t 'superseded'

# Broad test-suite changes: run once on the final tree.
bun run check
bun run lint
bun run package:rules
bun run check-types
bun run test
```

Use scoped checks for bounded edits. Run package/build/browser gates when their
boundary changed or acceptance explicitly requires them; a test-only audit does
not automatically require a release or live-provider test. Reuse successful
evidence until its files, assumptions, or environment change.

## Whole-suite audit and report

Discover tests, runner includes/excludes, helpers, and any separate acceptance
scripts. Inspect every test file, its owner, and the relevant contract. Record
keep/rewrite/delete decisions with the protection retained or removed. A grep
for weak matchers is not a completed audit.

Use parallel agents for independent owners when useful; centralize integration
and final checks. Preserve unrelated WIP and do not restore files from HEAD.

For added/rewritten tests, name the defect caught and the lane that ran them.
For deletions, explain the absent or duplicate protection. A concise audit
document can carry per-file details instead of flooding the chat. Report actual
counts, failures, skipped checks, and browser/provider limitations honestly.
