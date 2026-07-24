# Stacktape v4 migration baselines

These tests protect user-visible capabilities and domain semantics while Stacktape is moved into the v4 monorepo. They
deliberately avoid snapshots of terminal text, JSONL event shapes, internal class layout, and other v3 representations
that v4 may replace.

Run the credential-free gates:

```sh
bun run test:characterization
bun run test:characterization:npm
bun run test:characterization:helper-lambdas
```

The npm and helper-Lambda gates build into ignored release directories before inspecting the real artifacts.

## Coverage matrix

| Surface | Current deterministic baseline | Long-term role | Remaining coverage |
| --- | --- | --- | --- |
| CLI | Major capability groups remain reachable; required inputs are internally consistent; representative aliases, option types, enums, and unauthenticated commands work | Migration gate. Command names may change in v4 only through an explicit, reviewed test update | Process-level exit codes, prompts, terminal rendering, shell completion, Windows/Linux packaged binaries |
| Configuration | TypeScript config loading follows tsconfig aliases and transitive packages; class config becomes plain schema-valid config; nested directives resolve; invalid resource types fail | Permanent core test | YAML/JSON fixtures, hooks, transforms, runtime directives, a large multi-resource config |
| Synthesis | A dense application is compiled without AWS credentials across Lambda/API Gateway, Cognito, DynamoDB, S3, SQS, EventBridge, IAM, VPC, RDS/Postgres, ECS/Fargate, service discovery, and autoscaling. A reviewable identity fixture pins logical IDs, CloudFormation types, physical names, references, and dependency edges. Semantic assertions protect explicit configuration and access | Permanent core compatibility gate | Add load-balancer, private-subnet/NAT, Redis/OpenSearch, hosting/SSR, state-machine, alarm, and override/transform fixtures |
| Packaging | A real custom artifact is zipped; source files are reported; content changes invalidate the digest; excluded directories do not; cache hits skip work | Permanent `packages/packaging` suite | Language buildpacks, Docker/image builds, monorepo dependency tracing, native-zip parity across operating systems |
| Helper Lambdas | Existing loader snapshot test plus a real build gate requiring all four content-addressed zip artifacts, handlers, entrypoints, and source maps | Permanent helper-Lambda release gate | Handler invocation tests for every helper, AWS-event fixtures, deployment/integration behavior |
| npm package | The real release artifact is built; manifest exports/bin targets exist; runtime entrypoint imports; representative declarations exist; `npm pack --dry-run` contains required files and excludes `node_modules` | Permanent package/release gate | Install the produced tarball under Node and Bun on Linux/Windows; compile representative consumer projects |
| Console API transports | Public calls carry no privileged identity; API-key calls fail closed and use only `stp_api_key`; AWS-identity calls carry a signed STS request and no API key | Migration gate for the future API-contract packages | Private router-to-public-schema conformance, Cognito UI surface, deployment-token scope/expiry against a running Console |
| Existing focused tests | 41 pre-existing test files cover parts of TUI, dev proxy, MCP, Git handling, directives, domains, templates, AWS utilities, and selected helper handlers | Retain or relocate with their owning package | Most deploy/delete managers and global-state interactions remain untested |
| JSONL/TUI output | No broad v3 snapshot was added | Intentionally redesignable for v4 | Define and test the v4 event protocol after its contract is chosen |
| Console UI/API | Console currently has three Playwright specs and four backend unit/security test files | Move with the private apps | Browser smoke flows, tRPC authorization matrix, database migrations, background Lambdas |
| Cloud execution | None in this credential-free suite | Separate slow/costed test tier | Full deploy/update/rollback/delete, drift, dev mode, databases, networking, alarms, CI runners, multi-account behavior |

## Migration rule

A failed baseline is evidence that a capability or semantic contract changed. It is not an instruction to preserve v3
at all costs. The implementing agent must either restore the behavior or record the intentional v4 decision and update
the narrow assertion. Reviewers should reject regenerated golden blobs that obscure what changed.

## Synthesis preservation policy

The dense synthesis identity fixture is a **must-preserve** compatibility contract for:

- CloudFormation logical IDs and resource types;
- project/stage/hash-derived physical names;
- explicit and intrinsic dependency edges;
- the explicit configuration behavior asserted in the test.

Changing one of these during a source-code move may replace a live AWS resource or silently remove access, so it
requires an explicit migration decision and CloudFormation diff review. The fixture sorts object keys, ignores
Stacktape's deployment-version and stack-info bookkeeping outputs, and replaces the server compiler's dummy default
domain with a marker.

The fixture intentionally does **not** pin Lambda asset locations/digests, generated stack-info payloads, declaration
order, timestamps, or the complete generated IAM/background-resource properties. Runtime versions, defaults, and
security hardening remain revisitable for v4, but explicit user configuration and intended permissions are asserted
semantically.

`cfn-lint` was not added to this repository: the credential-free compiler deliberately emits placeholder Lambda code,
and adding a Python installation path solely for this interim suite would create another toolchain. Integrate
CloudFormation schema validation in the new backbone against its deploy-ready normalized templates.
