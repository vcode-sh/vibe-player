export const mediaDeliveryAuditUsage =
  "Usage: bun run media:audit -- <url> [--origin <origin>] [--max-size-mb <mb>] [--credentials] [--json] [--strict] [--require-direct-file-ready]";

const booleanOptionKeys = {
  "--credentials": "credentials",
  "--help": "help",
  "--json": "json",
  "--require-direct-file-ready": "requireDirectFileReady",
  "--strict": "strict",
  "-h": "help",
};

export function parseMediaDeliveryAuditArgs(rawArgs) {
  const args = {
    credentials: false,
    help: false,
    json: false,
    maxSizeBytes: null,
    origins: [],
    requireDirectFileReady: false,
    strict: false,
    url: "",
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    index = parseMediaDeliveryAuditArg(args, rawArgs, index);
  }

  if (!(args.url || args.help)) {
    throw new Error(mediaDeliveryAuditUsage);
  }

  return args;
}

function parseMediaDeliveryAuditArg(args, rawArgs, index) {
  const arg = rawArgs[index];
  const booleanKey = booleanOptionKeys[arg];
  if (booleanKey) {
    args[booleanKey] = true;
    return index;
  }
  if (arg === "--origin") {
    return parseOriginArg(args, rawArgs, index);
  }
  if (arg === "--max-size-mb") {
    return parseMaxSizeArg(args, rawArgs, index);
  }
  if (arg?.startsWith("-")) {
    throw new Error(`Unexpected option: ${arg}`);
  }
  if (args.url) {
    throw new Error(`Unexpected argument: ${arg}`);
  }
  args.url = arg ?? "";
  return index;
}

function parseOriginArg(args, rawArgs, index) {
  const origin = rawArgs[index + 1];
  if (!origin) {
    throw new Error("--origin requires a value.");
  }
  args.origins.push(origin);
  return index + 1;
}

function parseMaxSizeArg(args, rawArgs, index) {
  const value = rawArgs[index + 1];
  if (!value) {
    throw new Error("--max-size-mb requires a value.");
  }
  args.maxSizeBytes = parseMaxSizeBytes(value);
  return index + 1;
}

function parseMaxSizeBytes(value) {
  const megabytes = Number(value);
  if (!(Number.isFinite(megabytes) && megabytes > 0)) {
    throw new Error("--max-size-mb must be a positive number.");
  }
  return Math.round(megabytes * 1024 * 1024);
}
