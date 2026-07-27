# init

The `stacktape init` command initializes a new Stacktape project. By default, it runs an interactive wizard that analyzes your codebase with AI, generates a Stacktape configuration file, and walks you through account setup, AWS connection, and an optional first deployment — all in one flow.

## Usage

```bash
stacktape init
```

No flags are required. Running `init` without arguments launches the interactive wizard. This command does not require a Stacktape API key — the wizard handles sign-up or login as part of the flow.

## How the wizard works

The default interactive wizard runs through these steps in order:

1. **Analyzes your project** — scans your codebase and uses AI to generate a matching Stacktape configuration.
2. **Sign up or log in** — creates a new Stacktape account or authenticates an existing one.
3. **Connects your AWS account** — links an AWS account to your Stacktape organization.
4. **Creates a project** — registers the project in the Stacktape Console and optionally configures CI/CD.
5. **Offers to deploy** — gives you the option to deploy the generated stack immediately.

You can skip the wizard entirely by using `--starterId` or `--templateId` to initialize from a pre-built template instead.

## Important flags

### `--configFormat`

Sets the format of the generated configuration. Accepts `typescript` or `yaml`.

```bash
stacktape init --configFormat typescript
```

### `--infrastructureType`

Sets the infrastructure tier for the generated configuration. This affects resource sizing, scaling, security posture, and cost:

- **`low-cost`** — minimal resources, single instances, no WAF or VPC. Best for development and experimentation.
- **`standard`** — balanced defaults with serverless databases and moderate scaling. Good for staging and small production workloads.
- **`production`** — high-availability setup with Aurora, WAF, VPC, bastion hosts, backups, and deletion protection.

```bash
stacktape init --infrastructureType production
```

### `--starterId`

Initializes from a specific starter project template instead of running the AI-powered wizard. Pass the identifier of the starter project you want to initialize.

```bash
stacktape init --starterId lambda-api-postgres
```

### `--starterProject`

When set to `true`, initializes from a starter project template instead of running the default wizard flow.

```bash
stacktape init --starterProject
```

### `--templateId`

Fetches a configuration template from the Stacktape Console's Config Builder page and initializes the project from it.

```bash
stacktape init --templateId your-template-id
```

### `--projectDirectory`

Sets the root directory where the project configuration should be generated.

```bash
stacktape init --projectDirectory ./my-app
```

### `--initializeProjectTo`

Sets the directory where a starter project's files are placed. If the directory is not empty, its contents are deleted before initialization.

```bash
stacktape init --starterId lambda-api-postgres --initializeProjectTo ./my-starter
```


> **Warning:** Using `--initializeProjectTo` on a non-empty directory deletes existing contents. Point it at a new or empty directory to avoid losing files.


## Examples

Initialize with the AI wizard using TypeScript config and production-grade infrastructure:

```bash
stacktape init --configFormat typescript --infrastructureType production
```

Initialize from a starter project into a specific directory:

```bash
stacktape init --starterId nextjs-saas --initializeProjectTo ./my-saas-app
```

Run in agent mode for programmatic use (JSONL output, no interactive terminal UI, auto-confirms operations):

```bash
stacktape init --agent
```

## All flags


## CLI Options: `stacktape init`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--configFormat (-cf)` | no | `string` | Config Format Format (language) used for the generated config. Options are typescript or yaml. | `yaml`, `typescript` |
| `--infrastructureType (-it)` | no | `string` | Infrastructure Type The infrastructure tier for the generated configuration. Affects resource sizing, scaling, security, and cost: **low-cost**: Minimal resources, single instances, no WAF/VPC. Best for development and experimentation. **standard**: Balanced defaults with serverless databases and moderate scaling. Best for staging and small production workloads. **production**: High-availability setup with Aurora, WAF, VPC, bastions, backups, and deletion protection. | `low-cost`, `standard`, `production` |
| `--initializeProjectTo (-ipt)` | no | `string` | Initialize Project To The directory where the starter project should be initialized. If the directory is not empty, its contents will be deleted. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--projectDirectory (-pd)` | no | `string` | Project Directory The root directory where the project configuration should be generated. | - |
| `--starterId (-sid)` | no | `string` | Starter ID The identifier of the starter project to initialize. | - |
| `--starterProject (-sp)` | no | `boolean` | Starter Project If `true`, initializes from a starter project template instead of running the default wizard flow. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Related commands

- [`deploy`](/cli/deploy) — deploy the generated configuration to AWS after initializing.
- [`dev`](/cli/dev) — run the project locally in dev mode for rapid iteration.
- [`login`](/cli/login) — configure your Stacktape API key separately if you skip the wizard's login step.

## FAQ

### Do I need an AWS account before running init?

No. The wizard walks you through connecting an AWS account as one of its steps, and it doesn't require a Stacktape API key either — sign-up or login happens inside the flow. You can also connect your account separately in the [Stacktape Console](/stacktape-console/connecting-your-aws-account) before running `init`.

### How do I run init non-interactively (CI or an AI coding agent)?

Pass `--agent`. It switches output to JSONL, disables the interactive terminal UI, and auto-confirms operations. Since the AI wizard is interactive, combine `--agent` with explicit flags — typically `--starterId` plus `--configFormat` and `--infrastructureType` — so the run has no prompts to answer.

### What is the difference between --starterId and --templateId?

`--starterId` initializes from a built-in starter project template bundled with Stacktape. `--templateId` fetches a configuration template from the Stacktape Console's [Config Builder page](/stacktape-console/visual-config-editor). Both skip the AI-powered wizard.

### Which --infrastructureType should I choose?

Use `low-cost` for development and experimentation (single instances, no WAF or VPC), `standard` for staging and small production workloads (serverless databases, moderate scaling), and `production` for high-availability workloads (Aurora, WAF, VPC, bastion hosts, backups, and deletion protection). The tier affects resource sizing, scaling, security posture, and cost.

### Does init deploy anything?

Not automatically. At the end of the wizard, you're offered the option to deploy. You can decline and run [`stacktape deploy`](/cli/deploy) later when you're ready.

### Will init overwrite files in my project directory?

The AI wizard generates a config alongside your existing code, so review it before deploying. The destructive case is `--initializeProjectTo`: if you point it at a non-empty directory, its contents are deleted before the starter project is placed there, so use a new or empty directory.
