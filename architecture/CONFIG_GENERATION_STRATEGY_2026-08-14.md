# Config generation: the agreed direction

Date: 2026-08-14 · Status: **agreed** (product owner sign-off). This document supersedes the earlier strategy draft that
lived at this path and reconciles four independent reviews of the v4 init/config-inference system (a full
code-and-competitor study, plus reviews by three further models). It is the canonical direction; treat other strategy
notes about config generation as historical input.

## Goal

Make the first deploy as smooth as possible with as little friction as possible. Friction is a budget:

| Outcome                             | Friction cost               | Policy consequence                                    |
| ----------------------------------- | --------------------------- | ----------------------------------------------------- |
| Verified default (preflight passed) | ~zero                       | Target state for the whole supported lane             |
| One pre-filled question             | ~5 seconds                  | Fallback when verification fails or cannot run        |
| Failed AWS deploy                   | 10–15 min + trust destroyed | Never knowingly allowed: Deploy gates on preflight    |
| Dead end ("could not generate")     | Total loss                  | Abolished: convention defaults + one question replace |

A failed CloudFormation deploy is the most expensive friction in the product. A dead end is total loss. This ordering —
not "no questions" and not "always deployable" — is the design principle.

## What stays

The evidence-contract architecture won and is not in question: typed facts with citations, the agent trust boundary
(submissions cannot invent infrastructure, secrets never leave the machine, prose never reaches the user), deterministic
composition, never silently replacing a live external database, `low-cost | standard | production` as the one sizing
question. The deterministic scan resolves the mainstream (98/122 corpus projects gap-free in ~20 s) and remains the
default path.

## The three decisions

1. **Deploy gates on local preflight, not on textual proof.** The pipeline guesses boldly from ecosystem convention (an
   archetype knowledge pack with provenance — `source: 'convention'`), then verifies locally before AWS: build, check
   declared outputs, boot with stub env in a consented sandbox (no credentials, no secrets, no network by default,
   time/CPU caps), observe the port, hit the health path. Verification failures are new facts fed back into the plan
   (the counterexample loop), and only the irreducible residue becomes one pre-filled question or a proposed one-line
   code patch ("add a production start script?"). Consequences: a known-broken config never has an enabled Deploy
   button, and a scan never ends in a dead end. This is continuous with the existing "assumptions, not questions"
   decision — preflight is a machine answering the question.

2. **Surgical AI: local agent if installed, Stacktape-hosted narrow extraction otherwise.** The generic whole-repo agent
   review is retired (measured: 841k input tokens across six runs, zero resource-graph changes). AI runs in exactly
   three missions, each with a narrow file set, a strict schema, and a material acceptance criterion: resolve a named
   unresolved fact, classify leftover environment variables, explain a concrete preflight failure. A detected Claude
   Code/Codex runs these on the user's subscription; without one, small schema-constrained hosted calls (snippets, never
   whole repos, never secrets) keep the experience zero-install. Privacy copy: "small code excerpts, never your
   secrets"; local-only remains a user choice.

3. **The supported lane is an internal release bar now, a public claim later.** The lane: Next/Vite/static frontends,
   Node and Python HTTP APIs, workers, Postgres/MySQL/Redis/S3, docker-compose, explicitly declared SAM/Lambda. It
   drives the roadmap and the release gate; the 122 synthetic fixtures become regression coverage, not the definition of
   done. Public "verified for X" marketing waits for real ≥90% preview-URL numbers on the lane.

## The five moves, in order

1. **Wire the app, not just the infra** (shovel-ready). Port the legacy env-var machine into the deterministic scan:
   per-language extraction of environment reads from source, role classification (`build-time` / `third-party-secret` /
   `infra-dependency` / `runtime-config` / `cross-service-reference`), the `$ResourceParam` keyword table with its
   only-when-unambiguous guard, `$Secret` classification, build-time (`NEXT_PUBLIC_*`/`VITE_*`) serialization. Land the
   collected-but-dropped composer facts: `migrations` → deploy hooks, `workspace.buildsFromRoot` → monorepo-aware
   packaging, health checks, runtime version pins, plus the known safety fixes (`.env` hosting order, lambda-source
   over-fire, `$Secret` name escaping, repair-loop haystack). All four reviews independently ranked env wiring the
   single biggest hole: infrastructure that exists but an app that cannot reach it is the worst first impression.

2. **Convention pack, never a dead end.** Archetype defaults with provenance for the ICP ecosystems, seeded from the
   legacy prompt's framework tables plus Vercel's and Railpack's open detection data. Results surface through four
   user-facing states: **Proved / Recommended / Needs you / We'll skip this**. This converts the corpus's 15 "no
   provable entrypoint" dead ends into recommended, preflight-verifiable defaults.

3. **Local preflight as the backbone.** The gate from decision 1. Bundled Nixpacks (`plan --format json`, and Railpack
   when adopted) serves as a free cross-check oracle for build/start plans. Existing deployment manifests are consumed
   as importers via the owning tools' normalized output (`docker compose config --format json`, `serverless print`, SAM
   templates) — the user's current production shape is the highest-grade evidence there is, and "migrating from
   Render/Heroku/Fly" is the ICP's actual journey.

4. **Surgical AI only** (decision 2), plus the offline knowledge compiler: run expensive analysis over public repos on
   our tokens, diff against the deterministic scan, and turn every win into a detector rule, convention-pack entry, and
   fixture. The deterministic layer — and therefore the free tier — inherits every improvement.

5. **Flip the metric.** North star: **share of lane repositories reaching a healthy preview URL with zero manual config
   edits and at most one question**, measured on executable fixtures and curated real repositories in a guarded,
   cost-capped deploy lane. Secondary: time-to-URL, repair count, question count, correction telemetry from the Review
   step (categories only) as the production accuracy signal. Composition validity stops being the bar.

## Non-goals

- No return to agent-writes-config, and no restoration of the legacy generator as runtime (it is a parts donor: its env
  machine, candidate ladders, and framework tables — not its fabricated values or package-name inference).
- No third rewrite and no new intermediate representation. `ProjectFacts` grows provenance tiers
  (`textual | convention | observed`) and confidence; the composer grows recipe-shaped internals. Nothing more.
- No generic AI review pass on every repository, ever again.
- No chasing 100% static inference. Repositories genuinely omit information; convention, execution, and one good
  question are the escape hatches.
- No catalogue-breadth work (EventBridge, Kinesis, AppSync, AgentCore…) prioritized ahead of the lane. Breadth that
  already works stays; the corpus stops pulling the roadmap.

## Provenance

Inputs reconciled on 2026-08-14: the eval report
(`apps/console/documents/research/ai-config-gent-init-eval-2026-08-14.md`), file-level code reviews of
`packages/config-inference` + `apps/cli/src/init` and of the legacy `console-app/server/services/config-gen`, a
source-level survey of Railpack, Nixpacks, flyctl, Vercel fs-detectors, azd, Encore, CNB, docker init and Render, and
three further independent model reviews. The full record with the steal sheet and file-level findings is the "Config
Inference Playbook" artifact; decisions above were made explicitly by the product owner.
