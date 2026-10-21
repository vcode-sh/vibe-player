const contentLengthPattern = /^\d+$/;
const contentRangePattern = /^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i;

export async function fetchMediaDeliveryRangeSample({
  end,
  origin,
  start,
  url,
}) {
  const headers = new Headers();
  headers.set("Range", `bytes=${start}-${end}`);
  if (origin) {
    headers.set("Origin", origin);
  }
  const response = await fetch(url, { headers, redirect: "follow" });
  const limit = Math.max(0, end - start + 1);
  const bytes = await readResponsePrefix(response, limit);
  return {
    bytes,
    headers: response.headers,
    resolvedUrl: response.url || url,
    status: response.status,
  };
}

export function parseMediaDeliveryContentLength(headers) {
  const value = headers.get("content-length");
  if (!(value && contentLengthPattern.test(value))) {
    return null;
  }
  return Number(value);
}

export function parseMediaDeliveryContentRange(value) {
  const match = value?.match(contentRangePattern);
  if (!match) {
    return null;
  }
  const total = match[3] === "*" ? null : Number(match[3]);
  return { end: Number(match[2]), start: Number(match[1]), total };
}

async function readResponsePrefix(response, limit) {
  if (limit === 0) {
    return new Uint8Array();
  }
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.slice(0, limit);
  }

  const chunks = [];
  let totalLength = 0;
  while (totalLength < limit) {
    // biome-ignore lint/performance/noAwaitInLoops: Each chunk determines whether the bounded stream needs another read.
    const read = await reader.read();
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
  await reader.cancel().catch(() => undefined);
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
