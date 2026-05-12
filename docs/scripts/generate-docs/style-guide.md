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
7. API reference — exactly one `<ApiReference definitionName="..." />` at the bottom. Nested composite types are reachable through the component's drill-down — do NOT add more `<ApiReference>` blocks for sub-types, and do NOT use `<PropertiesTable>` (that component was removed from the writer surface).
8. Referenceable parameters — `<ReferenceableParams resource="..." />` if the resource exposes any.

Default rhythm for choosing pages:

1. One-paragraph framing of the choice.
2. Quick recommendation for the median case.
3. Comparison table.
4. Per-option "when to choose" with one or two sentences each.
5. Cost and operational tradeoffs.
6. Related pages.

Default rhythm for Console pages:

1. What this part of the Console does (anchored to a real route in console-app source).
2. Walkthrough of the most common task.
3. Common tasks (2–4 short subsections).
4. Troubleshooting — only the issues actually surfaced in console-app source or `Explanations.tsx`.
5. Related features.

## SEO/AEO conventions

- First paragraph is 40–60 words and reads as a self-contained answer that an AI engine could quote verbatim.
- H2/H3 headings must be short and scannable. Prefer 1-5 words for H2s and 1-6 words for H3s.
- Use question-form headings only when they stay compact. Prefer "Scaling", "Health checks", "Static outbound IP", "When
  to use it", and "Basic example" over long headings like "How do I configure CPU and memory?".
- Each key paragraph is understandable if extracted alone — don't open with "this" or "it" referring to the previous
  paragraph.
- Concrete numbers (defaults, limits, prices) only when sourced. Never invent.
- No FAQ section unless the SEO reviewer explicitly requests one.

## Cross-page consistency rules

- Always link the first mention of a resource type to its dedicated page.
- Always link the first mention of a CLI command to its CLI reference page.
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
