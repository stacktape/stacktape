# Wave 1 slice dossier — naming compatibility

Goal:

Move Stacktape's compatibility-sensitive naming algorithms into `@stacktape/naming` as a pure leaf capability with
exhaustive deterministic evidence.

User-visible/end-to-end behavior:

An unchanged Stacktape configuration must synthesize the same CloudFormation logical IDs, physical/resource names,
output/export names, metadata keys, tag names, helper-Lambda names, and domain-derived names as v3.

Why this slice exists:

Naming drift can replace or orphan customer infrastructure. The current v4 package is only a placeholder.

Prerequisite integration commit(s):

- Public `ba8c0961`.
- Legacy reference `17aef681` in `C:\Projects\stacktape`.
- No private source is required.

Current implementation and known constraints:

- Legacy sources are primarily `shared/naming/*.ts`, plus call-site-specific naming helpers discoverable from
  `17aef681`.
- Preserve outputs, not legacy module layout or incidental helper signatures.
- Existing algorithms may depend on string normalization and length limits whose edge cases are not documented.

Target package/app ownership:

- `packages/naming` owns the algorithms, explicit subpath exports, fixtures, and tests.
- Later synthesis and AWS slices consume this package.

Provisional interfaces:

- Prefer named pure functions grouped by coherent entry points, not a class or global manager.
- Inputs and outputs are immutable strings/records with no AWS SDK, process, filesystem, or app-state dependency.
- Use explicit package subpath exports when grouping improves discoverability; do not create re-export-only barrels.

Must-preserve behaviors:

- Exact output for all legacy fixture cases.
- Determinism, collision handling, sanitization, truncation, separator, prefix/suffix, and case behavior.
- CloudFormation logical IDs and replacement-sensitive physical names.

Intentional v4 changes allowed:

- Rename internal functions and improve types.
- Reject impossible/invalid internal inputs when no supported v3 configuration can produce them.

Owned paths:

- `packages/naming/**`.

Shared/frozen paths:

- Root tooling, workspace configuration, other packages/apps, architecture documents, and `apps/console`.

Required deterministic tests:

- Table-driven fixtures derived from every legacy naming module.
- Boundary/property tests for empty/minimum/maximum/overlong/unicode/punctuation inputs where applicable.
- Collision and determinism assertions.
- A fixture or adapter comparison that invokes legacy and v4 behavior without importing legacy code into published
  source.

Required artifact/emulator/AWS checks:

- No emulator or AWS call.
- Record any naming behavior that cannot be exercised until synthesis as a follow-up matrix risk.

Public-only implications:

- Package must install, typecheck, test, and build in a public-only clone.

Private-submodule implications:

- None.

Generated artifacts:

- Fixtures may be committed; generated fixtures require a deterministic generator and freshness check.

Acceptance commands:

- `pnpm --dir packages/naming typecheck`
- `pnpm --dir packages/naming test`
- `pnpm fmt:check`
- `pnpm lint`
- `pnpm check:architecture`

Expected commits:

- One public commit on `v4/slice/naming-compat`.

Out of scope:

- Synthesis call-site migration, AWS client construction, deployment, and changes to naming behavior.
