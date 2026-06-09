export function formatMediaDeliveryAuditJson(report) {
  return `${JSON.stringify({ passed: report.failures.length === 0, ...report }, null, 2)}\n`;
}

export function formatMediaDeliveryByteSize(value) {
  const units = [
    { label: "GiB", size: 1024 * 1024 * 1024 },
    { label: "MiB", size: 1024 * 1024 },
    { label: "KiB", size: 1024 },
  ];
  for (const unit of units) {
    if (Math.abs(value) >= unit.size) {
      return `${value} bytes (${(value / unit.size).toFixed(1)} ${unit.label})`;
    }
  }
  return `${value} bytes`;
}

function formatBoxSummary(boxes) {
  const parts = [];
  for (const box of boxes.slice(0, 8)) {
    const marker = box.truncated ? " truncated" : "";
    parts.push(`${box.type}@${box.offset}:${box.size}${marker}`);
  }
  return `MP4 boxes: ${parts.join(", ") || "none parsed"}`;
}

export function formatMediaDeliveryAuditText(report) {
  const lines = createAuditHeaderLines(report);
  appendMp4Details(lines, report.mp4);
  appendCorsResults(lines, report.corsResults);
  appendFindings(lines, report.findings, report.failures);
  appendNextActions(lines, report.nextActions ?? []);
  appendRecommendations(lines, report.recommendations);
  return `${lines.join("\n")}\n`;
}

function createAuditHeaderLines(report) {
  const lines = [
    "Media delivery audit",
    `URL: ${report.url}`,
    `HTTP range: ${report.rangeOk ? "ok" : "not confirmed"} (${report.status})`,
    `Content length: ${formatMediaDeliveryContentLength(report)}`,
    `Direct size limit: ${formatMediaDeliverySizeLimit(report.maxSizeBytes)}`,
    `Direct-file ready: ${formatMediaDeliveryReady(report.rollout)}`,
    `Recommended delivery: ${formatMediaDeliveryRecommendedDelivery(
      report.rollout
    )}`,
    `Rollout summary: ${formatMediaDeliveryRolloutSummary(report.rollout)}`,
    `Credentialed CORS: ${
      report.credentialsRequired ? "required" : "not requested"
    }`,
    formatBoxSummary(report.mp4.boxes),
  ];
  if (report.resolvedUrl && report.resolvedUrl !== report.url) {
    lines.splice(2, 0, `Resolved URL: ${report.resolvedUrl}`);
  }
  return lines;
}

function appendMp4Details(lines, mp4) {
  if (mp4.isMp4) {
    lines.push(`MP4 faststart: ${mp4.faststart ? "ok" : "no"}`);
    lines.push(
      `moov offset: ${mp4.moovBox?.offset ?? mp4.tailMoovOffset ?? "not found"}`
    );
    lines.push(`mdat offset: ${mp4.mdatBox?.offset ?? "not found"}`);
  }
}

function appendCorsResults(lines, corsResults) {
  for (const result of corsResults) {
    lines.push(
      `CORS ${result.origin}: ${result.allowed ? "ok" : "missing"} ` +
        `(acao=${result.allowOrigin ?? "none"}, acac=${
          result.allowCredentials ?? "none"
        })`
    );
  }
}

function appendFindings(lines, findings, failures) {
  if (failures.length > 0) {
    lines.push("Findings:");
    for (const finding of findings) {
      lines.push(`- [${finding.severity} ${finding.code}] ${finding.failure}`);
      lines.push(`  ${finding.recommendation}`);
    }
  }
}

function appendNextActions(lines, nextActions) {
  if (nextActions.length > 0) {
    lines.push("Next actions:");
    for (const action of nextActions) {
      lines.push(`- [${action.code}] ${action.label}`);
      lines.push(`  ${action.detail}`);
      if (action.headers) {
        lines.push(`  Headers: ${formatActionHeaders(action.headers)}`);
      }
      if (action.command) {
        lines.push(`  Command: ${action.command}`);
      }
    }
  }
}

function formatActionHeaders(headers) {
  const parts = [];
  for (const [name, value] of Object.entries(headers)) {
    parts.push(`${name}: ${value}`);
  }
  return parts.join("; ");
}

function appendRecommendations(lines, recommendations) {
  if (recommendations.length > 0) {
    lines.push("Recommendations:");
    for (const recommendation of recommendations) {
      lines.push(`- ${recommendation}`);
    }
  }
}

function formatMediaDeliveryContentLength(report) {
  if (report.totalSizeKnown === false) {
    return `unknown (sampled ${formatMediaDeliveryByteSize(report.totalSize)})`;
  }
  return formatMediaDeliveryByteSize(report.totalSize);
}

function formatMediaDeliverySizeLimit(maxSizeBytes) {
  if (maxSizeBytes === null) {
    return "not configured";
  }
  return formatMediaDeliveryByteSize(maxSizeBytes);
}

function formatMediaDeliveryReady(rollout) {
  if (!rollout) {
    return "unknown";
  }
  return rollout.directFileReady ? "yes" : "no";
}

function formatMediaDeliveryRecommendedDelivery(rollout) {
  if (!rollout) {
    return "unknown";
  }
  return rollout.recommendedDelivery;
}

function formatMediaDeliveryRolloutSummary(rollout) {
  if (!rollout) {
    return "unknown";
  }
  return rollout.summary;
}

export function printMediaDeliveryAuditReport(report) {
  console.log(formatMediaDeliveryAuditText(report).trimEnd());
}
