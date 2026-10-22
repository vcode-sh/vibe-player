import { awaitMediaDeliveryOperation } from "./media-delivery-audit-deadline.mjs";

const contentLengthPattern = /^\d+$/;
const contentRangePattern = /^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i;

export async function fetchMediaDeliveryRangeSample({
  end,
  origin,
  signal,
  start,
  url,
}) {
  const headers = new Headers();
  headers.set("Range", `bytes=${start}-${end}`);
  if (origin) {
    headers.set("Origin", origin);
  }
  signal?.throwIfAborted();
  const response = await fetchResponse(url, headers, signal);
  const limit = Math.max(0, end - start + 1);
  const bytes = await readResponsePrefix(response, limit, signal);
  return {
    bytes,
    headers: response.headers,
    resolvedUrl: response.url || url,
    status: response.status,
  };
}

async function fetchResponse(url, headers, signal) {
  const pending = Promise.resolve(
    fetch(url, { headers, redirect: "follow", signal })
  );
  try {
    return await awaitMediaDeliveryOperation(pending, signal);
  } catch (error) {
    // Custom Fetch implementations may return a live body after cancellation.
    pending
      .then((response) => {
        if (signal?.aborted) {
          return response.body?.cancel(signal.reason);
        }
      })
      .catch(() => undefined);
    throw error;
  }
}

export function parseMediaDeliveryContentLength(headers) {
  const value = headers.get("content-length");
  if (!(value && contentLengthPattern.test(value))) {
    return null;
  }
  const length = Number(value);
  return Number.isSafeInteger(length) ? length : null;
}

export function parseMediaDeliveryContentRange(value) {
  const match = value?.match(contentRangePattern);
  if (!match) {
    return null;
  }
  const total = match[3] === "*" ? null : Number(match[3]);
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (
    !(Number.isSafeInteger(start) && Number.isSafeInteger(end)) ||
    start > end ||
    (total !== null && (!Number.isSafeInteger(total) || end >= total))
  ) {
    return null;
  }
  return { end, start, total };
}

async function readResponsePrefix(response, limit, signal) {
  if (limit === 0) {
    await awaitMediaDeliveryOperation(response.body?.cancel(), signal);
    return new Uint8Array();
  }
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await awaitMediaDeliveryOperation(
      response.arrayBuffer(),
      signal
    );
    return new Uint8Array(buffer).slice(0, limit);
  }
  try {
    return await collectResponsePrefix(reader, limit, signal);
  } finally {
    try {
      await awaitMediaDeliveryOperation(
        reader.cancel().catch(() => undefined),
        signal
      );
    } finally {
      reader.releaseLock();
    }
  }
}

async function collectResponsePrefix(reader, limit, signal) {
  const chunks = [];
  let totalLength = 0;
  while (totalLength < limit) {
    // biome-ignore lint/performance/noAwaitInLoops: Each chunk determines whether the bounded stream needs another read.
    const read = await awaitMediaDeliveryOperation(reader.read(), signal);
    if (read.done) {
      break;
    }
    const remaining = limit - totalLength;
    const chunk =
      read.value.length > remaining
        ? read.value.slice(0, remaining)
        : read.value;
    chunks.push(chunk);
    totalLength += chunk.length;
  }
  return concatChunks(chunks, totalLength);
}

function concatChunks(chunks, totalLength) {
  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
