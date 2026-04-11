---
docType: cli-ref
title: "CLI: compile-template"
tags:
  - compile-template
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape compile-template`

Compiles your Stacktape configuration into a CloudFormation template.

By default, the template is saved to `./compiled-template.yaml`. Use the `--outFile` option to specify a different path.

## Required Arguments

- `--stage`
- `--region`

## Usage

```bash
stacktape compile-template --stage <value> --region <value>
```
