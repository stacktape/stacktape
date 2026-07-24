# Stacktape v4 test strategy

## Objective

Tests must catch behavioral regressions in Stacktape as a deployment system, not merely prove that isolated helpers
compile. No emulator accurately defines AWS behavior, and real-AWS-only testing is too slow and expensive for the main
development loop.

Use three complementary layers:

1. deterministic whole-core, synthesis, packaging, CLI-process, and static infrastructure tests;
2. Floci integration tests for a deliberately certified subset;
3. selective real-AWS canaries and scheduled full workflows.

Every production defect receives a regression at the cheapest layer capable of reproducing it.

## Compatibility classification

Every v3 baseline and v4 difference is classified:

- `must-preserve`;
- `intentional-v4-break`;
- `known-v3-bug`;
- `implementation-detail`.

Do not freeze the exact v3 JSONL/TUI representation. Define the v4 machine protocol intentionally and test semantic
invariants.

CloudFormation logical IDs, deterministic resource names, replacement-sensitive properties, artifact hashes, and
security scoping default to `must-preserve`.

## Layer 1 — deterministic and static tests

Run on every relevant change:

- TypeScript/YAML config loading and transformations;
- directives and references;
- graph construction and property-based invariants;
- normalized config-to-CloudFormation fixtures;
- logical ID, resource name, output, dependency, and IAM intent assertions;
- `cfn-lint` validation against current resource-provider schemas;
- CloudFormation Guard rules for Stacktape security/architecture invariants where useful;
- packaging matrix, content hashes, cache behavior, includes/excludes, layers, and language buildpacks;
- command success/failure/retry/pagination/cancellation state machines;
- structured event/redaction/result invariants;
- built CLI subprocess tests for arguments, environment, prompts, signals, exit codes, stdout, and stderr;
- npm package, binary input, and helper-Lambda artifact verification;
- typed AWS adapter fakes for throttling, malformed responses, pagination, and error classification.

The `packages/core` design must expose:

- AWS client factory/endpoints;
- Console/control-plane adapter;
- filesystem and packaging;
- clock and ID generation;
- process execution and signals;
- event/output sink;
- prompts and cancellation;
- network access.

Test mode must fail closed if any unapproved request can reach real AWS.

Expected cadence: every change. Expected runtime: approximately one to five minutes after optimization. Cloud cost:
zero.

## Layer 2 — Floci certified integration

[Floci](https://github.com/floci-io/floci) is MIT licensed and is the preferred open emulator candidate, but it is not
an AWS oracle.

Its [CloudFormation documentation](https://floci.io/floci/services/cloudformation/) states that unsupported resources
can receive synthetic IDs while stacks still reach `CREATE_COMPLETE`. Template validation is success-only, change sets
do not compute meaningful diffs, update rollback does not fully restore prior state, and several policy operations are
no-ops.

Therefore the Floci harness must:

- pin an exact image version and digest;
- maintain a machine-readable manifest of every exercised AWS operation and CloudFormation type;
- classify each type as `floci-real`, narrowly `floci-stub-allowed`, or `real-aws-only`;
- reject synthesized resource types absent from the manifest;
- fail on `arn:aws:stub` or other stub physical IDs;
- assert data-plane behavior after deployment rather than accepting stack status;
- use fake credentials and refuse to start without local endpoints;
- block requests to AWS domains;
- redirect hard-coded special endpoints such as S3 acceleration;
- distinguish Stacktape failures from known emulator limitations;
- test persistent/restart behavior separately.

Floci currently covers useful foundations including S3, SQS, SNS, DynamoDB, basic Lambda/layers/event mappings, IAM,
ECR, basic ECS/RDS/VPC/ELBv2/API Gateway, Step Functions, Batch, Kinesis, Firehose, logs, and alarms.

Important Stacktape resource groups requiring real AWS or new Floci contributions include CloudFront, EFS,
ElastiCache, OpenSearch, WAF, Scheduler, Service Discovery, Lambda alias/permission/URL/event-invoke resources, several
API Gateway v2 resources, ECS capacity providers, and Application Auto Scaling.

Before Floci becomes a public-PR gate, a feasibility spike must demonstrate:

1. serverless initial create;
2. live event/data flow;
3. exact redeploy/no-op;
4. code update;
5. infrastructure update;
6. delete;
7. emulator restart and state rediscovery;
8. twenty consecutive non-flaky CI runs;
9. warm-cache completion around ten minutes or less;
10. no request reaching real AWS.

Expected cadence after certification: public pull requests. Expected cloud cost: zero.

## Layer 3 — real AWS

Only AWS can validate full CloudFormation change-set behavior, replacements, IAM enforcement, update rollback, drift,
service-specific semantics, and deletion fidelity.

Use permanent dedicated disposable test accounts with ephemeral uniquely named stacks. CI access uses GitHub OIDC and
short-lived roles, never fork-exposed secrets.

Required controls:

- allowed regions/services constrained by roles, permission boundaries, or SCPs;
- unique run IDs and `expiresAt` tags;
- cleanup in `finally`;
- separately authorized janitor and orphan audit;
- account/region concurrency limits;
- budgets and anomaly alerts;
- recorded runtime and tagged cost per suite;
- no NAT Gateway in routine tests where a cheaper safe topology is possible.

Cadence:

| Lane                             | Cadence                  | Target                                               |
| -------------------------------- | ------------------------ | ---------------------------------------------------- |
| Cheap serverless canary          | trusted main/merge queue | 7–15 minutes, usually pennies to below roughly $0.10 |
| Containers/data                  | nightly                  | 20–60 minutes, controlled stateful-resource cost     |
| Edge/identity/multi-account      | weekly and release       | 30–90 minutes                                        |
| Remote runner/Console deployment | nightly or release       | full private integration                             |

These are initial budget envelopes, not price guarantees. Measure the pilot using tagged resources. RDS billable
transitions and OpenSearch partial-hour billing make those services poor per-PR candidates.

## Representative projects

Use multiple high-density projects rather than one enormous slow stack.

### `serverless-mesh`

Primary Floci-certified and cheap real-AWS canary:

- HTTP API to Node Lambda;
- DynamoDB writes and streams;
- EventBridge/SNS events;
- standard/FIFO SQS, retry, DLQ, and Lambda consumer;
- Kinesis and Firehose to S3;
- Step Functions invoking Lambda/SQS;
- S3 events;
- Secrets Manager and SSM references;
- Scheduler, logs, metrics, alarms, outputs, IAM, and cross-resource references;
- multiple packaging modes and a shared layer.

The complete project runs on AWS. The Floci variant contains only classified real provisioners.

### `container-network-data`

Nightly AWS, progressively certified subsets in Floci:

- ECS web service and ALB;
- queue-driven worker;
- multi-container/sidecar and health checks;
- ECR build/push;
- PostgreSQL;
- Redis;
- EFS;
- service discovery and auto scaling;
- deployment hooks and rolling/blue-green behavior retained for v4.

### `edge-identity-web`

Weekly/release AWS:

- static hosting and SSR;
- CloudFront behavior/invalidation;
- WAF;
- Cognito;
- Route53 and ACM with a permanent delegated test zone;
- cache/origin updates.

### `packaging-matrix`

Hermetic packaging on every relevant change; real invocation weekly:

- Node/Bun, Python, Go, Java, Ruby, PHP, and .NET where supported;
- native dependencies;
- monorepo workspace dependencies and lockfile variants;
- shared layers;
- large-artifact/template-upload path;
- Docker image buildpack;
- deterministic include/exclude behavior and hashes.

Seed these projects from useful current fixtures rather than discarding known scenarios.

## Operation matrix

Projects do not merely deploy once:

| Operation          | Required assertions                                           |
| ------------------ | ------------------------------------------------------------- |
| Initial deploy     | Resource identities, outputs, tags, and live data plane       |
| Exact redeploy     | No unintended update; stable physical IDs and hashes          |
| Code-only hotswap  | New code runs; infrastructure identity remains stable         |
| Mutable update     | Intended properties change; unrelated resources remain stable |
| Replacement update | Replacement is predicted, reported, and executed              |
| Failed create      | Rollback and no chargeable/orphaned resources                 |
| Failed update      | Previous app remains usable; correct rollback/reporting       |
| Explicit rollback  | Previous version and data plane restored                      |
| Manual drift       | Chosen v4 block/warn/reconcile policy                         |
| Concurrent deploy  | Defined locking/conflict behavior; no state corruption        |
| Cancellation       | Processes and packaging stop; temporary artifacts cleaned     |
| Delete             | Stack and deployment artifacts removed                        |
| Failed delete      | Useful error; retained resource discoverable; retry works     |
| Repeated delete    | Intentional idempotent or documented behavior                 |
| Emulator restart   | Stored state recovers without phantom changes                 |

Floci may own create/no-op/update/delete and selected create failures for its certified subset. Real AWS owns rollback,
drift, replacements, concurrency, and deletion fidelity.

## Alternatives

- LocalStack is more mature, but its supported image requires authentication after March 2026 and its free Hobby plan
  is non-commercial. Do not make it a dependency now. Reconsider a sponsored/commercial side-by-side benchmark later.
  See [transition](https://blog.localstack.cloud/2026-upcoming-pricing-changes/),
  [licensing](https://docs.localstack.cloud/aws/licensing/), and
  [pricing](https://www.localstack.cloud/pricing).
- Moto is useful for narrow Python-backed service tests, not as a general Stacktape CloudFormation lifecycle oracle.
- LocalEmu is an Apache-licensed fork of archived LocalStack code but is too new to become a v4 release gate.
- AWS SAM local can invoke Lambda/API handlers but does not reproduce Stacktape infrastructure lifecycle.
- AWS SDK mocks are useful behind explicit ports for error paths; they do not define AWS semantics.

## Initial implementation order

1. Review and merge current characterization/artifact baselines.
2. Add normalized synthesis fixtures and compatibility classifications.
3. Make explicit test ports and no-real-AWS safety an acceptance criterion of the core foundation slice.
4. Add static CloudFormation validation.
5. Add packaged CLI process tests.
6. Run the Floci feasibility spike.
7. Build the cheap real-AWS `serverless-mesh` canary after explicit authorization.
8. Expand nightly/weekly coverage by observed risk and production defects.
