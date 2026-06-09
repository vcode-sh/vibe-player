#!/usr/bin/env node

import { runMediaDeliveryAuditCli } from "./media-delivery-audit-runner.mjs";

process.exitCode = await runMediaDeliveryAuditCli();
