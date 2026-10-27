# logout

The `stacktape logout` command ends the CLI session that [`stacktape login`](/cli/login) created: Stacktape revokes it, so it stops working everywhere, and the CLI removes it from your system. The command takes no required flags. After logging out, commands that require a Stacktape API key need credentials configured again via [`stacktape login`](/cli/login). Use `logout` when switching accounts, removing credentials from a shared machine, or before storing a different API key.

## Usage

```bash
stacktape logout
```

`stacktape logout` revokes the stored CLI session, removes it from this system and prints a confirmation.

- When Stacktape cannot be reached, the CLI still removes the session from this system and says so. The session then stays valid until it expires or you revoke it on the Console's [API keys page](/stacktape-console/api-keys).
- When the stored key is a Console-made API key passed to `login --api-key`, the CLI only removes it from this system. The key stays valid for the pipelines that use it; revoke it in the Console if you no longer need it.

## When to use

Run `logout` when switching between Stacktape accounts or organizations, when removing local credentials from a shared machine, or before storing a different API key with `login`. If you need to verify which account is currently configured, use [`stacktape whoami`](/cli/info-whoami) before logging out.

## Command reference


## CLI Options: `stacktape logout`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--api-key` | no | `string` | API Key — Your Stacktape API key. Use this only in your own terminal or CI secret store. Do not paste API keys into chat transcripts, shell history, or logs. For local interactive use, prefer `stacktape login`. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`login`](/cli/login) — configure your Stacktape API key
- [`whoami`](/cli/info-whoami) — verify which user and organization your current API key belongs to
