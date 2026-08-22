/**
 * Run the real `stacktape init` terminal flow against pinned public repositories.
 *
 * This is intentionally an opt-in network test rather than part of `pnpm test`: it clones upstream
 * repositories and is therefore slower and less available than the distilled local regressions.
 * Each project is copied to a fresh temporary directory before init writes anything, so the cached
 * checkout remains an exact copy of its pinned commit.
 */

import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import {
  REAL_PROJECT_APPLICATION_STRESS_CASES,
  REAL_PROJECT_CORPUS,
  REAL_PROJECT_PLATFORM_STRESS_CASES,
  type RealProjectCorpusCase
} from './init-real-project-corpus-cases';
import { validateConfigYaml } from './code-generation/validate-config-string';

type CorpusResult = {
  id: string;
  repository: string;
  commit: string;
  subdirectory?: string;
  source: RealProjectCorpusCase['source'];
  exercises: readonly string[];
  durationMs: number;
  passed: boolean;
  failure?: string;
  output: string[];
  services: Array<{
    name: string;
    path: string;
    language: string;
    framework?: string;
    exposesHttp: boolean;
    executionModel: string;
    processType?: string;
    startCommand?: string;
    containerEntrypoint?: string;
    functionEntrypoint?: string;
    dockerfile?: string;
  }>;
  dependencies: Array<{
    name: string;
    kind: string;
    currentlyHostedOn?: string;
    hostingEvidence?: string;
    consumedBy: string[];
    addressedBy: string[];
  }>;
  existingDeployments: Array<{ tool: string; evidence: string }>;
  decisions: Array<{ id: string; kind: string; chosen: string }>;
  gaps: Array<{ subject: string; message: string }>;
  resources: Array<{ name: string; type: string }>;
  generatedConfig?: string;
  semanticChecks?: { validConfig: boolean; assertions: number; failures: string[] };
};

const rawArguments = process.argv.slice(2);
const args = new Map(
  rawArguments.map((argument) => {
    const separator = argument.indexOf('=');
    return separator === -1 ? [argument, 'true'] : [argument.slice(0, separator), argument.slice(separator + 1)];
  })
);

const suppliedCorpusRoot = args.get('--corpus-root');
const reportPath = args.get('--report');
const selected = new Set(
  rawArguments
    .filter((argument) => argument.startsWith('--case='))
    .flatMap((argument) => argument.slice('--case='.length).split(','))
    .filter(Boolean)
);
const keepWorkdirs = args.has('--keep-workdirs');
const stressMode = args.has('--stress');
const allMode = args.has('--all');
const discoveryMode = args.has('--discover') || stressMode || allMode;

// This corpus is a release check, not a product session. It must never emit analytics.
process.env.STP_DISABLE_TELEMETRY = '1';

const run = async (command: string[], cwd: string): Promise<string> => {
  const process = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited
  ]);
  if (exitCode !== 0) {
    throw new Error(`${command.join(' ')} failed (${exitCode}): ${stderr.trim() || stdout.trim()}`);
  }
  return stdout.trim();
};

const checkoutName = (repository: string): string => basename(repository, '.git');

const ensureCheckout = async (corpusRoot: string, corpusCase: RealProjectCorpusCase): Promise<string> => {
  const path = join(corpusRoot, checkoutName(corpusCase.repository));
  if (!existsSync(join(path, '.git'))) {
    await run(['git', 'clone', '--no-checkout', '--filter=blob:none', corpusCase.repository, path], corpusRoot);
  }
  const current = await run(['git', 'rev-parse', 'HEAD'], path).catch(() => '');
  if (current !== corpusCase.commit) {
    await run(['git', 'fetch', '--depth', '1', 'origin', corpusCase.commit], path);
  }
  // A fresh --no-checkout clone still reports the remote default commit as HEAD even though its
  // index and worktree are empty. Check the index as well so a new corpus entry cannot silently
  // exercise an empty directory.
  const trackedFiles = await run(['git', 'ls-files'], path).catch(() => '');
  if (current !== corpusCase.commit || trackedFiles.length === 0) {
    await run(['git', 'checkout', '--force', '--detach', corpusCase.commit], path);
  }
  const resolved = await run(['git', 'rev-parse', 'HEAD'], path);
  if (resolved !== corpusCase.commit) {
    throw new Error(`Expected ${corpusCase.commit}, checked out ${resolved}.`);
  }
  return path;
};

const copyProject = async (
  checkout: string,
  corpusCase: RealProjectCorpusCase
): Promise<{ projectRoot: string; cleanupRoot: string }> => {
  const cleanupRoot = await mkdtemp(join(tmpdir(), 'stacktape-real-corpus-'));
  // Keep the repository basename deterministic. Several probes use it as the fallback service name,
  // and random mkdtemp suffixes would make a release corpus pass or fail for the wrong reason.
  const projectRoot = join(cleanupRoot, corpusCase.id);
  const source = corpusCase.subdirectory === undefined ? checkout : join(checkout, corpusCase.subdirectory);
  if (!existsSync(source)) throw new Error(`Upstream project directory does not exist: ${source}`);
  await cp(source, projectRoot, {
    recursive: true,
    filter: (path) => basename(path) !== '.git' && basename(path) !== 'node_modules'
  });
  return { projectRoot, cleanupRoot };
};

const countBy = <Item>(items: readonly Item[], keyOf: (item: Item) => string): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyOf(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

const describeCounts = (counts: Readonly<Record<string, number>>): string =>
  Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}=${count}`)
    .join(', ') || '(none)';

const assertExactCounts = ({
  label,
  expected,
  actual,
  failures
}: {
  label: string;
  expected: Readonly<Record<string, number>>;
  actual: Readonly<Record<string, number>>;
  failures: string[];
}): number => {
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  const matches = [...keys].every((key) => (expected[key] ?? 0) === (actual[key] ?? 0));
  if (!matches) failures.push(`${label}: expected ${describeCounts(expected)}; got ${describeCounts(actual)}.`);
  return 1;
};

const validateSemantics = (corpusCase: RealProjectCorpusCase, result: CorpusResult): CorpusResult['semanticChecks'] => {
  const failures: string[] = [];
  let assertions = 0;
  const expected = corpusCase.expect;
  const generatedConfig = result.generatedConfig ?? '';

  assertions += assertExactCounts({
    label: 'resource types',
    expected: expected.resourceTypes,
    actual: countBy(result.resources, (resource) => resource.type),
    failures
  });
  assertions += assertExactCounts({
    label: 'dependency kinds',
    expected: expected.dependencyKinds ?? {},
    actual: countBy(result.dependencies, (dependency) => dependency.kind),
    failures
  });

  assertions += 1;
  if (result.services.length !== expected.serviceCount) {
    failures.push(`service count: expected ${expected.serviceCount}; got ${result.services.length}.`);
  }
  assertions += 1;
  const httpServiceCount = result.services.filter((service) => service.exposesHttp).length;
  if (httpServiceCount !== expected.httpServiceCount) {
    failures.push(`HTTP service count: expected ${expected.httpServiceCount}; got ${httpServiceCount}.`);
  }

  assertions += 1;
  const expectedDeployments = [...(expected.existingDeployments ?? [])].sort();
  const actualDeployments = result.existingDeployments.map((deployment) => deployment.tool).sort();
  if (expectedDeployments.join('\0') !== actualDeployments.join('\0')) {
    failures.push(
      `deployment declarations: expected ${expectedDeployments.join(', ') || '(none)'}; got ${actualDeployments.join(', ') || '(none)'}.`
    );
  }

  for (const text of expected.requiredConfig ?? []) {
    assertions += 1;
    if (!generatedConfig.includes(text)) failures.push(`generated config is missing ${JSON.stringify(text)}.`);
  }
  for (const text of expected.forbiddenConfig ?? []) {
    assertions += 1;
    if (generatedConfig.includes(text))
      failures.push(`generated config unexpectedly contains ${JSON.stringify(text)}.`);
  }

  const gapText = result.gaps.map((gap) => `${gap.subject}: ${gap.message}`);
  for (const pattern of expected.requiredGapPatterns ?? []) {
    assertions += 1;
    const expression = new RegExp(pattern, 'i');
    if (!gapText.some((gap) => expression.test(gap))) failures.push(`no gap matches /${pattern}/i.`);
  }
  for (const pattern of expected.forbiddenGapPatterns ?? []) {
    assertions += 1;
    const expression = new RegExp(pattern, 'i');
    const matching = gapText.find((gap) => expression.test(gap));
    if (matching !== undefined) failures.push(`gap unexpectedly matches /${pattern}/i: ${matching}`);
  }

  if (expected.forbidCurrentlyHostedDependencies === true) {
    assertions += 1;
    const claimedLive = result.dependencies.filter((dependency) => dependency.currentlyHostedOn !== undefined);
    if (claimedLive.length > 0) {
      failures.push(
        `static project files were treated as proof of live dependencies: ${claimedLive
          .map((dependency) => `${dependency.name}=${dependency.currentlyHostedOn}`)
          .join(', ')}.`
      );
    }
  }

  const configValidation = validateConfigYaml(generatedConfig);
  assertions += 1;
  if (!configValidation.valid) {
    failures.push(
      `generated YAML fails the real Stacktape schema: ${configValidation.errors
        .map((error) => `${error.path}: ${error.message}`)
        .join('; ')}`
    );
  }

  return { validConfig: configValidation.valid, assertions, failures };
};

const summarise = async (corpusCase: RealProjectCorpusCase, checkout: string): Promise<CorpusResult> => {
  const started = performance.now();
  const output: string[] = [];
  let workRoot: string | undefined;
  let cleanupRoot: string | undefined;
  try {
    const copied = await copyProject(checkout, corpusCase);
    workRoot = copied.projectRoot;
    cleanupRoot = copied.cleanupRoot;
    // Dynamic so STP_DISABLE_TELEMETRY is set before the CLI config module is evaluated.
    const { runInit } = await import('../src/init/run-init');
    const outcome = await runInit({
      repositoryRoot: workRoot,
      projectName: corpusCase.id,
      presentation: 'terminal',
      codingAgent: 'none',
      configFormat: 'yaml',
      onOutput: (line) => output.push(line)
    });
    const result = outcome.result;
    if (result === undefined || outcome.configFile === undefined) {
      throw new Error('The terminal init flow returned without analysis or a generated configuration.');
    }
    const generatedConfig = await readFile(outcome.configFile.path, 'utf8');
    const resources = Object.entries(result.composition.config.resources).map(([name, resource]) => ({
      name,
      type: resource.type
    }));
    if (resources.length === 0) throw new Error('Init completed but generated no resources.');

    const summary: CorpusResult = {
      id: corpusCase.id,
      repository: corpusCase.repository,
      commit: corpusCase.commit,
      ...(corpusCase.subdirectory === undefined ? {} : { subdirectory: corpusCase.subdirectory }),
      source: corpusCase.source,
      exercises: corpusCase.exercises,
      durationMs: Math.round(performance.now() - started),
      passed: true,
      output,
      services: result.facts.services.map((service) => ({
        name: service.name,
        path: service.path,
        language: service.language,
        ...(service.framework === undefined ? {} : { framework: service.framework }),
        exposesHttp: service.exposesHttp,
        executionModel: service.executionModel,
        ...(service.processType === undefined ? {} : { processType: service.processType }),
        ...(service.startCommand === undefined ? {} : { startCommand: service.startCommand }),
        ...(service.containerEntrypoint === undefined ? {} : { containerEntrypoint: service.containerEntrypoint }),
        ...(service.functionEntrypoint === undefined ? {} : { functionEntrypoint: service.functionEntrypoint }),
        ...(service.dockerfile === undefined ? {} : { dockerfile: service.dockerfile })
      })),
      dependencies: result.facts.dependencies.map((dependency) => ({
        name: dependency.name,
        kind: dependency.kind,
        ...(dependency.currentlyHostedOn === undefined ? {} : { currentlyHostedOn: dependency.currentlyHostedOn }),
        ...(dependency.hostingEvidence === undefined ? {} : { hostingEvidence: dependency.hostingEvidence }),
        consumedBy: dependency.consumedBy,
        addressedBy: dependency.addressedBy
      })),
      existingDeployments: result.facts.existingDeployments.map((deployment) => ({
        tool: deployment.tool,
        evidence: deployment.evidence.map((entry) => `${entry.file}:${entry.line}`).join(', ')
      })),
      decisions: result.composition.assumptions.map((decision) => ({
        id: decision.id,
        kind: decision.kind,
        chosen: decision.chosen
      })),
      gaps: result.composition.gaps.map((gap) => ({ subject: gap.subject, message: gap.message })),
      resources,
      generatedConfig
    };
    const semanticChecks = discoveryMode
      ? {
          validConfig: true,
          assertions: 1,
          failures: result.facts.dependencies.some((dependency) => dependency.currentlyHostedOn !== undefined)
            ? ['Static project files were treated as proof of live dependencies.']
            : []
        }
      : validateSemantics(corpusCase, summary);
    return semanticChecks.failures.length === 0
      ? { ...summary, semanticChecks }
      : {
          ...summary,
          passed: false,
          failure: `Semantic E2E assertions failed:\n${semanticChecks.failures.map((failure) => `- ${failure}`).join('\n')}`,
          semanticChecks
        };
  } catch (error) {
    return {
      id: corpusCase.id,
      repository: corpusCase.repository,
      commit: corpusCase.commit,
      ...(corpusCase.subdirectory === undefined ? {} : { subdirectory: corpusCase.subdirectory }),
      source: corpusCase.source,
      exercises: corpusCase.exercises,
      durationMs: Math.round(performance.now() - started),
      passed: false,
      failure: error instanceof Error ? (error.stack ?? error.message) : String(error),
      output,
      services: [],
      dependencies: [],
      existingDeployments: [],
      decisions: [],
      gaps: [],
      resources: []
    };
  } finally {
    if (cleanupRoot !== undefined && !keepWorkdirs) await rm(cleanupRoot, { recursive: true, force: true });
    if (workRoot !== undefined && keepWorkdirs) output.push(`Kept isolated project at ${workRoot}`);
  }
};

const main = async (): Promise<void> => {
  const temporaryCorpusRoot =
    suppliedCorpusRoot === undefined ? await mkdtemp(join(tmpdir(), 'stacktape-real-corpus-')) : undefined;
  const corpusRoot = resolve(suppliedCorpusRoot ?? temporaryCorpusRoot!);
  await mkdir(corpusRoot, { recursive: true });
  const stressCases = [...REAL_PROJECT_PLATFORM_STRESS_CASES, ...REAL_PROJECT_APPLICATION_STRESS_CASES];
  const defaultCases = allMode
    ? [...REAL_PROJECT_CORPUS, ...stressCases]
    : stressMode
      ? stressCases
      : REAL_PROJECT_CORPUS;
  const allKnownCases = [...REAL_PROJECT_CORPUS, ...stressCases];
  const cases = selected.size === 0 ? defaultCases : allKnownCases.filter((entry) => selected.has(entry.id));
  if (cases.length === 0) throw new Error(`No corpus case matched --case=${[...selected].join(',')}.`);
  const unknownCases = [...selected].filter((id) => !cases.some((entry) => entry.id === id));
  if (unknownCases.length > 0) throw new Error(`Unknown corpus case(s): ${unknownCases.join(', ')}.`);

  const results: CorpusResult[] = [];
  try {
    for (const corpusCase of cases) {
      process.stderr.write(`\n[${results.length + 1}/${cases.length}] ${corpusCase.id}\n`);
      const checkout = await ensureCheckout(corpusRoot, corpusCase);
      const result = await summarise(corpusCase, checkout);
      results.push(result);
      process.stderr.write(
        result.passed
          ? `  ${result.resources.length} resources, ${result.semanticChecks?.assertions ?? 0} semantic assertions, ${result.decisions.length} decisions, ${result.gaps.length} gaps (${result.durationMs}ms)\n`
          : `  FAILED: ${result.failure?.split('\n')[0]}\n`
      );
    }
  } finally {
    if (temporaryCorpusRoot !== undefined) await rm(temporaryCorpusRoot, { recursive: true, force: true });
  }

  const report = `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: discoveryMode ? 'discovery' : 'release-contract',
      tier: allMode ? 'all' : stressMode ? 'stress' : 'release',
      passed: results.filter((entry) => entry.passed).length,
      failed: results.filter((entry) => !entry.passed).length,
      results
    },
    null,
    2
  )}\n`;
  if (reportPath === undefined) process.stdout.write(report);
  else await Bun.write(resolve(reportPath), report);
  if (results.some((entry) => !entry.passed)) process.exitCode = 1;
};

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exitCode = 1;
});
