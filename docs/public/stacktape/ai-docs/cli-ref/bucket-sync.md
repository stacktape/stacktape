---
docType: cli-ref
title: "CLI: bucket:sync"
tags:
  - bucket:sync
  - bucket
  - sync
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape bucket:sync`

Synchronizes the contents of a local directory with an S3 bucket.

You can specify the bucket in two ways:
- **Using Stacktape configuration:** Provide the `stage` and `resourceName`. Stacktape will identify the bucket from the deployed stack and sync the directory specified in the configuration file.
- **Using bucket ID:** Provide a valid `bucketId` (AWS physical resource ID or bucket name) and a `sourcePath`.

Files in the bucket that are not present in the source directory will be removed.

## Required Arguments

- `--region`

## Usage

```bash
stacktape bucket:sync --region <value>
```
