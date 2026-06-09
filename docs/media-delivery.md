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

## Rollout Decisions

Use `rollout.directFileReady` for the direct-MP4 decision. Direct file rollout
is ready only when it is `true`.

`rollout.recommendedDelivery` names the next action:

- `direct-file`: direct MP4 is ready for the checked origins.
- `hls-renditions`: publish adaptive HLS/renditions for oversized assets.
- `faststart-remux-or-hls`: remux the MP4 or use HLS.
- `fix-delivery-headers`: fix range or size headers.
- `fix-cors`: fix requested-origin CORS headers.

Use `--require-direct-file-ready` when CI should fail on the rollout decision
instead of only printing the report.

## CORS And Credentials

Leave source `crossOrigin` unset unless the media host sends matching CORS
headers for every consuming origin.

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
