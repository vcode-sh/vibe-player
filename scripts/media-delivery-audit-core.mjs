const firstSampleSize = 4 * 1024 * 1024;
const tailSampleSize = 4 * 1024 * 1024;
const contentRangePattern = /^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i;

async function fetchRange(url, start, end, origin) {
  const headers = new Headers();
  headers.set("Range", `bytes=${start}-${end}`);
  if (origin) {
    headers.set("Origin", origin);
  }
  const response = await fetch(url, { headers, redirect: "follow" });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, headers: response.headers, status: response.status };
}

function parseContentRange(value) {
  const match = value?.match(contentRangePattern);
  if (!match) {
    return null;
  }
  const total = match[3] === "*" ? null : Number(match[3]);
  return { end: Number(match[2]), start: Number(match[1]), total };
}

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

function inspectCors(headers, origin, credentialsRequired) {
  const allowOrigin = headers.get("access-control-allow-origin");
  const allowCredentials = headers.get("access-control-allow-credentials");
  const originAllowed = allowOrigin === "*" || allowOrigin === origin;
  const credentialsAllowed =
    !credentialsRequired ||
    (allowOrigin === origin && allowCredentials === "true");
  const allowed = originAllowed && credentialsAllowed;
  return {
    allowCredentials,
    allowOrigin,
    allowed,
    credentialsRequired,
    origin,
  };
}

async function collectCorsResults(url, origins, credentialsRequired) {
  const corsResults = [];
  for (const origin of origins) {
    const response = await fetchRange(url, 0, 0, origin);
    corsResults.push(
      inspectCors(response.headers, origin, credentialsRequired)
    );
  }
  return corsResults;
}

function getCorsFailure(result) {
  if (result.allowed) {
    return null;
  }
  if (result.credentialsRequired) {
    return `Credentialed CORS is missing for ${result.origin}`;
  }
  return `CORS is missing for ${result.origin}`;
}

function collectFailures(rangeOk, mp4, corsResults) {
  const failures = [];
  if (!rangeOk) {
    failures.push("range requests are not confirmed");
  }
  if (mp4.isMp4 && !mp4.faststart) {
    failures.push("MP4 is not faststart");
  }
  for (const result of corsResults) {
    const failure = getCorsFailure(result);
    if (failure) {
      failures.push(failure);
    }
  }
  return failures;
}

function collectRecommendations(rangeOk, mp4, corsResults) {
  const recommendations = [];
  if (!rangeOk) {
    recommendations.push("Enable HTTP byte-range responses for media assets.");
  }
  if (mp4.isMp4 && !mp4.faststart) {
    recommendations.push(
      "Remux MP4 with `ffmpeg -movflags +faststart` or serve HLS renditions."
    );
  }
  for (const result of corsResults) {
    if (!result.allowed) {
      if (result.credentialsRequired) {
        recommendations.push(
          `Set Access-Control-Allow-Origin to ${result.origin} and Access-Control-Allow-Credentials: true before using crossOrigin="use-credentials".`
        );
      } else {
        recommendations.push(
          `Allow ${result.origin} in Access-Control-Allow-Origin before enabling crossOrigin.`
        );
      }
    }
  }
  return recommendations;
}

export async function createMediaDeliveryAuditReport(input) {
  const credentialsRequired = input.credentials === true;
  const first = await fetchRange(input.url, 0, firstSampleSize - 1);
  const contentRange = parseContentRange(first.headers.get("content-range"));
  const totalSize = contentRange?.total ?? first.bytes.length;
  const tailStart = Math.max(0, totalSize - tailSampleSize);
  const tail = await fetchRange(input.url, tailStart, totalSize - 1);
  const mp4 = inspectMp4(first.bytes, tail.bytes, tailStart);
  const rangeOk = first.status === 206 && Boolean(contentRange);
  const corsResults = await collectCorsResults(
    input.url,
    input.origins,
    credentialsRequired
  );
  const failures = collectFailures(rangeOk, mp4, corsResults);
  const recommendations = collectRecommendations(rangeOk, mp4, corsResults);
  return {
    corsResults,
    credentialsRequired,
    failures,
    mp4,
    rangeOk,
    recommendations,
    status: first.status,
    totalSize,
    url: input.url,
  };
}

export function formatMediaDeliveryAuditJson(report) {
  return `${JSON.stringify({ passed: report.failures.length === 0, ...report }, null, 2)}\n`;
}

function printBoxSummary(boxes) {
  const summary = boxes
    .slice(0, 8)
    .map((box) => {
      const marker = box.truncated ? " truncated" : "";
      return `${box.type}@${box.offset}:${box.size}${marker}`;
    })
    .join(", ");
  console.log(`MP4 boxes: ${summary || "none parsed"}`);
}

export function printMediaDeliveryAuditReport(report) {
  console.log("Media delivery audit");
  console.log(`URL: ${report.url}`);
  console.log(
    `HTTP range: ${report.rangeOk ? "ok" : "not confirmed"} (${report.status})`
  );
  console.log(`Content length: ${report.totalSize}`);
  console.log(
    `Credentialed CORS: ${report.credentialsRequired ? "required" : "not requested"}`
  );
  printBoxSummary(report.mp4.boxes);
  if (report.mp4.isMp4) {
    console.log(`MP4 faststart: ${report.mp4.faststart ? "ok" : "no"}`);
    console.log(
      `moov offset: ${
        report.mp4.moovBox?.offset ?? report.mp4.tailMoovOffset ?? "not found"
      }`
    );
    console.log(`mdat offset: ${report.mp4.mdatBox?.offset ?? "not found"}`);
  }
  for (const result of report.corsResults) {
    console.log(
      `CORS ${result.origin}: ${result.allowed ? "ok" : "missing"} ` +
        `(acao=${result.allowOrigin ?? "none"}, acac=${
          result.allowCredentials ?? "none"
        })`
    );
  }
  if (report.failures.length > 0) {
    console.log("Findings:");
    for (const failure of report.failures) {
      console.log(`- ${failure}`);
    }
  }
  if (report.recommendations.length > 0) {
    console.log("Recommendations:");
    for (const recommendation of report.recommendations) {
      console.log(`- ${recommendation}`);
    }
  }
}
