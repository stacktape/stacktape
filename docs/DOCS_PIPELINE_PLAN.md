# Stacktape Docs Pipeline Plan

This file captures the proposed multi-agent pipeline for generating high-quality Stacktape docs using Claude CLI and Codex CLI.

It is intentionally focused on architecture and workflow, not implementation details.

## Goals

The pipeline should produce docs that are:

- accurate
- easy to scan
- easy to trust
- useful for both new users and experienced users
- maintainable over time
- resumable from intermediate state

The pipeline should work primarily from source code and product code, not from stale docs.

## Core Constraints

1. Use existing Claude and Codex subscriptions through CLI when possible.
2. Support a multi-agent workflow with explicit intermediate state.
3. Keep strong factual grounding in source code.
4. Support generated MDX with reusable components and rich examples.
5. Support screenshots from the Console with deterministic, meaningful data.

## High-Level Architecture

The system should be a file-based pipeline with explicit phase outputs.

Suggested project shape:

```txt
docs-generator/
  pipeline/
    phases/
    agents/
    prompts/
    schemas/
    fixtures/
  state/
    extracted/
    page-briefs/
    drafts/
    reviews/
    verified/
    final/
  output/
    pages/
    assets/
```

Key principle:

- every phase writes durable artifacts to disk
- every artifact is inspectable by humans
- every page can be regenerated independently
- later agents consume prior outputs rather than re-reading the whole repo from scratch

## Recommended Agent Topology

The agreed per-page loop is intentionally simple:

1. Orchestrator assembles the page context pack
2. Writer writes the page
3. Reviewers score it from defined personas
4. Verifier runs with Claude
5. Verifier runs with GPT-5.4 / Codex
6. Writer revises
7. Repeat until quality thresholds are met or max iterations are reached

There is no separate extractor agent, page-planner agent, editor-reconciler agent, or final-verifier agent in the first cut.

However, the orchestrator still needs a deterministic page context pack so the writer is grounded in source and the pipeline is resumable.

## Deterministic Context Assembly

This phase should minimize LLM use.

Purpose:

- build a source-of-truth page pack that later agents consume
- reduce hallucination risk
- avoid forcing every agent to rediscover facts from raw code

Artifacts to extract:

- resource definitions and property trees from `types/stacktape-config/*.d.ts`
- defaults, descriptions, constraints, unions, and nested property structure
- top-level config schema from `_root.d.ts`
- directive definitions
- CLI command inventory
- validation rules found in runtime validators
- relevant Console capabilities from `console-app`
- code examples from starter projects, recipes, test projects, and curated docs
- referenceable parameters and `connectTo` env vars

Output per page should be a structured context pack plus source excerpts.

## Writing

Agent: `writer`

Recommended model:

- Claude for page writing

Input:

- page context pack
- target audience
- style guide
- component guide
- prior reviewer/verifier feedback if this is a revision

Output:

- MDX draft
- optional unresolved questions list

Writer responsibilities:

- write the page
- choose where to use components
- explicitly narrow or caveat wording when source support is limited
- fix all verifier-reported factual issues in subsequent iterations

Important rule:

- the writer should not invent examples from thin air when a grounded example can be derived from source or fixtures

## Multi-Persona Review

Reviewers should inspect the draft in parallel.

### Reviewer Personas

1. Startup CTO
   - low to medium AWS experience
   - highest priority: time-to-production and fast shipping
   - should run with both Claude and GPT-5.4 / Codex

2. SMB engineering manager
   - medium to high AWS knowledge
   - highest priority: long-term maintainability and team fit
   - GPT-5.4 / Codex only

3. Developer with little AWS or DevOps experience
   - needs clear explanations and low jargon
   - Claude only

Each reviewer should score only these five categories:

1. clarity
2. scannability
3. completeness
4. practical usefulness
5. audience fit

No overall score should be produced.

Each reviewer should also return:

- strengths
- problems
- mandatory fixes
- optional improvements

## Code-Grounded Verification

Agent: `verifier`

Recommended model split:

- Codex for code-grounded verification
- Claude can be used as a second verifier on critical pages

This phase is intentionally token-intensive.

Requirement:

- for every statement with even a low chance of being false, the verifier should inspect actual code and supporting sources
- the verifier should be encouraged to spend as many tokens as needed on risky claims

Recommended verification process:

1. read the draft
2. identify concrete factual claims on its own
3. classify claims by risk: low / medium / high
4. inspect code for all medium and high risk claims
5. inspect code for low risk claims when they summarize technical behavior, defaults, supported values, pricing guidance, constraints, or Console behavior
6. flag any unsupported, ambiguous, stale, or overstated claim
7. propose corrected wording grounded in source

Verifier output:

- concrete factual issues
- missing evidence
- stale wording
- unsupported claims
- probable omissions
- corrected wording suggestions

Important note:

- claims about Console behavior should be verified against `console-app` source, not only prose or existing docs
- claims about resource behavior should be verified against types plus runtime validators when needed

## Revision Loop

The writer receives reviewer and verifier feedback and revises the page.

Hard rule:

- the writer must fix all factual issues reported by either verifier

Quality gate:

- every reviewer score in every category must reach at least 8/10

If reviewers and verifiers disagree, the writer should narrow the wording and remove overreach rather than guessing.

## Additional Recommended Roles

These were not in the initial user sketch, but they are likely necessary.

### Example Curator

Purpose:

- generate or select the best example for the page
- produce both TypeScript and YAML forms when applicable
- ensure examples are realistic and pedagogically useful

This can be folded into the writer in the first cut.

## Recommended Model Responsibilities

### Claude CLI

Best for:

- writing pages
- planning pages
- reviewer personas
- editorial reconciliation

### Codex CLI

Best for:

- source-grounded verification
- code/example validation
- checking whether statements overreach what the code guarantees

Recommended split:

- Claude writes and reviews
- Codex verifies
- optionally Claude performs a second verification pass on the most important pages

## MDX Component Strategy

The docs pipeline should not assume pure markdown.

We should treat components as first-class building blocks, but keep the component set intentionally small and stable.

### Existing Important Component

`CodeBlockNew.tsx` is already a strong foundation.

Observed useful features:

- tabbed code blocks
- YAML/TypeScript conversion
- hidden sections using markers like `{start-ignore}` / `{stop-ignore}`
- highlighted line support
- Twoslash support with Stacktape type definitions loaded dynamically

This means the docs pipeline can already support:

- keeping noisy imports hidden while preserving valid TypeScript context
- showing TypeScript and YAML variants from one source example
- richer TypeScript examples with type metadata available

### Recommended Additional Components

Keep this set minimal at first.

1. `Stepper`
   - for short procedural sequences in Getting Started and setup flows

2. `FileBrowser`
   - for project structure and recipe pages

3. `Callout` family
   - warning, info, tip, gotcha, pricing note

4. `ChoiceGrid` or `DecisionCard`
   - for "when to use X vs Y" pages

5. `FeatureComparisonTable`
   - for compute/database/frontend choosing pages

6. `ConsoleScreenshot`
   - a wrapper around images with controlled sizing, captioning, and maybe hotspot support later

7. `ExampleTabs`
   - only if `CodeBlockNew` itself should not own all code switching behavior

8. `FileSnippet`
   - optional helper for reading code snippets from source files and hiding setup/import boilerplate automatically

### Guidance on Components

- do not build a huge MDX design system before proving real need
- components should solve repeated comprehension problems, not add novelty
- components used in both docs and website should stay generic and cleanly reusable

## Code Example Pipeline

Code examples should not be an afterthought.

Recommended pipeline:

1. example curator creates canonical example source
2. example is normalized into a shared source format
3. render layer produces TS and YAML views through `CodeBlockNew`
4. hidden setup/import lines remain available for typechecking but not visible in docs
5. example is validated against Stacktape types or schema before publish

### Handling Hidden Imports in `CodeBlockNew`

There are two reasonable approaches.

#### Option A: Keep marker-based hidden sections

Use the existing ignore markers in the code source:

- `{start-ignore}`
- `{stop-ignore}`

Pros:

- already supported
- easy for generator to emit

Cons:

- slightly noisy in raw example source

#### Option B: Introduce explicit hidden prelude support

Add a more intentional API later, for example:

- visible code
- hidden prelude for type context/imports

Pros:

- cleaner source examples
- clearer mental model

Cons:

- requires component work

Recommendation:

- start with the existing marker-based approach
- only add hidden prelude API if the markers become annoying in practice

## Screenshot Pipeline

Screenshots are important enough to deserve their own subsystem.

The key design principle is:

- do not let the LLM take arbitrary screenshots of live or random app state
- make screenshots deterministic, reproducible, and based on fixtures

### Recommended Screenshot Architecture

Build a docs screenshot helper around Playwright plus fixture-driven rendering.

Suggested workflow:

1. define a screenshot spec
2. open the Console on a target route
3. load deterministic fixture data for that route
4. render the page in a known viewport
5. optionally crop to a target region
6. save image plus metadata used to generate it

### Screenshot Spec Shape

Example:

```json
{
  "id": "alarms-rules-overview",
  "route": "/alarms?docsFixture=alarmsRulesBasic",
  "viewport": { "width": 1440, "height": 1024 },
  "theme": "light",
  "target": "main-content",
  "crop": "smart",
  "caption": "Alarm rules for Lambda, database, and API resources"
}
```

### Fixture Strategy

This is critical.

Instead of trying to mutate React Query ad hoc from the outside, add a docs/demo fixture mechanism inside `console-app`.

Recommended approaches:

1. query-param based fixture mode, for example `?docsFixture=...`
2. mocked tRPC layer returning fixture payloads
3. page-level fixture registry mapping route -> response set

Avoid relying on brittle browser-side mutation of React Query caches unless it is only a temporary prototype.

The fixture mode should let the screenshot system show:

- meaningful project names
- realistic alerts, costs, and logs
- instructive states, not empty states
- stable timestamps and metrics

### Aspect Ratio Guidance

Start with a small set of standard formats.

Recommended defaults:

1. Desktop primary: `1440x1024`
2. Desktop compact: `1280x900`
3. Mobile only when the page genuinely needs mobile docs: iPhone-class preset

Most Console screenshots should likely use desktop-first captures.

### Cropping Guidance

The LLM should not freely crop screenshots in arbitrary ways without rules.

Preferred approach:

- screenshot helper supports named crop modes:
  - full-page
  - main-content
  - panel
  - element-selector
  - smart-crop with constraints

If smart crop is allowed, it should still save the original full image and crop metadata.

### Screenshot Review

Add a simple screenshot reviewer step:

- is the screen legible?
- is the state meaningful?
- are there distracting empty regions?
- does the crop preserve orientation?

## What Else Needs Designing

These topics were not fully specified yet and should be designed next.

1. Audience model
   - who exactly are the target readers?
   - beginners vs experienced AWS users vs teams evaluating Stacktape

2. Style guide
   - tone
   - page templates
   - scannability rules
   - acceptable length ranges by page type

3. Source priority rules
   - if code, old docs, and UI text disagree, which wins?
   - likely: code > runtime validation > curated docs > old docs

4. Example sourcing rules
   - when to derive examples from source
   - when to invent pedagogical examples

5. Regeneration strategy
   - full rebuild vs page-by-page vs only changed pages

6. Human review checkpoints
   - which pages must be manually approved before publish

## Recommended Near-Term Implementation Order

1. Define audience + style guide
2. Define page backbones by page type
3. Define deterministic context-pack assembly
4. Implement the writer-reviewer-verifier loop with resume support
5. Implement one-page-per-command CLI generation inside the same pipeline
6. Design the minimal MDX component set
7. Design fixture-driven screenshot mode in `console-app`
8. Scale quality and source coverage after the loop works end-to-end
