#!/usr/bin/env bash
# Prepares the real-task suite outside the repository: a project template with installed dependencies and a separate
# home folder whose Stacktape defaults point at the disposable stacktape-e2e AWS connection in eu-west-1.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bench="${MCP_BENCH_DIR:-$HOME/.cache/stacktape-mcp-bench}"

mkdir -p "$bench/home/.stacktape"
cat > "$bench/home/.stacktape/persisted-state.json" <<'JSON'
{
  "systemId": null,
  "cliArgsDefaults": {
    "region": "eu-west-1",
    "profile": "default",
    "stage": null,
    "projectName": null,
    "awsAccount": "stacktape-e2e"
  },
  "otherDefaults": { "apiKey": null, "executablePython": "python", "executableJavascript": "node" }
}
JSON

# Commands that read a project config; bin/stacktape passes the caller's folder to these.
# The dev organization has two AWS connections and some commands ignore the saved default account, so bin/stacktape
# names it for every command that takes one; a user with one connection never has to.
list_commands_with_arg() {
  (cd "$here/../../.." && bun -e "
    const { commandDefinitions } = await import('./src/config/cli/commands.ts');
    for (const [name, definition] of Object.entries(commandDefinitions)) {
      if ('$1' in (definition.args ?? {})) console.log(name);
    }
  ")
}
list_commands_with_arg currentWorkingDirectory > "$bench/commands-with-cwd.txt"
list_commands_with_arg awsAccount > "$bench/commands-with-aws-account.txt"

rm -rf "$bench/template"
cp -r "$here/../../../_test-stacks/mcp-shop-api" "$bench/template"
(cd "$bench/template" && npm install --silent --no-audit --no-fund)
echo "Prepared $bench"
