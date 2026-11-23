# rollback

`stacktape rollback` puts a deployed stack back on an earlier release. It deploys that release's CloudFormation template with its stored Lambda zips and container images, so nothing is rebuilt.

## Usage

Roll back to the release before the current one:

```bash
stacktape rollback --region eu-west-1 --stage production
```


> **Warning:** Rollback restores infrastructure and code, not data. Database migrations and objects your app wrote stay as they are, so code rolled back past a schema migration can fail. Plan that recovery separately.


Every deploy that changed something is a release, including fast deployments that only updated code. `--region` is the only required flag; `--stage` and `--project` pick the stack, and no config file is needed. A stack stuck in `UPDATE_ROLLBACK_FAILED` can't take a rollback: use [`stack recover`](/cli/cf-rollback) instead. A stack in `UPDATE_FAILED` works with either command.

Roll back to a specific version:

```bash
stacktape rollback --region eu-west-1 --stage production --target-version v000003
```

Roll back multiple steps:

```bash
stacktape rollback --region eu-west-1 --stage production --rollback-steps 3
```

List available versions before deciding:

```bash
stacktape rollback --region eu-west-1 --stage production --list-versions
```

## Important flags

### `--target-version`

Specifies the exact deployment version to roll back to, for example `v000003`. Versions commonly use values like `v000001`, `v000003`; when `--rollback-steps` is used, Stacktape calculates a six-digit zero-padded target. Use `--list-versions` to see which versions are available in your deployment bucket.

### `--rollback-steps`

Number of stored releases to step back from the current one. Defaults to `1` (the previous release). For example, if the current release is `v000008` and all older releases are still stored, `--rollback-steps 3` targets `v000005`. Releases removed by `previousVersionsToKeep` are skipped. If neither `--target-version` nor `--rollback-steps` is provided, the command rolls back one version.

Targeting the current release re-applies it. Use this when a fast deployment failed partway and left some functions or services on other code.

### `--list-versions`

When previous versions exist, the command prints the current version and the available rollback versions, then exits without rolling back. If no previous versions exist, it reports that none were found. Use this to inspect what's available before committing to a rollback.

### `--config`

Rollback doesn't read a config file. The flag is accepted, but it isn't needed.

## How rollback works

Stacktape keeps the CloudFormation template and the deployment artifacts of each release in the stack's deployment bucket. When you run `rollback`, it copies the stored template into a new release and asks CloudFormation to deploy it:


## Flow
1. **Version resolution**: The target version is --target-version, or the release --rollback-steps steps back among the stored releases.
2. **Artifact verification**: Stacktape verifies that artifacts for the target version are available in the deployment bucket before proceeding.
3. **Safety check**: The command reads rollback safety metadata from the deployed stack, when present, and prints warnings for directives, TypeScript transforms, custom directives, or after:deploy hooks.
4. **Template preparation**: The old CloudFormation template is downloaded and stored as a new release. The function code and container images it uses are copied under the new release, so CloudFormation updates every function and container service to the restored code, including those a fast deployment changed.
5. **Deployment**: CloudFormation applies the rollback template. Lambda zips and container images are reused, not rebuilt. Every container service runs a rolling deployment, even one whose code did not change.
6. **Bucket content restoration**: If the stack includes static hosting with bucket-synced content, Stacktape attempts to restore the bucket contents from a version manifest.


Each rollback is a new release: rolling back from `v000008` to `v000005` produces `v000009`. To roll forward again, deploy as usual or roll back to the release you came from.

## Safety warnings

The rollback command reads rollback safety metadata from the deployed stack and warns about situations where a template-only rollback may not fully restore the previous behavior:

- **Directives that embed local or external state** — directives such as `$File` are reported by name. The rolled-back template contains values from the original deploy time, not from your current local files. This is expected behavior for a rollback.
- **TypeScript transforms** — if rollback safety metadata reports that the config uses TypeScript transforms, Stacktape warns that those transforms are not captured in the CloudFormation template.
- **`after:deploy` hooks** — when rollback safety metadata reports `after:deploy` hooks, Stacktape warns that they will not be re-executed during rollback. If the original deployment relied on post-deploy scripts (database seeding, cache warming), you may need to run them manually.
- **Custom directives** — custom directive results were baked into the template at deploy time and are not re-evaluated during rollback.

If the stack was deployed before rollback support was added, the safety metadata may be missing. The rollback still proceeds, but with a warning that results may be unpredictable if the config used `$File`, TypeScript transforms, custom directives, or `after:deploy` hooks.

Shared-layer fast deployments check that the old handler can run on the new layer before attaching it. They do not require the new handler to run on the old layer. CloudFormation restores code and layers separately during rollback: across an edit that added a used export, restoring the old layer first can briefly fail invocations until the old handler is restored. The forward deployment prints a note when it detects this incompatibility. Rollbacks across several releases can also cross incompatible chunk generations. The final restored code and layers are consistent; rollback does not guarantee uninterrupted invocations during that transition.

## Version availability

Use `--list-versions` to see which versions are still available. If a target version is not found in the deployment bucket, Stacktape reports that it was not found, lists the versions that are available, and notes that old versions may have been cleaned up based on the `previousVersionsToKeep` setting.

## Bucket-synced content

If the stack includes static hosting with bucket-synced content, Stacktape attempts to restore the bucket contents from a version manifest stored during the original deployment. If Stacktape cannot restore bucket-synced content, it warns that stacks with static websites may need to be redeployed from the original commit.

## Examples

### Rollback in CI/CD

`--agent` prints JSONL and never prompts:

```bash
stacktape rollback --region eu-west-1 --stage production --rollback-steps 1 --agent
```

## FAQ

### What is the difference between `rollback` and `stack recover`?

Use `rollback` when the deploy worked but the app is broken: it deploys an earlier release as a new one. Use [`stack recover`](/cli/cf-rollback) when the deploy itself failed and left the stack in `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED`: it runs CloudFormation's own recovery.

### How far back can I roll back?

As far as the stored releases go. `previousVersionsToKeep` decides how many older releases keep their artifacts; once they're removed, you can't roll back to that release. `--list-versions` shows what is still available.

## Options


## CLI Options: `stacktape rollback`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. Without it, Stacktape uses the one `stacktape.ts`, `stacktape.yml`, `stacktape.yaml` or `stacktape.js` in the working directory. When there are several, the command stops and asks you to choose one with this option. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--list-versions` | no | `boolean` | List Versions — Lists available deployment versions that can be rolled back to, then exits without performing a rollback. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--rollback-steps` | no | `number` | Rollback Steps — Number of versions to rollback. Defaults to `1` (previous version). For example, `--rollback-steps 2` rolls back two versions. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--target-version` | no | `string` | Rollback Version — The target deployment version to rollback to (e.g., `v000003`). Use `--list-versions` to see available versions. | - |


## Related commands

- [`stack recover`](/cli/cf-rollback) — recover a stack stuck in a failed CloudFormation update state
- [`deploy`](/cli/deploy) — deploy your stack to AWS
- [`diff`](/cli/diff) — preview what a deployment would change before applying it
- [`stack history`](/cli/info-operations) — view recent deployment operations and their status
