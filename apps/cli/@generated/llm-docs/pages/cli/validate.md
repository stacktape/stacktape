# validate

The `stacktape validate` command loads your Stacktape configuration, resolves resources, and synthesizes the CloudFormation template in memory — without modifying AWS resources. With `--thorough`, it also submits the synthesized template to AWS CloudFormation for server-side validation. Add `--out` when you want to inspect the exact successfully validated template. Use it to catch config errors before deploying.

## Usage

The `validate` command requires a stage and region. It checks your configuration file, resolves all resource definitions, validates configured [guardrails](/guardrails/overview), and synthesizes the CloudFormation template in memory.

```bash
stacktape validate --stage dev --region eu-west-1
```

The command does not create, update, or delete any AWS resources and does not require a deployed stack.

## Validation levels

The `validate` command supports three levels of thoroughness, each building on the previous one. Choose the level that matches how much confidence you need before proceeding.

### Default — config, resources, and template

Stacktape loads the configuration, resolves all resources, validates [guardrails](/guardrails/overview), and synthesizes the CloudFormation template in memory. This is the fastest option and catches most configuration-level mistakes — broken resource references, invalid property values, and guardrail violations.

```bash
stacktape validate --stage dev --region eu-west-1
```

### With packaging — add `--with-package`

The `--with-package` flag runs workload packaging as part of validation. Stacktape packages all Lambda functions and container workloads, which catches packaging errors surfaced by the normal packaging step — such as missing entry files or misconfigured build settings. Use this when you have changed packaging settings or entry file paths.

```bash
stacktape validate --stage dev --region eu-west-1 --with-package
```

### Thorough — add `--thorough`

The `--thorough` flag runs the most complete validation path. It includes everything from `--with-package` and additionally submits the synthesized CloudFormation template to AWS for server-side validation. CloudFormation validates the template and returns any template validation errors before any stack is created or updated. This requires AWS credentials for the CloudFormation `ValidateTemplate` API call but does not create or modify any stack.

```bash
stacktape validate --stage dev --region eu-west-1 --thorough
```


> **Info:** The `--thorough` flag implies `--with-package`. You do not need to pass both.


## Security findings by stage purpose

`validate` also checks the configuration for security findings, the same ones [`deploy`](/cli/deploy) reports to the Stacktape Console: a database reachable from the internet, a public bucket, an IAM statement that allows every action, a credential pasted into an environment variable, and similar. A finding never fails validation.

How severe a finding is depends on whether the stage is production. A password-protected database open to the internet is a reasonable default for a dev or preview stage, so it is `LOW` there and `HIGH` in production. Rules that only matter once real users depend on the stack, such as deletion protection, backups, termination protection and running two container instances, are not reported for other stages; `validate` lists them separately so you know what to fix before production.

| Finding | Production | Other stages |
|---------|------------|--------------|
| Database or OpenSearch domain reachable from the internet | `HIGH` | `LOW` |
| Public load balancer without a web application firewall | `MEDIUM` | `LOW` |
| Queue without a dead-letter queue | `LOW` | `INFO` |
| Database without deletion protection, data store without backups | `MEDIUM` | listed under "before production" |
| Stack without termination protection, container service with one instance | `LOW` | listed under "before production" |
| Public bucket, wide IAM statement, secret in an environment variable | same in every stage | same in every stage |

Wide IAM statements keep their severity because dev stages often share the AWS account with production, so a role that can do anything in the account reaches production too.

A stage is production when [`stackConfig.stageType`](/configuration/stages-and-environments#production-and-non-production-stages) is `production`. Without that setting, `deploy` uses the type you chose when you created the stage in the Stacktape Console; `validate` does not contact the Console, so it skips this step unless you pass `--aws-account`. Otherwise the stage name decides: `prod`, `production`, `prd` and `live`, alone, as a segment (`prod-eu`) or followed by a number (`prod2`), count as production, and names with a rehearsal marker (`pre-prod`, `prod-test`) do not. The same answer decides incident handling and the delete-production permission in the Console. Set `stageType` when your production stage has another name, so `validate` and `deploy` always agree:

```yaml
stackConfig:
  stageType: production
```

For a non-production stage, the output looks like this:

```text
Security posture: 1 low (stage `dev` is non-production by its name).
  [LOW] mainDatabase: Database reachable from the internet (HIGH in production)
Also fix before production (not reported for this stage):
  [LOW] web: Production container service runs a single instance
  [LOW] Production stack without termination protection
```

With `--agent`, the result's `security` object carries `stage` (`name`, `purpose` and `decidedBy`: `stackConfig.stageType`, `stacktape-console` or `stage-name`), `findings` with each finding's `severity` for this stage and, when production rates it higher, its `productionSeverity`, `productionOnlyFindings`, and `exposure`. `deploy` returns the same object, reports the stage's `findings` to the Console, and only counts the production-only findings in its output.

## Missing secrets

A `$Secret` whose secret does not exist yet in the region is a finding, not a failure: `validate` reports it and checks the rest of the configuration, with a placeholder reference in the template. This is the normal state after [`init`](/cli/init), which keeps a generated database or Redis password in a secret it does not create.

```text
[!] Secret my-app-cache does not exist in eu-west-1 yet. It holds a generated database password: stacktape dev creates it when it starts, and stacktape deploy creates it before it deploys (in a terminal it asks first). To create it yourself, run stacktape secret set my-app-cache with a JSON value that has a `password` key.
```

Any other missing secret, such as an API key, has to be created with [`secret set`](/cli/secret-set) before `deploy` or `dev` can run; both stop until it exists. With `--agent`, the result lists them in `missingSecrets`, each with its `name`, the `jsonKeys` the configuration reads and whether Stacktape `generated` its value.

## When to use validate

The `validate` command is a fast pre-deploy check that confirms your configuration synthesizes correctly. Use it when you want a validation gate instead of a written template file.

- **Before deploying.** Run `stacktape validate` to catch configuration errors in seconds without waiting for a full CloudFormation deployment to fail.
- **In CI pipelines.** Add `validate` (or `validate --thorough`) as a CI step on pull requests. This prevents broken configs from reaching [`deploy`](/cli/deploy).
- **After config refactors.** When you reorganize resources, rename stages, or change packaging modes, `validate` confirms the config still synthesizes correctly.

## Inspecting the validated template

By default, `validate` produces only a pass/fail result. Add `--out <path>` to write the template after every requested validation step succeeds. When packaging is enabled, this is the packaged template and includes generated Lambda layers and their function references.

Use [`synth`](/cli/synth) when you only need the faster, un-packaged template compilation. Use [`diff`](/cli/diff) when you need to see what a deployment would change against a live stack.

## Important flags

| Flag | What it does |
|------|-------------|
| `--with-package` | Runs workload packaging as part of validation, catching packaging errors for Lambda functions and container workloads. |
| `--thorough` | Validates packaging and submits the template to AWS CloudFormation for server-side validation. Implies `--with-package`. Requires AWS credentials. |
| `--out` | Writes the template only after the requested validation steps succeed. With packaging enabled, the file includes generated artifact and layer references. |
| `--stage` | Required. The stage name used for template synthesis (e.g., `dev`, `staging`, `production`). |
| `--region` | Required. The AWS region used for template synthesis. |
| `--config` | Path to your Stacktape configuration file if it is not in the default location. |
| `--agent` | Optimizes CLI output for programmatic/LLM consumption. Uses JSONL/NDJSON output and disables the interactive terminal UI. |

## Examples

Validate config for a production stage in `us-east-1`.

```bash
stacktape validate --stage production --region us-east-1
```

Validate with a specific config file path.

```bash
stacktape validate --stage dev --region eu-west-1 --config ./infra/stacktape.ts
```

Run the most thorough validation, including packaging and CloudFormation template validation, before merging a pull request.

```bash
stacktape validate --stage ci --region eu-west-1 --thorough --out ./validated-template.yaml
```

Use JSONL output for CI or AI-agent consumption.

```bash
stacktape validate --stage dev --region eu-west-1 --agent
```

## Flags reference


## CLI Options: `stacktape validate`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. The maximum length is 12 characters. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-o, --out` | no | `string` | Output File — The path to the file where the operation output will be saved. | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--thorough` | no | `boolean` | Thorough — If `true`, runs the most complete validation path: validates workload packaging and asks AWS CloudFormation to validate the synthesized template. | - |
| `--with-package` | no | `boolean` | With Package — If `true`, validates workload packaging in addition to resolving the configuration and template. | - |


## Related commands

- [`synth`](/cli/synth) — compiles the configuration into an un-packaged CloudFormation template and writes it to a file. Use `validate --with-package --out ...` when you need the packaged template.
- [`diff`](/cli/diff) — shows a preview of changes that would be applied to a deployed stack. Requires a deployed stack, unlike `validate`.
- [`deploy`](/cli/deploy) — deploys or updates a stack. Running `validate` before `deploy` catches errors before they reach CloudFormation.
- [`package`](/cli/package) — packages workloads and writes artifacts to disk. The `--with-package` flag on `validate` runs workload packaging as part of validation, while `package` is the dedicated command for preparing packaged outputs for inspection or deployment.

## FAQ

### Does validate create or modify any AWS resources?

No. The `validate` command does not create, update, or delete any AWS resources and does not require a deployed stack. Initialization can read AWS identity or metadata used during synthesis. With `--thorough`, CloudFormation's read-only `ValidateTemplate` API checks the template structure without creating a stack.

### How is validate different from synth?

Both commands synthesize a CloudFormation template from your configuration. [`synth`](/cli/synth) writes an un-packaged template immediately (default `compiled-template.yaml`). `validate` runs the selected checks first and writes nothing unless `--out` is supplied; with `--with-package` or `--thorough`, that file contains the packaged template. Use `validate` for CI gates and exact validated output, or `synth` for quick template inspection.

### Do I need AWS credentials to run validate in CI?

Stacktape normally needs an AWS identity because the account id participates in deterministic names and synthesized ARNs. `--thorough` additionally calls CloudFormation's `ValidateTemplate` API. Use a read-only CI profile scoped to the intended account.

### What errors does --thorough catch that the default level misses?

The default validation catches configuration-level problems: broken references, invalid property values, guardrail violations, and template synthesis errors. The `--thorough` flag submits the synthesized template to CloudFormation for server-side validation, which can catch template-level structural problems that only CloudFormation's validator surfaces. The tradeoff is an AWS API call and the need for credentials. Note that even `--thorough` only validates the template — it cannot catch errors that surface during actual provisioning, which is what [`diff`](/cli/diff) and [`deploy`](/cli/deploy) reveal against a live stack.

### Can I use validate with AI agents or in scripts?

Yes. Pass `--agent` to optimize CLI output for programmatic or LLM consumption. This flag uses JSONL/NDJSON output (one JSON object per line) and disables the interactive terminal UI. You can also use `--json` for machine-readable output without the other `--agent` behaviors.
