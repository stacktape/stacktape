# Docs generation pipeline — usage guide

Multi-agent pipeline that turns Stacktape's source code (`types/stacktape-config/*.d.ts`,
`src/commands/**`, `console-app/**`) into MDX docs pages.

For each page: a writer agent (Claude) drafts, three reviewer personas + an SEO reviewer score,
two verifiers (Claude + Codex) plus a deterministic code-validator fact-check, and the loop
revises until quality gates pass or the iteration cap is hit.

You configure *what* it generates via [`pages.ts`](./pages.ts) and *how* via the per-section
rules in [`section-instructions.yml`](./section-instructions.yml), the project-wide
[`style-guide.md`](./style-guide.md), and the prompt scaffolding in [`prompts.ts`](./prompts.ts).

---

## Quick start

```bash
cd C:\Projects\stacktape\docs

# Generate a single page
bun run scripts/generate-docs/index.ts --onlyPage resources/compute/web-service

# Generate every page that's still a placeholder, missing, or marked did-not-pass
bun run scripts/generate-docs/index.ts --onlyPending

# See where things stand
bun run scripts/generate-docs/index.ts --status
```

Output lands in [`docs/`](../../docs/) at the page's route. State per page (reviewer scores, verifier
issues, draft history) is at [`./.state/`](./.state/).

---

## Commands & flags

Entry point: [`index.ts`](./index.ts). Run with `bun run scripts/generate-docs/index.ts <flags>`.

### Generate

| Flag | Meaning |
|---|---|
| `--onlyPage <route>` | Generate one page. `<route>` matches `route` in [`pages.ts`](./pages.ts) (e.g. `resources/compute/web-service`). |
| `--onlyPending` | Only run pages that are placeholders, missing, failed, or stale. |
| `--onlyFailed` | Only re-run pages whose last generation failed (`pipelineStatus: did-not-pass`). |
| `--onlyStale` | Only re-run pages whose source files have changed since the last successful generation (content-hash drift). |
| `--example <path>` | Use a finished page as a "section example" — the writer follows its structure/style for the rest of the section. |
| `--maxIterations <n>` | Default `3`. Higher means more revision rounds before giving up. |
| `--concurrency <n>` | Default `1`. Pages run sequentially; bump to parallelize at the cost of CLI rate limits. |
| `--prepareOnly` | Seed placeholder MDX files for every entry in [`pages.ts`](./pages.ts). No LLM calls. |

### Inspect

| Flag | Meaning |
|---|---|
| `--status` | Counts of passed / failed / placeholder / missing pages. Fast — no source-hash checks. |
| `--statusWithStaleness` | Same, plus counts pages whose sources have drifted (`passed-stale`). Slower — recomputes hashes. |
| `--listFailed` | List every page that failed. |
| `--listPending` | List every page that hasn't been generated successfully (placeholder, missing, failed). |
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
| [`backbones.ts`](./backbones.ts) | The hint list of H2 section names per page template (`resource`, `choosing`, `recipe`, `console`, `cli`, `general`). Hint only — the writer can deviate. |
| [`prompts.ts`](./prompts.ts) | Writer / reviewer / verifier / SEO-reviewer prompt scaffolding. Hard rules and detection patterns live in `commonRules` and `sharedReviewerRequirements`. |
| [`run-page.ts`](./run-page.ts) | Pass thresholds (`REVIEWER_GRAND_AVG_THRESHOLD`, `REVIEWER_MIN_SCORE_THRESHOLD`, `REVIEWER_PER_REVIEWER_AVG_THRESHOLD`, `SEO_PASS_THRESHOLD`) and the reviewer-personas list. |
| [`context.ts`](./context.ts) | Auto-augmentation of source files (which `@generated/ai-docs/*` to inject for which page kind, when to inject pricing summaries / DB engine versions). Per-source 80 KB truncation budget lives here too. |
| [`pricing-summary.ts`](./pricing-summary.ts) | How `prices.json` is distilled into per-resource markdown summaries. Per-slug logic. |
| [`code-validator.ts`](./code-validator.ts) | Deterministic check of `<CodeBlock intellisense>` blocks. Public-class whitelist falls back to `fallbackKnownExports` when `__release-npm/index.d.ts` is absent. |
| [`providers.ts`](./providers.ts) | Claude / Codex CLI invocation. Picks up `CLAUDE_CLI_PATH` and `CODEX_CLI_PATH` env vars. |
| [`../../DOCS_STRUCTURE_PLAN.md`](../../DOCS_STRUCTURE_PLAN.md) | Top-level docs information architecture. Loaded into every prompt as background. |

### Per-page tweaks

Pages are declared in [`pages.ts`](./pages.ts) using helpers:

- `resourcePage({ slug, route, order, notes })` — for resource catalog pages. Pulls `sourceFiles` from `resourceInfo` automatically.
- `choosingPage({ category, route, order, title, description, slugs })` — for "choose between X / Y / Z" decision pages.
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

In [`run-page.ts`](./run-page.ts), the `reviewerPersonas` constant holds the three personas (startup-cto, smb-manager, developer-low-aws) and which model each runs on (`claude` or `codex`). Edit to change persona descriptions or model split.

### Pass thresholds

Constants at the top of [`run-page.ts`](./run-page.ts):

| Constant | Default | Effect |
|---|---|---|
| `REVIEWER_GRAND_AVG_THRESHOLD` | `7.0` | Minimum overall average across all reviewers × all categories. |
| `REVIEWER_MIN_SCORE_THRESHOLD` | `5` | No single category from any reviewer can be below this. |
| `REVIEWER_PER_REVIEWER_AVG_THRESHOLD` | `6.5` | Each reviewer's own average must clear this — so a single very harsh reviewer can't be averaged away. |
| `SEO_PASS_THRESHOLD` | `5` | Minimum SEO score (1–10). |
| `MIN_REVIEWERS_REQUIRED` | `2` | Below this, the run can't pass even if scores are great (catches Codex-down + Claude-down failure modes). |

A high-severity verifier issue from any verifier blocks passing regardless of scores.

### Auto-included sources

[`context.ts`](./context.ts) injects extra sources based on page kind/route. Three maps:

- `aiDocsConfigRefAliases` — resource slug → `@generated/ai-docs/config-ref/<base>.md` filename.
- `aiDocsConceptByRoute` — concept page route → ai-docs concept file.
- `aiDocsRecipeByRoute`, `aiDocsTroubleshootingByRoute` — same for recipes / troubleshooting.

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
   bun run scripts/generate-docs/index.ts --onlyPage resources/compute/web-service
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
  - `reviewerResults[]` — each reviewer's `scores`, `strengths`, `problems`, `mandatoryFixes`, `optionalImprovements`.
  - `verifierResults[]` — for `claude-verifier`, `codex-verifier`, and the deterministic `code-validator`. Each has `issues[]` with `severity` (`high`/`medium`/`low`), `type`, `statement`, `reason`, `suggestedFix`, `evidence` (file + quote pairs).
  - `seoReviewResult` — SEO score + suggestions.
  - `passed` — boolean.
- `inputHashes` — SHA-1 of every source file at the time of last pass. Used by `--onlyStale` and `--statusWithStaleness`.
- `completedAt` — set when a page passed.

A failed final iteration writes the best draft to disk anyway, with `pipelineStatus: did-not-pass` and `pipelineFailureSummary` injected into the MDX frontmatter — search those keys to find pages that need a human eye.

---

## Common workflows

### First-time bulk generation
```bash
# Seed every page as a placeholder so the dev server doesn't 404 anywhere
bun run scripts/generate-docs/index.ts --prepareOnly

# Then generate one section at a time, e.g. resources/compute first
bun run scripts/generate-docs/index.ts --onlyPage resources/compute/lambda-function
bun run scripts/generate-docs/index.ts --onlyPage resources/compute/web-service
# … etc
```

### Iterating on prompts
```bash
# After tweaking section-instructions.yml or style-guide.md, retry just the failed pages
bun run scripts/generate-docs/index.ts --onlyFailed
```

### Source code changed, regenerate affected pages
```bash
bun run scripts/generate-docs/index.ts --listStale         # see what drifted
bun run scripts/generate-docs/index.ts --onlyStale         # regenerate just those
```

### Generating a section using a "good" page as a style template
```bash
# Once one page in a section is high-quality, use it as the example for the rest:
bun run scripts/generate-docs/index.ts \
  --example docs/resources/compute/web-service.mdx
# (the rest of resources/compute/* will be generated using web-service.mdx as a structural reference)
```

### Force-regenerate pages that violate style rules
```bash
bun run scripts/generate-docs/index.ts --invalidatePassed --dryRun   # preview
bun run scripts/generate-docs/index.ts --invalidatePassed             # do it
bun run scripts/generate-docs/index.ts --onlyPending                  # regenerate
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
