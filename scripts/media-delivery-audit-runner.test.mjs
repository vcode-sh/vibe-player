import { describe, expect, it, vi } from "vitest";
import { runMediaDeliveryAuditCli } from "./media-delivery-audit-runner.mjs";

function createTextSink() {
  let text = "";
  return {
    read: () => text,
    stream: {
      write: (chunk) => {
        text += chunk;
        return true;
      },
    },
  };
}

function createReport(patch = {}) {
  return {
    corsResults: [],
    credentialsRequired: false,
    failures: [],
    findings: [],
    maxSizeBytes: null,
    mp4: { boxes: [], faststart: true, isMp4: false },
    rangeOk: true,
    recommendations: [],
    rollout: {
      blockingFindingCodes: [],
      directFileReady: true,
      recommendedDelivery: "direct-file",
      summary: "Direct-file rollout is ready for the checked origins.",
    },
    status: 206,
    totalSize: 128,
    url: "https://cdn.example.com/video.mp4",
    ...patch,
  };
}

describe("media delivery audit runner", () => {
  it("returns a strict failure and parseable JSON when findings exist", async () => {
    const stdout = createTextSink();
    const stderr = createTextSink();
    const createReportMock = vi.fn(async () =>
      createReport({
        failures: ["MP4 is not faststart"],
        findings: [
          {
            code: "mp4-not-faststart",
            failure: "MP4 is not faststart",
            recommendation:
              "Remux MP4 with `ffmpeg -movflags +faststart` or serve HLS renditions.",
            severity: "error",
          },
        ],
      })
    );

    const exitCode = await runMediaDeliveryAuditCli({
      argv: [
        "https://cdn.example.com/video.mp4",
        "--origin",
        "https://app.example.com",
        "--max-size-mb",
        "500",
        "--json",
        "--strict",
      ],
      createReport: createReportMock,
      stderr: stderr.stream,
      stdout: stdout.stream,
    });

    const payload = JSON.parse(stdout.read());
    expect(exitCode).toBe(1);
    expect(stderr.read()).toBe("");
    expect(payload.passed).toBe(false);
    expect(payload.findings.at(0).code).toBe("mp4-not-faststart");
    expect(createReportMock).toHaveBeenCalledWith({
      credentials: false,
      maxSizeBytes: 524_288_000,
      origins: ["https://app.example.com"],
      url: "https://cdn.example.com/video.mp4",
    });
  });

  it("prints help without touching the network", async () => {
    const stdout = createTextSink();
    const createReportMock = vi.fn();

    const exitCode = await runMediaDeliveryAuditCli({
      argv: ["--help"],
      createReport: createReportMock,
      stdout: stdout.stream,
    });

    expect(exitCode).toBe(0);
    expect(stdout.read()).toContain("Usage: bun run media:audit");
    expect(createReportMock).not.toHaveBeenCalled();
  });

  it("prints human output through the injected stdout stream", async () => {
    const stdout = createTextSink();
    const createReportMock = vi.fn(async () =>
      createReport({
        corsResults: [
          {
            allowCredentials: null,
            allowOrigin: null,
            allowed: false,
            credentialsRequired: false,
            origin: "https://app.example.com",
          },
        ],
        failures: ["CORS is missing for https://app.example.com"],
        findings: [
          {
            code: "cors-missing",
            failure: "CORS is missing for https://app.example.com",
            recommendation:
              "Allow https://app.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
            severity: "error",
          },
        ],
        recommendations: [
          "Allow https://app.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
        ],
      })
    );

    const exitCode = await runMediaDeliveryAuditCli({
      argv: [
        "https://cdn.example.com/video.mp4",
        "--origin",
        "https://app.example.com",
      ],
      createReport: createReportMock,
      stdout: stdout.stream,
    });

    expect(exitCode).toBe(0);
    expect(stdout.read()).toContain("Media delivery audit");
    expect(stdout.read()).toContain(
      "- [error cors-missing] CORS is missing for https://app.example.com"
    );
    expect(stdout.read()).toContain("Recommendations:");
  });

  it("can fail specifically when direct-file rollout is not ready", async () => {
    const stdout = createTextSink();
    const createReportMock = vi.fn(async () =>
      createReport({
        rollout: {
          blockingFindingCodes: ["direct-file-too-large"],
          directFileReady: false,
          recommendedDelivery: "hls-renditions",
          summary: "Use HLS/renditions before rollout.",
        },
      })
    );

    const exitCode = await runMediaDeliveryAuditCli({
      argv: [
        "https://cdn.example.com/video.mp4",
        "--json",
        "--require-direct-file-ready",
      ],
      createReport: createReportMock,
      stdout: stdout.stream,
    });

    const payload = JSON.parse(stdout.read());
    expect(exitCode).toBe(1);
    expect(payload.rollout.directFileReady).toBe(false);
    expect(payload.rollout.recommendedDelivery).toBe("hls-renditions");
  });

  it("returns a CLI failure before network work for invalid arguments", async () => {
    const stderr = createTextSink();
    const createReportMock = vi.fn();

    const exitCode = await runMediaDeliveryAuditCli({
      argv: [],
      createReport: createReportMock,
      stderr: stderr.stream,
    });

    expect(exitCode).toBe(1);
    expect(stderr.read()).toContain("Usage: bun run media:audit");
    expect(createReportMock).not.toHaveBeenCalled();
  });
});
