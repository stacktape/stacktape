---
docType: cli-ref
title: "CLI: bastion:session"
tags:
  - bastion:session
  - bastion
  - session
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape bastion:session`

Starts an interactive session with a bastion host.

Your stack must include a `bastion` resource. If you have multiple bastions, you can specify which one to connect to with the `--bastionResource` argument. The session is established over a secure SSM connection.

For more information, refer to the [bastion documentation](https://docs.stacktape.com/bastion-servers/#connecting-to-bastion-interactive-session).

## Required Arguments

- `--region`
- `--stage`

## Usage

```bash
stacktape bastion:session --region <value> --stage <value>
```
