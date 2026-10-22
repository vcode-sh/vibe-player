import { inspectMediaDeliveryCors } from "./media-delivery-audit-cors.mjs";
import { withMediaDeliveryAuditDeadline } from "./media-delivery-audit-deadline.mjs";
import {
  fetchMediaDeliveryRangeSample,
  parseMediaDeliveryContentLength,
  parseMediaDeliveryContentRange,
} from "./media-delivery-audit-fetch.mjs";
import {
  collectMediaDeliveryFailures,
  collectMediaDeliveryNextActions,
  collectMediaDeliveryRecommendations,
  createMediaDeliveryFindings,
} from "./media-delivery-audit-findings.mjs";
import { inspectMediaDeliveryMp4 } from "./media-delivery-audit-mp4.mjs";
import { createMediaDeliveryRollout } from "./media-delivery-audit-rollout.mjs";

export {
  formatMediaDeliveryAuditJson,
  formatMediaDeliveryAuditText,
  printMediaDeliveryAuditReport,
} from "./media-delivery-audit-format.mjs";

const firstSampleSize = 4 * 1024 * 1024;
const tailSampleSize = 4 * 1024 * 1024;

function resolveMediaDeliveryTotalSize(
  contentRange,
  contentLength,
  sampleSize
) {
  if (contentRange) {
    return {
      totalSize: contentRange.total ?? sampleSize,
      totalSizeKnown: contentRange.total !== null,
    };
  }
  if (contentLength !== null) {
    return { totalSize: contentLength, totalSizeKnown: true };
  }
  return { totalSize: sampleSize, totalSizeKnown: false };
}

async function collectCorsResults(url, origins, credentialsRequired, signal) {
  const corsResults = [];
  for (const origin of origins) {
    // biome-ignore lint/performance/noAwaitInLoops: Probe origins sequentially to keep one request in flight per audited server.
    const response = await fetchMediaDeliveryRangeSample({
      end: 0,
      origin,
      signal,
      start: 0,
      url,
    });
    corsResults.push({
      ...inspectMediaDeliveryCors(
        response.headers,
        origin,
        credentialsRequired
      ),
      status: response.status,
    });
  }
  return corsResults;
}

export function createMediaDeliveryAuditReport(input) {
  return withMediaDeliveryAuditDeadline(input, (signal) =>
    collectMediaDeliveryAuditReport({ ...input, signal })
  );
}

async function fetchValidatedTailBytes(input, start, totalSize) {
  const response = await fetchMediaDeliveryRangeSample({
    end: totalSize - 1,
    signal: input.signal,
    start,
    url: input.url,
  });
  const range = parseMediaDeliveryContentRange(
    response.headers.get("content-range")
  );
  const valid =
    response.status === 206 &&
    range?.start === start &&
    range.end === totalSize - 1 &&
    range.total === totalSize &&
    response.bytes.length === totalSize - start;
  return valid ? response.bytes : new Uint8Array();
}

async function collectMediaDeliveryAuditReport(input) {
  const credentialsRequired = input.credentials === true;
  const first = await fetchMediaDeliveryRangeSample({
    end: firstSampleSize - 1,
    signal: input.signal,
    start: 0,
    url: input.url,
  });
  const contentRange = parseMediaDeliveryContentRange(
    first.headers.get("content-range")
  );
  const contentLength = parseMediaDeliveryContentLength(first.headers);
  // A 206 Content-Length describes the partial body, not the complete asset.
  const { totalSize, totalSizeKnown } = resolveMediaDeliveryTotalSize(
    contentRange,
    first.status === 206 ? null : contentLength,
    first.bytes.length
  );
  const rangeOk = first.status === 206 && contentRange?.start === 0;
  const tailStart = Math.max(0, totalSize - tailSampleSize);
  const tailBytes =
    rangeOk && totalSizeKnown
      ? await fetchValidatedTailBytes(input, tailStart, totalSize)
      : new Uint8Array();
  const mp4 = inspectMediaDeliveryMp4(first.bytes, tailBytes, tailStart);
  const corsResults = await collectCorsResults(
    input.url,
    input.origins,
    credentialsRequired,
    input.signal
  );
  return createMediaDeliveryReport(input, {
    corsResults,
    credentialsRequired,
    first,
    mp4,
    rangeOk,
    totalSize,
    totalSizeKnown,
  });
}

function createMediaDeliveryReport(input, evidence) {
  const {
    corsResults,
    credentialsRequired,
    first,
    mp4,
    rangeOk,
    totalSize,
    totalSizeKnown,
  } = evidence;
  const maxSizeBytes = input.maxSizeBytes ?? null;
  const findings = createMediaDeliveryFindings({
    corsResults,
    maxSizeBytes,
    mp4,
    rangeOk,
    totalSize,
    totalSizeKnown,
  });
  const rollout = createMediaDeliveryRollout(findings);
  const failures = collectMediaDeliveryFailures(findings);
  const nextActions = collectMediaDeliveryNextActions(findings);
  const recommendations = collectMediaDeliveryRecommendations(findings);
  return {
    corsResults,
    credentialsRequired,
    failures,
    findings,
    maxSizeBytes,
    mp4,
    nextActions,
    rangeOk,
    recommendations,
    resolvedUrl: first.resolvedUrl,
    rollout,
    status: first.status,
    totalSize,
    totalSizeKnown,
    url: input.url,
  };
}
