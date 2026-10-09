/**
 * J1.3: the CI/CD pipeline init writes deploys on its host once the user has added the secrets it asks for.
 *
 * Each pipeline is written by the real `writePipeline`, parsed, and its deploy step runs with the current
 * source CLI standing in for the pinned `stacktape` package. The step gets only what that host would give it:
 * on GitHub, the step's own `env` with `${{ secrets.* }}` resolved and the credentials the AWS action exports;
 * on GitLab and Bitbucket, every configured variable. AWS answers from the qualification loopback guard and
 * Stacktape from a loopback stub, so nothing leaves the machine. The deploy cannot finish offline; the
 * assertion is that the step's arguments are accepted and that it reaches Stacktape authenticated.
 *
 * Run with `pnpm --filter @stacktape/cli test:init:e2e`.
 */

import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { writePipeline } from '../../src/init/cicd/write-pipeline';
import type { GitHost } from '../../src/init/cicd/detect-host';
import { buildOfflineQualificationEnvironment, startOfflineAwsServer } from '../qualification/offline-aws';
import { runProcess } from '../qualification/process';
import { createInitSandbox, packageOffline, runSourceInit, type InitSandbox } from './harness';

const cliDirectory = join(import.meta.dir, '..', '..');
const roots: string[] = [];
const sandboxes: InitSandbox[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 3 })));
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

type DeployStep = { command: string; environment: Record<string, string> };

const GITHUB_SECRET = /\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/g;

/** What a GitHub-hosted runner hands the step that runs `stacktape deploy`. */
const githubDeployStep = (workflow: any, secrets: Record<string, string>): DeployStep => {
  const resolve = (value: unknown) =>
    String(value).replace(GITHUB_SECRET, (_match, name: string) => secrets[name] ?? '');
  const environment: Record<string, string> = {};
  for (const scope of [workflow.env, workflow.jobs.deploy.env]) {
    for (const [name, value] of Object.entries(scope ?? {})) environment[name] = resolve(value);
  }
  for (const step of workflow.jobs.deploy.steps as Array<Record<string, any>>) {
    // configure-aws-credentials exports temporary credentials to every later step when the role resolves.
    if (String(step.uses ?? '').startsWith('aws-actions/configure-aws-credentials@')) {
      if (resolve(step.with?.['role-to-assume'] ?? '') !== '') {
        Object.assign(environment, {
          AWS_ACCESS_KEY_ID: 'ci-temporary-access-key',
          AWS_SECRET_ACCESS_KEY: 'ci-temporary-secret',
          AWS_SESSION_TOKEN: 'ci-temporary-session',
          AWS_REGION: resolve(step.with['aws-region']),
          AWS_DEFAULT_REGION: resolve(step.with['aws-region'])
        });
      }
      continue;
    }
    if (typeof step.run === 'string' && step.run.includes('stacktape deploy')) {
      for (const [name, value] of Object.entries(step.env ?? {})) environment[name] = resolve(value);
      return { command: step.run, environment };
    }
  }
  throw new Error('The GitHub workflow has no step that runs stacktape deploy.');
};

/** GitLab and Bitbucket expose every configured CI variable to every script line. */
const scriptDeployStep = (script: unknown[], secrets: Record<string, string>): DeployStep => {
  const command = script.map(String).find((line) => line.includes('stacktape deploy'));
  if (command === undefined) throw new Error('The pipeline has no script line that runs stacktape deploy.');
  return { command, environment: { ...secrets } };
};

const deployStepFor = (host: GitHost, contents: string, secrets: Record<string, string>): DeployStep => {
  const pipeline = parseYaml(contents) as any;
  if (host === 'github') return githubDeployStep(pipeline, secrets);
  if (host === 'gitlab') return scriptDeployStep(pipeline.deploy.script, secrets);
  return scriptDeployStep(pipeline.pipelines.branches.main[0].step.script, secrets);
};

const startStacktapeApiRecorder = async () => {
  const requests: Array<{ procedure: string; apiKey: string | undefined }> = [];
  const server = createServer((request, response) => {
    const header = request.headers.stp_api_key;
    requests.push({
      procedure: new URL(request.url ?? '/', 'http://127.0.0.1').pathname.slice(1),
      apiKey: Array.isArray(header) ? header[0] : header
    });
    response.writeHead(401, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify([
        { error: { message: 'Offline test', code: -32001, data: { code: 'UNAUTHORIZED', httpStatus: 401 } } }
      ])
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The Stacktape API recorder has no port.');
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
};

describe('the pipeline init writes deploys once its secrets are configured', () => {
  for (const host of ['github', 'gitlab', 'bitbucket'] as const) {
    test(
      `${host}: the deploy step is accepted by the CLI and reaches Stacktape with the configured API key`,
      async () => {
        const root = await mkdtemp(join(tmpdir(), `stacktape-j1-pipeline-${host}-`));
        roots.push(root);
        const project = join(root, 'checkout');
        const bin = join(root, 'bin');
        const home = join(root, 'home');
        await Promise.all(
          [join(project, 'src'), bin, ...['tmp', '.config', '.cache', '.docker'].map((name) => join(home, name))].map(
            (path) => mkdir(path, { recursive: true })
          )
        );
        await writeFile(join(project, 'package.json'), '{"name":"orders","dependencies":{"express":"5.1.0"}}\n');
        await writeFile(join(project, 'src', 'server.js'), "require('express')().listen(process.env.PORT);\n");
        await writeFile(
          join(project, 'stacktape.yml'),
          'resources:\n  orders:\n    type: web-service\n    properties:\n      packaging:\n        type: js-bundle\n        properties:\n          entryfilePath: src/server.js\n'
        );

        const written = await writePipeline({
          repositoryRoot: project,
          host,
          inputs: {
            configPath: 'stacktape.yml',
            stage: 'production',
            region: 'eu-west-1',
            projectName: 'orders',
            cliVersion: '4.0.0'
          }
        });
        // The user adds exactly what the wizard told them to, with these values.
        const secrets = Object.fromEntries(
          written.requiredSecrets.map(({ name }) => [name, `ci-${name.toLowerCase().replaceAll('_', '-')}`])
        );
        const step = deployStepFor(host, await readFile(written.path, 'utf8'), secrets);

        // `npm install -g stacktape@<pinned>` puts the CLI on PATH; here it is the current source. The dev entry
        // builds relative to its own directory, so the shim passes the checkout as the working directory instead.
        await writeFile(
          join(bin, 'stacktape'),
          `#!/bin/sh\ncheckout="$PWD"\ncd "${cliDirectory}" || exit 1\nexec "${process.execPath}" scripts/dev.ts "$@" --currentWorkingDirectory "$checkout"\n`
        );
        await chmod(join(bin, 'stacktape'), 0o755);

        const aws = await startOfflineAwsServer();
        const stacktape = await startStacktapeApiRecorder();
        try {
          const offline = buildOfflineQualificationEnvironment({
            endpoint: aws.endpoint,
            invocationId: `j1-pipeline-${host}`,
            homeDirectory: home
          });
          // Only the loopback routing comes from the test. Credentials and the API key come from the step.
          const {
            STACKTAPE_API_KEY: _key,
            AWS_ACCESS_KEY_ID: _id,
            AWS_SECRET_ACCESS_KEY: _secret,
            ...routing
          } = offline;
          const result = await runProcess({
            command: 'sh',
            args: ['-c', step.command],
            cwd: project,
            env: {
              ...routing,
              ...step.environment,
              PATH: `${bin}:${offline.PATH ?? ''}`,
              STP_CUSTOM_TRPC_API_ENDPOINT: stacktape.url
            },
            timeoutMs: 4 * 60_000
          });
          const output = `${result.stdout}\n${result.stderr}`;

          expect(output).not.toContain('requires a Stacktape API key');
          expect(output).not.toMatch(/unknown (?:option|argument)/i);
          expect(stacktape.requests.length, output).toBeGreaterThan(0);
          expect(stacktape.requests.every((request) => request.apiKey === secrets.STACKTAPE_API_KEY)).toBe(true);
        } finally {
          await stacktape.close();
          await aws.close();
        }
      },
      5 * 60_000
    );
  }
});

describe('a fresh clone deployed by the written pipeline', () => {
  test(
    'github: a Vite site builds from a clean checkout the way the workflow runs it',
    async () => {
      // A single-page app with its lockfile committed and no node_modules, which is what CI checks out.
      const sandbox = await createInitSandbox({
        files: (id) => ({
          'package.json': `${JSON.stringify({
            name: `site-${id}`,
            private: true,
            scripts: { dev: 'vite', build: 'vite build' },
            devDependencies: { vite: '7.1.3' }
          })}\n`,
          'index.html':
            '<!doctype html><html><body><h1>site</h1><script type="module" src="/src/main.js"></script></body></html>\n',
          'src/main.js': "document.querySelector('h1').textContent = 'built';\n"
        }),
        projectDirectoryName: 'site'
      });
      sandboxes.push(sandbox);
      const developerEnvironment = { PATH: process.env.PATH, HOME: sandbox.home, CI: '1' };
      const lockfile = await runProcess({
        command: 'npm',
        args: ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'],
        cwd: sandbox.project,
        env: developerEnvironment,
        timeoutMs: 3 * 60_000
      });
      expect(lockfile.exitCode, lockfile.stderr).toBe(0);

      const init = await runSourceInit({ sandbox, args: ['--codingAgent', 'none'] });
      expect(init.exitCode, init.output).toBe(0);
      expect(await readFile(join(sandbox.project, 'stacktape.yml'), 'utf8')).toContain('type: hosting-bucket');

      const written = await writePipeline({
        repositoryRoot: sandbox.project,
        host: 'github',
        inputs: {
          configPath: 'stacktape.yml',
          stage: 'production',
          region: 'eu-west-1',
          projectName: 'site',
          cliVersion: '4.0.0'
        }
      });
      const workflow = parseYaml(await readFile(written.path, 'utf8')) as any;
      // Every shell step before the deploy runs in the checkout, as the runner would run it. Installing the
      // pinned CLI is skipped: the current source stands in for it.
      for (const step of workflow.jobs.deploy.steps as Array<Record<string, any>>) {
        if (typeof step.run !== 'string') continue;
        if (step.run.includes('stacktape deploy')) break;
        if (/npm install -g stacktape@/.test(step.run)) continue;
        const result = await runProcess({
          command: 'sh',
          args: ['-c', step.run],
          cwd: sandbox.project,
          env: developerEnvironment,
          timeoutMs: 4 * 60_000
        });
        expect(result.exitCode, `${step.run}\n${result.stdout}\n${result.stderr}`).toBe(0);
      }

      // What `stacktape deploy` builds before it touches CloudFormation. Today the site's `vite build` runs in a
      // checkout where nothing installed vite.
      await packageOffline({ sandbox, configFile: 'stacktape.yml', projectName: `j1-site-${sandbox.id}` });
    },
    8 * 60_000
  );
});
