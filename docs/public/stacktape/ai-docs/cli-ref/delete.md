---
docType: cli-ref
title: "CLI: delete"
tags:
  - delete
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape delete`

Deletes your stack from AWS.

This action is irreversible and will permanently remove all resources in the stack. Be sure to back up any data you want to keep. If you don't provide a configuration file, `beforeDelete` hooks will not be executed.

## Required Arguments

- `--region`

## Usage

```bash
stacktape delete --region <value>
```
