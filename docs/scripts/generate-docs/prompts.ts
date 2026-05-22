import type { ContextPack, HumanFeedbackEntry, ReviewerResult, VerifierResult } from './types';
import { AGENT_IDS } from './agent-models';

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

The goal is *strong consistency* between pages in this section. Readers will scan multiple pages
in a single sitting; jarring style drift between sibling pages (e.g. one page using question-form
H2s like "How do I configure scaling?" while another uses noun H2s like "Scaling") makes the
section feel disorganized and untrustworthy.

Treat the example as a strong default, not a gospel. The rules below apply in this order:

STRICT — match the example unless the target source makes it impossible:

1. **Heading style and grammatical form.**
   - If the example uses noun-form H2s ("Networking", "Scaling", "Packaging"), this page MUST use noun-form H2s.
   - If the example uses question-form H2s ("How do I add a custom domain?"), this page MUST use question-form H2s.
   - Do not mix forms. Pick one and stick with it.
2. **H2 ordering.**
   - The H2 sections this page emits should appear in the same order as the example's H2 sections, for sections that exist in both pages.
   - You may insert a new H2 between two example H2s only when the target source has content that doesn't fit any existing example section.
3. **Frontmatter shape.** Use the same set of frontmatter keys as the example (title, order, seoTitle, seoDescription, any others). Don't add new ones, don't drop any.
4. **Opening paragraph shape.** Same length (40–60 words), same structure (definition → reason to care). If the example opens with a one-liner of pricing context after the opening paragraph, this page should too (when pricing data is present in the source).
5. **MDX component palette.** Use the same set of MDX components the example uses — same callout types (\`<Info>\`, \`<Tip>\`, \`<Warning>\`), same Tabs/FlowDiagram/ConsoleScreenshot patterns. Do not introduce a component the example didn't use unless the target source genuinely demands it.
6. **\`<CodeBlock>\` style.** Match the example's tab label naming (always \`'TypeScript'\`), focus-marker usage, hidden-import pattern, and the convention of having a "basic example" early on if the example has one.
7. **API reference placement.** If the example places \`<ApiReference />\` at the top, this page should too. If at the bottom, this page should too. If in the middle following a specific anchor, match that.
8. **Voice and density.** Same paragraph length distribution, same number of bullet lists vs prose paragraphs per section, same opinionatedness ("use X when ...") vs neutral framing.

FLEXIBLE — deviate from the example when the source demands it:

A. **Sections the example doesn't have.** If the target resource has a configuration concept the example doesn't (e.g. the example resource has no \`engine\` selector but this one does), add a new H2 for it. Use the same heading form as the rest of the page (matching the example's form, not the source's wording).
B. **Sections in the example that don't apply here.** If the example has an H2 like "Static outbound IP" but this resource genuinely doesn't support that, omit it — don't write a placeholder section.
C. **Length.** The example sets the density convention but not the total length. A resource with fewer config knobs produces a shorter page. A resource with more produces a longer one. Don't pad to match length; don't truncate to match length.
D. **Defaults, limits, prices, allowed values, type names.** These come from THIS page's source files, never from the example. The example is wrong about every page-specific fact by construction.
E. **Class/resource names in code examples.** Always use the target resource's classes (\`new RelationalDatabase(...)\` not \`new WebService(...)\`), even though the import-and-shape pattern matches the example.

NEVER copy from the example:

- Specific property values, defaults, limits, prices, region lists, AWS pricing figures
- Specific JSDoc-derived descriptions; rewrite from this page's source
- Names of properties that aren't on the target resource's type
- Hand-written examples that reference the example resource's specific behavior
- Cross-links pointing to the example resource

Implementation order when drafting:
1. Read the target source files first. Note every property, every union branch, every constraint.
2. Read the example page next. Note: heading style, H2 order, opening shape, MDX component palette, \`<ApiReference>\` position.
3. Draft this page with the example's *form* + target source's *facts*.

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

Shell / CLI command rules (the copy-button trap):
- ONE command per fenced \`\`\`bash / \`\`\`sh block. Never group two alternative invocations under one fenced block separated by \`#\` comment labels — the copy button copies the entire block as a single string, which then fails to run because comment lines are not valid input for the next command.
   - WRONG:
     \`\`\`bash
     # Only errors
     stacktape debug:logs --filter "ERROR"

     # JSON structured logs
     stacktape debug:logs --filter '{ $.level = "error" }'
     \`\`\`
   - RIGHT: A short prose sentence introduces each variant, followed by its own \`\`\`bash block containing only that command. Render two paragraphs and two code blocks.
- Never use \`#\` comments INSIDE a shell code block to explain what the command does. Put the explanation as plain prose (a paragraph or one-line sentence) BEFORE the code block. The block should contain only what a user would actually type. Comments inside the block leak into the copy buffer and dilute the snippet.
- Acceptable: a \`#\` comment is fine when it would also be typed by the user (e.g. a comment in a shell script being authored, or a \`# This script runs daily\` line inside a crontab example). The test is "would the user keep this if they pasted the block into their terminal?".
- Long single commands that legitimately use line continuations (\`\\\`) stay as one block. The "one command per block" rule is about ALTERNATIVE invocations, not multi-line invocations.

Pricing rules:
- When concrete pricing is present in the provided source files (e.g. \`prices.json\`, \`@generated/aws-price/*\`, JSDoc comments), include a one-line pricing context near the top of resource pages.
- Never invent or estimate AWS list prices that are not present in the provided source.
- Phrase pricing as ranges or "~" approximations to acknowledge regional variation.

Canonical generated-doc facts:
- For \`connectTo\` environment variables, always describe names as \`STP_[RESOURCE_NAME]_[PARAM]\`. Use concrete names only when the example resource name proves them. Example: if the database resource variable is \`mainDatabase\`, use \`STP_MAIN_DATABASE_CONNECTION_STRING\`; do not write generic names like \`STP_DATABASE_CONNECTION_STRING\` unless the example resource is literally named \`database\`.
- For logs, use the documented CLI command \`stacktape debug:logs\` and link the first mention to \`/cli/debug-logs\`. Do not invent \`stacktape logs\` as a command. Console log viewing is separate from CLI log viewing.

Source priority when sources disagree:
1. TypeScript types in \`types/stacktape-config/*.d.ts\` and runtime validators in \`src/domain/**\` — authoritative for behavior, defaults, and constraints.
2. \`@generated/schemas/config-schema.json\` — authoritative for schema shape.
3. \`@generated/llm-docs/*.md\` — pre-distilled summaries; useful for framing and cross-checks but secondary to types.
4. \`docs/_curated-docs/**\` — human-written prose; accept structure and tone, re-verify facts.
5. CLI source in \`src/commands/**/index.ts\` — authoritative for CLI behavior.
6. \`console-app/src/**\` and \`console-app/server/**\` — authoritative for Console behavior.
7. Anything labelled "old docs" — treat as hint only, never quote.

If a low-priority source contradicts a high-priority one, follow the higher-priority source and write cautiously.

Source-grounding verifier authority:
- The pipeline runs two factual verifiers: factual-accuracy-verifier (broad) and source-grounding-verifier (exhaustive source reader). High-severity factual/source-grounding issues are publication blockers when they identify a concrete wrong or unsupported Stacktape-specific claim.
- Medium source-grounding and API-audit issues are important revision guidance, not automatic publication blockers. Fix them when revising, but do not over-correct or invent new facts just to satisfy polish concerns.
- If a prior iteration left source-grounding high-severity factual issues unresolved, the next iteration MUST address every one. Pages have failed because the writer fixed one issue from these agents and ignored the others.
- When fixing a source-grounding issue, name the corrected fact explicitly in the new draft. Don't just remove the offending sentence — replace it with the source-grounded version. Removing without replacing leaves a content gap that may regress the next iteration.

Claim patterns the source-grounding verifier consistently over-flags (avoid these to write claims the verifier will accept on the first pass):

1. **Negative connectTo / env-var claims.** The \`ResourceAccessProps.connectTo\` JSDoc in \`types/stacktape-config/__helpers.d.ts\` lists ONLY what IS injected per resource type. Asserting that a referenceable parameter is NOT injected as an env var (e.g. "readerPort, readReplicaHosts, dbName are not auto-injected") is unsupported by the source — the source is silent about negatives. Document only what IS injected; for everything else, say it is available via \`$ResourceParam()\` without claiming the env-var injection list is exhaustive.

2. **connectTo claims for resource types not enumerated in the JSDoc.** The connectTo JSDoc enumerates a fixed set of resource types (Lambda, web-service, container workloads, relational-database, redis, bucket, dynamodb-table, sqs-queue, sns-topic, event-bus). Resource types NOT in that list (state-machine, opensearch, kinesis-stream, user-auth-pool, custom-resource, etc.) do not have a documented env-var injection table — even when \`connectTo\` accepts them. Do NOT claim "connectTo injects \`STP_X_Y\` env vars" for a resource type whose name doesn't appear in the connectTo JSDoc. Instead, document the resource's parameters via \`$ResourceParam()\` and say "the IAM permissions required to interact with this resource are added to the consuming workload's role".

3. **Console UI flows.** If \`console-app/*\` source files are NOT in this page's source list, do NOT describe Console workflows (clicking buttons, navigation paths, page locations). You may say "managed in the Stacktape Console" with a link to \`/stacktape-console/<page>\` for the deep dive, but do not invent button labels, breadcrumb trails, or screen sequences. Console behavior must be grounded in console-app source — never inferred from the config types.

4. **Class names not visible in the inline TypeScript source.** The inline source files often show union TYPES (e.g. \`AuroraServerlessV2Engine | RdsEngine | AuroraEngine | AuroraServerlessEngine\`) but not the corresponding class NAMES exported by the \`stacktape\` npm package. The source-grounding verifier reads only the inline source and may flag class names like \`AuroraServerlessV2EnginePostgresql\` as ungrounded. The deterministic code-block-validator type-checks every class name against the real npm types — TRUST IT. If the validator does NOT flag a class name, the class exists and you can use it. Do not remove valid class names just because source-grounding complained. If source-grounding flags a class name in iteration feedback, respond with: "The deterministic code-block-validator confirms \`<ClassName>\` is exported by the stacktape package" — in your draft, keep the class name but consider adding a one-sentence prose mention naming the class explicitly so the source-grounding verifier sees it called out (e.g. "Aurora Serverless v2 uses the \`AuroraServerlessV2EnginePostgresql\` or \`AuroraServerlessV2EngineMysql\` class").

5. **AWS-side behavior claimed as Stacktape-specific.** When describing AWS service mechanics (RDS automated backups, ECS Fargate startup time, S3 eventual consistency, etc.), frame them as AWS facts ("AWS RDS retains automated backups for up to 35 days"), not as Stacktape behavior. The verifier accepts well-known AWS facts as background but flags them as unsupported Stacktape claims when they read as "Stacktape does X". Use phrasing like "Underneath, this uses AWS Foo, which..." to separate the layers.

6. **Numeric defaults inherited from a base type that the derivative page's source doesn't enumerate.** SSR frontend resources (NextjsWeb, AstroWeb, NuxtWeb, SvelteKitWeb, SolidStartWeb, TanStackWeb, RemixWeb) and other derivative resources embed a \`serverLambda\` or similar property whose type is a subset of \`LambdaFunctionProps\`. The base LambdaFunction page documents specific numeric facts (memory range 128–10,240 MB, 1,769 MB = 1 vCPU, timeout cap 30 s for CloudFront-fronted Lambdas, etc.). The derivative pages' source files typically don't restate these numbers — they just expose the \`serverLambda\` knob. Do NOT restate the inherited numeric defaults on derivative pages: codex source-grounding will (correctly) flag them as ungrounded for that page's source. Instead: link to \`/resources/compute/lambda-function\` for the inherited specifics with a one-sentence orientation. Example: "The SSR function inherits memory, CPU, timeout, and VPC behavior from [Lambda functions](/resources/compute/lambda-function)."

Heading hierarchy discipline:
- "When to use" and "When NOT to use" are PEER \`##\` (H2) sections on resource pages. Never nest "When NOT to use" as \`###\` under "When to use" — they're independent decisions and the nested form makes the page TOC look broken.
- More broadly: an H3 belongs ONLY to elaboration of a single concept (e.g. "Containers" → "Init containers", "Side containers"). Two top-level peer ideas always get their own H2.

ApiReference discipline:
- The \`<ApiReference definitionName="..." />\` value MUST match the page's \`typeName\` from metadata exactly. The Stacktape config types end in \`Props\` (e.g. \`WebServiceProps\`, \`LambdaFunctionProps\`, \`ContainerWorkloadProps\`, \`RelationalDatabaseProps\`). Writing the bare class name (\`ContainerWorkload\`) or any other variant is wrong — the component will render an empty section because the schema entry is keyed on the Props type.
- If the page metadata's \`typeName\` is set, use it verbatim — do not "infer" a shorter form. If \`typeName\` is missing (rare), look up the type in the source \`types/stacktape-config/*.d.ts\` files; the canonical name is the one used in \`type XxxProps = { ... }\` definitions.

Iteration discipline — fix what's broken, don't break what works:
- When revising a draft, the writer's job is to fix flagged issues WITHOUT introducing new ones. A common failure mode: the writer tries to fix codex factual issues in prose and accidentally breaks the TypeScript in code examples (typos in class names, missing imports, broken focus markers).
- After making prose changes, RE-READ every \`<CodeBlock intellisense>\` code field and confirm: (a) imports are correct, (b) class names match the source types exactly, (c) \`defineConfig\` and \`export default\` are present, (d) focus markers are balanced.
- The code-block-validator runs a deterministic TypeScript parse + type-check + class-name whitelist on every \`<CodeBlock intellisense>\`. If you broke a code block in this iteration, the code-block-validator will flag it as severity high and you'll spend the next iteration fixing it instead of converging.
- Valid Stacktape class names visible to the writer: \`LambdaFunction\`, \`WebService\`, \`PrivateService\`, \`WorkerService\`, \`MultiContainerWorkload\`, \`BatchJob\`, \`EdgeLambdaFunction\`, \`Bucket\`, \`HostingBucket\`, \`DynamoDbTable\`, \`RelationalDatabase\`, \`RedisCluster\`, \`MongoDbAtlasCluster\`, \`UpstashRedis\`, \`OpenSearchDomain\`, \`HttpApiGateway\`, \`ApplicationLoadBalancer\`, \`NetworkLoadBalancer\`, \`EventBus\`, \`SqsQueue\`, \`SnsTopic\`, \`KinesisStream\`, \`StateMachine\`, \`UserAuthPool\`, \`WebAppFirewall\`, \`Bastion\`, \`EfsFilesystem\`, \`NextjsWeb\`, \`AstroWeb\`, \`NuxtWeb\`, \`SvelteKitWeb\`, \`SolidStartWeb\`, \`TanStackWeb\`, \`RemixWeb\`, \`CustomResource\`, \`DeploymentScript\`, \`AwsCdkConstruct\`. Lambda packaging classes: \`StacktapeLambdaBuildpackPackaging\`, \`CustomArtifactLambdaPackaging\` (NOT \`CustomArtifactPackaging\`). Container packaging classes: \`StacktapeImageBuildpackPackaging\`, \`CustomDockerfilePackaging\`, \`PrebuiltImagePackaging\`, \`NixpacksPackaging\`, \`ExternalBuildpackPackaging\`. Database engine classes start with \`RdsEngine\` or \`AuroraEngine\`. Trigger integration classes end in \`Integration\` (e.g. \`HttpApiIntegration\`, \`ScheduleIntegration\`, \`SqsIntegration\`).

Subprocess discipline (Windows host — affects all agents using tools):
- The source files you need are inline in this prompt. You should not need to invoke subprocesses to inspect them.
- If you do need to inspect a file beyond the inline content, use the Read tool — not Bash.
- DO NOT invoke \`python\`, \`python3\`, \`pip\`, \`py\` via Bash. On this Windows host they trigger a Microsoft Store install popup that interrupts the user. Use Read for file inspection or Bash with \`node\`, \`bun\`, \`grep\`, \`sed\` if a shell tool is genuinely necessary.
- Prefer pure analysis from the inline source over any shell or filesystem call.

How to handle missing or thin source:
- If the source is silent on a question the reader will ask, say so explicitly ("not currently supported", "not documented at this layer") rather than guessing.
- If a backbone section has no grounded material, omit it.
- If a numeric default is unclear, omit the number rather than guess.

SEO and AI discoverability rules (AEO — Answer Engine Optimization):

The pipeline targets being cited by Google AI Overviews, ChatGPT, Perplexity, and Claude. Citation engines extract individual paragraphs as snippets; they do NOT cite the page as a whole. Optimize for extractability.

- The first paragraph (40-75 words) must be a self-contained answer to "what is this and why does it matter". Do NOT open with "This guide will cover...", "In this page we'll learn...", or any meta-framing. AI Overviews extract this paragraph verbatim. ChatGPT, Perplexity, and Claude paraphrase from it.
- Every H2 section's first paragraph must also be self-contained — when extracted alone, it should still make sense. Name the concept explicitly ("A Stacktape web service can front traffic through CloudFront to cache responses at edge locations") rather than referring to surrounding context with pronouns ("It can also be cached").
- Use explicit entity names throughout. Say "Stacktape web service", "a web service", or "the WebService resource" — never just "the service", "this resource", or "it" when the antecedent is more than one sentence away. Named entities anchor citations.
- Keep H2 headings short and descriptive — prefer 1-5 word noun-form labels (Scaling, Networking, Packaging, Health checks). Long full-sentence H2s hurt scannability.
- Question-form H3s ARE allowed and welcome inside an FAQ section or for common-question subsections ("Can I use a custom domain?", "Does it scale to zero?"). They're highly cited by AI engines when natural.
- ADD an FAQ section on resource, concept, and reference pages — **aim for 8-10 Q&A pairs**, but fewer is fine when the page genuinely doesn't have that many distinct, useful questions to answer. A narrow-scope page might have 4-6 great FAQs; a broad page might have 10. Quality over quota: every FAQ entry must answer a real question a reader would search for. Do NOT pad with synthetic or redundant questions just to hit a count. Format as \`## FAQ\` followed by \`### Question\` / answer paragraph pairs. Skip the FAQ entirely on pure narrative pages (Getting Started steps).
- FAQ question coverage MUST span three categories (not just Stacktape-specific):
  1. **Stacktape-specific questions** — "Can I use a custom domain?", "Does it scale to zero?", "Where is the env var configured?"
  2. **Use-case questions about the underlying AWS service** — for a web-service page: "How much does ECS Fargate cost?", "How do I run database migrations on ECS?", "How fast does Fargate cold-start?". For a relational-database page: "How do I back up RDS?", "What's the difference between Aurora and RDS Postgres?". These are high-intent search queries readers ask Google/ChatGPT and they map cleanly onto the page's primary AWS service.
  3. **Choosing/comparison questions** — "When should I use a web service vs a Lambda function?", "ECS Fargate vs EC2 — which is cheaper?", "ALB vs API Gateway?". These help readers who haven't yet decided to use this resource type.
- FAQ answers should be 2-4 sentence paragraphs — concise enough to be a Featured Snippet, complete enough to stand alone. End each answer with a relevant link from the navigation index when possible.
- FAQ answers may use well-known AWS facts (pricing model, service mechanics, AWS terminology) without strict source-file grounding, as long as they don't make Stacktape-specific claims that contradict the source. The verifier is told to allow this — your role is to make sure the FAQ is broadly useful, not narrowly tied to source.
- Prefer tables for comparisons (engine variants, instance sizes, packaging modes, "when to use X vs Y"). Tables get cited 2-4x more than equivalent prose. Use markdown tables or \`<FeatureComparisonTable>\` for structured comparisons.
- Include concrete numbers (costs, limits, defaults, supported values) whenever they appear in the source. "Up to 16 vCPU and 120 GB memory" beats "large resource limits". Never invent numbers.
- Each paragraph should carry one complete idea (40-75 words target). Short paragraphs lose context; long paragraphs get truncated.
- Avoid empty antecedents — don't start a paragraph with "This is configured by...", "These settings control...". Name what you're talking about up front.

Documentation-quality discipline (write a GUIDE, not a CONFIG REFERENCE):

The reader needs help DECIDING, not just CONFIGURING. The page should feel like an opinionated guide written by someone who's used the resource in production — not a thin shell around the API reference. The five rules below are important quality targets; reviewer and auditor feedback may route borderline pages to human review, but factual correctness remains the hard publication gate.

1. **Union-type coverage discipline.** When a property has multiple variants in the source's union type (packaging modes, compute engines, load balancer kinds, database engines, deployment strategies, trigger sources, integration types, auth providers, etc.), the page MUST acknowledge all variants. Showing one variant under an H2/H3 (e.g. "### Using a custom Dockerfile") without naming the alternatives elsewhere on the page implies it's the only option. Acceptable shapes:
   - One-line enumeration before the deep-dive: *"Stacktape supports five container packaging modes (stacktape-buildpack, custom-dockerfile, prebuilt-image, nixpacks, external-buildpack). Most teams use the buildpack; the custom-Dockerfile path is shown below for cases needing precise control."*
   - Brief paragraph linking to dedicated docs: *"This page shows the custom-Dockerfile mode. See [Packaging overview](/packaging/overview) for the other four."*
   - Full enumeration with a one-paragraph treatment per variant (preferred for short unions of 2-3 options).
   Read the union types in the provided source files before drafting; do not infer variants from prose.

2. **Per-variant equal depth.** When a section covers multiple variants of a polymorphic property, each variant must be developed to roughly equivalent depth: a working code example per variant, per-variant tradeoffs or when-to-use guidance, per-variant cost or constraint context where source supports it. Showing only the default with an example while treating other variants as one-liner mentions counts as enumeration, not documentation. Example: a "Compute resources" section that gives Fargate a code example + cost table while EC2 gets two sentences fails this rule — EC2 also needs an example and a clear when-to-use signal.

3. **Decision support for opt-in features.** Every sub-section introducing an opt-in feature (CDN, custom domains, gradual deployments, side containers, firewall, ARM/Graviton, EC2 mode, warm pools, etc.) must contain enough context for the reader to *decide* whether to enable it — not just *configure* it. Cover:
   - **When to enable it** — 1-2 concrete scenarios (avoid circular language like "if you need a CDN, enable a CDN").
   - **When the default is fine** — what no-op gets you and when that's enough.
   - **A cost or tradeoff signal** — what enabling adds (dollars, latency, complexity, propagation time, attack surface).
   - **An opinion** — the section should land: "most teams skip this", "enable for global APIs", "default on for static-heavy workloads".
   Configuration-without-decision-support is a recipe, not a guide. A section that jumps from a 1-line definition straight to a code example without addressing the above fails completeness, even if every line is source-grounded.

4. **Property-value anchors in examples.** When a code example contains a tunable property with a specific value (\`cloudfrontPriceClass: 'PriceClass_100'\`, \`instanceTypes: ['t3.medium']\`, \`enableWarmPool: true\`, \`engine: 'postgres-16'\`, \`instanceClass: 'db.t4g.micro'\`), the surrounding prose must briefly explain what the property controls and what the supported alternatives are. Otherwise the value reads as default-required when it isn't, and the reader has no idea why it's there or whether to change it. One short sentence per non-obvious property value is enough.

5. **Section depth — AEO discipline applies only to the FIRST paragraph.** The "40-75 word self-contained paragraph" rule is for the snippet target at the top of each section. Subsequent paragraphs of the same section should develop the topic to the depth the reader needs to act: examples, tradeoffs, cost context, edge cases, antipatterns. Sections that stop after the answer-first paragraph (or have just one code example with no surrounding prose) are too brief — they look complete because they exist, but they don't help the reader. Each opt-in section should have at least: opening paragraph (40-75 words) + working example + 2-4 sentences of tradeoff/depth.
`;

// Dedupe by a coarse signature (lowercased first 60 chars) so semantically near-identical
// items from different reviewers collapse into one entry.
const dedupeBySignature = <T>(items: T[], getText: (item: T) => string): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const signature = getText(item).toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
    if (!signature || seen.has(signature)) continue;
    seen.add(signature);
    out.push(item);
  }
  return out;
};

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export const buildWriterPrompt = ({
  contextPack,
  previousDraft,
  reviewerResults,
  verifierResults,
  humanFeedback
}: {
  contextPack: ContextPack;
  previousDraft?: string;
  reviewerResults?: ReviewerResult[];
  verifierResults?: VerifierResult[];
  // Free-form notes the user added via the /review UI. Highest priority signal — overrides
  // reviewer/verifier feedback if there's a conflict. Append-only across the page's history.
  humanFeedback?: HumanFeedbackEntry[];
}) => {
  // Render human feedback as the top-priority instruction block. The writer should address
  // every item before turning to reviewer/verifier feedback. Each entry is timestamped so the
  // writer can see whether feedback came before or after a particular iteration.
  const humanFeedbackBlock = humanFeedback?.length
    ? `\nUSER FEEDBACK (highest priority — address EVERY item below before reviewer or verifier feedback):\nThis feedback comes directly from the human owner of the docs. Treat it as authoritative. If it conflicts with a reviewer/verifier note, the user wins. Don't argue, don't soft-pedal — just incorporate the change.\n\n${humanFeedback
        .map(
          (entry, i) => `${i + 1}. (added ${entry.addedAt} after iter ${entry.iterationAtTime}):\n${entry.text.trim()}`
        )
        .join('\n\n')}\n`
    : '';
  // Compress reviewer feedback into a small, actionable set so the writer can
  // focus revisions instead of chasing every nit. Per-reviewer scores stay full
  // so the writer knows the score gap to close. Mandatory fixes are deduped
  // across reviewers and capped at the most impactful ones.
  const reviewerScoreSummary = reviewerResults?.length
    ? reviewerResults
        .map((r) => {
          const avg = (Object.values(r.scores).reduce((a, b) => a + b, 0) / 5).toFixed(1);
          return `- ${r.reviewerId} (avg ${avg}): ${Object.entries(r.scores)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')}`;
        })
        .join('\n')
    : 'None.';

  const allMandatoryFixes = (reviewerResults || []).flatMap((r) =>
    r.mandatoryFixes.map((fix) => ({ fix, reviewerId: r.reviewerId }))
  );
  const topMandatoryFixes = dedupeBySignature(allMandatoryFixes, (m) => m.fix).slice(0, 5);
  const reviewFeedback = topMandatoryFixes.length
    ? topMandatoryFixes.map((m) => `- [${m.reviewerId}] ${m.fix}`).join('\n')
    : 'None.';

  // Verifier feedback: source-grounding-verifier + api-completeness-auditor get priority framing
  // because they catch real factual + structural problems other agents miss. Those issues
  // surface SEPARATELY with stronger "must fix" header; factual-accuracy-verifier + code-block-validator are
  // rendered after under lower priority.
  //
  // These roles often use the Codex CLI by default, but their priority comes from what they do,
  // not from the model/provider used for a particular run.
  const sourceAndAuditIssues = (verifierResults || [])
    .filter(
      (v) => v.verifierId === AGENT_IDS.sourceGroundingVerifier || v.verifierId === AGENT_IDS.apiCompletenessAuditor
    )
    .flatMap((v) => v.issues.map((issue) => ({ ...issue, verifierId: v.verifierId })))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  const topSourceAndAuditIssues = dedupeBySignature(sourceAndAuditIssues, (i) => i.statement).slice(0, 8);
  const sourceAndAuditFeedback = topSourceAndAuditIssues.length
    ? topSourceAndAuditIssues
        .map(
          (issue) =>
            `- [${issue.severity}] [${issue.verifierId}] ${issue.statement}\n  Fix: ${issue.suggestedFix}${issue.evidence?.length ? `\n  Evidence: ${issue.evidence[0].file}` : ''}`
        )
        .join('\n')
    : 'None.';

  const otherIssues = (verifierResults || [])
    .filter(
      (v) => v.verifierId !== AGENT_IDS.sourceGroundingVerifier && v.verifierId !== AGENT_IDS.apiCompletenessAuditor
    )
    .flatMap((v) => v.issues.map((issue) => ({ ...issue, verifierId: v.verifierId })))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  const topOtherIssues = dedupeBySignature(otherIssues, (i) => i.statement).slice(0, 5);
  const otherFeedback = topOtherIssues.length
    ? topOtherIssues
        .map(
          (issue) =>
            `- [${issue.severity}] [${issue.verifierId}] ${issue.statement}\n  Fix: ${issue.suggestedFix}${issue.evidence?.length ? `\n  Evidence: ${issue.evidence[0].file}` : ''}`
        )
        .join('\n')
    : 'None.';

  return `${commonRules}

${contextPack.styleGuide ? `Project style guide and glossary (apply throughout):\n${contextPack.styleGuide}\n` : ''}
${humanFeedbackBlock}
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

Reviewer scores from prior iteration (target: every category ≥ 8):
${reviewerScoreSummary}

Top reviewer mandatory fixes (deduped across reviewers; address all of these):
${reviewFeedback}

SOURCE-GROUNDING AND API AUDIT ISSUES (authoritative — fix EVERY one of these):
The source-grounding verifier and API completeness auditor read source files exhaustively and flag factual or coverage problems — wrong defaults, invented properties, claims that aren't in the source, broken class names, missing union variants, contradictions with .d.ts types. High-severity factual/source-grounding issues are publication blockers. Medium issues are strong revision guidance. Re-read the cited evidence file for each issue before drafting, but keep the page readable and avoid turning every medium coverage note into a bulky reference section.

${sourceAndAuditFeedback}

Other verifier issues (factual-accuracy-verifier + code-block-validator — address but lower priority than source-grounding/API audit issues):
${otherFeedback}

Current draft to revise:
${previousDraft || 'No existing draft. Write from scratch.'}

Docs structure plan:
${contextPack.structurePlan}

Documentation pages (every page in the site, grouped by section — use these EXACT routes when cross-linking; never invent paths):
${contextPack.navigationIndex}

Cross-linking rules:
- When you mention a concept that has a dedicated page in the index above (packaging modes, triggers, alarms, custom domains, connecting resources, a specific CLI command, etc.), link to it using its exact route.
- Use relative markdown links: \`[link text](/route/from/index)\`. Do not use absolute URLs.
- Do NOT re-explain a topic that has its own page; one sentence of orientation followed by a link is the right shape.
- Do NOT invent routes. If a topic does not appear in the index, do not link it.

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
- \`<FeatureComparisonTable columns={["Option A", "Option B"]} features={[{ name: "Feature", values: { "Option A": true, "Option B": "Partial" } }]} />\` — feature matrix with checkmarks. Use when comparing resources or modes side by side.
- \`<DecisionTree nodes={[{ question: "What do you need?", children: [{ answer: "A public API", result: "Use a web service" }] }]} />\` — hierarchical decision tree for guided choices

Tabs (for non-code content switching):
- \`<Tabs><Tab label="Option A">content</Tab><Tab label="Option B">content</Tab></Tabs>\` — tabbed content. Use for platform-specific instructions, alternative approaches, or framework-specific guides. Do NOT use for code examples (use standard fenced code blocks instead).

Structure and diagrams:
- \`<FlowDiagram steps={[{ title: "Step 1", description: "Do this" }]} />\` — sequential step diagram. Use for deploy flows, setup procedures.
- \`<ProjectStructure files={[{ name: "src", type: "folder", children: [{ name: "index.ts" }] }]} />\` — file tree visualization. Use on recipe pages to show project structure.
- \`<ConsoleScreenshot src="/static/screenshots/example.png" alt="Description" caption="Optional caption" />\` — styled screenshot with border and caption. Use for Console UI screenshots. Screenshot file delivery: the docs maintainers attach actual screenshot files separately — your job is to (1) decide where a screenshot would help, (2) pick a meaningful filename in \`/static/screenshots/\` (e.g. \`/static/screenshots/console-config-editor.png\`), (3) write a precise \`alt\` and \`caption\` describing what the image should show ("Stacktape Console's config editor showing IntelliSense suggestions for a Lambda function resource"). Treat the filename as a placeholder contract — the maintainer reads your \`alt\`/\`caption\` and provides the matching PNG. Use this freely when a screenshot would actively help (Console pages, AI config generation, deploy flow, alarms setup, etc.); a vivid alt+caption is the only authoring effort required from you.

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
      : 'NO <ReferenceableParams> component at all. This page has no registered referenceableResourceType, meaning no entry exists in docs/.resources.json for this resource. Using <ReferenceableParams resource="..." /> with an invented resource type (e.g. "nuxt-web", "sveltekit-web") FAILS the deterministic MDX validator as severity high. Omit the component entirely — do NOT guess a resource type, do NOT add a placeholder section.'
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

// Refinement writer prompt: targeted patch over an existing draft, not a regeneration.
//
// Used by the --refineReview loop on pages that hit `needs-human-review`. The draft already
// scored well enough for the user (reviewer grand-avg >= 6.5) but has hard verifier blockers
// (wrong defaults, ungrounded claims, missing union variants, broken code blocks). The job is
// to surgically fix those issues without restructuring or rewriting working prose.
//
// Returns the same `{ mdx, seoTitle, seoDescription }` schema as `buildWriterPrompt` so the
// existing writer schema works unchanged.
export const buildRefinementWriterPrompt = ({
  contextPack,
  previousDraft,
  hardBlockers,
  advisoryHighs
}: {
  contextPack: ContextPack;
  previousDraft: string;
  hardBlockers: Array<{
    verifierId: string;
    statement: string;
    suggestedFix: string;
    evidence?: Array<{ file: string; quote: string }>;
  }>;
  advisoryHighs: Array<{
    verifierId: string;
    statement: string;
    suggestedFix: string;
    evidence?: Array<{ file: string; quote: string }>;
  }>;
}) => {
  const renderIssue = (issue: (typeof hardBlockers)[number]) =>
    `- [${issue.verifierId}] ${issue.statement}\n  Fix: ${issue.suggestedFix}${
      issue.evidence?.length ? `\n  Evidence: ${issue.evidence[0].file}` : ''
    }`;
  const hardBlockerBlock = hardBlockers.length ? hardBlockers.map(renderIssue).join('\n') : 'None.';
  const advisoryBlock = advisoryHighs.length ? advisoryHighs.map(renderIssue).join('\n') : 'None.';

  return `${commonRules}

${contextPack.styleGuide ? `Project style guide and glossary (apply throughout):\n${contextPack.styleGuide}\n` : ''}
Task: REFINEMENT PASS over the existing MDX page at route "/${contextPack.page.route}".

This is NOT a regeneration. The current draft scored well enough on prose quality that we're not rewriting it. Your only job is to fix the verifier issues listed below while keeping the rest of the page essentially unchanged.

REFINEMENT DISCIPLINE — read this carefully:
- Do NOT restructure the page. Keep the H2/H3 hierarchy, section ordering, and overall narrative as-is.
- Do NOT rewrite paragraphs that are not flagged. If a paragraph is fine, leave its wording alone.
- Do NOT add new sections, FAQ entries, or callouts unless a flagged issue explicitly requires it (e.g. a missing union variant must be named somewhere).
- Do NOT "polish" — no synonym swaps, no sentence reorderings, no header re-wordings. Style polish during refinement causes regressions and wastes the iteration.
- DO fix every hard blocker below. These are publication-blocking factual or structural issues.
- DO address advisory highs when the fix is small and local. Skip them if the fix would require restructuring.
- DO re-verify every code block in the page after your edits — class names, imports, focus markers, defineConfig shape. The deterministic code-block validator will reject broken code.
- DO preserve the frontmatter exactly (title, order). The pipeline will manage seoTitle/seoDescription and pipeline-status fields.

If a flagged issue would require restructuring or significant prose rewrites to fix, prefer narrowing the offending claim (or removing it) over expanding the section. The goal is a clean, minimal patch.

Page metadata:
- Title: ${contextPack.page.title}
- Kind: ${contextPack.page.kind}
- Template: ${contextPack.page.template}
- Description: ${contextPack.page.shortDescription}
- Type name (if any): ${contextPack.page.typeName || 'n/a'}
- CLI command (if any): ${contextPack.page.cliCommand || 'n/a'}

HARD BLOCKERS (fix EVERY one of these — publication is gated on them):
${hardBlockerBlock}

Advisory high-severity issues (fix when the change is small and local; otherwise narrow the affected claim):
${advisoryBlock}

Current draft to patch (preserve everything not called out above):
${previousDraft}

Source files (use to ground factual fixes — read the evidence file cited in each issue before editing the corresponding claim):
${renderSourceDocuments(contextPack)}

Configured source files that could not be read:
${renderMissingSourceFiles(contextPack)}

Documentation pages (use exact routes for cross-links; never invent paths):
${contextPack.navigationIndex}

Output requirements:
- Return only the full revised MDX page body. Do not return commentary, diffs, summaries, or meta-explanations.
- Preserve frontmatter (title, order). The pipeline manages seoTitle/seoDescription/pipeline-status fields.
- The output should be substantially identical to the input draft except in the regions affected by the flagged issues. A reviewer reading the diff should see a small number of focused edits, not a rewrite.

Additional output fields:
- seoTitle: A search-engine-optimized page title (under 60 characters). Reuse the existing seoTitle from the prior draft's frontmatter if present and accurate; otherwise produce one.
- seoDescription: A meta description for search engines (150-160 characters). Reuse the existing seoDescription if accurate; otherwise produce one.

The mdx field must contain only the raw MDX page content. Do not include commentary in it.`;
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

- Multiple alternative shell commands in a single fenced \`\`\`bash / \`\`\`sh code block separated by \`#\` comments (e.g. "# Only errors" followed by one command, "# JSON structured logs" followed by another). The copy button copies the whole block; the user gets two commands plus comment lines that won't run.
  → Penalize \`practicalUsefulness\` by at least 2 AND \`clarity\` by at least 1. Mandatory fix: "Split into one fenced block per command. Move the explanatory \`# comment\` labels out of the block into a prose sentence above each block."

- \`#\` comments INSIDE a shell code block being used to explain what the command does (not to be typed by the user).
  → Penalize \`practicalUsefulness\` by at least 1. Mandatory fix: "Move the explanation out of the code block into a prose sentence above it. The code block should contain only what the user types."

- A backbone section padded with restated content (e.g. a "How it works" section that only repeats earlier points).
  → Penalize \`completeness\` by at least 1. Mandatory fix: "Trim or remove the redundant section; do not pad backbones."

- An MDX component used with unknown or wrong props (e.g. \`<PropertiesTable defName=...>\` instead of \`definitionName\`, \`<CodeBlock>\` without \`intellisense\` for Stacktape config).
  → Penalize \`clarity\` by at least 1. Mandatory fix: name the component and the wrong prop.

- A \`<PropertiesTable>\` anywhere on the page (the component was removed from the writer surface), or an \`<ApiReference>\` whose \`definitionName\` does not match any generated config-schema definition.
  → Penalize \`completeness\` by at least 2. Mandatory fix: "Replace <PropertiesTable> with a single <ApiReference definitionName=\\"...\\" /> placed wherever fits the page's flow, or use the correct definitionName from the source types."

- A page with more than one \`<ApiReference>\` (resource pages should have exactly one — the page's root type).
  → Penalize \`scannability\` by at least 1. Mandatory fix: "Keep one <ApiReference> on the page (top, middle, or bottom — pick what fits the flow); rely on its built-in drill-down for nested types."

When example-guided mode is active (an example page is provided alongside this one), also flag:

- **Heading-form drift**: page uses question-form H2s ("How do I X?") while the example uses noun-form H2s ("X"), or vice versa.
  → Penalize \`scannability\` by at least 2 AND \`audienceFit\` by at least 1. Mandatory fix: "Rewrite all H2s to match the example's heading form (noun-form / question-form — whichever the example uses)."

- **H2 ordering drift**: H2 sections that exist in both pages appear in a different order than the example.
  → Penalize \`scannability\` by at least 1. Mandatory fix: "Reorder H2s so sections shared with the example appear in the same order. New H2s the example doesn't have can be inserted, but shared sections keep the example's relative order."

- **MDX component palette drift**: page introduces a callout type or MDX component the example doesn't use (e.g. example only uses \`<Info>\`, this page also uses \`<Tip>\` and \`<Warning>\` for no source-driven reason), OR fails to use a pattern the example uses (e.g. example shows pricing in a \`<Info>\` callout but this page puts it in prose).
  → Penalize \`scannability\` by at least 1. Mandatory fix: "Match the example's MDX component palette. Add or remove callouts to match the example's per-section pattern."

- **Frontmatter shape drift**: page's frontmatter has different keys than the example's (extra keys, missing keys, different naming).
  → Penalize \`clarity\` by at least 1. Mandatory fix: "Make frontmatter keys match the example exactly."

- **\`<ApiReference>\` placement drift**: example places \`<ApiReference />\` at the top of the page, this page puts it at the bottom (or vice versa).
  → Penalize \`scannability\` by at least 1. Mandatory fix: "Move <ApiReference> to the same position relative to other H2s as in the example."

Important calibration: when the page has a section the example doesn't (because the target source has content the example resource doesn't), do NOT flag this as drift — it's expected. The same goes for sections the example has but this resource genuinely doesn't support.

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
- Use as many tokens as needed to inspect claims, but be selective about what you raise.
- Be exhaustive in your *inspection*, especially around defaults, constraints, supported values, behavior, pricing guidance, and Console capabilities.
- Prefer "unclear from source" over guessing.
- Flag anything unsupported, stale, ambiguous, or overstated.
- Check claims against the actual source files provided below.
- Source code wins over old docs text.
- If the draft makes a strong recommendation, verify that the recommendation does not rely on unsupported factual claims.
- For Console pages, verify behavior against console-app source rather than prose alone.
- Only flag issues where you have concrete evidence from the source files that the statement is wrong or unsupported. Do not flag speculative concerns.
- Return strict JSON only.

Issue selection rules (HARD — affects which issues you return):
- Return at most 8 issues. Quality over quantity. The writer can only meaningfully act on a handful.
- Rank by impact: high-severity first, then medium, then low. Drop low-severity nits if you already have 8 higher-impact issues.
- Merge near-duplicates. If three different claims share the same root problem (e.g. "uses a wrong term in three places"), raise it once with all three locations under a single \`statement\`.
- Skip stylistic preferences that don't change what the reader would do. Tone, wording polish, and section order belong to the reviewer, not you.
- An "issue" is something a writer must change. If a claim is correctly grounded but you'd phrase it differently, don't raise it.

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
- Invented cross-link routes — any markdown link \`[text](/foo/bar)\` whose target does not appear in the "Documentation pages" navigation index below. Raise as severity "high" with type "incorrect-claim".

Documentation-quality violations (raise as severity "medium" with type "missing-caveat" unless the omission would directly mislead the reader into choosing/configuring the wrong Stacktape feature):
- **Cherry-picked union variants.** A section documents ONE variant of a polymorphic property under an H2/H3 (e.g. "### Using a custom Dockerfile", "Fargate" as the only mode shown) without naming the other variants from the source's union type anywhere on the page. Evidence MUST cite the union type file + list the missing variants. Example evidence: "types/packaging.d.ts: ContainerWorkloadContainerPackaging union has 5 members — stacktape-buildpack, custom-dockerfile, prebuilt-image, nixpacks, external-buildpack. Draft only mentions custom-dockerfile."
- **Unequal variant depth.** A section names multiple variants but only one gets a code example or detailed treatment, while siblings get one-liner mentions. Evidence: cite the section + list which variants got examples and which didn't.

Page structure violations (raise as severity "high" with type "incorrect-claim"):
- **"When NOT to use" nested as H3 under "When to use".** These are PEER H2 sections — independent decisions for the reader. Nesting them breaks the TOC: "When NOT to use" disappears under a parent it doesn't belong to. Evidence: the draft contains \`### When NOT to use\` (three hashes). Fix: promote to \`## When NOT to use\`.
- **\`<ApiReference definitionName="..." />\` value missing the \`Props\` suffix or mismatching the page typeName.** The Stacktape config types are named with the \`Props\` suffix (e.g. \`WebServiceProps\`, \`ContainerWorkloadProps\`, \`LambdaFunctionProps\`). Writing \`ContainerWorkload\` instead of \`ContainerWorkloadProps\` makes the component render empty. Evidence: cite the page metadata's typeName + the draft's definitionName.

Documentation-quality violations (raise as severity "medium" with type "missing-caveat"):
- **Opt-in feature without decision support.** A section introduces an opt-in feature (CDN, custom domains, gradual deployments, sidecars, firewall, ARM, EC2 mode, etc.) but does NOT cover at least 3 of: when-to-enable, when-default-suffices, cost/tradeoff signal, opinion/recommendation. A 1-line definition followed only by a code example fails this. Evidence: quote the section's opening and note which decision-support elements are absent.
- **Unexplained tunable property value.** A code example sets a tunable property to a specific value (e.g. \`cloudfrontPriceClass: 'PriceClass_100'\`, \`instanceTypes: ['t3.medium']\`) and the surrounding prose does NOT explain what the property controls or what the alternatives are. Evidence: quote the property assignment + the surrounding prose showing the gap.
- **Section too brief.** A section consists only of one short paragraph + one code example (or worse, just a paragraph), with no tradeoff, no edge case, no cost context. The opening-paragraph AEO rule does NOT mean keep the rest brief. Evidence: quote the entire section showing the depth deficit.

General AWS knowledge exception (applies PAGE-WIDE, not just inside FAQ):

The new documentation-quality rules require the writer to provide decision support, per-variant tradeoffs, cost/tradeoff signals, and "when to use" guidance. These often require general AWS facts (service mechanics, pricing models, service limits, billing units, terminology) that are NOT in our source files — and that is expected and correct.

- Well-known general AWS facts MAY be used anywhere on the page without source-file grounding. Examples that DO NOT count as unsupported-claims:
  - "Lambda bills per million requests + GB-seconds of compute"
  - "Fargate bills per vCPU-hour and GB-hour"
  - "ALB has a base monthly fee plus per-LCU charges"
  - "ECS Fargate cold-start is typically 30-90 seconds"
  - "AWS Free Tier includes 1 million Lambda requests/month"
  - "Aurora Postgres is wire-compatible with vanilla Postgres"
  - "CloudFront has 600+ edge locations" (rough magnitude)
  - "RDS automated backups have a default 7-day retention"
- Recommendations and opinions ("most teams skip this", "enable for global APIs", "Fargate is fine until ~50% utilization 24/7") are guidance, not facts. Do NOT flag unless the recommendation directly contradicts documented Stacktape behavior.

What you DO flag (severity calibration):
- **High severity** — Stacktape-specific claims that contradict the source: a Stacktape property that doesn't exist; a default value that doesn't match the .d.ts; a Console UI flow that's not in console-app source; a CLI flag that's not in src/commands.
- **High severity** — Claims about Stacktape behavior with no source backing AND that would change what the reader configures (e.g. "Stacktape automatically retries failed Lambda invocations 5 times" — flag if not in source).
- **Do NOT use high severity** for wording that is technically imprecise but would not change configuration or behavior. Examples: quote/backtick formatting around enum values, saying a property "sets" a value when the source only says it "specifies" a value, or a sentence that can be narrowed without changing the reader's action. Use medium or low for these.
- **Medium severity** — Specific dollar prices that look obviously stale or wrong (e.g. "Lambda costs $0.0000002 per request" when current is different). Rough magnitudes ("around $10/month for a small task") are fine.
- **Medium severity** — AWS service limits or quotas that are obviously wrong (e.g. "Lambda max memory is 1GB" when it's actually 10GB).
- **Low severity** — Outdated AWS facts where the magnitude is right but the specifics drifted (e.g. region counts, edge location counts).
- **Do NOT flag** — AWS service mechanics, pricing models (without specific dollar amounts), billing units, terminology, general behavior, "when to choose X over Y" guidance.

In short: the verifier's job is to protect against Stacktape-specific drift, not to police general AWS knowledge. The writer is the SME on AWS context; you are the SME on whether the page accurately represents the Stacktape source.

MDX/component sanity checks (raise as severity "low" with type "ambiguous-claim" unless the provided source includes direct component-registry evidence):
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

Documentation pages (every route in the site — any cross-link in the draft pointing outside this list is an invented route):
${contextPack.navigationIndex}

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

// API completeness auditor — a separate pass that checks three things source-reading models are
// good at, complementing the source-grounding verifier (which checks claims) and the deterministic
// code-block-validator (which checks MDX shape):
//   1. API completeness — important properties from the source type that the draft never mentions
//   2. Union-variant coverage — variants from union types in source that the draft doesn't acknowledge
//   3. Code-example demonstrativeness — does each <CodeBlock> actually show what its section is about
//
// Returns the same VerifierIssue schema as the regular verifiers so issues feed into the same
// verifierResults array and pass/fail gate.
export const buildPageAuditorPrompt = ({ contextPack, draft }: { contextPack: ContextPack; draft: string }) => {
  return `${commonRules}

${contextPack.styleGuide ? `Project style guide and glossary (terminology canon):\n${contextPack.styleGuide}\n` : ''}

You are an API completeness auditor. You are NOT the factual verifier — another agent (source-grounding-verifier) already does that. Your role is to catch three classes of problem that factual verification misses:

═══════════════════════════════════════════════════
CHECK 1 — API completeness (important properties not documented)
═══════════════════════════════════════════════════

Read the page's primary type from the source files (page.typeName below). Walk its properties. Flag properties that:
- Are NOT mentioned anywhere in the draft (not in prose, not in a code example, not in a link)
- AND would reasonably be touched by 30%+ of users configuring this resource (frequently-used, important defaults, cost-relevant, security-relevant)

DO NOT flag:
- Internal/private properties (those starting with \`_\` or only used in advanced flows)
- Niche options that <10% of users touch
- Properties that the page deliberately defers to the API reference (the page has \`<ApiReference />\` for exhaustive coverage)

Threshold of "important" is judgment-based. Examples:
- For a web-service: \`packaging\`, \`resources\`, \`scaling\`, \`environment\`, \`connectTo\`, \`healthCheck\`, custom domains, load balancing mode — all important.
- For a web-service: \`logging.retentionDays\`, \`enableSpot\`, \`deployment.linearCanaryStepWeight\` — niche, OK to omit.

═══════════════════════════════════════════════════
CHECK 2 — Union-variant coverage (variants not acknowledged)
═══════════════════════════════════════════════════

For each property the draft documents that has a UNION TYPE in the source:
- Identify the union members from the source's .d.ts
- Verify ALL members are at least NAMED somewhere on the page (a deep dive on one + a one-liner mention of the others is fine)
- Flag any unmentioned variant

Examples of unions to check:
- Container packaging: stacktape-buildpack | custom-dockerfile | prebuilt-image | nixpacks | external-buildpack
- Lambda packaging: stacktape-buildpack | custom-artifact | language-specific
- Load balancing for web-service: http-api-gateway | application-load-balancer | network-load-balancer
- Database engines: postgres | mysql | mariadb | aurora-postgres | aurora-mysql | aurora-serverless-postgres | aurora-serverless-mysql | oracle | sql-server
- Trigger event types: HttpApiIntegration | ScheduleIntegration | SqsIntegration | SnsIntegration | etc.

A page that documents ONE variant under an H2/H3 section without naming the others on the page is misleading. The deterministic code-block-validator catches some of these via the union-type heuristic in prompts but not all — this is the LLM backstop.

═══════════════════════════════════════════════════
CHECK 3 — Code-example demonstrativeness
═══════════════════════════════════════════════════

For each \`<CodeBlock intellisense>\` example in the draft:
- Identify the section (closest preceding H2/H3) it sits in
- Verify the example actually demonstrates the section's topic. Patterns to flag:
  - A "Scaling" section showing an example with no scaling properties set
  - A "Side containers" section showing only a main container
  - A "Custom domains" section without \`customDomains\` property in the example
  - The same bare scaffold (just the resource + packaging) used across multiple opt-in sections without showing the property each section discusses
  - Examples missing focus markers when the section is about one specific property

A demonstrative example is the smallest realistic config that exercises the specific feature. If the section is about scaling, the example must set scaling properties. If the section is about CDN, the example must enable CDN.

═══════════════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════════════

Issue scope:
- Maximum 8 issues total across all three checks. Prioritize by user impact.
- API completeness misses are severity "medium" unless the missing property is essential for the resource's primary use case and its omission would mislead the reader into an unsafe or wrong configuration (then "high").
- Union-variant gaps are severity "medium" by default. Use "high" only when the page strongly implies one variant is the only supported option and that would change what the reader configures.
- Code-example weaknesses are severity "medium".
- Evidence is REQUIRED for high/medium issues. For API completeness: cite the source file + the property line. For union coverage: cite the union type. For code-example: cite the section heading + the relevant section of the code.

Page metadata:
- Route: /${contextPack.page.route}
- Kind: ${contextPack.page.kind}
- Primary typeName: ${contextPack.page.typeName || 'unknown'}
- Description: ${contextPack.page.shortDescription}

Human-maintained section instructions:
${renderSectionInstructions(contextPack)}

Documentation pages (every route in the site — for context only):
${contextPack.navigationIndex}

Draft page:
${draft}

Source files:
${renderSourceDocuments(contextPack)}

Configured source files that could not be read:
${renderMissingSourceFiles(contextPack)}

Return strict JSON with this shape:
{
  "summary": "...",
  "issues": [
    {
      "severity": "high|medium|low",
      "type": "missing-caveat|unsupported-claim|incorrect-claim|ambiguous-claim|stale-claim",
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
