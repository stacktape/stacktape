# aws-profile:create

The `aws-profile:create` command creates a new AWS profile on your local machine. It prompts you for a profile name, AWS Access Key ID, and AWS Secret Access Key, then stores them in the default AWS credentials location in your home directory. Other AWS tools — including the AWS CLI — can use these profiles.

## Usage

```bash
stacktape aws-profile:create
```

The command is fully interactive. It walks you through three prompts:

1. **Profile name** — an arbitrary name for the profile. Leave blank to use `default`. A profile named `default` is used automatically when no `--awsProfile` flag is passed to other Stacktape commands.
2. **AWS Access Key ID** — the access key from your IAM user's security credentials.
3. **AWS Secret Access Key** — the corresponding secret key (input is masked).

If a profile with the chosen name already exists in your credentials or config file, the command fails with an error. Use [`aws-profile:update`](/cli/aws-profile-update) to change credentials for an existing profile. All prompts are handled interactively — there are no required flags.

## Flags


## CLI Options: `stacktape aws-profile:create`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |


## Examples

Create a profile named `default` (used automatically when no profile is specified):

```bash
stacktape aws-profile:create
```

When prompted for a profile name, press Enter without typing anything. The profile is saved as `default`.

Create a named profile for a specific AWS account or purpose:

```bash
stacktape aws-profile:create
```

When prompted, enter a name like `staging` or `production`. You can then pass `--awsProfile staging` to commands like [`deploy`](/cli/deploy) to use that profile's credentials.

Reduce log output to errors only:

```bash
stacktape aws-profile:create --logLevel error
```

## Where credentials are stored

Credentials are stored in the default AWS credentials location in your home directory. This is the same location used by the AWS CLI and AWS SDKs, so profiles created with Stacktape work with any AWS tooling on the same machine.


> **Info:** For Console-managed AWS access, see [Connecting your AWS account](/stacktape-console/connecting-your-aws-account).


## Related commands

- [`aws-profile:update`](/cli/aws-profile-update) — update credentials for an existing profile.
- [`aws-profile:delete`](/cli/aws-profile-delete) — remove a profile from your system.
- [`aws-profile:list`](/cli/aws-profile-list) — list all configured AWS profiles.
- [`login`](/cli/login) — configure your Stacktape API key (separate from AWS credentials).
