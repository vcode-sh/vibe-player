#!/usr/bin/env bun

import {
  createMediaDeliveryAuditReport,
  formatMediaDeliveryAuditJson,
  printMediaDeliveryAuditReport,
} from "./media-delivery-audit-core.mjs";

function parseArgs(rawArgs) {
  const origins = [];
  let credentials = false;
  let json = false;
  let strict = false;
  let url = "";

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--credentials") {
      credentials = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--strict") {
      strict = true;
    } else if (arg === "--origin") {
      const origin = rawArgs[index + 1];
      if (!origin) {
        throw new Error("--origin requires a value.");
      }
      origins.push(origin);
      index += 1;
    } else if (url) {
      throw new Error(`Unexpected argument: ${arg}`);
    } else {
      url = arg ?? "";
    }
  }

  if (!url) {
    throw new Error(
      "Usage: bun run media:audit -- <url> [--origin <origin>] [--credentials] [--json] [--strict]"
    );
  }

  return { credentials, json, origins, strict, url };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const report = await createMediaDeliveryAuditReport({
    credentials: args.credentials,
    origins: args.origins,
    url: args.url,
  });
  if (args.json) {
    process.stdout.write(formatMediaDeliveryAuditJson(report));
  } else {
    printMediaDeliveryAuditReport(report);
  }
  if (args.strict && report.failures.length > 0) {
    process.exitCode = 1;
  }
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Media audit failed.");
  process.exitCode = 1;
}
