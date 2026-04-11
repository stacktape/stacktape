import type { ContextPack, PageDefinition, ReviewerResult, VerifierResult } from './types';

const renderSourceDocuments = (contextPack: ContextPack) => {
  return contextPack.sourceDocuments
    .map(({ filePath, content }) => `--- SOURCE FILE: ${filePath} ---\n${content}\n--- END SOURCE FILE ---`)
    .join('\n\n');
};

const commonRules = `
You are writing Stacktape documentation.

Hard requirements:
- Ground every technical statement in the provided source files.
- Trust source code first. Existing docs are hints, not authority.
- Do not invent unsupported features, defaults, or constraints.
- If the source is ambiguous, write cautiously and narrow the wording.
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

SEO and AI discoverability rules:
- The first paragraph (40-60 words) must work as a self-contained answer: define what the topic is and why it matters, without requiring surrounding context. AI engines extract this verbatim.
- Use question-format H2/H3 headings where natural (e.g., "How do I configure scaling?" not "Scaling Configuration"). Match what users actually search for.
- Each key paragraph should be understandable if extracted alone — AI engines cite individual paragraphs.
- Include concrete numbers (costs, limits, defaults) — AI engines strongly prefer citing specific claims.
- Do NOT add an FAQ section — only add one when SEO reviewer feedback explicitly requests it.
`;

export const buildWriterPrompt = ({ contextPack, previousDraft, reviewerResults, verifierResults, seoSuggestions }: {
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
              .map((issue) => `- [${issue.severity}] ${issue.type}: ${issue.statement}\n  Reason: ${issue.reason}\n  Suggested fix: ${issue.suggestedFix}`)
              .join('\n')}`
        )
        .join('\n\n')
    : 'None.';

  return `${commonRules}

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

Available MDX components (use only when genuinely useful):
- \`<Warning>text</Warning>\` — warning callout box with icon
- \`<Info>text</Info>\` — informational callout box with icon
- \`<Error>text</Error>\` — error/critical callout box with icon
- \`<PropertiesTable definitionName="TypeName" />\` — auto-generated API reference table from TypeScript types
- \`<ReferenceableParams resourceType="resource-type" />\` — auto-generated referenceable parameters table
- \`<CliCommandsApiReference command="commandName" />\` — auto-generated CLI command reference
- \`<ProjectStructure>\` — file tree visualization (use sparingly)
- \`<FlowDiagram>\` — sequential step diagram
- \`<DecisionTree>\` — hierarchical decision tree
- \`<Badge color="green">text</Badge>\` — inline badge
- \`<Jargon>term</Jargon>\` — glossary term with tooltip
- Standard markdown code blocks with language hints (yaml, typescript, bash, etc.)

Output requirements:
- Return only the final MDX page body. Do not return commentary, summaries, bullet lists about what you wrote, or meta-explanations.
- Include frontmatter with title and order.
- The first heading should be the page title.
- Use components only when genuinely useful. Standard markdown is preferred for most content.
- For resource pages, include an API Reference section using \`<PropertiesTable definitionName="${contextPack.page.typeName || 'TODO'}" />\`.
- For resource pages, include a Referenceable Parameters section using \`<ReferenceableParams resourceType="${contextPack.page.route.split('/').pop() || 'TODO'}" />\` if applicable.
- For CLI pages, use \`<CliCommandsApiReference command="${contextPack.page.cliCommand || 'TODO'}" />\` for the flags reference.
- For CLI pages, focus on exactly one command.
- For large pages, focus the prose on the most important user paths first. Let API Reference carry more exhaustive detail.
- If you notice a documentation gap in the product or source, handle it cautiously in the page instead of overclaiming.
- If prior verifier issues exist, fix all of them.
- Revise the copy until it would plausibly score at least 8/10 in every reviewer category.

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
`;

export const buildReviewerPrompt = ({ contextPack, draft, persona }: { contextPack: ContextPack; draft: string; persona: string }) => {
  return `${commonRules}

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

Draft page:
${draft}

Source files:
${renderSourceDocuments(contextPack)}

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

Page metadata:
- Route: /${contextPack.page.route}
- Kind: ${contextPack.page.kind}
- Description: ${contextPack.page.shortDescription}

Draft page:
${draft}

Source files:
${renderSourceDocuments(contextPack)}

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

Your job is to evaluate this documentation page for discoverability by both search engines (Google) and AI answer engines (ChatGPT, Perplexity, Claude, Google AI Overviews).

Page metadata:
- Route: /${page.route}
- Title: ${page.title}
- Kind: ${page.kind}

Evaluate the draft on these criteria:

1. **Answer block**: Does the first paragraph (40-60 words) work as a self-contained answer that an LLM could extract verbatim? It should define what the topic is and why it matters without requiring surrounding context.

2. **Heading structure**: Are H2/H3 headings descriptive and search-friendly? Question-format headings ("How do I...?", "When should I...?") are preferred where natural. Headings should match what users actually search for.

3. **Self-contained paragraphs**: Can key paragraphs be extracted and understood without their surrounding context? AI engines extract individual paragraphs — each should carry enough context to be useful alone.

4. **Concrete specifics**: Does the page include specific numbers, defaults, limits, and pricing? AI engines strongly prefer citing content with concrete claims over vague statements.

5. **Meta description suitability**: Could a good 150-character meta description be derived from the opening content?

6. **FAQ potential**: Are there natural questions this page answers that could be surfaced as an FAQ section? (3-5 questions)

Score the page from 1-10 on overall SEO/AEO readiness.

Return specific, actionable suggestions for improvement. Focus on changes that would meaningfully improve discoverability. Do not suggest changes that would hurt readability or make the docs feel like SEO spam.

Return strict JSON only.

Draft page:
${draft}`;
};
