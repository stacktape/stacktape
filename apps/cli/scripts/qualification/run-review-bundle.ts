import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildReviewBundle, writeReviewBundle } from './review-bundle';
import { outputTail, redactOutput } from './process';

const rootDirectory = resolve(import.meta.dir, '..', '..', '..', '..');
const invocationDirectory = resolve(process.env.INIT_CWD ?? process.cwd());

const errorText = (error: unknown) =>
  outputTail(redactOutput(error instanceof Error ? (error.stack ?? error.message) : String(error)), 12_000);

const help = `Stacktape qualification review bundle generator

Usage:
  pnpm qualify:review-bundle -- --handoff=<path> [options]

Options:
  --handoff=<path>          Worker campaign handoff JSON file (required)
  --pre-fix-report=<path>   Override pre-fix qualification report path
  --post-fix-report=<path>  Override post-fix qualification report path
  --base-commit=<sha>       Override base Git commit SHA
  --final-commit=<sha>      Override final Git commit SHA (defaults to HEAD if not specified)
  --output-dir=<path>       Output directory for review bundle JSON and Markdown (default: .stacktape/qualification/<run>)
  --allow-dirty             Allow dirty working tree (records critical risk flag instead of failing closed)
  --help                    Show this help
`;

const main = async () => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      handoff: { type: 'string' },
      'pre-fix-report': { type: 'string' },
      'post-fix-report': { type: 'string' },
      'base-commit': { type: 'string' },
      'final-commit': { type: 'string' },
      'worktree-root': { type: 'string' },
      'output-dir': { type: 'string' },
      'allow-dirty': { type: 'boolean' },
      help: { type: 'boolean' }
    },
    strict: true,
    allowPositionals: false
  });

  if (values.help) {
    process.stdout.write(help);
    return;
  }

  if (!values.handoff) {
    throw new Error('Missing required argument: --handoff=<path>. Use --help for usage instructions.');
  }

  const handoffPath = resolve(invocationDirectory, values.handoff);
  const preFixReport = values['pre-fix-report'] ? resolve(invocationDirectory, values['pre-fix-report']) : undefined;
  const postFixReport = values['post-fix-report'] ? resolve(invocationDirectory, values['post-fix-report']) : undefined;
  const worktreeRoot = values['worktree-root'] ? resolve(invocationDirectory, values['worktree-root']) : rootDirectory;

  const bundle = await buildReviewBundle({
    handoff: handoffPath,
    preFixReport,
    postFixReport,
    baseCommit: values['base-commit'],
    finalCommit: values['final-commit'],
    worktreeRoot,
    allowDirty: values['allow-dirty']
  });

  const outputDirectory = resolve(
    invocationDirectory,
    values['output-dir'] ?? join(rootDirectory, '.stacktape', 'qualification', bundle.bundleId)
  );

  await mkdir(outputDirectory, { recursive: true });
  const { jsonPath, markdownPath } = await writeReviewBundle(outputDirectory, bundle);

  process.stdout.write(
    `${JSON.stringify(
      {
        verdict: bundle.reviewerSummary.verdict,
        campaignId: bundle.reviewerSummary.campaignId,
        bundleId: bundle.bundleId,
        jsonPath,
        markdownPath,
        fixedCases: bundle.qualificationEvidence.fixedCaseIds,
        regressedCases: bundle.qualificationEvidence.regressedCaseIds,
        riskFlagsCount: bundle.reviewerSummary.riskFlagsCount,
        criticalOrHighRiskCount: bundle.reviewerSummary.criticalOrHighRiskCount
      },
      null,
      2
    )}\n`
  );

  if (bundle.reviewerSummary.verdict === 'rejected') {
    process.exitCode = 1;
  }
};

if (import.meta.main) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${errorText(error)}\n`);
    process.exitCode = 1;
  });
}
