# Stacktape config inference

This package turns a repository into a Stacktape configuration. It contains **no AI**, and that is the point: an agent's
only contribution to the pipeline is a schema-validated facts document, and everything that decides what infrastructure
gets created lives here, where it can be tested.

```
probes ──► candidate facts ──► [agent reviews] ──► verification ──► composer ──► config
  (deterministic)                (elsewhere)       (deterministic)  (deterministic)
```

## The rules that hold this together

**Facts are observational, never prescriptive.** Every field must be confirmable or refutable by reading the repository.
`exposesHttp` belongs; `resourceType` does not. The moment a field describes desired infrastructure, the agent is
writing the config again with extra steps — and the variance we removed comes straight back. Classification is
`compose/classify.ts`'s job.

**Environment values never leave the machine.** `policy/file-access.ts` gives every `.env*` file `names-only` access,
with **no exception for `.env.example`** — example files pick up real values by accident, and a rule with an exception
is one someone gets wrong at a call site. The single exception in the whole package is `ProbeContext.readPrivileged`,
used only by `scan/probes/environment.ts` to reduce a connection string to two enum members. Citations from that probe
quote only the left of the `=`, so a facts document is safe to show, store and transmit by construction rather than by
everyone downstream remembering to redact.

**The agent submits a different, smaller schema than the one the pipeline uses.** `facts/agent-submission.ts` carries
observations only. It has no `source`, no `blocksDeploy`, no `recommended`, no identifiers and no prose; those are
stamped on deterministically by `mergeAgentSubmission` against an immutable probe baseline.

This is not tidiness. The first version let the agent submit a whole `ProjectFacts`, and verification skips downgrading
anything marked `source: 'probe'` — so an agent writing `source: 'probe'` on a fabricated database was never checked and
never questioned. One field disabled the entire verification layer. Keep the boundary a type. If you add a field the
agent can set, ask what a prompt-injected agent would do with it.

**Nothing the agent authors may reach the user as words.** Uncertainties are a closed discriminated union of parameters
(`facts/uncertainty.ts`); the wizard owns every question, option and price. The agent reads untrusted repository
content, so free text it produces could otherwise reach the user as "paste your AWS key here". `ProjectFacts.notes` is a
probe-and-verifier field; agent submissions cannot populate it.

**Unanswered questions stop a deploy.** `composeConfig` returns `blockedBy` and `deployable`, and the deploy path must
consult those rather than the config's existence. Composition still produces a configuration while questions are
outstanding, because the user needs the diagram and the cost while deciding — but an earlier version dropped the input
uncertainties entirely, which meant a carefully downgraded claim was composed into real infrastructure and its question
vanished.

**A live external database is never quietly replaced.** When `currentlyHostedOn` names a real provider, composition
creates nothing and raises `external-database-disposition`. Provisioning RDS beside a running Supabase database is worse
than never having detected it.

**Downgrade, never drop.** `verify/verify-facts.ts` turns unconfirmed claims into questions and removes nothing. A
silently deleted database produces a config that deploys and an app that crashes — from the user's chair that is wrong
infrastructure, not reduced coverage.

**Every required field needs an honest escape hatch.** `checkFactsCompleteness` accepts a missing start command when a
`command-unknown` uncertainty was raised. A required field a model cannot satisfy truthfully is a fabrication generator.

**Containers unless proven otherwise.** A container runs what the repository already runs. A function needs a
handler-shaped entrypoint, no local disk, and a fixed timeout — so it requires evidence, never a guess. Being
conservative costs a few dollars a month; being wrong costs the user's first impression.

## Working here

- `bun test src` and `tsc -p tsconfig.json` both stay clean.
- Subpath exports only, no barrels. `facts/*` and `compose/*` must stay browser-safe — the wizard UI imports them.
  `scan/*` and `verify/*` may use `node:` APIs.
- Anchors in `verify/anchors.ts` should almost never reject a correct claim. They exist to catch confident nonsense (a
  MongoDB claim citing a Prisma Postgres import), not to classify. When tightening one, add the false-positive case to
  the tests first.
- Probes never guess. See it in the bytes and emit a fact; see that it is ambiguous and emit an uncertainty; otherwise
  stay silent and let the agent fill the gap.
- Probes overlap on purpose. That redundancy is what lets verification treat an agent claim as corroborated, so merging
  in `scan/assemble.ts` accumulates evidence rather than replacing it.
- Cross-probe reconciliation belongs in the assembler, not in a probe. A probe cannot know what another one found.

## Importers (2026-08-17)

Importers are ordinary probes in `src/scan/probes/`: `paas-manifests` (render.yaml, fly.toml, app.json),
`serverless-framework`, `sst`, `terraform`, `cdk`, plus the older `aws-sam`, `procfile`, `docker-compose`, `dockerfile`.
Ordered in `apps/cli/src/init/missions/greenfield.ts` with importers first, so a platform-declared command wins the
first-non-undefined merge in `scan/assemble.ts` (services keyed `path::processType`, dependencies `kind:name` with
generic-name folding). They emit facts only — never composer decisions.

Invariants a reviewer must not break:

- **Programs are read as text, never executed** (`sst.config.ts`, CDK stacks, `serverless.ts` is skipped entirely).
  Regex + balanced-brace body slices; variable-binding maps resolve `link:` / `addEventSource` / `LambdaRestApi` wiring.
  Literal values only — computed values read as absent, never guessed.
- **A declaration is not proof of a live deployment.** `hostingEvidence` distinguishes a connection string from an
  IaC/PaaS declaration, and the review copy says so. Addressable dependencies default to leaving the existing endpoint
  alone; event resources that cannot be pointed at default to a new copy. `sizeHint` travels to that copy, but the
  composer honors it only inside the target namespace (`db.*`/`cache.*`).
- **Function entry files must exist in `context.files`** or the function is skipped — no fabricated paths.
  `lambda-source` yields to SAM/serverless/SST/CDK so handlers are never minted twice.
- CDK is gated on `cdk.json` **and** a per-file `aws-cdk-lib` import; ambiguous class names
  (`Function`/`Table`/`Domain`) additionally need a telling qualifier.
- Catch-all HTTP trigger vocabulary is `method: '*'`, `path: '/{proxy+}'` (enum in `packages/config/src/events.ts`
  ~2248). `compose/schema-conformance.spec.ts` validates composed output against the real schema — add a case for every
  new emission shape; it has caught two real bugs already.

The importer corpus in `apps/cli/src/init/eval/importers-e2e.spec.ts` exercises full scan → facts → decisions →
composition paths for Fly, Docker Compose, Serverless Framework, SAM, SST, CDK and Terraform. Keep importer additions
there as well as in their focused probe tests; a probe can be locally correct while its facts still merge or compose
incorrectly.

## Known gaps

- TypeScript IaC is intentionally parsed as bounded literal syntax, not executed. CDK references imported from another
  stack file, computed SST component options, and `serverless.ts`/`.js` need an agent or a review item rather than a
  guess.
- Terraform imports literal AWS resource blocks in the repository root and conventional infrastructure directories. It
  does not expand modules, `for_each`, dynamic blocks or arbitrary HCL expressions.
- Render `fromService` can request a bare host, port or `host:port`, while Stacktape exposes a complete deployed URL.
  Those non-equivalent shapes are deliberately omitted from the generated environment and surfaced as composition gaps
  for the user to set explicitly.
- Importers reproduce resources and relationships they can prove; they do not attempt state import, data migration, or
  takeover of an existing deployment. The wizard must keep saying when a deploy will create a separate stack or a second
  copy of an app.
