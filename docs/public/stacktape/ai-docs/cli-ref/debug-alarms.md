---
docType: cli-ref
title: "CLI: debug:alarms"
tags:
  - debug:alarms
  - debug
  - alarms
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape debug:alarms`

View CloudWatch alarm states for stack resources.

Shows all alarms configured for the stack with their current state (OK, ALARM, INSUFFICIENT_DATA).
Filter by resource name or alarm state.

## Required Arguments

- `--stage`
- `--region`

## Usage

```bash
stacktape debug:alarms --stage <value> --region <value>
```
