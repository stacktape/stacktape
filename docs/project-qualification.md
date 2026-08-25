# Project qualification

Project qualification tests the path a customer actually takes from an existing application to a usable Stacktape
deployment. It joins checks that used to be separate: importer accuracy, source packaging, synthesized infrastructure,
artifact runtime behavior, and selected live AWS deployments.

The runner is intentionally useful during development. A failure report contains the failed stage, a redacted output
tail, generated configuration, synthesized template when available, and a command that reproduces one project.

## What each lane proves

| Lane      | Scope                                   | What passes                                                                                                                                          | What it does not prove                                  |
| --------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `import`  | Every selected project                  | The real terminal init flow produces resources, valid YAML, no unsupported claims about live hosting, and the case's exact semantic expectations.    | The generated workloads can be built or started.        |
| `package` | Every eligible selected project         | The source CLI installs dependencies, packages every inferred workload, resolves the template, and writes a non-empty CloudFormation template.       | The application responds correctly after deployment.    |
| `runtime` | Run-wide synthetic artifacts            | Stable representative Lambda, image, Astro, and SvelteKit artifacts execute in their real Docker runtimes.                                           | Every imported application's business behavior.         |
| `aws`     | One or more explicitly named archetypes | Stacktape creates resources in a disposable account, checks live behavior, exercises updates where applicable, and cleans up the recorded resources. | Every public project or every AWS resource combination. |

The package lane redirects the Stacktape CLI's AWS and Stacktape clients to a loopback guard. The guard supplies a fake
AWS identity, an absent stack, empty metadata, and exact placeholder secrets. It refuses and records CLI requests
outside that narrow contract. It is not a security sandbox for project code: package managers, lifecycle scripts,
Dockerfiles, Nixpacks, buildpacks, and framework builders can execute code and use the public network.

For that reason, the package lane refuses to run on an ordinary host unless the operator explicitly adds
`--allow-host-project-code`. Use that flag only for a pinned project whose execution risk has been reviewed and
accepted. Newly discovered internet projects start with the import lane and should package in the disposable
qualification environment. A Git worktree and a scrubbed child environment improve isolation but do not make arbitrary
code safe on the host.

Packaging is not deployment qualification by itself. A successful package proves that Stacktape can turn the project
into deployment artifacts and a template. It does not prove that an ALB health check passes, a migration succeeds
against RDS, CloudFront serves the site, IAM permissions are sufficient, or cleanup is complete. The runtime and AWS
lanes supply those additional kinds of evidence.

## Running it

Run commands from the public repository root:

```sh
# See all built-in projects and the separate AWS scenarios.
pnpm qualify:projects -- --list

# Default representative import set (does not execute project build scripts).
pnpm qualify:projects -- --preset=smoke --lanes=import

# Full source packaging for reviewed pinned projects on this host.
pnpm qualify:projects -- --preset=smoke --lanes=import,package --allow-host-project-code

# One project, with isolated sources retained if it fails.
pnpm qualify:projects -- --case=docker-fastapi --lanes=import,package --allow-host-project-code --keep-workdirs

# Every exact release importer contract. A persistent cache avoids cloning pinned commits again.
pnpm qualify:projects -- --preset=release --lanes=import,package --allow-host-project-code --cache-root=.stacktape/project-cache

# Execute packaged synthetic artifacts in their target Docker runtimes.
pnpm qualify:projects -- --lanes=runtime

# Split a large corpus across ten workers.
pnpm qualify:projects -- --preset=all --lanes=import,package --allow-host-project-code --shard=3/10

# Continue after an interruption. A project is skipped only when its source, requested lanes, and complete
# Stacktape working-tree fingerprint match a previous passing result.
pnpm qualify:projects -- --preset=all --lanes=import,package --allow-host-project-code --resume-from=.stacktape/qualification/<previous-run>/qualification-report.json
```

Use `--max-cases=<count>` to bound an exploratory run. Use `--fail-fast` when one failure should stop later projects.
`--output-dir` and `--cache-root` are resolved from the directory in which the user invoked pnpm, including on Windows.

Each run writes:

```text
qualification-report.json       versioned machine-readable result
qualification-report.md         human summary and reproduction commands
cases/<id>/result.json          result written immediately after that project
cases/<id>/stacktape.yml        generated importer output
cases/<id>/compiled-template.yml  template when synthesis reached that point
```

The per-case result makes a partially completed run useful. The final report includes the exact Git commit and a hash of
tracked changes plus untracked source files. Case fingerprints also include the exact materialized project source and
the Node, Bun, Docker, operating-system, and architecture context. A resumed success stays a passing result, records its
original report, and carries its configuration/template evidence forward.

## External and synthetic corpora

Pass one or more versioned JSON manifests with `--manifest=<path>`. When no preset is supplied, only cases from those
manifests run. Local project paths are relative to the manifest and cannot escape its directory. Public repositories
must use HTTPS and a full 40-character commit. A minimal manifest is:

```json
{
  "schemaVersion": 1,
  "cases": [
    {
      "id": "fastify-postgres-worker",
      "title": "Fastify API with PostgreSQL and a worker",
      "why": "Covers a common small-team backend with two process types and a relational dependency.",
      "source": {
        "kind": "local",
        "path": "projects/fastify-postgres-worker",
        "license": "Synthetic fixture owned by Stacktape"
      },
      "origin": "synthetic",
      "tags": ["node", "fastify", "postgres", "worker"],
      "lanes": ["import", "package"],
      "deployment": {
        "policy": "never",
        "costClass": "high",
        "reason": "Its AWS behavior is already represented by the container and database canaries."
      }
    }
  ]
}
```

Add `expect` after reviewing the first discovery result. Expectations are a release contract. Do not weaken them merely
to make a changed importer pass. First decide whether the source changed, the old expectation was wrong, or Stacktape
regressed.

## What should be stored where

Use three storage layers instead of one very large repository:

1. The Stacktape repository owns the runner, schemas, AWS canaries, distilled regression tests, and the small built-in
   manifest. This keeps product changes and their qualification contract reviewable together.
2. A separate normal Git repository such as `stacktape-qualification-corpus` owns complete synthetic projects and its
   manifest. Commit source, manifests, lockfiles, Dockerfiles, migrations, and tiny fixture assets. Do not commit
   `node_modules`, build outputs, Docker layers, caches, generated Stacktape configs, or run reports. Use Git LFS only
   for a case whose behavior genuinely requires a binary fixture.
3. Public real projects remain references: repository URL, full commit, subdirectory, origin, license, and expectation.
   The runner clones them into a persistent local or CI cache. For release-critical cases, maintain an internal mirror
   or periodic Git bundle so an upstream deletion does not erase the test; continue reporting the original URL and
   commit.

Store full run reports as CI artifacts or in versioned object storage, not Git. Keep a short coverage summary and links
to those immutable reports in the release record. This stays workable at hundreds of projects without making every
Stacktape clone enormous.

## Choosing projects

The corpus should resemble the teams described in `apps/console/documents/business`: early startups and agencies,
usually two to ten developers, deploying full-stack or backend products without a dedicated infrastructure team. Choose
projects for a missing behavior, not merely because a repository is popular.

Useful coverage axes include:

- application shape: full-stack SaaS, REST/GraphQL API, static frontend, webhook service, worker, scheduler, event
  consumer, monorepo, and migration job;
- languages and frameworks: current Node/TypeScript, Python, Go, Ruby, PHP, Java, .NET, Rust, and the frameworks those
  customers actually start from;
- packaging: plain Lambda, Stacktape buildpack, Dockerfile, Nixpacks, external buildpack, Next.js/OpenNext, native
  modules, Prisma/code generation, and older but still supported lockfiles;
- dependencies: PostgreSQL/MySQL, Redis, DynamoDB, queues, topics, buckets, email, secrets, and third-party services;
- prior platform evidence: Vercel, Railway, Render, Heroku, Fly, SST, Serverless Framework, SAM, CDK, Terraform,
  Kubernetes, and Docker Compose;
- difficult repository traits: nested workspaces, several lockfiles, CRLF, executable scripts, unusual ports, multiple
  process types, non-root Docker users, and build-time environment variables.

Prefer, in order: a maintained real application, an official framework/platform starter, a real public example, and a
purpose-built synthetic project. Before blaming Stacktape for a build failure, run the project's documented native build
when practical. Record an upstream build failure as such; it is still useful evidence but not a passing Stacktape
qualification.

## Live AWS policy

Package broadly. Do not deploy every public project. Doing so repeatedly provisions duplicate ALBs, NAT/VPC resources,
databases, CloudFront distributions, log groups, and secrets without adding equivalent coverage. It also makes cleanup
and cost failures dominate the signal.

Instead, deploy explicit archetypes selected across five dimensions: workload runtime, packaging path, stateful AWS
resource, network topology, and init-specific behavior such as generated secrets or migrations. Current scenarios are:

| Scenario                  | Policy        | Main evidence                                                                                           |
| ------------------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| `lambda-packaging-update` | Routine       | Lambda artifacts, shared layer, live invocation, exact no-op redeploy, code/environment update, cleanup |
| `init-static-site`        | Routine       | Init, Vite, hosting bucket, CloudFront, HTTPS response, cleanup                                         |
| `init-node-container`     | Periodic      | Init, Node buildpack/container, web service, load balancer, health, cleanup                             |
| `init-python-container`   | Periodic      | Init, Python container path, web service, health, cleanup                                               |
| `init-postgres-migration` | Release-depth | Init, VPC, RDS, generated secret, migration, application health, cleanup                                |

No preset or `--lanes=aws` command chooses a scenario automatically. A real-AWS run requires both an explicit scenario
and the canary's independent guardrails: mutation opt-in, disposable-account phrase, exact account ID, explicit
credential mode/profile, unique owner/project name, Stacktape API key, and for init a state file and connected account.
The canaries support Windows, Linux, and macOS.

On PowerShell, set the values outside chat and then run, for example:

```powershell
$env:STP_AWS_CANARY_DEPLOY = '1'
$env:STP_AWS_CANARY_CONFIRM_DISPOSABLE = 'this-is-a-disposable-test-account'
$env:STP_AWS_CANARY_EXPECTED_ACCOUNT_ID = '<exact 12-digit disposable account id>'
$env:STP_AWS_CANARY_CREDENTIAL_MODE = 'profile'
$env:STP_AWS_CANARY_PROFILE = '<explicit profile>'
$env:STP_AWS_CANARY_PROJECT_NAME = 'v4canary-<unique-lowercase-id>'
$env:STP_AWS_CANARY_OWNER = 'local-<unique-id>'
# Configure STACKTAPE_API_KEY as a masked environment secret; never paste it into a report or chat.
pnpm qualify:projects -- --lanes=aws --aws-scenario=lambda-packaging-update
```

Init scenarios additionally require the variables documented in `apps/cli/scripts/real-aws/README.md`. If cleanup is
interrupted, preserve the state file and use the canary's `--cleanup-only` recovery command before starting another run.
