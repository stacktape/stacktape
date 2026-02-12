---
docType: cli-ref
title: "CLI: init"
tags:
  - init
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape init`

Initializes a new Stacktape project and guides you through deployment.

By default, runs an interactive wizard that:
1. Analyzes your project with AI and generates a configuration
2. Helps you sign up or log in to Stacktape
3. Connects your AWS account
4. Creates a project and optionally sets up CI/CD
5. Offers to deploy immediately

Alternative modes:
- **Starter project:** Use `--starterProject` or `--starterId` to initialize from a pre-configured template.
- **Legacy AI-only:** Use `--useAi` for just the AI config generation without the full wizard.
- **Template:** Use `--templateId` to fetch a template from the Stacktape console.

## Usage

```bash
stacktape init
```
