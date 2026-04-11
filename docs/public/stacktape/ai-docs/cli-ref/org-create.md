---
docType: cli-ref
title: "CLI: org:create"
tags:
  - org:create
  - org
  - create
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape org:create`

Creates a new organization in your Stacktape account.

In interactive mode, you'll be prompted for the organization name. In agent mode, provide --organizationName.

The command returns a new API key scoped to the newly created organization.

## Usage

```bash
stacktape org:create
```
