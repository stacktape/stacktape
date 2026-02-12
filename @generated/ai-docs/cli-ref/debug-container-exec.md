---
docType: cli-ref
title: "CLI: debug:container-exec"
tags:
  - debug:container-exec
  - debug
  - container-exec
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape debug:container-exec`

Execute a command in a running container and return the output.

Runs a command inside a deployed container workload (web-service, private-service, worker-service, or multi-container-workload) using ECS Exec. The command output is captured and returned as JSON.

Use --taskArn to specify which task to connect to when multiple instances are running (defaults to first available). Use --container to specify which container for multi-container workloads.

Examples:
  stacktape debug:container-exec --stage prod --resourceName myService --command "ls -la"
  stacktape debug:container-exec --stage prod --resourceName myService --command "cat /app/config.json"
  stacktape debug:container-exec --stage prod --resourceName myService --taskArn abc123 --command "env"

## Required Arguments

- `--region`
- `--stage`
- `--resourceName`
- `--command`

## Usage

```bash
stacktape debug:container-exec --region <value> --stage <value> --resourceName <value> --command <value>
```
