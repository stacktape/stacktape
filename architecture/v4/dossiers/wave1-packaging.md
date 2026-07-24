# Wave 1 slice dossier — packaging foundation and helper Lambdas

Goal:

Migrate deterministic artifact selection, inclusion/exclusion, hashing, buildpack contracts, artifact tracking, and
helper-Lambda artifact ownership into explicit headless packages.

User-visible/end-to-end behavior:

Given the same project inputs and options, Stacktape selects the same files and produces semantically and
byte-equivalent artifact manifests/hashes needed to avoid unnecessary uploads or deployments.

Why this slice exists:

Packaging is currently split between shared buildpacks, bundlers, mutable managers, and helper-Lambda utilities. It is
both customer-sensitive and a prerequisite for synthesis/deployment.

Prerequisite integration commit(s):

- Public `ba8c0961`.
- Legacy reference `17aef681` in `C:\Projects\stacktape`.
- No private source is required.

Current implementation and known constraints:

- Legacy sources include `shared/packaging/**`, `src/domain/packaging-manager`,
  `src/domain/deployment-artifact-manager`, and `src/utils/helper-lambdas*`.
- Language bundlers may execute external tools; isolate deterministic policy from process adapters.
- Do not claim byte equivalence when archives contain timestamps or platform-dependent metadata; normalize or classify.

Target package/app ownership:

- `packages/packaging` owns packaging policy, contracts, manifests, hashing, cache keys, and process/filesystem ports.
- `packages/helper-lambdas` owns helper source/dependencies and deterministic artifact assembly.

Provisional interfaces:

- Explicit immutable request/result types with working directory, temporary storage, filesystem/process, clock, and
  event ports.
- Content-addressed manifests independent of global Stacktape managers.
- Buildpack/bundler contracts model external commands without spawning them during pure tests.
- Helper-Lambda artifacts expose stable identities and checksums to packaging consumers.

Must-preserve behaviors:

- File inclusion/exclusion, ignore precedence, symlink behavior, deterministic ordering, hashing, layer assignment, and
  artifact/cache identity.
- Helper-Lambda runtime/source/dependency contents and ownership.
- Failures clean temporary outputs and do not reuse partial artifacts.

Intentional v4 changes allowed:

- Replace mutable managers with explicit functions/services and ports.
- Correct proven nondeterminism or unsafe path traversal as `known-v3-bug`, with regression evidence.
- Defer heavyweight language execution adapters while preserving and testing their contracts.

Owned paths:

- `packages/packaging/**`.
- `packages/helper-lambdas/**`.

Shared/frozen paths:

- Root tooling, `packages/config`, `packages/core`, apps, architecture documents, and `apps/console`.

Required deterministic tests:

- Golden normalized manifests and hashes from representative fixtures.
- Include/exclude/ignore/symlink/path traversal/platform separator tests.
- Stable ordering and repeated-run equivalence.
- Cancellation/failure/temporary-cleanup behavior through fake ports.
- Helper-Lambda real artifact build compared by normalized file list, content hashes, and package metadata.

Required artifact/emulator/AWS checks:

- Build real local artifacts where toolchains are available; no AWS or emulator call.
- Record toolchain/platform limitations explicitly instead of weakening equivalence claims.

Public-only implications:

- Both packages are public and must work without Console.

Private-submodule implications:

- None.

Generated artifacts:

- Built archives remain uncommitted.
- Fixtures and normalized manifests may be committed; any generator needs a freshness check.

Acceptance commands:

- `pnpm --dir packages/packaging typecheck`
- `pnpm --dir packages/packaging test`
- `pnpm --dir packages/helper-lambdas typecheck`
- `pnpm --dir packages/helper-lambdas test`
- relevant artifact comparison command
- `pnpm fmt:check`
- `pnpm lint`
- `pnpm check:architecture`

Expected commits:

- One or more public commits on `v4/slice/packaging-foundation`.

Out of scope:

- Deployment/upload, CloudFormation synthesis, AWS calls, full lifecycle commands, or private Console behavior.
