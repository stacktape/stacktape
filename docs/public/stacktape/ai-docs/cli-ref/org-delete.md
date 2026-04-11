---
docType: cli-ref
title: "CLI: org:delete"
tags:
  - org:delete
  - org
  - delete
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape org:delete`

Deletes organization access for your user.

In interactive mode, you'll pick an organization. In agent mode, provide --organizationId.

This operation is allowed only for organization OWNER and only when there are no other non-service users and no active connected AWS accounts.

## Usage

```bash
stacktape org:delete
```
