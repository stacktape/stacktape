---
docType: cli-ref
title: "CLI: container:session"
tags:
  - container:session
  - container
  - session
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape container:session`

Starts an interactive session inside a deployed container.

The session is established using ECS Exec and a secure SSM connection. If your service has multiple containers, you can choose which one to connect to. This is useful for debugging and inspecting running containers.

For more information, refer to the [container session documentation](https://docs.stacktape.com/bastion-servers/#connecting-to-bastion-interactive-session).

## Required Arguments

- `--region`
- `--stage`
- `--resourceName`

## Usage

```bash
stacktape container:session --region <value> --stage <value> --resourceName <value>
```
