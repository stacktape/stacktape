# Slices, tiers and fault checks

Use the [short policy](../testing.md) for daily work. This guide explains the slice registry that drives test selection,
and the method for measuring what a slice's tests catch. The two testing sweeps of October 2026 rewrote the tests of
every active slice with this method; the registry and the handoffs of those sweeps are the record, not this guide.

## Slices, journeys and tiers

A **slice** owns one customer promise and its tests. Slices keep their original IDs: S01–S76, plus
`code-swap-foundations` for the opt-in container code swap. S36 (VS Code extension) is excluded from slice work and S73
(Console first-deployment generation) is retired; both stay in the registry so their status is visible. Split an
independent promise with an a/b suffix when necessary. **Journeys J1–J13** group slices for priority and pre-release
end-to-end qualification; the `container-deploy` tag groups the code-swap lanes the same way. Journeys do not own tests.

The source of truth is [the code registry](../../scripts/workspace/test-registry.ts): lanes contain command argv, level,
tier, test entrypoints and prerequisites; slices contain promises, implementation paths, primary test ownership, lane
references, journey tags and contributors. A contributor reuses another slice's scenario without giving a test two
primary owners. [The planner](../../scripts/workspace/test-plan.ts) matches changed source and test paths against slice
paths, keeps direct suite-import selection, diffs `--since=<ref>` against the merge base, and de-duplicates commands.
Public clones can inspect private recommendations without importing Console source; those lanes report the missing
checkout.

Slice paths are exact files or globs. `*` does not cross `/`, and `/**` is allowed only as a final suffix for a subtree.
A change that no slice path matches selects nothing, so when a lane misses an edit to a file it should protect, add the
file to the owning slice's paths.

| Tier      | When it runs                                         | Scope                                                                           |
| --------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `pr`      | Every PR, through `pnpm test:ci`                     | Small, fast, offline, stable rules and tooling; Console rules when initialized. |
| `change`  | Implementer runs it when `pnpm test:plan` selects it | Relevant process, artifact, Docker, API/database and browser checks.            |
| `release` | Candidate qualification                              | Full corpus, supported native targets and externally owned service contracts.   |

Levels are `focused`, `process`, `api-db`, `browser` and `live-aws`. Docker, Chromium, Console, AWS, network, PowerShell
and shared-dev reservations are explicit prerequisites; a `pr` lane may require nothing but the Console checkout. Every
`pr` and `change` lane also runs before release. CI has no heavy-test or nightly substitute; the implementer owns
selected change evidence. The ownership check in `pnpm test:tools` rejects unowned tests, missing files, duplicate
commands and missing scripts, database flags or Playwright projects.

## Measure a slice with faults

A passing lane proves little on its own: the first sweep's quality claims were self-certified, and the second sweep
found that the tests of a typical slice caught between half and nine tenths of realistic faults before it started.
Measure before changing tests, and again after.

1. **Count** the `test(`/`it(` cases of the slice (the registry's `tests` entries).
2. **Write the fault list first**, 8–15 faults per slice, before running anything. Draw them from the slice's fix
   history (`git log -i --grep=fix -- <paths>`, also inside `apps/console`), from product bugs earlier work fixed, and
   from common bug classes for that code: wrong version or off-by-one, dropped field, wrong default, swallowed error,
   wrong condition or branch, missing cleanup, wrong ARN, region or IAM scope, ordering or concurrency. Name the
   customer-visible effect of each fault.
3. **Run each fault alone.** Apply the edit, run the slice's lanes that should catch it, fastest first, and run the
   remaining lanes only when the fast ones miss. Record caught or escaped and the catching test. Revert and confirm the
   product tree is byte-identical before the next fault. Never commit a fault.
4. **Close gaps.** For each escaped fault, add or extend a scenario through real cooperating code, with MiniStack for
   the AWS behavior it supports. Confirm by re-applying the fault.
5. **Delete with evidence**, following
   [keeping or replacing existing tests](strategy.md#keeping-or-replacing-existing-tests).
6. **Fix product bugs** the faults expose: failing test first, fix at the lowest responsible layer, keep the test. A bug
   that needs a product decision, a data migration or another slice's code gets a minimal reproducer and the expected
   behavior in the handoff, not a failing test on `main`.
7. **Score** caught/total before and after in the task's own files, outside the repository.

A **realistic fault** is a small edit to product code that a customer would notice. It is not an edit to a test, a
fixture or test tooling; not a compile error or a broken fixture; not an edit to dead code or to a path no customer
request reaches; and not an equivalent mutant, such as truthy versus nullish on a payload that is always an object, or a
dropped step that a later step redoes. A fault that changes only generated text must be measured after regenerating the
artifacts in a scratch worktree. Re-introducing a shipped bug by its fix commit is the strongest fault. Reviewers reject
a "caught" result when the catching lane already contained the new test, or when a stale built artifact produced the
catch.

Have an independent reviewer inspect the promise, the patch, the fault table and the removals in a fresh context, with
more effort for authorization, secrets, billing, data loss and shared fixtures. Agreement alone is not proof.

## Work one slice at a time

One owner changes a shared fixture at a time; each slice gets its own worktree, prepared as described in
[fresh worktrees](../testing.md#fresh-worktrees-and-heavy-lanes). Make product edits after the fault runs or commit them
first: a whole-file revert of a fault also undoes uncommitted product edits. Extend helpers before extracting a new
abstraction; extract only when two current consumers need it. Keep per-run evidence outside committed guides. See
[existing helpers and conventions](e2e.md), [Console testing](console.md),
[project qualification](../project-qualification.md) and [live AWS](live-aws.md).

## What is still thin

The registry records selection, not a coverage score; these gaps come from the second sweep's handoffs and stay until
the owning slice closes them.

- **No owned tests:** S24 (.NET), S26 (PHP) and S38 (website) rely on shared packaging, image and build lanes only.
- **Live-only behavior without a canary:** Session Manager transport and ECS exec (S16), `bucket:sync` CDN invalidation
  and the transfer-acceleration region rule (S31), real ECS secret ARNs and multi-auth MSK (S10, S12), Paddle sandbox
  and exchange-rate providers (S53), the native release candidate (S34) and init model quality (S08).
- **Not run for cost:** `starter-qualification` runs all starters and takes hours; run a `--starter=` subset for a
  change. `init-corpus-2` needs a synthetic corpus directory passed as `--projects-root` that does not exist on the
  development machine.
- **Needs Docker and a dev stack:** S15's parallel runner, hosting bucket, SSR adapters, MySQL, DynamoDB and OpenSearch
  local drivers, health monitor and `dev` startup. Lifecycle hooks are covered for `delete` only (S16). J8 has no GitLab
  or Bitbucket merge-request-close journey.
- **Browser lanes** were outside both sweeps and keep their own owner.
