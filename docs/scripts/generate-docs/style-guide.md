# Stacktape docs style guide and glossary

This file is loaded into every writer, reviewer, and verifier prompt. Treat it as the canonical source for terminology,
voice, and house style.

## Voice and audience

- Primary reader: a developer with solid web/backend skills, light-to-moderate AWS experience, and limited DevOps
  experience. They want to ship something that works on AWS without becoming an AWS expert.
- Secondary reader: an engineering manager evaluating Stacktape for their team. Cares about cost, maintainability, and
  operational fit.
- Tone: pragmatic, confident, opinionated. Decide for the reader when one path is best for most users; surface the
  alternatives below.
- No marketing language. Replace any of these on sight:
  - "blazing fast" → name the latency or throughput.
  - "world-class" → state the actual property (e.g. "runs across multiple AZs").
  - "incredibly easy" / "magic" / "just works" → describe the behavior.
  - "seamlessly" → cut, or replace with the actual mechanism.
  - "leverage" → use "use".
  - "powerful" → cut, or describe the capability.

## Canonical terminology

Use these exact spellings. Avoid the "do not use" forms.

| Use                            | Do not use                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Stacktape                      | StackTape, stacktape (mid-sentence), Stack Tape                                              |
| Stacktape Console              | the dashboard, the UI, the web app                                                           |
| stage                          | environment (acceptable as a one-time clarification, but stage is canonical)                 |
| stack                          | deployment (a stack is a deployed stage of a project)                                        |
| project                        | app, repo, service-group                                                                     |
| resource                       | component, building block                                                                    |
| `defineConfig`                 | StacktapeConfig type, plain config object                                                    |
| AWS region                     | data center, location                                                                        |
| dev mode (for `stacktape dev`) | local dev, watch mode                                                                        |
| Lambda function                | "lambda" lowercase except in code/identifiers                                                |
| container                      | Docker container (only when contrasting with Docker)                                         |
| AWS account                    | cloud account, aws account                                                                   |
| GitOps                         | git ops, git-ops                                                                             |
| CDN                            | cloudfront distribution (use CDN unless the page is specifically about CloudFront internals) |
| TypeScript config              | TS config, .ts config                                                                        |
| YAML config                    | yml config                                                                                   |

## Config example canon

Stacktape config examples MUST be authored as:

```mdx
<CodeBlock
  intellisense
  tabs={[
    {
      label: 'TypeScript',
      lang: 'typescript',
      code: `import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

// [!code focus-start] export default defineConfig(() => { const api = new LambdaFunction({ packaging: new
StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }), memory: 1024, timeout: 30 });

return { resources: { api } }; }); // [!code focus-end]` } ]} />
```

The import must be present in the hidden source so the example type-checks and copy produces a working `stacktape.ts`,
but it should be hidden from the rendered snippet with focus markers. The tab label must be exactly
`label: 'TypeScript'` — never `'stacktape.ts'`, `'TS'`, or any other variant. Do not hand-author a YAML tab.
`CodeBlock` derives the YAML view from the TypeScript source, and the pipeline validates that the generated YAML can
round-trip through the conversion helper.

Forbidden Stacktape config forms (any of these is a mandatory fix):

- A fenced ```yaml block whose body has `resources:` followed by resource keys.
- An `import type { StacktapeConfig } from 'stacktape'` line.
- A `const config: StacktapeConfig = { ... }` declaration.
- A YAML "alternative" tab next to a TypeScript Stacktape config tab.
- A hand-authored YAML tab inside a Stacktape config `<CodeBlock>`.
- A fenced `typescript / `ts block containing `defineConfig` or a Stacktape resource class instantiation. Use
  `<CodeBlock intellisense ...>` instead.
- A visible `import { ... } from 'stacktape'` line in a rendered config example. Keep it in the source, but hide it with
  focus markers.

Application code (Lambda handlers, Express apps, SQL, JSON, Dockerfiles, shell, env files) goes in ordinary fenced code
blocks without `intellisense`.

## Page rhythm

Default rhythm for resource pages:

1. One-paragraph "what it is and why you care" (40–60 words, self-contained).
2. Short pricing context line if pricing is in source.
3. "When to use" / "When not to use" — opinionated and concrete.
4. Basic example — the smallest realistic config.
5. Configuration sections chosen for this resource — only the levers users actually touch (e.g. scaling, networking,
   packaging).
6. How it works — only if there is non-obvious behavior worth knowing. Otherwise omit.
7. API reference — exactly one `<ApiReference definitionName="..." />` somewhere on the page. The component is compact and can sit at the top, in the middle, or at the bottom — pick the position that fits the page's flow. The bottom is the conventional default for tutorial-style pages; the top works well for reference-heavy pages where the reader's primary goal is looking up properties. Nested composite types are reachable through the component's drill-down — do NOT add more `<ApiReference>` blocks for sub-types, and do NOT use `<PropertiesTable>` (that component was removed from the writer surface).
8. Referenceable parameters — `<ReferenceableParams resource="..." />` if the resource exposes any.

Default rhythm for Console pages:

1. What this part of the Console does (anchored to a real route in console-app source).
2. Walkthrough of the most common task.
3. Common tasks (2–4 short subsections).
4. Troubleshooting — only the issues actually surfaced in console-app source or `Explanations.tsx`.
5. Related features.

## SEO/AEO conventions

- First paragraph is 40–75 words and reads as a self-contained answer that an AI engine could quote verbatim. No "this guide will cover…" framing.
- H2 headings stay short and descriptive — 1-5 word noun-form labels (Scaling, Networking, Health checks).
- Question-form H3 headings ARE allowed and welcome inside FAQ sections and common-question subsections ("Can I use a custom domain?", "Does it scale to zero?").
- Every H2 section's first paragraph is itself self-contained — name the concept up front instead of opening with "this", "it", or "the resource".
- Use explicit entity names. Say "a Stacktape web service" or "the WebService resource", not "the service" or "this resource" when the antecedent is more than one sentence away.
- Concrete numbers (defaults, limits, prices) only when sourced. Never invent. "Up to 16 vCPU and 120 GB memory" beats "large resource limits".
- Each paragraph carries one complete idea, 40-75 words. Shorter loses context; longer gets truncated by extractors.
- Prefer tables for comparisons (engine variants, instance sizes, packaging modes, "when to use X vs Y"). Tables get cited 2-4x more than equivalent prose.
- ADD an FAQ section with **8-10 Q&A pairs** on resource, concept, and reference pages, but fewer is acceptable when the page's scope genuinely doesn't yield that many distinct useful questions (a narrow-scope page might have 4-6 great FAQs). Quality over quota — never pad with synthetic or near-duplicate questions to hit a number. Format: `## FAQ` → `### Question` → 2-4 sentence answer paragraph. Skip the FAQ entirely on Getting Started steps.
- FAQ questions MUST mix three categories: (1) Stacktape-specific ("Can I use a custom domain?"), (2) use-case questions about the underlying AWS service ("How much does ECS Fargate cost?", "How do I back up RDS?"), (3) choosing/comparison ("Web service vs Lambda?", "ECS Fargate vs EC2?"). A Stacktape-only FAQ misses the high-intent searches that bring readers in.
- FAQ answers may use well-known AWS facts without strict source grounding — readers come to FAQ looking up general AWS behavior, not just Stacktape specifics. Avoid quoting specific dollar prices (they drift); quote pricing models and rough magnitudes instead.

## Documentation-quality discipline (guide, not config reference)

Write each section as if explaining to a colleague who's deciding whether to use the feature — not as a recipe to be copy-pasted.

- **Union-type coverage.** When a property has multiple variants in the source's union type (packaging modes, compute engines, load balancer kinds, database engines, deployment strategies, trigger sources, etc.), name ALL variants somewhere on the page. Showing one variant under an H2/H3 (e.g. "### Using a custom Dockerfile") without naming the others implies it's the only option. Either enumerate variants briefly before the deep-dive, or link to dedicated docs for the variants you don't cover inline.
- **Per-variant equal depth.** When a section covers multiple variants, each gets roughly equivalent treatment: a working code example, tradeoffs, when-to-use, cost/constraint context. A "Compute resources" section that gives Fargate an example + cost table while EC2 gets two sentences is incomplete.
- **Decision support for opt-in features.** Every sub-section introducing an opt-in (CDN, custom domains, gradual deployments, sidecars, firewall, ARM, EC2 mode, etc.) must cover: when to enable it (concrete scenarios), when the default is fine, the cost/tradeoff, and an opinionated recommendation. Configuration-without-decision-support is a recipe; readers need a guide.
- **Property-value anchors in examples.** When a code example contains a tunable value (`cloudfrontPriceClass: 'PriceClass_100'`, `instanceTypes: ['t3.medium']`, `enableWarmPool: true`), surrounding prose must explain what the property controls and name the alternatives. Otherwise the value reads as magic.
- **Section depth.** The AEO "40-75 word self-contained paragraph" rule applies only to the FIRST paragraph of each section. Subsequent paragraphs must develop the topic to the depth the reader needs to act — examples, tradeoffs, cost context, edge cases. Sections that stop after the answer-first paragraph (or are just one example with no surrounding prose) fail completeness regardless of how "scannable" they look.

## Cross-page consistency rules

- Always link the first mention of a resource type to its dedicated page.
- Always link the first mention of a CLI command to its CLI reference page.
- For logs, the CLI command is `stacktape debug:logs`, linked to `/cli/debug-logs`. Do not write `stacktape logs`.
- For `connectTo` environment variables, use the resource-name-dependent pattern `STP_[RESOURCE_NAME]_[PARAM]`. Concrete examples must match the example resource name: a resource named `mainDatabase` produces `STP_MAIN_DATABASE_CONNECTION_STRING`, not a generic `STP_DATABASE_CONNECTION_STRING`.
- Use the same name for the same concept across pages: never alternate "stage" and "environment" within one page.
- When two pages discuss the same constraint (e.g. Lambda 6 MB payload limit), the wording should be near-identical, not
  paraphrased.
- Keep constraints scoped to the exact property path. Do not turn a top-level constraint into a broader resource claim.
  Example: `web-service.useFirewall` requires `loadBalancing: application-load-balancer`, but
  `web-service.cdn.useFirewall` protects the CloudFront distribution and uses a `web-app-firewall` with `scope: 'cdn'`.

## Pricing wording

When pricing is in the provided source:

- Use "~" or "approximately" to acknowledge regional variation.
- Quote the unit ($/million requests, $/hour, $/GB).
- If the source distinguishes free tier, mention it once.
- Never invent pricing not in the source.

## Forbidden phrasings (auto-flag)

- "powered by" / "built on top of" — name the AWS service directly: "uses ECS Fargate".
- "a powerful X" — cut "powerful".
- "out of the box" — replace with "by default" or remove.
- "best-in-class" — cut.
- "production-ready" without qualifying what makes it production-ready.
- "enterprise-grade" — cut, or describe the property.
