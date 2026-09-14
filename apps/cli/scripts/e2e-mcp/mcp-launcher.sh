#!/usr/bin/env bash
# MCP launcher for the e2e harness (run-e2e.ts). Keeps the caller's working directory for the server
# (project_scan / cli_plan act on it) while running the dev CLI from the CLI app root.
set -euo pipefail

cli_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
log="${MCP_LAUNCHER_LOG:-${TMPDIR:-/tmp}/mcp-launcher.log}"

export STACKTAPE_MCP_USER_CWD="$PWD"
echo "[$(date '+%F %T')] launcher started, cwd=$PWD" >> "$log"
cd "$cli_root"
exec bun scripts/dev.ts mcp --logLevel error 2>> "$log"
