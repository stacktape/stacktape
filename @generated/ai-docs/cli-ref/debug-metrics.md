---
docType: cli-ref
title: "CLI: debug:metrics"
tags:
  - debug:metrics
  - debug
  - metrics
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape debug:metrics`

Fetch CloudWatch metrics for a deployed resource.

Supported metrics by resource type:
- Lambda: Invocations, Errors, Duration, Throttles
- ECS: CPUUtilization, MemoryUtilization
- RDS: CPUUtilization, DatabaseConnections, FreeStorageSpace
- API Gateway: Count, 4XXError, 5XXError, Latency

## Required Arguments

- `--stage`
- `--region`
- `--resourceName`
- `--metric`

## Usage

```bash
stacktape debug:metrics --stage <value> --region <value> --resourceName <value> --metric <value>
```
