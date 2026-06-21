# org:delete

The `stacktape org:delete` command removes your access to a Stacktape organization. Use it when you need to permanently leave an organization you own. The command enforces two safety constraints before proceeding: all other non-service users must already be removed, and all AWS accounts must be disconnected from the organization. In interactive mode you select the target organization and confirm; in agent mode, pass `--organizationId` directly.

## Usage

Run `org:delete` without flags for the interactive flow, or pass `--agent` and `--organizationId` for non-interactive use in CI and agent workflows.

```bash
stacktape org:delete
```

In interactive mode, you select from a list of your organizations and confirm removing your access. In agent mode, pass `--organizationId` directly.

```bash
stacktape org:delete --agent --organizationId "org_abc123"
```

## Prerequisites

Before you can remove your access to an organization:

1. Remove all non-service users (other team members must be removed first).
2. Disconnect all AWS accounts from the organization.
3. You must be the organization OWNER.

If any of these conditions are not met, the operation will fail.


> **Warning:** This operation removes your access to the organization. Make sure you have another way to access anything you still need before continuing.


## Flags reference

The `org:delete` command accepts the following flags. None are required in interactive mode; agent mode requires `--organizationId`.

<CliCommandsApiReference command="org:delete" sortedArgs={[
  {
    "name": "agent",
    "required": false,
    "alias": "ag",
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Agent Mode</p>\n",
    "longDescription": "<p>Optimizes CLI output for programmatic/LLM consumption:</p>\n<ul>\n<li>Uses strict JSONL/NDJSON output (one JSON object per line)</li>\n<li>Disables interactive terminal UI</li>\n<li>Automatically confirms operations (equivalent to --autoConfirmOperation)\nFor dev command: also enables HTTP server for programmatic control.</li>\n</ul>\n"
  },
  {
    "name": "logLevel",
    "required": false,
    "alias": "ll",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "info",
      "debug",
      "error"
    ],
    "shortDescription": "<p> Log Level</p>\n",
    "longDescription": "<p>The level of logs to print to the console.</p>\n<ul>\n<li><code>info</code>: Basic information about the operation.</li>\n<li><code>error</code>: Only errors.</li>\n<li><code>debug</code>: Detailed information for debugging.</li>\n</ul>\n"
  },
  {
    "name": "organizationId",
    "required": false,
    "alias": "oid",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Organization ID</p>\n",
    "longDescription": "<p>The ID of the Stacktape organization.</p>\n"
  },
  {
    "name": "outputFormat",
    "required": false,
    "alias": "ofmt",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "jsonl",
      "plain",
      "tty"
    ],
    "shortDescription": "<p> Output Format</p>\n",
    "longDescription": "<p>Controls the CLI output format:</p>\n<ul>\n<li><code>jsonl</code>: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.</li>\n<li><code>plain</code>: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.</li>\n<li><code>tty</code>: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.\nIf not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl.</li>\n</ul>\n"
  }
]} />

## Examples

List your organizations first, then remove access to one by ID. Without `--agent`, passing `--organizationId` skips the organization picker but still asks for confirmation.

```bash
stacktape org:list
```

```bash
stacktape org:delete --organizationId "org_abc123"
```

Non-interactive removal in CI or agent workflows:

```bash
stacktape org:delete --agent --organizationId "org_abc123"
```

## Related commands

Other organization management commands and the whoami command for verifying your current context.

- [`org:create`](/cli/org-create) — create a new organization
- [`org:list`](/cli/org-list) — list all organizations accessible to your user
- [`info:whoami`](/cli/info-whoami) — verify your current user, organization, and access
