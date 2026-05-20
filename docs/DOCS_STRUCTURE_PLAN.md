# Stacktape Docs Structure Plan

This is the canonical information architecture used by the docs generation pipeline. The pipeline
([`docs/scripts/generate-docs/`](./scripts/generate-docs/)) reads this file and the page list in
[`pages.ts`](./scripts/generate-docs/pages.ts), then generates the MDX in `docs/`.

The IA follows the **"guided tour"** philosophy adapted to a hands-on Getting Started: a linear,
practical onboarding sequence followed by reference-style sections. Getting Started is the front
door; everything else is reached *after* the user has shipped something.

## Top-level navigation

1. **Introduction** — single positioning page; sets up Getting Started.
2. **Getting Started** — 6 sequential, hands-on pages, each ending with a "next →" link.
3. **Configuration** — concepts (was "Core Concepts"): files, resources, stages, connecting, directives, variables, hooks, overrides.
4. **Resources** — catalogue: compute, frontend, databases, storage, networking, messaging, orchestration, security, advanced.
5. **Packaging** — how Stacktape builds and uploads your code:
   - `packaging/function/*` — Lambda packaging (Stacktape buildpack, custom artifact, language-specific config).
   - `packaging/containers/*` — container packaging (Stacktape buildpack, custom Dockerfile, prebuilt image, Nixpacks, external buildpack).
6. **Deploying & lifecycle** — deploys, previews, gradual deployments, rollbacks, multi-region, destroy, deploy-time params.
7. **Observability** — logs, metrics, alarms, issues, alert channels, notifications, alert history, log forwarding.
8. **Managing Costs** — cost dashboards, budgets, per-resource breakdown, optimization tips.
9. **Guardrails** — overview, deployment guardrails, security & data-protection guardrails, resource-limit guardrails, database guardrails.
10. **CI/CD & GitOps** — overview, GitOps with Console, build runners, self-hosted GitHub Actions runners, custom CI/CD, stacks-per-branch.
11. **Local development** — dev mode, debugging Lambda + containers, local databases, debug commands.
12. **Using with AI** — overview, agent mode in dev, AI config generation, coding-assistant integrations, MCP server (preview).
13. **Stacktape Console** — overview, AWS accounts, projects/stages, visual config editor, API keys, team & access, billing.
14. **Recipes** — REST API + DB, GraphQL, Next.js, background jobs, scheduled tasks, static website, monorepo, migrations, multi-tenant, PR previews.
15. **CLI Reference** — one page per CLI command at `/cli/<command-name>`. Auto-generated.

## Getting Started (section 2) — design notes

6 pages, linear, hands-on. Each ends with a "next →" link. The reader is already sold on Stacktape
when they land here; the goal is to walk them from "I want to try this" to "I have a hardened
production deployment".

1. **Configure your stack** — `stacktape init` from a starter, the Console's AI config generation, or the visual editor with IntelliSense + price preview. Lands the reader with a working `stacktape.ts`.
2. **Use the dev mode** — `stacktape dev`. Edit code, see live results, no redeploy. The wow moment.
3. **Deploy your first stage** — login, AWS account connection, `stacktape deploy`. A real CloudFormation stack comes up in the user's AWS account.
4. **Manage your app in the Console** — logs, metrics, alarms, issues, cost, secrets — all auto-provisioned, all visible. Sells the "you got this for free" angle.
5. **CI/CD** — GitOps via Console (recommended) or custom CI integration. Push-to-deploy + PR previews.
6. **Going to production** — alarms, budgets, custom domains, multi-region, gradual deployments, guardrails. The production-readiness checklist.

Each page showcases a relevant best part of Stacktape contextually — visual editor + AI config gen
in step 1, dev mode in step 2, deploy UX in step 3, the Console platform in step 4, GitOps in step 5,
production hardening in step 6.

Returning users see a small "skip ahead" link at the top of each page so they aren't trapped in the
linear flow.

## Packaging (section 5) — design notes

Top-level section with a hub overview and two sub-sections. The split mirrors how Stacktape's
schema separates packaging types: `LambdaPackaging` vs `ContainerWorkloadContainerPackaging`.

- `packaging/overview` — hub. Decision-oriented, explains the function-vs-containers split.
- `packaging/function/*` (3 pages) — Lambda packaging modes:
  - `stacktape-buildpack` (zero-config from source)
  - `custom-artifact` (pre-built zip)
  - `language-specific-config` (Node/Python/Java/Go/Ruby/PHP/.NET tuning)
- `packaging/containers/*` (5 pages) — container packaging modes for ECS/Fargate workloads
  (web-service, private-service, worker-service, multi-container-workload, batch-job):
  - `stacktape-buildpack` (zero-config image build)
  - `custom-dockerfile`
  - `prebuilt-image`
  - `nixpacks`
  - `external-buildpack`

The previous "Cross-cutting Features" parent has been retired. Other content that lived under it
moved as follows:

- Triggers (12 pages) → `configuration/triggers/*` (sub-section of Configuration).
- Secrets → `configuration/secrets`.
- Custom domains → covered by `resources/networking/custom-domains` (the resource page is the canonical doc).
- Authentication → covered by `resources/security/user-auth-pool` (the resource page is the canonical doc).
- The cross-cutting overview hub page was dropped — no replacement.

## Observability, Managing Costs, Guardrails (sections 7-9) — design notes

These were briefly merged into a single "Operations" section but split back out because they answer
different questions and the merged page list became unwieldy:

- **Observability** answers "what is my stack doing right now / what went wrong?" — logs, metrics,
  alarms, issues, notifications, log forwarding.
- **Managing Costs** answers "what am I spending and how do I control it?" — dashboards, budgets,
  per-resource breakdown, optimization.
- **Guardrails** answers "how do I prevent the team from doing the wrong thing?" — preventive policy
  on deployments, security defaults, resource limits, database shapes. Promoted to top-level because
  guardrails are organization-wide policy controls, not a sub-concern of monitoring.

## Using with AI (section 12) — note on MCP

The MCP server is currently in active development. The `using-with-ai/mcp-server-setup` page is generated
as a preview / "in active development" page rather than as a finished setup guide. Revisit this when MCP
ships.

## Reference section retired — folded into Configuration

The old top-level Reference section was merged into Configuration because most of its content
duplicated or sat next to a Configuration concept page:

- `reference/configuration-schema` — dropped. The config shape is documented in
  `configuration/configuration-files`, and the JSON Schema is auto-generated.
- `reference/directives-reference` — folded into `configuration/directives`. One page covers both
  the concept and the full directive list.
- `reference/environment-variables-injected-by-connectto` — folded into
  `configuration/connecting-resources`. One page covers both the concept and the env-var table.
- `reference/referenceable-parameters` — moved to `configuration/referenceable-parameters`.
- `reference/aws-permissions-needed` — moved to `stacktape-console/aws-permissions` (it's a Console
  setup concern, not a config-time one).

## CLI Reference (section 15)

One auto-generated page per CLI command at `/cli/<command-name>`. Lifted out of Reference into its
own top-level section because the per-command list is long and would dominate Reference's nav.
Section instructions live under the `cli:` key in `section-instructions.yml`.

## What this plan does NOT contain

- Per-page content. The writer agent picks H2/H3 structure inside each page based on the source files
  and the section instructions in `scripts/generate-docs/section-instructions.yml`.
- Visual design. Component design is in [`src/components/Mdx/`](./src/components/Mdx/).
- Migration mechanics from the old IA. The old MDX in `docs/docs/` is being rewritten in place by the
  pipeline; orphaned files (from the old structure) need to be cleaned up manually as the new pages
  generate.
