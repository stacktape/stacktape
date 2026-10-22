# project create

The `project create` command creates a new project in the current Stacktape organization. Use it before deploying stages under a new project name, or in automation when you need to create the project non-interactively. You must be logged in with a valid API key before running this command.

## Usage

```bash
stacktape project create
```

In interactive mode, you are prompted for the project name. Project names must use lowercase letters, numbers, and dashes only. To skip the prompt, pass the name directly.

```bash
stacktape project create my-api
```

In agent mode (`--agent`), you must provide the project name as an argument (`project create <project>`). You can also pass an optional `--region` when creating the project.

## CLI reference


## CLI Options: `stacktape project create`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--project (positional 1)` | no | `string` | Project Name — The name of the Stacktape project for this operation. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `-r, --region` | no | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |


## Examples

Create a project interactively (you will be prompted for the name):

```bash
stacktape project create
```

Create a project non-interactively:

```bash
stacktape project create payments-service
```

Create a project with a region and machine-readable output:

```bash
stacktape project create payments-service --region eu-west-1 --agent
```

## Related commands

- [`project list`](/cli/project-list) — List all projects in your organization with their stages and costs.
- [`org create`](/cli/org-create) — Create a new organization (projects live inside organizations).
- [`deploy`](/cli/deploy) — Deploy a stage to a project.
