# info:whoami

The `stacktape info:whoami` command shows the current user, organization, connected AWS accounts, and accessible projects for your configured API key. Use it to verify your authentication is set up correctly and confirm which organization and projects you can access.

## Usage

```bash
stacktape info:whoami
```

This command requires a valid API key. If you haven't logged in yet, run [`stacktape login`](/cli/login) first.

The output includes:

- **User** — your name, email, and user ID.
- **Organization** — the organization tied to your API key, including your displayed role, such as Owner, Admin, Developer, or Viewer.
- **Connected AWS accounts** — each account's name, AWS account ID, and connection state.
- **Projects** — all projects you can access in the current organization.
- **Permissions** — the result can include project-scoped API key metadata, including `isProjectScoped` and `permissions`, when the API returns those fields.

## Examples

Verify your identity and check which organization you're operating in.

```bash
stacktape info:whoami
```

Get machine-readable JSON output (one JSON object per line) for scripting or CI pipelines.

```bash
stacktape info:whoami --outputFormat jsonl
```

Enable debug-level logging to troubleshoot API key issues.

```bash
stacktape info:whoami --logLevel debug
```

## Flags

<CliCommandsApiReference command="info:whoami" sortedArgs={[
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

## Related commands

- [`login`](/cli/login) — configure your Stacktape API key.
- [`org:list`](/cli/org-list) — list all organizations you can access.
- [`projects:list`](/cli/projects-list) — list all projects and their deployed stages in your organization.
