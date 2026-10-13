/**
 * The `stacktape init` wizard with a scripted world around it, for browser tests and UI review.
 *
 * The real wizard server and session run here, serving the built `apps/init-ui` bundle, so the page goes through the
 * real handshake, CSRF checks, event stream, recomposition and file writes. Only what lies outside this machine or
 * would spend money is scripted: the scan replays facts recorded from a real repository (`projects/*.json`), and the
 * coding agent, AWS identity, Stacktape sign-in, price estimate, target check, local try-out and deploy child answer
 * from the scenario below. Every network request that is not loopback is refused (run with the network guard).
 *
 *   bun --preload scripts/network-guard-preload.ts scripts/init-wizard-fixture/server.ts '<scenario JSON>'
 *
 * The first stdout line is `{"url": "..."}`. Held steps wait for a line on stdin: `scan` finishes a held scan,
 * `deploy` lets a held deploy finish. Closing stdin stops the server.
 */

import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { ProjectFacts } from '@stacktape/config-inference/facts';
import type { StackPriceEstimationResponse } from '@stacktape/console-api/anonymous';

export type WizardFixtureScenario = {
  /** A recorded scan in `projects/`, e.g. `saas-starter`. */
  project: string;
  /** Coding agents this machine offers besides "Files only". */
  agents?: Array<'claude-code' | 'codex'>;
  /** `held` stays in progress until `scan` arrives on stdin; `fail` ends the way an agent crash does. */
  scan?: 'instant' | 'held' | 'fail';
  /** A configuration already in the repository, which makes the wizard write beside it. */
  existingConfig?: boolean;
  aws?: 'available' | 'no-credentials' | 'rejected';
  account?: 'signed-in' | 'signed-out' | 'no-page-sign-in';
  /** Whether the price API answers. */
  price?: boolean;
  target?: 'absent' | 'updateable' | 'blocked';
  verify?: 'passed' | 'failed' | 'unavailable';
  /** `held` stops mid-way through CloudFormation until `deploy` arrives on stdin, then succeeds. */
  deploy?: 'succeed' | 'fail' | 'held';
  gitHost?: 'github' | 'gitlab' | 'bitbucket';
};

const scenario = JSON.parse(process.argv[2] ?? '{}') as WizardFixtureScenario;
const fixtureDirectory = import.meta.dir;
const bundle = process.env.STACKTAPE_WIZARD_BUNDLE ?? join(fixtureDirectory, '..', '..', '..', 'init-ui', 'dist');

const stdinLines = createInterface({ input: process.stdin });
const waiting = new Map<string, Array<() => void>>();
const waitFor = (command: string) =>
  new Promise<void>((resolve) => waiting.set(command, [...(waiting.get(command) ?? []), resolve]));
stdinLines.on('line', (line) => {
  const command = line.trim();
  for (const resolve of waiting.get(command) ?? []) resolve();
  waiting.delete(command);
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Monthly prices by resource type, in the shape the anonymous price API returns them. */
const FLAT_MONTHLY_BY_TYPE: Readonly<Record<string, number>> = {
  'relational-database': 15.33,
  bastion: 3.8,
  'web-service': 18.07,
  'worker-service': 9.01,
  'redis-cluster': 12.41,
  'multi-container-workload': 18.07
};

const startPriceApi = async () => {
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (request.method !== 'POST' || path !== '/stackPriceEstimation' || scenario.price === false) {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end('[]');
      return;
    }
    const { stackConfig } = (
      JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, { stackConfig: string }>
    )['0']!;
    const { parse } = await import('yaml');
    const resources = (parse(stackConfig) as { resources?: Record<string, { type: string }> }).resources ?? {};
    const resourcesBreakdown: NonNullable<StackPriceEstimationResponse['costs']>['resourcesBreakdown'] = {};
    let flatMonthlyCost = 0;
    for (const [name, resource] of Object.entries(resources)) {
      const flat = FLAT_MONTHLY_BY_TYPE[resource.type];
      flatMonthlyCost += flat ?? 0;
      resourcesBreakdown[name] = {
        priceInfo: {
          totalMonthlyFlat: flat ?? 0,
          incomplete: false,
          costBreakdown: [
            flat === undefined
              ? { name: 'Requests', description: 'Billed per request', priceModel: 'pay-per-use' }
              : { name: 'Compute', description: 'Always on', priceModel: 'flat', pricePerMonth: flat }
          ]
        }
      };
    }
    const estimate: StackPriceEstimationResponse = {
      success: true,
      costs: {
        flatMonthlyCost: Math.round(flatMonthlyCost * 100) / 100,
        incomplete: false,
        unpricedResources: [],
        resourcesBreakdown
      }
    };
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify([{ result: { data: estimate } }]));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The price API stand-in has no port.');
  return { url: `http://127.0.0.1:${address.port}`, close: () => server.close() };
};

const priceApi = await startPriceApi();
// Read once at module load by the API client, so it is set before anything below imports it.
process.env.STP_CUSTOM_TRPC_API_ENDPOINT = priceApi.url;

const { startWizardSession } = await import('../../src/init/server/wizard-session');
const { agentOptions } = await import('../../src/init/run-init');
const { writeComposedConfig } = await import('../../src/init/write-config');
const { writePipeline } = await import('../../src/init/cicd/write-pipeline');
const { deployCommandLine } = await import('../../src/init/deploy/run-deploy');
const { composeConfig } = await import('@stacktape/config-inference/compose');
const { checkFactsCompleteness } = await import('@stacktape/config-inference/facts');
const { getStackName } = await import('@stacktape/naming/stacks');
const versionJson = (await import('@generated/db-engine-versions/versions.json', { with: { type: 'json' } })).default;

const facts = JSON.parse(
  readFileSync(join(fixtureDirectory, 'projects', `${scenario.project}.json`), 'utf8')
) as ProjectFacts;
const projectName = scenario.project;
const repositoryRoot = await mkdtemp(join(tmpdir(), `stacktape-wizard-${projectName}-`));
const repositoryPath = `/home/dev/code/${projectName}`;
if (scenario.existingConfig === true) {
  await Bun.write(join(repositoryRoot, 'stacktape.yml'), 'resources: {}\n');
}

const ACCOUNT_ID = '481516234200';
const AGENT_VERSIONS = { 'claude-code': '2.1.296 (Claude Code)', codex: 'codex-cli 0.98.0' } as const;
/** Timeline entries as `toTimelineEntry` labels a Claude Code session's tool calls: the tool, then its path or pattern. */
const SCAN_TIMELINE: Array<{ kind: string; label: string }> = [
  { kind: 'tool', label: 'get_project_brief get_project_brief' },
  { kind: 'tool', label: 'read_file package.json' },
  { kind: 'tool', label: 'list_dir app' },
  { kind: 'tool', label: 'grep process.env' },
  { kind: 'tool', label: 'read_file .env.example' },
  { kind: 'tool', label: 'submit_facts submit_facts' }
];

/** One deploy, as the CLI's JSONL stream would report it for this composition. */
const deployEvents = (resourceNames: string[]) => {
  const at = () => new Date().toISOString();
  const event = (phase: string, eventType: string, status: string, message: string, detail?: object) => ({
    type: 'event',
    ts: at(),
    phase,
    eventType,
    status,
    message,
    ...(detail === undefined ? {} : { detail })
  });
  const total = resourceNames.length * 9 + 6;
  const progress = (completed: number, inProgress: string[]) =>
    event(
      'DEPLOY',
      'UPDATE_STACK',
      'running',
      `${completed}/${total} resources (${Math.round((completed / total) * 100)}%)`,
      {
        kind: 'cloudformation-progress',
        stackAction: 'create',
        status: 'active',
        completedCount: completed,
        totalPlanned: total,
        percent: Math.round((completed / total) * 100),
        inProgressCount: inProgress.length,
        inProgressResources: inProgress,
        changeCounts: { created: total, updated: 0, deleted: 0 }
      }
    );
  return {
    before: [
      event('INITIALIZE', 'LOAD_CONFIG_FILE', 'started', 'Loading configuration file'),
      event('INITIALIZE', 'LOAD_CONFIG_FILE', 'completed', 'Configuration file loaded'),
      event('INITIALIZE', 'FETCH_STACK_DATA', 'completed', 'Stack data fetched'),
      event('BUILD_AND_PACKAGE', 'PACKAGE_ARTIFACTS', 'started', `Packaging ${resourceNames.join(', ')}`),
      { type: 'output', ts: at(), stream: 'stdout', lines: ['Installing dependencies…', 'Built in 41.2s'] },
      event('BUILD_AND_PACKAGE', 'PACKAGE_ARTIFACTS', 'completed', 'Packaged 1 artifact'),
      event('UPLOAD', 'UPLOAD_DEPLOYMENT_ARTIFACTS', 'completed', 'Uploaded 1 artifact (38.4 MB)'),
      event('DEPLOY', 'UPDATE_STACK', 'started', `Creating stack ${getStackName(projectName, 'dev')}`),
      progress(4, resourceNames.slice(0, 2)),
      progress(Math.round(total * 0.45), resourceNames.slice(-2))
    ],
    success: [
      progress(total - 2, resourceNames.slice(-1)),
      progress(total, []),
      event('DEPLOY', 'UPDATE_STACK', 'completed', 'Stack created'),
      event('POST_DEPLOY', 'INVALIDATE_CACHE', 'completed', 'Cache invalidated'),
      { type: 'result', ts: at(), ok: true, code: 'OK', message: 'Deployed.' }
    ],
    failure: (failedResource: string) => [
      progress(Math.round(total * 0.7), [failedResource]),
      {
        type: 'log',
        ts: at(),
        level: 'error',
        source: 'cli',
        message: `Service ${failedResource} failed to start\n\nEssential container in task exited (exit code 1). Last lines it printed:\n  Error: connect ECONNREFUSED 127.0.0.1:5432\n      at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1611:16)\n  Server exited with code 1`
      },
      event('DEPLOY', 'ROLLBACK_STACK', 'completed', 'Rolled back: no resources were kept'),
      {
        type: 'result',
        ts: at(),
        ok: false,
        code: 'DEPLOY_FAILED',
        message: `Service ${failedResource} failed to start. The stack was rolled back.`
      }
    ]
  };
};

const agents = agentOptions(
  (scenario.agents ?? ['claude-code']).map((id) => ({
    id,
    executable: `/usr/local/bin/${id === 'claude-code' ? 'claude' : 'codex'}`,
    version: AGENT_VERSIONS[id],
    capabilities: {
      canDisableBuiltInTools: true,
      enforcesTurnLimit: true,
      acceptsSystemPrompt: true,
      emitsStructuredTranscript: true,
      isolatedMcpConfig: true
    }
  })),
  undefined
);

const session = await startWizardSession({
  projectName,
  repositoryPath,
  ...(scenario.existingConfig === true ? { existingConfig: 'stacktape.yml' } : {}),
  agents: agents.map((agent, index) =>
    index === 0 ? { ...agent, recommended: true } : { ...agent, recommended: undefined }
  ),
  timeline: [],
  start: async (choice, onProgress) => {
    // Files only reads without an agent, so there are no tool calls to report.
    const timeline = choice.agentId === 'none' ? [] : SCAN_TIMELINE;
    for (const entry of timeline.slice(0, 3)) onProgress(entry);
    if (scenario.scan === 'held') await waitFor('scan');
    for (const entry of timeline.slice(3)) onProgress(entry);
    if (scenario.scan === 'fail') {
      throw new Error('Claude Code exited before it finished (exit code 1): Credit balance is too low.');
    }
    const composition = composeConfig({ facts, projectName, engineVersions: versionJson.rds });
    return { facts, composition, verification: [], completeness: checkFactsCompleteness(facts) };
  },
  write: ({ composition, format }) => writeComposedConfig({ repositoryRoot, composition, format }),
  verify: async ({ composition }) => {
    await sleep(300);
    if (scenario.verify === 'unavailable') return { status: 'unavailable', services: [] };
    const services = Object.entries(composition.config.resources)
      .filter(([, resource]) => resource.type === 'web-service' || resource.type === 'worker-service')
      .map(([resourceName], index) => ({
        serviceName: resourceName,
        resourceName,
        status: scenario.verify === 'failed' && index === 0 ? ('failed' as const) : ('passed' as const),
        reason:
          scenario.verify === 'failed' && index === 0
            ? 'It exited during startup, before it listened on port 3000.'
            : 'It started and listened on port 3000.',
        observations: {
          listeningPorts: scenario.verify === 'failed' && index === 0 ? [] : [3000],
          dialedDependency: false,
          missingEnvironmentVariables: scenario.verify === 'failed' && index === 0 ? ['SESSION_SECRET'] : [],
          logTail:
            scenario.verify === 'failed' && index === 0
              ? [
                  '> start',
                  '> node ./server/index.js',
                  'Error: SESSION_SECRET is not set',
                  'Process exited with code 1'
                ]
              : []
        }
      }));
    return { status: 'completed', services };
  },
  awsIdentity: async () => {
    await sleep(150);
    if (scenario.aws === 'no-credentials') {
      return { available: false, reason: 'no-credentials', detail: 'No AWS credentials were found on this machine.' };
    }
    if (scenario.aws === 'rejected') {
      return { available: false, reason: 'rejected', detail: 'The security token included in the request is expired.' };
    }
    return { available: true, accountId: ACCOUNT_ID, arn: `arn:aws:iam::${ACCOUNT_ID}:user/dev`, region: 'eu-west-1' };
  },
  stacktapeAccount: async () => {
    await sleep(150);
    return scenario.account === 'signed-out' || scenario.account === 'no-page-sign-in'
      ? { signedIn: false, detail: 'This machine is not signed in to Stacktape.' }
      : { signedIn: true, detail: 'Signed in.', email: 'dev@acme.io', organization: 'Acme' };
  },
  ...(scenario.account === 'no-page-sign-in'
    ? {}
    : {
        signIn: {
          startGoogle: async () => ({
            ok: true,
            authorizationUrl: 'https://auth.stacktape.com/oauth2/authorize?identity_provider=Google',
            completed: new Promise(() => {}),
            cancel: () => {}
          }),
          signUp: async () => ({ ok: true, confirmed: false }),
          confirmSignUp: async ({ code }) => (code === '123456' ? { ok: true } : { ok: false, code: 'code-mismatch' }),
          resendCode: async () => ({ ok: true }),
          signIn: async ({ password }) =>
            password === 'correct-password'
              ? { ok: true, next: 'authenticated', idToken: 'fixture-id-token' }
              : { ok: false, code: 'invalid-credentials' },
          answerMfa: async () => ({ ok: true, idToken: 'fixture-id-token' }),
          exchange: async () => ({ ok: true, apiKey: 'fixture-api-key' }),
          saveApiKey: async () => {
            scenario.account = 'signed-in';
          }
        }
      }),
  ...(scenario.gitHost === undefined
    ? {}
    : {
        gitHost: scenario.gitHost,
        writePipeline: async ({ configFile, stage, region }) => {
          const written = await writePipeline({
            repositoryRoot,
            host: scenario.gitHost!,
            inputs: { configPath: configFile.filename, stage, region, projectName, cliVersion: '4.0.0' }
          });
          return {
            filename: written.filename,
            host: written.host,
            authSummary: written.authSummary,
            requiredSecrets: written.requiredSecrets
          };
        }
      }),
  inspectDeployTarget: async ({ stage, region }) => {
    await sleep(250);
    const identity = {
      schemaVersion: 1 as const,
      accountId: ACCOUNT_ID,
      stackName: getStackName(projectName, stage),
      projectName,
      stage,
      region,
      configSha256: 'fixture'
    };
    if (scenario.target === 'updateable') {
      return {
        ...identity,
        status: 'updateable',
        stackId: `arn:aws:cloudformation:${region}:${ACCOUNT_ID}:stack/${identity.stackName}/0b6f7a10-5d2e-11f1-9c1e-0a1b2c3d4e5f`,
        stackStatus: 'UPDATE_COMPLETE'
      };
    }
    if (scenario.target === 'blocked') {
      return { ...identity, status: 'blocked', reason: 'unsafe-status', stackStatus: 'ROLLBACK_COMPLETE' };
    }
    return { ...identity, status: 'absent' };
  },
  deploy: async ({ configFile, stage, region, onEvent, onCommand }) => {
    onCommand(deployCommandLine({ repositoryRoot, configPath: configFile.filename, stage, region, projectName }));
    const resources = Object.entries(
      composeConfig({ facts, projectName, engineVersions: versionJson.rds }).config.resources
    );
    const resourceNames = resources.map(([name]) => name);
    const script = deployEvents(resourceNames);
    for (const entry of script.before) {
      onEvent(entry);
      await sleep(120);
    }
    if (scenario.deploy === 'held') await waitFor('deploy');
    // The app container is what fails to start; the bucket or database beside it never does.
    const failedResource =
      resources.find(([, resource]) => resource.type === 'web-service' || resource.type === 'worker-service')?.[0] ??
      resourceNames[0]!;
    const tail = scenario.deploy === 'fail' ? script.failure(failedResource) : script.success;
    for (const entry of tail) {
      onEvent(entry);
      await sleep(120);
    }
    const result = tail.at(-1) as { ok: boolean; code: string; message: string };
    return {
      ok: result.ok,
      code: result.code,
      message: result.message,
      ...(result.ok ? { urls: [`https://${projectName}-dev-7f3a9c.stacktape-app.com`] } : {})
    };
  },
  staticRoot: bundle
});

console.log(JSON.stringify({ url: session.server.url }));

const shutDown = async () => {
  await session.close();
  priceApi.close();
  await rm(repositoryRoot, { recursive: true, force: true });
  process.exit(0);
};
stdinLines.on('close', () => void shutDown());
process.on('SIGTERM', () => void shutDown());
process.on('SIGINT', () => void shutDown());
