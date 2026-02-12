---
docType: cli-ref
title: "CLI: debug:opensearch"
tags:
  - debug:opensearch
  - debug
  - opensearch
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape debug:opensearch`

Query a deployed OpenSearch domain.

Supports operations: search, get, indices, mapping, count. All operations are read-only.

Examples:
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation indices
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation mapping --index users
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation count --index users
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation get --index users --id doc123
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation search --query '{"match_all": {}}'

## Required Arguments

- `--region`
- `--stage`
- `--resourceName`

## Usage

```bash
stacktape debug:opensearch --region <value> --stage <value> --resourceName <value>
```
