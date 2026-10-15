# Testing overhaul plan

Use the [short policy](../testing.md) for daily work. This plan orders improvements to customer promises, with practical
coverage for a small startup. Batch 1 added functional anchors across J1–J13; the October 2026 audit still found 23 thin
slices and one without behavior tests. A passing journey does not establish every promise inside it.

## Slices, journeys and tiers

A **slice** owns one customer promise and its tests. S01–S74 keep their original IDs; S36 (VS Code) is excluded and S73
(Console first-deployment generation) is retired. Split an independent promise with an a/b suffix when necessary.
**Journeys J1–J13** group slices for priority and pre-release end-to-end qualification. They do not own tests.

The source of truth is [the code registry](../../scripts/workspace/test-registry.ts): lanes contain command argv, level,
tier, test entrypoints and prerequisites; slices contain promises, implementation paths, primary test ownership, lane
references, journey tags and contributors. A contributor reuses another slice's scenario without giving a test two
primary owners. [The planner](../../scripts/workspace/test-plan.ts) matches changed source and test paths, keeps direct
suite-import selection, and de-duplicates commands. Public clones can inspect private recommendations without importing
Console source; those lanes report the missing checkout.

| Tier      | When it runs                                         | Scope                                                                           |
| --------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `pr`      | Every PR, through `pnpm test:ci`                     | Small, fast, offline, stable rules and tooling; Console rules when initialized. |
| `change`  | Implementer runs it when `pnpm test:plan` selects it | Relevant process, artifact, Docker, API/database and browser checks.            |
| `release` | Candidate qualification                              | Full corpus, supported native targets and externally owned service contracts.   |

Levels are `focused`, `process`, `api-db`, `browser` and `live-aws`. Docker, Chromium, Console, AWS, network and
shared-dev reservations are explicit prerequisites. Every `pr` and `change` lane also runs before release. CI has no
heavy-test or nightly substitute; the implementer owns selected change evidence. Both CI workflows retain
`pnpm check:static` (instructions, docs, secrets, format/lint, workspace/pattern rules, generated parity, types,
architecture, dead code and duplicates) before `pnpm test:ci`. Public Linux also runs `cfn-lint` on the dense and
local-dev support templates. Full suites, application builds, package-install qualification and shared-UI browsers stay
in the unchanged local/release gates. Console migration adoption and browser privacy are selected `change` lanes and
also run before release. The ownership check in `pnpm test:tools` rejects unowned tests, empty active slices and missing
scripts, database flags or Playwright projects.

## Work one slice at a time

1. Give one implementer a slice ID, its promise, baseline revisions, writable paths and existing lanes. Read fix history
   first; defects that shipped are the first failures to reproduce. First deployment starts in the CLI.
2. Extend the existing fixture through the real product path. Assert the customer outcome and the failure that matters:
   committed state, artifact response, denied access, cancellation or cleanup. Use independent expected values.
3. Prove the scenario with a fault check: temporarily break the relevant behavior and confirm the intended assertion
   fails. A compile error or broken fixture does not count. Restore the code and rerun the lane.
4. Have independent reviewers inspect the promise, patch, fault result and removals. Use a fresh context; increase
   review effort for authorization, secrets, billing, data loss and shared fixtures. Agreement alone is not proof.
5. Prune unit tests that do not earn their place. Keep pure-rule tables, compatibility contracts and real-bug repros.
   Delete mock choreography and runtime source-string tests. In well-covered slices, delete other unit cases when the
   slice's scenarios catch the same faults. Name the replacement protection; preserve unique failures until it exists.
   Source/SQL/YAML checks whose actual purpose is repository or publication policy remain explicit tooling.
6. Update the registry, run the selected lanes and repository gate, and hand off checks, faults, removals, defects and
   gaps. Fix product defects with a regression at the owning boundary; route product decisions or risky repairs to the
   owner. Never assert a known bug or skip a failing scenario to make a lane pass.

One owner changes a shared fixture at a time; each slice gets its own worktree. Run one heavy lane at a time on a shared
machine. Extend helpers before extracting a new abstraction; extract only when two current consumers need it. Keep
per-run evidence outside committed guides. See [existing helpers and conventions](e2e.md),
[Console testing](console.md), [project qualification](../project-qualification.md) and [live AWS](live-aws.md).

MiniStack is the one AWS emulator; the [E2E guide](e2e.md) owns the kit and its limits.

## Next thin slices

Prioritize activation and data safety (J1–J3), then daily use and tenant trust (J4–J7); do J8–J13 as their paths change.
This short queue comes from the slice audit; the registry records selection, not a permanent coverage score.

| Rank | Slice                  | Smallest useful addition                                                                                    |
| ---- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1    | S07                    | Browser drives the CLI-served wizard, reviewed decision/sign-in/save and disconnect cleanup.                |
| 2    | S08                    | Recorded Codex completes init, including malformed/refusal/cancel; separate small model-quality evaluation. |
| 3    | S09                    | Batch and Step Functions through real synthesis with event targets, dependencies and scoped IAM.            |
| 4    | S11                    | Selected WebSocket/AppSync or custom-domain DNS/TLS endpoint qualification.                                 |
| 5    | S30                    | Reproduce the TanStack starter failure, then invoke real output; add one Nuxt/Remix cookie case.            |
| 6    | S31                    | Static build serves deep links/assets; MiniStack observes initial/update/removed object effects.            |
| 7    | S21, S25, S28, S23     | Compiled Python dependency, Ruby native gem, Next cookie/cache behavior, Java Lambda handler.               |
| 8    | S15, S52, S65          | Lambda dev/tunnel cleanup, Console secret/parameter CRUD after reload, synthetic artifact disposal.         |
| 9    | S51, S64, S66          | Forge pairing through HTTP/PostgreSQL, observability navigation, costs/budgets and durable snooze.          |
| 10   | S37–S41, S70, S34, S69 | Docs/website/control/editor/diagram interactions, consumer CSS, native installers, analytics consumers.     |

The kit agent owns the MiniStack fixtures, deploy harness and lane implementations. The registry's
`pendingMiniStackLanes` names unfinished registration slots; they are not runnable or passing evidence. Deployment
lifecycle coverage runs in the existing `ministack-deploy` lane. Register other implemented lanes with exact commands
and owned tests when integrating that work.

Console PR lanes include offline migration history, package export boundaries and infrastructure contracts plus
assembled support-template `cfn-lint`. Install `cfn-lint==1.57.2` before running `pnpm test:ci` with Console present; CI
installs it explicitly. Migration adoption still requires disposable PostgreSQL and stays in the change tier.
