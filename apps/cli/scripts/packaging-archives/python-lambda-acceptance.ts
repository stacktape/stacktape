/**
 * Python Lambda functions, packaged by the CLI's own `validate` and `package` commands, load their native wheels in
 * the runtime the template deploys them with.
 *
 * The fixture has two functions that import `psycopg` with its binary wheel, `psycopg[binary]==3.2.3`, the pin a
 * coding agent wrote in a dogfood run. `api` sets no `runtime`, `pinned` sets `python3.12`. Native wheels are built
 * per Python minor version, so a function whose build used another version than its runtime failed every request with
 * `Runtime.ImportModuleError`; a pure-Python function would not show it.
 *
 * For each function the acceptance reads the runtime from the synthesized template (`validate --withPackage`), checks
 * that every compiled extension in the ZIP (`package`) carries that version's ABI tag, and invokes the ZIP in the
 * official Lambda image of that runtime as an unprivileged user: `psycopg` must load its binary implementation. Then a
 * syntax error in a module `api` imports must stop `package` with the file and line, while a broken script it does not
 * import is only reported.
 *
 * The CLI runs as a child process in an isolated home, with AWS reads on MiniStack. It needs Docker, `unzip` and
 * network access for the build images and wheels; never AWS.
 *
 *   bun scripts/packaging-archives/python-lambda-acceptance.ts [--out <new or empty directory>] [--keep]
 */
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { parse } from 'yaml';
import { startOfflineAwsServer, type OfflineAwsServer } from '../qualification/offline-aws';
import { outputTail } from '../qualification/process';
import { writeJsonAtomic } from '../qualification/report';
import {
  cliDirectory,
  ensureDevCliArtifacts,
  errorText,
  packageWithSourceCli
} from '../qualification/source-cli-packaging';
import { ensureLambdaImage, extractZip, invokeInLambdaRuntime, listLeftoverContainers } from './lambda-runtime';

const keep = process.argv.includes('--keep');
const outIndex = process.argv.indexOf('--out');
const out = resolve(
  outIndex === -1
    ? join(cliDirectory, '.stacktape', 'python-lambda-acceptance', new Date().toISOString().replace(/[:.]/g, '-'))
    : process.argv[outIndex + 1]!
);

const FUNCTIONS = { api: undefined, pinned: 'python3.12' } as const;
type FunctionName = keyof typeof FUNCTIONS;
/** The default runtime of a `.py` entry file. */
const DEFAULT_PYTHON_RUNTIME = 'python3.13';

const checks: { check: string; ok: boolean; detail: string }[] = [];
const check = (name: string, ok: boolean, detail: string) => {
  checks.push({ check: name, ok, detail });
  console.log(`${ok ? 'ok    ' : 'FAILED'}  ${name} — ${detail}`);
};
const file = async (path: string, contents: string) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
};

const HANDLER = [
  'import sys',
  '',
  'import psycopg',
  '',
  '',
  'def handler(event, context):',
  '    return {"python": f"{sys.version_info.major}.{sys.version_info.minor}", "pq": psycopg.pq.__impl__}',
  ''
].join('\n');

const writeFixture = async (project: string) => {
  const resources = Object.fromEntries(
    Object.entries(FUNCTIONS).map(([name, runtime]) => [
      name,
      {
        type: 'function',
        properties: {
          ...(runtime && { runtime }),
          packaging: { type: 'buildpack', properties: { entryfilePath: `${name}/main.py` } }
        }
      }
    ])
  );
  await file(join(project, 'stacktape.yml'), `${JSON.stringify({ resources }, null, 2)}\n`);
  for (const name of Object.keys(FUNCTIONS)) {
    await file(join(project, name, 'requirements.txt'), 'psycopg[binary]==3.2.3\n');
    await file(join(project, name, 'main.py'), HANDLER);
  }
};

/** The `Runtime` the synthesized template gives each function. */
const readTemplateRuntimes = async (templatePath: string): Promise<Record<FunctionName, unknown>> => {
  const template = parse(await readFile(templatePath, 'utf8')) as {
    Resources: Record<string, { Properties?: { Runtime?: unknown } }>;
  };
  return Object.fromEntries(
    Object.keys(FUNCTIONS).map((name) => [name, template.Resources[cfLogicalNames.lambda(name)]?.Properties?.Runtime])
  ) as Record<FunctionName, unknown>;
};

/** The compiled extensions of a ZIP's installed packages, by path. */
const listExtensions = async (directory: string) =>
  (await readdir(directory, { recursive: true })).filter((path) => path.endsWith('.so'));

const main = async () => {
  await mkdir(out, { recursive: true });
  if ((await readdir(out)).length > 0) throw new Error(`Refusing to write into ${out}: it is not empty.`);
  await ensureDevCliArtifacts();
  const work = await mkdtemp(join(tmpdir(), 'stacktape-python-lambda-acceptance-'));
  const report: Record<string, unknown> = { out, work };
  const invocationDirectories: string[] = [];
  const extracted: string[] = [];
  let offlineServer: OfflineAwsServer | undefined;
  try {
    offlineServer = await startOfflineAwsServer();
    const project = join(work, 'project');
    await writeFixture(project);
    const packageProject = (label: string, command: 'validate' | 'package') =>
      packageWithSourceCli({
        label,
        projectName: 'python-lambda-acceptance',
        projectRoot: project,
        configPath: join(project, 'stacktape.yml'),
        templatePath: join(out, `${label}-template.yml`),
        offlineServer: offlineServer!,
        command
      });

    console.log('Synthesizing the template with the source CLI...');
    const validated = await packageProject('validate', 'validate');
    const runtimes = await readTemplateRuntimes(validated.details.templatePath);
    report.runtimes = runtimes;
    for (const [name, configured] of Object.entries(FUNCTIONS)) {
      const expected = configured ?? DEFAULT_PYTHON_RUNTIME;
      check(
        `${name} deploys with ${expected}`,
        runtimes[name as FunctionName] === expected,
        String(runtimes[name as FunctionName])
      );
    }

    console.log('Packaging the functions with the source CLI...');
    const packaged = await packageProject('package', 'package');
    const artifacts = Object.fromEntries(
      packaged.details.packagedWorkloads.map((workload) => [
        String((workload as { jobName?: unknown }).jobName),
        (workload as { artifactPath?: unknown }).artifactPath
      ])
    );
    report.artifacts = artifacts;
    for (const name of Object.keys(FUNCTIONS) as FunctionName[]) {
      const artifactPath = artifacts[name];
      if (typeof artifactPath !== 'string') throw new Error(`The package command reported no artifact for ${name}.`);
      invocationDirectories.push(dirname(dirname(dirname(artifactPath))));
      const runtime = String(runtimes[name]);
      const version = runtime.replace('python', '');
      const abiTag = `cpython-${version.replace('.', '')}-x86_64-linux-gnu.so`;
      const directory = await extractZip(artifactPath);
      extracted.push(directory);
      const extensions = await listExtensions(directory);
      const mismatched = extensions.filter((path) => !path.endsWith(abiTag) && !path.endsWith('.abi3.so'));
      check(
        `${name}'s compiled extensions are built for ${runtime}`,
        extensions.some((path) => path.endsWith(abiTag)) && mismatched.length === 0,
        mismatched.length ? `not ${abiTag}: ${mismatched.join(', ')}` : `${extensions.length} extension(s) ${abiTag}`
      );
      const image = `public.ecr.aws/lambda/python:${version}`;
      ensureLambdaImage(image);
      const invocation = await invokeInLambdaRuntime({ functionDirectory: directory, handler: 'main.handler', image });
      report[`${name}Invocation`] = invocation;
      check(
        `${name} loads psycopg's binary implementation in the ${runtime} runtime`,
        invocation.status === 200 &&
          JSON.stringify(JSON.parse(invocation.body)) === JSON.stringify({ python: version, pq: 'binary' }),
        outputTail(invocation.body, 600)
      );
    }

    console.log('Adding a syntax error to a module api imports, and a Python 2 script, and packaging again...');
    await file(join(project, 'api', 'scripts', 'legacy.py'), 'print "python 2"\n');
    await file(join(project, 'api', 'main.py'), `import storage\n${HANDLER}`);
    await file(join(project, 'api', 'storage.py'), 'def save(:\n    pass\n');
    const failure = await packageProject('syntax-error', 'package').then(
      () => undefined,
      (error: unknown) => errorText(error)
    );
    report.syntaxErrorFailure = failure;
    check(
      'a syntax error stops packaging with its file and line',
      failure?.includes('api/storage.py, line 1: SyntaxError: invalid syntax') === true,
      failure?.match(/"code":"BUILD_CODE_FAILED","message":"([^"]*)"/)?.[1] ??
        outputTail(failure ?? 'packaging succeeded', 600)
    );

    console.log('Fixing the module and packaging again...');
    await file(join(project, 'api', 'storage.py'), 'def save(item):\n    return item\n');
    const fixed = await packageProject('script-warning', 'package');
    const output = `${fixed.processResult.stdout}\n${fixed.processResult.stderr}`;
    check(
      'a broken script the handler does not import is reported, not a failure',
      output.includes('api/scripts/legacy.py, line 1: SyntaxError'),
      outputTail(output.match(/[^\n]*cannot compile[^\n]*/)?.[0] ?? 'no warning', 600)
    );
    invocationDirectories.push(
      ...fixed.details.packagedWorkloads.flatMap((workload) => {
        const artifactPath = (workload as { artifactPath?: unknown }).artifactPath;
        return typeof artifactPath === 'string' ? [dirname(dirname(dirname(artifactPath)))] : [];
      })
    );
  } finally {
    try {
      await offlineServer?.close();
    } finally {
      const leftovers = listLeftoverContainers();
      check('no acceptance container is left behind', leftovers.length === 0, leftovers.join(', ') || 'none');
      await Promise.all(extracted.map((directory) => rm(directory, { recursive: true, force: true })));
      if (!keep) {
        await rm(work, { recursive: true, force: true }).catch(() => undefined);
        await Promise.all(
          invocationDirectories.map((directory) =>
            rm(directory, { recursive: true, force: true }).catch(() => undefined)
          )
        );
      }
      report.checks = checks;
      await writeJsonAtomic(join(out, 'report.json'), report);
    }
  }
  const failed = checks.filter((entry) => !entry.ok);
  if (failed.length > 0) {
    throw new Error(`${failed.length} check(s) failed: ${failed.map((entry) => entry.check).join('; ')}`);
  }
  console.log(`Python Lambda acceptance passed; report at ${join(out, 'report.json')}`);
};

void main().catch((error: unknown) => {
  console.error(outputTail(error instanceof Error ? (error.stack ?? error.message) : String(error), 12_000));
  process.exitCode = 1;
});
