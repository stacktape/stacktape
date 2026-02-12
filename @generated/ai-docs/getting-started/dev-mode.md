---
docType: getting-started
title: Dev Mode
tags:
  - dev
  - mode
  - getting-started
source: docs/_curated-docs/getting-started/dev-mode.mdx
priority: 2
---

# Dev Mode

Dev mode runs your workloads locally while connecting to (or emulating) cloud resources. Change code, see results immediately - no redeploy needed.

```bash
stacktape dev --stage dev --region us-east-1
```

## How it works

Dev mode creates a minimal "dev stack" in AWS (IAM roles, secrets, API gateways) and runs everything else locally:

- **Lambda functions** - Deployed to AWS, but with logs streamed to your terminal
- **Containers** (web-service, worker-service) - Run as Docker containers on your machine
- **Databases** - Emulated locally with Docker (PostgreSQL, MySQL, Redis, DynamoDB, OpenSearch)
- **Static sites** (hosting-bucket, Next.js) - Served from a local dev server

Your Lambda functions can still reach your locally-emulated databases through automatic tunneling.

## Starting dev mode

**Run all workloads:**

```bash
stacktape dev --stage dev --region us-east-1 --resources all
```

**Run specific workloads:**

```bash
stacktape dev --stage dev --region us-east-1 --resources myApi,myWorker
```

**Watch for changes and auto-rebuild:**

```bash
stacktape dev --stage dev --region us-east-1 --resources all --watch
```

## Local database emulation

Dev mode automatically spins up Docker containers for your databases:

| Resource Type                | Local Emulator                    |
| ---------------------------- | --------------------------------- |
| PostgreSQL/Aurora PostgreSQL | `postgres:latest`                 |
| MySQL/Aurora MySQL           | `mysql:latest` / `mariadb:latest` |
| Redis                        | `redis:latest`                    |
| DynamoDB                     | `amazon/dynamodb-local`           |
| OpenSearch                   | `opensearchproject/opensearch`    |

Database data persists between runs in `.stacktape/dev-data/{stage}/`.

**Start fresh:**

```bash
stacktape dev --stage dev --region us-east-1 --freshDb
```

**Use deployed (remote) database instead:**

```bash
stacktape dev --stage dev --region us-east-1 --remoteResources myDatabase
```

## Environment variables

Local workloads receive the same `STP_*` environment variables as deployed resources, pointing to local endpoints:

```
STP_MY_DB_CONNECTION_STRING=postgres://postgres:postgres@localhost:5432/postgres
STP_MY_DB_HOST=localhost
STP_MY_DB_PORT=5432
```

## Manual rebuilds

When running without `--watch`, trigger rebuilds manually:

- Type `rs` + Enter in the terminal to rebuild
- Or call the HTTP API (see [Using with AI](/getting-started/using-with-ai))

## Command options

| Flag                | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `--resources`       | Resources to run (`all` or comma-separated names)      |
| `--skipResources`   | Resources to exclude                                   |
| `--watch`           | Auto-rebuild on file changes                           |
| `--remoteResources` | Resources to connect to AWS instead of local emulation |
| `--freshDb`         | Delete existing local database data                    |
| `--noTunnel`        | Disable Lambda-to-local tunneling                      |

## Legacy mode

If you need to connect to an already-deployed stack (no local emulation):

```bash
stacktape dev --stage dev --region us-east-1 --devMode legacy
```

Legacy mode requires an existing deployment and connects directly to deployed AWS resources.

## Next steps

- [Using with AI](/getting-started/using-with-ai) - Programmatic control via HTTP API
- [Console](/getting-started/console) - Web-based deployment and monitoring
