# Stacktape init configuration-inference evaluation

Date: 2026-08-14 Corpus: historical `console-app/test-projects` corpus (122 synthetic projects) Pipeline:
`stacktape init`, deterministic scans plus optional local coding-agent review

## Executive summary

The initial implementation completed every case but frequently completed with the wrong topology. It treated browser
builds as servers, Lambda handlers as permanent workers, several non-SQS queue protocols as SQS, missed standalone
Dockerfiles, invented monorepo root services, and trusted agent additions only after it was too late for the model to
repair them.

After the fixes described below, the deterministic run completes all 122 projects in about 20 seconds. It produces 237
resources from 150 services and 89 dependencies. Only one fixture is empty, and that fixture contains a parent Maven POM
plus placeholder classes with no module manifests, framework annotations, or executable service. Fifteen projects retain
a blocking “no runnable entrypoint” finding; inspection confirmed that their synthetic sources really omit the command,
server/application object, Dockerfile, or equivalent needed to make a defensible deployment.

This is a strong deterministic floor, not proof that every emitted configuration will deploy. No AWS deployment was run.
The corpus exercises 19 resource types; the 63 resource and trigger guides under `apps/docs/content/resources` describe
a much broader product surface.

## Corpus isolation and safety

- Removed 378 pre-existing generated artifacts before evaluation: 122 each of `low-cost.stacktape.yml`,
  `standard.stacktape.yml`, and `production.stacktape.yml`, two `stacktape.ts` files, and ten prior AI-generated YAML
  files. The removals were staged in the separate historical corpus repository and were recoverable from Git.
- The evaluation runner deletes root config candidates before and after every individual run. It also verifies that the
  deletion target remains inside the selected corpus project.
- Final verification found zero generated config artifacts in the corpus.
- No deploy, delete, login, AWS mutation, commit, push, or history rewrite was performed.
- Results and the runner are kept under ignored `.stacktape/config-inference-eval` directories in the public checkout.

## Judging rubric

A runner status of “passed” means only that `init` returned. Each result was instead judged on:

1. Topology: each runnable process becomes the correct service/function/static resource, without phantom workspace
   roots.
2. Packaging: a real Dockerfile or source entrypoint is preferred; development servers and invented commands are
   rejected.
3. Protocol compatibility: Redis queues stay Redis, SNS stays SNS, RabbitMQ/AMQP is not replaced by SQS, and exact SAM
   event types are retained.
4. Wiring: dependencies connect only to declared consumers, with secrets represented as references rather than values.
5. Evidence: agent-introduced high-impact fields must be supported by readable repository bytes while the model can
   still repair a rejected submission.
6. Honesty: a missing trigger or runnable entrypoint is an explicit gap, not guessed infrastructure.
7. Schema: representative outputs for every newly composed shape parse against the Stacktape configuration schema.

## Deterministic results

| Metric                                       |               Initial baseline |     Final |                                        Change |
| -------------------------------------------- | -----------------------------: | --------: | --------------------------------------------: |
| Projects completed                           |                      122 / 122 | 122 / 122 |                                        stable |
| Empty configurations                         |                             24 |         1 |                                           -23 |
| Detected services                            |                            103 |       150 |                                           +47 |
| Detected dependencies                        |                             85 |        89 | +4, with incompatible false positives removed |
| Composed resources                           |                            183 |       237 |                                           +54 |
| Recorded gaps                                |                             76 |        29 |                                           -47 |
| Projects with blocking completeness findings | 48 after the first static pass |        15 |                                           -33 |

Final resource distribution:

| Resource type      | Count | Resource type            | Count |
| ------------------ | ----: | ------------------------ | ----: |
| `web-service`      |    67 | `relational-database`    |    39 |
| `hosting-bucket`   |    23 | `redis-cluster`          |    22 |
| `function`         |    19 | `nextjs-web`             |    18 |
| `dynamo-db-table`  |     8 | `sqs-queue`              |     8 |
| `worker-service`   |     5 | `astro-web`              |     5 |
| `remix-web`        |     4 | `sveltekit-web`          |     4 |
| `http-api-gateway` |     3 | `bucket`                 |     3 |
| `nuxt-web`         |     3 | `mongo-db-atlas-cluster` |     2 |
| `sns-topic`        |     2 | `solidstart-web`         |     1 |
| `tanstack-web`     |     1 |                          |       |

The 29 final gaps are intentional and visible:

| Gap class                                 | Count | Assessment                                                                      |
| ----------------------------------------- | ----: | ------------------------------------------------------------------------------- |
| Missing runnable entrypoint               |    15 | The fixtures declare packages but omit runnable code/config. Do not invent one. |
| Function source with no declared trigger  |     7 | Correctly creates the function and asks for the absent event.                   |
| Email provider/domain setup               |     4 | SES/domain configuration is not inferred as an owned application resource.      |
| Existing-IaC boundary                     |     2 | Correctly states that the new config does not take over the existing SAM stack. |
| Managed Kafka unsupported by the composer |     1 | Correct protocol, explicit unsupported-resource gap.                            |

The sole empty case, `java-spring-and-quarkus-same-repo`, is correctly empty: its root is a packaging-only Maven POM and
its two child directories have no child POM/Gradle file, Spring/Quarkus annotation, server bind, or runnable command.

## Defects found and fixed

### Resource and packaging inference

- Static HTML, Vite, React, Vue, Angular, Gatsby, and build-only frontends now use `hosting-bucket`; development servers
  no longer become production containers.
- Workspace orchestration roots no longer become phantom services.
- Deno Fresh and Streamlit receive defensible production commands.
- Standalone Dockerfiles are now probed. Their `EXPOSE` ports classify web versus worker processes, and nested
  Dockerfile paths are made relative to their build context as required by the Stacktape schema.
- Source entrypoint probing now supports JavaScript/TypeScript server binds, Hono fetch exports, FastAPI/Flask/Django,
  PHP front controllers, Go servers, Spring Boot mains, and BullMQ workers. These use Stacktape’s source image
  buildpack.
- Package-only Nest detection no longer claims HTTP. A `createApplicationContext` without a listener is not a web
  service; a real BullMQ worker in the same project is emitted as a worker and connected to Redis.
- Current Quarkus REST artifact names, WordPress/MySQL, SolidStart, and TanStack Start are recognized.

### Serverless and events

- Added explicit function facts and HTTP, SQS, SNS, S3, and schedule trigger facts.
- SAM templates now preserve individual handlers, exact routes, named DynamoDB/SQS/SNS/S3 dependencies, and their real
  consumers. HTTP functions share one HTTP API gateway.
- Handler-shaped source without an IaC descriptor becomes a function with an explicit missing-trigger gap, rather than a
  permanently running worker with an invented route.
- DynamoDB stream triggers remain unsupported by the current function-trigger fact union and are listed as follow-up
  work.

### Dependency correctness

- BullMQ, Bull, Bee Queue, Sidekiq, Resque, and Celery are no longer translated to SQS.
- SNS client evidence creates an SNS topic, not an SQS queue.
- RabbitMQ libraries remain AMQP and produce an explicit unsupported-resource gap rather than incompatible SQS.
- Kombu alone no longer invents RabbitMQ; it is also Celery’s transport abstraction and is used with Redis in this
  corpus.
- Multiple concrete dependencies of the same kind retain their names and consumers. Workspace packages that are not
  deployable services no longer remain as invalid consumers; same-package worker dependencies are attributed correctly.

### Agent boundary and Windows execution

- On Windows, detected Codex/Claude executables are resolved to absolute executables and only actual shell scripts use a
  shell. This fixes Codex MCP arguments being flattened into an invalid TOML string.
- An agent failure now produces a visible fallback message instead of silently looking like an assisted success.
- `submit_facts` verifies new services, dependencies, HTTP claims, ports, commands, schedules, function
  entrypoints/events, and container entrypoints during the live session. Rejected submissions include repairable
  field-level feedback.
- A container file’s existence is no longer enough to prove an HTTP entrypoint. The entrypoint itself must create/expose
  an HTTP application, which closes the Nest false-repair found during this evaluation.

## Coding-agent results

Six current Codex-assisted cases were run after deleting configs for each case:

| Case                                        |        Time | Input tokens | Output tokens | Material result versus deterministic                                         |
| ------------------------------------------- | ----------: | -----------: | ------------: | ---------------------------------------------------------------------------- |
| `static-html-site`                          |      23.9 s |       74,414 |           586 | No config delta; correctly kept static hosting.                              |
| `java-spring-and-quarkus-same-repo`         |      51.1 s |      108,268 |         1,544 | No config delta; correctly declined to invent services.                      |
| `nestjs-api-and-worker` (repaired pipeline) |      53.6 s |       93,041 |         2,030 | Same correct worker/Redis graph; enriched environment evidence.              |
| `ts-lambda-api-gateway`                     |      63.5 s |      136,569 |         2,369 | No resource/config delta; retained exact SAM functions and routes.           |
| `python-streamlit`                          |      64.0 s |      185,665 |         2,248 | No config delta; exposed a noisy command-verifier finding that was fixed.    |
| `microservices-docker-compose`              |     158.0 s |      243,527 |         6,523 | Same resource graph; usefully surfaced two external SMTP secret gaps.        |
| **Total**                                   | **414.1 s** |  **841,484** |    **15,300** | One case added meaningful user-facing gaps; none changed the resource graph. |

This sample argues for a product-level gating decision: do not automatically spend an agent run when deterministic facts
are complete and gap-free. The deterministic corpus finishes all 122 cases in less time than the fastest nontrivial
agent review. Agent review remains valuable for unresolved environment semantics and genuinely incomplete drafts.

An initial set of assisted runs was deliberately retained as defect evidence. Before the fixes, agents/deterministic
facts produced paid containers for static sites, used development servers for Angular/Vite, turned Lambda handlers into
five always-on workers (about $107/month), confused SNS/RabbitMQ/Redis-backed queues with SQS, and accepted a non-HTTP
Nest context as a web entrypoint. Those failures drove the probes and trust-boundary changes above.

Claude Code 2.1.220 was detected but its local OAuth session was expired. The pipeline fell back in 1.8 seconds, spent
no tokens, clearly reported the authentication failure, and still returned the correct deterministic static-hosting
config. No login was attempted.

## Remaining risks and follow-up work

1. The corpus is broad by framework but not by the complete Stacktape resource catalogue. It does not meaningfully cover
   AgentCore resources, AppSync/WebSocket gateways, DSQL/OpenSearch, EventBridge/Kinesis/state machines, EFS, WAF,
   bastions, custom networking, or most trigger variants. Add minimal semantic fixtures before claiming those surfaces.
2. Add DynamoDB stream, EventBridge, Kinesis, and Kafka function-trigger facts and composer mappings. Do not infer these
   from handler types alone; require an IaC/event descriptor.
3. Fifteen fixtures intentionally remain blocked because their source is not runnable. If these are intended to
   represent valid applications, fix the fixtures with real entrypoints rather than teaching inference to invent
   commands.
4. Dependencies with no deployable consumer can still compose as standalone resources. Consider making this a product
   decision: omit them, block composition, or explicitly let users choose infrastructure-only output.
5. Agent environment-variable discoveries currently enrich facts more often than serialized config. Decide which
   `runtime-config` values should be emitted, defaulted, or presented as required user input.
6. Add a checked-in, compact corpus expectation manifest. The prior `_quality-report.md` classified all 366 historical
   files as “good” without semantic checks; resource-count snapshots alone would repeat that mistake.
7. Consider skipping optional agent review for complete, gap-free deterministic drafts, or offering it as an explicit
   “deep environment review” with its token/time cost shown.

## Verification performed

- Deterministic real-project corpus: 122 passed, 0 process failures, repeated after every major fix.
- `@stacktape/config-inference`: 182 tests passed; TypeScript typecheck passed.
- Focused CLI init/MCP/eval suites passed, including live-session rejection tests and 10/10 deterministic CI baselines.
- `pnpm check:public` passed end-to-end after the final changes: formatting, lint, generated-artifact drift, workspace
  and pattern rules, all package typechecks, tests (including 883 CLI source tests), builds, tool tests/typechecks,
  release artifact installation and packaging, dependency architecture, dead code, and duplicate-code checks.
- `pnpm check:integrated` was not run separately. The available private Console checkout participated in the
  repository's ordinary public gate, but this work made no private-source or submodule-pointer change.
- No real AWS validation was authorized or run.

## Reproduction

From `apps/cli`:

```powershell
bun run dev init --projectDirectory <path-to-corpus>\static-html-site --headless --codingAgent none
bun run dev init --projectDirectory <path-to-corpus>\static-html-site --headless --codingAgent codex
```

Before each manual run, delete every Stacktape config candidate in that one project. Do not restore the historical
low-cost/standard/production configs until the evaluation is complete, because a coding agent can otherwise copy them.
