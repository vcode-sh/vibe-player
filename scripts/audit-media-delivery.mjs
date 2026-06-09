#!/usr/bin/env bun

import { runMediaDeliveryAuditCli } from "./media-delivery-audit-runner.mjs";

process.exitCode = await runMediaDeliveryAuditCli();
