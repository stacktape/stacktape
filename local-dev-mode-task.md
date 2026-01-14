# Local Dev Mode Plan

## Goals

- Run Postgres/MySQL/MariaDB/Redis locally via Docker for dev mode.
- Keep Lambda dev mode running in AWS (local DB tunneling deferred).
- Allow `--resourceName all` to run all dev-compatible workloads.
- If no `--resourceName`, allow multi-select of dev-compatible workloads.
- Auto-detect local resources when not deployed or via `--local` override.

## Decisions

- Use host directory persistence: `.stacktape/dev-data/<resourceName>/`.
- Reuse running local DB containers when present.
- Auto-resolve port conflicts by selecting next free port and print it.
- Run multiple workloads in parallel; restart only those whose files change.
- `beforeDev` hook runs to allow seeding.
- Aurora emulation: treat as standard Postgres/MySQL and warn once.

## Implementation Steps

1. Add local DB runner module (postgres/mysql/mariadb/redis) using `dockerRun`.
2. Add resource resolution logic: local vs deployed based on `--local` and stack state.
3. Extend `getWorkloadEnvironmentVars` to merge local env vars with deployed ones.
4. Update dev container flow to start local DBs, reuse containers, register cleanup.
5. Update dev command selection to support `--resourceName all` and multi-select.
6. Add parallel runner for multiple workloads + file-change targeted restarts.
7. Add minimal UX messages: port remap + Aurora warning.

## Out of Scope

- Lambda -> local DB tunneling.
- Upstash Redis and MongoDB Atlas emulation.
