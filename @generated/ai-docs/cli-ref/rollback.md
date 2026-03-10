---
docType: cli-ref
title: "CLI: rollback"
tags:
  - rollback
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape rollback`

Rolls back the stack to a previous deployment version.

Downloads the CloudFormation template from a previous version and deploys it. Artifacts (Lambda zips, container images) from that version are reused — no rebuild is required.

Use `--listVersions` to see available versions. Specify a target with `--targetVersion v000003` or `--rollbackSteps N` (default: 1).

For recovering from `UPDATE_FAILED` state, use `cf:rollback` instead.

## Required Arguments

- `--region`

## Usage

```bash
stacktape rollback --region <value>
```
