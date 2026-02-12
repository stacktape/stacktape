---
docType: cli-ref
title: "CLI: debug:aws-sdk"
tags:
  - debug:aws-sdk
  - debug
  - aws-sdk
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape debug:aws-sdk`

Execute read-only AWS SDK commands against deployed resources.

Provides direct access to AWS SDK v3 for inspecting deployed resources. Only read-only operations (List*, Get*, Describe*, Head*) are allowed.

Examples:
  stacktape debug:aws-sdk --stage prod --service lambda --command ListFunctions
  stacktape debug:aws-sdk --stage prod --service dynamodb --command Scan --input '{"TableName": "my-table", "Limit": 10}'
  stacktape debug:aws-sdk --stage prod --service logs --command FilterLogEvents --input '{"logGroupName": "/aws/lambda/my-func"}'

## Required Arguments

- `--region`
- `--service`
- `--command`

## Usage

```bash
stacktape debug:aws-sdk --region <value> --service <value> --command <value>
```
