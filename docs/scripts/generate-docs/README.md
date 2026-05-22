# Docs generation pipeline — usage guide

Multi-agent pipeline that turns Stacktape's source code (`types/stacktape-config/*.d.ts`,
`src/commands/**`, `console-app/**`) into MDX docs pages.

For each page: `page-writer` drafts, three named reviewer agents score the page,
three verifier/auditor agents check facts and coverage, and `code-block-validator` runs deterministic MDX/code checks. The loop
revises until quality gates pass or the iteration cap is hit.

You configure *what* it generates via [`pages.ts`](./pages.ts) and *how* via the per-section
rules in [`section-instructions.yml`](./section-instructions.yml), the project-wide
[`style-guide.md`](./style-guide.md), and the prompt scaffolding in [`prompts.ts`](./prompts.ts).

---

## Quick start

```bash
cd C:\Projects\stacktape\docs

# Generate a single page
bun run scripts/generate-docs/generate-pages.ts --onlyPage resources/compute/web-service

# Generate every page that's still a placeholder, missing, stale, or marked did-not-pass
bun run scripts/generate-docs/generate-pages.ts --onlyPending

# See where things stand
bun run scripts/generate-docs/generate-pages.ts --status
```

Output lands in [`docs/`](../../docs/) at the page's route. State per page (reviewer scores, verifier
issues, draft history) is at [`./.state/`](./.state/).

---

## Commands & flags

Main entry point: [`generate-pages.ts`](./generate-pages.ts). Run with `bun run scripts/generate-docs/generate-pages.ts <flags>`.
Section batch entry point: [`generate-section-batch.ts`](./generate-section-batch.ts). Use it when you want to generate the rest of a page scope from one already-passed anchor page.

### Generate

| Flag | Meaning |
|---|---|
| `--onlyPage <route>` | Generate one page. `<route>` matches `route` in [`pages.ts`](./pages.ts) (e.g. `resources/compute/web-service`). |
| `--onlyPending` | Only run pages that are placeholders, missing, failed, or stale. |
| `--onlyFailed` | Only re-run pages whose last generation failed (`pipelineStatus: did-not-pass`). |
| `--onlyStale` | Only re-run pages whose source files have changed since the last successful generation (content-hash drift). |
| `--example <path>` | Use a finished page as a "section example" — the writer follows its structure/style for the rest of the section. |
| `--maxIterations <n>` | Default `3`. Higher means more revision rounds before giving up. |
| `--concurrency <n>` | Default `1`. Pages run sequentially; bump to parallelize at the cost of CLI rate limits. Each page internally runs reviewers and verifiers in parallel, so this multiplies agent calls. |
| `--prepareOnly` | Seed placeholder MDX files for every entry in [`pages.ts`](./pages.ts). No LLM calls. |

### Section batch generation

```bash
bun run scripts/generate-docs/generate-section-batch.ts \
  --anchor resources/compute/web-service \
  --scope resources/compute \
  --maxPages 15 \
  --concurrency 2
```

| Flag | Meaning |
|---|---|
| `--anchor <route>` | Required. Route of an already-passed, fresh page. Repeat it to run multiple scopes. Resource anchors scope to their category, e.g. `resources/compute`. |
| `--scope <route-prefix>` | Optional explicit scope for one anchor. Use this to intentionally widen a batch, e.g. `--scope resources`. |
| `--maxPages <n>` | Optional hard cap on attempted pages. Useful for short test runs. |
| `--maxHours <n>` | Default `24`. Stop launching pages after this many hours. |
| `--concurrency <n>` | Default `2`. Initial page concurrency. The batch runner backs off on rate-limit signals and increases after successful pages. |
| `--dryRun` | Print the planned queue and exit without generating. |

### Claude Opus/Sonnet section runs

Use [`run-claude-generation.ts`](./run-claude-generation.ts) when you want a repeatable section batch with every model-backed agent explicitly assigned to Claude Opus or Claude Sonnet:

```bash
bun run gen:docs:claude
```

Default behavior:

- `--anchor resources/compute/multi-container-workload`
- `--scope resources`
- `--maxPages 10`
- `--concurrency 3`
- `--profile balanced`

Profiles:

| Profile | Assignment |
|---|---|
| `balanced` | Opus for `page-writer`, `production-engineer-reviewer`, `factual-accuracy-verifier`, and `source-grounding-verifier`; Sonnet for the two reader reviewers and `api-completeness-auditor`. |
| `quality` | Opus for writer, production review, and all verifier/auditor roles; Sonnet for the two reader reviewers. |
| `economy` | Sonnet for writer/review/API coverage; Opus remains on strict factual and source-grounding gates. |

You can still pass any batch flag through:

```bash
bun run gen:docs:claude --maxPages 25 --concurrency 3 --profile quality
```

You can also override model names or individual agent assignments:

```bash
bun run gen:docs:claude \
  --opusModel claude-opus-4-7 \
  --sonnetModel claude-sonnet-4-6 \
  --apiCompletenessAuditorModel claude:claude-sonnet-4-6
```

### Agent model flags

Each model-backed agent has a stable role name and an independent model override:

| Flag | Agent role |
|---|---|
| `--writerModel <model>` | `page-writer` |
| `--firstTimeUserReviewerModel <model>` | `first-time-user-reviewer` |
| `--productionEngineerReviewerModel <model>` | `production-engineer-reviewer` |
| `--aiConsumerReviewerModel <model>` | `ai-consumer-reviewer` |
| `--reviewerModel <model>` | Convenience default for all three reviewers unless a reviewer-specific flag is set. |
| `--factualAccuracyVerifierModel <model>` | `factual-accuracy-verifier` (Claude provider) |
| `--sourceGroundingVerifierModel <model>` | `source-grounding-verifier` (Codex provider by default) |
| `--apiCompletenessAuditorModel <model>` | `api-completeness-auditor` (Codex provider by default) |
| `--codexVerifierModel <model>` | Convenience default for both Codex-backed verifier/auditor agents unless a specific flag is set. |

Model values can include a provider prefix: `claude:claude-sonnet-4-6` or `codex:gpt-5.5`. Without a prefix, the agent uses its default provider.

Compatibility aliases still work: `--factualVerifierModel` maps to `--factualAccuracyVerifierModel`, `--sourceVerifierModel` maps to `--sourceGroundingVerifierModel`, and `--pageAuditorModel` maps to `--apiCompletenessAuditorModel`.

### Inspect

| Flag | Meaning |
|---|---|
| `--status` | Counts of passed / needs-human-review / failed / placeholder / missing pages. Fast — no source-hash checks. |
| `--statusWithStaleness` | Same, plus counts pages whose sources have drifted (`passed-stale`). Slower — recomputes hashes. |
| `--listFailed` | List every page that failed. |
| `--listNeedsReview` | List every page marked `pipelineStatus: needs-human-review`. |
| `--listPending` | List every page that still needs generation (placeholder, missing, failed, or stale). Pages marked `needs-human-review` are skipped until you explicitly regenerate them. |
| `--listStale` | List every page where the source files changed after the last pass. Implies staleness check. |

### Maintenance

| Flag | Meaning |
|---|---|
| `--invalidatePassed` | Scan all output pages for forbidden style violations (YAML config, `StacktapeConfig` plain object, fenced TS Stacktape config). For each match, delete state + reset the page to a placeholder. |
| `--invalidatePassed --dryRun` | Same scan, but only prints which pages would be invalidated. Doesn't change anything. |

---

## What you can configure

| File | What it controls |
|---|---|
| [`pages.ts`](./pages.ts) | The full page list — routes, source files, page kinds, per-page notes. The single source of truth for what the pipeline generates. |
| [`section-instructions.yml`](./section-instructions.yml) | Per-section rules merged into every prompt. Keyed by the first URL segment (e.g. `resources:`, `getting-started:`). |
| [`style-guide.md`](./style-guide.md) | Project-wide voice, canonical terminology, the canonical Stacktape config example shape, forbidden phrasings. Loaded into every prompt. |
| [`backbones.ts`](./backbones.ts) | The hint list of H2 section names per page template (`resource`, `recipe`, `console`, `cli`, `general`). Hint only — the writer can deviate. |
| [`prompts.ts`](./prompts.ts) | Writer / reviewer / verifier / SEO-reviewer prompt scaffolding. Hard rules and detection patterns live in `commonRules` and `sharedReviewerRequirements`. |
| [`run-page.ts`](./run-page.ts) | Pass thresholds (`REVIEWER_GRAND_AVG_THRESHOLD`, `REVIEWER_MIN_SCORE_THRESHOLD`, `REVIEWER_PER_REVIEWER_AVG_THRESHOLD`) and the reviewer/verifier agent wiring. |
| [`agent-models.ts`](./agent-models.ts) | Stable agent role names and CLI model-override flag parsing. |
| [`context.ts`](./context.ts) | Auto-augmentation of source files (which `@generated/llm-docs/*` to inject for which page kind, when to inject pricing summaries / DB engine versions). Per-source 80 KB truncation budget lives here too. |
| [`pricing-summary.ts`](./pricing-summary.ts) | How `prices.json` is distilled into per-resource markdown summaries. Per-slug logic. |
| [`code-validator.ts`](./code-validator.ts) | Deterministic check of `<CodeBlock intellisense>` blocks. Public-class whitelist falls back to `fallbackKnownExports` when `__release-npm/index.d.ts` is absent. |
| [`providers.ts`](./providers.ts) | Claude / Codex CLI invocation. Picks up `CLAUDE_CLI_PATH` and `CODEX_CLI_PATH` env vars. |
| [`../../DOCS_STRUCTURE_PLAN.md`](../../DOCS_STRUCTURE_PLAN.md) | Top-level docs information architecture. Loaded into every prompt as background. |

### Per-page tweaks

Pages are declared in [`pages.ts`](./pages.ts) using helpers:

- `resourcePage({ slug, route, order, notes })` — for resource catalog pages. Pulls `sourceFiles` from `resourceInfo` automatically.
- `generalPage({ route, title, order, kind, template, description, sourceFiles, sourceGlobs, notes })` — for everything else.
- `cliPage({ command, order })` — auto-generated, one per CLI command.

Things you most often tweak per page:

- **`notes`** — array of strings appended to the writer prompt, prepended with "Page-specific notes:". Use for must-haves a section-wide rule wouldn't catch (e.g. *"Include a load-balancing decision callout: HTTP API gateway is the default; ALB unlocks gradual deployments + WAF + WebSockets; NLB for non-HTTP."*).
- **`sourceFiles`** — extra files to include alongside the resource's defaults.
- **`sourceGlobs`** — glob patterns; useful for things like "all CLI commands under `src/commands/debug-*`".
- **`shortDescription`** — included in the writer prompt as the page's purpose. Override the auto-generated one when needed.

### Per-section tweaks

Edit [`section-instructions.yml`](./section-instructions.yml). Keys are URL prefixes (`resources:`, `getting-started:`, `cli:`, etc.). Each is a YAML list of strings. The list shows up in every prompt for pages whose route starts with that key.

Use this for anything that applies to a whole section but not the whole project (e.g. *"Resource pages always include a When-NOT-to-use section"*, *"CLI pages must use the auto-generated `<CliCommandsApiReference>` component"*).

### Project-wide style

[`style-guide.md`](./style-guide.md) is loaded into the writer, reviewer, and verifier prompts as a single block. Edit when you want a rule that applies *everywhere* — terminology, the canonical Stacktape config example shape, forbidden marketing words, page rhythm.

### Backbone (per-template H2 hints)

[`backbones.ts`](./backbones.ts) returns a list of suggested H2s per template. The writer is told it's a hint, not a hard template — it can omit, reorder, or add. Edit when you want a different default skeleton.

### Reviewer personas

In [`run-page.ts`](./run-page.ts), the `reviewerPersonas` constant holds the three reviewer personas. Agent role names and model flag parsing live in [`agent-models.ts`](./agent-models.ts). Reviewers default to `claude-sonnet-4-6`; writer and verifier agents use their CLI defaults unless overridden by flags.

### Pass thresholds

Constants at the top of [`run-page.ts`](./run-page.ts):

| Constant | Default | Effect |
|---|---|---|
| `REVIEWER_GRAND_AVG_THRESHOLD` | `7.0` | Minimum overall average across all reviewers × all categories. |
| `REVIEWER_MIN_SCORE_THRESHOLD` | `5` | No single category from any reviewer can be below this. |
| `REVIEWER_PER_REVIEWER_AVG_THRESHOLD` | `6.5` | Each reviewer's own average must clear this — so a single very harsh reviewer can't be averaged away. |
| `MIN_REVIEWERS_REQUIRED` | `2` | Below this, the run can't pass even if scores are great (catches Codex-down + Claude-down failure modes). |

A high-severity verifier issue from any verifier blocks passing regardless of scores.

### Auto-included sources

[`context.ts`](./context.ts) injects extra sources based on page kind/route. Three maps:

- `llmDocsConfigReferenceAliases` — resource slug → `@generated/llm-docs/config-reference/<base>.md` filename.
- Every page also receives its generated `@generated/llm-docs/pages/<route>.md` file when that file exists.

Add an entry when you want a page to receive a pre-distilled AI summary alongside its raw types.

For pricing: `relational-database`, `redis`, and the five Fargate-backed compute resources auto-receive a `~500-byte` pricing summary distilled from [`@generated/aws-price/prices.json`](../../../@generated/aws-price/prices.json) by [`pricing-summary.ts`](./pricing-summary.ts). Edit there to extend coverage.

### Sidebar / navigation

Not strictly part of the pipeline, but the docs site's nav reads from [`../../config.ts`](../../config.ts) (`sidebar.groups`, `sidebar.forcedNavOrder`, `sidebar.defaultOpenPaths`). When you add a new top-level section to [`pages.ts`](./pages.ts), also add a matching `groups` entry there or pages will land in the unfiled root group.

---

## How to generate a single page (worked example: `web-service`)

1. **(Optional) Add a `notes:` array** to the page in [`pages.ts`](./pages.ts) for must-haves the writer should include. Find the `resourcePage({ slug: 'web-service', ... })` line. Pass `notes: ['…', '…']`.

2. **(Optional) Skim the relevant sections** in [`section-instructions.yml`](./section-instructions.yml) (`resources:`) and [`style-guide.md`](./style-guide.md). If anything looks off-target for what you're generating, edit there — the change applies to every future run too.

3. **Run**:
   ```bash
   bun run scripts/generate-docs/generate-pages.ts --onlyPage resources/compute/web-service
   ```

4. **Read the output**:
   - The MDX is at [`docs/resources/compute/web-service.mdx`](../../docs/resources/compute/web-service.mdx).
   - Reviewer feedback, verifier issues, and per-iteration drafts live at `./.state/resources__compute__web-service.json` and `./.state/resources__compute__web-service/iteration-N.mdx`.

5. **If quality is low**, look at *why* in the state file. Common patterns:
   - A reviewer flagged the same problem twice → fix it as a rule in [`section-instructions.yml`](./section-instructions.yml) or [`style-guide.md`](./style-guide.md).
   - A verifier flagged unsupported claims → tighten the `notes:` array or add a sourceFile.
   - The writer ignored a constraint → reinforce in `commonRules` inside [`prompts.ts`](./prompts.ts).

6. **Re-run**. Pipeline state persists, so it'll keep iterating from the last draft up to `--maxIterations`.

---

## Setup checklist

| Requirement | Notes |
|---|---|
| **Bun** ≥ 1.3.9 | Pipeline scripts use Bun-only APIs (`Bun.spawn`, `import.meta.dir`). |
| **Claude CLI** | `claude --version` should work. Override path with `CLAUDE_CLI_PATH=…`. |
| **Codex CLI** (optional) | `codex --version`. Override with `CODEX_CLI_PATH=…`. Pipeline falls back to Claude if Codex hits rate limits or is missing. |
| **`__release-npm/index.d.ts`** (optional) | Used by the code validator's class-name whitelist. Refresh with `bun run build:npm --version <ver>` in the `stacktape/` repo. Falls back to a hardcoded list when missing. |

---

## After generation: reading the state file

`./.state/<page-id>.json` shape (most useful fields):

- `iterations[]` — one entry per attempt. Each has:
  - `draftPath` — path to the iteration's MDX draft (you can `diff` between iterations to see how feedback was applied).
  - `reviewerResults[]` — for `first-time-user-reviewer`, `production-engineer-reviewer`, and `ai-consumer-reviewer`; each includes `modelProvider`, `modelName`, `scores`, `strengths`, `problems`, `mandatoryFixes`, `optionalImprovements`.
  - `verifierResults[]` — for `factual-accuracy-verifier`, `source-grounding-verifier`, `api-completeness-auditor`, and the deterministic `code-block-validator`. Each includes `modelProvider`, `modelName`, and `issues[]` with `severity` (`high`/`medium`/`low`), `type`, `statement`, `reason`, `suggestedFix`, `evidence` (file + quote pairs).
  - `passed` — boolean.
  - `status` — `passed`, `needs-human-review`, or `failed` for newer runs.
- `agentModelAssignments` — resolved agent role names and model display names for the most recent run.
- `inputHashes` — SHA-1 of every source file at the time of last pass. Used by `--onlyStale` and `--statusWithStaleness`.
- `completedAt` — set when a page passed.

Final output status:

- `passed` — no pipeline status marker is written; `completedAt` and source hashes are saved.
- `needs-human-review` — the draft is readable and has no hard factual/code blocker, but reviewer or advisory verifier concerns remain. The MDX frontmatter gets `pipelineStatus: needs-human-review` and `pipelineReviewSummary`.
- `failed` — the best draft is written with `pipelineStatus: did-not-pass` and `pipelineFailureSummary`.

Hard blockers are high-severity factual/source-grounding issues that would mislead configuration, deterministic TypeScript/MDX failures, or very low reviewer scores. Reviewer polish, API-completeness concerns, and YAML-converter coverage gaps can route a page to human review instead of failing the batch.

---

## Common workflows

### First-time bulk generation
```bash
# Seed every page as a placeholder so the dev server doesn't 404 anywhere
bun run scripts/generate-docs/generate-pages.ts --prepareOnly

# Then generate one section at a time, e.g. resources/compute first
bun run scripts/generate-docs/generate-pages.ts --onlyPage resources/compute/lambda-function
bun run scripts/generate-docs/generate-pages.ts --onlyPage resources/compute/web-service
# … etc
```

### Iterating on prompts
```bash
# After tweaking section-instructions.yml or style-guide.md, retry just the failed pages
bun run scripts/generate-docs/generate-pages.ts --onlyFailed
```

### Source code changed, regenerate affected pages
```bash
bun run scripts/generate-docs/generate-pages.ts --listStale         # see what drifted
bun run scripts/generate-docs/generate-pages.ts --onlyStale         # regenerate just those
```

### Generating a section using a "good" page as a style template
```bash
# Once one page in a section is high-quality, use it as the example for the rest:
bun run scripts/generate-docs/generate-pages.ts \
  --example docs/resources/compute/web-service.mdx
# (the rest of resources/compute/* will be generated using web-service.mdx as a structural reference)
```

### Force-regenerate pages that violate style rules
```bash
bun run scripts/generate-docs/generate-pages.ts --invalidatePassed --dryRun   # preview
bun run scripts/generate-docs/generate-pages.ts --invalidatePassed             # do it
bun run scripts/generate-docs/generate-pages.ts --onlyPending                  # regenerate
```

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Could not find page matching --onlyPage X` | The route doesn't match anything in [`pages.ts`](./pages.ts). Run `--listPending` to see valid routes. |
| Codex calls fail with "usage limit" | Pipeline auto-falls-back to Claude. Watch the run log for the warning. To prefer Claude entirely, edit `reviewerPersonas` in [`run-page.ts`](./run-page.ts). |
| Code validator flags real classes as unknown | The fallback class list in [`code-validator.ts`](./code-validator.ts) is out of date and `__release-npm/index.d.ts` is missing. Either rebuild it (`bun run build:npm` in `stacktape/`) or add the missing class to `fallbackKnownExports`. |
| Page passes but the output is wrong | The reviewers or verifiers didn't catch it. Add a detection rule to `sharedReviewerRequirements` in [`prompts.ts`](./prompts.ts) or to the relevant `section-instructions.yml` key, then `--invalidatePassed --dryRun` to confirm the rule fires, then `--invalidatePassed` + `--onlyPending`. |
| Page fails repeatedly with the same issue | Look at the verifier's `evidence` field for the offending claim. If the claim has no source backing in the input, expand `sourceFiles` for that page in [`pages.ts`](./pages.ts). If the source disagrees with what the writer wrote, tighten the relevant rule in `commonRules` ([`prompts.ts`](./prompts.ts)). |
| Pipeline hangs | Likely the Claude or Codex CLI is waiting for input. Cancel (`Ctrl+C`), check that `claude -p --output-format json` works manually with a tiny prompt. |
