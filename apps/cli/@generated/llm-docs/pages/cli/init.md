# init

`stacktape init` reads the project you already have, proposes the AWS setup it needs and writes it to one Stacktape
configuration file. It can then deploy that file to your AWS account. With `--starter-id` or `--starter-project`, it
creates a new project from a starter instead.

No Stacktape account is needed. [Deploy an existing app](/getting-started/deploy-an-existing-app) walks through the
wizard screen by screen, and [Start a new project](/getting-started/start-a-new-project) covers starters.

## Usage

```bash
stacktape init
```

Run it in the root directory of the app. The command prints a local `http://127.0.0.1:…` address and opens it in your
browser. The wizard runs there, and the terminal keeps the session alive until you press Ctrl+C.

On Linux without a display, for example over SSH, and in CI, init runs in the terminal instead. See
[`--headless`](#--headless).

## What happens, in order

The wizard has four steps:

1. **Start.** Nothing is read yet. The screen shows the directory and the agents it found. Under **Options** you pick
   Claude Code, Codex or **Files only, no agent**, and for Claude Code the model. Reading starts when you click
   **Analyze my project**.
2. **Analyze.** A built-in scan runs first. It reads Docker Compose files, Dockerfiles and Procfiles, Render, Fly.io
   and Heroku manifests, literal declarations in Serverless Framework, SAM, SST, CDK and Terraform, and notices when
   one of those tools already deploys the project. If the scan answers everything, the agent is not called. Otherwise
   the agent reads the code and every file it opens appears as it reads it.
3. **Review.** Every resource with the reason it exists, the line of code behind it and its monthly price, in the
   **Diagram**, **What & why** and **File** tabs. **Decided for you** lists what the code didn't say, and
   **Important choices** covers capacity, availability, backups and database access where they apply. **Before you
   deploy** lists secrets and settings only you can provide. You choose YAML or TypeScript and the region, then save
   the file with **Save stacktape.yml & continue**.
4. **Deploy.** Optional, and the only step that changes AWS. **Check exact AWS target** is read-only: it resolves the
   same AWS credentials or connected AWS account the deploy will use and shows the account, region and stack name.
   You then confirm **Create new stack** or **Update existing stack**. Stacks owned by another tool or another
   project, and stacks AWS is still changing, are blocked. The deploy checks the target again before it creates
   secrets or changes anything.

Deploy also has an optional **Try it on this machine first** check. **Build and start it here** builds your services
in Docker and starts them with placeholder settings and no network, to catch an app that won't start. The build may
download dependencies and run their install hooks. A proven startup failure holds the deploy until you fix it or set
the result aside. This check is unrelated to [`stacktape dev`](/cli/dev), which creates resources in AWS.

If a deploy fails for a reason that could come from how the code was read, such as a wrong start command, the agent
reads the project again with the error, the configuration is rebuilt and the deploy runs again. This happens at most
twice, and never for problems with the AWS account itself. With files only, there is no repair.

After a successful deploy without a Stacktape account, the wizard offers the
[Stacktape Console](/getting-started/add-the-console). When the project pushes to GitHub, GitLab or Bitbucket, it
also offers to write a CI pipeline. When this machine is already signed in, it links to the stage in the Console.

## Who reads your code and what leaves your machine

| Agent | How it is used |
|---|---|
| **Claude Code** | Every built-in tool is switched off. The only tools it has are the ones Stacktape gives it, all read-only. You can pick the model. |
| **Codex** | Runs read-only in a scratch working directory, because its patch tool cannot be disabled. |
| **Files only, no agent** | The built-in scanner reads manifests, Compose files, Dockerfiles, Procfiles, deployment manifests, supported IaC declarations, lockfiles and environment variable names. Free, instant, and falls back to defaults more often. |

- **Your code.** An agent sends the file contents it chooses to read to its own model provider, under the account
  you already have with it, as it always does. Stacktape never receives source code or file contents. With files
  only, no AI provider receives anything.
- **The price estimate.** To price the Review step, init sends the generated configuration and the region to
  Stacktape's public price estimator. The configuration holds resource names and settings, not code or secret
  values.
- **Usage statistics.** Init records anonymous outcome statistics: which frameworks were found, whether the deploy
  worked and how long the analysis took. Set `STP_DISABLE_TELEMETRY=1` to turn them off.

The agent cannot write to your repository and cannot put words in front of you. It reports findings from a fixed list
of kinds, and every word in the wizard is written by Stacktape.

An imported deployment file, such as a Render or Serverless Framework config, describes what the project expects. It
doesn't give init access to that provider's account. A Stacktape deploy creates a separate stack and doesn't take
over, change or delete resources managed by the other tool.

## Important flags

### `--coding-agent`

Which agent reads the project: `auto` (the default), `claude-code`, `codex` or `none`. In the browser, the agent you
name is preselected and you can still pick another one; the model is chosen there too. Naming an agent that is not
installed fails instead of using another one. `none` skips agent detection.

```bash
stacktape init --coding-agent none
```

### `--headless`

Runs init in the terminal instead of the browser. It reads the project, prints the resources and what it decided,
prints the monthly estimate and writes the configuration. It asks nothing and doesn't deploy. Init also runs this way
on its own in CI and on Linux without a display.

```bash
stacktape init --headless
```

### `--no-browser`

Starts the wizard and prints its address without opening a browser. Use it when you want to open the address in
another browser. It doesn't bring the wizard to a machine where init runs in the terminal.

### `--config-format`

`yaml` (the default) or `typescript`. In the browser you choose it on the Review step instead.

### `--infrastructure-type`

Starting sizes and safety settings: `low-cost`, `standard` (the default) or `production`. In the browser, the same
choices are under **Important choices** on the Review step.

### `--project-directory`

The project to read, when it isn't the current directory.

```bash
stacktape init --project-directory ./apps/api
```

### `--aws-account`

When this machine is signed in to Stacktape and the organization has several connected AWS accounts, the name of the
account to deploy to. It's carried through the target check, the deploy and the commands the wizard prints.

### `--starter-id`, `--starter-project`, `--initialize-project-to`

Create a new project from a starter instead of reading one. `--starter-project` shows the list; `--starter-id` takes
the ID shown on each card in [Starter projects](/getting-started/starter-projects). `--initialize-project-to` sets the
target directory. If that directory isn't empty, the CLI warns and asks `Continue?`, and answering yes deletes its
contents.

```bash
stacktape init --starter-id hono-api \
  --initialize-project-to ./hono-api --config-format yaml
```

## Existing and generated configuration files

Init never overwrites `stacktape.yml`, `stacktape.yaml` or `stacktape.ts`. When one exists, it writes
`stacktape.generated.yml` or `stacktape.generated.ts` beside it, replacing a generated file from an earlier run. Deploy
the generated file with `--config`, or merge it into yours:

```bash
stacktape deploy --config stacktape.generated.yml --stage dev
```

An existing `stacktape.js` is not detected. Init writes a new `stacktape.yml` next to it, and commands then stop
because the directory has two config files. Move or delete the old file, or pass `--config` every time.

For a TypeScript config in a project with a `package.json`, init adds or updates the `stacktape` dev dependency to
match the CLI and prints the install command. It doesn't run the package manager.

## Examples

Read the project with Claude Code:

```bash
stacktape init --coding-agent claude-code
```

A configuration in one step, with no agent, no browser and the smallest sizes:

```bash
stacktape init --headless --coding-agent none --infrastructure-type low-cost
```

Pick a starter from the list:

```bash
stacktape init --starter-project
```

## FAQ

### What about my .env files?

Only the variable names are kept. The value of a variable such as `DATABASE_URL` is read once, in memory on your
machine, for two things: whether the scheme says `postgres://` or `mysql://`, and whether the host belongs to a
provider like Supabase, so init doesn't propose replacing a database that is already live. Both reduce to a single
word before anything is stored. The value is never written to the analysis, quoted, logged or shown.

### Do I need an AWS account before running init?

Not to read the project and save the file. You need one to deploy. The wizard can use local AWS credentials or an AWS
account connected to your Stacktape organization, and shows the exact account, region and stack before any change.
See [Set up AWS credentials](/getting-started/aws-credentials).

### Do I need a Stacktape account?

No. Without one, the deploy uses your local AWS credentials. After a successful deploy, the wizard offers the
Stacktape Console, free up to $200 a month of managed AWS spend. You can connect it there, later with
`stacktape connect`, or never.

### Which agent should I choose?

Whichever you already have. Claude Code and Codex read the code, so they settle more than the scanner, which reads
manifests and falls back to defaults more often. If the scanner finds no server, worker or website, the wizard offers
to analyze again with an installed agent.

### Can I run init from CI or a coding agent?

Yes, with `--headless`. Add `--agent` for JSONL output. Nothing prompts: everything the code doesn't answer is decided,
and the output says what was decided. Init doesn't deploy in this mode; run `stacktape deploy` afterwards.

### Does init deploy anything?

Only after two actions on the Deploy step: the read-only target check, then confirming the new or existing stack it
showed. The deploy repeats the check and stops if the account, region, name, ownership or status changed. Everything
before that is a file on your disk or a read-only AWS call.

### Will init overwrite files in my project?

It never overwrites a `stacktape.yml`, `stacktape.yaml` or `stacktape.ts`. It can replace its own
`stacktape.generated.*` from an earlier run and update the `stacktape` dependency in `package.json`. See
[existing and generated configuration files](#existing-and-generated-configuration-files). For starters,
`--initialize-project-to` empties a non-empty target directory after you confirm.

## Options


## CLI Options: `stacktape init`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `--coding-agent` | no | `string` | Coding Agent — Which installed coding agent analyses the project. The agent reads your code using your own subscription; your code is never sent to Stacktape. • **auto** (default): use the best agent found on this machine. • **claude-code** / **codex**: use that agent specifically, and fail if it is not installed. • **none**: skip the agent entirely and rely on static analysis alone. Faster and free, but finds less. | `auto`, `claude-code`, `codex`, `none` |
| `--config-format` | no | `string` | Config Format — Format (language) used for the generated config. Options are typescript or yaml. | `yaml`, `typescript` |
| `--headless` | no | `boolean` | Headless — If `true`, runs `init` entirely in the terminal instead of opening the browser wizard. Use this over SSH, in a container, or in CI. Questions that cannot be answered from the command line are reported rather than asked, and the configuration is still written. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--infrastructure-type` | no | `string` | Infrastructure Type — How much infrastructure `init` creates for you. It sets every size and safety setting in the generated configuration, and it is the one thing reading your code cannot tell us. • **low-cost**: one small copy of everything. For trying this out, a side project, or staging. • **standard** (default): room for real traffic, a week of backups, and deletion protection on your database. • **production**: two copies of your app so one failure changes nothing, and a standby database in a second datacentre. | `low-cost`, `standard`, `production` |
| `--initialize-project-to` | no | `string` | Initialize Project To — The directory where the starter project should be initialized. If the directory is not empty, its contents will be deleted. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--no-browser` | no | `boolean` | No Browser — If `true`, prints the address instead of opening a browser: `init` still starts the wizard, and `login` still waits for you to approve the sign-in. Use this when the browser you want is not this machine's default, on another device, or behind a forwarded port. | - |
| `--project-directory` | no | `string` | Project Directory — The root directory where the project configuration should be generated. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--starter-id` | no | `string` | Starter ID — The identifier of the starter project to initialize. | - |
| `--starter-project` | no | `boolean` | Starter Project — If `true`, initializes from a starter project template instead of running the default wizard flow. | - |


## Related commands

- [`deploy`](/cli/deploy) deploys the configuration init wrote.
- [`dev`](/cli/dev) runs the project locally against a small dev stack.
- [`delete`](/cli/delete) removes everything a deploy created.
