---
docType: cli-ref
title: "CLI: info:stack"
tags:
  - info:stack
  - info
  - stack
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape info:stack`

Displays detailed information about a deployed stack including outputs and resources.

Returns stack outputs (URLs, endpoints, resource identifiers) and the list of AWS resources in the stack. Useful for discovering endpoints after deployment.

You can identify the stack in two ways:
- Using --stackName directly (e.g., --stackName my-project-prod)
- Using --projectName and --stage (e.g., --projectName my-project --stage prod)

## Required Arguments

- `--region`

## Usage

```bash
stacktape info:stack --region <value>
```
