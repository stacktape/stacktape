---
docType: cli-ref
title: "CLI: deployment-script:run"
tags:
  - deployment-script:run
  - deployment-script
  - run
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape deployment-script:run`

Runs a deployment script defined in your configuration.

This command only updates the script's source code. To update environment variables or other configurations, use the `deploy` command.

## Required Arguments

- `--stage`
- `--region`
- `--resourceName`

## Usage

```bash
stacktape deployment-script:run --stage <value> --region <value> --resourceName <value>
```
