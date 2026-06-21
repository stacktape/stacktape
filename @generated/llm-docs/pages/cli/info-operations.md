# info:operations

The `info:operations` command lists recent recorded Stacktape operations with their status. Each entry shows success or failure status, timestamps, and error descriptions for failed operations. Use filters to narrow results by project, stage, or the current API-key user.

## Usage

```bash
stacktape info:operations
```

`info:operations` returns the 25 most recent operations across all projects and stages in your organization. You must be logged in with a valid API key — run [`stacktape login`](/cli/login) first if you haven't already.

## Filtering results

Filter by project name to see operations for a single project.

```bash
stacktape info:operations --projectName my-api
```

Filter by stage to see operations for a specific stage across all projects.

```bash
stacktape info:operations --stage production
```

Combine `--projectName` and `--stage` to narrow results to a single project and stage.

```bash
stacktape info:operations --projectName my-api --stage production
```

Show only operations triggered by your own API key.

```bash
stacktape info:operations --currentUserOnly
```

## Controlling output size

By default, `info:operations` returns the 25 most recent operations. Use `--limit` to change this.

```bash
stacktape info:operations --limit 50
```

## Machine-readable output

Use `--agent` or `--outputFormat jsonl` to get machine-readable output suitable for scripts or AI coding agents. See the flags reference below for details on each output format.

```bash
stacktape info:operations --agent
```

## Flags reference

<CliCommandsApiReference command="info:operations" sortedArgs={[
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
    "name": "currentUserOnly",
    "required": false,
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Current User Only</p>\n",
    "longDescription": "<p>If <code>true</code>, only returns records created by the user that owns the active API key.</p>\n"
  },
  {
    "name": "limit",
    "required": false,
    "alias": "lim",
    "allowedTypes": [
      "number"
    ],
    "shortDescription": "<p> Limit</p>\n",
    "longDescription": "<p>Maximum number of items to return.</p>\n"
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
  },
  {
    "name": "projectName",
    "required": false,
    "alias": "prj",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Project Name</p>\n",
    "longDescription": "<p>The name of the Stacktape project for this operation.</p>\n"
  },
  {
    "name": "stage",
    "required": false,
    "alias": "s",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Stage</p>\n",
    "longDescription": "<p>The stage for the operation (e.g., <code>production</code>, <code>staging</code>, <code>dev-john</code>). You can set a default stage using the <code>defaults:configure</code> command. The maximum length is 12 characters.</p>\n"
  }
]} />

## Related commands

- [`info:stacks`](/cli/info-stacks) — list all deployed stacks in a region with their status and estimated spend.
- [`info:stack`](/cli/info-stack) — show detailed outputs and resources for a specific deployed stack.
- [`info:whoami`](/cli/info-whoami) — verify your API key and see which organization, AWS accounts, and projects you have access to.
