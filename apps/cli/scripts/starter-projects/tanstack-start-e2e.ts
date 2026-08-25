import { mkdtemp, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSsrWebArtifacts } from '@stacktape/packaging/web/ssr-web-shared';
import type { ExecuteProcess, PackagingProgressLogger } from '@stacktape/packaging/runtime-contracts';
import { copy } from 'fs-extra';
import { archiveItem } from 'src/utils/zip';

const run = async (command: string, args: string[], cwd?: string, env?: Record<string, string | undefined>) => {
  const child = Bun.spawn(
    process.platform === 'win32' && ['npm', 'npx'].includes(command)
      ? ['cmd.exe', '/d', '/s', '/c', command, ...args]
      : [command, ...args],
    { cwd, env: env ?? { ...Bun.env }, stdout: 'pipe', stderr: 'pipe' }
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  if (exitCode !== 0) throw new Error(`${command} ${args.join(' ')} failed (${exitCode}).\n${stderr || stdout}`);
  return { stdout, stderr, exitCode };
};

const executeProcess: ExecuteProcess = (command, args, options) =>
  run(
    command,
    args,
    options.cwd,
    options.env
      ? Object.fromEntries(Object.entries(options.env).map(([key, value]) => [key, String(value)]))
      : undefined
  );

const progressLogger: PackagingProgressLogger = {
  eventContext: { instanceId: 'tanstack-legacy-starter-e2e' },
  startEvent: () => undefined,
  updateEvent: () => undefined,
  finishEvent: () => undefined
};

const invokeLambdaArtifact = async (functionPath: string) => {
  const event = {
    version: '2.0',
    routeKey: '$default',
    rawPath: '/',
    rawQueryString: '',
    headers: { host: 'starter.example.com', 'x-forwarded-proto': 'https' },
    requestContext: { http: { method: 'GET', path: '/', protocol: 'HTTP/1.1' } },
    isBase64Encoded: false
  };
  const script = [
    'const { handler } = await import("/var/task/index-wrap.mjs");',
    'const event = JSON.parse(Buffer.from(process.env.STP_EVENT, "base64").toString("utf8"));',
    'const response = await handler(event, {});',
    'console.log(`STP_E2E_RESPONSE:${JSON.stringify(response)}`);'
  ].join('\n');
  const result = await run('docker', [
    'run',
    '--rm',
    '--entrypoint',
    'node',
    '--mount',
    `type=bind,source=${functionPath},target=/var/task,readonly`,
    '--env',
    `STP_EVENT=${Buffer.from(JSON.stringify(event)).toString('base64')}`,
    'public.ecr.aws/lambda/nodejs:24',
    '--input-type=module',
    '--eval',
    script
  ]);
  const marker = result.stdout.split(/\r?\n/).find((line) => line.startsWith('STP_E2E_RESPONSE:'));
  if (marker === undefined) throw new Error(`The Lambda artifact did not return a response.\n${result.stdout}`);
  return JSON.parse(marker.slice('STP_E2E_RESPONSE:'.length)) as { body: string; statusCode: number };
};

const starterRoot = join(import.meta.dir, '..', '..', 'starter-projects', 'tanstack-start-serverless');

const main = async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'stacktape-tanstack-legacy-e2e-'));
  const applicationRoot = join(temporaryRoot, 'application');
  const artifactRoot = join(temporaryRoot, 'artifacts');
  try {
    await run('docker', ['version', '--format', '{{.Server.Version}}']);
    await copy(starterRoot, applicationRoot);
    await rename(join(applicationRoot, 'tsconfig.template.json'), join(applicationRoot, 'tsconfig.json'));
    console.log('Installing the pinned legacy TanStack Start starter...');
    await run('npm', ['ci', '--ignore-scripts'], applicationRoot);

    console.log('Building and packaging the canonical starter through its explicit Vinxi compatibility path...');
    const outputs = await createSsrWebArtifacts({
      resourceName: 'tanstack-start-serverless',
      resourceType: 'tanstack-web',
      serverFunctionName: 'tanstack-start-serverless-server',
      distFolderPath: artifactRoot,
      cwd: applicationRoot,
      progressLogger,
      createProgressLogger: () => progressLogger,
      buildConfig: {
        buildCommand: 'vinxi build',
        workingDir: applicationRoot,
        serverOutputPath: 'dist/server',
        staticOutputPath: 'dist/client',
        handlerFileName: 'server.js',
        staticAssetPrefix: 'assets',
        wrapperType: 'tanstack-fetch',
        buildEnv: { NITRO_PRESET: 'aws-lambda' },
        fallbackOutputVariants: [
          {
            serverOutputPath: '.output/server',
            staticOutputPath: '.output/public',
            handlerFileName: 'index.mjs',
            staticAssetPrefix: '_build',
            wrapperType: 'passthrough'
          }
        ]
      },
      environmentVars: [],
      archiveItem,
      createPackagingError: ({ message, cause }) => new Error(message, { cause }),
      executeProcess
    });

    const output = outputs[0];
    if (output?.outcome !== 'bundled' || output.zippedSize === undefined) {
      throw new Error(`Expected one bundled Lambda ZIP, received ${JSON.stringify(outputs)}.`);
    }
    if (output.artifactPath === undefined) throw new Error('The packaged Lambda ZIP has no artifact path.');
    const zipDetails = await stat(output.artifactPath);
    if (!zipDetails.isFile() || zipDetails.size === 0) throw new Error('The packaged Lambda ZIP is empty.');
    const staticAssets = await Array.fromAsync(
      new Bun.Glob('**/*').scan({ cwd: join(artifactRoot, 'bucket-content'), onlyFiles: true })
    );
    if (!staticAssets.some((path) => path.replaceAll('\\', '/').startsWith('_build/'))) {
      throw new Error(`The static bucket output is missing the legacy _build assets: ${staticAssets.join(', ')}`);
    }

    const response = await invokeLambdaArtifact(join(artifactRoot, 'server-function'));
    if (response.statusCode !== 200 || !response.body.includes('TanStack Start')) {
      throw new Error(`Unexpected Lambda response: ${JSON.stringify(response)}`);
    }
    console.log(
      `Legacy TanStack starter E2E passed: real Vinxi build, ${output.zippedSize.toFixed(2)} MiB ZIP, and Lambda Node 24 response.`
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
