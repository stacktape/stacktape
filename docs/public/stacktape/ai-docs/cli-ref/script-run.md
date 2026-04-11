---
docType: cli-ref
title: "CLI: script:run"
tags:
  - script:run
  - script
  - run
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape script:run`

Executes a script defined in your configuration.

You can pass environment variables to the script using the `--env` option (e.g., `--env MY_VAR=my_value`).

To learn more, refer to the [scripts documentation](https://docs.stacktape.com/configuration/scripts/).

## Required Arguments

- `--scriptName`
- `--stage`

## Usage

```bash
stacktape script:run --scriptName <value> --stage <value>
```
