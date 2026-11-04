---

name: testing-patterns
description: Write, review, rewrite, or prune Vibe Player tests, and decide when existing protection is sufficient. Use for regressions, fixtures, assertions, test boundaries, and test-quality audits; not for unrelated edits or an unsolicited suite cleanup.
---

# Testing patterns

A test earns its place by protecting a justified contract or deliberate
compatibility baseline, detecting a meaningful failure, and contributing
protection worth its maintenance and execution cost.

Follow [CLAUDE.md](../../../CLAUDE.md) and the task's scope. Before selecting a
lane or fixture, consult [repository guidance](references/repository.md) for
local owners, commands, isolation, examples, and source provenance. This skill
does not authorize production fixes, test deletion, or broader audits.

## Decide what needs protection

For the affected behavior, identify the contract, plausible failure, boundary
that owns it, and additional protection beyond existing tests and static checks.
A small task needs a small decision, not a compulsory plan or whole-suite audit.
**Add no new test when existing protection is adequate.** Keep required project
and task acceptance gates; tests at different levels can be complementary.
- Derive expectations from accepted requirements, package/protocol contracts,
  independently checked examples, domain properties, or a reviewed reference.
  Reading implementation is useful, but current output is fallible evidence of
  intent. If an essential requirement is unknown, report it rather than inventing
  an oracle or weakening an assertion to match the code.
- Do not compute the expected answer with the calculation being tested. Sharing
  setup builders or unrelated utilities is legitimate when it does not share the
  fault under examination.
- A reviewed golden file, snapshot, or recorded legacy output can deliberately
  protect compatibility during a refactor. Label and review that baseline; it
  does not establish business correctness. Do not update it merely to get green.

## Exercise the failure mechanism

- Execute the actual behavior owner, not a copied implementation in the test.
  A helper test does not establish that its consumer calls or enforces it.
  Choose the narrowest boundary that preserves the risk. Use a real engine,
  browser, device, or stateful dependency when its semantics are the claim.
- Keep other dependencies controllable. Mocks, fakes, private-unit tests, and
  white-box checks are not categorically wrong. Meaningful request payloads,
  cancellation, duplicate-call limits, and prohibited effects can be contracts.
  Do not replace the behavior you claim to prove with its configured mock answer.
- Select reachable inputs that distinguish plausible mistakes: exact thresholds,
  relevant state/role partitions, asymmetric values, or old work completing after
  new work. Include valid behavior when it rejects always-deny/no-op solutions.
  Do not enumerate speculative cases or demand every technique for every rule.
- Assert promised outputs and relevant effects: state, events, errors, requests,
  user observations, or prohibited actions. A denial must reach the decision and
  show the relevant absence of effects, not fail because the fixture is invalid.
  One coherent behavior can need several assertions; avoid freezing unrelated
  fields and internal call sequences.
- Presence, smoke, type, source, and architecture checks can protect explicit
  interface, startup, artifact, or dependency policies. State their limited
  assurance; a source string does not prove runtime behavior. Never decide test
  value by matcher syntax alone.
- For properties, review the input domain, generator, preconditions, and filters
  alongside the property. Avoid vacuous assertions and preserve replay inputs.
  Round trips can share cancelling faults; differential agreement depends on the
  reference. Add independent examples when another dimension needs protection.

## Establish proportionate sensitivity

For a confirmed bug or invariant, prefer a focused regression that fails before
the fix when a stable, economical RED is available. Inspect the failure reason:
missing imports, compilation errors, or broken setup are not behavioral RED.
Do not manufacture RED for documentation or a behavior-preserving refactor.

Ask whether a plausible no-op, wrong branch, stale result, or missing cleanup
would pass. If sensitivity remains uncertain for an important assertion, use a
targeted fault probe in a disposable copy. Verify reachability and that a
contract-violating effect triggers the assertion. Restore only owned changes
and verify restoration; never probe production or overwrite concurrent work.

A surviving mutant can be equivalent, irrelevant, unreachable, or evidence of
weak protection. A killed mutant does not validate the oracle. Broad mutation
campaigns need justified scope and cost. Coverage and mutation scores are
diagnostics, not correctness certificates or universal quotas. Honor existing
thresholds without gaming counts, exclusions, assertions, or gates.

## Keep results reliable

- Await asynchronous work and eventual assertions. Use bounded observable waits;
  coordinate races with barriers or controlled completion, not arbitrary sleeps
  or merely starting two promises. Control unrelated time, randomness, and state.
- Investigate intermittent failures before blaming tests. Do not rerun until
  green as a substitute for diagnosis. A quarantine needs a visible reason,
  owner, resolution path, and retained risk in the report.
- Use test-owned state. Release owned processes, files, listeners, timers,
  connections, and environments after success, failure, cancellation, or timeout.
  Verify cleanup while preserving shared services and other sessions.
- Run applicable checks on the final tree. Reuse still-valid evidence and rerun
  only lanes whose files or assumptions changed. Required browser/surface
  acceptance remains required even when focused tests pass.

## Review and prune within the authorized scope

Inspect the test, its callers, fixtures, and relevant contract before deciding:

| Decision       | Reason                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **KEEP**       | Useful contract, reviewed baseline, or distinct boundary at acceptable cost.                                                                                                   |
| **REWRITE**    | Real risk, but inadequate oracle, inputs, assertions, boundary, or reliability.                                                                                                |
| **DELETE**     | Obsolete/no useful role, or remaining tests provide the same relevant protection at an appropriate boundary. Check callers, fixtures, registrations, and required gates first. |
| **UNRESOLVED** | Evidence is insufficient. Retain the test and identify what would settle the decision.                                                                                         |

Equal line coverage or killed mutants does not prove equivalent future
protection. Do not retain weak tests for counts, delete useful ones for a
reduction target, or mechanically rewrite strong tests. For an authorized
whole-suite audit, inspect all in-scope files and separate acceptance lanes;
grep matches are only leads, not completed review.

Report the protected contract/baseline, meaningful failure caught, additional
role, verified boundary, actual checks, limitations, and cleanup as relevant.
A short justification suffices, not mandatory per-test boilerplate. In test-only
work, report exposed product defects without silently changing production or
weakening expectations.
