# aws-profile:delete

The `aws-profile:delete` command removes an AWS profile from your system. It reads profiles from both the AWS credentials file (`~/.aws/credentials`) and the AWS config file (`~/.aws/config`), deduplicates them, presents them in an interactive selector, and deletes the chosen profile. Use this when you need to clean up stale or unused AWS profiles from your local machine. If no profiles exist, the command exits with an error.

## Usage

```bash
stacktape aws-profile:delete
```

The command is fully interactive — it reads all profiles configured in your AWS credentials and config files, then prompts you to select which one to delete. No flags are required.


> **Warning:** This command modifies your local AWS profile configuration by deleting the selected profile. The deleted profile will no longer be available to Stacktape or any other AWS tooling on your system.


## Arguments reference


## CLI Options: `stacktape aws-profile:delete`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |


## Examples

Delete a profile with debug logging enabled:

```bash
stacktape aws-profile:delete --logLevel debug
```

## Related commands

- [`aws-profile:create`](/cli/aws-profile-create) — create a new AWS profile on your system.
- [`aws-profile:update`](/cli/aws-profile-update) — update credentials for an existing AWS profile.
- [`aws-profile:list`](/cli/aws-profile-list) — list all AWS profiles configured on your system.
