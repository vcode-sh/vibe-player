# Media Delivery Audit

Use the media audit before wiring large direct-file assets into product
surfaces. It checks byte-range delivery, optional CORS headers, MP4
`moov`/`mdat` ordering, direct-file size limits, and rollout readiness.

## Quick Audit

```bash
bun run media:audit -- https://cdn.example.com/video.mp4 --origin https://app.example.com
```

Treat failed range, faststart, CORS, or direct-file size checks as delivery
issues. They usually need CDN/header changes, remuxing, HLS renditions, or a
different asset pipeline rather than player UI changes.

Packaged installations expose the same checker as:

```bash
vibe-player-media-audit https://cdn.example.com/video.mp4 --origin https://app.example.com
```

For one-off use without adding the package first:

```bash
npx --package vibe-player vibe-player-media-audit https://cdn.example.com/video.mp4 --origin https://app.example.com
```

## CI Mode

For CI or asset ingestion jobs in this repo, use silent JSON mode:

```bash
bun --silent run media:audit -- https://cdn.example.com/video.mp4 --origin https://app.example.com --max-size-mb 500 --json --strict --require-direct-file-ready
```

The JSON payload includes:
- `passed`
- `failures`
- `findings`
- `nextActions`
- `recommendations`
- `resolvedUrl`
- `totalSizeKnown`
- `corsResults`
- `mp4` box offsets
- `maxSizeBytes`
- `rollout.directFileReady`
- `rollout.recommendedDelivery`
- `rollout.summary`

`failures` stays useful for simple gates. `findings` is the stable machine
contract for product automation: each finding includes a code, severity,
summary, remediation text, origin context when relevant, and a `nextAction`.

Range support requires the initial HTTP 206 response to start at the requested
byte zero, as confirmed by `Content-Range`.

## Tail Diagnostics

`mp4.tailMoovOffset` is an informational marker offset. Before adding an
absolute byte position, the audit requires HTTP 206, a `Content-Range` matching
the requested tail start and end, the same total size reported by the initial
response, and enough body bytes to cover that complete range. HTTP 200,
incorrect or missing range headers, changed totals, and truncated bodies leave
the offset `null`.

Invalid tail evidence adds no failure and does not change `rangeOk`, which
describes the initial request. Faststart and rollout readiness continue to use
the initial MP4 box ordering alongside the existing range, CORS and size checks.
A tail marker cannot establish faststart: the tail scan looks for ASCII `moov`,
without validating a complete MP4 box, and matching range totals do not prove
the asset remained unchanged between requests.

## Deadline And Cancellation

Each audit has a total **30,000 ms** network budget. Initial sampling, tail
sampling, sequential origin probes, and response-body reads share that budget.
A CDN that sends headers but stops sending body bytes cannot keep the audit
running indefinitely.

Override the budget with a whole number from 1 through 600,000:

```bash
vibe-player-media-audit https://cdn.example.com/video.mp4 --timeout-ms 60000 --json
```

Timeout aborts the active request, cancels its body reader, and prevents further
probes. It always returns exit code 1, including without `--strict`, and writes
`Media delivery audit timed out after <ms> ms.` to stderr. In `--json` mode,
stdout remains empty on this operational failure, matching other network
failures; a partial report is not a successful audit result.

Programmatic `createMediaDeliveryAuditReport` callers can pass `timeoutMs` and
an optional `signal`. Host cancellation aborts the same request/read pipeline
and preserves the host's abort reason. Successful completion clears the timer
and removes the host abort listener.
Late response bodies are also cancelled when a custom Fetch implementation
ignores the abort signal and resolves after the audit has already failed.

## Rollout Decisions

Use `rollout.directFileReady` for the direct-MP4 decision. Direct file rollout
is ready only when it is `true`.

`rollout.recommendedDelivery` names the next action:
- `direct-file`: direct MP4 is ready for the checked origins.
- `hls-renditions`: publish adaptive HLS/renditions for oversized assets.
- `faststart-remux-or-hls`: remux the MP4 or use HLS.
- `fix-delivery-headers`: fix range or size headers.
- `fix-origin-delivery`: fix unsuccessful HTTP responses for checked origins.
- `fix-cors`: fix requested-origin CORS headers.

Use `--require-direct-file-ready` when CI should fail on the rollout decision
instead of only printing the report.

## CORS And Credentials

Leave source `crossOrigin` unset unless the media host sends matching CORS
headers for every consuming origin.

Each `corsResults` entry includes the origin probe's HTTP `status`. Its `allowed`
field describes CORS header permission only. Non-2xx origin responses emit an
`origin-http-error` finding with `origin` and `status`, and block direct-file
readiness even when their CORS headers allow access.

Add `--credentials` only for sources that will use
`crossOrigin="use-credentials"`. Credentialed media requires:
- exact `Access-Control-Allow-Origin` origin match;
- `Access-Control-Allow-Credentials: true`;
- no wildcard `Access-Control-Allow-Origin`.

## Size And Unknown Length

Use `--max-size-mb` when a product route should reject large direct MP4 assets
and require HLS/renditions instead.

When the CDN cannot return a complete `Content-Length` or `Content-Range`
total, the audit emits `direct-file-size-unknown`. Size-limited CI should treat
that as not ready because sampled bytes are not proof of the full file size.

## Human Output

Human output prints `Resolved URL` when redirects change the audited media
target and includes a one-line rollout summary for review logs. When a finding
has a remediation command or exact header recommendation, it is printed under
`Next actions`.
