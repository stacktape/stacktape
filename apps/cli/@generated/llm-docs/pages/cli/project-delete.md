# project delete

The `project delete` command deletes a project from the current Stacktape organization. The Console removes the
project with its deploy history, stage settings and build runner. Use it to clean up projects you no longer need, such
as test projects created by automation.

The command never deletes AWS stacks. If the project still has deployed stages in a connected AWS account, it refuses,
lists the stages and prints the [`stacktape delete`](/cli/delete) command for each of them. Delete those stages first,
then run `project delete` again.

You need the `projects:delete` permission on the project. Owners and Admins have it.

## Usage

```bash
stacktape project delete my-api
```

In a terminal, you confirm by typing the project name. Without a terminal, for example in CI, add `--yes`. Agent mode
(`--agent`) and the Stacktape MCP server confirm the deletion themselves, as they do for `stacktape delete`.

## CLI reference


## CLI Options: `stacktape project delete`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-y, --yes` | no | `boolean` | Auto-Confirm Operation — If `true`, automatically confirms prompts during `deploy` or `delete` operations, skipping the manual confirmation step. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--project (positional 1)` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

Delete a project and confirm by typing its name:

```bash
stacktape project delete payments-service
```

Delete a test project in a script or CI job:

```bash
stacktape project delete e2e-run-42 --yes
```

A project with a deployed stage is kept, and the output tells you what to delete first:

```text
Project payments-service still has 1 deployed stage: staging (eu-west-1, AWS account main). Deleting the
project never deletes stacks, so it was kept.

Hints:
  → Delete the stage first:
  → stacktape delete --stage staging --region eu-west-1 --project payments-service --aws-account main
  → Then run stacktape project delete --project payments-service again.
```

With `--agent`, the result's `data.deployedStages` lists the same stages.

## Related commands

- [`delete`](/cli/delete) — Delete a deployed stage and its AWS resources.
- [`project list`](/cli/project-list) — List projects with their deployed stages.
- [`project create`](/cli/project-create) — Create an empty project.
