# aws-profile list

`stacktape aws-profile list` prints the AWS profiles in your AWS credentials file (`~/.aws/credentials`) that hold a static access key pair. For each one it shows the name, the access key ID and a masked secret access key. Use it to check which static keys are on this machine, for example before you [update](/cli/aws-profile-update) or [delete](/cli/aws-profile-delete) one.

SSO and role profiles live in `~/.aws/config` without static keys, so they are not listed even when they work. To check that a profile works, run `aws sts get-caller-identity --profile <name>`, or pass `--profile <name>` to any Stacktape command.

## Usage

```bash
stacktape aws-profile list
```

```text
Profile      AWS_ACCESS_KEY_ID        AWS_SECRET_ACCESS_KEY
default      <access key ID>          ************************************abcd
production   <access key ID>          ************************************wxyz
```

Only the last 4 characters of each secret access key are shown, in the terminal and in the `--agent` result. Add `--show-secrets` to print the whole keys. When the file has no static key pair, the command says so and suggests [`aws-profile create`](/cli/aws-profile-create).

## Options


## CLI Options: `stacktape aws-profile list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--show-secrets` | no | `boolean` | Show Secrets — If `true`, the command includes secret values in its output: database passwords, connection strings with credentials and other stack parameters Stacktape stores as sensitive, and the value a `secret get` reads. Without it, each of them is `>` in the terminal, in JSON output and in the stack-info file. Use it only where the output stays private, never in shared CI logs. | - |


## Related commands

- [`aws-profile create`](/cli/aws-profile-create) adds a profile with static keys.
- [`aws-profile update`](/cli/aws-profile-update) replaces the keys of a profile.
- [`aws-profile delete`](/cli/aws-profile-delete) removes a profile.
