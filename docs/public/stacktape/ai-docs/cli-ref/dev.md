---
docType: cli-ref
title: "CLI: dev"
tags:
  - dev
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape dev`

Runs your application locally for development and debugging.

Supports two modes (use `--devMode` to select):

#### Normal mode (default):
- Deploys a minimal "dev stack" to AWS with only essential infrastructure (IAM roles, secrets).
- Runs workloads (containers, functions) locally on your machine.
- Emulates databases (PostgreSQL, MySQL, DynamoDB) and Redis locally using Docker.
- Automatically sets up tunnels so AWS Lambda functions can reach your local databases.
- No need for a pre-deployed stack - creates one automatically if needed.

#### Legacy mode (`--devMode legacy`):
- Requires an already deployed stack.
- Runs selected workloads locally while connecting to deployed AWS resources.
- No local database emulation - uses deployed databases directly.
- Useful when you need to test against production-like data.

#### Common features:
- Interactive resource picker (or use `--resources` to specify).
- Hot-reload: type a number + enter to rebuild a workload, or `a` + enter to rebuild all.
- Automatic file watching with `--watch` flag.
- Injects environment variables, secrets, and AWS credentials into local workloads.
- Streams logs from all running workloads to the console.

## Required Arguments

- `--region`
- `--stage`

## Usage

```bash
stacktape dev --region <value> --stage <value>
```
