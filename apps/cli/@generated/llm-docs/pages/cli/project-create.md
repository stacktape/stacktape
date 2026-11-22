# project create

`stacktape project create` creates a project in your organization in the Stacktape Console. You rarely need it: a signed-in deploy creates a missing project itself, and asks first when the name comes from `--project` rather than the config. Use it to set up a project before its first deploy, for example from a script. It needs a Console sign-in ([`stacktape login`](/cli/login) or `STACKTAPE_API_KEY`).

## Usage

```bash
stacktape project create payments-service
```

Names use lowercase letters, numbers and dashes. In a terminal you can leave the name out and the CLI asks for it. With `--agent` there is no prompt, so the name is required.

```bash
stacktape project create payments-service --region eu-west-1 --agent
```

## Options


## CLI Options: `stacktape project create`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--project (positional 1)` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `-r, --region` | no | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |


## Related commands

- [`project list`](/cli/project-list) lists the projects of your organization with their stages.
- [`deploy`](/cli/deploy) deploys a stage of a project.
- [`project delete`](/cli/project-delete) removes a project without stages.
