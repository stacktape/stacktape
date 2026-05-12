import type { ContextPack, PageDefinition, ReviewerResult, VerifierResult } from './types';

const renderSourceDocuments = (contextPack: ContextPack) => {
  return contextPack.sourceDocuments
    .map(({ filePath, content }) => `--- SOURCE FILE: ${filePath} ---\n${content}\n--- END SOURCE FILE ---`)
    .join('\n\n');
};

const renderMissingSourceFiles = (contextPack: ContextPack) => {
  if (contextPack.missingSourceFiles.length === 0) {
    return 'None.';
  }
  return contextPack.missingSourceFiles.map((filePath) => `- ${filePath}`).join('\n');
};

const renderCliReferenceSnippet = (contextPack: ContextPack) => {
  if (!contextPack.cliCommandReference) {
    return 'n/a';
  }
  return `<CliCommandsApiReference command="${contextPack.cliCommandReference.command}" sortedArgs={${JSON.stringify(
    contextPack.cliCommandReference.sortedArgs,
    null,
    2
  )}} />`;
};

const renderSectionInstructions = (contextPack: ContextPack) => {
  if (contextPack.sectionInstructions.length === 0) {
    return 'None.';
  }
  return contextPack.sectionInstructions
    .map((rule) => {
      return `Section "${rule.section}":\n${rule.instructions.map((instruction) => `- ${instruction}`).join('\n')}`;
    })
    .join('\n\n');
};

const renderExampleGuidance = (contextPack: ContextPack) => {
  if (!contextPack.exampleDocument) {
    return 'None.';
  }
  return `Example-guided section generation mode is active.

The example below is a human-reviewed page from the same section workflow:
1. The pipeline generated one page for a section.
2. A human reviewed that page with another LLM session.
3. That session implemented improvements until the page became a strong section example.
4. This run should generate the remaining pages in that section using the reviewed page as the example.

Use the example for:
- section-level structure and information architecture
- heading style and section depth
- tone, density, scannability, and practical decision framing
- MDX component usage patterns
- Stacktape config example style, including CodeBlock usage and focused lines

Do not use the example as factual source material for this page. Do not copy page-specific claims, resource names, CLI flags, defaults, limits, code examples, routes, screenshots, or recommendations unless they are independently supported by the target page source files. The target page source files remain the factual authority.

--- EXAMPLE PAGE: ${contextPack.exampleDocument.filePath} ---
${contextPack.exampleDocument.content}
--- END EXAMPLE PAGE ---`;
};

const commonRules = `
You are writing Stacktape documentation.

Hard requirements:
- Ground every technical statement in the provided source files.
- Trust source code first. Existing docs are hints, not authority.
- Do not invent unsupported features, defaults, or constraints.
- If the source is ambiguous, write cautiously and narrow the wording.
- Do not flatten nested-property constraints into broad resource constraints. For example, top-level \`useFirewall\`
  on a \`web-service\` is \`application-load-balancer\` only, but \`cdn.useFirewall\` is a separate CDN/CloudFront
  attachment path with different requirements.
- Prefer precise, concrete wording over generic wording.
- Use the backbone structure as guidance, not as a rigid limit.
- You may add any additional sections that improve the page.
- If a backbone section would be genuinely low-value for this page, you may omit it.
- Write for the intended reader, not for internal maintainers.
- Keep the docs modern, scannable, practical, pragmatic, and confident.
- Be strongly goal-oriented. Explain what the reader is trying to achieve, not just what a feature does.
- Include tradeoffs and when not to use something, not only when to use it.
- Be clearly opinionated when one path is better for most users.
- Explain AWS services through the Stacktape abstraction. Mention AWS underpinnings when useful for understanding, cost, limits, or tradeoffs.
- Briefly explain important basic terms, then move on.
- Some repetition is good when it helps the reader on the current page.
- Prioritize high-signal coverage of the important 80 percent before deeper edge cases.
- Examples should usually be realistic and copyable. Prefer synthesized examples that still look like something a real team would use.
- Use light comparisons to alternatives only when they improve decision-making.
- For niche or advanced features, explicitly say who should use them and who should skip them.
- Do not mention the generation pipeline or the fact that this page was AI-generated.

ABSOLUTE FORBIDDEN PATTERNS (any of these makes the page fail review):

1. **Hand-authored YAML Stacktape configuration.** Stacktape configuration examples must NEVER be authored as a fenced \`\`\`yaml block or as a manual YAML tab. The product still parses YAML, but docs examples use TypeScript as the source of truth and CodeBlock generates the YAML tab automatically.
   - WRONG: A fenced \`\`\`yaml block whose content begins with \`resources:\` followed by resource keys.
   - WRONG: Including a YAML "alternative" tab next to TypeScript "for completeness".
   - WRONG: Showing YAML inside a hand-authored \`<CodeBlock>\` tab.
   - RIGHT: Every Stacktape config example is TypeScript using \`defineConfig\` and class-based resources, rendered via \`<CodeBlock intellisense tabs={[...]} />\`. The renderer derives the YAML tab from that TypeScript source.

2. **Plain-object \`StacktapeConfig\` typed style.** This API still exists but it is not the documented surface.
   - WRONG: \`import type { StacktapeConfig } from 'stacktape'; const config: StacktapeConfig = { resources: { ... } };\`
   - WRONG: \`const config: StacktapeConfig = ...\` anywhere on the page.
   - RIGHT: \`import { defineConfig, LambdaFunction, ... } from 'stacktape'; export default defineConfig(() => { const fn = new LambdaFunction({...}); return { resources: { fn } }; });\`

3. **Stacktape config in a fenced \`\`\`typescript or \`\`\`ts block.** Always use the \`<CodeBlock intellisense tabs={[...]} />\` component for Stacktape config so Twoslash and copy work. Fenced TypeScript blocks are reserved for application code (handlers, Express apps, scripts).

4. **Marketing-tone or hand-wavy claims** like "incredibly fast", "world-class", "super easy". Replace with concrete behavior or remove.

5. **Empty backbone sections.** If you cannot fill a backbone section with grounded, useful content, omit the section instead of writing filler.

If your draft contains any of (1)–(3) above, regenerate the page rather than submit.

CodeBlock usage rules:
- Stacktape configuration examples MUST use \`<CodeBlock intellisense tabs={[...]} />\` with a visible \`TypeScript\` tab. The tab label must be exactly \`label: 'TypeScript'\` — not \`'stacktape.ts'\`, not \`'TS'\`, not \`'Config'\`. Do not add a YAML tab manually; CodeBlock derives it automatically.
- Application code (Lambda handlers, Express apps, Hono apps, SQL, JSON, Dockerfiles, shell, env files) MUST use ordinary fenced code blocks, with no \`intellisense\` flag and no \`<CodeBlock>\` wrapper.
- Never put hand-authored YAML in a \`<CodeBlock>\` for Stacktape config. If a non-Stacktape YAML file is genuinely needed (e.g. \`docker-compose.yml\` for a recipe), use a fenced \`\`\`yaml block.

Pricing rules:
- When concrete pricing is present in the provided source files (e.g. \`prices.json\`, \`@generated/aws-price/*\`, JSDoc comments), include a one-line pricing context near the top of resource pages.
- Never invent or estimate AWS list prices that are not present in the provided source.
- Phrase pricing as ranges or "~" approximations to acknowledge regional variation.

Source priority when sources disagree:
1. TypeScript types in \`types/stacktape-config/*.d.ts\` and runtime validators in \`src/domain/**\` — authoritative for behavior, defaults, and constraints.
2. \`@generated/schemas/config-schema.json\` — authoritative for schema shape.
3. \`@generated/ai-docs/*.md\` — pre-distilled summaries; useful for framing and cross-checks but secondary to types.
4. \`docs/_curated-docs/**\` — human-written prose; accept structure and tone, re-verify facts.
5. CLI source in \`src/commands/**/index.ts\` — authoritative for CLI behavior.
6. \`console-app/src/**\` and \`console-app/server/**\` — authoritative for Console behavior.
7. Anything labelled "old docs" — treat as hint only, never quote.

If a low-priority source contradicts a high-priority one, follow the higher-priority source and write cautiously.

How to handle missing or thin source:
- If the source is silent on a question the reader will ask, say so explicitly ("not currently supported", "not documented at this layer") rather than guessing.
- If a backbone section has no grounded material, omit it.
- If a numeric default is unclear, omit the number rather than guess.

SEO and AI discoverability rules:
- The first paragraph (40-60 words) must work as a self-contained answer: define what the topic is and why it matters, without requiring surrounding context. AI engines extract this verbatim.
- Keep H2/H3 headings short and scannable. Prefer 1-5 words for H2s and 1-6 words for H3s.
- Use question-format headings only when they stay compact. Prefer "Scaling", "Health checks", "Static outbound IP",
  "When to use it", and "Basic example" over long headings like "How do I configure CPU and memory?".
- Each key paragraph should be understandable if extracted alone — AI engines cite individual paragraphs.
- Include concrete numbers (costs, limits, defaults) when they are present in the provided source. Do not invent numbers for SEO.
- Do NOT add an FAQ section — only add one when SEO reviewer feedback explicitly requests it.
`;

export const buildWriterPrompt = ({
  contextPack,
  previousDraft,
  reviewerResults,
  verifierResults,
  seoSuggestions
}: {
  contextPack: ContextPack;
  previousDraft?: string;
  reviewerResults?: ReviewerResult[];
  verifierResults?: VerifierResult[];
  seoSuggestions?: string[];
}) => {
  const reviewFeedback = reviewerResults?.length
    ? reviewerResults
        .map(
          (result) =>
            `Reviewer ${result.reviewerId} (${result.persona})\nScores: ${JSON.stringify(result.scores)}\nMandatory fixes:\n- ${result.mandatoryFixes.join('\n- ')}\nProblems:\n- ${result.problems.join('\n- ')}`
        )
        .join('\n\n')
    : 'None.';

  const verifierFeedback = verifierResults?.length
    ? verifierResults
        .map(
          (result) =>
            `Verifier ${result.verifierId}\nSummary: ${result.summary}\nIssues:\n${result.issues
              .map(
                (issue) =>
                  `- [${issue.severity}] ${issue.type}: ${issue.statement}\n  Reason: ${issue.reason}\n  Suggested fix: ${issue.suggestedFix}`
              )
              .join('\n')}`
        )
        .join('\n\n')
    : 'None.';

  return `${commonRules}

${contextPack.styleGuide ? `Project style guide and glossary (apply throughout):\n${contextPack.styleGuide}\n` : ''}

Task: write or revise the MDX page at route "/${contextPack.page.route}".

Page metadata:
- Title: ${contextPack.page.title}
- Kind: ${contextPack.page.kind}
- Template: ${contextPack.page.template}
- Description: ${contextPack.page.shortDescription}
- Type name (if any): ${contextPack.page.typeName || 'n/a'}
- CLI command (if any): ${contextPack.page.cliCommand || 'n/a'}

Backbone sections:
${contextPack.backboneSections.map((section) => `- ${section}`).join('\n') || '- No fixed backbone'}

Page-specific notes:
${(contextPack.page.notes || []).map((note) => `- ${note}`).join('\n') || '- None'}

Human-maintained section instructions:
${renderSectionInstructions(contextPack)}

Example page guidance:
${renderExampleGuidance(contextPack)}

Reviewer feedback from prior iteration:
${reviewFeedback}

Verifier feedback from prior iteration:
${verifierFeedback}

SEO/AEO suggestions from prior iteration:
${seoSuggestions?.length ? seoSuggestions.map((s) => `- ${s}`).join('\n') : 'None.'}

Current draft to revise:
${previousDraft || 'No existing draft. Write from scratch.'}

Docs structure plan:
${contextPack.structurePlan}

Pipeline plan:
${contextPack.pipelinePlan}

Source files:
${renderSourceDocuments(contextPack)}

Configured source files that could not be read:
${renderMissingSourceFiles(contextPack)}

Exact CLI reference component for this page, if applicable:
${renderCliReferenceSnippet(contextPack)}

Available MDX components (use only when genuinely useful):

Callouts:
- \`<Warning>text</Warning>\` — warning callout box (orange) — use for things that could break or cause problems
- \`<Info>text</Info>\` — informational callout box (blue) — use for supplementary context or notes
- \`<Tip>text</Tip>\` — tip callout box (green/teal) — use for best practices, pro tips, or recommendations
- \`<Error>text</Error>\` — error/critical callout box (red) — use for critical warnings or common mistakes

Auto-generated reference components:
- \`<ApiReference definitionName="TypeName" />\` — deterministic API reference rendered from generated schema data. Resource pages MUST end with exactly one of these and no other API-table component. \`<PropertiesTable>\` is no longer a public docs component; do not use it.
- \`<ReferenceableParams resource="resource-type" />\` — auto-generated referenceable parameters table
- \`<CliCommandsApiReference command="commandName" sortedArgs={[...]} />\` — auto-generated CLI command reference. For CLI pages, copy the exact snippet supplied above.

Comparison and decision components:
- \`<FeatureComparisonTable columns={["Option A", "Option B"]} features={[{ name: "Feature", values: { "Option A": true, "Option B": "Partial" } }]} />\` — feature matrix with checkmarks. Use on "choosing" pages to compare resources side by side.
- \`<DecisionTree nodes={[{ question: "What do you need?", children: [{ answer: "A public API", result: "Use a web service" }] }]} />\` — hierarchical decision tree for guided choices

Tabs (for non-code content switching):
- \`<Tabs><Tab label="Option A">content</Tab><Tab label="Option B">content</Tab></Tabs>\` — tabbed content. Use for platform-specific instructions, alternative approaches, or framework-specific guides. Do NOT use for code examples (use standard fenced code blocks instead).

Structure and diagrams:
- \`<FlowDiagram steps={[{ title: "Step 1", description: "Do this" }]} />\` — sequential step diagram. Use for deploy flows, setup procedures.
- \`<ProjectStructure files={[{ name: "src", type: "folder", children: [{ name: "index.ts" }] }]} />\` — file tree visualization. Use on recipe pages to show project structure.
- \`<ConsoleScreenshot src="/static/screenshots/example.png" alt="Description" caption="Optional caption" />\` — styled screenshot with border and caption. Use for Console UI screenshots.

Other:
- \`<Badge backgroundColor="#00828b">text</Badge>\` — inline badge/pill
- \`<Jargon>term</Jargon>\` — glossary term with hover tooltip (only for terms defined in jargon.yml)
- Code examples are rendered by the new CodeBlockNew renderer. Use ordinary fenced code blocks only for non-Stacktape-config code examples such as application code, shell commands, SQL, JSON, Dockerfiles, and small supporting snippets. These blocks render with syntax highlighting and copy support, but no Stacktape intellisense.
- For every Stacktape configuration example, use the explicit \`<CodeBlock intellisense tabs={[...]} />\` component, not a fenced code block.
- Do not use YAML for Stacktape configuration examples. Every Stacktape config example must be a correct TypeScript \`stacktape.ts\` using \`defineConfig\` and class-based resources from \`stacktape\`.
- Only Stacktape config examples should set \`intellisense\`. Do not set \`intellisense\` for Lambda handlers, Express apps, shell commands, SQL, JSON, Dockerfiles, or other ordinary code.
- Every Stacktape config example must be a complete, type-checking \`stacktape.ts\` source. Include every required \`stacktape\` import in the code string, but hide import boilerplate from the rendered snippet with focus markers.
- The TypeScript source must use the supported \`defineConfig(() => { const resource = new ResourceClass({...}); return { resources: { resource } }; })\` shape so the YAML tab can be generated and round-tripped by the conversion helper.

Code block focus / highlight notations (Shiki-compatible, inside comments):

Use these when a snippet discusses only a sub-tree of a larger Stacktape config and the surrounding context would distract the reader. The code you write MUST still be a valid, complete, runnable TypeScript config — the markers only control what's visible at render time. Non-focused lines collapse to a single \`...\` line.

Markers (all live inside \`#\` or \`//\` comments):
- Block: \`# [!code focus-start]\` ... \`# [!code focus-end]\` (YAML/bash), \`// [!code focus-start]\` ... \`// [!code focus-end]\` (TS/JS)
- Trailing inline: \`some: value  # [!code focus]\` — focuses just that line; \`# [!code focus:3]\` focuses the line + next 2
- Highlight has identical forms: \`[!code highlight]\`, \`[!code highlight:N]\`, \`[!code highlight-start]\` / \`[!code highlight-end]\`

When to use focus:
- The page is about one specific property (e.g. \`cdn\`, \`scaling\`, \`packaging\`) and the reader already knows what the surrounding resource shape looks like.
- You want the reader's eye to land on one or two lines immediately.

When NOT to use focus:
- Very small snippets (under ~8 lines) — the focus adds noise, not signal.

Even when showing a basic/full example, keep required imports in the hidden full source and start the focused region after the import line. The rendered example should not show \`import { ... } from 'stacktape'\`, but the copied/full source must still include it.

Required Stacktape config example shape:

<CodeBlock
  intellisense
  tabs={[
    {
      label: 'TypeScript',
      lang: 'typescript',
      code: ${'`'}import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

// [!code focus-start]
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    memory: 1024,
    timeout: 30
  });

  return {
    resources: { api }
  };
});
// [!code focus-end]${'`'}
    }
  ]}
/>

This renders only the focused lines plus \`...\` placeholders, but the source remains a valid complete \`stacktape.ts\`.

Output requirements:
- Return only the final MDX page body. Do not return commentary, summaries, bullet lists about what you wrote, or meta-explanations.
- Include frontmatter with title and order.
- The first heading should be the page title.
- Use components only when genuinely useful. Standard markdown is preferred for most prose and non-config code, but Stacktape configuration examples must use \`<CodeBlock intellisense ... />\`.
- For resource pages, include an API Reference section using \`<ApiReference definitionName="${contextPack.page.typeName || 'TODO'}" />\`.
- For resource pages, include a Referenceable Parameters section using ${
    contextPack.page.referenceableResourceType
      ? `\`<ReferenceableParams resource="${contextPack.page.referenceableResourceType}" />\`.`
      : 'the ReferenceableParams component only if the source proves this page has referenceable parameters.'
  }
- For CLI pages, use the exact \`<CliCommandsApiReference ... />\` snippet supplied above for the flags reference.
- For CLI pages, focus on exactly one command.
- For large pages, focus the prose on the most important user paths first. Let API Reference carry more exhaustive detail.
- If you notice a documentation gap in the product or source, handle it cautiously in the page instead of overclaiming.
- If prior verifier issues exist, fix all of them.
- Revise the copy until it would plausibly score at least 8/10 in every reviewer category AND at least 7/10 from the SEO reviewer.

Self-check before submitting:
- Search your draft for the literal substrings "\`\`\`yaml", "StacktapeConfig", and "\`\`\`typescript". For any hit, confirm it does NOT contain a Stacktape \`resources:\` map or \`defineConfig\` call. If it does, rewrite that block as a TypeScript-only \`<CodeBlock intellisense tabs={[...]} />\`; the YAML tab is generated automatically.
- Search for marketing words ("blazing", "world-class", "incredibly", "magic", "just works", "seamlessly"). Replace each with a concrete behavior or remove.
- Confirm every \`<ApiReference definitionName="X" />\` and \`<ReferenceableParams resource="X" />\` has X grounded in the provided source files.
- Confirm the first paragraph is 40-60 words and reads as a self-contained answer.

Additional output fields:
- seoTitle: A search-engine-optimized page title (under 60 characters). Include the primary keyword naturally. Example: "Deploy Lambda Functions with Stacktape | Stacktape Docs"
- seoDescription: A meta description for search engines (150-160 characters). Action-oriented, unique, includes the primary benefit. Example: "Learn how to deploy serverless Lambda functions on AWS with Stacktape. Zero-config packaging, auto-scaling, and pay-per-use pricing."

Output shape reminder for the MDX field:

---
title: '${contextPack.page.title.replaceAll("'", "''")}'
order: ${contextPack.page.order}
---

# ${contextPack.page.title}

...

The mdx field must contain only the raw MDX page content. Do not include commentary, summaries, or meta-explanations in it.`;
};

const sharedReviewerRequirements = `
Return strict JSON only.
Score each category from 1 to 10.
Do not give an overall score.
Be harsh but fair.
Mandatory fixes should be actionable and specific.
Judge the page based on what this audience actually needs from docs.

Mandatory style violations — if ANY of these appear, you MUST add a mandatoryFix entry AND lower the affected category by at least 2 points:

- A fenced \`\`\`yaml block that contains a Stacktape \`resources:\` map (Stacktape config in YAML is forbidden).
  → Penalize \`practicalUsefulness\` and \`audienceFit\` by at least 2 each. Mandatory fix: "Replace YAML Stacktape config with TypeScript class-based config inside <CodeBlock intellisense tabs={[...]}/>."

- An import of \`StacktapeConfig\` type, or a \`const config: StacktapeConfig = { ... }\` pattern.
  → Penalize \`practicalUsefulness\` by at least 2. Mandatory fix: "Replace plain-object StacktapeConfig style with defineConfig + class-based resources."

- A fenced \`\`\`typescript / \`\`\`ts block that contains \`defineConfig\` or a Stacktape resource class (\`new LambdaFunction\`, \`new WebService\`, etc.).
  → Penalize \`scannability\` by at least 1. Mandatory fix: "Wrap Stacktape config example in <CodeBlock intellisense tabs={[...]}/> instead of a fenced TypeScript block."

- A YAML "alternative tab" appearing next to a TypeScript Stacktape config tab (both forms of the same config side by side).
  → Penalize \`scannability\` by at least 1. Mandatory fix: "Drop the YAML tab. Show only the TypeScript class-based form."

- Marketing tone words ("blazing fast", "world-class", "incredibly easy", "magic", "just works").
  → Penalize \`clarity\` by at least 1.

- A backbone section padded with restated content (e.g. a "How it works" section that only repeats earlier points).
  → Penalize \`completeness\` by at least 1. Mandatory fix: "Trim or remove the redundant section; do not pad backbones."

- An MDX component used with unknown or wrong props (e.g. \`<PropertiesTable defName=...>\` instead of \`definitionName\`, \`<CodeBlock>\` without \`intellisense\` for Stacktape config).
  → Penalize \`clarity\` by at least 1. Mandatory fix: name the component and the wrong prop.

- A \`<PropertiesTable>\` anywhere on the page (the component was removed from the writer surface), or an \`<ApiReference>\` whose \`definitionName\` does not match any generated config-schema definition.
  → Penalize \`completeness\` by at least 2. Mandatory fix: "Replace <PropertiesTable> with a single <ApiReference definitionName=\\"...\\" /> at the bottom of the page, or use the correct definitionName from the source types."

- A page with more than one \`<ApiReference>\` (resource pages should have exactly one — the page's root type).
  → Penalize \`scannability\` by at least 1. Mandatory fix: "Keep one <ApiReference> at the bottom; rely on its built-in drill-down for nested types."

- An empty backbone section header followed only by placeholder text or a single sentence that only restates the heading.
  → Penalize \`completeness\` by at least 1. Mandatory fix: "Either fill the section with grounded content or omit it."

- Overly long H2/H3 headings that read like full sentences when a short label would work.
  → Penalize \`scannability\` by at least 1. Mandatory fix: "Shorten section headings to compact labels; keep most H2s to 1-5 words."

When a mandatory style violation is present, also list it explicitly under \`problems\` (not just \`mandatoryFixes\`), so the writer cannot miss it.
`;

export const buildReviewerPrompt = ({
  contextPack,
  draft,
  persona
}: {
  contextPack: ContextPack;
  draft: string;
  persona: string;
}) => {
  return `${commonRules}

${contextPack.styleGuide ? `Project style guide and glossary (use to detect style/terminology drift):\n${contextPack.styleGuide}\n` : ''}

You are reviewing a Stacktape docs page from this persona:
${persona}

${sharedReviewerRequirements}

Review stance:
- Reward clarity, strong structure, useful examples, explicit tradeoffs, and practical guidance.
- Penalize vagueness, generic marketing language, weak recommendations, and missing caveats.
- Penalize pages that sound source-grounded but do not help the reader act.
- Penalize pages that bury the important information.

Review categories with scoring guidance:

- **clarity** (1-10): Is the writing clear, precise, and unambiguous? Can the reader understand what to do after reading each section?

- **scannability** (1-10): Can a busy developer find what they need in under 30 seconds? Are headings descriptive? Are tables/lists used effectively?

- **completeness** (1-10): Does the page cover what this audience actually needs to get their job done?
  IMPORTANT: Completeness does NOT mean "covers every option exhaustively." A page scores 8+ on completeness when it covers the important 80% thoroughly — the most common use cases, the key configuration areas, the essential tradeoffs, and the "When to Use" decision. It does NOT need to document every edge case, every optional property, or every configuration variant. That level of detail belongs in the API Reference section, not in prose. Penalize pages that are missing the core happy path or critical gotchas. Do NOT penalize pages for omitting obscure options that most users will never touch.

- **practicalUsefulness** (1-10): After reading, can the reader actually build something? Are examples realistic and copyable? Are tradeoffs explained?

- **audienceFit** (1-10): Is the page pitched at the right level for this audience?
  IMPORTANT: Stacktape documentation inherently uses some AWS terminology because it deploys to AWS. Using terms like "VPC", "IAM", "CloudFormation" is expected and correct — do NOT penalize the page for using AWS terms when they are necessary. Penalize only when AWS jargon is used without sufficient context for the audience to understand what it means in the Stacktape context.

Page metadata:
- Route: /${contextPack.page.route}
- Kind: ${contextPack.page.kind}
- Description: ${contextPack.page.shortDescription}

Human-maintained section instructions:
${renderSectionInstructions(contextPack)}

Example page guidance:
${renderExampleGuidance(contextPack)}

Draft page:
${draft}

Source files:
${renderSourceDocuments(contextPack)}

Configured source files that could not be read:
${renderMissingSourceFiles(contextPack)}

Return JSON with this shape:
{
  "scores": {
    "clarity": 0,
    "scannability": 0,
    "completeness": 0,
    "practicalUsefulness": 0,
    "audienceFit": 0
  },
  "strengths": ["..."],
  "problems": ["..."],
  "mandatoryFixes": ["..."],
  "optionalImprovements": ["..."]
}`;
};

export const buildVerifierPrompt = ({ contextPack, draft }: { contextPack: ContextPack; draft: string }) => {
  return `${commonRules}

${contextPack.styleGuide ? `Project style guide and glossary (terminology canon):\n${contextPack.styleGuide}\n` : ''}

You are a factual verifier. You must inspect the draft carefully and verify every statement that has even a low chance of being false.

Verifier requirements:
- Use as many tokens as needed.
- Be exhaustive, especially around defaults, constraints, supported values, behavior, pricing guidance, and Console capabilities.
- Prefer "unclear from source" over guessing.
- Flag anything unsupported, stale, ambiguous, or overstated.
- Check claims against the actual source files provided below.
- Source code wins over old docs text.
- If the draft makes a strong recommendation, verify that the recommendation does not rely on unsupported factual claims.
- For Console pages, verify behavior against console-app source rather than prose alone.
- Only flag issues where you have concrete evidence from the source files that the statement is wrong or unsupported. Do not flag speculative concerns.
- Return strict JSON only.

Evidence requirements (HARD RULE):
- Every issue with severity "high" or "medium" MUST include at least one entry in \`evidence\` with the actual \`file\` path from the source list and a verbatim \`quote\` from that file. The quote must be present in the source file and must contradict or fail to support the draft's claim.
- If you cannot produce evidence for a claim you suspect is wrong, downgrade the issue to severity "low" and mark type "ambiguous-claim".
- Do not invent file paths or quotes. If you cannot find the file in the provided sources, do not raise the issue.

Issue scope (also flag these as factual issues):
- Numbers without source backing (defaults, limits, prices, latencies, throughput).
- Implied AWS service capabilities not present in source.
- Console UI claims (buttons, flows, page locations) not visible in console-app source.
- CLI flag names, defaults, or aliases that do not match \`src/config/cli/commands.ts\` and the command's \`src/commands/<name>/index.ts\`.
- Resource property names that do not appear in the relevant \`types/stacktape-config/*.d.ts\` file.

MDX/component sanity checks (raise as severity "medium" with type "incorrect-claim"):
- \`<PropertiesTable>\` on a newly generated resource page.
- \`<ApiReference definitionName="X" />\` where X is not a definition in the generated config schema.
- \`<ReferenceableParams resource="X" />\` where X is not a valid resource type.
- \`<CliCommandsApiReference command="X" ... />\` whose command does not match the page.
- \`<CodeBlock>\` without \`intellisense\` containing a Stacktape config example.
- A fenced \`\`\`yaml block containing a Stacktape \`resources:\` map.
- A fenced \`\`\`typescript or \`\`\`ts block containing \`defineConfig\` or a Stacktape resource class instantiation.
- An MDX component whose tag does not appear in the "Available MDX components" list, or with prop names that don't match.

Page metadata:
- Route: /${contextPack.page.route}
- Kind: ${contextPack.page.kind}
- Description: ${contextPack.page.shortDescription}

Human-maintained section instructions:
${renderSectionInstructions(contextPack)}

Example page guidance:
${contextPack.exampleDocument ? 'Example mode is active. The example page is a style and structure reference only; do not treat it as factual evidence.' : 'None.'}

Draft page:
${draft}

Source files:
${renderSourceDocuments(contextPack)}

Configured source files that could not be read:
${renderMissingSourceFiles(contextPack)}

Return JSON with this shape:
{
  "summary": "...",
  "issues": [
    {
      "severity": "high|medium|low",
      "type": "unsupported-claim|incorrect-claim|ambiguous-claim|missing-caveat|stale-claim",
      "statement": "...",
      "reason": "...",
      "suggestedFix": "...",
      "evidence": [
        {
          "file": "...",
          "quote": "..."
        }
      ]
    }
  ],
  "positiveFindings": ["..."]
}`;
};

export const buildSeoReviewerPrompt = ({ draft, page }: { draft: string; page: PageDefinition }) => {
  return `You are an SEO and AEO (Answer Engine Optimization) reviewer for developer documentation.

Score range guidance (be calibrated, not generous):
- 9-10: opening paragraph reads like a perfect Featured Snippet; headings are concise, descriptive, and search-aligned; concrete numbers throughout; meta description writes itself.
- 7-8: solid answer block; headings are mostly compact and useful; some concrete numbers; meta description derivable but not effortless.
- 5-6: opening paragraph requires surrounding context to be useful; headings are vague or too long; few concrete numbers.
- 3-4: vague opening; headings are unhelpful; abstract claims without numbers.
- 1-2: opening could apply to any page; headings are unhelpful; the page is unindexable.


Your job is to evaluate this documentation page for discoverability by both search engines (Google) and AI answer engines (ChatGPT, Perplexity, Claude, Google AI Overviews).

Page metadata:
- Route: /${page.route}
- Title: ${page.title}
- Kind: ${page.kind}

Evaluate the draft on these criteria:

1. **Answer block**: Does the first paragraph (40-60 words) work as a self-contained answer that an LLM could extract verbatim? It should define what the topic is and why it matters without requiring surrounding context.

2. **Heading structure**: Are H2/H3 headings concise, descriptive, and search-friendly? Short labels are preferred. Question-format headings are useful only when they stay compact.

3. **Self-contained paragraphs**: Can key paragraphs be extracted and understood without their surrounding context? AI engines extract individual paragraphs — each should carry enough context to be useful alone.

4. **Concrete specifics**: Does the page include source-backed numbers, defaults, limits, and pricing when the source provides them? AI engines prefer concrete claims, but unsupported numbers are worse than vague wording.

5. **Meta description suitability**: Could a good 150-character meta description be derived from the opening content?

6. **FAQ potential**: Are there natural questions this page answers that could be surfaced as an FAQ section? (3-5 questions)

Score the page from 1-10 on overall SEO/AEO readiness.

Return specific, actionable suggestions for improvement. Focus on changes that would meaningfully improve discoverability. Do not suggest changes that would hurt readability or make the docs feel like SEO spam.

Return strict JSON only.

Draft page:
${draft}`;
};
