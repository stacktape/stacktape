---
docType: cli-ref
title: "CLI: debug:dynamodb"
tags:
  - debug:dynamodb
  - debug
  - dynamodb
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape debug:dynamodb`

Query a deployed DynamoDB table.

Supports operations: scan, query, get, schema, sample. All operations are read-only.

Examples:
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation sample
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation schema
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation scan --limit 50
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation query --pk '{"userId": "123"}'
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation get --pk '{"userId": "123"}' --sk '{"timestamp": 1234}'

## Required Arguments

- `--region`
- `--stage`
- `--resourceName`

## Usage

```bash
stacktape debug:dynamodb --region <value> --stage <value> --resourceName <value>
```
