# Skill validation evidence

Validated on 2026-11-04 in the Linux checkout. This is a bounded smoke evaluation,
not a benchmark, exhaustive trigger study, or claim of improved performance.

## Discovery and packaging

- Canonical body: `.claude/skills/testing-patterns/SKILL.md`.
- Git records `.agents/skills/testing-patterns` as mode `120000`, targeting
  `../../.claude/skills/testing-patterns`. Filesystem resolution reaches the same
  directory. No plugin wrapper or duplicate body was added.
- `AGENTS.md` and `CLAUDE.md` are distinct regular files. Existing routing in
  `CLAUDE.md` and its coding-standards reference was sufficient; neither changed.
- `codex --version`: `codex-cli 0.166.0`. A fresh local app-server `skills/list`
  request with `forceReload: true` returned one enabled repository-scoped
  `testing-patterns`, the revised description, canonical path, and no errors.
- `claude --version`: `2.1.318 (Claude Code)`. The Claude provider evaluation
  selected `testing-patterns` from its available skills and invoked the native
  `Skill` tool. The recorded tool result was `success: true` with
  `commandName: testing-patterns`; it then read the repository reference.
- Codex selected the skill from its catalog and existing routing, then read the
  current body/reference through `.agents/skills`. The trials named the task,
  not the skill; Claude was asked to use its native Skill tool when applicable.
- Explicit invocation syntax is `$testing-patterns` in Codex and
  `/testing-patterns` in Claude Code, per the official documentation linked in
  [repository.md](repository.md). Interactive menus and literal typed slash/
  dollar invocations were not separately automated. Discovery and native skill
  use were exercised, not inferred from YAML alone.

## Behavioral trials

Each client received its own disposable fixture folder inside this repository,
with copied production modules, a local Vitest config, existing dependency
access, small tests, and raw task requirements. Evaluator expectations remained
outside those task folders. The agents were forbidden to change implementation
modules, copy main-repository tests, install dependencies, or access anything
beyond test-owned loopback HTTP. No real repository test was repaired or deleted.

| Raw task                                                                                                                                                | Observed Codex result                                                                                                                              | Observed Claude result                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing caption exactly at cue start; accepted interval is start-inclusive/end-exclusive. Strengthen regression evidence without fixing implementation. | Replaced interior-only coverage with literal adjacent-cue boundary cases. Two assertions failed at cue starts with `[]`; three other cases passed. | Added a literal boundary regression beside the existing interior case. It failed at the cue start with `[]`; the interior case passed.                                      |
| Audit acceptance now includes releasing an actual stalled HTTP request. Existing tests replace Fetch.                                                   | Kept all five mocked deadline cases; added native-Fetch loopback evidence of timeout and socket closure before teardown. Six tests passed.         | Kept the five existing cases; added real stalled-header and stalled-body cases. Both passed. Disposable fault probes showed missing abort/reader cancellation was detected. |
| Correct a documentation typo; a hand-reviewed JSON golden protects compatibility before a future internal refactor.                                     | Corrected typo, retained golden and test byte-for-byte, added no runtime test for documentation; baseline passed.                                  | Same decision; baseline passed in its fixture run.                                                                                                                          |

The caption module was deliberately seeded with `>` in place of `>=` only in
these disposable fixtures. The failures were assertion mismatches, not setup
failures. Independently running each generated test against a second copy of the
unchanged correct repository module passed: Codex 5/5, Claude 2/2. This confirms
both rejection of the seeded defect and acceptance of the justified behavior.

Codex used focused `bun run test --configLoader runner --no-cache
--no-fsModuleCache <files>` commands. Claude's fixture run had one intended
caption failure and nine passing tests. Its first HTTP probe removed the Fetch
signal: the stalled-header case failed while body cancellation still worked.
Removing both signal and reader cancellation made both HTTP cases fail. These
are narrow sensitivity observations, not a mutation score or correctness proof.

Review found a qualification: Claude's successful HTTP fixture left the losing
one-second `Promise.race` watchdog timers pending until runtime exit. The
repository reference now explicitly calls for clearing watchdogs in `finally`.
That wording refinement was statically checked, not evaluated in a fresh model
run. Codex used bounded assertion polling and registered server cleanup. These
trials demonstrate useful decisions, not flawless generated-test quality.

## Local checks actually executed

- Skill creator's `quick_validate.py` against both discovery paths: passed.
- Python/YAML checks: only portable `name`/`description`, matching folder name,
  relative link resolution through both paths, canonical-directory identity,
  distinct root instruction files, and research source digests: passed.
- Scoped `bunx biome check` and `bunx biome lint` on the changed Markdown:
  passed after formatting. The first check exposed formatting differences and
  verified that this installed Biome supports Markdown; guidance was corrected.
- `git diff --check` and final readback/diff inspection: passed.
- `bun run test --project dom src/captions/parse-webvtt.test.ts
  src/react/use-vibe-player-captions-lifecycle.test.tsx`: 2 files, 9 tests passed.
- `bun run test --project node scripts/media-delivery-audit-deadline-http.test.mjs
  scripts/package-boundary-rules.test.mjs`: 2 files, 8 tests passed.
- Scoped Biome check/lint on `src/captions/parse-webvtt.test.ts`: passed, unchanged.
- Fixture implementation modules, existing deadline tests, and reviewed baseline
  readback matched their starting bytes after both trials.

## Cleanup and limits

The app-server discovery process exited. Test processes and loopback servers
exited; owned probe copies and the evaluation directory were removed. Shared
services were not stopped. No production files, repository tests, dependencies,
CI settings, global skill installations, commits, or publications changed.

Browser, live YouTube, native accessibility, package build/consumer, full CI and
release lanes were inspected as contracts, not executed for this instruction-only
change. Windows/macOS checkout behavior, interactive client menus, negative
trigger specificity, and other models were not evaluated. No without-skill
control was run, so no comparative efficacy claim follows from these examples.
