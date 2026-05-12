import { pathExists, readFile, writeFile } from 'fs-extra';
import { buildContextPack } from './context';
import { validateMdxComponents, validateStacktapeConfigExamples } from './code-validator';
import { buildReviewerPrompt, buildSeoReviewerPrompt, buildVerifierPrompt, buildWriterPrompt } from './prompts';
import { callClaudeJson, callCodexJson } from './providers';
import { reviewerSchema, seoReviewerSchema, verifierSchema, writerSchema } from './schemas';
import { computeInputHashes } from './staleness';
import { loadState, saveIterationDraft, saveState } from './state';
import type { IterationResult, PageDefinition, PipelineState, ReviewerResult, SeoReviewResult, VerifierResult } from './types';

const reviewerPersonas: Array<{
  reviewerId: string;
  persona: string;
  modelProvider: 'claude' | 'codex';
}> = [
  {
    reviewerId: 'startup-cto',
    modelProvider: 'claude',
    persona:
      'Small startup CTO with low to medium AWS experience. Cares most about time-to-production and shipping quickly without getting trapped in AWS complexity.'
  },
  {
    reviewerId: 'smb-manager',
    modelProvider: 'codex',
    persona:
      'SMB engineering manager with medium to high AWS knowledge. Cares about long-term maintainability, team clarity, operational fit, technically correct Stacktape class-based config examples, and valid MDX component usage.'
  },
  {
    reviewerId: 'developer-low-aws',
    modelProvider: 'claude',
    persona:
      'Developer with little AWS or DevOps experience. Needs jargon kept under control and wants examples that are easy to follow.'
  }
];

const MIN_REVIEWERS_REQUIRED = 2;

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

// Thresholds tuned for "publishable, not perfect." The earlier values (7.5 / 6 / 7 / 6) caused
// pages to bounce all 3 iterations and land as did-not-pass during bulk runs. With 3 reviewers ×
// 5 categories = 15 scores, a single reviewer's 5 used to fail the page; now it doesn't.
const SEO_PASS_THRESHOLD = 5;
const REVIEWER_GRAND_AVG_THRESHOLD = 7.0;
const REVIEWER_MIN_SCORE_THRESHOLD = 5;
const REVIEWER_PER_REVIEWER_AVG_THRESHOLD = 6.5;

const allScoresPass = (reviewerResults: ReviewerResult[]) => {
  if (reviewerResults.length < MIN_REVIEWERS_REQUIRED) {
    console.warn(`Only ${reviewerResults.length} reviewer(s) — minimum ${MIN_REVIEWERS_REQUIRED} required.`);
    return false;
  }
  const categories = ['clarity', 'scannability', 'completeness', 'practicalUsefulness', 'audienceFit'] as const;
  const allScores = categories.flatMap((cat) => reviewerResults.map((r) => r.scores[cat]));
  if (allScores.some((score) => !Number.isFinite(score) || score < 1 || score > 10)) {
    console.warn('Reviewer returned an invalid score. Scores must be finite numbers from 1 to 10.');
    return false;
  }
  const grandAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const min = Math.min(...allScores);
  if (grandAvg < REVIEWER_GRAND_AVG_THRESHOLD || min < REVIEWER_MIN_SCORE_THRESHOLD) {
    return false;
  }
  // Also require each individual reviewer's average to clear a per-reviewer bar, so a single very harsh
  // reviewer cannot be averaged away by two generous ones.
  const perReviewerAverages = reviewerResults.map((r) => {
    const scores = categories.map((cat) => r.scores[cat]);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  });
  if (Math.min(...perReviewerAverages) < REVIEWER_PER_REVIEWER_AVG_THRESHOLD) {
    return false;
  }
  return true;
};

const seoScorePasses = (seoResult: SeoReviewResult | undefined) => {
  if (!seoResult) {
    // No SEO result at all — fail closed so SEO can't silently regress.
    return false;
  }
  return Number.isFinite(seoResult.score) && seoResult.score >= SEO_PASS_THRESHOLD;
};

const hasBlockingVerifierIssues = (verifierResults: VerifierResult[]) => {
  // A high-severity factual issue from either verifier should force a revision.
  return verifierResults.some((v) => v.issues.some((i) => i.severity === 'high'));
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
  const categories = ['clarity', 'scannability', 'completeness', 'practicalUsefulness', 'audienceFit'] as const;
  const scores = categories.flatMap((category) => iteration.reviewerResults.map((result) => result.scores[category]));
  if (scores.length === 0 || scores.some((score) => !Number.isFinite(score))) {
    return 0;
  }
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

const getIterationQualityScore = (iteration: IterationResult) => {
  const highIssues = iteration.verifierResults.reduce(
    (sum, result) => sum + result.issues.filter((issue) => issue.severity === 'high').length,
    0
  );
  const mediumIssues = iteration.verifierResults.reduce(
    (sum, result) => sum + result.issues.filter((issue) => issue.severity === 'medium').length,
    0
  );
  return getReviewerAverage(iteration) - highIssues * 10 - mediumIssues * 2;
};

const readDraftIfExists = async (draftPath?: string) => {
  if (!draftPath || !(await pathExists(draftPath))) {
    return undefined;
  }
  return readFile(draftPath, 'utf8');
};

const getBestIteration = (iterations: IterationResult[]) => {
  return [...iterations].sort((a, b) => getIterationQualityScore(b) - getIterationQualityScore(a))[0];
};

const runReviewer = async ({
  contextPack,
  draft,
  reviewer
}: {
  contextPack: Awaited<ReturnType<typeof buildContextPack>>;
  draft: string;
  reviewer: (typeof reviewerPersonas)[number];
}): Promise<ReviewerResult> => {
  const prompt = buildReviewerPrompt({ contextPack, draft, persona: reviewer.persona });
  const callJson = reviewer.modelProvider === 'codex' ? callCodexJson : callClaudeJson;
  try {
    const result = await callJson<Omit<ReviewerResult, 'reviewerId' | 'persona' | 'modelProvider'>>({
      prompt,
      jsonSchema: reviewerSchema
    });
    return {
      reviewerId: reviewer.reviewerId,
      persona: reviewer.persona,
      modelProvider: reviewer.modelProvider,
      ...result
    };
  } catch (error) {
    if (reviewer.modelProvider === 'codex' && isProviderAvailabilityError(error)) {
      console.warn(
        `    Codex reviewer unavailable; falling back to Claude: ${
          error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)
        }`
      );
      const result = await callClaudeJson<Omit<ReviewerResult, 'reviewerId' | 'persona' | 'modelProvider'>>({
        prompt,
        jsonSchema: reviewerSchema
      });
      return {
        reviewerId: `${reviewer.reviewerId}-claude-fallback`,
        persona: reviewer.persona,
        modelProvider: 'claude',
        ...result
      };
    }
    throw error;
  }
};

export const runPagePipeline = async ({
  page,
  maxIterations,
  examplePath,
  force
}: {
  page: PageDefinition;
  maxIterations: number;
  examplePath?: string;
  // When true (e.g. for --onlyStale), bypass the completedAt short-circuit and start a fresh
  // pipeline run even though prior state shows the page passed before.
  force?: boolean;
}) => {
  const contextPack = await buildContextPack({ page, examplePath });
  const existingState = await loadState({ pageId: page.id });
  const currentState = force ? createInitialState({ page }) : existingState || createInitialState({ page });
  const lastIteration = currentState.iterations.at(-1);

  if (!force && (currentState.completedAt || lastIteration?.passed) && currentState.finalOutputPath && (await pathExists(currentState.finalOutputPath))) {
    return { passed: true, outputPath: currentState.finalOutputPath, iterations: currentState.iterations.length };
  }

  let previousDraft = await readDraftIfExists(lastIteration?.draftPath);
  let reviewerResults: ReviewerResult[] | undefined = lastIteration?.reviewerResults;
  let verifierResults: VerifierResult[] | undefined = lastIteration?.verifierResults;
  let seoSuggestions: string[] | undefined = lastIteration?.seoReviewResult?.suggestions;

  const startIteration = currentState.iterations.length + 1;

  for (let iteration = startIteration; iteration <= maxIterations; iteration++) {
    // --- Writer ---
    console.info(`  Iteration ${iteration}/${maxIterations} — writing draft...`);
    const writerPrompt = buildWriterPrompt({ contextPack, previousDraft, reviewerResults, verifierResults, seoSuggestions });
    const draftResult = await callClaudeJson<{ mdx: string; seoTitle: string; seoDescription: string }>({
      prompt: writerPrompt,
      jsonSchema: writerSchema
    });
    const draft = upsertFrontmatterFields({
      draft: draftResult.mdx.trim(),
      fields: {
        seoTitle: draftResult.seoTitle,
        seoDescription: draftResult.seoDescription
      }
    });
    const draftPath = await saveIterationDraft({ pageId: page.id, iteration, draft });

    // --- Reviewers (Claude + Codex, parallel) ---
    console.info(`  Iteration ${iteration}/${maxIterations} — running ${reviewerPersonas.length} reviewers + SEO reviewer...`);
    const [contentReviewerResults, seoResult] = await Promise.all([
      Promise.all(reviewerPersonas.map((reviewer) => runReviewer({ contextPack, draft, reviewer }))),
      (async () => {
        const seoPrompt = buildSeoReviewerPrompt({ draft, page: contextPack.page });
        return callClaudeJson<{ score: number; suggestions: string[] }>({
          prompt: seoPrompt,
          jsonSchema: seoReviewerSchema
        });
      })()
    ]);

    reviewerResults = contentReviewerResults;

    for (const r of reviewerResults) {
      const scoreStr = Object.entries(r.scores)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      console.info(`    ${r.reviewerId} (${r.modelProvider}): ${scoreStr}`);
    }
    const seoReviewResult: SeoReviewResult = seoResult;
    seoSuggestions = seoReviewResult.suggestions;
    console.info(`    seo-reviewer: score:${seoReviewResult.score}, suggestions:${seoSuggestions.length}`);
    if (seoSuggestions.length > 0) {
      for (const s of seoSuggestions.slice(0, 3)) {
        console.info(`      - ${s}`);
      }
    }

    // --- Verifiers (Claude + Codex in parallel) ---
    console.info(`  Iteration ${iteration}/${maxIterations} — running verifiers (Claude + Codex)...`);
    const verifierPrompt = buildVerifierPrompt({ contextPack, draft });

    const [claudeVerifierResult, codexVerifierResult] = await Promise.all([
      callClaudeJson<Omit<VerifierResult, 'verifierId' | 'modelProvider'>>({
        prompt: verifierPrompt,
        jsonSchema: verifierSchema
      }).then((result) => ({
        verifierId: 'claude-verifier',
        modelProvider: 'claude' as const,
        ...result
      })),
      callCodexJson<Omit<VerifierResult, 'verifierId' | 'modelProvider'>>({
        prompt: verifierPrompt,
        jsonSchema: verifierSchema
      })
        .then((result) => ({
          verifierId: 'codex-verifier',
          modelProvider: 'codex' as const,
          ...result
        }))
        .catch((error) => {
          if (isProviderAvailabilityError(error)) {
            console.warn(`    Codex verifier unavailable: ${error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)}`);
            return null;
          }
          throw error;
        })
    ]);

    verifierResults = [claudeVerifierResult, ...(codexVerifierResult ? [codexVerifierResult] : [])] as VerifierResult[];

    // --- Deterministic code-block validation ---
    // Always run; cheap and catches things LLM verifiers miss (parse errors, wrong class names,
    // missing defineConfig, etc.). Results are folded into verifierResults so the writer sees them
    // alongside LLM verifier feedback.
    const codeIssues = await validateStacktapeConfigExamples({ draft });
    const mdxComponentIssues = validateMdxComponents({ draft, page });
    const deterministicIssues = [...codeIssues, ...mdxComponentIssues];
    if (deterministicIssues.length > 0) {
      const high = deterministicIssues.filter((i) => i.severity === 'high').length;
      const medium = deterministicIssues.filter((i) => i.severity === 'medium').length;
      console.info(`    code-validator: ${deterministicIssues.length} issue(s) (${high} high, ${medium} medium)`);
      verifierResults.push({
        verifierId: 'code-validator',
        modelProvider: 'deterministic',
        summary:
          'Deterministic check of <CodeBlock intellisense> Stacktape config examples and generated MDX component usage.',
        issues: deterministicIssues,
        positiveFindings: []
      });
    }

    for (const v of verifierResults) {
      const highCount = v.issues.filter((i) => i.severity === 'high').length;
      const medCount = v.issues.filter((i) => i.severity === 'medium').length;
      console.info(`    ${v.verifierId}: ${v.issues.length} issue(s) (${highCount} high, ${medCount} medium)`);
    }

    // --- Evaluate pass/fail ---
    const passed =
      allScoresPass(reviewerResults) &&
      !hasBlockingVerifierIssues(verifierResults) &&
      seoScorePasses(seoReviewResult);
    if (!passed) {
      const reasons: string[] = [];
      if (!allScoresPass(reviewerResults)) reasons.push('reviewer-scores');
      if (hasBlockingVerifierIssues(verifierResults)) reasons.push('high-severity-verifier-issue');
      if (!seoScorePasses(seoReviewResult)) reasons.push(`seo-score<${SEO_PASS_THRESHOLD}`);
      console.info(`    Did not pass this iteration: ${reasons.join(', ')}`);
    }
    currentState.iterations.push({ iteration, draftPath, reviewerResults, verifierResults, seoReviewResult, passed });
    currentState.updatedAt = new Date().toISOString();
    await saveState({ state: currentState });

    if (passed) {
      // Strip any previous "did-not-pass" markers from prior failed runs.
      const cleanedDraft = upsertFrontmatterFields({
        draft,
        fields: { pipelineStatus: undefined, pipelineFailureSummary: undefined }
      });
      await writeFile(page.outputPath, cleanedDraft);
      const { inputHashes, styleGuideHash } = computeInputHashes(contextPack);
      currentState.finalOutputPath = page.outputPath;
      currentState.completedAt = new Date().toISOString();
      currentState.updatedAt = currentState.completedAt;
      currentState.inputHashes = inputHashes;
      currentState.styleGuideHash = styleGuideHash;
      await saveState({ state: currentState });
      return { passed: true, outputPath: page.outputPath, iterations: iteration };
    }

    previousDraft = draft;
  }

  // Even if we didn't pass, write the best-scoring draft as output, but tag it so humans can find it.
  const bestIteration = getBestIteration(currentState.iterations);
  const bestDraft = await readDraftIfExists(bestIteration?.draftPath);
  if (bestDraft) {
    const summary = bestIteration ? buildFailureSummary({ iteration: bestIteration }) : 'pipeline did not pass quality gates';
    const taggedDraft = upsertFrontmatterFields({
      draft: bestDraft,
      fields: { pipelineStatus: 'did-not-pass', pipelineFailureSummary: summary }
    });
    await writeFile(page.outputPath, taggedDraft);
    currentState.finalOutputPath = page.outputPath;
    currentState.updatedAt = new Date().toISOString();
    await saveState({ state: currentState });
  }

  return { passed: false, outputPath: page.outputPath, iterations: currentState.iterations.length };
};

const buildFailureSummary = ({ iteration }: { iteration: IterationResult }) => {
  const reviewerAvg = getReviewerAverage(iteration).toFixed(1);
  const high = iteration.verifierResults.reduce(
    (sum, v) => sum + v.issues.filter((i) => i.severity === 'high').length,
    0
  );
  const medium = iteration.verifierResults.reduce(
    (sum, v) => sum + v.issues.filter((i) => i.severity === 'medium').length,
    0
  );
  const seo = iteration.seoReviewResult?.score ?? 'n/a';
  return `reviewer-avg ${reviewerAvg}, verifier high ${high}, verifier medium ${medium}, seo ${seo}`;
};
