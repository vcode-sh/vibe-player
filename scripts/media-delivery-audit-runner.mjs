import {
  mediaDeliveryAuditUsage,
  parseMediaDeliveryAuditArgs,
} from "./media-delivery-audit-args.mjs";
import {
  createMediaDeliveryAuditReport,
  formatMediaDeliveryAuditJson,
  formatMediaDeliveryAuditText,
} from "./media-delivery-audit-core.mjs";

export async function runMediaDeliveryAuditCli(input = {}) {
  const argv = input.argv ?? process.argv.slice(2);
  const createReport = input.createReport ?? createMediaDeliveryAuditReport;
  const formatText = input.formatText ?? formatMediaDeliveryAuditText;
  const stderr = input.stderr ?? process.stderr;
  const stdout = input.stdout ?? process.stdout;

  try {
    const args = parseMediaDeliveryAuditArgs(argv);
    if (args.help) {
      stdout.write(`${mediaDeliveryAuditUsage}\n`);
      return 0;
    }

    const report = await createReport({
      credentials: args.credentials,
      maxSizeBytes: args.maxSizeBytes,
      origins: args.origins,
      url: args.url,
    });

    if (args.json) {
      stdout.write(formatMediaDeliveryAuditJson(report));
    } else {
      stdout.write(formatText(report));
    }

    const strictFailed = args.strict && report.failures.length > 0;
    const readyFailed =
      args.requireDirectFileReady && report.rollout?.directFileReady !== true;

    return strictFailed || readyFailed ? 1 : 0;
  } catch (error) {
    stderr.write(
      `${error instanceof Error ? error.message : "Media audit failed."}\n`
    );
    return 1;
  }
}
