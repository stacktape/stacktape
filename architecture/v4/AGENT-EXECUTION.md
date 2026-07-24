# Agent execution model

## Principles

The migration uses multiple capable agents, but it does not decompose the system into artificial horizontal layers just
to create parallel work.

- Implementation is divided primarily by vertical behavior: a slice carries one user-visible capability through
  contracts, core behavior, adapters, CLI/API composition, and tests.
- Every implementation slice receives an independent reviewer.
- The orchestrator owns integration, cross-slice interfaces, repository state, end-to-end validation, and the decision
  register.
- Package boundaries are targets and ownership guides, not excuses for agents to ignore behavior outside one folder.
- Shared interfaces are provisional until exercised. Agents may propose improvements with evidence; they may not
  silently redefine a seam used by another active slice.
- Only one agent writes in a given worktree.
- Public and private changes are reviewed and integrated as one logical slice even though they produce separate Git
  commits.

## Roles

### Orchestrator

The orchestrator:

1. Reads and enforces every document in `architecture/v4`.
2. Maintains the integration branches and private submodule pointer.
3. Creates a slice dossier before dispatch.
4. Ensures prerequisites are integrated before dependent work begins.
5. Assigns an implementer and a different reviewer.
6. Decides whether a proposed interface improvement is local, cross-slice, or architectural.
7. Integrates reviewed commits and resolves the resulting private pointer.
8. Runs affected checks after every integration checkpoint.
9. Runs complete public-only and integrated validation at phase gates.
10. Records intentional v4 differences and newly discovered constraints.

The orchestrator must not treat a passing typecheck as proof of behavioral compatibility.

### Implementer

The implementer owns one dossier. It:

- studies the current behavior and existing characterization coverage;
- proposes a small seam/interface adjustment when the dossier's sketch is inadequate;
- implements the complete vertical behavior;
- adds or updates tests at the cheapest meaningful layer;
- runs the dossier's checks;
- commits private changes, if any, before public changes;
- reports assumptions, intentional behavior changes, unresolved risks, and exact validation.

The implementer may not deploy, push, rewrite shared history, weaken a gate, modify another active slice's owned files,
or hide a failure behind a broad lint/type/test exemption.

### Reviewer

The reviewer receives the dossier, commit range, and acceptance criteria but not the implementer's chain of reasoning as
an authority. It:

- reads the relevant old and new behavior independently;
- looks for customer-infrastructure, security, concurrency, and package-boundary regressions;
- checks whether tests assert semantics rather than implementation;
- validates public-only/private-boundary behavior when relevant;
- runs focused checks;
- reports prioritized actionable findings.

The reviewer is read-only until the orchestrator explicitly assigns a follow-up fix.

### Verification agent

At major phase gates, a verification agent may run the full matrix, inspect artifacts, compare v3/v4 outputs, and test
clean clones. It must be distinct from the agents that implemented the majority of the phase.

## Slice dossier

Every implementation dispatch includes:

```text
Goal:
User-visible/end-to-end behavior:
Why this slice exists:
Prerequisite integration commit(s):
Current implementation and known constraints:
Target package/app ownership:
Provisional interfaces:
Must-preserve behaviors:
Intentional v4 changes allowed:
Owned paths:
Shared/frozen paths:
Required deterministic tests:
Required artifact/emulator/AWS checks:
Public-only implications:
Private-submodule implications:
Generated artifacts:
Acceptance commands:
Expected commits:
Out of scope:
```

The dossier gives enough context to work independently without copying the entire historical conversation into every
prompt.

## Interface evolution

Interfaces are not set in stone merely because the orchestrator wrote the first draft.

An implementer may make a local improvement directly when it:

- remains inside the slice's owned paths;
- preserves dependency direction;
- does not alter another integrated consumer;
- improves clarity, testability, or correctness;
- is covered by tests.

For a shared seam, the implementer writes a short proposal containing:

- the problem demonstrated by current code or tests;
- the old and proposed signatures;
- affected active/completed slices;
- compatibility and migration cost;
- why an adapter cannot reasonably localize the change.

The orchestrator either accepts it, requests a smaller seam, or schedules a dedicated interface slice. Dependent agents
consume only integrated interface commits, never an unreviewed sibling worktree.

## Isolated worktrees

The public integration checkout remains untouched by implementation agents. A workspace script creates:

```text
.worktrees/<slice-id>/             # public repository worktree on v4/slice/<slice-id>
└── apps/console/                  # separately cloned submodule checkout
```

This was validated against the existing POC using Git 2.39 on Windows: two simultaneous parent worktrees each received
an independent `apps/console` Git directory under the parent worktree metadata. They did not share a private working
tree.

The future `scripts/agents/create-worktree.ts` must:

1. Validate the slice ID and target path.
2. Refuse to reuse a dirty or registered worktree.
3. Create `v4/slice/<slice-id>` from the current public integration commit.
4. Initialize `apps/console` only when the dossier needs private code.
5. Create a private `v4/slice/<slice-id>` branch from the recorded submodule commit.
6. Install from frozen lockfiles without running deployment commands.
7. Write a local dossier pointer and base-SHA metadata.
8. Print exact cleanup commands but never auto-delete a dirty worktree.

The cleanup script resolves and verifies the absolute target is inside the dedicated `.worktrees` root before removing
anything.

## Commit and integration protocol

For a slice touching private and public code:

1. The implementer commits private changes on the private slice branch.
2. The implementer commits public changes on the public slice branch. This commit may temporarily point to the private
   slice commit.
3. The reviewer reviews both ranges together.
4. The orchestrator integrates the private commits first.
5. The orchestrator integrates public source commits.
6. The orchestrator records the final integrated private commit in `apps/console` and commits the pointer update.
7. The orchestrator reruns integrated and public-only checks.

No agent pushes slice branches unless the orchestrator requests it. No slice agent force-pushes. The orchestrator is
the only role allowed to update integration branches or submodule pointers.

Commit messages identify behavior, not file movement:

```text
core(config): make synthesis context-explicit
packaging(lambda): preserve deterministic layer assignment
console(api): enforce public contract schemas
repo: record integrated console slice
```

## Concurrency policy

Parallel work is allowed when:

- worktrees are isolated;
- dossiers do not own the same shared seam;
- neither slice depends on unintegrated behavior from the other;
- generated outputs do not collide at integration;
- the orchestrator has reserved review/integration capacity.

High-risk shared changes are serialized:

- root workspace/tooling;
- `OperationContext` and foundational ports;
- config public model;
- naming algorithms;
- tRPC public contracts;
- Prisma schema/migrations;
- release assembly;
- the private submodule pointer.

When concurrency would increase merge risk more than throughput, multiple agents instead perform read-only analysis,
fixture creation, or independent review while one implementer writes.

## Required review gates

A slice is not complete until:

- its implementer checks pass;
- an independent reviewer has no unresolved blocker;
- generated outputs are fresh;
- public-only checks pass when public files changed;
- integrated checks pass when private files changed;
- behavioral differences are classified;
- the orchestrator integrates it without carrying a dirty worktree;
- the migration matrix records its new coverage and remaining risk.

No deployment is implied by code integration. Real AWS gates require separate explicit authorization and trusted
credentials.
