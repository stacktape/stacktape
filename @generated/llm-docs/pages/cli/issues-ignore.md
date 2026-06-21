# issues:ignore

The `issues:ignore` command marks a runtime issue as ignored. Ignored issues will not reopen on new occurrences and will not generate alerts. You can reopen an ignored issue at any time with [`issues:reopen`](/cli/issues-reopen). Use this for errors you've reviewed and decided are not actionable, rather than [`issues:resolve`](/cli/issues-resolve) which will automatically reopen if the same error recurs.

## Usage

```bash
stacktape issues:ignore --issueId <issue-id>
```

You can find issue IDs by running [`issues:list`](/cli/issues-list). This command requires a Stacktape API key — run [`login`](/cli/login) first if this machine is not yet authenticated.

## Flags Reference

<CliCommandsApiReference command="issues:ignore" sortedArgs={[
  {
    "name": "issueId",
    "required": true,
    "alias": "iid",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Issue ID</p>\n",
    "longDescription": "<p>The ID of the issue to act on.</p>\n"
  },
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

## Examples

Ignore a specific issue by its ID:

```bash
stacktape issues:ignore --issueId iss_abc123def456
```

Use agent mode for scripted or CI workflows where you need structured JSON output:

```bash
stacktape issues:ignore --issueId iss_abc123def456 --agent
```

## When to Ignore vs Resolve

Use `issues:ignore` for errors you've reviewed and determined are not actionable — for example, recurring runtime errors that you've investigated and confirmed don't require a code fix. Ignored issues stay silent until you explicitly reopen them with [`issues:reopen`](/cli/issues-reopen).

Use [`issues:resolve`](/cli/issues-resolve) when you've fixed the root cause. A resolved issue will automatically reopen if the same error recurs, keeping you informed of regressions.

## Related Commands

- [`issues:list`](/cli/issues-list) — list detected runtime issues with filtering by status, project, or stage
- [`issues:resolve`](/cli/issues-resolve) — mark an issue as resolved (will reopen on recurrence)
- [`issues:reopen`](/cli/issues-reopen) — reopen a previously resolved or ignored issue
