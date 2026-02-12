---
docType: cli-ref
title: "CLI: debug:redis"
tags:
  - debug:redis
  - debug
  - redis
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape debug:redis`

Query a deployed Redis cluster.

Supports operations: keys, get, ttl, info, type. All operations are read-only.

If the Redis cluster is VPC-only, use --bastionResource to tunnel through a bastion host.

Examples:
  stacktape debug:redis --stage prod --resourceName myRedis --operation info
  stacktape debug:redis --stage prod --resourceName myRedis --operation keys --pattern "user:*"
  stacktape debug:redis --stage prod --resourceName myRedis --operation get --key "session:abc123"
  stacktape debug:redis --stage prod --resourceName myRedis --bastionResource myBastion --operation info

## Required Arguments

- `--region`
- `--stage`
- `--resourceName`

## Usage

```bash
stacktape debug:redis --region <value> --stage <value> --resourceName <value>
```
