---
docType: cli-ref
title: "CLI: deploy"
tags:
  - deploy
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape deploy`

Deploys your stack to AWS.

If the stack doesn't exist, it creates a new one. If it already exists, it updates it. This command requires a valid Stacktape configuration file (`stacktape.yml`) in the current directory, or you can specify a path using the `--configPath` option.

## Required Arguments

- `--stage`
- `--region`

## Usage

```bash
stacktape deploy --stage <value> --region <value>
```
