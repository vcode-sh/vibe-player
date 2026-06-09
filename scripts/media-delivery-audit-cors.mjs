export function inspectMediaDeliveryCors(headers, origin, credentialsRequired) {
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

export function getMediaDeliveryCorsFailure(result) {
  if (result.allowed) {
    return null;
  }
  if (result.credentialsRequired) {
    return `Credentialed CORS is missing for ${result.origin}`;
  }
  return `CORS is missing for ${result.origin}`;
}

export function createMediaDeliveryCorsRecommendation(result) {
  if (result.allowed) {
    return null;
  }
  if (result.credentialsRequired) {
    return `Set Access-Control-Allow-Origin to ${result.origin} and Access-Control-Allow-Credentials: true before using crossOrigin="use-credentials".`;
  }
  return `Allow ${result.origin} in Access-Control-Allow-Origin before enabling crossOrigin.`;
}
