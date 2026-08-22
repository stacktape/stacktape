/**
 * Exercise the real terminal init flow against a directory of complete local projects.
 *
 * Every immediate child of --projects-root is treated as one independently deployable project.
 * The projects stay reusable outside this repository while the JSON report captures all inferred
 * services, dependencies, deployment declarations, gaps, and generated Stacktape resources.
 */

import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { validateConfigYaml } from './code-generation/validate-config-string';
import {
  SYNTHETIC_PROJECT_EXPECTATIONS,
  type SyntheticProjectExpectation
} from './init-synthetic-project-corpus-expectations';

const rawArguments = process.argv.slice(2);
const argument = (name: string): string | undefined =>
  rawArguments.find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
const projectsRootArgument = argument('--projects-root');
const reportArgument = argument('--report');
const selected = new Set(
  rawArguments
    .filter((entry) => entry.startsWith('--case='))
    .flatMap((entry) => entry.slice('--case='.length).split(','))
    .filter(Boolean)
);

process.env.STP_DISABLE_TELEMETRY = '1';

type SyntheticCorpusResult = {
  id: string;
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
    buildCommand?: string;
    startCommand?: string;
    evidence: Array<{ file: string; line: number; quote: string }>;
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
  gaps: Array<{ subject: string; message: string }>;
  resources: Array<{ name: string; type: string }>;
  generatedConfig?: string;
  semanticChecks?: {
    validConfig: boolean;
    hasResources: boolean;
    recognizedUnsupported: boolean;
    noUnprovenLiveDependencies: boolean;
    exactContract: boolean;
  };
};

const sorted = (values: readonly string[]): string[] => [...values].sort((left, right) => left.localeCompare(right));

const exactContractFailures = ({
  expectation,
  resources,
  dependencies,
  services,
  deployments,
  gaps
}: {
  expectation: SyntheticProjectExpectation | undefined;
  resources: SyntheticCorpusResult['resources'];
  dependencies: SyntheticCorpusResult['dependencies'];
  services: SyntheticCorpusResult['services'];
  deployments: SyntheticCorpusResult['existingDeployments'];
  gaps: SyntheticCorpusResult['gaps'];
}): string[] => {
  if (expectation === undefined) return ['No release contract exists for this project.'];
  const failures: string[] = [];
  const resourceCounts: Record<string, number> = {};
  for (const resource of resources) resourceCounts[resource.type] = (resourceCounts[resource.type] ?? 0) + 1;
  const compare = (label: string, actual: unknown, expected: unknown): void => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(`${label} was ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}.`);
    }
  };
  compare(
    'Resource topology',
    Object.fromEntries(Object.entries(resourceCounts).sort()),
    Object.fromEntries(Object.entries(expectation.resources).sort())
  );
  compare('Dependency protocols', sorted(dependencies.map((entry) => entry.kind)), sorted(expectation.dependencies));
  compare('Deployable services', sorted(services.map((entry) => entry.name)), sorted(expectation.services));
  compare(
    'HTTP services',
    sorted(services.filter((entry) => entry.exposesHttp).map((entry) => entry.name)),
    sorted(expectation.httpServices)
  );
  compare('Deployment descriptors', sorted(deployments.map((entry) => entry.tool)), sorted(expectation.deployments));
  const gapText = gaps.map((gap) => gap.message).join('\n');
  for (const fragment of expectation.requiredGapFragments ?? []) {
    if (!gapText.includes(fragment)) failures.push(`Required gap text was missing: ${JSON.stringify(fragment)}.`);
  }
  for (const fragment of expectation.forbiddenGapFragments ?? []) {
    if (gapText.includes(fragment)) failures.push(`Forbidden gap text was present: ${JSON.stringify(fragment)}.`);
  }
  return failures;
};

const exerciseProject = async (sourceRoot: string, id: string): Promise<SyntheticCorpusResult> => {
  const started = performance.now();
  const output: string[] = [];
  const cleanupRoot = await mkdtemp(join(tmpdir(), 'stacktape-synthetic-corpus-'));
  const projectRoot = join(cleanupRoot, id);
  try {
    await cp(sourceRoot, projectRoot, {
      recursive: true,
      filter: (path) => !['.git', 'node_modules', '.venv', 'vendor', 'target', 'obj'].includes(basename(path))
    });
    const { runInit } = await import('../src/init/run-init');
    const outcome = await runInit({
      repositoryRoot: projectRoot,
      projectName: id,
      presentation: 'terminal',
      codingAgent: 'none',
      configFormat: 'yaml',
      onOutput: (line) => output.push(line)
    });
    const analysis = outcome.result;
    if (analysis === undefined || outcome.configFile === undefined) {
      throw new Error('The terminal init flow returned without analysis or a generated configuration.');
    }
    const generatedConfig = await readFile(outcome.configFile.path, 'utf8');
    const validation = validateConfigYaml(generatedConfig);
    const resources = Object.entries(analysis.composition.config.resources).map(([name, resource]) => ({
      name,
      type: resource.type
    }));
    const hasResources = resources.length > 0;
    const unprovenLiveDependencies = analysis.facts.dependencies.filter(
      (dependency) => dependency.currentlyHostedOn !== undefined
    );
    const noUnprovenLiveDependencies = unprovenLiveDependencies.length === 0;
    const tools = new Set(analysis.facts.existingDeployments.map((deployment) => deployment.tool));
    const recognizedUnsupported =
      !hasResources &&
      ((tools.has('cloudflare-workers') &&
        analysis.composition.gaps.some((gap) => gap.message.includes('cannot translate those APIs'))) ||
        (tools.has('pulumi') && analysis.composition.gaps.some((gap) => gap.message.includes('orphaned queues'))));
    const services = analysis.facts.services.map((service) => ({
      name: service.name,
      path: service.path,
      language: service.language,
      ...(service.framework === undefined ? {} : { framework: service.framework }),
      exposesHttp: service.exposesHttp,
      executionModel: service.executionModel,
      ...(service.processType === undefined ? {} : { processType: service.processType }),
      ...(service.buildCommand === undefined ? {} : { buildCommand: service.buildCommand }),
      ...(service.startCommand === undefined ? {} : { startCommand: service.startCommand }),
      evidence: service.evidence.map(({ file, line, quote }) => ({ file, line, quote }))
    }));
    const dependencies = analysis.facts.dependencies.map((dependency) => ({
      name: dependency.name,
      kind: dependency.kind,
      ...(dependency.currentlyHostedOn === undefined ? {} : { currentlyHostedOn: dependency.currentlyHostedOn }),
      ...(dependency.hostingEvidence === undefined ? {} : { hostingEvidence: dependency.hostingEvidence }),
      consumedBy: dependency.consumedBy,
      addressedBy: dependency.addressedBy
    }));
    const existingDeployments = analysis.facts.existingDeployments.map((deployment) => ({
      tool: deployment.tool,
      evidence: deployment.evidence.map((entry) => `${entry.file}:${entry.line}`).join(', ')
    }));
    const gaps = analysis.composition.gaps.map((gap) => ({ subject: gap.subject, message: gap.message }));
    const contractFailures = exactContractFailures({
      expectation: SYNTHETIC_PROJECT_EXPECTATIONS[id],
      resources,
      dependencies,
      services,
      deployments: existingDeployments,
      gaps
    });
    const exactContract = contractFailures.length === 0;
    const passed =
      validation.valid && (hasResources || recognizedUnsupported) && noUnprovenLiveDependencies && exactContract;
    return {
      id,
      durationMs: Math.round(performance.now() - started),
      passed,
      ...(!passed
        ? {
            failure: [
              ...(!hasResources && !recognizedUnsupported
                ? ['Init generated no resources without explaining why.']
                : []),
              ...(!noUnprovenLiveDependencies
                ? [
                    `Static files were treated as proof of live dependencies: ${unprovenLiveDependencies
                      .map((dependency) => `${dependency.name}=${dependency.currentlyHostedOn}`)
                      .join(', ')}.`
                  ]
                : []),
              ...validation.errors.map((error) => `${error.path}: ${error.message}`),
              ...contractFailures
            ].join(' ')
          }
        : {}),
      output,
      services,
      dependencies,
      existingDeployments,
      gaps,
      resources,
      generatedConfig,
      semanticChecks: {
        validConfig: validation.valid,
        hasResources,
        recognizedUnsupported,
        noUnprovenLiveDependencies,
        exactContract
      }
    };
  } catch (error) {
    return {
      id,
      durationMs: Math.round(performance.now() - started),
      passed: false,
      failure: error instanceof Error ? (error.stack ?? error.message) : String(error),
      output,
      services: [],
      dependencies: [],
      existingDeployments: [],
      gaps: [],
      resources: []
    };
  } finally {
    await rm(cleanupRoot, { recursive: true, force: true });
  }
};

const main = async (): Promise<void> => {
  if (projectsRootArgument === undefined) throw new Error('Pass --projects-root=<directory>.');
  const projectsRoot = resolve(projectsRootArgument);
  const entries = (await readdir(projectsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((id) => selected.size === 0 || selected.has(id))
    .sort();
  const unknown = [...selected].filter((id) => !entries.includes(id));
  if (unknown.length > 0) throw new Error(`Unknown synthetic corpus case(s): ${unknown.join(', ')}.`);
  if (entries.length === 0) throw new Error(`No project directories found in ${projectsRoot}.`);

  const results: SyntheticCorpusResult[] = [];
  for (const id of entries) {
    process.stderr.write(`\n[${results.length + 1}/${entries.length}] ${id}\n`);
    const result = await exerciseProject(join(projectsRoot, id), id);
    results.push(result);
    process.stderr.write(
      result.passed
        ? `  ${result.resources.length} resources, ${result.services.length} services, ${result.dependencies.length} dependencies (${result.durationMs}ms)\n`
        : `  FAILED: ${result.failure?.split('\n')[0]}\n`
    );
  }

  const report = `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      projectsRoot,
      passed: results.filter((entry) => entry.passed).length,
      failed: results.filter((entry) => !entry.passed).length,
      results
    },
    null,
    2
  )}\n`;
  if (reportArgument === undefined) process.stdout.write(report);
  else await writeFile(resolve(reportArgument), report, 'utf8');
  if (results.some((entry) => !entry.passed)) process.exitCode = 1;
};

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exitCode = 1;
});
