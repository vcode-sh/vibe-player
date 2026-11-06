import type Hls from "hls.js";
import type { ErrorData } from "hls.js";
import type {
  HlsAdapterErrorPayload,
  ManagedHlsSession,
} from "./hls-runtime-types";

interface ManagedHlsErrorBinding {
  active: () => boolean;
  hls: Hls;
  session: ManagedHlsSession;
}

/** Retrying the same rejected credential cannot recover a signed delivery. */
export function createManagedHlsErrorHandler({
  active,
  hls,
  session,
}: ManagedHlsErrorBinding) {
  let credentialFailure = false;
  return (_event: string, data: ErrorData): void => {
    if (!active() || credentialFailure) {
      return;
    }
    const payload = normalizeHlsError(data);
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
    message: data.error.message,
    network: data.type === "networkError",
    ...(typeof status === "number" ? { status } : {}),
    ...(credentialFailure
      ? { credentialFailure: true, sdkFatal: data.fatal }
      : {}),
    type: data.type,
  };
}
