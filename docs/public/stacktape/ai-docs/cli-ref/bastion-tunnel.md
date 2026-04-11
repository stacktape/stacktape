---
docType: cli-ref
title: "CLI: bastion:tunnel"
tags:
  - bastion:tunnel
  - bastion
  - tunnel
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape bastion:tunnel`

Creates a secure tunnel to a resource through a bastion host.

Your stack must include a `bastion` resource. This is useful for accessing resources in a private VPC. If you have multiple bastions, you can specify one with the `--bastionResource` argument. The command will print the tunneled endpoints to the terminal.

For more information, refer to the [bastion tunnel documentation](https://docs.stacktape.com/bastion-servers/#creating-bastion-tunnel).

## Required Arguments

- `--region`
- `--stage`
- `--resourceName`

## Usage

```bash
stacktape bastion:tunnel --region <value> --stage <value> --resourceName <value>
```
