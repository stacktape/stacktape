# aws-profile:list

The `aws-profile:list` command prints every AWS profile configured on your machine. It displays each profile's name, access key ID, and a masked secret access key in a table. Use it to verify which profiles are available before deploying or to audit stored credentials.

## Usage

```bash
stacktape aws-profile:list
```

The command has no required flags. The CLI prints a table with three columns: **Profile**, **AWS_ACCESS_KEY_ID**, and **AWS_SECRET_ACCESS_KEY**. In the printed table, the secret access key is masked — the first 36 characters are replaced with asterisks, showing only the trailing characters.

If no profiles are configured, the command prints a warning and suggests creating one with [`aws-profile:create`](/cli/aws-profile-create).

## Options reference


## CLI Options: `stacktape aws-profile:list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |


## Examples

List all configured profiles.

```bash
stacktape aws-profile:list
```

List profiles with minimal log output.

```bash
stacktape aws-profile:list --logLevel error
```

## Related commands

- [`aws-profile:create`](/cli/aws-profile-create) — create a new AWS profile on your system.
- [`aws-profile:update`](/cli/aws-profile-update) — update credentials for an existing profile.
- [`aws-profile:delete`](/cli/aws-profile-delete) — remove a profile from your system.
