# Stacktape init: from local project to running on AWS

Status: proposed product design
Date: 2026-08-09

## The goal

The main job of `stacktape init` is:

> Take a project that is not deployed anywhere and get it successfully running on AWS.

Everything else is secondary. The primary success metric is not configuration correctness, architecture purity, or
how much infrastructure Stacktape inferred. It is:

> Did the user get a working deployment, and how long did it take?

A good target for supported projects:

- at least 70% deploy successfully on the first attempt;
- at least 90% deploy after at most two automatic repair attempts;
- median time from `stacktape init` to a working application below 10 minutes;
- zero or one question for most projects.

## Review summary

These are the product decisions. The rest of the document explains them.

1. The local coding agent reads the project and generates Stacktape config directly.
2. The user reviews one compact proposal and clicks **Deploy to AWS**.
3. Stacktape deploys, verifies the application, and gives failures back to the agent for at most two repairs.
4. Success means a healthy workload and working URL, not merely a valid config or completed CloudFormation stack.
5. The localhost UI has four views: analyzing, ready, deploying, and success.
6. After the first successful deploy, Stacktape offers automatic deployment through an official GitHub Action.
7. Existing production data is referenced for the first deploy and moved later in a separate flow.
8. We optimize for working in most target projects, not exhaustive correctness across every framework and CI setup.

## The experience

```text
Scan project -> Generate config -> Review -> Deploy -> Verify -> Add CI/CD
```

### 1. Scan

The CLI opens a local browser and starts analyzing the repository.

It detects an installed coding agent and uses the user's existing subscription. The user can select another one or
disable AI, but there is no provider setup wizard when a working agent is already available.

The screen says something like:

> Analyzing with Claude Code. Stacktape does not receive your source code. Claude will read files in this project.

The agent can explore the repository read-only. Stacktape also gives it the current local Stacktape schema and
documentation so it does not rely on remembered syntax.

### 2. Generate

The agent directly generates the candidate Stacktape config. Do not build a large intermediate representation and a
second infrastructure compiler before there is evidence that this improves deployment success.

The agent returns only:

- the complete candidate config;
- the applications/resources it believes it found;
- short assumptions shown to the user;
- at most a few questions that block a reasonable deployment.

The CLI keeps the candidate in temporary session state, validates it against the real Stacktape schema, and asks the
agent to fix schema errors. The repository is not changed yet.

Use deterministic code where it is obviously better than AI:

- repository walking and secret exclusion;
- package manager and monorepo detection;
- choosing the config filename and format;
- parsing and validating generated config;
- cost calculation;
- CI workflow templates;
- file diffs and writes.

Do not recreate the current large collection of heuristics before testing what modern coding agents can do with the
repository and Stacktape documentation directly.

### 3. Review

Show one compact result screen:

- **Architecture:** a small diagram and plain-language summary;
- **Config:** generated config, collapsed by default unless there is a warning;
- **Cost:** a rough monthly range with the important assumption;
- **Questions:** only decisions that genuinely block deployment;
- **Deploy:** the primary action.

The default message should be:

> We found a Next.js app and a Postgres database. This should cost approximately $X–Y/month. Ready to deploy.

Do not lead with instance sizes, availability zones, WAF, bastions, infrastructure tiers, or migration terminology.
Advanced users can open the config and change anything.

### 4. Deploy

The primary button is **Deploy to AWS**, not “Save configuration.”

If necessary, the flow helps the user:

1. log in to Stacktape;
2. select or connect an AWS account;
3. choose a region when one cannot be inferred;
4. confirm the approximate cost;
5. deploy.

The accepted config and required package changes are written immediately before deployment. Package installation,
packaging, synthesis, and deployment are shown as one progress timeline.

The user approves the deployment once. Stacktape can then make small config fixes and retry without repeatedly asking
for permission. It asks again only if a repair would replace/delete a stateful resource, materially increase cost, or
change how existing production data is handled.

### 5. Repair and verify

Actual deployment is the most useful validator. The loop is:

```text
Generate -> schema check -> package/synth -> deploy -> health check
                  ^                            |
                  +------ agent repair <-------+
```

On failure, give the coding agent:

- the current config;
- the relevant error and redacted logs;
- the files it already inspected;
- the Stacktape documentation relevant to the error.

The agent proposes a config diff. Stacktape checks it and retries. Stop after two deployment repairs and show the user
the exact remaining error, current resources, and suggested next step rather than looping indefinitely.

A deployment is successful only when:

- the Stacktape operation completed;
- workloads report healthy where health information exists;
- an HTTP application responds on its generated URL, when applicable.

The final screen celebrates the actual result:

> Your application is running on AWS.

It shows the URL, stage, region, cost estimate, architecture diagram, logs, and the committed config path.

### 6. Add CI/CD

Only after the first deployment works, show:

> Deploy this automatically when you merge to `main`?

At this point Stacktape knows the exact command, config, project, stage, region, and package setup that produced a
working deployment. CI generation is therefore much more reliable than guessing it before the first deploy.

## AI provider integration

Support the actual non-interactive commands:

| Provider    | Command        |
| ----------- | -------------- |
| Claude Code | `claude -p`    |
| Codex CLI   | `codex exec`   |
| OpenCode    | `opencode run` |

`codex -p` is a profile option and OpenCode's `-p` is a server-password option, so these need real adapters rather
than one templated command.

Keep the adapter small:

```ts
type AgentAdapter = {
  detect(): Promise<{ available: boolean; version?: string }>;
  generate(request: GenerationRequest): Promise<GeneratedCandidate>;
  repair(request: RepairRequest): Promise<GeneratedCandidate>;
  cancel(): Promise<void>;
};
```

Use each provider's available read-only, structured-output, timeout, and non-persistence options. Do not spend months
trying to prove that all providers have identical sandboxes. Stacktape validates the returned config and controls all
writes and deployments.

Start with the best-working adapter, probably Claude Code. Add Codex and OpenCode when their basic generation and
repair tests pass. If the preferred agent is missing, logged out, or rate-limited, explain how to fix it or offer
another detected provider. A simple deterministic fallback is useful, but there is no hidden Stacktape-paid model.

## What the agent can change

For init, the agent can propose:

- `stacktape.ts` or `stacktape.yml`;
- the Stacktape package dependency and useful package scripts;
- corrections to those proposed files after a failed deployment.

The agent does not directly edit the checkout. It returns candidate file contents or a patch to the CLI. Stacktape
shows the result and performs the write.

CI files are produced from Stacktape templates, informed by the agent's understanding of the project. The agent does
not freely rewrite workflow YAML.

## Localhost UI

The browser UI is a CLI-owned static application. Reuse the existing shared config editor and infrastructure diagram
components; do not reuse the private Console application.

Keep it to four views:

1. **Analyzing** — files/frameworks found and agent progress;
2. **Ready to deploy** — architecture, cost, questions, and config;
3. **Deploying** — packaging, AWS resources, retries, and logs;
4. **Success** — URL, resources, cost, and CI/CD setup.

The terminal uses the same session for SSH, accessibility, and automation.

The local server needs basic product-grade protection, not a framework:

- listen only on `127.0.0.1` using a random port;
- use an unguessable session token;
- serve bundled assets only;
- never expose arbitrary file-reading endpoints;
- stop on completion, cancellation, timeout, or terminal exit.

## GitHub Actions

Create an official public `stacktape/action` and make it the normal way to deploy from GitHub Actions.

It should be a bundled JavaScript action that:

- downloads and verifies the intended Stacktape CLI release;
- authenticates, eventually using GitHub OIDC for short-lived Stacktape credentials;
- runs a small set of operations such as `deploy`, `validate`, and `run-script`;
- streams readable progress and exposes the deployment URL/status as outputs;
- handles cancellation and cleanup.

Do not expose a free-form command string. Use separate inputs for operation, project, stage, region, config path, and
declared script name.

The workflow remains readable:

```yaml
stacktape_deploy:
  needs: [test]
  runs-on: ubuntu-latest
  environment: production
  permissions:
    contents: read
    id-token: write
  concurrency:
    group: stacktape-my-project-production
    cancel-in-progress: false
  steps:
    - uses: actions/checkout@<full-commit-sha>
    - uses: stacktape/action@<full-commit-sha> # Stacktape Action v1
      with:
        operation: deploy
        project: my-project
        stage: production
        region: eu-west-1
        config-path: stacktape.ts
```

For repositories with GitHub Actions:

- find the workflow and job that run the main tests;
- add the Stacktape deployment job with `needs` pointing to those tests;
- show the diff;
- if the workflow is too unusual to edit confidently, create a separate workflow or show the small job snippet.

For repositories without Actions, create a standard workflow.

The initializer should make a good attempt rather than support every workflow construct perfectly. If the generated
workflow fails, the error can be fixed normally; it is not a reason to build a universal lossless CI compiler first.

### Credentials

Initially, the Action can use a dedicated Stacktape API key stored in a GitHub Environment secret. The UI guides the
user through setting it without printing or committing it.

The better follow-up is GitHub OIDC:

1. the job requests a GitHub identity token;
2. Stacktape verifies repository, workflow, branch/environment, project, and stage;
3. Stacktape issues a short-lived deployment token for that run.

This removes secret setup and is worth building, but it should not block the first version of CI integration.

### Database migrations and other commands

Detect existing scripts such as `migrate`, `db:migrate`, or framework-specific migration commands. After the first
successful deployment, ask:

> Run `<detected script>` before future deployments?

If accepted, add it as a visible CI step. Prefer a declared Stacktape script/job when it needs private network access.
Do not invent migration commands.

Long data copies and backfills need the proposed one-shot Fargate job later. They should not delay ordinary deploys.

### Self-hosted EC2 runner

Do not recommend it by default. Offer it when the project needs private-network access, much larger compute, or
materially faster repeated builds.

The current runner hibernates and keeps caches between jobs, so call it persistent rather than ephemeral. A truly
ephemeral per-job version and OIDC credentials would be a useful improvement, but are not required for getting the
first application deployed.

## Existing databases and adoption

Do not turn `init` into a migration wizard.

When Stacktape finds a database or another stateful service, ask one question only if necessary:

> Does this contain production data that must be preserved?

- **No:** create the recommended Stacktape resource and deploy.
- **Yes:** keep using the existing service for the first AWS deployment. Help store its connection value as a secret.
  The application gets online first.

After the application is running, offer **Move this data to AWS** as a separate guided operation. That operation can
use the copy/reference/adopt/cutover model from
[`adopt-and-bootstrap-design-2026-08-05.md`](./adopt-and-bootstrap-design-2026-08-05.md).

This sequencing is important: lift the application first, migrate state second. It reduces the number of things that
can fail at once and gives the user value sooner.

Adopting existing AWS resources is also a later workflow. It needs a takeover preview and preservation of state, but
it is not part of the common “local project to first deployment” journey.

## The few guardrails worth keeping

This product does not need perfect inference. It does need to avoid the failures that destroy trust:

1. Never send `.env` values, credentials, or known secret files to the coding agent.
2. Never read outside the selected project directory, including through `..` or symlinks.
3. Show the generated config and important repair diffs.
4. Ask again before deleting/replacing stateful resources or materially increasing cost.
5. Never run a migration or data-copy command inferred only by AI.
6. Stop repair loops after a small number of attempts and leave a useful diagnosis.

Everything else should favor attempting the deployment and learning from the actual result.

## What to build, in order

### Milestone 1: the deployment loop

- Move AI invocation into the CLI using one local provider.
- Let the agent read the repo and bundled Stacktape docs and generate config directly.
- Validate, deploy, capture errors, repair, redeploy, and verify the URL.
- Start with the terminal interface so the end-to-end loop can be evaluated quickly.
- Remove the anonymous server generation path once the client path is stable.

### Milestone 2: the localhost experience

- Add the four-screen browser UI.
- Show architecture, config, approximate cost, deployment progress, repairs, and the working URL.
- Package the shared editor/diagram assets with the CLI.

### Milestone 3: automatic delivery

- Publish `stacktape/action`.
- Add GitHub workflow detection and best-effort insertion after existing tests.
- Add API-key setup, followed by OIDC.
- Add detected migration/script steps.

### Milestone 4: move existing state

- Add the post-deployment copy/reference flow.
- Add the one-shot Fargate job.
- Add safe adoption for selected AWS resources.
- Improve the self-hosted runner where it provides real value.

These are implementation milestones. The public product release can bundle the first three if desired, but they
should be built and measured in this order.

## How to evaluate it

Use the projects already tested with the old generator plus representative Stacktape starters. For each project:

1. remove its Stacktape config;
2. run init from a clean AWS test account;
3. allow at most two repairs;
4. verify the deployed application, not just CloudFormation completion;
5. record time, questions, attempts, cost, and the reason for failure.

The dashboard should primarily show:

- successful deployments / attempted projects;
- first-attempt success rate;
- success after repairs;
- median time to working application;
- questions per project;
- failures grouped by framework/resource/error;
- unnecessary or unexpectedly expensive resources.

Use schema/static tests for fast development, but judge releases by real deployments in a disposable, cost-capped AWS
account. The generator is good when applications run, not when configs look elegant.

## Small immediate fixes

Regardless of the redesign:

- fix the current file reader so requested paths cannot escape the repository;
- stop excluding `.env.example` and `.env.sample` while continuing to exclude their values;
- clearly disclose the existing server upload until it is removed;
- make current cancellation terminate the underlying generation work.

## Independent review

Claude's installed `opus` model reviewed the repository and the earlier design using the user's subscription. Its most
useful findings remain relevant: the current file reader has a containment gap, `.env.example` is accidentally
excluded, the existing validation lifecycle has side effects, and the current EC2 runner is persistent rather than
ephemeral.

The earlier review over-weighted those architectural and safety concerns. This version keeps the practical findings
but makes successful deployment the organizing principle.
