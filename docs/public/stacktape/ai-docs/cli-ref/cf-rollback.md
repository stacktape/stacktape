---
docType: cli-ref
title: "CLI: cf:rollback"
tags:
  - cf:rollback
  - cf
  - rollback
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape cf:rollback`

Rolls back the CloudFormation stack to the last known good state.

This is useful if a stack update fails and leaves the stack in an `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED` state. This uses CloudFormation's native rollback mechanism.

For rolling back to a specific previous deployment version, use `rollback` instead.

## Required Arguments

- `--region`

## Usage

```bash
stacktape cf:rollback --region <value>
```
