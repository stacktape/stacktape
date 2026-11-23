# Quickstart

Stacktape deploys your app into your own AWS account. The CLI reads your project, writes one configuration file and
deploys it as a CloudFormation stack. You don't need a Stacktape account.

## Run it in your app's directory

Open a terminal in the root of the app you want to deploy and run the command for your system. It installs the CLI
and starts `stacktape init`. The standalone CLI doesn't need Node.js.


Example (macOS):

```bash
curl -fsSL https://installs.stacktape.com/macos.sh | sh -s -- init
```


Example (Linux):

```bash
curl -fsSL https://installs.stacktape.com/linux.sh | sh -s -- init
```


Example (Windows):

```powershell
iex "& { $(irm https://installs.stacktape.com/windows.ps1) } init"
```


Example (npm):

```bash
npx stacktape@latest init
```


The macOS, Linux and Windows installers put the CLI in `~/.stacktape/bin` and add it to your `PATH`. Open a new
terminal before you run `stacktape` yourself. To only install it, leave out the trailing `init`.

`npx stacktape@latest init` runs the CLI without installing it. The later commands on this site start with
`stacktape`. To have that command, install the CLI with `npm install -g stacktape`, or put `npx` in front of each
command.

## What happens next

`stacktape init` opens a wizard in your browser. Keep the command running while you use it. The wizard has four steps:

1. **Start.** Choose what reads your code: Claude Code, Codex or files only. Then click **Analyze my project**.
2. **Analyze.** You see every file it opens. An agent can read your source code, and it sends the files it reads to
   its own model provider. Files only reads manifests and config files and sends nothing to an AI provider, but it
   leaves more settings for you to check. No code is sent to Stacktape.
3. **Review.** You get the resources it proposes, the line of code behind each one and the monthly price. Change any
   choice, pick YAML or TypeScript and the region, and save the file.
4. **Deploy.** This step is optional. The wizard shows the exact AWS account and stack, deploys after you confirm and
   gives you the live URL.

Nothing is created in AWS before you confirm the deploy. [Deploy an existing app](/getting-started/deploy-an-existing-app)
walks through every screen.

## What you need

- **An AWS account, with credentials on your machine.** Only the deploy needs them, and the wizard checks them before
  it does anything. If you have never used AWS from the terminal, [set up AWS credentials](/getting-started/aws-credentials)
  first.
- **Claude Code or Codex (optional).** With one installed, init can read your source code, not only manifests, so
  fewer settings fall back to defaults. See [who reads your code](/getting-started/deploy-an-existing-app#1-start-choose-who-reads-your-code).
- **Docker, for most apps that are not JavaScript or TypeScript functions.** Stacktape builds container images and
  Python, Go or Java functions on your machine, with Docker. See [Packaging](/packaging/overview).

## No app yet?

Start from a starter project instead. Run this in the directory where the new project folder should go:

```bash
stacktape init --starter-project
```

The CLI asks which starter, where to put it and which config format to use. Then it prints the commands that deploy
it. See [Start a new project](/getting-started/start-a-new-project).

## What it costs

- The CLI is free and open source under the MIT license.
- AWS bills you for the resources in your account. The wizard shows the monthly estimate before you deploy, and one
  command removes everything when you're done.
- The [Stacktape Console](/getting-started/add-the-console) is optional. It's free while your organization's AWS spend
  managed by Stacktape stays at or under $200 a month.

Prefer to write the configuration yourself? [Configuration files](/configuration/configuration-files) explains the
format. You can still deploy it with the same commands.
