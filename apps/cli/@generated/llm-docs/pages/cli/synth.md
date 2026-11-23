# synth

`stacktape synth` turns your configuration into a CloudFormation template and writes it to a file, `compiled-template.yaml` by default. Use it to read the template or hand it to other tools. It doesn't create or change a stack.

## Usage

```bash
stacktape synth --stage dev --region eu-west-1
```

This reads your Stacktape configuration, resolves all resources, finalizes the CloudFormation template, and writes it to `compiled-template.yaml`. Both `--stage` and `--region` are required so the command can resolve a concrete stack context.

To write the template to a custom path, use `--out`.

```bash
stacktape synth --stage dev --region eu-west-1 --out ./infra/template.yaml
```

`synth` needs no deployed stack and no Stacktape account.

## Important flags

### --out

Controls where the synthesized template is saved. Defaults to `compiled-template.yaml`. Use this when you want the template in a specific location for CI artifacts, version control, or external tooling.

```bash
stacktape synth --stage prod --region us-east-1 --out ./output/prod-template.yaml
```

### --config

Points to your Stacktape configuration file when it is not in the default location. The path is relative to the current working directory.

```bash
stacktape synth --stage dev --region eu-west-1 --config ./infra/stacktape.ts
```

### --keep-temp-files

When set, Stacktape preserves temporary files generated during synthesis under `.stacktape/[invocation-id]`. Useful for debugging the synthesis pipeline when the final template doesn't match your expectations.

```bash
stacktape synth --stage dev --region eu-west-1 --keep-temp-files
```

### --project

Specifies the Stacktape project name for the operation. Pass the same value you would use with [`deploy`](/cli/deploy).

```bash
stacktape synth --stage prod --region us-east-1 --project my-app
```

## Examples

Synthesize a production template and save it to a specific directory:

```bash
stacktape synth --stage prod --region us-east-1 --out ./artifacts/prod.yaml
```

Synthesize with debug-level logging to troubleshoot configuration resolution:

```bash
stacktape synth --stage dev --region eu-west-1 --debug
```

Synthesize using a specific AWS profile:

```bash
stacktape synth --stage staging --region eu-west-1 --profile my-aws-profile
```

Synthesize and keep temporary files for inspection:

```bash
stacktape synth --stage dev --region eu-west-1 --keep-temp-files --out ./debug-template.yaml
```

## synth vs validate vs diff

| Command | What it does | Writes to AWS | Needs a deployed stack |
|---------|-------------|---------------|------------------------|
| [`synth`](/cli/synth) | Writes the CloudFormation template to a file | Nothing | No |
| [`validate`](/cli/validate) | Checks the config and, with `--thorough`, the template | A temporary template object with `--thorough` | No |
| [`diff`](/cli/diff) | Shows what a deploy would change | Missing secrets, a template and a change set it never applies | Yes |

Use `synth` when you need the template file on disk for inspection or downstream tooling. Use [`validate`](/cli/validate) for a quick pass/fail check without writing artifacts. Use [`diff`](/cli/diff) when you want to compare your current config against what is already deployed.

## FAQ

### Why are --stage and --region required if nothing is deployed?

Stacktape needs both values before synthesis so it can resolve a concrete stack context. Your configuration may use the stage and region in resource names, conditional logic, or directive expressions, so different stages can produce different templates. Pass the same values you would use for [`deploy`](/cli/deploy) or [`validate`](/cli/validate).

### Can I feed the synthesized template into CloudFormation linting or policy tools?

Yes. The file is a finished CloudFormation template, so linters, policy scanners and your own scripts can read it. A common CI step runs `synth` and then a scanner on the file.

## Options


## CLI Options: `stacktape synth`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. Without it, Stacktape uses the one `stacktape.ts`, `stacktape.yml`, `stacktape.yaml` or `stacktape.js` in the working directory. When there are several, the command stops and asks you to choose one with this option. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-o, --out` | no | `string` | Output File — The path to the file where the operation output will be saved. | - |
| `--keep-temp-files` | no | `boolean` | Preserve Temporary Files — If `true`, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to `.stacktape/[invocation-id]`. | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`validate`](/cli/validate) — validates your Stacktape project without writing deployment artifacts. Use `--thorough` to validate workload packaging and ask AWS CloudFormation to validate the synthesized template.
- [`diff`](/cli/diff) — previews what would change in your deployed stack if you ran [`deploy`](/cli/deploy) with the current configuration.
- [`deploy`](/cli/deploy) — deploys (or updates) your stack to AWS. Internally runs the same synthesis step that `synth` performs.
