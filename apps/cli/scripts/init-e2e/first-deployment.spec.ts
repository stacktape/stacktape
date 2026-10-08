/**
 * J1.1: an existing repository goes through `stacktape init` in the terminal and comes out as a configuration
 * that packages into an artifact which answers HTTP the way the deployed service would be called.
 *
 * Every step is the current source CLI as a child process. The only stand-ins are external: the Claude Code
 * binary (a recorded transcript that still talks to the real init MCP server) and Stacktape's anonymous price
 * API (a loopback stub). Packaging uses the project-qualification loopback AWS guard, and the image runs in the
 * local Docker daemon with the environment and port its synthesized task definition declares.
 *
 * Run with `pnpm --filter @stacktape/cli test:init:e2e`. Needs Docker and the dev helper artifacts
 * (`pnpm --filter @stacktape/cli build:dev-artifacts`).
 */

import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { validateConfigYaml } from '../code-generation/validate-config-string';
import { runProcess } from '../qualification/process';
import {
  assertDockerAvailable,
  containerDefinitionFor,
  createInitSandbox,
  lockPnpmDependencies,
  interruptSourceInitDuringAnalysis,
  packageOffline,
  requestRunningImage,
  runSourceInit,
  type InitSandbox
} from './harness';
import type { AgentLogEntry, AgentScript } from './recorded-agent-cli';

const cliDirectory = join(import.meta.dir, '..', '..');
const sandboxes: InitSandbox[] = [];

beforeAll(() => assertDockerAvailable());

afterEach(async () => {
  const results = await Promise.allSettled(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failures.length > 0)
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      'Cleanup failed.'
    );
});

const sandboxFor = async (...args: Parameters<typeof createInitSandbox>) => {
  const sandbox = await createInitSandbox(...args);
  sandboxes.push(sandbox);
  return sandbox;
};

const toolResults = (log: readonly AgentLogEntry[]) =>
  log.filter((entry): entry is Extract<AgentLogEntry, { type: 'tool-result' }> => entry.type === 'tool-result');

/**
 * An Express API whose settings come from a config module that destructures `process.env`. The scan finds the
 * service and its entrypoint but not the port or the payments token, so the agent is asked; only the agent can
 * say that the token is a third-party secret.
 */
const ordersApi = (id: string) => ({
  'package.json': `${JSON.stringify(
    {
      name: `orders-${id}`,
      private: true,
      scripts: { start: 'node src/server.js' },
      dependencies: { express: '5.1.0' }
    },
    null,
    2
  )}\n`,
  'src/config.js': [
    "const { PAYMENTS_API_TOKEN, PORT = '8080' } = process.env;",
    '',
    'module.exports = { port: Number(PORT), paymentsToken: PAYMENTS_API_TOKEN };',
    ''
  ].join('\n'),
  'src/server.js': [
    "const express = require('express');",
    "const config = require('./config');",
    '',
    'const app = express();',
    "app.get('/', (_request, response) => response.json({ service: 'orders', paymentsConfigured: Boolean(config.paymentsToken) }));",
    'app.listen(config.port, process.env.HOST);',
    ''
  ].join('\n')
});

/** What a model reviewing that draft does: read the gap, cite it, classify the key, submit. */
const ordersAgentTranscript = (serviceName: string): AgentScript => ({
  behavior: 'run',
  calls: [
    { tool: 'get_project_brief', arguments: {} },
    { tool: 'read_file', arguments: { path: 'src/config.js' } },
    { tool: 'grep', arguments: { pattern: 'PAYMENTS_API_TOKEN' } },
    {
      tool: 'submit_facts',
      arguments: {
        schemaVersion: 1,
        services: [
          {
            name: serviceName,
            path: '.',
            language: 'javascript',
            exposesHttp: true,
            executionModel: 'long-running',
            port: 8080,
            environmentVariables: [
              {
                name: 'PAYMENTS_API_TOKEN',
                role: 'third-party-secret',
                evidence: [
                  {
                    file: 'src/config.js',
                    line: 1,
                    quote: "const { PAYMENTS_API_TOKEN, PORT = '8080' } = process.env;"
                  }
                ]
              }
            ],
            evidence: [
              {
                field: 'port',
                file: 'src/config.js',
                line: 1,
                quote: "const { PAYMENTS_API_TOKEN, PORT = '8080' } = process.env;"
              }
            ]
          }
        ]
      }
    }
  ],
  usage: { inputTokens: 5_400, outputTokens: 610, costUsd: 0.03 }
});

describe('stacktape init in the terminal: existing repository to a running artifact', () => {
  test(
    'a recorded agent fills what the scan missed, and the written config packages into an image that answers on the routed port',
    async () => {
      const sandbox = await sandboxFor({ files: ordersApi, projectDirectoryName: 'orders' });
      const serviceName = `orders-${sandbox.id}`;

      const init = await runSourceInit({
        sandbox,
        args: ['--codingAgent', 'claude-code'],
        agent: ordersAgentTranscript(serviceName)
      });
      expect(init.exitCode, init.output).toBe(0);

      // The vendor CLI was driven inert: no built-in tools, only our MCP server, a turn ceiling, in the project.
      const invocation = init.agentLog.find(
        (entry): entry is Extract<AgentLogEntry, { type: 'invocation' }> => entry.type === 'invocation'
      );
      expect(
        invocation?.argv.slice(invocation.argv.indexOf('--tools'), invocation.argv.indexOf('--tools') + 2)
      ).toEqual(['--tools', '']);
      expect(invocation?.argv).toContain('--strict-mcp-config');
      expect(invocation?.argv).toContain('--max-turns');
      expect(invocation?.cwd).toBe(sandbox.project);
      // The agent is asked about what the scan could not settle, not to redo the scan.
      expect(invocation?.prompt).toContain(`Find the port \\"${serviceName}\\" listens on.`);
      // The session's toolbox is the init registry and nothing that could deploy.
      expect(init.agentLog.find((entry) => entry.type === 'tools')).toEqual({
        type: 'tools',
        names: ['get_project_brief', 'read_file', 'list_dir', 'glob', 'grep', 'submit_facts']
      });
      // Tool answers came from the real files through the real MCP server.
      const results = toolResults(init.agentLog);
      expect(JSON.stringify(results.find((entry) => entry.tool === 'read_file')?.result)).toContain("PORT = '8080'");
      expect(results.find((entry) => entry.tool === 'submit_facts')?.result).toEqual({ accepted: true });

      expect(init.output).toContain('Using claude-code');
      expect(init.output).toContain('not sent to Stacktape');
      expect(init.output).toContain('About $42/mo in eu-west-1');
      expect(init.output).toContain(`Wrote ${join(sandbox.project, 'stacktape.yml')}`);

      const configText = await readFile(join(sandbox.project, 'stacktape.yml'), 'utf8');
      expect(validateConfigYaml(configText).errors).toEqual([]);
      // The agent's classification reached the file as a secret reference, never as a value.
      expect(configText).toMatch(/name: PAYMENTS_API_TOKEN\n\s+value: \$Secret\('payments_api_token'\)/);
      // The price shown is the price of the file that was written.
      expect(init.api.pricedConfigs).toEqual([configText]);
      expect(init.api.unexpectedRequests).toEqual([]);

      const packaged = await packageOffline({
        sandbox,
        configFile: 'stacktape.yml',
        projectName: `j1-orders-${sandbox.id}`
      });
      expect(packaged.packagedWorkloads).toHaveLength(1);

      const jobName = packaged.packagedWorkloads[0]!.jobName;
      const container = containerDefinitionFor(packaged.template, jobName);
      // The key reaches the task as a Secrets Manager reference that AWS resolves; its value is never in the template.
      expect(container.Environment).toContainEqual({
        Name: 'PAYMENTS_API_TOKEN',
        Value: expect.stringMatching(/^\{\{resolve:secretsmanager:payments_api_token:/)
      });
      expect(await readFile(packaged.templatePath, 'utf8')).not.toContain('offline-qualification-secret');

      const response = await requestRunningImage({ jobName, container });
      expect(response.status, response.logs).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ service: 'orders', paymentsConfigured: false });
    },
    8 * 60_000
  );

  test(
    'a TypeScript config written by init loads, packages and runs, in a Node project and in a Go project',
    async () => {
      const cliVersion = (JSON.parse(await readFile(join(cliDirectory, 'package.json'), 'utf8')) as { version: string })
        .version;
      /** Bun would put an auto-installed `stacktape` here; the config must never cause that. */
      const bunInstalledStacktape = async (sandbox: InitSandbox) => {
        const cache = join(sandbox.home, '.cache', '.bun', 'install', 'cache');
        return existsSync(cache) ? (await readdir(cache)).filter((name) => name.startsWith('stacktape')) : [];
      };

      // A Node project: init pins `stacktape` to its own version and says how to install it. The checkout has
      // node_modules, as a developer's does, but not the new package yet.
      const node = await sandboxFor({ files: ordersApi, projectDirectoryName: 'orders' });
      await mkdir(join(node.project, 'node_modules'));
      const nodeInit = await runSourceInit({
        sandbox: node,
        args: ['--codingAgent', 'claude-code', '--configFormat', 'typescript'],
        agent: ordersAgentTranscript(`orders-${node.id}`)
      });
      expect(nodeInit.exitCode, nodeInit.output).toBe(0);
      expect(nodeInit.output).toContain(`Wrote ${join(node.project, 'stacktape.ts')}`);
      expect(nodeInit.output).toContain(`Added stacktape@${cliVersion} to devDependencies in package.json`);
      expect(nodeInit.output).toContain('Run `npm install` before deploying.');
      expect(existsSync(join(node.project, 'stacktape.yml'))).toBe(false);
      const manifest = JSON.parse(await readFile(join(node.project, 'package.json'), 'utf8')) as {
        dependencies: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      expect(manifest.devDependencies).toEqual({ stacktape: cliVersion });
      expect(manifest.dependencies).toEqual({ express: '5.1.0' });

      // The user's `npm install`. A development CLI's version is not on npm, so a local package with that version
      // stands in for the published one; like the release, it is the CLI's own authoring source. The config then
      // loads from the project's installed copy rather than the CLI's.
      const published = join(node.root, 'stacktape-package');
      await mkdir(published);
      await writeFile(
        join(published, 'package.json'),
        `${JSON.stringify({ name: 'stacktape', version: cliVersion, main: 'index.js' })}\n`
      );
      await writeFile(
        join(published, 'index.js'),
        `module.exports = require(${JSON.stringify(join(cliDirectory, '..', '..', 'packages', 'config-authoring', 'src', 'index.ts'))});\n`
      );
      await writeFile(
        join(node.project, 'package.json'),
        `${JSON.stringify({ ...manifest, devDependencies: { stacktape: `file:${published}` } }, null, 2)}\n`
      );
      const install = await runProcess({
        command: 'npm',
        args: ['install', '--no-audit', '--no-fund', '--ignore-scripts'],
        cwd: node.project,
        env: { PATH: process.env.PATH, HOME: node.home, CI: '1' },
        timeoutMs: 4 * 60_000
      });
      expect(install.exitCode, install.stderr).toBe(0);

      const nodePackaged = await packageOffline({
        sandbox: node,
        configFile: 'stacktape.ts',
        projectName: `j1-orders-${node.id}`
      });
      const nodeJob = nodePackaged.packagedWorkloads[0]!.jobName;
      const nodeContainer = containerDefinitionFor(nodePackaged.template, nodeJob);
      expect(nodeContainer.Environment).toContainEqual({
        Name: 'PAYMENTS_API_TOKEN',
        Value: expect.stringMatching(/^\{\{resolve:secretsmanager:payments_api_token:/)
      });
      const nodeResponse = await requestRunningImage({ jobName: nodeJob, container: nodeContainer });
      expect(nodeResponse.status, nodeResponse.logs).toBe(200);
      expect(await bunInstalledStacktape(node)).toEqual([]);

      // A Go project: no package.json and no node_modules. The CLI serves `stacktape` from its own runtime, and
      // init adds no Node manifest. The fixed listen port reaches the config too.
      const go = await sandboxFor({
        files: (id) => ({
          'go.mod': `module example.com/inventory${id}\n\ngo 1.22\n`,
          'main.go': [
            'package main',
            '',
            'import "net/http"',
            '',
            'func main() {',
            '\thttp.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("inventory")) })',
            '\thttp.ListenAndServe(":8080", nil)',
            '}',
            ''
          ].join('\n')
        }),
        projectDirectoryName: 'inventory'
      });
      const goInit = await runSourceInit({
        sandbox: go,
        args: ['--codingAgent', 'none', '--configFormat', 'typescript']
      });
      expect(goInit.exitCode, goInit.output).toBe(0);
      expect(goInit.output).not.toContain('devDependencies');
      expect(existsSync(join(go.project, 'package.json'))).toBe(false);
      expect(await readFile(join(go.project, 'stacktape.ts'), 'utf8')).toContain('port: 8080');

      const goPackaged = await packageOffline({
        sandbox: go,
        configFile: 'stacktape.ts',
        projectName: `j1-inventory-${go.id}`
      });
      expect(existsSync(join(go.project, 'node_modules'))).toBe(false);
      const goJob = goPackaged.packagedWorkloads[0]!.jobName;
      const goResponse = await requestRunningImage({
        jobName: goJob,
        container: containerDefinitionFor(goPackaged.template, goJob)
      });
      expect(goResponse.status, goResponse.logs).toBe(200);
      expect(goResponse.body).toBe('inventory');
      expect(await bunInstalledStacktape(go)).toEqual([]);
    },
    10 * 60_000
  );

  test(
    'an app that listens on a fixed port gets a config that routes to it, from the scan alone or from the agent',
    async () => {
      // `app.listen(4000)`: the most common shape in tutorials and older services. Stacktape routes a web-service's
      // traffic to $PORT, 3000 unless the config sets `port`, so init has to write the port the app listens on.
      const ledger = (id: string, server: string, extra: Record<string, string> = {}) => ({
        'package.json': `${JSON.stringify({ name: `ledger-${id}`, private: true, scripts: { start: 'node src/server.js' }, dependencies: { express: '5.1.0' } })}\n`,
        'src/server.js': [
          "const express = require('express');",
          "const settings = require('./settings');",
          '',
          'const app = express();',
          "app.get('/', (_request, response) => response.json({ service: 'ledger' }));",
          server,
          ''
        ].join('\n'),
        'src/settings.js': 'module.exports = { port: 4100 };\n',
        ...extra
      });
      const expectRoutedPortAnswers = async (sandbox: InitSandbox, port: number) => {
        const configText = await readFile(join(sandbox.project, 'stacktape.yml'), 'utf8');
        expect(configText).toContain(`port: ${port}`);
        const packaged = await packageOffline({
          sandbox,
          configFile: 'stacktape.yml',
          projectName: `j1-ledger-${sandbox.id}`
        });
        const jobName = packaged.packagedWorkloads[0]!.jobName;
        const container = containerDefinitionFor(packaged.template, jobName);
        expect(container.PortMappings?.[0]?.ContainerPort).toBe(port);
        const response = await requestRunningImage({ jobName, container, deadlineMs: 20_000 });
        expect(response.status, response.logs).toBe(200);
      };

      // Files only: the literal in the listen call is enough.
      const scanned = await sandboxFor({
        files: (id) => ledger(id, "app.listen(4000, () => console.log('ledger listening on 4000'));"),
        projectDirectoryName: 'ledger'
      });
      const scanInit = await runSourceInit({ sandbox: scanned, args: ['--codingAgent', 'none'] });
      expect(scanInit.exitCode, scanInit.output).toBe(0);
      await expectRoutedPortAnswers(scanned, 4000);

      // A port the scan cannot resolve (it lives in another module) is the agent's to cite.
      const cited = await sandboxFor({
        files: (id) => ledger(id, 'app.listen(settings.port);'),
        projectDirectoryName: 'ledger'
      });
      const agentInit = await runSourceInit({
        sandbox: cited,
        args: ['--codingAgent', 'claude-code'],
        agent: {
          behavior: 'run',
          calls: [
            { tool: 'get_project_brief', arguments: {} },
            { tool: 'read_file', arguments: { path: 'src/settings.js' } },
            {
              tool: 'submit_facts',
              arguments: {
                schemaVersion: 1,
                services: [
                  {
                    name: `ledger-${cited.id}`,
                    path: '.',
                    language: 'javascript',
                    exposesHttp: true,
                    executionModel: 'long-running',
                    port: 4100,
                    evidence: [
                      { field: 'port', file: 'src/settings.js', line: 1, quote: 'module.exports = { port: 4100 };' }
                    ]
                  }
                ]
              }
            }
          ]
        }
      });
      expect(agentInit.exitCode, agentInit.output).toBe(0);
      expect(toolResults(agentInit.agentLog).find((entry) => entry.tool === 'submit_facts')?.result).toEqual({
        accepted: true
      });
      await expectRoutedPortAnswers(cited, 4100);
    },
    8 * 60_000
  );

  test(
    'Ctrl+C during the analysis stops the agent and its MCP server, and writes no configuration',
    async () => {
      const sandbox = await sandboxFor({ files: ordersApi, projectDirectoryName: 'orders' });

      const interrupted = await interruptSourceInitDuringAnalysis({ sandbox });

      expect(interrupted.exit, interrupted.output).toBeDefined();
      // Nothing keeps spending the user's subscription after they asked to stop.
      expect(interrupted.survivors).toEqual([]);
      expect(interrupted.output).toContain('Received SIGINT');
      expect(existsSync(join(sandbox.project, 'stacktape.yml'))).toBe(false);
      expect(existsSync(join(sandbox.project, 'stacktape.generated.yml'))).toBe(false);
    },
    3 * 60_000
  );

  test(
    'an existing stacktape.yml is never touched, and a repeated run refreshes only the file init owns',
    async () => {
      const handWritten = [
        '# Ours. Deployed by hand last spring.',
        'resources:',
        '  orders:',
        '    type: web-service',
        '    properties:',
        '      packaging:',
        '        type: js-bundle',
        '        properties:',
        '          entryfilePath: src/server.js',
        ''
      ].join('\n');
      const sandbox = await sandboxFor({
        files: (id) => ({ ...ordersApi(id), 'stacktape.yml': handWritten }),
        projectDirectoryName: 'orders'
      });

      const first = await runSourceInit({ sandbox, args: ['--codingAgent', 'none'] });
      expect(first.exitCode, first.output).toBe(0);
      expect(first.output).toContain('stacktape.yml was already here and has not been touched.');
      expect(first.output).toContain('--configPath stacktape.generated.yml');
      expect(await readFile(join(sandbox.project, 'stacktape.yml'), 'utf8')).toBe(handWritten);
      const generated = await readFile(join(sandbox.project, 'stacktape.generated.yml'), 'utf8');
      expect(validateConfigYaml(generated).errors).toEqual([]);

      // The generated file is init's own output, so a second run replaces it instead of numbering copies.
      await writeFile(join(sandbox.project, 'stacktape.generated.yml'), '# stale\n', 'utf8');
      const second = await runSourceInit({ sandbox, args: ['--codingAgent', 'none'] });
      expect(second.exitCode, second.output).toBe(0);
      expect(await readFile(join(sandbox.project, 'stacktape.yml'), 'utf8')).toBe(handWritten);
      expect(await readFile(join(sandbox.project, 'stacktape.generated.yml'), 'utf8')).toBe(generated);
      expect((await readdir(sandbox.project)).filter((name) => name.startsWith('stacktape')).toSorted()).toEqual([
        'stacktape.generated.yml',
        'stacktape.yml'
      ]);

      // The file it points the user at deploys: it packages and its image answers.
      const packaged = await packageOffline({
        sandbox,
        configFile: 'stacktape.generated.yml',
        projectName: `j1-orders-${sandbox.id}`
      });
      const jobName = packaged.packagedWorkloads[0]!.jobName;
      const response = await requestRunningImage({
        jobName,
        container: containerDefinitionFor(packaged.template, jobName)
      });
      expect(response.status, response.logs).toBe(200);
    },
    8 * 60_000
  );

  test(
    'a pnpm monorepo becomes one resource per deployable package, and the API packages with its workspace dependency',
    async () => {
      const sandbox = await sandboxFor({
        files: (id) => ({
          'package.json': `${JSON.stringify({ name: `shop-${id}`, private: true, packageManager: 'pnpm@10.12.1' })}\n`,
          'pnpm-workspace.yaml': 'packages:\n  - apps/*\n  - packages/*\n',
          'packages/shared/package.json': `${JSON.stringify({ name: '@shop/shared', version: '1.0.0', main: 'src/index.js' })}\n`,
          'packages/shared/src/index.js': "exports.greeting = () => 'hello from shared';\n",
          [`apps/api-${id}/package.json`]: `${JSON.stringify({
            name: `@shop/api-${id}`,
            private: true,
            scripts: { start: 'node src/server.js' },
            dependencies: { express: '5.1.0', '@shop/shared': 'workspace:*' }
          })}\n`,
          [`apps/api-${id}/src/server.js`]: [
            "const express = require('express');",
            "const { greeting } = require('@shop/shared');",
            '',
            'const app = express();',
            "app.get('/', (_request, response) => response.json({ message: greeting() }));",
            'app.listen(process.env.PORT || 3000, process.env.HOST);',
            ''
          ].join('\n'),
          'apps/web/package.json': `${JSON.stringify({
            name: '@shop/web',
            private: true,
            scripts: { dev: 'vite', build: 'vite build' },
            devDependencies: { vite: '7.1.3' }
          })}\n`,
          'apps/web/index.html':
            '<!doctype html><html><body><h1>shop</h1><script type="module" src="/src/main.js"></script></body></html>\n',
          'apps/web/src/main.js': "document.querySelector('h1').textContent = 'shop web';\n"
        }),
        projectDirectoryName: 'shop'
      });

      const init = await runSourceInit({ sandbox, args: ['--codingAgent', 'none'] });
      expect(init.exitCode, init.output).toBe(0);
      const config = parseYaml(await readFile(join(sandbox.project, 'stacktape.yml'), 'utf8')) as {
        resources: Record<string, { type: string; properties: Record<string, any> }>;
      };
      const resourceTypes = Object.entries(config.resources).map(([name, resource]) => [name, resource.type] as const);
      const apiName = `api${sandbox.id.charAt(0).toUpperCase()}${sandbox.id.slice(1)}`;
      expect(resourceTypes.toSorted(([left], [right]) => left.localeCompare(right))).toEqual([
        [apiName, 'web-service'],
        ['web', 'hosting-bucket']
      ]);
      expect(config.resources.web!.properties.uploadDirectoryPath).toBe('apps/web/dist');
      expect(config.resources.web!.properties.build?.workingDirectory).toBe('apps/web');

      // Committed lockfile, no node_modules: the checkout CI starts from. Packaging installs what each part needs.
      await lockPnpmDependencies(sandbox);
      const packaged = await packageOffline({
        sandbox,
        configFile: 'stacktape.yml',
        projectName: `j1-shop-${sandbox.id}`
      });
      const apiJob = packaged.packagedWorkloads.find((workload) =>
        workload.jobName.startsWith(`${apiName.toLowerCase()}-`)
      )?.jobName;
      expect(apiJob).toBeDefined();
      const response = await requestRunningImage({
        jobName: apiJob!,
        container: containerDefinitionFor(packaged.template, apiJob!)
      });
      expect(response.status, response.logs).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ message: 'hello from shared' });
    },
    8 * 60_000
  );

  test(
    'claims the agent cannot cite are refused while it is still there, and a failed agent leaves the scan result with its reason',
    async () => {
      const sandbox = await sandboxFor({ files: ordersApi, projectDirectoryName: 'orders' });
      const serviceName = `orders-${sandbox.id}`;
      const transcript = ordersAgentTranscript(serviceName);
      if (transcript.behavior !== 'run') throw new Error('unreachable');
      const honestSubmission = transcript.calls.at(-1)!;
      const invented = {
        tool: 'submit_facts',
        arguments: {
          ...honestSubmission.arguments,
          // "Probably caches": a Redis the code never mentions, with a quote that is not in the file.
          dependencies: [
            {
              name: 'cache',
              kind: 'redis',
              consumedBy: [serviceName],
              evidence: [
                {
                  field: 'kind',
                  file: 'src/server.js',
                  line: 2,
                  quote: 'const redis = createClient({ url: process.env.REDIS_URL });'
                }
              ]
            }
          ]
        }
      };

      const reviewed = await runSourceInit({
        sandbox,
        args: ['--codingAgent', 'claude-code'],
        agent: { ...transcript, calls: [...transcript.calls.slice(0, -1), invented, honestSubmission] }
      });
      expect(reviewed.exitCode, reviewed.output).toBe(0);
      const submissions = toolResults(reviewed.agentLog).filter((entry) => entry.tool === 'submit_facts');
      expect(submissions.map((entry) => (entry.result as { accepted: boolean }).accepted)).toEqual([false, true]);
      expect(JSON.stringify(submissions[0]!.result)).toContain('dependency:cache');
      const config = await readFile(join(sandbox.project, 'stacktape.yml'), 'utf8');
      expect(config).not.toContain('redis');
      expect(config).toContain("$Secret('payments_api_token')");

      // An agent that cannot run at all costs the user nothing but quality.
      await rm(join(sandbox.project, 'stacktape.yml'));
      const failed = await runSourceInit({
        sandbox,
        args: ['--codingAgent', 'claude-code'],
        agent: { behavior: 'fail', exitCode: 1, stderr: 'Invalid API key · Please run /login\n' }
      });
      expect(failed.exitCode, failed.output).toBe(0);
      expect(failed.output).toContain('The coding agent could not finish, so this result uses file scans only.');
      expect(failed.output).toContain('Invalid API key');
      const scanned = await readFile(join(sandbox.project, 'stacktape.yml'), 'utf8');
      expect(validateConfigYaml(scanned).errors).toEqual([]);
      expect(scanned).toMatch(new RegExp(`^  orders${sandbox.id}:$`, 'im'));
      // Only the agent could classify the token, so the scan-only file honestly lacks it.
      expect(scanned).not.toContain('PAYMENTS_API_TOKEN');
    },
    6 * 60_000
  );
});
