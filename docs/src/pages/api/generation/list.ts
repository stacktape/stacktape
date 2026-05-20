import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';

const STATE_DIR = join(process.cwd(), 'scripts', 'generate-docs', '.state');

// A state file is considered "in-progress" if its updatedAt is within this window AND it has
// no completedAt. The pipeline writes saveState after every reviewer / verifier batch, so an
// active run touches its file every minute or so — 5 minutes is a safe heuristic.
const ACTIVE_WINDOW_MS = 5 * 60_000;

type Iteration = {
  iteration: number;
  passed: boolean;
  status?: 'passed' | 'needs-human-review' | 'failed';
  draftPath: string;
  reviewerResults: Array<{ scores: Record<string, number> }>;
  verifierResults: Array<{
    verifierId: string;
    modelProvider: string;
    issues: Array<{ severity: 'high' | 'medium' | 'low'; type?: string; statement?: string }>;
  }>;
};

type PipelineState = {
  pageId: string;
  pageRoute: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  iterations: Iteration[];
  outcome?: 'passed' | 'needs-human-review' | 'failed';
  finalOutputPath?: string;
};

export type GenerationSummary = {
  pageId: string;
  pageRoute: string;
  status: 'passed' | 'needs-human-review' | 'in-progress' | 'failed' | 'unknown';
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  iterationCount: number;
  reviewerAvg: number | null;
  highIssues: number;
  hardIssues: number;
  advisoryHighIssues: number;
  mediumIssues: number;
  finalOutputPath: string | null;
};

const isModelComponentValidationIssue = (issue: { statement?: string }) =>
  /<\s*(ApiReference|ReferenceableParams|CliCommandsApiReference|CodeBlock|PropertiesTable)\b/.test(issue.statement || '');

const isHardBlockingIssue = (
  verifier: Iteration['verifierResults'][number],
  issue: Iteration['verifierResults'][number]['issues'][number],
  sourceGroundingHasHardFactualIssue: boolean
) => {
  if (issue.severity !== 'high') return false;
  if (verifier.modelProvider === 'deterministic') {
    return !/YAML tab/.test(issue.statement || '');
  }
  if (isModelComponentValidationIssue(issue)) return false;
  if (verifier.verifierId === 'source-grounding-verifier') {
    return issue.type === 'incorrect-claim' || issue.type === 'unsupported-claim' || issue.type === 'stale-claim';
  }
  if (verifier.verifierId === 'factual-accuracy-verifier') {
    if (!(issue.type === 'incorrect-claim' || issue.type === 'unsupported-claim' || issue.type === 'stale-claim')) return false;
    return verifier.modelProvider === 'codex' ? sourceGroundingHasHardFactualIssue : true;
  }
  return false;
};

const summarize = (state: PipelineState): GenerationSummary => {
  const now = Date.now();
  const updatedAtMs = new Date(state.updatedAt).getTime();
  const isActive = !state.completedAt && now - updatedAtMs < ACTIVE_WINDOW_MS;
  let status: GenerationSummary['status'];
  if (state.completedAt || state.outcome === 'passed') status = 'passed';
  else if (state.outcome === 'needs-human-review' || state.iterations.at(-1)?.status === 'needs-human-review') {
    status = 'needs-human-review';
  } else if (isActive) status = 'in-progress';
  else if (state.iterations.length > 0) status = 'failed';
  else status = 'unknown';

  const lastIter = state.iterations.at(-1);
  const reviewerAvg =
    lastIter && lastIter.reviewerResults.length
      ? Number(
          (
            lastIter.reviewerResults
              .flatMap((r) => Object.values(r.scores))
              .reduce((a, b) => a + b, 0) /
            (lastIter.reviewerResults.length * 5)
          ).toFixed(2)
        )
      : null;
  const highIssues = lastIter
    ? lastIter.verifierResults.reduce((s, v) => s + v.issues.filter((i) => i.severity === 'high').length, 0)
    : 0;
  const sourceGroundingHard =
    lastIter?.verifierResults.some(
      (v) =>
        v.verifierId === 'source-grounding-verifier' &&
        v.issues.some(
          (i) =>
            i.severity === 'high' &&
            (i.type === 'incorrect-claim' || i.type === 'unsupported-claim' || i.type === 'stale-claim') &&
            !isModelComponentValidationIssue(i)
        )
    ) || false;
  const hardIssues = lastIter
    ? lastIter.verifierResults.reduce((s, v) => s + v.issues.filter((i) => isHardBlockingIssue(v, i, sourceGroundingHard)).length, 0)
    : 0;
  const advisoryHighIssues = highIssues - hardIssues;
  const mediumIssues = lastIter
    ? lastIter.verifierResults.reduce((s, v) => s + v.issues.filter((i) => i.severity === 'medium').length, 0)
    : 0;

  return {
    pageId: state.pageId,
    pageRoute: state.pageRoute,
    status,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
    completedAt: state.completedAt ?? null,
    iterationCount: state.iterations.length,
    reviewerAvg,
    highIssues,
    hardIssues,
    advisoryHighIssues,
    mediumIssues,
    finalOutputPath: state.finalOutputPath ?? null
  };
};

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!existsSync(STATE_DIR)) {
      return res.status(200).json({ pages: [] });
    }
    const entries = await readdir(STATE_DIR);
    const stateFiles = entries.filter((e) => e.endsWith('.json'));
    const results: GenerationSummary[] = [];
    for (const file of stateFiles) {
      try {
        const raw = await readFile(join(STATE_DIR, file), 'utf8');
        const state: PipelineState = JSON.parse(raw);
        results.push(summarize(state));
      } catch {
        // Skip malformed state files — the dashboard shouldn't fail because one file is corrupt.
      }
    }
    results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ pages: results });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
