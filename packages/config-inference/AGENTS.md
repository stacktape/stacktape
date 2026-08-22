# Config inference

This package turns repository evidence into a Stacktape configuration. It contains no model client or UI.

```text
probes -> ProjectFacts -> optional agent facts -> verification -> composition -> config
```

## Trust boundary

- Facts are observable claims, not infrastructure choices. `exposesHttp` is a fact; `resourceType` is a composer
  decision.
- Agent input uses the smaller schema in `facts/agent-submission.ts`. It cannot set provenance, deploy blocking,
  identifiers, recommendations or user-facing prose. `mergeAgentSubmission` stamps those values against the probe
  baseline.
- Environment values never leave the machine. `.env*` files are names-only, including example files. The environment
  probe may inspect a value through `readPrivileged` only to reduce it to a safe enum; citations include only the name.
- Agent-authored text never reaches the user. Uncertainties are a closed discriminated union whose presentation belongs
  to the wizard.
- Verification downgrades unsupported claims into questions; it does not silently drop them.
- Unanswered required questions set `blockedBy` and `deployable: false`. The partial config still renders for review.
- Never replace a detected live external database silently.

Every required field needs an honest uncertainty path. Otherwise an agent or probe will eventually fabricate it.

## Probes and importers

Probes emit evidence they can locate in repository bytes and stay silent when they cannot. Overlap is intentional:
independent evidence lets verification corroborate a claim. Merge and cross-probe reconciliation belong in
`scan/assemble.ts`, not inside a probe.

IaC and PaaS importers are probes. They parse bounded literal syntax and never execute repository programs. A declared
resource is not proof of a live deployment. `hostingEvidence` keeps `declared`, `observed` and `chosen` meanings
separate.

Function entry files must exist in the scanned file set. Catch-all HTTP triggers use `method: '*'` and
`path: '/{proxy+}'`. Add every new emitted shape to `compose/schema-conformance.spec.ts`; a locally correct probe can
still merge or compose incorrectly.

The full importer path is covered by `apps/cli/src/init/eval/importers-e2e.spec.ts`. Keep focused probe tests as well as
an end-to-end semantic case.

## Package boundary

Use explicit subpath exports. `facts/*` and `compose/*` stay browser-safe because init UI imports them. `scan/*` and
`verify/*` may use Node APIs. Do not add barrel exports.

Current deliberate limitations include computed TypeScript IaC, expanded Terraform modules/dynamic blocks, and state
import or data migration. Surface those cases for review instead of guessing.

```sh
pnpm --filter @stacktape/config-inference run typecheck
pnpm --filter @stacktape/config-inference run test
```
