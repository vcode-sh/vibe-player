import type Hls from "hls.js";
import type { ErrorData } from "hls.js";
import type { VibePlayerErrorKind } from "../../core/vibe-player-types";
import {
  isHlsInternalSeekError,
  type ManagedHlsInternalSeeks,
} from "./hls-internal-seeks";
import type {
  HlsAdapterErrorPayload,
  ManagedHlsSession,
} from "./hls-runtime-types";

interface ManagedHlsErrorBinding {
  active: () => boolean;
  hls: Hls;
  internalSeeks: ManagedHlsInternalSeeks;
  session: ManagedHlsSession;
}

/** Retrying the same rejected credential cannot recover a signed delivery. */
export function createManagedHlsErrorHandler({
  active,
  hls,
  internalSeeks,
  session,
}: ManagedHlsErrorBinding) {
  let credentialFailure = false;
  return (_event: string, data: ErrorData): void => {
    if (!active() || credentialFailure) {
      return;
    }
    const payload = normalizeHlsError(data);
    if (isHlsInternalSeekError(data.details, data.fatal)) {
      internalSeeks.record();
      payload.internal = true;
    }
    if (payload.credentialFailure) {
      credentialFailure = true;
      hls.stopLoad();
    }
    session.onError(payload);
  };
}

function normalizeHlsError(data: ErrorData): HlsAdapterErrorPayload {
  const status = data.response?.code ?? data.networkDetails?.status;
  const credentialFailure = status === 401 || status === 403;
  return {
    details: data.details,
    fatal: data.fatal || credentialFailure,
    kind: getHlsErrorKind(data, status),
    message: data.error.message,
    network: data.type === "networkError",
    ...(typeof status === "number" ? { status } : {}),
    ...(credentialFailure
      ? { credentialFailure: true, sdkFatal: data.fatal }
      : {}),
    type: data.type,
  };
}

function getHlsErrorKind(
  { details, type }: ErrorData,
  status: number | undefined
): VibePlayerErrorKind {
  if (type === "networkError") {
    return status !== undefined && status >= 400 && status < 500
      ? "source"
      : "network";
  }
  if (details === "manifestIncompatibleCodecsError") {
    return "source";
  }
  return type === "mediaError" || type === "muxError" ? "decode" : "unknown";
}
