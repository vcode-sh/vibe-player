import { inspectMediaDeliveryCors } from "./media-delivery-audit-cors.mjs";
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
import { createMediaDeliveryRollout } from "./media-delivery-audit-rollout.mjs";

export {
  formatMediaDeliveryAuditJson,
  formatMediaDeliveryAuditText,
  printMediaDeliveryAuditReport,
} from "./media-delivery-audit-format.mjs";

const firstSampleSize = 4 * 1024 * 1024;
const tailSampleSize = 4 * 1024 * 1024;

function readBoxType(bytes, offset) {
  return String.fromCharCode(
    bytes[offset + 4] ?? 0,
    bytes[offset + 5] ?? 0,
    bytes[offset + 6] ?? 0,
    bytes[offset + 7] ?? 0
  );
}

function readBoxSize(bytes, offset) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = view.getUint32(offset);
  if (size !== 1) {
    return { headerSize: 8, size };
  }
  if (offset + 16 > bytes.length) {
    return null;
  }
  return { headerSize: 16, size: Number(view.getBigUint64(offset + 8)) };
}

function collectMp4Boxes(bytes) {
  const boxes = [];
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const boxSize = readBoxSize(bytes, offset);
    if (!boxSize || boxSize.size < boxSize.headerSize) {
      break;
    }
    const type = readBoxType(bytes, offset);
    const truncated = offset + boxSize.size > bytes.length;
    boxes.push({ offset, size: boxSize.size, truncated, type });
    if (truncated || boxSize.size === 0) {
      break;
    }
    offset += boxSize.size;
  }
  return boxes;
}

function findAscii(bytes, text) {
  const needle = [...text].map((char) => char.charCodeAt(0));
  for (let index = 0; index <= bytes.length - needle.length; index += 1) {
    let matched = true;
    for (let part = 0; part < needle.length; part += 1) {
      if (bytes[index + part] !== needle[part]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return index;
    }
  }
  return -1;
}

function inspectMp4(firstBytes, tailBytes, tailStart) {
  const boxes = collectMp4Boxes(firstBytes);
  const moovBox = boxes.find((box) => box.type === "moov");
  const mdatBox = boxes.find((box) => box.type === "mdat");
  const tailMoovIndex = findAscii(tailBytes, "moov");
  const tailMoovOffset =
    tailMoovIndex >= 4 ? tailStart + tailMoovIndex - 4 : null;
  const isMp4 = boxes.some((box) => box.type === "ftyp");
  const faststart = Boolean(
    moovBox && (!mdatBox || moovBox.offset < mdatBox.offset)
  );
  return { boxes, faststart, isMp4, mdatBox, moovBox, tailMoovOffset };
}

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

async function collectCorsResults(url, origins, credentialsRequired) {
  const corsResults = [];
  for (const origin of origins) {
    // biome-ignore lint/performance/noAwaitInLoops: Probe origins sequentially to keep one request in flight per audited server.
    const response = await fetchMediaDeliveryRangeSample({
      end: 0,
      origin,
      start: 0,
      url,
    });
    corsResults.push(
      inspectMediaDeliveryCors(response.headers, origin, credentialsRequired)
    );
  }
  return corsResults;
}

export async function createMediaDeliveryAuditReport(input) {
  const credentialsRequired = input.credentials === true;
  const first = await fetchMediaDeliveryRangeSample({
    end: firstSampleSize - 1,
    start: 0,
    url: input.url,
  });
  const contentRange = parseMediaDeliveryContentRange(
    first.headers.get("content-range")
  );
  const contentLength = parseMediaDeliveryContentLength(first.headers);
  const { totalSize, totalSizeKnown } = resolveMediaDeliveryTotalSize(
    contentRange,
    contentLength,
    first.bytes.length
  );
  const rangeOk = first.status === 206 && Boolean(contentRange);
  const tailStart = Math.max(0, totalSize - tailSampleSize);
  const tailBytes =
    rangeOk && totalSizeKnown
      ? (
          await fetchMediaDeliveryRangeSample({
            end: totalSize - 1,
            start: tailStart,
            url: input.url,
          })
        ).bytes
      : new Uint8Array();
  const mp4 = inspectMp4(first.bytes, tailBytes, tailStart);
  const corsResults = await collectCorsResults(
    input.url,
    input.origins,
    credentialsRequired
  );
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
