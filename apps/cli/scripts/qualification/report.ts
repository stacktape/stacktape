import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { QualificationCaseResult, QualificationReport, QualificationStep } from './contracts';

const escapeTableCell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');

const formatDuration = (durationMs: number) => {
  if (durationMs < 1_000) return `${durationMs}ms`;
  const seconds = Math.round(durationMs / 100) / 10;
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

const stepTable = (steps: readonly QualificationStep[]) => {
  if (steps.length === 0) return '_None._';
  return [
    '| Step | Status | Duration | Result |',
    '| --- | --- | ---: | --- |',
    ...steps.map(
      (step) =>
        `| ${step.name} | ${step.status} | ${formatDuration(step.durationMs)} | ${escapeTableCell(step.summary)} |`
    )
  ].join('\n');
};

const failureDetails = (entry: QualificationCaseResult) => {
  const failedSteps = entry.steps.filter((step) => step.status === 'failed');
  if (failedSteps.length === 0) return '';
  return [
    `### ${entry.id}`,
    '',
    ...failedSteps.flatMap((step) => [
      `- **${step.name}:** ${step.failure?.message ?? step.summary}`,
      ...(step.reproductionCommand === undefined ? [] : [`- Reproduce: \`${step.reproductionCommand}\``]),
      ...(step.failure?.outputTail === undefined
        ? []
        : ['', '```text', step.failure.outputTail.replaceAll('```', '``\\`'), '```'])
    ]),
    ''
  ].join('\n');
};

const globalFailureDetails = (steps: readonly QualificationStep[]) =>
  steps
    .filter((step) => step.status === 'failed')
    .flatMap((step) => [
      `### ${step.name}`,
      '',
      `- **Failure:** ${step.failure?.message ?? step.summary}`,
      ...(step.reproductionCommand === undefined ? [] : [`- Reproduce: \`${step.reproductionCommand}\``]),
      ...(step.failure?.outputTail === undefined
        ? []
        : ['', '```text', step.failure.outputTail.replaceAll('```', '``\\`'), '```']),
      ''
    ]);

export const renderQualificationReport = (report: QualificationReport) => {
  const caseRows = report.cases.map((entry) => {
    const failedLanes = entry.steps.filter((step) => step.status === 'failed').map((step) => step.name);
    return `| ${entry.id} | ${entry.status} | ${entry.execution} | ${formatDuration(entry.durationMs)} | ${
      failedLanes.join(', ') || '—'
    } | ${escapeTableCell(entry.tags.join(', '))} |`;
  });

  return `${[
    '# Stacktape project qualification report',
    '',
    `- Run: \`${report.runId}\``,
    `- Product commit: \`${report.productCommit}\``,
    `- Product fingerprint: \`${report.productFingerprint}\``,
    `- Generated: ${report.generatedAt}`,
    `- Lanes: ${report.lanes.join(', ')}`,
    `- Environment: ${report.environment.platform}/${report.environment.architecture}; Bun ${report.environment.bun}; Node ${report.environment.node}${
      report.environment.docker === undefined ? '' : `; Docker ${report.environment.docker}`
    }`,
    '',
    `**Result:** ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped in ${formatDuration(
      report.summary.durationMs
    )}.`,
    '',
    '## Run-wide lanes',
    '',
    stepTable(report.globalSteps),
    '',
    '## Projects',
    '',
    '| Project | Status | Execution | Duration | Failed lanes | Coverage tags |',
    '| --- | --- | --- | ---: | --- | --- |',
    ...caseRows,
    '',
    ...(report.summary.failed === 0
      ? []
      : [
          '## Failures and reproduction',
          '',
          ...globalFailureDetails(report.globalSteps),
          ...report.cases.map(failureDetails).filter(Boolean)
        ])
  ].join('\n')}\n`;
};

export const writeJsonAtomic = async (path: string, value: unknown) => {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.partial-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
};

export const writeQualificationReport = async (outputDirectory: string, report: QualificationReport) => {
  const jsonPath = join(outputDirectory, 'qualification-report.json');
  const markdownPath = join(outputDirectory, 'qualification-report.md');
  await writeJsonAtomic(jsonPath, report);
  await writeFile(markdownPath, renderQualificationReport(report), 'utf8');
  return { jsonPath, markdownPath };
};
