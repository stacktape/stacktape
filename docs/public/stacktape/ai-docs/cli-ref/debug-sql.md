---
docType: cli-ref
title: "CLI: debug:sql"
tags:
  - debug:sql
  - debug
  - sql
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape debug:sql`

Execute read-only SQL queries against a deployed relational database.

Supports PostgreSQL and MySQL databases. Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed.

If the database is VPC-only, use --bastionResource to tunnel through a bastion host.

Examples:
  stacktape debug:sql --stage prod --resourceName myDatabase --sql "SELECT * FROM users LIMIT 10"
  stacktape debug:sql --stage prod --resourceName myDatabase --bastionResource myBastion --sql "SHOW TABLES"

## Required Arguments

- `--region`
- `--stage`
- `--resourceName`
- `--sql`

## Usage

```bash
stacktape debug:sql --region <value> --stage <value> --resourceName <value> --sql <value>
```
