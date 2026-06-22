# synth

The `stacktape synth` command compiles your Stacktape configuration into a CloudFormation template and writes it to a local file. Use it when you need the generated CloudFormation template on disk for inspection or downstream tooling. No stack is created or modified.

## Usage

```bash
stacktape synth --stage dev --region eu-west-1
```

This reads your Stacktape configuration, resolves all resources, finalizes the CloudFormation template, and writes it to `compiled-template.yaml`. Both `--stage` and `--region` are required so the command can resolve a concrete stack context.

To write the template to a custom path, use `--outFile`.

```bash
stacktape synth --stage dev --region eu-west-1 --outFile ./infra/template.yaml
```


> **Info:** Unlike [`deploy`](/cli/deploy), `synth` does not create or modify any stack resources. It does not require a previously deployed stack, and it does not require a Stacktape subscription.


## Flags reference

<CliCommandsApiReference command="synth" sortedArgs={[
  {
    "name": "region",
    "required": true,
    "alias": "r",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "us-east-2",
      "us-east-1",
      "us-west-1",
      "us-west-2",
      "ap-east-1",
      "ap-south-1",
      "ap-northeast-3",
      "ap-northeast-2",
      "ap-southeast-1",
      "ap-southeast-2",
      "ap-northeast-1",
      "ca-central-1",
      "eu-central-1",
      "eu-west-1",
      "eu-west-2",
      "eu-west-3",
      "eu-north-1",
      "me-south-1",
      "sa-east-1",
      "af-south-1",
      "eu-south-1"
    ],
    "shortDescription": "<p> AWS Region</p>\n",
    "longDescription": "<p>The AWS region for the operation. For a list of available regions, see the <a href=\"https://docs.aws.amazon.com/general/latest/gr/rande.html\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">AWS documentation</a>.</p>\n"
  },
  {
    "name": "stage",
    "required": true,
    "alias": "s",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Stage</p>\n",
    "longDescription": "<p>The stage for the operation (e.g., <code>production</code>, <code>staging</code>, <code>dev-john</code>). You can set a default stage using the <code>defaults:configure</code> command. The maximum length is 12 characters.</p>\n"
  },
  {
    "name": "agent",
    "required": false,
    "alias": "ag",
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Agent Mode</p>\n",
    "longDescription": "<p>Optimizes CLI output for programmatic/LLM consumption:</p>\n<ul>\n<li>Uses strict JSONL/NDJSON output (one JSON object per line)</li>\n<li>Disables interactive terminal UI</li>\n<li>Automatically confirms operations (equivalent to --autoConfirmOperation)\nFor dev command: also enables HTTP server for programmatic control.</li>\n</ul>\n"
  },
  {
    "name": "awsAccount",
    "required": false,
    "alias": "aa",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Account</p>\n",
    "longDescription": "<p>The name of the AWS account to use for the operation. The account must first be connected in the <a href=\"https://console.stacktape.com/aws-accounts\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Stacktape console</a>.</p>\n"
  },
  {
    "name": "configPath",
    "required": false,
    "alias": "cp",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Config File Path</p>\n",
    "longDescription": "<p>The path to your Stacktape configuration file, relative to the current working directory.</p>\n"
  },
  {
    "name": "currentWorkingDirectory",
    "required": false,
    "alias": "cwd",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Current Working Directory</p>\n",
    "longDescription": "<p>The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file.</p>\n"
  },
  {
    "name": "help",
    "required": false,
    "alias": "h",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Show Help</p>\n",
    "longDescription": "<p>If provided, the command will not execute and will instead print help information.</p>\n"
  },
  {
    "name": "logLevel",
    "required": false,
    "alias": "ll",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "info",
      "debug",
      "error"
    ],
    "shortDescription": "<p> Log Level</p>\n",
    "longDescription": "<p>The level of logs to print to the console.</p>\n<ul>\n<li><code>info</code>: Basic information about the operation.</li>\n<li><code>error</code>: Only errors.</li>\n<li><code>debug</code>: Detailed information for debugging.</li>\n</ul>\n"
  },
  {
    "name": "outFile",
    "required": false,
    "alias": "out",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Output File</p>\n",
    "longDescription": "<p>The path to the file where the operation output will be saved.</p>\n"
  },
  {
    "name": "outputFormat",
    "required": false,
    "alias": "ofmt",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "jsonl",
      "plain",
      "tty"
    ],
    "shortDescription": "<p> Output Format</p>\n",
    "longDescription": "<p>Controls the CLI output format:</p>\n<ul>\n<li><code>jsonl</code>: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.</li>\n<li><code>plain</code>: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.</li>\n<li><code>tty</code>: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.\nIf not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl.</li>\n</ul>\n"
  },
  {
    "name": "preserveTempFiles",
    "required": false,
    "alias": "ptf",
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Preserve Temporary Files</p>\n",
    "longDescription": "<p>If <code>true</code>, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to <code>.stacktape/[invocation-id]</code>.</p>\n"
  },
  {
    "name": "profile",
    "required": false,
    "alias": "p",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Profile</p>\n",
    "longDescription": "<p>The AWS profile to use for the command. You can manage profiles using the <code>aws-profile:*</code> commands and set a default profile with <code>defaults:configure</code>.</p>\n"
  },
  {
    "name": "projectName",
    "required": false,
    "alias": "prj",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Project Name</p>\n",
    "longDescription": "<p>The name of the Stacktape project for this operation.</p>\n"
  },
  {
    "name": "templateId",
    "required": false,
    "alias": "ti",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Template ID</p>\n",
    "longDescription": "<p>The ID of the template to download. You can find a list of available templates on the <a href=\"https://console.stacktape.com/templates\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Config Builder page</a>.</p>\n"
  }
]} />

## Important flags

### --outFile

Controls where the synthesized template is saved. Defaults to `compiled-template.yaml`. Use this when you want the template in a specific location for CI artifacts, version control, or external tooling.

```bash
stacktape synth --stage prod --region us-east-1 --outFile ./output/prod-template.yaml
```

### --configPath

Points to your Stacktape configuration file when it is not in the default location. The path is relative to the current working directory.

```bash
stacktape synth --stage dev --region eu-west-1 --configPath ./infra/stacktape.ts
```

### --preserveTempFiles

When set, Stacktape preserves temporary files generated during synthesis under `.stacktape/[invocation-id]`. Useful for debugging the synthesis pipeline when the final template doesn't match your expectations.

```bash
stacktape synth --stage dev --region eu-west-1 --preserveTempFiles
```

### --projectName

Specifies the Stacktape project name for the operation. Pass the same value you would use with [`deploy`](/cli/deploy).

```bash
stacktape synth --stage prod --region us-east-1 --projectName my-app
```

## Examples

Synthesize a production template and save it to a specific directory:

```bash
stacktape synth --stage prod --region us-east-1 --outFile ./artifacts/prod.yaml
```

Synthesize with debug-level logging to troubleshoot configuration resolution:

```bash
stacktape synth --stage dev --region eu-west-1 --logLevel debug
```

Synthesize using a specific AWS profile:

```bash
stacktape synth --stage staging --region eu-west-1 --profile my-aws-profile
```

Synthesize and keep temporary files for inspection:

```bash
stacktape synth --stage dev --region eu-west-1 --preserveTempFiles --outFile ./debug-template.yaml
```

## synth vs validate vs diff

| Command | What it does | Writes a file? | Modifies stack? | Requires deployed stack? |
|---------|-------------|---------------|----------------|------------------------|
| [`synth`](/cli/synth) | Compiles config into a CloudFormation template | Yes (`compiled-template.yaml`) | No | No |
| [`validate`](/cli/validate) | Validates the Stacktape project without writing deployment artifacts | No | No | No |
| [`diff`](/cli/diff) | Shows what would change if you deployed | No | No | Yes |

Use `synth` when you need the template file on disk for inspection or downstream tooling. Use [`validate`](/cli/validate) for a quick pass/fail check without writing artifacts. Use [`diff`](/cli/diff) when you want to compare your current config against what is already deployed.

## Related commands

- [`validate`](/cli/validate) — validates your Stacktape project without writing deployment artifacts. Use `--thorough` to validate workload packaging and ask AWS CloudFormation to validate the synthesized template.
- [`diff`](/cli/diff) — previews what would change in your deployed stack if you ran [`deploy`](/cli/deploy) with the current configuration.
- [`deploy`](/cli/deploy) — deploys (or updates) your stack to AWS. Internally runs the same synthesis step that `synth` performs.

## FAQ

### Why are --stage and --region required if nothing is deployed?

Stacktape needs both values before synthesis so it can resolve a concrete stack context. Your configuration may use the stage and region in resource names, conditional logic, or directive expressions, so different stages can produce different templates. Pass the same values you would use for [`deploy`](/cli/deploy) or [`validate`](/cli/validate).

### Can I feed the synthesized template into CloudFormation linting or policy tools?

Yes — that is a primary use case. The output is a finalized CloudFormation YAML template, so you can pass it to any tool that accepts CloudFormation: linters, policy-as-code scanners, or your own scripts. A common CI pattern is to run `synth` and then run a scanner against the output. In non-TTY environments output is plain text automatically; pass `--outputFormat plain` to force it, or `--agent` for JSONL.

### When should I use synth vs validate vs diff?

Use `synth` when you need the generated CloudFormation template on disk to inspect or feed to external tooling. Use [`validate`](/cli/validate) for a quick pass/fail check without writing any artifact. Use [`diff`](/cli/diff) when a stack is already deployed and you want to see what would change on the next deploy — unlike `synth`, `diff` compares against live stack state.

### The synthesized template doesn't match what I expected — how do I debug it?

Run `synth` with `--preserveTempFiles` to keep the intermediate files generated during synthesis under `.stacktape/[invocation-id]`, and add `--logLevel debug` to trace how your configuration is resolved. This lets you inspect the synthesis pipeline rather than only the final template.
