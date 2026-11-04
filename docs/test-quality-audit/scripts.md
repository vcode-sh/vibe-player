# Script test quality audit

Scope: all 23 `scripts/*.test.mjs` files, their implementation owners, shared
fixtures, CLI and package-guard callers, and relevant release/media-delivery
contracts. Applied the current repository `testing-patterns` skill and its
repository reference. Source/configuration ownership remained within `scripts/`.

## Result

- 20 files KEEP, 3 files REWRITE, no DELETE or UNRESOLVED decisions.
- Confirmed and fixed one media-audit correctness defect: the initial response
  could claim successful byte-range delivery when its body did not match its
  declared interval or the interval exceeded the requested prefix.
- Added four initial-range evidence cases and two consumer-setup failure cleanup
  cases. Script lane: 23 files, 136 tests passing; baseline: 23 files, 130 tests.
- Reduced repeated detailed findings/action assertions in the core integration
  test. Dedicated findings tests retain their independent literal contract;
  the core test retains selected findings, origin mapping, recommendations,
  actions, rollout, and JSON serialization checks.

## Per-file decisions

| File                                              | Decision | Contract, meaningful failure, and boundary                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `media-delivery-audit-args.test.mjs`              | KEEP     | Real argument parser: options remain independent, repeated origins and binary size conversion survive, malformed shapes fail before the runner invokes networking. Literal expected option object is independent of parser logic.                                                                           |
| `media-delivery-audit-timeout-args.test.mjs`      | KEEP     | Real deadline parser through CLI parsing: accepts inclusive limits 1 and 600000 and rejects out-of-range, fractional, exponential, negative, nonfinite and missing input. Complements transport deadlines.                                                                                                  |
| `media-delivery-audit-core.test.mjs`              | REWRITE  | Real report orchestration with controlled Fetch responses: initial/tail requests, non-faststart detection, origin-specific CORS, rollout and JSON mappings. Removed duplicate full finding/action objects already asserted in findings tests; retained the integration wiring and literal selected outputs. |
| `media-delivery-audit-range.test.mjs`             | REWRITE  | Real report must reject wrong starting offsets and ignored ranges, without probing a tail. Added truncated, empty, overlong and out-of-request initial response evidence; these previously passed. Existing valid report tests reject an always-failing repair.                                             |
| `media-delivery-audit-tail-range.test.mjs`        | KEEP     | Real report accepts only complete matching HTTP 206 tail evidence. Status, start/end, total size, missing header and truncated body are separate plausible faults. Also preserves independent initial faststart evidence when optional tail evidence fails.                                                 |
| `media-delivery-audit-unknown-size.test.mjs`      | KEEP     | Real report distinguishes partial Content-Length from total asset length, rejects invalid range totals and blocks configured size limits without proof. The unknown-total case deliberately accepts valid range delivery while rejecting size readiness.                                                    |
| `media-delivery-audit-size.test.mjs`              | KEEP     | Real report and serialized result expose the configured binary-byte threshold, with exact-boundary acceptance and next-byte rejection. Protects the report consumer, beyond the lower-level package-size budget tests.                                                                                      |
| `media-delivery-audit-credentialed-cors.test.mjs` | KEEP     | Real report enforces explicit matching origin plus lowercase `true` credentials permission; wildcard, wrong origin and absent/false credentials distinguish conjunction faults. Anonymous wildcard success prevents blanket rejection.                                                                      |
| `media-delivery-audit-origin-status.test.mjs`     | KEEP     | Real report blocks 302/403/500 origin responses despite valid CORS; 200/206 remain accepted. Header permission alone must not establish successful delivery.                                                                                                                                                |
| `media-delivery-audit-fetch.test.mjs`             | KEEP     | Real Fetch wrapper and parsers: bounded prefix reads cancel the body, request Range/redirect policy is correct, resolved URL propagates, unsafe/impossible length/range values fail. Expected bytes and large integer examples are literal.                                                                 |
| `media-delivery-audit-deadline.test.mjs`          | KEEP     | Real deadline/report owner under controlled time: exact deadline, stalled reads, cumulative multi-request budget, success before timeout and cleared timer. Does not claim real socket cleanup.                                                                                                             |
| `media-delivery-audit-cancellation.test.mjs`      | KEEP     | Real report/runner preserves host cancellation and timeout errors, prevents pre-aborted network work, emits no successful JSON on timeout and cancels late bodies returned by a Fetch implementation that ignores abort.                                                                                    |
| `media-delivery-audit-deadline-http.test.mjs`     | KEEP     | Real native Fetch against disposable loopback HTTP: stalled headers/body requests close after deadline; request receipt and response closure provide explicit barriers. This transport boundary is distinct from mocked deadline tests.                                                                     |
| `media-delivery-audit-findings.test.mjs`          | KEEP     | Actual findings owner maps protocol facts into stable error codes, legacy messages, recommendations and actionable commands/headers. Literal expected output protects deliberate CLI compatibility; healthy inputs prevent always-error behavior.                                                           |
| `media-delivery-audit-format.test.mjs`            | KEEP     | Actual text formatter distinguishes healthy/failure output, shows remediation, limits box summaries, renders known/unknown sizes accurately and shows redirect targets when changed. Presentation checks are appropriate for this textual CLI contract.                                                     |
| `media-delivery-audit-rollout.test.mjs`           | KEEP     | Actual rollout policy prioritizes HLS for oversize media and delivery-header repairs before format advice. Multiple competing findings expose wrong precedence; clean reports remain ready. Other report tests exercise specific CORS/origin/size recommendations.                                          |
| `media-delivery-audit-runner.test.mjs`            | KEEP     | Actual parser/runner with injected report boundary proves argument forwarding, strict/readiness exit policy, parseable output, successful gates, help/no network and stderr-only network errors. Report correctness belongs to report tests.                                                                |
| `package-boundary-rules.test.mjs`                 | KEEP     | Actual TypeScript parser/rule owner rejects layer/provider/application imports while allowing composition and tests. Comment/string decoys, import forms and permitted cases protect against both missed and spurious architecture diagnostics.                                                             |
| `package-size-rules.test.mjs`                     | KEEP     | Actual encoding/compression/budget helpers: multibyte input catches character-count errors, empty gzip has an independent known size, and exact-limit/next-byte cases protect budget comparison and failure selection.                                                                                      |
| `package-tarball-rules.test.mjs`                  | KEEP     | Actual archive parser/guard: independent consumer-artifact inventory, accepted complete archive, missing CSS and leaked workspace file. This deliberate release-policy fixture complements the actual package archive gate.                                                                                 |
| `public-surface-rules.test.mjs`                   | KEEP     | Actual TypeScript export analysis and runtime-name comparison distinguish private/comment declarations, aliases, similar names, accidental exports and type-erased runtime values. Built surface inspection remains a separate gate.                                                                        |
| `release-state-rules.test.mjs`                    | KEEP     | Actual release guard checks deliberate package identity/license/metadata, ESM exports, CSS side effects, Node CLI entry and publishing posture. Isolated changes assert specific diagnostics, including public success, rather than invalidating everything at once.                                        |
| `packed-consumer-setup.test.mjs`                  | REWRITE  | Actual setup owner writes a real temporary consumer manifest; npm remains mocked. Preserve npm 11/12 output compatibility, now verify required pack/install commands, React override and cleanup on either command failure. Real archive installation remains the separate consumer gate.                   |

## Confirmed defect and regression evidence

`media-delivery-audit-core.mjs` previously defined initial `rangeOk` as HTTP 206
with a Content-Range starting at zero. A body containing 16 bytes and a declaration
of `bytes 0-79/80` could therefore be reported ready. Empty bodies, bytes beyond
the declared interval and a declared interval beyond the requested 4 MiB prefix
were also accepted.

The focused regression run failed all four new cases with `expected true to be
false` at `report.rangeOk`; the two existing cases passed. The repair requires
the declared interval to fit the request and the captured prefix length to
match its declared ending byte. It retains the existing fields, error codes,
request budget, size semantics and treatment of optional tail evidence. The
range/core/unknown-size/tail selection then passed all 24 cases.

This checks the returned prefix and its declared interval. It does not claim
full asset validation beyond the deliberately bounded read or verify decoding.

## Sensitivity checks and final verification

Two targeted fault probes ran in a disposable copied script tree, never in the
shared checkout:
- Removing `npm install` produced assertion failures in both npm-output cases
  and the install-failure case.
- Removing setup failure cleanup produced assertion failures in both failure
  cases because the temporary directory remained accessible.

Both probes reached the intended owner and failed behavior assertions, not setup
or import errors. The copied tree was removed; the test teardown removed each
owned consumer directory even for those intentionally failing assertions.

Final checks after the last script edit:
- `bun run test --project node`: 23 files / 136 tests passed.
- `bunx biome check scripts`: 55 files passed, no changes.
- `bunx biome lint scripts`: 55 files passed, no changes.
- `git diff --check -- scripts`: passed.

The loopback tests retain `closeAllConnections()` plus awaited `server.close()`
teardown; fake timer suites restore real timers, Fetch replacements are restored,
and setup tests remove their recorded temporary directory in `afterEach`.
No live remote media audits, npm installations, release operations, dependency
changes, commits or pushes were performed by this workstream. The lead owns
repository typecheck, full CI/build, actual archive/consumer and browser gates.

These unit checks do not prove package playback, physical browser/device
acceptance, live CDN behavior, or registry-install compatibility. MP4 tail
inspection retains its documented ASCII-marker limitation; this audit did not
silently reinterpret that diagnostic as full MP4 validation.

## Integration follow-up

The initial fix missed an overlong 206 body at exactly the 4 MiB sample cap:
truncating the read hid its extra byte. A fifth parameterized range regression
failed with `rangeOk: true` for 4,194,305 bytes declared as `0-4194303/4194304`.
The lead now reads at most one extra byte for 206 evidence, while retaining the
200-response prefix cap. The five affected transport/range/deadline files pass
36 tests, including real request cleanup. Public report fields remain unchanged.
