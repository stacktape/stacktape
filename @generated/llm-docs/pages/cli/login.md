# login

The `stacktape login` command configures your Stacktape API key on the current system. After logging in, all subsequent Stacktape operations are associated with the user and organization linked to that API key. You can provide the key directly via `--apiKey` or enter it through an interactive authentication flow.

## Usage

```bash
stacktape login
```

In interactive mode (the default), the command launches an auth flow that supports Google sign-in, email signup, email login, or manual API key entry. After successful authentication, Stacktape displays your user name and organization.

To skip the interactive flow, pass the API key directly.

```bash
stacktape login --apiKey sk-your-api-key
```

This is useful in CI/CD environments or when scripting. You can get your API key from the [Stacktape Console's API keys page](/stacktape-console/api-keys).

## What happens during login

Stacktape performs these steps when you run `login`:

1. **Collects your API key** — either from the `--apiKey` flag or through the interactive auth flow.
2. **Saves the key locally** — stores the API key on your system so subsequent commands use it automatically.
3. **Verifies the key** — calls the Stacktape API to confirm the key is valid and retrieves your user and organization data.
4. **Displays your identity** — prints your user name and the organization the key belongs to.

If the API key is invalid, Stacktape clears the key it attempted to save and reports an authentication error.


> **Info:** The `login` command itself does not require an existing API key — it is one of the commands that can run without prior authentication.


## Non-interactive login

For CI/CD pipelines, automated scripts, or AI agent workflows, use the `--apiKey` flag to skip the interactive prompt. Combine with `--agent` to optimize output for programmatic consumption, as described in the flags reference below.

```bash
stacktape login --apiKey sk-your-api-key --agent
```

Store the API key as a CI secret and reference it as an environment variable.

```bash
stacktape login --apiKey "$STACKTAPE_API_KEY" --agent
```

## Flags reference


## CLI Options: `stacktape login`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--apiKey (-ak)` | no | `string` | API Key Your Stacktape API key. You can get your key from the [Stacktape console](https://console.stacktape.com/api-keys). | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |


## Examples

### Interactive login

Run `login` with no flags to start the interactive authentication flow. You will be guided through sign-in options including Google, email, or manual API key entry.

```bash
stacktape login
```

### Login with an API key in CI

Pass the API key directly, typically from a CI secret or environment variable.

```bash
stacktape login --apiKey "$STACKTAPE_API_KEY"
```

### Verify your identity after login

After logging in, confirm which user and organization are active with [`info:whoami`](/cli/info-whoami).

```bash
stacktape info:whoami
```

### Switch to a different user or organization

Logging in with a different API key changes the user and organization used by subsequent commands. Generate a new key in the target organization from the [Stacktape Console's API keys page](/stacktape-console/api-keys), then run `login` again.

```bash
stacktape login --apiKey sk-different-key
```

## Related commands

- [`logout`](/cli/logout) — removes the stored API key from the current system.
- [`info:whoami`](/cli/info-whoami) — displays the current user, organization, and connected AWS accounts.
- [`org:create`](/cli/org-create) — creates a new organization and returns a new API key for it.
- [`org:list`](/cli/org-list) — lists all organizations accessible with your current user.

## FAQ

### Where do I find my Stacktape API key?

You can get your API key from the [Stacktape Console's API keys page](https://console.stacktape.com/api-keys). The API key is linked to your user and organization. See [API keys](/stacktape-console/api-keys) for details on managing keys.

### Can I use `login` in a CI/CD pipeline?

Yes. Pass the API key via `--apiKey` so no interactive prompt is needed. Combine with `--agent` for output optimized for programmatic consumption. Store the key as a CI secret and reference it as an environment variable. See the [custom CI/CD guide](/ci-cd-and-gitops/custom-ci-cd) for full pipeline setup.

### What happens if I log in with an invalid API key?

If verification fails during `login`, Stacktape clears the API key it attempted to save and reports an authentication error. You can then retry with the correct key.

### How do I switch between organizations?

Logging in with a different API key changes the user and organization used by all subsequent Stacktape CLI commands. Generate a new API key in the target organization from the [Stacktape Console](/stacktape-console/api-keys) and run `stacktape login --apiKey <new-key>`. Use [`org:list`](/cli/org-list) to see which organizations you have access to.

### Does login expire?

The CLI stores the API key locally until you run [`logout`](/cli/logout) or log in with another key. A successfully saved API key remains the local Stacktape credential until one of those actions replaces or removes it.

### Does `login` connect my AWS account?

No. The `login` command only authenticates you with Stacktape. Connecting an AWS account to your organization is a separate step handled through the [Stacktape Console](/stacktape-console/connecting-your-aws-account). Deploying is handled by [`deploy`](/cli/deploy), which requires `--stage` and `--region`.

### What authentication methods does the interactive flow support?

The interactive auth flow supports Google sign-in, email signup, email login, and manual API key entry. If you already have an API key, you can skip the interactive flow entirely by passing `--apiKey`.

### Can multiple team members use the same API key?

Each API key is linked to a specific user and organization. For team workflows, each member should use their own API key so that operations are attributed to the correct user. Manage team access through the [Stacktape Console](/stacktape-console/team-and-access-control).

### How is the API key stored locally?

Stacktape saves the API key to local storage on your system during the `login` flow. The key is used automatically by all subsequent CLI commands. Remove it with [`logout`](/cli/logout) when you no longer need it on that machine.
