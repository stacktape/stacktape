# aws-profile list

The `aws-profile list` command prints every AWS profile configured on your machine. It displays each profile's name, access key ID, and a masked secret access key in a table. Use it to verify which profiles are available before deploying or to audit stored credentials.

## Usage

```bash
stacktape aws-profile list
```

The command has no required flags. The CLI prints a table with three columns: **Profile**, **AWS_ACCESS_KEY_ID**, and **AWS_SECRET_ACCESS_KEY**. The secret access key is masked: the first 36 characters are replaced with asterisks, showing only the last 4. The `--agent` result masks it the same way. Pass `--show-secrets` to print and return the whole key.

If no profiles are configured, the command prints a warning and suggests creating one with [`aws-profile create`](/cli/aws-profile-create).

## Options reference


## CLI Options: `stacktape aws-profile list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--show-secrets` | no | `boolean` | Show Secrets — If `true`, the command includes secret values in its output: database passwords, connection strings with credentials and other stack parameters Stacktape stores as sensitive, and the value a `secret get` reads. Without it, each of them is `<<OMITTED>>` in the terminal, in JSON output and in the stack-info file. Use it only where the output stays private, never in shared CI logs. | - |


## Examples

List all configured profiles.

```bash
stacktape aws-profile list
```

List profiles with minimal log output.

```bash
stacktape aws-profile list --log-level error
```

## Related commands

- [`aws-profile create`](/cli/aws-profile-create) — create a new AWS profile on your system.
- [`aws-profile update`](/cli/aws-profile-update) — update credentials for an existing profile.
- [`aws-profile delete`](/cli/aws-profile-delete) — remove a profile from your system.
