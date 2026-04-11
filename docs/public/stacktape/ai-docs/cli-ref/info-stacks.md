---
docType: cli-ref
title: "CLI: info:stacks"
tags:
  - info:stacks
  - info
  - stacks
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape info:stacks`

Lists all stacks deployed in a specified region.

Shows stack name, status, last update time, creation time, and estimated spend. Useful for discovering what's deployed in your AWS account.

## Required Arguments

- `--region`

## Usage

```bash
stacktape info:stacks --region <value>
```
