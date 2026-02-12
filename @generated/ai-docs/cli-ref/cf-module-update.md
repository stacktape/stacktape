---
docType: cli-ref
title: "CLI: cf-module:update"
tags:
  - cf-module:update
  - cf-module
  - update
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape cf-module:update`

Updates AWS CloudFormation infrastructure module private types to the latest compatible version.

AWS CloudFormation infrastructure modules are used to integrate third-party services into your stack. If a third-party API changes, use this command to update the modules in your account to the latest version.

## Required Arguments

- `--region`

## Usage

```bash
stacktape cf-module:update --region <value>
```
