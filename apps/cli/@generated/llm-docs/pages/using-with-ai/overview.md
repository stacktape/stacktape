# Coding agents overview

Stacktape works with coding agents such as Claude Code, Codex and Cursor through an MCP server that runs on your machine. The agent can look up the Stacktape docs, read your project, run dev mode and read logs and metrics. It asks you before it changes anything in AWS. The MCP server is in preview, so its tools can still change between releases.

## Set up your agent

```bash
stacktape mcp add
```

The command finds the coding agents on your machine (Claude Code, Codex, Cursor, VS Code with GitHub Copilot, GitHub Copilot CLI, Windsurf and OpenCode), adds the Stacktape MCP server to each one you pick, and checks that the server starts. Then start a new session in your agent and ask it to "use Stacktape to show what this project deploys".

[MCP server](/using-with-ai/mcp-server-setup) covers what the command changes, setup for other agents and troubleshooting. [`stacktape mcp remove`](/cli/mcp-remove) undoes it.

The server uses the CLI's sign-in and your AWS credentials. Deploys, dev mode, logs and metrics work without a Stacktape account. Incidents and error tracking need the [Console](/stacktape-console/console-overview).

## What you can ask it to do

### Write or change the config

The agent searches the Stacktape docs instead of guessing config syntax, and scans your project for config files and deploy scripts.

For a project without a config, run [`stacktape init`](/cli/init) in your terminal. It can use Claude Code or Codex on your machine to read the code, and you review the result before anything is saved or deployed. The MCP server refuses to run `init` for the agent, because init needs your answers in its wizard.

### Build and test in dev mode

The agent starts [dev mode](/local-development/dev-mode-overview), rebuilds workloads after it edits code, reads their logs and queries the local databases until the code works. [Agent mode in dev](/using-with-ai/agent-mode-in-dev) describes the HTTP API it uses.

Dev mode changes your AWS account. The first start deploys a dev stack for the stage, and Lambda functions run in AWS while containers and databases run on your machine. The agent can start dev mode without asking you, unless the CLI itself needs a yes, for example to create a project that does not exist yet.

### Deploy and preview changes

`deploy`, `diff`, `rollback`, `secret set` and every other command that changes AWS wait for your go-ahead. The agent plans the command, shows you what it will run, and runs it only after you approve in the conversation.

`diff` is in this group because it is not only a preview: before it compares, it can create secrets and it uploads a template to your account. See [what diff changes](/cli/diff#what-diff-changes-in-aws).

Destructive commands, such as `delete` and `secret delete`, need more than your message in the chat. The MCP server asks you directly in the agent's confirmation form, so the agent can't confirm for you. An agent without that form can't run them; run them in your terminal.

### Investigate a deployed stack

The agent reads logs, metrics, alarms, stack state and AWS resources without asking. It can also run read-only queries against your deployed databases. For an incident, it starts with the incident's signals, evidence, release changes and AI assessment, which come from the Console.

The Console can also start a coding agent on the project's runner to investigate an incident or propose a fix as a draft pull request. See [AI investigation and fixes](/observability/incident-ai).

## What runs without asking

| Commands | Through MCP |
|---|---|
| Read-only, such as `logs`, `metrics`, `alarm list`, `status`, `stack list` and `incident show` | Run directly |
| `query sql`, `query dynamodb`, `query redis`, `query opensearch` and `aws call` | Run directly, and the server refuses anything that is not a read |
| Local: `synth`, `validate` and `package` | Run directly |
| Changes, such as `deploy`, `diff`, `rollback`, `secret set` and `domain add` | Wait for your go-ahead |
| Destructive, such as `delete` and `secret delete` | Wait for your answer in the agent's confirmation form |
| Interactive: `init`, `login`, `connect`, `dev` and shells | Refused; run them in your terminal. Dev mode runs through the dev tool instead. |

Secret values come back as `<<OMITTED>>`, and known credential patterns, such as API keys and connection strings with passwords, are removed from every answer. Everything else the agent reads, such as log lines and query results, comes back as it is. Think about what you let an agent read from production.

The agent never handles your keys. The server refuses Stacktape API keys passed as arguments and tells agents not to read credential files. When a command fails on sign-in, run [`stacktape login`](/cli/login) in your own terminal.

## Next steps

- [MCP server](/using-with-ai/mcp-server-setup): setup for each agent, the five tools and the full safety model.
- [Agent mode in dev](/using-with-ai/agent-mode-in-dev): the dev mode HTTP API, for agents and your own scripts.
- [AI investigation and fixes](/observability/incident-ai): hosted runs that start from an incident in the Console.
