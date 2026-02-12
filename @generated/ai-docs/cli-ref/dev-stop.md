---
docType: cli-ref
title: "CLI: dev:stop"
tags:
  - dev:stop
  - dev
  - stop
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape dev:stop`

Stops a running dev agent.

Use this command to gracefully stop a dev agent that was started with `dev --agent`.

If multiple agents are running, you'll be prompted to specify which one to stop using `--agentPort`.

Use `--cleanupContainers` to remove orphaned Docker containers left behind by crashed dev sessions.

## Usage

```bash
stacktape dev:stop
```
