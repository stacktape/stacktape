#!/usr/bin/env bash
# Starts the source Stacktape MCP server for the real-task suite. The agent's working directory stays the user project;
# Stacktape reads its defaults (stacktape-e2e connection, eu-west-1) from the bench home made by prepare.sh, and the
# dev API key from apps/cli/.env.local.
set -euo pipefail

cli_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
bench="${MCP_BENCH_DIR:-$HOME/.cache/stacktape-mcp-bench}"
export MCP_BENCH_DIR="$bench"

export STACKTAPE_MCP_USER_CWD="$PWD"
# The server's CLI calls go through the same wrapper as the agent's shell, marked so they are not logged as bypasses.
export STACKTAPE_MCP_CLI_COMMAND="$cli_root/scripts/e2e-mcp/real-tasks/bin/stacktape"
export STACKTAPE_MCP_CHILD=1
export HOME="$bench/home"
export DOTENV_CONFIG_QUIET=true
cd "$cli_root"
exec bun scripts/dev.ts mcp --logLevel error 2>> "$bench/mcp-server.log"
