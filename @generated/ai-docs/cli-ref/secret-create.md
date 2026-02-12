---
docType: cli-ref
title: "CLI: secret:create"
tags:
  - secret:create
  - secret
  - create
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape secret:create`

Creates a secret that is securely stored in AWS Secrets Manager.

This secret can then be referenced in your configuration using the `$Secret('secret-name')` directive. This is useful for storing sensitive data like passwords, API keys, or other credentials.

In agent mode, use --secretName with either --secretValue or --secretFile. Use --forceUpdate to update existing secrets without prompting.

## Required Arguments

- `--region`

## Usage

```bash
stacktape secret:create --region <value>
```
