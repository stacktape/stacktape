import { createHash, randomBytes } from 'node:crypto';
import { access, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { getAllStarterProjectIds, generateStarterProject } from '../generate-starter-project';
import { replacePlaceholdersInStacktapeConfig } from '../starter-projects/utils';
import {
  QUALIFICATION_REPORT_VERSION,
  type QualificationCaseResult,
  type QualificationReport,
  type QualificationStep
} from './contracts';
import { startOfflineAwsServer, type OfflineAwsServer } from './offline-aws';
import { outputTail, runProcess } from './process';
import { writeJsonAtomic, writeQualificationReport } from './report';
import { cliDirectory, ensureDevCliArtifacts, errorText, packageWithSourceCli } from './source-cli-packaging';

/**
 * Packages every starter project with the source CLI, offline, the way a customer's first `stacktape deploy` does
 * after cloning one: the starter is materialized exactly as `stacktape init` writes it, the CLI installs its
 * dependencies, builds every workload and synthesizes the template. The report has the shape of a project
 * qualification run so the same tooling reads both.
 */
const help = `Usage: pnpm --filter @stacktape/cli run qualify:starters -- [options]

  --starter=<id>[,<id>...]  Run selected starters; repeatable (default: every starter)
  --shard=<index>/<total>   Deterministically run one shard, for example 2/4
  --max-cases=<count>       Cap starters after selection and sharding
  --output-dir=<path>       Durable JSON/Markdown results (default: .stacktape/qualification/<run>)
  --keep-workdirs           Keep the materialized starters and their isolated homes
  --fail-fast               Stop after the first failing starter
  --list                    Print the starter IDs and exit
`;

const rootDirectory = resolve(cliDirectory, '..', '..');
const invocationDirectory = resolve(process.env.INIT_CWD ?? process.cwd());

type Options = {
  starters: string[];
  outputDirectory: string;
  workRoot: string;
  keepWorkdirs: boolean;
  failFast: boolean;
};

const parseOptions = async (): Promise<Options | 'help' | 'list'> => {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((argument) => argument !== '--'),
    options: {
      starter: { type: 'string', multiple: true },
      shard: { type: 'string' },
      'max-cases': { type: 'string' },
      'output-dir': { type: 'string' },
      'keep-workdirs': { type: 'boolean', default: false },
      'fail-fast': { type: 'boolean', default: false },
      list: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false }
    },
    strict: true
  });
  if (values.help) return 'help';
  if (values.list) return 'list';
  // Only folders with `.project/_metadata.yml` are publishable starters; in-progress ones are skipped, as the
  // starter metadata generator skips them.
  const all = (
    await Promise.all(
      (
        await getAllStarterProjectIds()
      ).map(async (id) =>
        (await access(join(cliDirectory, 'starter-projects', id, '.project', '_metadata.yml')).then(
          () => true,
          () => false
        ))
          ? [id]
          : []
      )
    )
  )
    .flat()
    .sort();
  const requested = (values.starter ?? []).flatMap((value) => value.split(',')).filter(Boolean);
  const unknown = requested.filter((id) => !all.includes(id));
  if (unknown.length > 0) throw new Error(`Unknown starter project(s): ${unknown.join(', ')}.`);
  let starters = requested.length === 0 ? all : all.filter((id) => requested.includes(id));
  if (values.shard !== undefined) {
    const match = /^(\d+)\/(\d+)$/.exec(values.shard);
    if (match === null) throw new Error('--shard must look like <index>/<total>, for example 2/4.');
    const index = Number(match[1]);
    const total = Number(match[2]);
    if (index < 1 || total < 1 || index > total) throw new Error('--shard index must be within 1..total.');
    starters = starters.filter((_, position) => position % total === index - 1);
  }
  if (values['max-cases'] !== undefined) {
    const maximum = Number(values['max-cases']);
    if (!Number.isInteger(maximum) || maximum <= 0) throw new Error('--max-cases must be a positive integer.');
    starters = starters.slice(0, maximum);
  }
  const runId = `starters-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
  return {
    starters,
    outputDirectory: resolve(
      invocationDirectory,
      values['output-dir'] ?? join(rootDirectory, '.stacktape', 'qualification', runId)
    ),
    workRoot: join(tmpdir(), 'stacktape-starter-qualification-work', runId),
    keepWorkdirs: values['keep-workdirs'],
    failFast: values['fail-fast']
  };
};

const failedStep = ({
  name,
  startedAt,
  code,
  error,
  reproductionCommand
}: {
  name: QualificationStep['name'];
  startedAt: number;
  code: string;
  error: unknown;
  reproductionCommand?: string;
}): QualificationStep => ({
  name,
  status: 'failed',
  durationMs: Date.now() - startedAt,
  summary: outputTail(errorText(error), 400).split('\n')[0] ?? 'Failed.',
  ...(reproductionCommand === undefined ? {} : { reproductionCommand }),
  failure: { code, message: errorText(error) }
});

const reproduction = (id: string) => `pnpm --filter @stacktape/cli run qualify:starters -- --starter=${id}`;

const runStarter = async ({ id, options }: { id: string; options: Options }): Promise<QualificationCaseResult> => {
  const startedAt = Date.now();
  const steps: QualificationStep[] = [];
  const caseWorkRoot = join(options.workRoot, id);
  const projectRoot = join(caseWorkRoot, id);
  const caseArtifactDirectory = join(options.outputDirectory, 'cases', id);
  await mkdir(caseArtifactDirectory, { recursive: true });
  const sourceDirectory = join(cliDirectory, 'starter-projects', id);
  const sourceFingerprint = createHash('sha256')
    .update(await readFile(join(sourceDirectory, 'stacktape.yml')))
    .digest('hex');
  let offlineServer: OfflineAwsServer | undefined;
  try {
    const acquireStartedAt = Date.now();
    let configPath: string;
    try {
      await mkdir(caseWorkRoot, { recursive: true });
      await generateStarterProject({ starterProjectId: id, outputDirPath: caseWorkRoot, mode: 'app' });
      configPath = join(projectRoot, 'stacktape.yml');
      await replacePlaceholdersInStacktapeConfig({ configPath });
      steps.push({
        name: 'acquire',
        status: 'passed',
        durationMs: Date.now() - acquireStartedAt,
        summary: 'Materialized the starter as stacktape init writes it.',
        details: { projectRoot }
      });
    } catch (error) {
      steps.push(failedStep({ name: 'acquire', startedAt: acquireStartedAt, code: 'ACQUIRE_FAILED', error }));
      throw error;
    }

    const packageStartedAt = Date.now();
    const templatePath = join(caseArtifactDirectory, 'compiled-template.yml');
    try {
      offlineServer = await startOfflineAwsServer();
      const packaged = await packageWithSourceCli({
        label: id,
        projectName: `starter-${id}`.slice(0, 40),
        projectRoot,
        configPath,
        templatePath,
        offlineServer
      });
      steps.push({
        name: 'package',
        status: 'passed',
        durationMs: Date.now() - packageStartedAt,
        summary: 'Packaged every workload and synthesized the template without external AWS calls.',
        reproductionCommand: reproduction(id),
        details: packaged.details
      });
    } catch (error) {
      steps.push(
        failedStep({
          name: 'package',
          startedAt: packageStartedAt,
          code: 'PACKAGE_FAILED',
          error,
          reproductionCommand: reproduction(id)
        })
      );
    }
  } catch {
    // The failing step is already recorded.
  } finally {
    await offlineServer?.close();
    if (!options.keepWorkdirs) await rm(caseWorkRoot, { recursive: true, force: true, maxRetries: 3 });
  }
  return {
    id,
    title: id,
    fingerprint: sourceFingerprint,
    sourceFingerprint,
    execution: 'executed',
    status: steps.some((step) => step.status === 'failed') ? 'failed' : 'passed',
    durationMs: Date.now() - startedAt,
    source: { kind: 'local', path: `apps/cli/starter-projects/${id}`, license: 'Stacktape starter project' },
    tags: ['starter'],
    steps,
    ...(options.keepWorkdirs ? { keptWorkdir: caseWorkRoot } : {})
  };
};

const toolVersion = async (command: string, args: string[]) => {
  try {
    const result = await runProcess({ command, args, cwd: rootDirectory, timeoutMs: 15_000 });
    return result.exitCode === 0 ? result.stdout.trim() : undefined;
  } catch {
    return undefined;
  }
};

const main = async () => {
  const parsed = await parseOptions();
  if (parsed === 'help') {
    process.stdout.write(help);
    return;
  }
  if (parsed === 'list') {
    process.stdout.write(`${(await getAllStarterProjectIds()).sort().join('\n')}\n`);
    return;
  }
  const options = parsed;
  process.env.STP_DISABLE_TELEMETRY = '1';
  await mkdir(options.outputDirectory, { recursive: true });
  await mkdir(options.workRoot, { recursive: true });
  await ensureDevCliArtifacts();
  const runStartedAt = Date.now();
  const productCommit = (await toolVersion('git', ['rev-parse', 'HEAD'])) ?? 'unknown';
  const dockerVersion = await toolVersion('docker', ['version', '--format', '{{.Server.Version}}']);
  const results: QualificationCaseResult[] = [];
  process.stderr.write(
    `Starter packaging run: ${options.starters.length} starter(s)\nResults: ${options.outputDirectory}\n`
  );
  try {
    for (const [index, id] of options.starters.entries()) {
      process.stderr.write(`[${index + 1}/${options.starters.length}] ${id}\n`);
      const result = await runStarter({ id, options });
      results.push(result);
      await writeJsonAtomic(join(options.outputDirectory, 'cases', id, 'result.json'), result);
      process.stderr.write(`  ${result.status} (${Math.round(result.durationMs / 100) / 10}s)\n`);
      if (options.failFast && result.status === 'failed') break;
    }
  } finally {
    if (!options.keepWorkdirs) await rm(options.workRoot, { recursive: true, force: true, maxRetries: 3 });
  }
  const passed = results.filter((entry) => entry.status === 'passed').length;
  const failed = results.filter((entry) => entry.status === 'failed').length;
  const report: QualificationReport = {
    schemaVersion: QUALIFICATION_REPORT_VERSION,
    runId: options.outputDirectory.split(/[\\/]/).at(-1) ?? 'starters',
    generatedAt: new Date().toISOString(),
    productCommit,
    productFingerprint: `starters:${productCommit}`,
    lanes: ['package'],
    environment: {
      platform: process.platform,
      architecture: process.arch,
      bun: Bun.version,
      node: process.versions.node,
      ...(dockerVersion === undefined ? {} : { docker: dockerVersion })
    },
    summary: { passed, failed, skipped: 0, durationMs: Date.now() - runStartedAt },
    globalSteps: [],
    cases: results
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
