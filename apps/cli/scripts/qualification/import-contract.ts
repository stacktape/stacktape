import { readFile } from 'node:fs/promises';
import { validateConfigYaml } from '../code-generation/validate-config-string';
import type { QualificationCaseManifest } from './contracts';
import { redactOutput } from './process';

type Countable = { type?: string; kind?: string };

export type ImportQualification = {
  configPath: string;
  generatedConfig: string;
  validConfig: boolean;
  failures: string[];
  details: Record<string, unknown>;
};

const countBy = (items: readonly Countable[], property: 'type' | 'kind'): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = item[property];
    if (key !== undefined) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

const describeCounts = (counts: Readonly<Record<string, number>>) =>
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
}) => {
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  if ([...keys].some((key) => (expected[key] ?? 0) !== (actual[key] ?? 0))) {
    failures.push(`${label}: expected ${describeCounts(expected)}; got ${describeCounts(actual)}.`);
  }
};

export const runImportQualification = async ({
  entry,
  projectRoot,
  projectName = entry.id
}: {
  entry: QualificationCaseManifest;
  projectRoot: string;
  projectName?: string;
}): Promise<ImportQualification> => {
  const output: string[] = [];
  // Dynamic so the runner can disable telemetry before the CLI config module is evaluated.
  const { runInit } = await import('../../src/init/run-init');
  const outcome = await runInit({
    repositoryRoot: projectRoot,
    projectName,
    presentation: 'terminal',
    codingAgent: 'none',
    configFormat: 'yaml',
    // Qualification must not send a public project's inferred configuration to Stacktape's pricing API.
    estimateCost: async () => undefined,
    onOutput: (line) => output.push(line)
  });
  const result = outcome.result;
  if (result === undefined || outcome.configFile === undefined) {
    throw new Error('The terminal init flow returned without analysis or a generated configuration.');
  }

  const configPath = outcome.configFile.path;
  const generatedConfig = await readFile(configPath, 'utf8');
  const resources = Object.entries(result.composition.config.resources).map(([name, resource]) => ({
    name,
    type: resource.type
  }));
  const services = result.facts.services.map((service) => ({
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
  }));
  const dependencies = result.facts.dependencies.map((dependency) => ({
    name: dependency.name,
    kind: dependency.kind,
    ...(dependency.currentlyHostedOn === undefined ? {} : { currentlyHostedOn: dependency.currentlyHostedOn }),
    ...(dependency.hostingEvidence === undefined ? {} : { hostingEvidence: dependency.hostingEvidence }),
    consumedBy: dependency.consumedBy,
    addressedBy: dependency.addressedBy
  }));
  const existingDeployments = result.facts.existingDeployments.map((deployment) => ({
    tool: deployment.tool,
    evidence: deployment.evidence.map((evidence) => `${evidence.file}:${evidence.line}`).join(', ')
  }));
  const gaps = result.composition.gaps.map((gap) => ({ subject: gap.subject, message: gap.message }));
  const decisions = result.composition.assumptions.map((decision) => ({
    id: decision.id,
    kind: decision.kind,
    chosen: decision.chosen
  }));

  const failures: string[] = [];
  if (resources.length === 0) failures.push('Init completed but generated no resources.');

  const claimedLiveDependencies = dependencies.filter((dependency) => dependency.currentlyHostedOn !== undefined);
  if (claimedLiveDependencies.length > 0) {
    failures.push(
      `Static project files were treated as proof of live dependencies: ${claimedLiveDependencies
        .map((dependency) => `${dependency.name}=${dependency.currentlyHostedOn}`)
        .join(', ')}.`
    );
  }

  const configValidation = validateConfigYaml(generatedConfig);
  if (!configValidation.valid) {
    failures.push(
      `Generated YAML fails the Stacktape schema: ${configValidation.errors
        .map((error) => `${error.path}: ${error.message}`)
        .join('; ')}`
    );
  }

  const expected = entry.expect;
  if (expected !== undefined) {
    assertExactCounts({
      label: 'resource types',
      expected: expected.resourceTypes,
      actual: countBy(resources, 'type'),
      failures
    });
    if (expected.dependencyKinds !== undefined) {
      assertExactCounts({
        label: 'dependency kinds',
        expected: expected.dependencyKinds,
        actual: countBy(dependencies, 'kind'),
        failures
      });
    }
    if (services.length !== expected.serviceCount) {
      failures.push(`service count: expected ${expected.serviceCount}; got ${services.length}.`);
    }
    const httpServiceCount = services.filter((service) => service.exposesHttp).length;
    if (httpServiceCount !== expected.httpServiceCount) {
      failures.push(`HTTP service count: expected ${expected.httpServiceCount}; got ${httpServiceCount}.`);
    }

    const expectedDeploymentTools = [...(expected.existingDeployments ?? [])].sort();
    const actualDeploymentTools = existingDeployments.map((deployment) => deployment.tool).sort();
    if (expectedDeploymentTools.join('\0') !== actualDeploymentTools.join('\0')) {
      failures.push(
        `deployment declarations: expected ${expectedDeploymentTools.join(', ') || '(none)'}; got ${actualDeploymentTools.join(', ') || '(none)'}.`
      );
    }

    for (const required of expected.requiredConfig ?? []) {
      if (!generatedConfig.includes(required))
        failures.push(`generated config is missing ${JSON.stringify(required)}.`);
    }
    for (const forbidden of expected.forbiddenConfig ?? []) {
      if (generatedConfig.includes(forbidden)) {
        failures.push(`generated config unexpectedly contains ${JSON.stringify(forbidden)}.`);
      }
    }

    const gapText = gaps.map((gap) => `${gap.subject}: ${gap.message}`);
    for (const pattern of expected.requiredGapPatterns ?? []) {
      const expression = new RegExp(pattern, 'i');
      if (!gapText.some((gap) => expression.test(gap))) failures.push(`no gap matches /${pattern}/i.`);
    }
    for (const pattern of expected.forbiddenGapPatterns ?? []) {
      const expression = new RegExp(pattern, 'i');
      const matching = gapText.find((gap) => expression.test(gap));
      if (matching !== undefined) failures.push(`gap unexpectedly matches /${pattern}/i: ${matching}`);
    }
  }

  return {
    configPath,
    generatedConfig,
    validConfig: configValidation.valid && resources.length > 0,
    failures,
    details: {
      services,
      dependencies,
      existingDeployments,
      decisions,
      gaps,
      resources,
      output: output.slice(-40).map(redactOutput)
    }
  };
};
