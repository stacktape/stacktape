# Characterization tests

These tests protect behavior whose accidental change can break deployments: configuration loading, stable synthesis
identity, lifecycle ordering, packaging, helper-Lambda artifacts and the published npm shape.

They assert semantic contracts rather than full terminal output or large snapshots. A failing assertion means either:

- restore behavior that was changed accidentally; or
- update the focused assertion as part of an explicit product or infrastructure decision.

CloudFormation logical IDs, physical names, dependency edges and replacement-sensitive properties need particular care.
A structural refactor must not update their fixtures without reviewing the synthesized diff.

```sh
pnpm --filter @stacktape/cli run test:characterization
pnpm --filter @stacktape/cli run test:release-artifact
pnpm --filter @stacktape/cli run test:characterization:helper-lambdas
```

Real AWS lifecycle behavior belongs to the guarded canaries under `scripts/real-aws`, not this credential-free suite.
