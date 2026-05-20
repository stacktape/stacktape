import { pathExists, readFile, writeFile } from 'fs-extra';
import { AGENT_IDS, getAgentModelAssignmentsForState, getModelNameForDisplay, resolveAgentModel } from './agent-models';
import { buildContextPack } from './context';
import {
  autoFormatStacktapeBlocksInDraft,
  validateMdxComponents,
  validateShellCommandBlocks,
  validateStacktapeConfigExamples
} from './code-validator';
import { buildPageAuditorPrompt, buildReviewerPrompt, buildVerifierPrompt, buildWriterPrompt } from './prompts';
import { callClaudeJson, callCodexJson } from './providers';
import { reviewerSchema, verifierSchema, writerSchema } from './schemas';
import { computeInputHashes } from './staleness';
import { loadState, saveIterationDraft, saveState } from './state';
import type {
  AgentModelConfig,
  AgentModelKey,
  AgentProvider,
  ContextPack,
  IterationResult,
  PageDefinition,
  PipelineState,
  PipelineOutcome,
  ReviewerResult,
  VerifierIssue,
  VerifierResult
} from './types';

const reviewerPersonas: Array<{
  reviewerId: string;
  modelKey: AgentModelKey;
  persona: string;
}> = [
  {
    reviewerId: AGENT_IDS.firstTimeUserReviewer,
    modelKey: 'firstTimeUserReviewer',
    persona:
      'Developer trying Stacktape for the first time. Low AWS experience. Wants to copy-paste a working example and ship something, then come back to the page when they need to extend it. Cares about: a clear path from "what is this" to "I have it running", absence of unexplained AWS jargon, a runnable example near the top, and confidence that the page is telling them everything they need to start. Does NOT care about exhaustive option coverage — that\'s what the API reference is for.'
  },
  {
    reviewerId: AGENT_IDS.productionEngineerReviewer,
    modelKey: 'productionEngineerReviewer',
    persona:
      'Engineer already shipping with Stacktape, looking up how to configure something correctly under real conditions. Cares about: accuracy of defaults, limits, and behavior under load; whether edge cases and failure modes are mentioned where relevant (scaling, security defaults, cost ceilings, rollback behavior); whether the page would mislead them when they reach production. Does NOT nitpick prose polish or MDX component choices — only flags things that change what they\'d configure.'
  },
  {
    reviewerId: AGENT_IDS.aiConsumerReviewer,
    modelKey: 'aiConsumerReviewer',
    persona:
      "AI answer engine, search index, or coding assistant reading this page to cite from it or extract a paragraph as a snippet. " +
      "This reviewer combines what was previously two lenses (LLM consumer + SEO/AEO) and is the only persona judging extractability. " +
      "Hard criteria — penalize each missing item by at least 1 point in the most relevant category:\n" +
      "1. **Answer-first paragraph.** The first paragraph (40-75 words) must answer 'what is this and why does it matter' in self-contained prose. No 'this guide will cover...' framing. AI Overviews extract this verbatim.\n" +
      "2. **Self-contained sections.** Every H2 section, when extracted alone, must make sense — its first paragraph defines the concept being discussed (e.g. 'A Stacktape web service can front traffic through CloudFront to cache...' not 'You can also enable a CDN'). Pronouns like 'this', 'it', 'the resource' that depend on surrounding context score worse.\n" +
      "3. **Explicit entity naming.** Say 'Stacktape web service' or 'a web service' — never just 'the service' or 'this resource'. Named entities anchor citations.\n" +
      "4. **Fact-dense, concrete.** Numbers, defaults, limits, supported values written as literals. 'Up to 16 vCPU and 120 GB memory' beats 'large resource limits'. Vague qualifiers ('fast', 'flexible', 'easy') are penalized.\n" +
      "5. **Tables for comparisons.** When the page compares options (engines, sizes, modes, packaging types), a table is preferred over prose — tables get cited 2-4x more often.\n" +
      "6. **Complete code examples.** No `<your-here>` / `// fill in` / `...` placeholders inside example bodies. The example must be copy-paste runnable as shown.\n" +
      "7. **Compact, descriptive headings.** Short noun-form H2s (Scaling, Networking) for navigation. Question-form H3s are allowed and welcome for FAQ-style subsections and common-question anchors. Avoid full-sentence H2s.\n" +
      "8. **FAQ section, broad scope.** Resource, reference, and concept pages SHOULD have an FAQ section, aiming for 8-10 Q&A pairs but accepting fewer when the page's scope doesn't yield that many distinct, useful questions. A narrow-scope page might have 4-6 strong FAQs; that's fine — quality over quota. Mix (a) Stacktape-specific questions, (b) use-case questions about the underlying AWS service (e.g. 'How much does ECS Fargate cost?'), and (c) choosing/comparison questions ('Web service vs Lambda?'). Penalize a Stacktape-only FAQ (it should cover what readers actually search for), and penalize FAQs padded with synthetic or near-duplicate questions just to hit a number. Do NOT penalize a smaller FAQ when the page's scope justifies it; do NOT penalize FAQ absence on pure narrative pages (Getting Started steps).\n" +
      "9. **Meta description suitability.** A clean 150-character summary should be derivable directly from the opening paragraph and frontmatter.\n" +
      "10. **No stripped pronouns / antecedent gaps.** A paragraph starting with 'This is configured by...' fails. Extracted paragraphs lose surrounding context — every paragraph should name what it's about up front.\n" +
      "11. **Union-type coverage discipline.** When a section documents a property that has multiple variants in the source's union type (packaging modes, compute engines, load balancer kinds, database engines, deployment strategies, trigger sources, etc.), all variants must be named somewhere on the page — not just the one being deep-dived. A page that has '### Using a custom Dockerfile' under Packaging without mentioning the four other packaging modes is misleading. Penalize heavily.\n" +
      "12. **Per-variant equal depth.** When a section covers multiple variants, each must be developed to roughly equivalent depth: code example per variant, tradeoffs per variant, cost/constraint context per variant. Enumeration without follow-through is not documentation. Example: a 'Compute resources' section that gives Fargate an example + cost table while EC2 gets two sentences fails this criterion.\n" +
      "13. **Decision support for opt-in features.** Sections introducing opt-ins (CDN, custom domains, gradual deployments, side containers, firewall, ARM, EC2 mode, warm pools, etc.) must help the reader DECIDE, not just CONFIGURE. Look for: when-to-enable (concrete scenario), when-default-suffices, cost/tradeoff signal, and an opinionated recommendation. A section that jumps from a 1-line definition to a code example without addressing these is a recipe, not a guide. Penalize as missing completeness AND practicalUsefulness.\n" +
      "14. **Unexplained tunable values.** Code examples that set specific tunable values (\\`cloudfrontPriceClass: 'PriceClass_100'\\`, \\`instanceTypes: ['t3.medium']\\`, \\`enableWarmPool: true\\`) need 1-2 sentences of prose explaining what the property controls and what the alternatives are. Otherwise the value reads as magic or required when it isn't.\n" +
      "15. **Section depth — AEO is about the first paragraph only.** The 40-75 word self-contained-snippet rule applies to the FIRST paragraph of each section. The rest of the section must develop the topic — examples, tradeoffs, cost, edge cases. Sections that consist of one short paragraph + one code example with no surrounding context are too brief and fail completeness, even if they look 'scannable'."
  }
];

const MIN_REVIEWERS_REQUIRED = 2;
const REVIEWER_SCORE_CATEGORIES = ['clarity', 'scannability', 'completeness', 'practicalUsefulness', 'audienceFit'] as const;
const CODE_BLOCK_VALIDATOR_ID = 'code-block-validator';

const isProviderAvailabilityError = (error: unknown) => {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    message.includes('usage limit') ||
    message.includes('upgrade to pro') ||
    message.includes('purchase more credits') ||
    message.includes('rate limit') ||
    message.includes('quota') ||
    // Codex-specific failure patterns we've observed in the wild:
    message.includes('codex unavailable') || // empty-output sentinel from providers.ts
    message.includes('requires a newer version') || // Codex CLI/model version mismatch
    message.includes("model requires") || // Codex model not supported
    message.includes('mcp client for') || // MCP server failure during Codex startup
    message.includes('failed to parse json response') // Codex returned malformed/empty output
  );
};

// Reviewer thresholds are intentionally softer than the factual/code gates. Reviewers guide quality
// and iteration, but a readable page with no hard factual/code blocker can become needs-human-review
// instead of bouncing forever on polish or AEO strictness.
const REVIEWER_GRAND_AVG_THRESHOLD = 7.0;
const REVIEWER_HUMAN_REVIEW_AVG_THRESHOLD = 6.5;
const REVIEWER_MIN_SCORE_THRESHOLD = 5;
const REVIEWER_PER_REVIEWER_AVG_THRESHOLD = 6.5;
const CODEX_REVIEWER_GRAND_AVG_THRESHOLD = 6.8;
const CODEX_REVIEWER_HUMAN_REVIEW_AVG_THRESHOLD = 6.0;
const CODEX_REVIEWER_PER_REVIEWER_AVG_THRESHOLD = 6.0;

type ReviewerScoreSummary = {
  valid: boolean;
  grandAvg: number;
  minScore: number;
  minReviewerAvg: number;
  strictPass: boolean;
  reason?: string;
};

const getReviewerScoreSummary = (reviewerResults: ReviewerResult[]): ReviewerScoreSummary => {
  if (reviewerResults.length < MIN_REVIEWERS_REQUIRED) {
    console.warn(`Only ${reviewerResults.length} reviewer(s) — minimum ${MIN_REVIEWERS_REQUIRED} required.`);
    return { valid: false, grandAvg: 0, minScore: 0, minReviewerAvg: 0, strictPass: false, reason: 'too-few-reviewers' };
  }
  const allScores = REVIEWER_SCORE_CATEGORIES.flatMap((cat) => reviewerResults.map((r) => r.scores[cat]));
  if (allScores.some((score) => !Number.isFinite(score) || score < 1 || score > 10)) {
    console.warn('Reviewer returned an invalid score. Scores must be finite numbers from 1 to 10.');
    return { valid: false, grandAvg: 0, minScore: 0, minReviewerAvg: 0, strictPass: false, reason: 'invalid-reviewer-score' };
  }
  const grandAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const min = Math.min(...allScores);
  const perReviewerAverages = reviewerResults.map((r) => {
    const scores = REVIEWER_SCORE_CATEGORIES.map((cat) => r.scores[cat]);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  });
  const minReviewerAvg = Math.min(...perReviewerAverages);
  const allCodexReviewers = reviewerResults.every((r) => r.modelProvider === 'codex');
  const grandAvgThreshold = allCodexReviewers ? CODEX_REVIEWER_GRAND_AVG_THRESHOLD : REVIEWER_GRAND_AVG_THRESHOLD;
  const perReviewerThreshold = allCodexReviewers
    ? CODEX_REVIEWER_PER_REVIEWER_AVG_THRESHOLD
    : REVIEWER_PER_REVIEWER_AVG_THRESHOLD;
  return {
    valid: true,
    grandAvg,
    minScore: min,
    minReviewerAvg,
    strictPass:
      grandAvg >= grandAvgThreshold &&
      min >= REVIEWER_MIN_SCORE_THRESHOLD &&
      minReviewerAvg >= perReviewerThreshold
  };
};

const isModelComponentValidationIssue = (issue: VerifierIssue) =>
  /<\s*(ApiReference|ReferenceableParams|CliCommandsApiReference|CodeBlock|PropertiesTable)\b/.test(issue.statement);

const isFactualIssueType = (issue: VerifierIssue) =>
  issue.type === 'incorrect-claim' || issue.type === 'unsupported-claim' || issue.type === 'stale-claim';

const isHardBlockingVerifierIssue = ({
  verifier,
  issue,
  sourceGroundingHasHardFactualIssue
}: {
  verifier: VerifierResult;
  issue: VerifierIssue;
  sourceGroundingHasHardFactualIssue: boolean;
}) => {
  if (issue.severity !== 'high') return false;
  if (verifier.modelProvider === 'deterministic') {
    return !/YAML tab/.test(issue.statement);
  }
  if (isModelComponentValidationIssue(issue)) {
    // Component validity is covered by the deterministic MDX validator. Model uncertainty here is
    // useful review context but should not overrule the component registry.
    return false;
  }
  if (verifier.verifierId === AGENT_IDS.sourceGroundingVerifier) {
    return isFactualIssueType(issue);
  }
  if (verifier.verifierId === AGENT_IDS.factualAccuracyVerifier) {
    if (!isFactualIssueType(issue)) return false;
    // Codex is useful as a broad factual critic, but in practice it overclassifies subtle
    // unsupported-wording concerns. In fully Codex-backed runs, require source-grounding to agree
    // before a factual-accuracy high blocks publication.
    if (verifier.modelProvider === 'codex') {
      return sourceGroundingHasHardFactualIssue;
    }
    return true;
  }
  return false;
};

const sourceGroundingHasHardFactualIssue = (verifierResults: VerifierResult[]) =>
  verifierResults.some(
    (verifier) =>
      verifier.verifierId === AGENT_IDS.sourceGroundingVerifier &&
      verifier.issues.some((issue) => issue.severity === 'high' && isFactualIssueType(issue) && !isModelComponentValidationIssue(issue))
  );

const countHardBlockingVerifierIssues = (verifierResults: VerifierResult[]) => {
  const sourceGroundingHard = sourceGroundingHasHardFactualIssue(verifierResults);
  return verifierResults.reduce(
    (sum, verifier) =>
      sum +
      verifier.issues.filter((issue) =>
        isHardBlockingVerifierIssue({ verifier, issue, sourceGroundingHasHardFactualIssue: sourceGroundingHard })
      ).length,
    0
  );
};

// Threshold for the final-iteration softening gate. At or above this reviewer grand-avg, the
// page is good enough for a human to polish — any remaining hard blockers route to
// needs-human-review instead of failed. Below this, the page truly isn't usable and we keep
// the `failed` outcome.
const SOFTEN_REVIEWER_AVG_THRESHOLD = 6.5;
// Catastrophic floor: below this reviewer grand-avg, the page is unusable regardless of verifier
// state. Routes to failed. Set low — the docs pipeline is intentionally lenient about polish; we
// only fail when reviewers actively dislike the draft.
const CATASTROPHIC_REVIEWER_AVG_THRESHOLD = 5.0;

const countAdvisoryHighVerifierIssues = (verifierResults: VerifierResult[]) => {
  const sourceGroundingHard = sourceGroundingHasHardFactualIssue(verifierResults);
  return verifierResults.reduce(
    (sum, verifier) =>
      sum +
      verifier.issues.filter(
        (issue) =>
          issue.severity === 'high' &&
          !isHardBlockingVerifierIssue({ verifier, issue, sourceGroundingHasHardFactualIssue: sourceGroundingHard })
      ).length,
    0
  );
};

const countMediumVerifierIssues = (verifierResults: VerifierResult[]) =>
  verifierResults.reduce((sum, verifier) => sum + verifier.issues.filter((issue) => issue.severity === 'medium').length, 0);

const evaluateIterationGate = ({
  reviewerResults,
  verifierResults,
  iteration,
  maxIterations
}: {
  reviewerResults: ReviewerResult[];
  verifierResults: VerifierResult[];
  iteration: number;
  maxIterations: number;
}): {
  status: PipelineOutcome;
  reviewerSummary: ReviewerScoreSummary;
  hardBlockers: number;
  advisoryHighs: number;
  advisoryIssues: number;
  reasons: string[];
} => {
  const reviewerSummary = getReviewerScoreSummary(reviewerResults);
  const hardBlockers = countHardBlockingVerifierIssues(verifierResults);
  const advisoryHighs = countAdvisoryHighVerifierIssues(verifierResults);
  const mediumIssues = countMediumVerifierIssues(verifierResults);
  const advisoryIssues = advisoryHighs + mediumIssues;
  const reasons: string[] = [];
  const isFinalIteration = iteration >= maxIterations;

  // Pipeline outcome policy (autonomous "good enough" mode):
  //   - passed                 → reviewer strict-pass AND no hard blockers
  //   - needs-human-review     → reviewer grand-avg ≥ SOFTEN threshold (6.5), regardless of hard
  //                              blockers. The page is usable; a human spot-checks the cited claims
  //                              before publish. This is the default fall-through after the final
  //                              iteration so the user never sees a `failed` page that's actually
  //                              fine.
  //   - failed                 → catastrophic: reviewer-invalid OR reviewer grand-avg < CATASTROPHIC
  //                              threshold (5.0). The page genuinely cannot be polished — needs a
  //                              fresh rewrite, not human review.
  //
  // Per-iteration fall-through:
  //   - On any iteration: if the draft strict-passes with no hard blockers, status = passed.
  //   - On iterations before the final: if reviewer-invalid OR catastrophic-low scores, fail
  //     early. Otherwise return needs-human-review only at the final iteration — earlier
  //     iterations should continue trying to converge.
  //   - We DO continue iterating when hard blockers exist on non-final iterations (writer gets
  //     another shot at fixing them). The skip-iter-3 heuristic outside this function still cuts
  //     the loop short on regression/stagnation.

  if (!reviewerSummary.valid) {
    reasons.push(reviewerSummary.reason || 'reviewer-scores-invalid');
    return { status: 'failed', reviewerSummary, hardBlockers, advisoryHighs, advisoryIssues, reasons };
  }

  if (reviewerSummary.grandAvg < CATASTROPHIC_REVIEWER_AVG_THRESHOLD) {
    reasons.push(`reviewer-avg-catastrophic:${reviewerSummary.grandAvg.toFixed(2)}`);
    return { status: 'failed', reviewerSummary, hardBlockers, advisoryHighs, advisoryIssues, reasons };
  }

  if (reviewerSummary.strictPass && hardBlockers === 0) {
    return { status: 'passed', reviewerSummary, hardBlockers, advisoryHighs, advisoryIssues, reasons };
  }

  if (!isFinalIteration) {
    // Keep iterating — the writer hasn't exhausted its budget.
    if (hardBlockers > 0) reasons.push(`hard-verifier-issue:${hardBlockers}`);
    if (!reviewerSummary.strictPass) reasons.push('reviewer-scores');
    if (advisoryHighs > 0) reasons.push(`advisory-high-verifier-issue:${advisoryHighs}`);
    if (mediumIssues > 0) reasons.push(`medium-verifier-issue:${mediumIssues}`);
    return { status: 'failed', reviewerSummary, hardBlockers, advisoryHighs, advisoryIssues, reasons };
  }

  // Final iteration with reviewer grand-avg ≥ SOFTEN threshold — soft-route to needs-human-review
  // even when hard blockers exist. The frontmatter pipelineReviewSummary surfaces the cited
  // issues so a human can spot-check.
  if (reviewerSummary.grandAvg >= SOFTEN_REVIEWER_AVG_THRESHOLD) {
    if (hardBlockers > 0) reasons.push(`final-iter-hard-blockers-soft-routed:${hardBlockers}`);
    if (!reviewerSummary.strictPass) reasons.push('reviewer-advisory');
    if (advisoryHighs > 0) reasons.push(`advisory-high-verifier-issue:${advisoryHighs}`);
    if (mediumIssues > 0) reasons.push(`medium-verifier-issue:${mediumIssues}`);
    return { status: 'needs-human-review', reviewerSummary, hardBlockers, advisoryHighs, advisoryIssues, reasons };
  }

  // Final iteration, reviewer avg in the [CATASTROPHIC, SOFTEN) band — not unusable, but not
  // good enough to ask a human to polish. Fail it; the user should re-run with prompt changes.
  reasons.push(`reviewer-avg-below-soft-route:${reviewerSummary.grandAvg.toFixed(2)}`);
  if (hardBlockers > 0) reasons.push(`hard-verifier-issue:${hardBlockers}`);
  return { status: 'failed', reviewerSummary, hardBlockers, advisoryHighs, advisoryIssues, reasons };
};

const createInitialState = ({ page }: { page: PageDefinition }): PipelineState => ({
  pageId: page.id,
  pageRoute: page.route,
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  iterations: []
});

const quoteYamlString = (value: string) => `'${value.replaceAll("'", "''")}'`;

const upsertFrontmatterFields = ({ draft, fields }: { draft: string; fields: Record<string, string | undefined> }) => {
  const fieldLines = Object.entries(fields)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${key}: ${quoteYamlString(value)}`);
  const hasRemovals = Object.values(fields).some((value) => value === undefined);
  if (fieldLines.length === 0 && !hasRemovals) {
    return draft;
  }

  const frontmatterMatch = draft.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    if (fieldLines.length === 0) {
      return draft;
    }
    return `---\n${fieldLines.join('\n')}\n---\n\n${draft}`;
  }

  const fieldNames = new Set(Object.keys(fields));
  const preservedFrontmatter = frontmatterMatch[1]
    .split(/\r?\n/)
    .filter((line) => !fieldNames.has(line.split(':')[0]?.trim()))
    .join('\n');
  const nextFrontmatter = [preservedFrontmatter, ...fieldLines].filter(Boolean).join('\n');
  return draft.replace(frontmatterMatch[0], `---\n${nextFrontmatter}\n---`);
};

const getReviewerAverage = (iteration: IterationResult) => {
  const scores = REVIEWER_SCORE_CATEGORIES.flatMap((category) => iteration.reviewerResults.map((result) => result.scores[category]));
  if (scores.length === 0 || scores.some((score) => !Number.isFinite(score))) {
    return 0;
  }
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

const getIterationQualityScore = (iteration: IterationResult) => {
  const hardIssues = countHardBlockingVerifierIssues(iteration.verifierResults);
  const advisoryHighIssues = countAdvisoryHighVerifierIssues(iteration.verifierResults);
  const mediumIssues = iteration.verifierResults.reduce(
    (sum, result) => sum + result.issues.filter((issue) => issue.severity === 'medium').length,
    0
  );
  return getReviewerAverage(iteration) - hardIssues * 10 - advisoryHighIssues * 3 - mediumIssues;
};

const readDraftIfExists = async (draftPath?: string) => {
  if (!draftPath || !(await pathExists(draftPath))) {
    return undefined;
  }
  return readFile(draftPath, 'utf8');
};

const callJsonWithProvider = async <T,>({
  provider,
  prompt,
  jsonSchema,
  model
}: {
  provider: AgentProvider;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  model?: string;
}) => {
  const callJson = provider === 'codex' ? callCodexJson : callClaudeJson;
  return callJson<T>({ prompt, jsonSchema, model });
};

const getBestIteration = (iterations: IterationResult[]) => {
  return [...iterations].sort((a, b) => getIterationQualityScore(b) - getIterationQualityScore(a))[0];
};

const countHighVerifierIssues = (iteration: IterationResult) => countHardBlockingVerifierIssues(iteration.verifierResults);

// Heuristic: decide whether iter 3 has any meaningful chance of fixing what iter 2 didn't.
// Returns true ("don't bother") when iter 2 either regressed below iter 1 or stagnated at
// roughly the same scores with the same blocker. Returns false when iter 2 showed real
// progress and iter 3 is worth trying.
const shouldSkipNextIteration = ({ iter1, iter2 }: { iter1: IterationResult; iter2: IterationResult }) => {
  const iter1Avg = getReviewerAverage(iter1);
  const iter2Avg = getReviewerAverage(iter2);
  const delta = iter2Avg - iter1Avg;
  const iter1High = countHighVerifierIssues(iter1);
  const iter2High = countHighVerifierIssues(iter2);
  // Regression: iter 2 scored noticeably worse than iter 1. Writer over-corrected. No point retrying.
  if (delta <= -0.3) return { skip: true, reason: `regression: iter2 avg ${iter2Avg.toFixed(2)} < iter1 avg ${iter1Avg.toFixed(2)}` };
  // Stagnation: scores moved less than 0.3 AND the high-severity issue count didn't drop. Iter 3
  // would land in the same place.
  if (Math.abs(delta) < 0.3 && iter2High >= iter1High) {
    return { skip: true, reason: `stagnation: avg delta ${delta.toFixed(2)}, high issues ${iter1High}→${iter2High}` };
  }
  return { skip: false, reason: '' };
};

const runReviewer = async ({
  contextPack,
  draft,
  reviewer,
  agentModels
}: {
  contextPack: ContextPack;
  draft: string;
  reviewer: (typeof reviewerPersonas)[number];
  agentModels: AgentModelConfig;
}): Promise<ReviewerResult> => {
  const prompt = buildReviewerPrompt({ contextPack, draft, persona: reviewer.persona });
  const agentModel = resolveAgentModel({ agentModels, key: reviewer.modelKey });
  const result = await callJsonWithProvider<Omit<ReviewerResult, 'reviewerId' | 'persona' | 'modelProvider'>>({
    provider: agentModel.provider,
    prompt,
    jsonSchema: reviewerSchema,
    model: agentModel.model
  });
  return {
    reviewerId: reviewer.reviewerId,
    persona: reviewer.persona,
    modelProvider: agentModel.provider,
    modelName: getModelNameForDisplay(agentModel.model),
    ...result
  };
};

const runModelVerifiers = async ({
  contextPack,
  draft,
  agentModels
}: {
  contextPack: ContextPack;
  draft: string;
  agentModels: AgentModelConfig;
}): Promise<VerifierResult[]> => {
  const verifierPrompt = buildVerifierPrompt({ contextPack, draft });
  const auditorPrompt = buildPageAuditorPrompt({ contextPack, draft });
  const factualAccuracyModel = resolveAgentModel({ agentModels, key: 'factualAccuracyVerifier' });
  const sourceGroundingModel = resolveAgentModel({ agentModels, key: 'sourceGroundingVerifier' });
  const apiCompletenessModel = resolveAgentModel({ agentModels, key: 'apiCompletenessAuditor' });

  const [factualAccuracyResult, sourceGroundingResult, apiCompletenessResult] = await Promise.all([
    callJsonWithProvider<Omit<VerifierResult, 'verifierId' | 'modelProvider'>>({
      provider: factualAccuracyModel.provider,
      prompt: verifierPrompt,
      jsonSchema: verifierSchema,
      model: factualAccuracyModel.model
    }).then((result) => ({
      verifierId: AGENT_IDS.factualAccuracyVerifier,
      modelProvider: factualAccuracyModel.provider,
      modelName: getModelNameForDisplay(factualAccuracyModel.model),
      ...result
    })),
    callJsonWithProvider<Omit<VerifierResult, 'verifierId' | 'modelProvider'>>({
      provider: sourceGroundingModel.provider,
      prompt: verifierPrompt,
      jsonSchema: verifierSchema,
      model: sourceGroundingModel.model
    })
      .then((result) => ({
        verifierId: AGENT_IDS.sourceGroundingVerifier,
        modelProvider: sourceGroundingModel.provider,
        modelName: getModelNameForDisplay(sourceGroundingModel.model),
        ...result
      }))
      .catch(async (error) => {
        if (sourceGroundingModel.provider === 'codex' && isProviderAvailabilityError(error)) {
          console.warn(
            `    ${AGENT_IDS.sourceGroundingVerifier} unavailable via Codex; falling back to Claude: ${
              error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)
            }`
          );
          const fallback = await callClaudeJson<Omit<VerifierResult, 'verifierId' | 'modelProvider'>>({
            prompt: verifierPrompt,
            jsonSchema: verifierSchema,
            model: factualAccuracyModel.provider === 'claude' ? factualAccuracyModel.model : undefined
          });
          return {
            verifierId: AGENT_IDS.sourceGroundingVerifier,
            modelProvider: 'claude' as const,
            modelName: `${getModelNameForDisplay(factualAccuracyModel.provider === 'claude' ? factualAccuracyModel.model : undefined)} fallback`,
            ...fallback
          };
        }
        throw error;
      }),
    callJsonWithProvider<Omit<VerifierResult, 'verifierId' | 'modelProvider'>>({
      provider: apiCompletenessModel.provider,
      prompt: auditorPrompt,
      jsonSchema: verifierSchema,
      model: apiCompletenessModel.model
    })
      .then((result) => ({
        verifierId: AGENT_IDS.apiCompletenessAuditor,
        modelProvider: apiCompletenessModel.provider,
        modelName: getModelNameForDisplay(apiCompletenessModel.model),
        ...result
      }))
      .catch((error) => {
        if (isProviderAvailabilityError(error)) {
          console.warn(
            `    ${AGENT_IDS.apiCompletenessAuditor} unavailable via Codex; skipping: ${
              error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)
            }`
          );
          return null;
        }
        throw error;
      })
  ]);

  return [factualAccuracyResult, sourceGroundingResult, ...(apiCompletenessResult ? [apiCompletenessResult] : [])];
};

const runDeterministicValidators = async ({
  draft,
  page
}: {
  draft: string;
  page: PageDefinition;
}): Promise<VerifierResult[]> => {
  const codeIssues = await validateStacktapeConfigExamples({ draft });
  const mdxComponentIssues = validateMdxComponents({ draft, page });
  const shellCommandIssues = validateShellCommandBlocks({ draft });
  const deterministicIssues = [...codeIssues, ...mdxComponentIssues, ...shellCommandIssues];
  if (deterministicIssues.length === 0) {
    return [];
  }
  return [
    {
      verifierId: CODE_BLOCK_VALIDATOR_ID,
      modelProvider: 'deterministic',
      modelName: 'local',
      summary:
        'Deterministic check of <CodeBlock intellisense> Stacktape config examples and generated MDX component usage.',
      issues: deterministicIssues,
      positiveFindings: []
    }
  ];
};

export const runPagePipeline = async ({
  page,
  maxIterations,
  examplePath,
  force,
  agentModels = {}
}: {
  page: PageDefinition;
  maxIterations: number;
  examplePath?: string;
  // When true (e.g. for --onlyStale), bypass the completedAt short-circuit and start a fresh
  // pipeline run even though prior state shows the page passed before.
  force?: boolean;
  // Optional model overrides per agent role. Prefix a value with `claude:` or `codex:` to
  // override the provider as well as the model.
  agentModels?: AgentModelConfig;
}) => {
  const contextPack = await buildContextPack({ page, examplePath });
  const existingState = await loadState({ pageId: page.id });
  const currentState = force ? createInitialState({ page }) : existingState || createInitialState({ page });
  // Preserve human feedback across full-restart runs. If the user spent time adding notes via
  // the /review UI, force=true (e.g. --onlyPage) should NOT silently drop them.
  if (force && existingState?.humanFeedback?.length) {
    currentState.humanFeedback = existingState.humanFeedback;
  }
  currentState.agentModelAssignments = getAgentModelAssignmentsForState(agentModels);
  const lastIteration = currentState.iterations.at(-1);

  if (!force && currentState.finalOutputPath && (await pathExists(currentState.finalOutputPath))) {
    if (currentState.completedAt || lastIteration?.passed || currentState.outcome === 'passed') {
      return { passed: true, outcome: 'passed' as const, outputPath: currentState.finalOutputPath, iterations: currentState.iterations.length };
    }
    if (currentState.outcome === 'needs-human-review') {
      return {
        passed: false,
        outcome: 'needs-human-review' as const,
        outputPath: currentState.finalOutputPath,
        iterations: currentState.iterations.length
      };
    }
  }

  let previousDraft = await readDraftIfExists(lastIteration?.draftPath);
  let reviewerResults: ReviewerResult[] | undefined = lastIteration?.reviewerResults;
  let verifierResults: VerifierResult[] | undefined = lastIteration?.verifierResults;

  const startIteration = currentState.iterations.length + 1;

  for (let iteration = startIteration; iteration <= maxIterations; iteration++) {
    // --- Writer ---
    console.info(
      `  Iteration ${iteration}/${maxIterations} — ${AGENT_IDS.writer} writing draft (${
        resolveAgentModel({ agentModels, key: 'writer' }).provider
      }, ${getModelNameForDisplay(resolveAgentModel({ agentModels, key: 'writer' }).model)})...`
    );
    const writerPrompt = buildWriterPrompt({
      contextPack,
      previousDraft,
      reviewerResults,
      verifierResults,
      humanFeedback: currentState.humanFeedback
    });
    const writerModel = resolveAgentModel({ agentModels, key: 'writer' });
    const draftResult = await callJsonWithProvider<{ mdx: string; seoTitle: string; seoDescription: string }>({
      provider: writerModel.provider,
      prompt: writerPrompt,
      jsonSchema: writerSchema,
      model: writerModel.model
    });
    let draft = upsertFrontmatterFields({
      draft: draftResult.mdx.trim(),
      fields: {
        seoTitle: draftResult.seoTitle,
        seoDescription: draftResult.seoDescription
      }
    });

    // Auto-format Stacktape config code blocks before reviewers see the draft. LLMs cannot
    // reliably emit Prettier-perfect code; the code-block-validator's prettier check is now a
    // low-severity safety net only.
    const formatResult = await autoFormatStacktapeBlocksInDraft(draft);
    if (formatResult.formattedBlockCount > 0) {
      console.info(`    auto-formatted ${formatResult.formattedBlockCount} Stacktape config block(s).`);
      draft = formatResult.draft;
    }

    const draftPath = await saveIterationDraft({ pageId: page.id, iteration, draft });

    // --- Reviewers (parallel; ai-consumer also handles SEO/AEO concerns) ---
    console.info(`  Iteration ${iteration}/${maxIterations} — running ${reviewerPersonas.length} reviewers...`);
    reviewerResults = await Promise.all(
      reviewerPersonas.map((reviewer) => runReviewer({ contextPack, draft, reviewer, agentModels }))
    );

    for (const r of reviewerResults) {
      const scoreStr = Object.entries(r.scores)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      console.info(`    ${r.reviewerId} (${r.modelProvider}, ${r.modelName}): ${scoreStr}`);
    }

    // --- Verifiers / auditors (parallel) ---
    // Three lenses running concurrently:
    //   - factual-accuracy-verifier: broad factual check
    //   - source-grounding-verifier: strict source-grounding check
    //   - api-completeness-auditor: API completeness + union variants + code-example demonstrativeness
    console.info(`  Iteration ${iteration}/${maxIterations} — running verifiers/auditors...`);
    verifierResults = await runModelVerifiers({ contextPack, draft, agentModels });

    // --- Deterministic code-block validation ---
    // Always run; cheap and catches things LLM verifiers miss (parse errors, wrong class names,
    // missing defineConfig, etc.). Results are folded into verifierResults so the writer sees them
    // alongside LLM verifier feedback.
    verifierResults.push(...(await runDeterministicValidators({ draft, page })));

    for (const v of verifierResults) {
      const highCount = v.issues.filter((i) => i.severity === 'high').length;
      const medCount = v.issues.filter((i) => i.severity === 'medium').length;
      console.info(
        `    ${v.verifierId} (${v.modelProvider}, ${v.modelName || 'n/a'}): ${v.issues.length} issue(s) (${highCount} high, ${medCount} medium)`
      );
    }

    // --- Evaluate pass/review/fail ---
    const gate = evaluateIterationGate({ reviewerResults, verifierResults, iteration, maxIterations });
    const passed = gate.status === 'passed';
    if (gate.status === 'failed') {
      console.info(`    Did not pass this iteration: ${gate.reasons.join(', ') || 'quality-gate'}`);
    } else if (gate.status === 'needs-human-review') {
      console.info(
        `    Accepted for human review: grand-avg ${gate.reviewerSummary.grandAvg.toFixed(2)}, advisory verifier issues ${gate.advisoryIssues}.`
      );
    }
    currentState.iterations.push({ iteration, draftPath, reviewerResults, verifierResults, status: gate.status, passed });
    currentState.updatedAt = new Date().toISOString();
    await saveState({ state: currentState });

    if (passed) {
      // Strip any previous pipeline-status markers from prior failed/review runs.
      const cleanedDraft = upsertFrontmatterFields({
        draft,
        fields: { pipelineStatus: undefined, pipelineFailureSummary: undefined, pipelineReviewSummary: undefined }
      });
      await writeFile(page.outputPath, cleanedDraft);
      const { inputHashes, styleGuideHash } = computeInputHashes(contextPack);
      currentState.finalOutputPath = page.outputPath;
      currentState.outcome = 'passed';
      currentState.pipelineStatus = undefined;
      currentState.pipelineFailureSummary = undefined;
      currentState.pipelineReviewSummary = undefined;
      currentState.completedAt = new Date().toISOString();
      currentState.updatedAt = currentState.completedAt;
      currentState.inputHashes = inputHashes;
      currentState.styleGuideHash = styleGuideHash;
      await saveState({ state: currentState });
      return { passed: true, outcome: 'passed' as const, outputPath: page.outputPath, iterations: iteration };
    }

    if (gate.status === 'needs-human-review') {
      const reviewSummary = buildQualitySummary({ iteration: currentState.iterations.at(-1)! });
      const reviewDraft = upsertFrontmatterFields({
        draft,
        fields: {
          pipelineStatus: 'needs-human-review',
          pipelineFailureSummary: undefined,
          pipelineReviewSummary: reviewSummary
        }
      });
      await writeFile(page.outputPath, reviewDraft);
      currentState.finalOutputPath = page.outputPath;
      currentState.outcome = 'needs-human-review';
      currentState.pipelineStatus = 'needs-human-review';
      currentState.pipelineFailureSummary = undefined;
      currentState.pipelineReviewSummary = reviewSummary;
      currentState.updatedAt = new Date().toISOString();
      await saveState({ state: currentState });
      return { passed: false, outcome: 'needs-human-review' as const, outputPath: page.outputPath, iterations: iteration };
    }

    // Iter-3 skip heuristic: if iter 2 regressed or stagnated vs iter 1, skip iter 3 (writer would
    // just over-correct again). Falls out of the loop and writes the best draft below with the
    // did-not-pass marker.
    if (iteration === 2 && currentState.iterations.length >= 2) {
      const [iter1, iter2] = currentState.iterations.slice(-2);
      const decision = shouldSkipNextIteration({ iter1, iter2 });
      if (decision.skip) {
        console.info(`    Skipping iter 3: ${decision.reason}`);
        break;
      }
    }

    previousDraft = draft;
  }

  // Even if we didn't pass during this run, write the best-scoring draft as output.
  // Re-evaluate the gate on the best iteration first: when a page exhausted its iteration budget
  // in a prior run but the gating policy has since relaxed (e.g. expanded soft-route), the best
  // draft may now qualify for `needs-human-review` instead of `failed`. This avoids burning fresh
  // CLI calls just to update the status of an already-written draft.
  const bestIteration = getBestIteration(currentState.iterations);
  const bestDraft = await readDraftIfExists(bestIteration?.draftPath);
  if (bestDraft && bestIteration) {
    const reEvaluation = evaluateIterationGate({
      reviewerResults: bestIteration.reviewerResults,
      verifierResults: bestIteration.verifierResults,
      iteration: maxIterations,
      maxIterations
    });
    if (reEvaluation.status === 'needs-human-review') {
      const reviewSummary = buildQualitySummary({ iteration: bestIteration });
      const reviewDraft = upsertFrontmatterFields({
        draft: bestDraft,
        fields: {
          pipelineStatus: 'needs-human-review',
          pipelineFailureSummary: undefined,
          pipelineReviewSummary: reviewSummary
        }
      });
      await writeFile(page.outputPath, reviewDraft);
      currentState.finalOutputPath = page.outputPath;
      currentState.outcome = 'needs-human-review';
      currentState.pipelineStatus = 'needs-human-review';
      currentState.pipelineFailureSummary = undefined;
      currentState.pipelineReviewSummary = reviewSummary;
      currentState.updatedAt = new Date().toISOString();
      await saveState({ state: currentState });
      console.info(`    Re-evaluated best iteration under current gate → needs-human-review.`);
      return {
        passed: false,
        outcome: 'needs-human-review' as const,
        outputPath: page.outputPath,
        iterations: currentState.iterations.length
      };
    }
  }
  if (bestDraft) {
    const summary = bestIteration ? buildQualitySummary({ iteration: bestIteration }) : 'pipeline did not pass quality gates';
    const taggedDraft = upsertFrontmatterFields({
      draft: bestDraft,
      fields: { pipelineStatus: 'did-not-pass', pipelineFailureSummary: summary, pipelineReviewSummary: undefined }
    });
    await writeFile(page.outputPath, taggedDraft);
    currentState.finalOutputPath = page.outputPath;
    currentState.outcome = 'failed';
    currentState.pipelineStatus = 'did-not-pass';
    currentState.pipelineFailureSummary = summary;
    currentState.pipelineReviewSummary = undefined;
    currentState.updatedAt = new Date().toISOString();
    await saveState({ state: currentState });
  }

  return { passed: false, outcome: 'failed' as const, outputPath: page.outputPath, iterations: currentState.iterations.length };
};

const buildQualitySummary = ({ iteration }: { iteration: IterationResult }) => {
  const reviewerAvg = getReviewerAverage(iteration).toFixed(1);
  const hard = countHardBlockingVerifierIssues(iteration.verifierResults);
  const advisoryHigh = countAdvisoryHighVerifierIssues(iteration.verifierResults);
  const medium = iteration.verifierResults.reduce(
    (sum, v) => sum + v.issues.filter((i) => i.severity === 'medium').length,
    0
  );
  return `reviewer-avg ${reviewerAvg}, hard blockers ${hard}, advisory high ${advisoryHigh}, verifier medium ${medium}`;
};
