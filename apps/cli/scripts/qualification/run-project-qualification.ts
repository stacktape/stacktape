import { createHash, randomBytes } from 'node:crypto';
import { copyFile, cp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { AWS_QUALIFICATION_SCENARIOS, BUILT_IN_CASES, casesForPreset } from './catalog';
import {
  QUALIFICATION_REPORT_VERSION,
  qualificationLaneSchema,
  qualificationManifestSchema,
  type QualificationCaseManifest,
  type QualificationCaseResult,
  type QualificationLane,
  type QualificationReport,
  type QualificationStep,
  type StepStatus
} from './contracts';
import { runImportQualification } from './import-contract';
import { buildOfflineQualificationEnvironment, startOfflineAwsServer, type OfflineAwsServer } from './offline-aws';
import { acquireProject, calculateSourceFingerprint } from './project-source';
import { assertProcessSucceeded, outputTail, redactOutput, runProcess, type ProcessResult } from './process';
import { writeJsonAtomic, writeQualificationReport } from './report';

type SelectedCase = {
  entry: QualificationCaseManifest;
  manifestDirectory: string;
  manifestPath?: string;
};

type ParsedOptions = {
  cases: SelectedCase[];
  lanes: QualificationLane[];
  awsScenarios: string[];
  outputDirectory: string;
  cacheRoot: string;
  workRoot: string;
  keepWorkdirs: boolean;
  failFast: boolean;
  allowHostProjectCode: boolean;
  resumeFrom?: string;
  manifests: string[];
};

const rootDirectory = resolve(import.meta.dir, '..', '..', '..', '..');
const cliDirectory = resolve(import.meta.dir, '..', '..');
const invocationDirectory = resolve(process.env.INIT_CWD ?? process.cwd());
const defaultCacheRoot = join(tmpdir(), 'stacktape-project-qualification-cache');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const errorText = (error: unknown) =>
  outputTail(redactOutput(error instanceof Error ? (error.stack ?? error.message) : String(error)), 12_000);

const safeProjectName = (id: string) => {
  if (id.length <= 40) return id;
  const digest = createHash('sha256').update(id).digest('hex').slice(0, 7);
  return `${id.slice(0, 32)}-${digest}`;
};

const normalizeLanes = (raw: string | undefined): QualificationLane[] => {
  const requested = (raw ?? 'import,package')
    .split(',')
    .map((lane) => lane.trim())
    .filter(Boolean)
    .map((lane) => qualificationLaneSchema.parse(lane));
  if (requested.includes('package') && !requested.includes('import')) requested.unshift('import');
  return [...new Set(requested)];
};

const readManifest = async (path: string) => {
  const absolutePath = resolve(path);
  const manifest = qualificationManifestSchema.parse(JSON.parse(await readFile(absolutePath, 'utf8')));
  return {
    path: absolutePath,
    cases: manifest.cases.map(
      (entry): SelectedCase => ({ entry, manifestDirectory: dirname(absolutePath), manifestPath: absolutePath })
    )
  };
};

const help = `Stacktape project qualification

Usage:
  pnpm qualify:projects -- [options]

Options:
  --preset=smoke|release|stress|all  Built-in project set (default: smoke without --manifest)
  --case=<id>[,<id>...]              Run selected built-in or manifest cases; repeatable
  --manifest=<path>                  Add a versioned JSON corpus manifest; repeatable
  --lanes=import,package,runtime,aws Requested lanes (package automatically includes import)
  --aws-scenario=<id>                Explicit AWS archetype; required for the aws lane; repeatable
  --output-dir=<path>                Durable JSON/Markdown results (default: .stacktape/qualification/<run>)
  --cache-root=<path>                Persistent checkout cache
  --resume-from=<report.json>        Skip matching cases that already passed
  --shard=<index>/<total>            Deterministically run one shard, for example 2/10
  --max-cases=<count>                Cap projects after selection and sharding
  --keep-workdirs                    Retain isolated project copies for diagnosis
  --fail-fast                        Stop project execution after the first failed case
  --allow-host-project-code          Explicitly accept running reviewed project install/build scripts on this host
  --list                             List built-in projects and AWS scenarios
  --help                             Show this help
`;

const parseOptions = async (): Promise<ParsedOptions | 'list' | 'help'> => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      preset: { type: 'string' },
      case: { type: 'string', multiple: true },
      manifest: { type: 'string', multiple: true },
      lanes: { type: 'string' },
      'aws-scenario': { type: 'string', multiple: true },
      'output-dir': { type: 'string' },
      'cache-root': { type: 'string' },
      'resume-from': { type: 'string' },
      shard: { type: 'string' },
      'max-cases': { type: 'string' },
      'keep-workdirs': { type: 'boolean' },
      'fail-fast': { type: 'boolean' },
      'allow-host-project-code': { type: 'boolean' },
      list: { type: 'boolean' },
      help: { type: 'boolean' }
    },
    strict: true,
    allowPositionals: false
  });
  if (values.help) return 'help';
  if (values.list) return 'list';

  const manifestPaths = values.manifest?.map((path) => resolve(invocationDirectory, path)) ?? [];
  const externalManifests = await Promise.all(manifestPaths.map(readManifest));
  const preset = values.preset as 'smoke' | 'release' | 'stress' | 'all' | undefined;
  if (preset !== undefined && !['smoke', 'release', 'stress', 'all'].includes(preset)) {
    throw new Error(`Unknown preset ${preset}. Use smoke, release, stress, or all.`);
  }

  const builtInEntries =
    preset === undefined && externalManifests.length > 0
      ? []
      : casesForPreset(preset ?? 'smoke').map((entry): SelectedCase => ({ entry, manifestDirectory: rootDirectory }));
  const allCandidates = [
    ...BUILT_IN_CASES.map((entry) => ({ entry, manifestDirectory: rootDirectory })),
    ...externalManifests.flatMap((manifest) => manifest.cases)
  ];
  const defaultCandidates = [...builtInEntries, ...externalManifests.flatMap((manifest) => manifest.cases)];
  const selectedIds = new Set(values.case?.flatMap((value) => value.split(',')).filter(Boolean) ?? []);
  let candidates =
    selectedIds.size === 0 ? defaultCandidates : allCandidates.filter(({ entry }) => selectedIds.has(entry.id));

  const duplicateIds = candidates.map(({ entry }) => entry.id).filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0)
    throw new Error(`Duplicate qualification case ids: ${[...new Set(duplicateIds)].join(', ')}.`);
  const missingIds = [...selectedIds].filter((id) => !candidates.some(({ entry }) => entry.id === id));
  if (missingIds.length > 0) throw new Error(`Unknown qualification case ids: ${missingIds.join(', ')}.`);

  if (values.shard !== undefined) {
    const shard = values.shard.match(/^(\d+)\/(\d+)$/);
    if (shard === null) throw new Error('--shard must use <index>/<total>, for example 2/10.');
    const index = Number(shard[1]);
    const total = Number(shard[2]);
    if (index < 1 || total < 1 || index > total) throw new Error('--shard index must be between 1 and total.');
    candidates = candidates.filter((_, candidateIndex) => candidateIndex % total === index - 1);
  }
  if (values['max-cases'] !== undefined) {
    const maximumCases = Number(values['max-cases']);
    if (!Number.isInteger(maximumCases) || maximumCases < 1) {
      throw new Error('--max-cases must be a positive integer.');
    }
    candidates = candidates.slice(0, maximumCases);
  }

  const lanes = normalizeLanes(values.lanes);
  const allowHostProjectCode =
    Boolean(values['allow-host-project-code']) || process.env.STACKTAPE_QUALIFICATION_SANDBOX === '1';
  if (lanes.includes('package') && !allowHostProjectCode) {
    throw new Error(
      'The package lane executes project install/build scripts. Run it in the qualification sandbox, or add --allow-host-project-code only after reviewing and accepting that pinned project code.'
    );
  }
  const awsScenarios = values['aws-scenario'] ?? [];
  if (lanes.includes('aws') && awsScenarios.length === 0) {
    throw new Error('The aws lane never selects deployments implicitly. Add at least one --aws-scenario=<id>.');
  }
  if (!lanes.includes('aws') && awsScenarios.length > 0) {
    throw new Error('--aws-scenario requires --lanes to include aws.');
  }
  const unknownScenarios = awsScenarios.filter(
    (id) => !AWS_QUALIFICATION_SCENARIOS.some((scenario) => scenario.id === id)
  );
  if (unknownScenarios.length > 0) throw new Error(`Unknown AWS scenarios: ${unknownScenarios.join(', ')}.`);

  const runId = `qualification-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
  const outputDirectory = resolve(
    invocationDirectory,
    values['output-dir'] ?? join(rootDirectory, '.stacktape', 'qualification', runId)
  );
  const cacheRoot = resolve(
    invocationDirectory,
    values['cache-root'] ?? process.env.STACKTAPE_QUALIFICATION_CACHE ?? defaultCacheRoot
  );
  const workRoot = join(tmpdir(), 'stacktape-project-qualification-work', runId);
  return {
    cases: !lanes.some((lane) => lane === 'import' || lane === 'package') && selectedIds.size === 0 ? [] : candidates,
    lanes,
    awsScenarios,
    outputDirectory,
    cacheRoot,
    workRoot,
    keepWorkdirs: Boolean(values['keep-workdirs']),
    failFast: Boolean(values['fail-fast']),
    allowHostProjectCode,
    ...(values['resume-from'] === undefined ? {} : { resumeFrom: resolve(invocationDirectory, values['resume-from']) }),
    manifests: manifestPaths
  };
};

const listCatalog = () => {
  process.stdout.write('Built-in projects:\n');
  for (const entry of BUILT_IN_CASES) process.stdout.write(`  ${entry.id}  [${entry.tags.join(', ')}]\n`);
  process.stdout.write('\nExplicit AWS scenarios:\n');
  for (const scenario of AWS_QUALIFICATION_SCENARIOS) {
    process.stdout.write(
      `  ${scenario.id}  policy=${scenario.policy} cost=${scenario.costClass} [${scenario.coverage.join(', ')}]\n`
    );
  }
};

const fingerprintFor = ({
  entry,
  productFingerprint,
  sourceFingerprint,
  executionFingerprint,
  lanes
}: {
  entry: QualificationCaseManifest;
  productFingerprint: string;
  sourceFingerprint: string;
  executionFingerprint: string;
  lanes: QualificationLane[];
}) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        reportVersion: QUALIFICATION_REPORT_VERSION,
        productFingerprint,
        sourceFingerprint,
        executionFingerprint,
        lanes,
        entry
      })
    )
    .digest('hex');

const loadResumableCases = async (path: string | undefined) => {
  const cases = new Map<
    string,
    { result: QualificationCaseResult; reportPath: string; reportDirectory: string; runId: string }
  >();
  if (path === undefined) return cases;
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== QUALIFICATION_REPORT_VERSION ||
    typeof parsed.runId !== 'string' ||
    !Array.isArray(parsed.cases)
  ) {
    throw new Error(`${path} is not a version ${QUALIFICATION_REPORT_VERSION} qualification report.`);
  }
  for (const candidate of parsed.cases) {
    if (
      isRecord(candidate) &&
      typeof candidate.id === 'string' &&
      typeof candidate.fingerprint === 'string' &&
      candidate.status === 'passed'
    ) {
      cases.set(candidate.id, {
        result: candidate as QualificationCaseResult,
        reportPath: path,
        reportDirectory: dirname(path),
        runId: parsed.runId
      });
    }
  }
  return cases;
};

const statusForSteps = (steps: QualificationStep[]): StepStatus => {
  if (steps.some((step) => step.status === 'failed')) return 'failed';
  if (steps.every((step) => step.status === 'skipped')) return 'skipped';
  return 'passed';
};

const failedStep = ({
  name,
  startedAt,
  code,
  error,
  reproductionCommand,
  output
}: {
  name: QualificationStep['name'];
  startedAt: number;
  code: string;
  error: unknown;
  reproductionCommand?: string;
  output?: string;
}): QualificationStep => ({
  name,
  status: 'failed',
  durationMs: Date.now() - startedAt,
  summary: error instanceof Error ? error.message.split('\n')[0] : String(error),
  ...(reproductionCommand === undefined ? {} : { reproductionCommand }),
  failure: {
    code,
    message: errorText(error),
    ...(output === undefined || output.trim() === '' ? {} : { outputTail: outputTail(output) })
  }
});

const reproductionCommand = (selected: SelectedCase, lanes: string) =>
  `pnpm qualify:projects -- --case=${selected.entry.id} --lanes=${lanes}${
    selected.manifestPath === undefined ? '' : ` --manifest=${JSON.stringify(selected.manifestPath)}`
  }`;

const packageProject = async ({
  entry,
  projectName,
  projectRoot,
  configPath,
  templatePath,
  offlineServer
}: {
  entry: QualificationCaseManifest;
  projectName: string;
  projectRoot: string;
  configPath: string;
  templatePath: string;
  offlineServer: OfflineAwsServer;
}) => {
  const invocationId = `qualification-${entry.id}-${randomBytes(4).toString('hex')}`;
  const isolatedHome = join(dirname(projectRoot), 'isolated-home');
  await Promise.all([
    mkdir(join(isolatedHome, 'tmp'), { recursive: true }),
    mkdir(join(isolatedHome, 'appdata'), { recursive: true }),
    mkdir(join(isolatedHome, 'localappdata'), { recursive: true }),
    mkdir(join(isolatedHome, '.config'), { recursive: true }),
    mkdir(join(isolatedHome, '.cache'), { recursive: true }),
    mkdir(join(isolatedHome, '.docker'), { recursive: true })
  ]);
  const environment = buildOfflineQualificationEnvironment({
    endpoint: offlineServer.endpoint,
    invocationId,
    homeDirectory: isolatedHome
  });
  const configText = await readFile(configPath, 'utf8');
  offlineServer.registerSecretReferences(
    [...configText.matchAll(/\$Secret\(['"]([^'"]+)['"]\)/g)]
      .map((match) => match[1])
      .filter((reference): reference is string => reference !== undefined)
  );
  const initialUnexpectedRequests = offlineServer.unexpectedRequests.length;
  const args = [
    'run',
    join(cliDirectory, 'scripts', 'dev.ts'),
    'validate',
    '--withPackage',
    '--configPath',
    configPath,
    '--currentWorkingDirectory',
    projectRoot,
    '--projectName',
    projectName,
    '--stage',
    'qualification',
    '--region',
    'eu-west-1',
    '--agent',
    '--outFile',
    templatePath
  ];
  const processResult = await runProcess({
    command: process.execPath,
    args,
    cwd: cliDirectory,
    env: environment,
    timeoutMs: 45 * 60_000
  });
  const blockedRequests = offlineServer.unexpectedRequests.slice(initialUnexpectedRequests);
  if (processResult.timedOut) throw new Error('Source CLI packaging exceeded 45 minutes.');
  if (processResult.stdoutTruncated) {
    throw new Error('Source CLI JSONL exceeded the 32 MiB qualification capture limit.');
  }
  let parsed: ReturnType<typeof parseCliJsonl>;
  try {
    parsed = parseCliJsonl(processResult.stdout, 'validate --withPackage');
  } catch (error) {
    throw new Error(
      `Source CLI packaging exited with ${String(processResult.exitCode)} without a valid result contract.\n${errorText(error)}\n${outputTail(
        `${processResult.stdout}\n${processResult.stderr}`,
        12_000
      )}`
    );
  }
  if (processResult.exitCode !== 0 || !parsed.result.ok || parsed.result.code !== 'OK') {
    throw new Error(
      `Source CLI packaging failed (${String(processResult.exitCode)}): ${parsed.result.code}: ${parsed.result.message}\n${outputTail(
        `${processResult.stdout}\n${processResult.stderr}`,
        12_000
      )}`
    );
  }
  if (blockedRequests.length > 0) {
    throw new Error(`Packaging attempted blocked network calls: ${blockedRequests.join(', ')}.`);
  }

  const commandResult = isRecord(parsed.result.data) ? parsed.result.data.result : undefined;
  const structuredResult = isRecord(commandResult) ? commandResult : undefined;
  const structuredChecks =
    structuredResult !== undefined && isRecord(structuredResult.checked) ? structuredResult.checked : undefined;
  const hasStructuredContract = structuredResult?.valid === true && structuredChecks !== undefined;
  const packagingCompleted = parsed.events.some(
    (event) => event.type === 'event' && event.eventType === 'PACKAGE_ARTIFACTS' && event.status === 'completed'
  );
  const templateText = await readFile(templatePath, 'utf8');
  if (!hasStructuredContract && (!packagingCompleted || templateText.trim().length === 0)) {
    throw new Error(
      'Validate returned neither its structured success contract nor completed packaging and a template.'
    );
  }
  if (hasStructuredContract && (structuredChecks?.packaging !== true || structuredChecks.template !== true)) {
    throw new Error('Validate did not check both packaging and the synthesized template.');
  }
  const workloads =
    hasStructuredContract && Array.isArray(structuredResult.packagedWorkloads)
      ? structuredResult.packagedWorkloads
      : [];
  return {
    processResult,
    details: {
      validationContract: hasStructuredContract ? 'structured-result' : 'completed-events-and-template',
      checked: hasStructuredContract
        ? structuredChecks
        : { config: true, resources: true, template: true, packaging: true, cloudformation: false },
      packagedWorkloads: workloads.map((workload) =>
        isRecord(workload)
          ? {
              jobName: workload.jobName,
              digest: workload.digest,
              skipped: workload.skipped,
              size: workload.size
            }
          : workload
      ),
      blockedNetworkRequests: blockedRequests,
      templatePath
    }
  };
};

const runCase = async ({
  selected,
  options,
  productFingerprint,
  executionFingerprint,
  resumable
}: {
  selected: SelectedCase;
  options: ParsedOptions;
  productFingerprint: string;
  executionFingerprint: string;
  resumable: Awaited<ReturnType<typeof loadResumableCases>>;
}): Promise<QualificationCaseResult> => {
  const startedAt = Date.now();
  const { entry } = selected;
  const caseLanes = options.lanes.filter(
    (lane): lane is 'import' | 'package' => lane === 'import' || lane === 'package'
  );
  let sourceFingerprint: string;
  try {
    sourceFingerprint = await calculateSourceFingerprint({ entry, manifestDirectory: selected.manifestDirectory });
  } catch (error) {
    sourceFingerprint = createHash('sha256')
      .update(`unavailable:${errorText(error)}`)
      .digest('hex');
    const fingerprint = fingerprintFor({
      entry,
      productFingerprint,
      sourceFingerprint,
      executionFingerprint,
      lanes: caseLanes
    });
    return {
      id: entry.id,
      title: entry.title,
      fingerprint,
      sourceFingerprint,
      execution: 'executed',
      status: 'failed',
      durationMs: Date.now() - startedAt,
      source: entry.source,
      tags: entry.tags,
      steps: [
        failedStep({
          name: 'acquire',
          startedAt,
          code: 'SOURCE_FINGERPRINT_FAILED',
          error,
          reproductionCommand: reproductionCommand(selected, caseLanes.join(','))
        })
      ]
    };
  }
  const fingerprint = fingerprintFor({
    entry,
    productFingerprint,
    sourceFingerprint,
    executionFingerprint,
    lanes: caseLanes
  });
  const resumed = resumable.get(entry.id);
  const caseArtifactDirectory = join(options.outputDirectory, 'cases', entry.id);
  if (resumed?.result.fingerprint === fingerprint) {
    const previousCaseDirectory = join(resumed.reportDirectory, 'cases', entry.id);
    if (resolve(previousCaseDirectory) !== resolve(caseArtifactDirectory)) {
      await cp(previousCaseDirectory, caseArtifactDirectory, { recursive: true, force: true });
    }
    return {
      ...resumed.result,
      fingerprint,
      sourceFingerprint,
      execution: 'reused',
      status: 'passed',
      durationMs: 0,
      resumedFrom: { reportPath: resumed.reportPath, runId: resumed.runId },
      keptWorkdir: undefined
    };
  }

  const steps: QualificationStep[] = [];
  if (caseLanes.length === 0) {
    return {
      id: entry.id,
      title: entry.title,
      fingerprint,
      sourceFingerprint,
      execution: 'executed',
      status: 'skipped',
      durationMs: Date.now() - startedAt,
      source: entry.source,
      tags: entry.tags,
      steps: [{ name: 'acquire', status: 'skipped', durationMs: 0, summary: 'No per-project lane was requested.' }]
    };
  }

  let workRoot: string | undefined;
  let configPath: string | undefined;
  let importValid = false;
  let generatedConfigPath: string | undefined;
  const projectName = safeProjectName(entry.id);
  await mkdir(caseArtifactDirectory, { recursive: true });

  try {
    const acquireStartedAt = Date.now();
    let acquired: Awaited<ReturnType<typeof acquireProject>>;
    try {
      acquired = await acquireProject({
        entry,
        manifestDirectory: selected.manifestDirectory,
        cacheRoot: options.cacheRoot,
        workRoot: options.workRoot
      });
      workRoot = acquired.workRoot;
      steps.push({
        name: 'acquire',
        status: 'passed',
        durationMs: Date.now() - acquireStartedAt,
        summary: acquired.cacheHit
          ? 'Prepared the pinned project from the local cache.'
          : 'Cloned and prepared the pinned project.',
        details: { source: acquired.sourceDescription, cacheHit: acquired.cacheHit, projectRoot: acquired.projectRoot }
      });
    } catch (error) {
      steps.push(
        failedStep({
          name: 'acquire',
          startedAt: acquireStartedAt,
          code: 'ACQUIRE_FAILED',
          error,
          reproductionCommand: reproductionCommand(selected, caseLanes.join(','))
        })
      );
      return {
        id: entry.id,
        title: entry.title,
        fingerprint,
        sourceFingerprint,
        execution: 'executed',
        status: 'failed',
        durationMs: Date.now() - startedAt,
        source: entry.source,
        tags: entry.tags,
        steps
      };
    }

    const importStartedAt = Date.now();
    try {
      const imported = await runImportQualification({ entry, projectRoot: acquired.projectRoot, projectName });
      configPath = imported.configPath;
      importValid = imported.validConfig;
      const artifactPath = join(caseArtifactDirectory, 'stacktape.yml');
      await copyFile(imported.configPath, artifactPath);
      generatedConfigPath = relative(options.outputDirectory, artifactPath).replaceAll('\\', '/');
      if (imported.failures.length > 0) {
        steps.push({
          name: 'import',
          status: 'failed',
          durationMs: Date.now() - importStartedAt,
          summary: `${imported.failures.length} importer contract assertion(s) failed.`,
          reproductionCommand: reproductionCommand(selected, 'import'),
          failure: {
            code: 'IMPORT_CONTRACT_FAILED',
            message: imported.failures.map((failure) => `- ${failure}`).join('\n')
          },
          details: imported.details
        });
      } else {
        steps.push({
          name: 'import',
          status: 'passed',
          durationMs: Date.now() - importStartedAt,
          summary: 'Generated a schema-valid Stacktape configuration that matches the importer contract.',
          details: imported.details
        });
      }
    } catch (error) {
      steps.push(
        failedStep({
          name: 'import',
          startedAt: importStartedAt,
          code: 'IMPORT_FAILED',
          error,
          reproductionCommand: reproductionCommand(selected, 'import')
        })
      );
    }

    if (caseLanes.includes('package')) {
      if (!entry.lanes.includes('package')) {
        steps.push({
          name: 'package',
          status: 'skipped',
          durationMs: 0,
          summary: 'The manifest marks this project as import-only.'
        });
      } else if (configPath === undefined || !importValid) {
        steps.push({
          name: 'package',
          status: 'skipped',
          durationMs: 0,
          summary: 'Packaging needs a schema-valid generated configuration and the offline AWS guard.'
        });
      } else {
        const packageStartedAt = Date.now();
        const templatePath = join(caseArtifactDirectory, 'compiled-template.yml');
        let caseOfflineServer: OfflineAwsServer | undefined;
        try {
          caseOfflineServer = await startOfflineAwsServer();
          const packaged = await packageProject({
            entry,
            projectName,
            projectRoot: acquired.projectRoot,
            configPath,
            templatePath,
            offlineServer: caseOfflineServer
          });
          steps.push({
            name: 'package',
            status: 'passed',
            durationMs: Date.now() - packageStartedAt,
            summary: 'Packaged all inferred workloads and synthesized the template without external AWS calls.',
            reproductionCommand: reproductionCommand(selected, 'import,package'),
            details: packaged.details
          });
        } catch (error) {
          steps.push(
            failedStep({
              name: 'package',
              startedAt: packageStartedAt,
              code: 'PACKAGE_FAILED',
              error,
              reproductionCommand: reproductionCommand(selected, 'import,package')
            })
          );
        } finally {
          await caseOfflineServer?.close();
        }
      }
    }

    const status = statusForSteps(steps);
    return {
      id: entry.id,
      title: entry.title,
      fingerprint,
      sourceFingerprint,
      execution: 'executed',
      status,
      durationMs: Date.now() - startedAt,
      source: entry.source,
      tags: entry.tags,
      steps,
      ...(generatedConfigPath === undefined ? {} : { generatedConfigPath }),
      ...(options.keepWorkdirs && workRoot !== undefined ? { keptWorkdir: workRoot } : {})
    };
  } finally {
    if (!options.keepWorkdirs && workRoot !== undefined) {
      try {
        await rm(workRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
      } catch (error) {
        const warning = `Could not remove qualification workdir ${workRoot}: ${errorText(error)}`;
        const acquireStep = steps.find((step) => step.name === 'acquire');
        if (acquireStep !== undefined)
          acquireStep.details = { ...acquireStep.details, cleanupWarning: warning, workRoot };
        process.stderr.write(`${warning}\n`);
      }
    }
  }
};

const runGlobalProcessStep = async ({
  name,
  command,
  args,
  cwd,
  timeoutMs,
  terminationGraceMs,
  reproduction
}: {
  name: 'runtime' | 'aws';
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  terminationGraceMs?: number;
  reproduction: string;
}): Promise<QualificationStep> => {
  const startedAt = Date.now();
  let result: ProcessResult | undefined;
  try {
    result = await runProcess({ command, args, cwd, timeoutMs, terminationGraceMs });
    assertProcessSucceeded(result);
    return {
      name,
      status: 'passed',
      durationMs: Date.now() - startedAt,
      summary:
        name === 'runtime'
          ? 'Packaged artifacts ran successfully in local Docker runtimes.'
          : 'The guarded AWS canary passed and cleaned up.',
      reproductionCommand: reproduction,
      details: { command: result.command, outputTail: outputTail(`${result.stdout}\n${result.stderr}`, 4_000) }
    };
  } catch (error) {
    const step = failedStep({
      name,
      startedAt,
      code:
        name === 'runtime'
          ? 'RUNTIME_FAILED'
          : result?.forceTerminationRequested
            ? 'AWS_CLEANUP_UNKNOWN'
            : 'AWS_FAILED',
      error,
      reproductionCommand: reproduction,
      output: result === undefined ? undefined : `${result.stdout}\n${result.stderr}`
    });
    if (result !== undefined) {
      step.details = {
        interruptedSignal: result.interruptedSignal,
        forceTerminationRequested: result.forceTerminationRequested,
        cleanupStatus: result.forceTerminationRequested ? 'unknown' : 'canary-reported'
      };
    }
    return step;
  }
};

const runGlobalLanes = async (options: ParsedOptions): Promise<QualificationStep[]> => {
  const steps: QualificationStep[] = [];
  if (options.lanes.includes('runtime')) {
    steps.push(
      await runGlobalProcessStep({
        name: 'runtime',
        command: 'pnpm',
        args: ['test:packaging-e2e'],
        cwd: rootDirectory,
        timeoutMs: 90 * 60_000,
        reproduction: 'pnpm test:packaging-e2e'
      })
    );
  }

  for (const scenarioId of options.awsScenarios) {
    const scenario = AWS_QUALIFICATION_SCENARIOS.find((candidate) => candidate.id === scenarioId)!;
    const environmentVariable =
      scenario.runner !== 'init'
        ? ''
        : process.platform === 'win32'
          ? `$env:STP_INIT_CANARY_FIXTURE = '${scenario.fixture}'; `
          : `STP_INIT_CANARY_FIXTURE=${scenario.fixture} `;
    const script =
      scenario.runner === 'init'
        ? 'test:real-aws-init-canary'
        : scenario.runner === 'observability'
          ? 'test:real-aws-observability-canary'
          : 'test:real-aws-canary';
    const inheritedFixture = process.env.STP_INIT_CANARY_FIXTURE;
    if (scenario.fixture !== undefined) process.env.STP_INIT_CANARY_FIXTURE = scenario.fixture;
    try {
      const step = await runGlobalProcessStep({
        name: 'aws',
        command: 'pnpm',
        args: ['--filter', '@stacktape/cli', 'run', script],
        cwd: rootDirectory,
        timeoutMs: 2 * 60 * 60_000,
        terminationGraceMs: 30 * 60_000,
        reproduction: `${environmentVariable}pnpm --filter @stacktape/cli run ${script}`
      });
      step.summary = `${scenario.id}: ${step.summary}`;
      step.details = { scenario: scenario.id, policy: scenario.policy, costClass: scenario.costClass, ...step.details };
      steps.push(step);
    } finally {
      if (inheritedFixture === undefined) delete process.env.STP_INIT_CANARY_FIXTURE;
      else process.env.STP_INIT_CANARY_FIXTURE = inheritedFixture;
    }
  }
  return steps;
};

const toolVersion = async (command: string, args: string[]) => {
  try {
    const result = await runProcess({ command, args, cwd: rootDirectory, timeoutMs: 15_000 });
    return result.exitCode === 0 ? result.stdout.trim() : undefined;
  } catch {
    return undefined;
  }
};

const calculateProductFingerprint = async (productCommit: string) => {
  const hash = createHash('sha256').update(productCommit);
  const diff = await runProcess({
    command: 'git',
    args: ['diff', '--binary', 'HEAD', '--', '.'],
    cwd: rootDirectory,
    timeoutMs: 60_000
  });
  assertProcessSucceeded(diff);
  hash.update(diff.stdout);

  const untracked = await runProcess({
    command: 'git',
    args: ['ls-files', '--others', '--exclude-standard', '-z'],
    cwd: rootDirectory,
    timeoutMs: 60_000
  });
  assertProcessSucceeded(untracked);
  for (const projectPath of untracked.stdout.split('\0').filter(Boolean).sort()) {
    hash.update(projectPath);
    hash.update(await readFile(resolve(rootDirectory, projectPath)));
  }
  return hash.digest('hex');
};

const main = async () => {
  const parsed = await parseOptions();
  if (parsed === 'help') {
    process.stdout.write(help);
    return;
  }
  if (parsed === 'list') {
    listCatalog();
    return;
  }
  const options = parsed;
  process.env.STP_DISABLE_TELEMETRY = '1';
  await mkdir(options.outputDirectory, { recursive: true });
  await mkdir(options.workRoot, { recursive: true });

  const runStartedAt = Date.now();
  const productCommit = (await toolVersion('git', ['rev-parse', 'HEAD'])) ?? 'unknown';
  const productFingerprint = await calculateProductFingerprint(productCommit);
  const dockerVersion = await toolVersion('docker', ['version', '--format', '{{.Server.Version}}']);
  const environment: QualificationReport['environment'] = {
    platform: process.platform,
    architecture: process.arch,
    bun: Bun.version,
    node: process.versions.node,
    ...(dockerVersion === undefined ? {} : { docker: dockerVersion })
  };
  const executionFingerprint = createHash('sha256').update(JSON.stringify(environment)).digest('hex');
  const resumable = await loadResumableCases(options.resumeFrom);
  const caseResults: QualificationCaseResult[] = [];
  process.stderr.write(
    `Qualification run: ${options.cases.length} project(s), lanes ${options.lanes.join(', ')}\nResults: ${options.outputDirectory}\n`
  );
  try {
    for (const [index, selected] of options.cases.entries()) {
      process.stderr.write(`[${index + 1}/${options.cases.length}] ${selected.entry.id}\n`);
      let result: QualificationCaseResult;
      try {
        result = await runCase({ selected, options, productFingerprint, executionFingerprint, resumable });
      } catch (error) {
        const sourceFingerprint = createHash('sha256')
          .update(`harness-failure:${errorText(error)}`)
          .digest('hex');
        result = {
          id: selected.entry.id,
          title: selected.entry.title,
          fingerprint: fingerprintFor({
            entry: selected.entry,
            productFingerprint,
            sourceFingerprint,
            executionFingerprint,
            lanes: options.lanes.filter((lane): lane is 'import' | 'package' => lane === 'import' || lane === 'package')
          }),
          sourceFingerprint,
          execution: 'executed',
          status: 'failed',
          durationMs: 0,
          source: selected.entry.source,
          tags: selected.entry.tags,
          steps: [
            failedStep({
              name: 'harness',
              startedAt: Date.now(),
              code: 'QUALIFICATION_HARNESS_FAILED',
              error,
              reproductionCommand: reproductionCommand(selected, options.lanes.join(','))
            })
          ]
        };
      }
      caseResults.push(result);
      await writeJsonAtomic(join(options.outputDirectory, 'cases', selected.entry.id, 'result.json'), result);
      process.stderr.write(`  ${result.status} (${Math.round(result.durationMs / 100) / 10}s)\n`);
      if (options.failFast && result.status === 'failed') break;
    }
  } finally {
    if (!options.keepWorkdirs) {
      try {
        await rm(options.workRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
      } catch (error) {
        process.stderr.write(`Could not remove qualification run workdir ${options.workRoot}: ${errorText(error)}\n`);
      }
    }
  }

  const globalSteps = await runGlobalLanes(options);
  const failed =
    caseResults.filter((entry) => entry.status === 'failed').length +
    globalSteps.filter((step) => step.status === 'failed').length;
  const passed =
    caseResults.filter((entry) => entry.status === 'passed').length +
    globalSteps.filter((step) => step.status === 'passed').length;
  const skipped =
    caseResults.filter((entry) => entry.status === 'skipped').length +
    globalSteps.filter((step) => step.status === 'skipped').length;
  const report: QualificationReport = {
    schemaVersion: QUALIFICATION_REPORT_VERSION,
    runId: options.outputDirectory.split(/[\\/]/).at(-1) ?? 'qualification',
    generatedAt: new Date().toISOString(),
    productCommit,
    productFingerprint,
    ...(options.manifests.length === 0 ? {} : { manifests: options.manifests }),
    lanes: options.lanes,
    environment,
    summary: { passed, failed, skipped, durationMs: Date.now() - runStartedAt },
    globalSteps,
    cases: caseResults
  };
  const paths = await writeQualificationReport(options.outputDirectory, report);
  process.stdout.write(`${JSON.stringify({ ...report.summary, ...paths })}\n`);
  if (failed > 0) process.exitCode = 1;
};

if (import.meta.main) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${errorText(error)}\n`);
    process.exitCode = 1;
  });
}
