# login

The `stacktape login` command authenticates the Stacktape CLI on the current system. For local development, run it interactively and let the CLI handle browser/email sign-in and local auth state. For CI/CD, use a dedicated Stacktape API key stored in your CI provider's secret store.

## Usage

```bash
stacktape login
```

In interactive mode (the default), the command launches an auth flow that supports Google sign-in, email signup, email login, or manual API key entry. After successful authentication, Stacktape displays your user name and organization.

For CI/CD, prefer setting `STACKTAPE_API_KEY` as a masked secret in the runner environment. If you need an explicit login step, pass the key from the CI secret variable. Never paste an API key into an AI chat, issue tracker, shell transcript, or log.

```bash
stacktape login --api-key "$STACKTAPE_API_KEY" --agent
```

You can create CI keys from the [Stacktape Console's API keys page](/stacktape-console/api-keys). Manual API keys are bearer secrets and should be treated as shown-once credentials.

## What happens during login

Stacktape performs these steps when you run `login`:

1. **Authenticates you** — through the interactive Cognito-backed auth flow, or by verifying the API key supplied by a CI secret.
2. **Stores local auth state** — keeps the CLI session in the operating system's credential store (macOS Keychain, Windows Credential Manager or the Linux Secret Service). Where that store is unavailable, as is common in WSL, SSH sessions and containers, the session is kept in `~/.stacktape/persisted-state.json`, readable only by your user. Set `STACKTAPE_CREDENTIAL_STORE=file` to always use the file, for example on a machine whose credential store asks for a password on every command.
3. **Verifies access** — calls the Stacktape API to confirm your user, organization, and permissions.
4. **Displays your identity** — prints your user name and the organization the current auth state belongs to.

If the API key is invalid, Stacktape clears the key it attempted to save and reports an authentication error.

An interactive login creates a CLI session for the organization you choose. It ends 90 days after login, or after 30 days without use, whichever comes first; the CLI then asks you to run `stacktape login` again. [`stacktape logout`](/cli/logout) ends it immediately. Console-made API keys for CI keep the expiration chosen when they were created.


> **Info:** The `login` command itself does not require an existing API key — it is one of the commands that can run without prior authentication.


## Non-interactive login

For CI/CD pipelines and automated scripts, set `STACKTAPE_API_KEY` as a masked CI secret. The CLI can read this environment variable directly, so an explicit `login` step is often unnecessary. If your workflow does use `login`, pass the key from the secret variable and combine with `--agent` for programmatic output.

```bash
stacktape login --api-key "$STACKTAPE_API_KEY" --agent
```

Do not hardcode the key in workflow YAML. Reference the CI secret.

```bash
stacktape login --api-key "$STACKTAPE_API_KEY" --agent
```

## Flags reference


## CLI Options: `stacktape login`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--api-key` | no | `string` | API Key — Your Stacktape API key. Use this only in your own terminal or CI secret store. Do not paste API keys into chat transcripts, shell history, or logs. For local interactive use, prefer `stacktape login`. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

### Interactive login

Run `login` with no flags to start the interactive authentication flow. You will be guided through sign-in options including Google, email, or manual API key entry.

```bash
stacktape login
```

### Login with an API key in CI

Pass the API key directly, typically from a CI secret or environment variable.

```bash
stacktape login --api-key "$STACKTAPE_API_KEY"
```

### Verify your identity after login

After logging in, use [`whoami`](/cli/info-whoami) to verify your local Stacktape CLI authentication state and display the current user, organization, connected AWS accounts, and accessible projects.

```bash
stacktape whoami
```

### Switch to a different user or organization

For local development, run `stacktape login` again and choose the user or organization you want to use. In CI, update the `STACKTAPE_API_KEY` secret to a key from the target organization.

```bash
stacktape login
```

## Related commands

- [`logout`](/cli/logout) — removes Stacktape authentication state from the current system.
- [`whoami`](/cli/info-whoami) — displays the current user, organization, and connected AWS accounts.
- [`org create`](/cli/org-create) — creates a new organization and returns organization credentials.
- [`org list`](/cli/org-list) — lists all organizations accessible with your current user.

## FAQ

### Where do I find my Stacktape API key?

Create CI/API keys from the [Stacktape Console's API keys page](https://console.stacktape.com/api-keys). Manual keys are scoped to an organization, expire by default, and are shown only once. See [API keys](/stacktape-console/api-keys) for details on managing keys.

### Do I need an explicit `login` step in CI/CD?

Usually no. If you store a dedicated API key as a CI secret and expose it as `STACKTAPE_API_KEY`, the CLI reads that environment variable directly, so commands like `deploy` work without a separate `login` step. If your workflow does use `login`, pass the key from the secret variable and combine with `--agent` for output optimized for programmatic consumption. See the [custom CI/CD guide](/ci-cd-and-gitops/custom-ci-cd) for full pipeline setup.

### What happens if I log in with an invalid API key?

If verification fails during `login`, Stacktape clears the API key it attempted to save and reports an authentication error. You can then retry with the correct key.

### How do I switch between organizations?

For local development, run `stacktape login` again and choose the desired account or organization. For CI, create a key in the target organization and update the `STACKTAPE_API_KEY` secret. Use [`org list`](/cli/org-list) to list organizations accessible with the current Stacktape user.

### Does login expire?

Interactive local auth state remains available until you replace or remove it. Manual API keys used in CI expire according to the key's expiration setting. Use [`logout`](/cli/logout) to remove local auth state.

### Does `login` connect my AWS account?

No. The `login` command only authenticates the Stacktape CLI with Stacktape. AWS account connection is separate from login; see [connecting your AWS account](/stacktape-console/connecting-your-aws-account) for details. Deploying is handled by [`deploy`](/cli/deploy).

### Should team members share one API key?

No. Use a separate key per integration point and prefer individual interactive login on developer machines. Sharing a key makes attribution, rotation, and revocation harder. Treat local auth state as credential material — don't read it into chat, copy it into scripts, or use it to hand-build `STACKTAPE_API_KEY` values — and remove it with [`logout`](/cli/logout) when no longer needed.
