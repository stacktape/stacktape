---
docType: cli-ref
title: "CLI: login"
tags:
  - login
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape login`

Configures your Stacktape API key for the current system.

All subsequent operations will be associated with the user and organization linked to this API key. You can get your API key from the [Stacktape console](https://console.stacktape.com/api-keys). You can provide the key with the `--apiKey` option or enter it interactively.

## Usage

```bash
stacktape login
```
