import {
  createMediaDeliveryCorsRecommendation,
  getMediaDeliveryCorsFailure,
} from "./media-delivery-audit-cors.mjs";

export function createMediaDeliveryFindings({
  corsResults,
  maxSizeBytes,
  mp4,
  rangeOk,
  totalSize,
  totalSizeKnown = true,
}) {
  const findings = [];
  if (!rangeOk) {
    findings.push({
      code: "range-unconfirmed",
      failure: "range requests are not confirmed",
      nextAction: {
        code: "fix-range-headers",
        detail:
          "Serve 206 Partial Content with Content-Range for media range probes.",
        label: "Fix byte-range headers",
      },
      recommendation: "Enable HTTP byte-range responses for media assets.",
      severity: "error",
      summary: "HTTP byte-range requests are not confirmed.",
    });
  }
  if (mp4.isMp4 && !mp4.faststart) {
    findings.push({
      code: "mp4-not-faststart",
      failure: "MP4 is not faststart",
      nextAction: {
        code: "remux-faststart-or-hls",
        command: "ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4",
        detail:
          "Run ffmpeg with -movflags +faststart or publish HLS renditions.",
        label: "Move MP4 metadata forward",
      },
      recommendation:
        "Remux MP4 with `ffmpeg -movflags +faststart` or serve HLS renditions.",
      severity: "error",
      summary:
        "The MP4 metadata atom is behind media data, which can delay startup.",
    });
  }
  if (maxSizeBytes !== null && !totalSizeKnown) {
    findings.push({
      code: "direct-file-size-unknown",
      failure: "media file size is unknown",
      nextAction: {
        code: "expose-content-size",
        detail:
          "Return a complete Content-Range total or Content-Length header.",
        label: "Expose total media size",
      },
      recommendation:
        "Return a complete Content-Range total or Content-Length before enforcing direct-file rollout limits.",
      severity: "error",
      summary:
        "The media file size could not be confirmed for the configured direct-file limit.",
    });
  }
  if (maxSizeBytes !== null && totalSizeKnown && totalSize > maxSizeBytes) {
    findings.push({
      code: "direct-file-too-large",
      failure: "media file exceeds direct-file size limit",
      nextAction: {
        code: "create-hls-renditions",
        detail:
          "Serve HLS/renditions or reduce the direct-file asset size before rollout.",
        label: "Create streaming renditions",
      },
      recommendation:
        "Serve HLS/renditions or reduce the direct-file asset size before rollout.",
      severity: "error",
      summary:
        `The media file is ${totalSize} bytes, exceeding the ` +
        `${maxSizeBytes} byte direct-file limit.`,
    });
  }
  for (const result of corsResults) {
    if (result.status < 200 || result.status >= 300) {
      findings.push(createOriginHttpFinding(result));
    }
    const failure = getMediaDeliveryCorsFailure(result);
    const recommendation = createMediaDeliveryCorsRecommendation(result);
    if (failure && recommendation) {
      findings.push({
        code: result.credentialsRequired
          ? "credentialed-cors-missing"
          : "cors-missing",
        failure,
        nextAction: createCorsNextAction(result),
        origin: result.origin,
        recommendation,
        severity: "error",
        summary: failure,
      });
    }
  }
  return findings;
}

function createOriginHttpFinding(result) {
  const failure = `HTTP ${result.status} for origin ${result.origin}`;
  return {
    code: "origin-http-error",
    failure,
    nextAction: {
      code: "fix-origin-delivery",
      detail: `Serve a successful 2xx response for media requests from ${result.origin}.`,
      label: "Fix origin media delivery",
      origin: result.origin,
    },
    origin: result.origin,
    recommendation: `Ensure ${result.origin} can retrieve the media asset successfully before rollout.`,
    severity: "error",
    status: result.status,
    summary: failure,
  };
}

function createCorsNextAction(result) {
  if (result.credentialsRequired) {
    return {
      code: "allow-credentialed-cors-origin",
      detail:
        `Set Access-Control-Allow-Origin to ${result.origin} and ` +
        "Access-Control-Allow-Credentials: true.",
      headers: {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Origin": result.origin,
      },
      label: "Allow credentialed CORS origin",
      origin: result.origin,
    };
  }
  return {
    code: "allow-cors-origin",
    detail:
      `Allow ${result.origin} in Access-Control-Allow-Origin before ` +
      "enabling crossOrigin.",
    headers: { "Access-Control-Allow-Origin": result.origin },
    label: "Allow media CORS origin",
    origin: result.origin,
  };
}

export function collectMediaDeliveryFailures(findings) {
  const failures = [];
  for (const finding of findings) {
    failures.push(finding.failure);
  }
  return failures;
}

export function collectMediaDeliveryRecommendations(findings) {
  const recommendations = [];
  for (const finding of findings) {
    recommendations.push(finding.recommendation);
  }
  return recommendations;
}

export function collectMediaDeliveryNextActions(findings) {
  const nextActions = [];
  const seenKeys = new Set();
  for (const finding of findings) {
    const action = finding.nextAction;
    const key = `${action.code}:${action.origin ?? ""}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      nextActions.push(action);
    }
  }
  return nextActions;
}
