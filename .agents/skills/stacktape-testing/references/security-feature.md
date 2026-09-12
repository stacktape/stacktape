# Example: security findings spanning CLI and Console

Adapt this recipe to the requested feature. It describes how to choose evidence, not an existing complete security E2E
suite. Read [the security policy](../../../../docs/testing.md#security-and-guardrails) and current
[Console readiness](../../../../apps/console/e2e/readiness.md) first. Include only behavior the feature actually has.

## Start with the complete behavior

For example: the current CLI detects a particular unsafe configuration, reports a finding through the API, and an
authorized user can inspect and acknowledge it in Console. A nearby safe configuration produces no finding. A user
outside the intended project or organization cannot read or change it, including through a direct API request.

Identify the actual path before choosing tests. Some rules run entirely during synthesis; others inspect AWS or arrive
through a scheduled worker. Those require different evidence. Do not invent a CLI ingestion endpoint, worker or AWS
fixture merely to follow this example.

## Use cheap tests to narrow failures

| Changed part                                  | Focused evidence                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CLI rule or synthesis                         | Unsafe and nearby safe inputs through the real rule/resolver. Assert the finding, severity and relevant synthesized properties; use generated templates without deploying when that is the whole rule.       |
| CLI command or report format                  | Spawn the source CLI with representative input; assert exit status and semantic output. Check that the actual output is accepted by the consumer. Importing its handler alone does not exercise the command. |
| API contract and authorization                | Drive the real HTTP/tRPC router and context. Test the authorized identity, a restricted identity, and invalid input. Assert failed procedures contain no finding data.                                       |
| Persistence, deduplication or acknowledgement | Real PostgreSQL queries/transactions: assert the stored result, retry behavior, scoped updates and persistence after rereading. Extend feature tests; the migration suite alone does not prove these.        |
| Console interaction                           | Browser scenario for the new section, actual finding details and the relevant action. Assert the API result and reload; include denial or an empty list where it affects the feature.                        |

Use the existing package commands selected by `pnpm test:plan`; do not create parallel test frameworks. If the closest
existing runner lacks this feature, extend it with a narrowly scoped scenario.

## Then prove one complete journey

For a CLI-to-API-to-Console feature:

1. Reserve shared dev and run the Console doctor. Reuse the labelled project/user fixtures where their permissions fit.
   Use the documented restricted fixtures; do not increase the test user's privileges to make the test pass.
2. Apply committed schema changes only through `pnpm migrate:console:dev` after reviewing their effect on existing
   shared data and respecting any required approval. Then start `pnpm dev:console`.
3. Run the source CLI against the new local API when the contract changed. Set
   `STP_CUSTOM_TRPC_API_ENDPOINT=http://localhost:3000` on that CLI process and invoke `pnpm dev:cli <actual-command>`.
   Keep the explicit project/stage/region and credential mode required by that command. Verify from API requests or logs
   that the intended server handled the operation; `pnpm dev:cli` alone selects deployed dev.
4. Submit a uniquely labelled finding using the feature's real entrypoint. Assert its stored identity and data, then
   find it in the browser. Verify the relevant action after reload. Repeat delivery if deduplication is part of the
   contract, and check the safe case remains clean.
5. Prove project denial and cross-organization isolation wherever the changed authorization promises both. The current
   project-access scenario proves only same-organization access. Cross-organization tests need an actual second
   restricted tenant/user fixture; record that boundary as blocked if the fixture is unavailable.
6. Remove only the scenario's findings/resources through their supported cleanup path, verify removal, stop local mode
   and release the reservation. Keep reusable projects and users.

If production behavior reads AWS state, a synthetic input proves rule logic but not AWS collection or IAM. Add a small,
owned dev AWS scenario for those facts, following the live-AWS policy. If a deployed worker collects or transforms the
finding, deploy the changed dev worker and send the real event before claiming that path works. Do not create an
exploitable public resource or use real secrets as detection fixtures.

## What qualifies the feature

The relevant gate passes, the specific customer journey works through the changed code, its relevant failure case is
proved, and stored state and cleanup are verified. Name any remaining provider, worker, AWS, tenant or runner boundary
explicitly. A green generic browser smoke test is not acceptance for a new security section.
