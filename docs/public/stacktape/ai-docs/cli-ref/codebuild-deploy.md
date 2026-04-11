---
docType: cli-ref
title: "CLI: codebuild:deploy"
tags:
  - codebuild:deploy
  - codebuild
  - deploy
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape codebuild:deploy`

Deploys your stack to AWS using AWS CodeBuild.

This command offloads the deployment process to a dedicated environment within your AWS account, which is useful for resource-intensive projects.

Here's how it works:
1. Your project is zipped and uploaded to an S3 bucket in your account.
2. A CodeBuild environment (a dedicated VM) is provisioned.
3. The deployment begins, and logs are streamed to your terminal in real-time.

Like the `deploy` command, this requires a `stacktape.yml` file.

## Required Arguments

- `--stage`
- `--region`

## Usage

```bash
stacktape codebuild:deploy --stage <value> --region <value>
```
