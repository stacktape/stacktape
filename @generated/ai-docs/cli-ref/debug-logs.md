---
docType: cli-ref
title: "CLI: debug:logs"
tags:
  - debug:logs
  - debug
  - logs
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape debug:logs`

Fetch and analyze logs from a deployed resource.

Supports two modes:
- **Standard**: Fetches recent log events with optional filtering
- **Insights**: Runs CloudWatch Logs Insights query with --query flag

Examples:
  stacktape debug:logs --stage prod --resourceName myLambda --startTime "1h"
  stacktape debug:logs --stage prod --resourceName myLambda --query "fields @timestamp, @message | filter @message like /ERROR/"

## Required Arguments

- `--stage`
- `--region`
- `--resourceName`

## Usage

```bash
stacktape debug:logs --stage <value> --region <value> --resourceName <value>
```
