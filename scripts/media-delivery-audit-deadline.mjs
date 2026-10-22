const defaultMediaDeliveryAuditTimeoutMs = 30_000;
const maximumMediaDeliveryAuditTimeoutMs = 600_000;
const integerPattern = /^\d+$/;

export function parseMediaDeliveryAuditTimeoutMs(value) {
  if (value === undefined) {
    return defaultMediaDeliveryAuditTimeoutMs;
  }
  const timeoutMs =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (
    (typeof value === "string" && !integerPattern.test(value)) ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > maximumMediaDeliveryAuditTimeoutMs
  ) {
    throw new Error("--timeout-ms must be an integer between 1 and 600000.");
  }
  return timeoutMs;
}

function createTimeoutError(timeoutMs) {
  const error = new Error(
    `Media delivery audit timed out after ${timeoutMs} ms.`
  );
  error.name = "TimeoutError";
  error.code = "media-audit-timeout";
  return error;
}

export async function withMediaDeliveryAuditDeadline(input, operation) {
  const timeoutMs = parseMediaDeliveryAuditTimeoutMs(input.timeoutMs);
  const controller = new AbortController();
  const cancel = () => controller.abort(input.signal.reason);
  input.signal?.addEventListener("abort", cancel, { once: true });
  if (input.signal?.aborted) {
    cancel();
  }
  const timer = setTimeout(
    () => controller.abort(createTimeoutError(timeoutMs)),
    timeoutMs
  );
  try {
    controller.signal.throwIfAborted();
    const result = await operation(controller.signal);
    controller.signal.throwIfAborted();
    return result;
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", cancel);
  }
}

/** Bounds stream reads as well as Fetch implementations that ignore cancellation. */
export function awaitMediaDeliveryOperation(operation, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (complete, value) => {
      if (!settled) {
        settled = true;
        signal?.removeEventListener("abort", cancel);
        complete(value);
      }
    };
    const cancel = () => finish(reject, signal.reason);
    signal?.addEventListener("abort", cancel, { once: true });
    Promise.resolve(operation).then(
      (value) => finish(resolve, value),
      (error) => finish(reject, error)
    );
    if (signal?.aborted) {
      cancel();
    }
  });
}
