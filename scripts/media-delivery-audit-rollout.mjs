const deliverySummaries = {
  "direct-file": "Direct-file rollout is ready for the checked origins.",
  "faststart-remux-or-hls": "Remux the MP4 for faststart or serve HLS.",
  "fix-cors": "Fix CORS for checked origins before rollout.",
  "fix-delivery-headers": "Fix byte-range or length headers before rollout.",
  "fix-origin-delivery":
    "Fix HTTP delivery for checked origins before rollout.",
  "hls-renditions": "Use HLS/renditions before rollout.",
};

function hasFindingCode(codes, code) {
  return codes.includes(code);
}

function selectRecommendedDelivery(codes) {
  if (hasFindingCode(codes, "direct-file-too-large")) {
    return "hls-renditions";
  }
  if (hasFindingCode(codes, "range-unconfirmed")) {
    return "fix-delivery-headers";
  }
  if (hasFindingCode(codes, "direct-file-size-unknown")) {
    return "fix-delivery-headers";
  }
  if (hasFindingCode(codes, "origin-http-error")) {
    return "fix-origin-delivery";
  }
  if (hasFindingCode(codes, "mp4-not-faststart")) {
    return "faststart-remux-or-hls";
  }
  if (
    hasFindingCode(codes, "cors-missing") ||
    hasFindingCode(codes, "credentialed-cors-missing")
  ) {
    return "fix-cors";
  }
  return "direct-file";
}

export function createMediaDeliveryRollout(findings) {
  const blockingFindingCodes = [];
  for (const finding of findings) {
    if (finding.severity === "error") {
      blockingFindingCodes.push(finding.code);
    }
  }
  const recommendedDelivery = selectRecommendedDelivery(blockingFindingCodes);
  return {
    blockingFindingCodes,
    directFileReady: blockingFindingCodes.length === 0,
    recommendedDelivery,
    summary: deliverySummaries[recommendedDelivery],
  };
}
