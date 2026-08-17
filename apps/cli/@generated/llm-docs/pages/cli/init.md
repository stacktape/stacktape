# init

---
title: 'init'
order: 161
seoTitle: 'stacktape init — Turn an existing project into infrastructure | Stacktape CLI'
seoDescription: 'Read your project with your own coding agent and get a Stacktape configuration you can deploy, without sending source code to Stacktape.'
---

# init

`stacktape init` reads the project you already have and writes a Stacktape configuration for it.

It opens a wizard in your browser and reads your code **on your machine** using a coding agent you
already have installed — Claude Code or Codex. It does not interview you: where your code does not say,
it picks the sensible answer, then shows you what it picked and the line behind every resource it
proposes, so you can change any of it. No source, filenames, or configuration contents are sent to
Stacktape, and no account is needed.

To be precise about where your code goes: an agent works the way it always does — it sends the file
contents it chooses to read to its own model provider, under the account you already have with it, with
read-only tools (it cannot run scripts or install anything). If you would rather no AI read the code at
all, pick **Files only** — the built-in scanner reads manifests locally and sends nothing anywhere.

## Usage

```bash
stacktape init
```

Run it in the directory of the project you want to deploy. The command prints a `http://127.0.0.1:…`
address and opens it; the wizard runs there and the terminal keeps the session alive until you close it
with Ctrl+C.

## What happens, in order

1. **Start.** The wizard opens with nothing read yet. It shows which directory it will read and which
   agents it found, and waits. Reading starts when you press the button — never before.
2. **Read.** The agent opens files and you watch it happen: every file it reads appears as it reads it.
   Only the *names* of your environment variables are ever kept or shown. Before the agent starts, a
   deterministic pass has already read the manifests that state the deployment most clearly:
   Docker Compose, Dockerfiles and Procfiles; Render, Fly.io and Heroku app manifests; and literal
   declarations in Serverless Framework, SAM, SST, CDK and Terraform. It also notices when one of
   those tools already deploys the project.
3. **Review.** Every resource, with the reason it exists, the line of your code behind it, and what it
   costs — a real monthly estimate per resource and in total, priced from AWS list prices. Anything
   the code could not settle was decided for you, listed under "Decided for you", and can be changed
   with one click — the configuration is rebuilt from your choice, and the price updates with it.
   Nothing blocks. You choose YAML or TypeScript, and the file is written.
4. **Try it locally (optional).** With your explicit click, the wizard can build and start supported
   services in Docker. Building may download dependencies and run their install hooks. The started
   app receives throwaway settings and has no network. Every result says whether the service passed,
   failed, was inconclusive, or could not be checked. A proven startup failure holds the Deploy
   button until you fix it or explicitly set the result aside; a skipped check is never shown as a
   pass.
5. **Deploy.** The wizard checks that the CLI is signed in to Stacktape. The first click is read-only:
   a short-lived CLI process resolves the same connected AWS account or profile that deploy will use,
   then shows the exact account, region and stack name. You separately confirm creating a new stack or
   updating a specific existing Stacktape stack. Foreign, mismatched and unsafe stacks are blocked. The
   deploy child checks that target again before it creates secrets or changes AWS, then reports progress,
   warnings and typed HTTPS URLs. This step is optional and clearly marked as the one that costs money.
   If your Stacktape organization has multiple connected AWS accounts and no saved default, start with
   `stacktape init --awsAccount <account-name>`. That account selection is carried through the target check,
   deploy, and typed URL lookup.
   If the deploy fails for a reason that could be our reading of your code — a wrong start
   command, a missing build step — the agent re-reads the project against the actual error, the
   configuration is rebuilt, and the deploy runs again. At most twice, and never for problems with the
   AWS account itself.

## Who reads your code

`init` drives a coding agent that is already installed and already paid for — your subscription, your
machine. It never sends your code to Stacktape.

The preview has no Stacktape-hosted AI fallback. If neither local agent is available, the **No agent**
mode below performs deterministic file analysis instead of uploading source or snippets elsewhere.

| Agent | How it is used |
|---|---|
| **Claude Code** | Every built-in tool is switched off; the only tools it has are the ones Stacktape gives it, all read-only. You can pick the model. |
| **Codex** | Runs read-only in a scratch working directory, because its patch tool cannot be disabled. |
| **No agent** | Reads package manifests, Compose, Dockerfiles, Procfiles, Render/Fly.io/Heroku manifests, supported IaC declarations, lockfiles, environment-variable names, and whatever already deploys the project. Free, instant, and leans on defaults more often. |

An imported deployment file describes what the project expects; it does not give `init` access to
the provider account or prove that the deployment is currently running. The Review step says when it
found such a file. A Stacktape deploy creates a separate stack: it does not take over, change or delete
resources managed by the existing tool.

The agent cannot write to your repository, cannot reach the network through us, and cannot put words in
front of you: it reports findings from a fixed list of kinds, and every word you read in the wizard is
written by Stacktape.

## Important flags

### `--codingAgent`

Which agent reads the project. `auto` (the default) takes the best one installed. Naming one that is not
installed fails rather than quietly using another.

```bash
stacktape init --codingAgent claude-code
stacktape init --codingAgent none          # static analysis only
```

### `--headless`

Runs the whole thing in the terminal instead of opening a browser. Use it over SSH, in a container, or in
CI. Nothing prompts: the terminal prints what was decided for you, and the configuration is written.

```bash
stacktape init --headless
```

### `--noBrowser`

Starts the wizard and prints its address without opening anything. Use it when the browser you want is not
this machine's default, or when the port is forwarded from somewhere else.

```bash
stacktape init --noBrowser
```

### `--infrastructureType`

How much infrastructure to create: `low-cost`, `standard` (the default), or `production`. It sets every
size and safety setting in the generated configuration, and it is the only thing reading your code
cannot tell us.

- **low-cost** — one small copy of everything. Trying it out, a side project, staging.
- **standard** — room for real traffic, a week of backups, deletion protection on your database.
- **production** — two copies of your app so one failure changes nothing, and a standby database in a
  second datacentre.

```bash
stacktape init --infrastructureType production
```

### `--configFormat`

`yaml` (the default) or `typescript`. In the browser this is chosen on the Review step instead, once you
have seen what is in the file.

```bash
stacktape init --headless --configFormat typescript
```

### `--projectDirectory`

The project to read. Defaults to the current directory.

```bash
stacktape init --projectDirectory ./my-app
```

### `--starterId`, `--starterProject`, `--templateId`

Initialize from a ready-made project instead of reading yours. These skip the wizard entirely.

```bash
stacktape init --starterId lambda-api-postgres
stacktape init --templateId your-template-id
```

### `--initializeProjectTo`

Where a starter project's files are placed.



> **Warning:** If the directory is not empty, its contents are deleted first. Point it at a new or empty directory.



## Your existing configuration is never overwritten

If the project already has a `stacktape.yml` or `stacktape.ts`, `init` does not touch it. The new
configuration is written beside it as `stacktape.generated.yml` (or `.ts`), and both the wizard and the
terminal tell you so. Deploy the generated one with `--configPath`, or merge it in yourself:

```bash
stacktape deploy \
  --configPath stacktape.generated.yml \
  --projectName <project-name> \
  --stage dev \
  --region eu-west-1
```

## Examples

Read the project with Claude Code's most careful model:

```bash
stacktape init --codingAgent claude-code
```

No agent, no browser, cheapest infrastructure — a configuration in one step:

```bash
stacktape init --headless --codingAgent none --infrastructureType low-cost
```

## Related commands

- [`deploy`](/cli/deploy) — deploy the configuration `init` wrote.
- [`dev`](/cli/dev) — run the project locally against a minimal dev stack.
- [`delete`](/cli/delete) — remove everything a deploy created.

## FAQ

### Does my code leave my machine?

If you choose Claude Code or Codex, that local agent sends the file contents it selects to its own
model provider under your account, just as it normally does. Stacktape receives no source, file names,
or configuration contents. If you choose **Files only**, no AI provider receives code either.

Stacktape does receive anonymous outcome statistics — which frameworks were detected, whether the
deploy succeeded, how long the analysis took — so we can see where generation fails and fix it. Set
`STP_DISABLE_TELEMETRY=1` to turn that off.

### What about my .env files?

Only the *names* are kept. `DATABASE_URL` tells the analysis that a database exists — and its value is
looked at once, in memory on your machine, for two things and two things only: whether the scheme says
`postgres://` or `mysql://`, and whether the host belongs to a provider like Supabase, so we do not
propose replacing a database that is already live. Both reduce to a single word before anything is
stored. The value itself is never written to the facts, never quoted in a citation, never logged and
never shown — every citation from an environment file stops at the `=`.

### Do I need an AWS account before running init?

Not to run it. You need one to deploy. The wizard can use local AWS credentials or an AWS account
connected to your Stacktape organization. Before any AWS change it resolves the same credentials the
deploy command will use and shows the exact account, region and stack target for confirmation.

### Do I need a Stacktape account?

Not to analyze your project or to get the file — that all happens on your machine, with no account
and nothing sent to us. Deploying from the wizard does go through Stacktape, so the Deploy step
checks whether this machine is signed in and tells you to run `stacktape login` if it is not.

### What does “Try it here first” run?

Only after you click it, `init` runs your project's build and start commands using disposable Docker
images and containers. The image build may access the network to download dependencies and may run
package-manager install hooks from the project. The started application receives throwaway values
instead of your secrets and has no network access. This is not supported for every packaging and
resource type yet: the wizard labels each service **Passed**, **Failed**, **Inconclusive**, or **Not
checked** and never presents a skipped check as proof. Docker is optional; if it is missing, your
generated file is unaffected and the wizard says that AWS would be the first full run.

### How do I run init non-interactively, in CI or from an AI coding agent?

`--headless`, optionally with `--agent` for JSONL output. Nothing prompts: everything the code cannot
answer is decided, and the terminal prints what was decided.

### Why does it barely ask me anything?

Because almost nothing needs asking. Where your code does not say, there is nearly always an answer a
careful person would pick — so it picks it, shows you on the Review step, and lets you change it. The
one real question is how big the infrastructure should be, which is why it is shown alongside the
resources and monthly estimate on the Review step.

### Which agent should I choose?

Whichever you already have. Claude Code and Codex both produce a better result than static analysis,
because they read the code rather than pattern-matching over it. If you have neither, "Files only" still
produces a working configuration — it just falls back to defaults more often.

### What happens when the deploy fails?

The failure is read first. If it is about your AWS account — expired credentials, a missing
permission, a quota — it is shown to you plainly, because no change to the configuration can fix it.
If it could be about the code, the same agent that read your project reads it again with the actual
error in hand, corrects what we believed, and the deploy runs again with the rebuilt configuration.
The wizard names exactly which resources the repair rewrote, and the file in your project is always
the version that deployed. It stops after two repairs and shows the real error rather than looping.
If you chose "Files only", nothing is ever handed to an agent — the deploy just fails, plainly.

### Does init deploy anything?

Only after two explicit actions on the last step: a read-only target check, then confirmation to create
the absent stack or update the exact existing StackId that was shown. The deploy child repeats that check
and stops if the account, region, name, ownership, status or StackId changed. Everything before the final
confirmation is a file on your disk or a read-only AWS check.

### Will init overwrite files in my project?

It writes exactly one file, and never on top of an existing configuration — see above. The one
destructive flag is `--initializeProjectTo`, which empties the directory you point it at.
