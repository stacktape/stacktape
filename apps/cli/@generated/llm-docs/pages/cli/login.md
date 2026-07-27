# login

The `stacktape login` command authenticates the Stacktape CLI on the current system. For local development, run it interactively and let the CLI handle browser/email sign-in and local auth state. For CI/CD, use a dedicated Stacktape API key stored in your CI provider's secret store.

## Usage

```bash
stacktape login
```

In interactive mode (the default), the command launches an auth flow that supports Google sign-in, email signup, email login, or manual API key entry. After successful authentication, Stacktape displays your user name and organization.

For CI/CD, prefer setting `STACKTAPE_API_KEY` as a masked secret in the runner environment. If you need an explicit login step, pass the key from the CI secret variable. Never paste an API key into an AI chat, issue tracker, shell transcript, or log.

```bash
stacktape login --apiKey "$STACKTAPE_API_KEY" --agent
```

You can create CI keys from the [Stacktape Console's API keys page](/stacktape-console/api-keys). Manual API keys are bearer secrets and should be treated as shown-once credentials.

## What happens during login

Stacktape performs these steps when you run `login`:

1. **Authenticates you** — through the interactive Cognito-backed auth flow, or by verifying the API key supplied by a CI secret.
2. **Stores local auth state** — saves the authentication state needed by subsequent CLI commands on this system.
3. **Verifies access** — calls the Stacktape API to confirm your user, organization, and permissions.
4. **Displays your identity** — prints your user name and the organization the current auth state belongs to.

If the API key is invalid, Stacktape clears the key it attempted to save and reports an authentication error.


> **Info:** The `login` command itself does not require an existing API key — it is one of the commands that can run without prior authentication.


## Non-interactive login

For CI/CD pipelines and automated scripts, set `STACKTAPE_API_KEY` as a masked CI secret. The CLI can read this environment variable directly, so an explicit `login` step is often unnecessary. If your workflow does use `login`, pass the key from the secret variable and combine with `--agent` for programmatic output.

```bash
stacktape login --apiKey "$STACKTAPE_API_KEY" --agent
```

Do not hardcode the key in workflow YAML. Reference the CI secret.

```bash
stacktape login --apiKey "$STACKTAPE_API_KEY" --agent
```

## Flags reference


## CLI Options: `stacktape login`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--apiKey (-ak)` | no | `string` | API Key Your Stacktape API key. Use this only in your own terminal or CI secret store. Do not paste API keys into chat transcripts, shell history, or logs. For local interactive use, prefer `stacktape login`. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
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

After logging in, use [`info:whoami`](/cli/info-whoami) to verify your local Stacktape CLI authentication state and display the current user, organization, connected AWS accounts, and accessible projects.

```bash
stacktape info:whoami
```

### Switch to a different user or organization

For local development, run `stacktape login` again and choose the user or organization you want to use. In CI, update the `STACKTAPE_API_KEY` secret to a key from the target organization.

```bash
stacktape login
```

## Related commands

- [`logout`](/cli/logout) — removes Stacktape authentication state from the current system.
- [`info:whoami`](/cli/info-whoami) — displays the current user, organization, and connected AWS accounts.
- [`org:create`](/cli/org-create) — creates a new organization and returns organization credentials.
- [`org:list`](/cli/org-list) — lists all organizations accessible with your current user.

## FAQ

### Where do I find my Stacktape API key?

Create CI/API keys from the [Stacktape Console's API keys page](https://console.stacktape.com/api-keys). Manual keys are scoped to an organization, expire by default, and are shown only once. See [API keys](/stacktape-console/api-keys) for details on managing keys.

### Do I need an explicit `login` step in CI/CD?

Usually no. If you store a dedicated API key as a CI secret and expose it as `STACKTAPE_API_KEY`, the CLI reads that environment variable directly, so commands like `deploy` work without a separate `login` step. If your workflow does use `login`, pass the key from the secret variable and combine with `--agent` for output optimized for programmatic consumption. See the [custom CI/CD guide](/ci-cd-and-gitops/custom-ci-cd) for full pipeline setup.

### What happens if I log in with an invalid API key?

If verification fails during `login`, Stacktape clears the API key it attempted to save and reports an authentication error. You can then retry with the correct key.

### How do I switch between organizations?

For local development, run `stacktape login` again and choose the desired account or organization. For CI, create a key in the target organization and update the `STACKTAPE_API_KEY` secret. Use [`org:list`](/cli/org-list) to list organizations accessible with the current Stacktape user.

### Does login expire?

Interactive local auth state remains available until you replace or remove it. Manual API keys used in CI expire according to the key's expiration setting. Use [`logout`](/cli/logout) to remove local auth state.

### Does `login` connect my AWS account?

No. The `login` command only authenticates the Stacktape CLI with Stacktape. AWS account connection is separate from login; see [connecting your AWS account](/stacktape-console/connecting-your-aws-account) for details. Deploying is handled by [`deploy`](/cli/deploy).

### Should team members share one API key?

No. Use a separate key per integration point and prefer individual interactive login on developer machines. Sharing a key makes attribution, rotation, and revocation harder. Treat local auth state as credential material — don't read it into chat, copy it into scripts, or use it to hand-build `STACKTAPE_API_KEY` values — and remove it with [`logout`](/cli/logout) when no longer needed.
