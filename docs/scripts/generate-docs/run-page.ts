import { writeFile } from 'fs-extra';
import { buildContextPack } from './context';
import { buildReviewerPrompt, buildSeoReviewerPrompt, buildVerifierPrompt, buildWriterPrompt } from './prompts';
import { callClaudeJson, callCodexJson } from './providers';
import { reviewerSchema, seoReviewerSchema, verifierSchema, writerSchema } from './schemas';
import { loadState, saveIterationDraft, saveState } from './state';
import type { PageDefinition, PipelineState, ReviewerResult, VerifierResult } from './types';

const reviewerPersonas = [
  {
    reviewerId: 'startup-cto',
    persona:
      'Small startup CTO with low to medium AWS experience. Cares most about time-to-production and shipping quickly without getting trapped in AWS complexity.'
  },
  {
    reviewerId: 'smb-manager',
    persona:
      'SMB engineering manager with medium to high AWS knowledge. Cares about long-term maintainability, team clarity, and operational fit.'
  },
  {
    reviewerId: 'developer-low-aws',
    persona:
      'Developer with little AWS or DevOps experience. Needs jargon kept under control and wants examples that are easy to follow.'
  }
];

const MIN_REVIEWERS_REQUIRED = 2;

const isProviderAvailabilityError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('usage limit') ||
    message.includes('Upgrade to Pro') ||
    message.includes('purchase more credits') ||
    message.includes('rate limit') ||
    message.includes('quota')
  );
};

const allScoresPass = (reviewerResults: ReviewerResult[]) => {
  if (reviewerResults.length < MIN_REVIEWERS_REQUIRED) {
    console.warn(`Only ${reviewerResults.length} reviewer(s) — minimum ${MIN_REVIEWERS_REQUIRED} required.`);
    return false;
  }
  const categories = ['clarity', 'scannability', 'completeness', 'practicalUsefulness', 'audienceFit'] as const;
  // Grand average across all reviewers and all categories must be >= 7.5
  const allScores = categories.flatMap((cat) => reviewerResults.map((r) => r.scores[cat]));
  const grandAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  // No individual score below 5 (hard floor — truly bad content)
  const min = Math.min(...allScores);
  if (grandAvg < 7.5 || min < 5) {
    return false;
  }
  return true;
};

const hasBlockingVerifierIssues = (verifierResults: VerifierResult[]) => {
  // Only block if BOTH verifiers flag high issues, or if the sole verifier (when Codex is unavailable) flags high issues
  const highIssueCounts = verifierResults.map((v) => v.issues.filter((i) => i.severity === 'high').length);
  if (verifierResults.length === 1) {
    // Only Claude ran — block on 2+ high issues (single high could be a false positive)
    return highIssueCounts[0] >= 2;
  }
  // Both ran — block only if both found high issues (cross-model agreement)
  return highIssueCounts.every((count) => count > 0);
};

const createInitialState = ({ page }: { page: PageDefinition }): PipelineState => ({
  pageId: page.id,
  pageRoute: page.route,
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  iterations: []
});

export const runPagePipeline = async ({ page, maxIterations }: { page: PageDefinition; maxIterations: number }) => {
  const contextPack = await buildContextPack({ page });
  const currentState = (await loadState({ pageId: page.id })) || createInitialState({ page });
  let previousDraft = currentState.iterations.at(-1) ? await Bun.file(currentState.iterations.at(-1)!.draftPath).text() : undefined;
  let reviewerResults: ReviewerResult[] | undefined;
  let verifierResults: VerifierResult[] | undefined;
  let seoSuggestions: string[] | undefined;

  const startIteration = currentState.iterations.length + 1;

  for (let iteration = startIteration; iteration <= maxIterations; iteration++) {
    // --- Writer ---
    console.info(`  Iteration ${iteration}/${maxIterations} — writing draft...`);
    const writerPrompt = buildWriterPrompt({ contextPack, previousDraft, reviewerResults, verifierResults, seoSuggestions });
    const draftResult = await callClaudeJson<{ mdx: string; seoTitle: string; seoDescription: string }>({
      prompt: writerPrompt,
      jsonSchema: writerSchema
    });
    // Inject SEO fields into frontmatter if the writer returned them
    let draft = draftResult.mdx.trim();
    if (draftResult.seoTitle || draftResult.seoDescription) {
      const frontmatterEnd = draft.indexOf('---', 4);
      if (frontmatterEnd > 0) {
        const before = draft.slice(0, frontmatterEnd);
        const after = draft.slice(frontmatterEnd);
        const seoFields = [
          draftResult.seoTitle ? `seoTitle: '${draftResult.seoTitle.replaceAll("'", "''")}'` : '',
          draftResult.seoDescription ? `seoDescription: '${draftResult.seoDescription.replaceAll("'", "''")}'` : ''
        ]
          .filter(Boolean)
          .join('\n');
        draft = `${before}${seoFields}\n${after}`;
      }
    }
    const draftPath = await saveIterationDraft({ pageId: page.id, iteration, draft });

    // --- Reviewers (Claude, parallel) ---
    console.info(`  Iteration ${iteration}/${maxIterations} — running ${reviewerPersonas.length} reviewers + SEO reviewer...`);
    const [contentReviewerResults, seoResult] = await Promise.all([
      Promise.all(
        reviewerPersonas.map(async (reviewer) => {
          const prompt = buildReviewerPrompt({ contextPack, draft, persona: reviewer.persona });
          const result = await callClaudeJson<Omit<ReviewerResult, 'reviewerId' | 'persona' | 'modelProvider'>>({
            prompt,
            jsonSchema: reviewerSchema
          });
          return {
            reviewerId: reviewer.reviewerId,
            persona: reviewer.persona,
            modelProvider: 'claude' as const,
            ...result
          } satisfies ReviewerResult;
        })
      ),
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
      console.info(`    ${r.reviewerId}: ${scoreStr}`);
    }
    seoSuggestions = seoResult.suggestions;
    console.info(`    seo-reviewer: score:${seoResult.score}, suggestions:${seoSuggestions.length}`);
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

    for (const v of verifierResults) {
      const highCount = v.issues.filter((i) => i.severity === 'high').length;
      const medCount = v.issues.filter((i) => i.severity === 'medium').length;
      console.info(`    ${v.verifierId}: ${v.issues.length} issue(s) (${highCount} high, ${medCount} medium)`);
    }

    // --- Evaluate pass/fail ---
    const passed = allScoresPass(reviewerResults) && !hasBlockingVerifierIssues(verifierResults);
    currentState.iterations.push({ iteration, draftPath, reviewerResults, verifierResults, passed });
    currentState.updatedAt = new Date().toISOString();
    await saveState({ state: currentState });

    if (passed) {
      await writeFile(page.outputPath, draft);
      currentState.finalOutputPath = page.outputPath;
      currentState.completedAt = new Date().toISOString();
      currentState.updatedAt = currentState.completedAt;
      await saveState({ state: currentState });
      return { passed: true, outputPath: page.outputPath, iterations: iteration };
    }

    previousDraft = draft;
  }

  // Even if we didn't pass, write the best draft as output
  if (previousDraft) {
    await writeFile(page.outputPath, previousDraft);
  }

  return { passed: false, outputPath: page.outputPath, iterations: maxIterations };
};
