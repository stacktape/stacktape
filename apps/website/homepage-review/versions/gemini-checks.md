# Local verification — Gemini

This is the writer's unchanged alternative. These claims need correction before adoption, even for the intended future
launch.

- **02, “only modified services rebuild.”** Too broad. Next.js builds run before individual output artifact digests are
  compared. Cached output reuse is not universal build skipping. Evidence: `packages/packaging/src/web/nextjs-web.ts`,
  `createNextjsWebArtifacts`.
- **04, “complete observability,” no installations, and all operational telemetry remaining in AWS.** The supported
  instrumentation/coverage boundaries do not establish those absolutes. Containers require instrumentation; Console
  incident/error metadata is stored in its data plane. Evidence: `observability/tracing.mdx`, `issues.mdx`, incident
  engine and handoff source.
- **05, private databases and strict least privilege by default.** General relational-database defaults are not
  universally private. `connectTo` can grant broad actions on a connected resource; it does not imply minimum possible
  actions. Evidence: `resources/databases/relational-database.mdx` and `configuration/connecting-resources.mdx`.
- **06, “the exact triggering git commit.”** Release/time correlation is evidence for an investigation, not proof that a
  commit caused the failure. The accepted AI plan explicitly treats diagnoses as hypotheses. Replace with recent
  deployment/commit context.
- **01 and shared example:** inherited unverified counts, missing queue and misleading WAF price remain, despite an
  illustrative-data label. The screen does not demonstrate the real price estimator accurately enough to support its
  claim.

- **06 visual:** it attributes the failure to v41, although the shared story introduces the feature in v42 and calls v41
  the previous release. Use the same release identity throughout the illustration.

The new security and hosted-triage capabilities are allowed in this future-launch exercise; their absence today is
documented in the research notes. The issues above concern the breadth or accuracy of the promises, not that future
scope.

Editorial assessment: terms such as “declarative GitOps workflows,” “content-addressed artifact caching” and
“enterprise-grade security posture” make the visitor do more work to understand the benefit. The recommended version
uses a concrete situation for each section instead.

The separate model pass repeats several valid candidates above. Its stronger claim that “zero per-seat fees” is an
invented current commercial model is not established: the current Flexible plan has unlimited members and spend-based
pricing. Future launch terms still need confirmation. Its requested four-field governance table is an editorial
preference here, not a reason to call the whole copy contract violated. The research notes already preserve launch
prerequisites.
