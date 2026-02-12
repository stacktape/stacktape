---
docType: cli-ref
title: "CLI: rollback"
tags:
  - rollback
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape rollback`

Rolls back the stack to the last known good state.

This is useful if a stack update fails and leaves the stack in an `UPDATE_FAILED` state.

## Required Arguments

- `--region`

## Usage

```bash
stacktape rollback --region <value>
```
