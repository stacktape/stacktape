import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client, isInputRequiredResult, type InputRequiredResult } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { getPlatform } from '@utils/bin-executable';
import { isWindowsPlatform } from '@utils/platform';
import { withPersistedApiKey } from '../src/app/global-state-manager/api-key-storage';
import type { PersistedState } from '../src/app/global-state-manager/types';
import { buildBinaryFile, copyMcpDocs } from './release/build-cli-sources';
import packageJson from '../package.json';

type RetrievalFixture = {
  name: string;
  query: string;
  expectedRoutes: string[];
  maxRank: number;
};

const retrievalFixtures: RetrievalFixture[] = [
  {
    name: 'Next.js deployment workflow',
    query: 'How do I deploy a Next.js app with Stacktape?',
    expectedRoutes: ['/resources/frontend/nextjs'],
    maxRank: 1
  },
  {
    name: 'Lambda property reference',
    query: 'What is the timeout property for Lambda functions?',
    expectedRoutes: ['/config-reference/function'],
    maxRank: 1
  },
  {
    name: 'Lambda logs workflow',
    query: 'How do I view logs for a deployed function?',
    expectedRoutes: [
      '/observability/logs',
      '/local-development/debugging-lambda-functions',
      '/cli/logs',
      '/cli/debug-logs'
    ],
    maxRank: 3
  },
  {
    name: 'DynamoDB CLI diagnostics',
    query: 'How do I query DynamoDB from the CLI?',
    expectedRoutes: ['/cli/query-dynamodb', '/cli/debug-dynamodb', '/resources/databases/dynamodb'],
    maxRank: 3
  },
  {
    name: 'S3 bucket referenceable params',
    query: 'What referenceable params does an S3 bucket expose?',
    expectedRoutes: ['/resources/storage/s3-bucket', '/configuration/referenceable-parameters'],
    maxRank: 3
  },
  {
    name: 'Relational database property lookup',
    query: 'What properties are available for relational database?',
    expectedRoutes: ['/config-reference/relational-database'],
    maxRank: 1
  },
  {
    name: 'Secrets in environment variables',
    query: 'How do I use secrets in environment variables?',
    expectedRoutes: ['/configuration/secrets'],
    maxRank: 2
  },
  {
    name: 'Custom domain on web service',
    query: 'How do I attach a custom domain to a web service?',
    expectedRoutes: ['/resources/compute/web-service', '/resources/networking/custom-domains'],
    maxRank: 3
  },
  {
    name: 'Connecting Lambda to Postgres',
    query: 'How do I connect a Lambda function to a Postgres database and use the connection string?',
    expectedRoutes: ['/configuration/connecting-resources', '/resources/compute/lambda-function'],
    maxRank: 2
  },
  {
    name: 'Preview changes command',
    query: 'What CLI command previews deployment changes before I deploy?',
    expectedRoutes: ['/cli/diff', '/cli/preview-changes', '/deployment-and-lifecycle/previewing-changes'],
    maxRank: 2
  },
  {
    name: 'SQL diagnostics command',
    query: 'How do I run a SQL query against an RDS database with the CLI debug command?',
    expectedRoutes: ['/cli/query-sql', '/cli/debug-sql'],
    maxRank: 1
  },
  {
    name: 'SQL diagnostics natural command-line wording',
    query: 'How do I query production postgres from the command line to check a row?',
    expectedRoutes: ['/cli/query-sql', '/cli/debug-sql'],
    maxRank: 1
  },
  {
    name: 'Schedule trigger workflow',
    query: 'How do I trigger a Lambda function on a cron schedule every day?',
    expectedRoutes: ['/resources/triggers/schedule-triggers'],
    maxRank: 3
  },
  {
    name: 'DynamoDB stream trigger workflow',
    query: 'How do I trigger a Lambda function from a DynamoDB stream?',
    expectedRoutes: ['/resources/triggers/dynamodb-streams'],
    maxRank: 5
  },
  {
    name: 'DynamoDB integration property lookup',
    query: 'DynamoDbIntegration streamArn startingPosition batchSize config reference',
    expectedRoutes: ['/resources/triggers/dynamodb-streams'],
    maxRank: 7
  }
];

type Envelope = { schemaVersion: string; ok: boolean; code: string; data?: Record<string, unknown> };

const envelope = (result: Awaited<ReturnType<Client['callTool']>>): Envelope => {
  assert('content' in result, 'Expected a tool result');
  const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === 'text')?.text;
  assert(text, 'Expected JSON text');
  const parsed = JSON.parse(text) as Envelope;
  assert.equal(parsed.schemaVersion, 'stacktape.mcp.tool-result.v1');
  assert.deepEqual(result.structuredContent, parsed, 'Text and structured output must agree');
  assert.equal(result.isError, !parsed.ok);
  return parsed;
};

// Project-level agent config files; the CLI's own `.stacktape` folder is not one of them.
const PROJECT_AGENT_CONFIGS = [
  '.mcp.json',
  '.cursor',
  '.vscode',
  '.codex',
  '.opencode',
  'opencode.json',
  'opencode.jsonc'
];
const agentConfigsIn = async (directory: string) =>
  (await readdir(directory)).filter((name) => PROJECT_AGENT_CONFIGS.includes(name));

const deadline = async <T>(promise: Promise<T>, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 10_000);
      })
    ]);
  } finally {
    clearTimeout(timer!);
  }
};

const verify = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-j12-mcp-'));
  const home = join(directory, 'home');
  const project = join(directory, 'project');
  const apiKey = 'j12-loopback-only-key';
  const fakeModelKey = ['sk', 'ant', 'api03', 'J12SyntheticKey'.repeat(6)].join('-');
  const handoff = `# J12 incident\n\nDiagnostic evidence using ${fakeModelKey}\npostgresql://test:synthetic-password@localhost/db`;
  const signalKinds = [
    'ERROR_GROUP',
    'ALARM_FIRING',
    'UPTIME_DOWN',
    'PROBER_SILENT',
    'SYNTHETIC_FAILING',
    'STACK_UNHEALTHY'
  ];
  const incidents = Array.from({ length: 100 }, (_, index) => ({
    id: `inc_${index}`,
    status: 'OPEN',
    severity: 'ERROR',
    title: `Failure ${index}: ${'x'.repeat(180)}`,
    project: 'shop',
    stage: 'production',
    region: 'eu-west-1',
    isProduction: true,
    openedAt: '2026-09-24T10:00:00.000Z',
    acknowledgedAt: null,
    resolvedAt: null,
    resolveReason: null,
    deploymentVersion: 'v000042',
    gitCommit: 'abc123',
    signals: Array.from({ length: 12 }, (_, i) => ({
      kind: signalKinds[i % signalKinds.length],
      state: i % 3 ? 'ACTIVE' : 'RECOVERED',
      title: 'signal-evidence-' + 'y'.repeat(180)
    }))
  }));
  const organizations = new Map([['org_j12', { id: 'org_j12', name: 'J12', isCurrent: true }]]);
  const requests: Array<{ procedure: string; input: Record<string, unknown>; authenticated: boolean }> = [];
  let started: () => void = () => {};
  let disconnected: () => void = () => {};
  let holdRequest = false;
  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const procedure = url.pathname.replace(/^\/stacktape-api\//, '');
      let body = '';
      for await (const chunk of request) body += String(chunk);
      const input = (
        JSON.parse(body || url.searchParams.get('input') || '{}') as Record<string, Record<string, unknown>>
      )['0'];
      const authenticated = request.headers.stp_api_key === apiKey;
      requests.push({ procedure, input, authenticated });
      if (holdRequest) {
        response.on('close', () => disconnected());
        started();
        return;
      }
      let data: unknown;
      if (authenticated && procedure === 'incidentHandoffFromCli' && input.incidentId !== 'inc_denied')
        data = { markdown: handoff };
      else if (authenticated && procedure === 'incidentsFromCli') {
        assert.deepEqual(input, { project: 'shop', stage: 'production', status: 'ALL', limit: 100 });
        data = incidents;
      } else if (authenticated && procedure === 'listOrganizationsFromCli') data = [...organizations.values()];
      else if (authenticated && procedure === 'deleteOrganizationFromCli') {
        assert.equal(input.id, 'org_j12');
        organizations.delete(String(input.id));
        data = { success: true };
      }
      const status = !authenticated ? 401 : data === undefined ? 404 : 200;
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify([
          status === 200
            ? { result: { data } }
            : {
                error: {
                  message: 'Incident not found or access denied',
                  code: status === 401 ? -32001 : -32004,
                  data: { code: status === 401 ? 'UNAUTHORIZED' : 'NOT_FOUND', httpStatus: status }
                }
              }
        ])
      );
    })().catch((error: unknown) => {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: String(error) }));
    });
  });
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;
  let cliChildPids: number[] = [];
  let stderr = '';
  try {
    await mkdir(home);
    await mkdir(project);
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify({
        name: 'j12-fixture',
        dependencies: { stacktape: '*' },
        scripts: {
          deploy: 'stacktape deploy --stage dev --region us-east-1 --projectName docs',
          'deploy:production':
            'stacktape deploy --stage production --region eu-central-1 --aa prod-account --hs --projectName docs'
        }
      })
    );
    await writeFile(
      join(project, 'stacktape.ts'),
      "import { defineConfig, Bucket } from 'stacktape';\nexport default defineConfig(() => ({ resources: { assets: new Bucket({}) } }));\n"
    );
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/stacktape-api`;
    await mkdir(join(home, '.stacktape'));
    await writeFile(
      join(home, '.stacktape', 'persisted-state.json'),
      JSON.stringify(
        withPersistedApiKey({
          persistedState: { systemId: 'j12', cliArgsDefaults: {}, otherDefaults: {} } as PersistedState,
          apiKey,
          endpoint
        })
      )
    );
    const platform = getPlatform();
    // The same builder and compressed corpus used by release archives; never the source MCP shortcut in dev.ts.
    const candidateArgument = process.argv.slice(2).find((argument) => argument.startsWith('--candidate-binary='));
    assert(
      process.argv.slice(2).every((argument) => argument === candidateArgument),
      'Use only --candidate-binary=<extracted release binary>.'
    );
    const candidateBinary = candidateArgument
      ? resolve(candidateArgument.slice('--candidate-binary='.length))
      : undefined;
    const install = candidateBinary
      ? undefined
      : await buildBinaryFile({ distFolderPath: directory, platform, version: packageJson.version });
    if (install) {
      await copyMcpDocs({ distFolderPath: install });
      await cp(join(process.cwd(), '__stacktape-dist/dev/helper-lambdas'), join(install, 'helper-lambdas'), {
        recursive: true
      });
    }
    const binary = candidateBinary ?? join(install!, isWindowsPlatform(platform) ? 'stacktape.exe' : 'stacktape');
    const env = {
      PATH: process.env.PATH ?? '',
      ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
      HOME: home,
      USERPROFILE: home,
      APPDATA: join(home, 'AppData'),
      STP_DISABLE_TELEMETRY: '1',
      // The seeded key stays in the temporary home's state file, never the machine's credential store.
      STACKTAPE_CREDENTIAL_STORE: 'file',
      STP_CUSTOM_TRPC_API_ENDPOINT: endpoint,
      AWS_EC2_METADATA_DISABLED: 'true',
      AWS_CONFIG_FILE: join(home, 'absent-config'),
      AWS_SHARED_CREDENTIALS_FILE: join(home, 'absent-credentials')
    };
    const legacyClient = new Client({ name: 'j12-legacy-client', version: '1.0.0' }, { capabilities: {} });
    const legacyTransport = new StdioClientTransport({
      command: binary,
      args: ['mcp'],
      cwd: project,
      env,
      stderr: 'pipe'
    });
    // Most agents still negotiate a 2025 revision through `initialize`; they must get every tool, not an empty list.
    try {
      await legacyClient.connect(legacyTransport, { timeout: 30_000 });
      assert.equal(legacyClient.getNegotiatedProtocolVersion(), '2025-11-25');
      assert.equal((await legacyClient.listTools()).tools.length, 5);
    } finally {
      await legacyClient.close();
      await legacyTransport.close();
    }
    client = new Client(
      { name: 'j12-executable-client', version: '1.0.0' },
      {
        supportedProtocolVersions: ['2026-07-28'],
        versionNegotiation: { mode: { pin: '2026-07-28' } },
        capabilities: { elicitation: { form: {} } },
        inputRequired: { autoFulfill: false }
      }
    );
    transport = new StdioClientTransport({ command: binary, args: ['mcp'], cwd: project, env, stderr: 'pipe' });
    transport.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    await client.connect(transport, { timeout: 30_000 });
    assert.equal(client.getProtocolEra(), 'modern');
    assert.deepEqual(client.getDiscoverResult()?.supportedVersions, ['2026-07-28']);
    assert.deepEqual((await client.listTools()).tools.map(({ name }) => name).sort(), [
      'stacktape_cli',
      'stacktape_dev',
      'stacktape_docs',
      'stacktape_incident',
      'stacktape_project'
    ]);
    // Documentation is offered as tools. Do not advertise resources that clients cannot list/read.
    assert.equal(client.getServerCapabilities()?.resources, undefined);
    assert.deepEqual(await client.listResources(), { resources: [] });
    await assert.rejects(client.readResource({ uri: 'stacktape://docs' }), /resources|support|method/i);
    console.info('PASS executable MCP discovery and resource capability contract');

    const call = async (name: string, args: Record<string, unknown>) =>
      envelope(await client!.callTool({ name, arguments: args }, { timeout: 30_000 }));
    for (const fixture of retrievalFixtures) {
      const found = await call('stacktape_docs', {
        action: 'search',
        query: fixture.query,
        mode: 'reference',
        maxItems: Math.max(5, fixture.maxRank)
      });
      assert.equal(found.ok, true);
      const routes = (found.data?.references as Array<{ route: string }>).map(({ route }) => route);
      const rank = routes.findIndex((route) => fixture.expectedRoutes.includes(route));
      assert(
        rank >= 0 && rank < fixture.maxRank,
        `${fixture.name}: expected rank <= ${fixture.maxRank}, got ${routes.join(', ')}`
      );
    }
    const search = await call('stacktape_docs', {
      action: 'search',
      query: 'lambda timeout property',
      mode: 'reference',
      maxItems: 1
    });
    assert.equal(search.ok, true);
    const references = search.data?.references as Array<{ route: string; headingPath: string[] }>;
    assert.equal(references.length, 1);
    const docs = await call('stacktape_docs', { action: 'get', route: references[0].route, propertyName: 'timeout' });
    assert.equal(references[0].route, '/config-reference/function');
    assert.equal(docs.ok, true);
    assert.match(String(docs.data?.content), /timeout\?: number/);
    const headingDocs = await call('stacktape_docs', {
      action: 'get',
      route: references[0].route,
      headingPath: references[0].headingPath
    });
    assert.equal(headingDocs.ok, true);
    const fallbackDocs = await call('stacktape_docs', {
      action: 'get',
      route: references[0].route,
      definitionName: 'timeout'
    });
    assert.equal(fallbackDocs.ok, true);
    assert.equal(fallbackDocs.data?.selectorFallback, 'definitionName-as-propertyName');
    assert.equal(
      (await call('stacktape_docs', { action: 'get', route: references[0].route, propertyName: 'j12_missing' })).code,
      'NOT_FOUND'
    );
    const filtered = await call('stacktape_docs', {
      action: 'search',
      query: 'database properties',
      docKind: 'config-reference',
      resourceType: 'relational-database',
      mode: 'reference',
      maxItems: 5
    });
    assert.equal(filtered.ok, true);
    assert((filtered.data?.references as unknown[]).length > 0, 'The resource filter must return matching docs');
    assert(
      (filtered.data?.references as Array<{ route: string }>).every(
        ({ route }) => route === '/config-reference/relational-database'
      )
    );
    for (const [route, expected] of [
      ['/cli/aws-profile-update', '--log-level'],
      ['/getting-started/starter-projects', 'stacktape init --starter-id'],
      ['/config-reference/alarms', 'notificationChannels']
    ]) {
      const rendered = await call('stacktape_docs', { action: 'get', route, includeFullPage: true });
      assert.equal(rendered.ok, true);
      assert(String(rendered.data?.content).includes(expected), `${route}: missing rendered content ${expected}`);
      assert(!String(rendered.data?.content).includes('@@LLM_DOCS_'));
    }
    const errorCommands = await call('stacktape_cli', { action: 'list', category: 'errors' });
    assert.equal(errorCommands.ok, true);
    const errorCommandNames = (errorCommands.data?.commands as Array<{ command: string }>).map(
      ({ command }) => command
    );
    for (const action of ['list', 'ignore', 'resolve', 'reopen']) {
      assert(errorCommandNames.includes(`error ${action}`));
      const described = await call('stacktape_cli', { action: 'describe', command: `errors:${action}` });
      assert.equal(described.ok, true);
      assert.equal(described.data?.safety, action === 'list' ? 'readOnly' : 'mutating');
      const removed = await call('stacktape_cli', { action: 'describe', command: `issues:${action}` });
      assert.equal(removed.ok, true, 'Legacy command spellings remain supported');
      assert.equal(removed.data?.canonicalCommand, `errors:${action}`);
    }
    const listed = await call('stacktape_cli', { action: 'list', category: 'deployment' });
    assert((listed.data?.commands as Array<{ command: string }>).some((command) => command.command === 'deploy'));
    const plan = await call('stacktape_cli', {
      action: 'plan',
      command: 'diff',
      stage: 'production',
      projectName: 'docs'
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.data?.command, 'diff');
    const planArgs = plan.data?.args as Record<string, unknown>;
    assert.equal(planArgs.region, 'eu-central-1');
    assert.equal(planArgs.awsAccount, 'prod-account');
    assert.equal(planArgs.fullDeploy, undefined, 'Deploy-only flags must not reach diff');
    const override = await call('stacktape_cli', {
      action: 'plan',
      command: 'deploy',
      stage: 'production',
      region: 'ap-southeast-2',
      awsAccount: 'override',
      projectName: 'docs'
    });
    assert.equal(override.ok, true);
    assert.equal((override.data?.args as Record<string, unknown>).region, 'ap-southeast-2');
    assert.equal((override.data?.args as Record<string, unknown>).awsAccount, 'override');
    assert.equal((override.data?.args as Record<string, unknown>).autoConfirmOperation, true);
    for (const [safety, commands] of [
      ['destructive', ['delete', 'secret:delete', 'aws-profile:delete', 'org:delete']],
      [
        'mutating',
        [
          'deploy',
          'rollback',
          'domain:add',
          'errors:resolve',
          'container:exec',
          'bucket:sync',
          'ai:connect',
          'ai:disconnect'
        ]
      ],
      ['interactive', ['login', 'init', 'dev', 'dev:stop', 'bastion:session', 'bastion:tunnel', 'container:session']]
    ] as const) {
      for (const command of commands) {
        const described = await call('stacktape_cli', { action: 'describe', command });
        assert.equal(described.ok, true);
        assert.equal(described.data?.safety, safety, command);
        assert.equal(described.data?.requiresConfirmation, safety !== 'interactive', command);
        const refused = await call('stacktape_cli', {
          action: 'run',
          command,
          ...(safety === 'interactive' ? { confirm: true } : {})
        });
        assert.equal(refused.code, safety === 'interactive' ? 'UNSUPPORTED_COMMAND' : 'CONFIRMATION_REQUIRED', command);
      }
    }
    const sqlPlan = await call('stacktape_cli', {
      action: 'plan',
      command: 'query:sql',
      stage: 'dev',
      region: 'eu-west-1',
      resourceName: 'database',
      args: { query: 'SELECT 1;' }
    });
    assert.equal(sqlPlan.ok, true);
    assert.equal((sqlPlan.data?.args as Record<string, unknown>).sql, 'SELECT 1;');
    assert.equal((sqlPlan.data?.args as Record<string, unknown>).query, undefined);
    assert.equal((sqlPlan.data?.policy as Record<string, unknown>).requiresConfirmation, false);
    const runnerPlan = await call('stacktape_cli', {
      action: 'plan',
      command: 'deploy',
      stage: 'dev',
      region: 'eu-west-1',
      args: { runner: 'ec2' }
    });
    assert.equal(runnerPlan.ok, true, JSON.stringify(runnerPlan));
    assert.equal((runnerPlan.data?.args as Record<string, unknown>).runner, 'ec2');
    assert.equal(
      (
        await call('stacktape_cli', {
          action: 'plan',
          command: 'deploy',
          stage: 'dev',
          region: 'eu-west-1',
          args: { runner: 'lambda' }
        })
      ).code,
      'VALIDATION_ERROR'
    );
    const validatePlan = await call('stacktape_cli', {
      action: 'plan',
      command: 'validate',
      stage: 'dev',
      region: 'eu-west-1',
      args: { withPackage: true, thorough: true }
    });
    assert.equal(validatePlan.ok, true, JSON.stringify(validatePlan));
    assert.equal((validatePlan.data?.args as Record<string, unknown>).withPackage, true);
    assert.equal((validatePlan.data?.args as Record<string, unknown>).thorough, true);
    for (const args of [{ withCloud: true }, { onlyWorkloads: ['api'] }]) {
      assert.equal(
        (
          await call('stacktape_cli', {
            action: 'plan',
            command: 'validate',
            stage: 'dev',
            region: 'eu-west-1',
            args
          })
        ).code,
        'VALIDATION_ERROR'
      );
    }
    for (const [command, operation, supportedReadOnlyOperations] of [
      ['query:redis', 'get', ['keys', 'get', 'ttl', 'info', 'type']],
      ['query:dynamodb', 'scan', ['scan', 'query', 'get', 'schema', 'sample']],
      ['query:opensearch', 'search', ['search', 'get', 'indices', 'mapping', 'count']]
    ] as const) {
      const args = { stage: 'dev', region: 'eu-west-1', resourceName: 'data', operation, key: 'session' };
      if (command !== 'query:redis') delete (args as { key?: string }).key;
      const planned = await call('stacktape_cli', { action: 'plan', command, args });
      assert.equal(planned.ok, true, `${command}: ${JSON.stringify(planned)}`);
      assert.equal(
        (planned.data?.policy as Record<string, unknown>).requiresConfirmation,
        false,
        `${command} must stay read-only`
      );
      assert.equal((planned.data?.args as Record<string, unknown>).operation, operation);
      const rejected = await call('stacktape_cli', { action: 'run', command, args: { ...args, operation: 'write' } });
      assert.equal(rejected.code, 'VALIDATION_ERROR');
      assert.deepEqual(rejected.data?.supportedReadOnlyOperations, [...supportedReadOnlyOperations]);
    }
    const devPlan = await call('stacktape_dev', { action: 'plan', args: { cwd: project, projectName: 'docs' } });
    assert.equal(devPlan.ok, true);
    assert.equal((devPlan.data?.args as Record<string, unknown>).stage, 'dev');
    assert.equal((devPlan.data?.args as Record<string, unknown>).fullDeploy, undefined);
    assert.equal((plan.data?.args as Record<string, unknown>).configPath, 'stacktape.ts');
    assert.equal((plan.data?.args as Record<string, unknown>).projectName, 'docs');
    assert.equal(
      (
        await call('stacktape_cli', {
          action: 'run',
          command: 'dev',
          args: { stage: 'dev', region: 'us-east-1' },
          confirm: true
        })
      ).code,
      'UNSUPPORTED_COMMAND'
    );
    const otherProject = join(directory, 'explicit-cwd');
    await mkdir(otherProject);
    const removed = await call('stacktape_cli', {
      action: 'run',
      command: 'mcp:remove',
      cwd: otherProject,
      confirm: true
    });
    assert.equal(removed.ok, true);
    const context = removed.data?.resolvedContext as { cwd: string };
    assert.equal(await realpath(context.cwd), await realpath(otherProject));
    assert.deepEqual(await agentConfigsIn(otherProject), [], 'Agent setup must never write into a project');
    console.info('PASS executable MCP explicit cwd reaches the CLI child');
    const scan = await call('stacktape_project', { action: 'scan' });
    assert.equal(scan.ok, true);
    assert.deepEqual(scan.data?.suggestedDefaults, { configPath: 'stacktape.ts', currentWorkingDirectory: '.' });
    assert.deepEqual(
      (scan.data?.configCandidates as Array<{ resourceConstructors: string[] }>)[0].resourceConstructors,
      ['Bucket']
    );
    for (const name of ['a', 'b']) {
      await mkdir(join(project, name));
      await writeFile(join(project, name, 'package.json'), JSON.stringify({ name }));
    }
    assert.equal(
      ((await call('stacktape_project', { action: 'scan', maxFiles: 1 })).data?.packageJsonFiles as unknown[]).length,
      1
    );
    assert.equal(
      ((await call('stacktape_project', { action: 'scan', maxFiles: 50 })).data?.packageJsonFiles as unknown[]).length,
      3
    );
    await writeFile(join(project, 'a', 'stacktape.ts'), 'export default {};');
    // Installed dependencies are not the user's project, even when a package ships a Stacktape config.
    await mkdir(join(project, 'node_modules', 'starter'), { recursive: true });
    await writeFile(join(project, 'node_modules', 'starter', 'stacktape.ts'), 'export default {};');
    assert.equal((await call('stacktape_project', { action: 'scan' })).data?.totalConfigCandidates, 2);
    assert.equal((await call('stacktape_cli', { action: 'describe', command: 'deploy' })).data?.safety, 'mutating');
    assert.equal(
      (await call('stacktape_cli', { action: 'run', command: 'deploy', args: { stage: 'j12', region: 'eu-west-1' } }))
        .code,
      'CONFIRMATION_REQUIRED'
    );
    console.info('PASS executable MCP docs corpus, project scan and command policy');

    await assert.rejects(
      client.callTool({ name: 'j12_unknown_tool', arguments: {} }),
      /unknown|not found|not registered/i
    );
    const invalidAction = await client.callTool({
      name: 'stacktape_docs',
      arguments: { action: 'j12_invalid_action' }
    });
    assert.equal(invalidAction.isError, true);
    assert.match(JSON.stringify(invalidAction.content), /invalid|validation/i);
    assert.equal((await call('stacktape_docs', { action: 'search' })).code, 'VALIDATION_ERROR');
    assert.equal(
      (
        await call('stacktape_cli', {
          action: 'run',
          command: 'diff',
          args: { stage: 'j12', region: 'eu-west-1', badArg: true }
        })
      ).code,
      'VALIDATION_ERROR'
    );
    for (const [command, args] of [
      ['info:whoami', { apiKey: 'j12-raw-key' }],
      [
        'query:sql',
        {
          stage: 'dev',
          region: 'eu-west-1',
          resourceName: 'db',
          sql: 'WITH gone AS (DELETE FROM users RETURNING *) SELECT * FROM gone'
        }
      ],
      ['aws:call', { stage: 'dev', region: 'eu-west-1', service: 'secretsmanager', command: 'GetSecretValue' }],
      ['query:redis', { stage: 'dev', region: 'eu-west-1', resourceName: 'cache', operation: 'set' }],
      ['query:dynamodb', { stage: 'dev', region: 'eu-west-1', resourceName: 'data', operation: 'write' }],
      ['query:opensearch', { stage: 'dev', region: 'eu-west-1', resourceName: 'search', operation: 'write' }],
      ['secret:set', { region: 'eu-west-1', secretName: 'db.password' }],
      ['secret:get', { region: 'eu-west-1' }]
    ] as const) {
      assert.equal(
        (await call('stacktape_cli', { action: 'run', command, args, confirm: true })).code,
        'VALIDATION_ERROR',
        command
      );
    }
    // A project's Stacktape package script supplies the project name; a folder without one still has to name it.
    assert.equal(
      (
        await call('stacktape_cli', {
          action: 'run',
          command: 'package',
          cwd: home,
          args: { stage: 'dev', region: 'eu-west-1', configPath: 'stacktape.ts' },
          confirm: true
        })
      ).code,
      'VALIDATION_ERROR'
    );
    assert.equal((await call('stacktape_incident', { action: 'show' })).code, 'VALIDATION_ERROR');
    assert.equal(
      (await call('stacktape_cli', { action: 'describe', command: 'aws:call' })).data?.requiresConfirmation,
      false
    );
    assert.equal(
      (await call('stacktape_cli', { action: 'describe', command: 'secret:get' })).data?.sensitiveOutput,
      true
    );
    assert.equal(
      (await call('stacktape_cli', { action: 'run', command: 'j12_unknown_command' })).code,
      'UNKNOWN_COMMAND'
    );
    console.info('PASS executable MCP command classification, supported reads and argument surfaces');
    assert.equal(requests.length, 0, 'Rejected requests must not reach the control plane');
    const incident = await call('stacktape_incident', { action: 'show', incidentId: 'inc_j12' });
    assert.equal(incident.ok, true);
    assert.deepEqual(requests, [
      { procedure: 'incidentHandoffFromCli', input: { incidentId: 'inc_j12' }, authenticated: true }
    ]);
    assert.match(String(incident.data?.content), /# J12 incident/);
    assert.match(String(incident.data?.content), /REDACTED/);
    assert(!JSON.stringify(incident).includes(fakeModelKey), 'Model key leaked through MCP');
    assert(!JSON.stringify(incident).includes('synthetic-password'), 'Database password leaked through MCP');
    console.info('PASS executable MCP invalid requests, real CLI child and sensitive output');

    const denied = await call('stacktape_incident', { action: 'show', incidentId: 'inc_denied' });
    assert.equal(denied.ok, false);
    assert.equal(denied.data?.content, undefined, 'Denied incidents must not look like successful empty context');
    const page = await call('stacktape_incident', {
      action: 'list',
      projectName: 'shop',
      stage: 'production',
      status: 'ALL',
      limit: 100
    });
    assert.equal(page.ok, true, JSON.stringify({ page, requests: requests.slice(-3) }));
    const items = page.data?.incidents as Array<Record<string, unknown>>;
    assert(items.length > 0 && items.length < 100);
    assert.equal(page.data?.omitted, 100 - items.length);
    assert.equal(items[0].id, 'inc_0');
    assert.deepEqual(items[0].signals, { total: 12, active: 8, kinds: signalKinds.slice(0, 5) });
    assert(JSON.stringify(page).length < 30_000);
    assert(!JSON.stringify(page).includes('signal-evidence-'));
    // The same command read by a loaded MCP server: the CLI writes far more than a pipe holds and exits before the
    // reader catches up. The final result record must still arrive. The shell pipe has no Bun reader in between,
    // because Bun.spawn drains the pipe eagerly and would hide the loss.
    if (!isWindowsPlatform(platform)) {
      const slowReader = Bun.spawn(
        [
          'sh',
          '-c',
          '"$0" "$@" | { sleep 1.5; cat; }',
          binary,
          'incidents',
          '--agent',
          '--projectName',
          'shop',
          '--stage',
          'production',
          '--incidentStatus',
          'ALL',
          '--limit',
          '100'
        ],
        { cwd: project, env, stdout: 'pipe', stderr: 'ignore' }
      );
      const slowOutput = await new Response(slowReader.stdout).text();
      let slowResult: Record<string, unknown> = {};
      try {
        slowResult = JSON.parse(slowOutput.trimEnd().split('\n').at(-1) ?? '') as Record<string, unknown>;
      } catch {
        // A cut line is reported below.
      }
      assert.equal(slowResult.type, 'result', `CLI output was cut at ${slowOutput.length} bytes`);
      assert.equal(slowResult.ok, true);
      assert.equal((slowResult.data as { result?: unknown[] } | undefined)?.result?.length, 100);
    }
    console.info('PASS executable MCP incident listing, bounded evidence and denied lookup');

    // Use a harmless loopback organization to exercise the actual destructive CLI child.
    const original = {
      action: 'run',
      command: 'org:delete',
      cwd: project,
      args: { organizationId: 'org_j12' },
      confirm: true
    };
    const requireConfirmation = async () => {
      // SDK 2.0 callTool validates final outputSchema against input_required. Use its protocol API for this intermediate result.
      const result = await client!.request(
        { method: 'tools/call', params: { name: 'stacktape_cli', arguments: original } },
        { allowInputRequired: true }
      );
      assert(isInputRequiredResult(result));
      return result as unknown as InputRequiredResult;
    };
    const retry = (required: InputRequiredResult, args = original, accept = true) => ({
      name: 'stacktape_cli',
      arguments: args,
      requestState: required.requestState,
      inputResponses: {
        [Object.keys(required.inputRequests!)[0]]: {
          action: accept ? ('accept' as const) : ('decline' as const),
          ...(accept ? { content: { confirm: true } } : {})
        }
      }
    });
    const first = await requireConfirmation();
    const mark = requests.length;
    const changed = retry(first, { ...original, args: { organizationId: 'org_other' } });
    assert.equal(envelope(await client.callTool(changed)).code, 'USER_CONFIRMATION_REQUIRED');
    // The person confirmed the command for one project folder; it must not run from another.
    const moved = retry(await requireConfirmation(), { ...original, cwd: otherProject });
    assert.equal(envelope(await client.callTool(moved)).code, 'USER_CONFIRMATION_REQUIRED');
    assert.equal(
      envelope(await client.callTool(retry(await requireConfirmation(), original, false))).code,
      'USER_CONFIRMATION_DECLINED'
    );
    assert.equal(requests.length, mark, 'Mismatched and declined confirmation must not launch a CLI child');
    assert(organizations.has('org_j12'));
    const accepted = retry(await requireConfirmation());
    assert.equal(envelope(await client.callTool(accepted)).ok, true);
    assert.equal(
      organizations.has('org_j12'),
      false,
      'Accepted confirmation must execute the real organization deletion'
    );
    const afterDelete = requests.length;
    assert.equal(envelope(await client.callTool(accepted)).code, 'USER_CONFIRMATION_REQUIRED');
    assert.equal(requests.length, afterDelete, 'Replaying confirmation must not launch another CLI child');
    console.info('PASS executable MCP exact-target confirmation, decline and replay protection');

    holdRequest = true;
    const requestStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const requestClosed = new Promise<void>((resolve) => {
      disconnected = resolve;
    });
    const abort = new AbortController();
    const pending = client.callTool(
      { name: 'stacktape_incident', arguments: { action: 'show', incidentId: 'inc_j12_cancel' } },
      { signal: abort.signal, timeout: 30_000 }
    );
    // Attach the rejection handler before aborting; cancel only after the real child has reached HTTP.
    const rejected = assert.rejects(pending, /abort|cancel/i);
    await deadline(requestStarted, 'CLI child request started');
    if (process.platform === 'linux') {
      cliChildPids = (await readFile(`/proc/${transport.pid}/task/${transport.pid}/children`, 'utf8'))
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(Number);
      assert(cliChildPids.length > 0, 'The HTTP request must come from a real CLI subprocess');
    }
    abort.abort();
    await rejected;
    await deadline(requestClosed, 'cancelled CLI child closed its HTTP connection');
    for (const pid of cliChildPids) await waitForExit(pid);
    holdRequest = false;
    assert.equal((await call('stacktape_incident', { action: 'show', incidentId: 'inc_j12_after_cancel' })).ok, true);
    console.info('PASS executable MCP cancellation reaps CLI child and permits the next call');

    await client.close();
    client = undefined;
    assert(
      !stderr.includes(fakeModelKey) && !stderr.includes('synthetic-password'),
      'Sensitive output leaked to server stderr'
    );
    await verifyClientConfigs(binary, project, env);
  } finally {
    await client?.close();
    await transport?.close();
    // Fault checks can deliberately break cancellation. Dispose only the children observed under our own server.
    for (const pid of cliChildPids) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* Already exited. */
      }
      await waitForExit(pid);
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
};

const waitForExit = async (pid: number) => {
  const expires = Date.now() + 10_000;
  while (Date.now() < expires) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`CLI child ${pid} did not exit`);
};

type AgentOutcome = { agent: string; ok: boolean; server?: { change: string } };

// `mcp:add` and `mcp:remove` against a home directory with five agents installed and none of their commands on PATH:
// user-level entries only, the user's own content kept, backups, idempotence, and refusal to touch broken files.
const verifyClientConfigs = async (binary: string, project: string, env: Record<string, string>) => {
  const home = `${project}-agents-home`;
  const xdg = join(home, '.config');
  const agentEnv = { ...env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: xdg, PATH: join(home, 'no-tools') };
  const run = async (
    command: 'mcp:add' | 'mcp:remove',
    args: string[] = [],
    envOverrides: Record<string, string> = {}
  ) => {
    const child = Bun.spawn({
      cmd: [binary, command, '--agent', ...args],
      cwd: project,
      env: { ...agentEnv, ...envOverrides },
      stdout: 'pipe',
      stderr: 'pipe'
    });
    const [stdout, status] = await Promise.all([new Response(child.stdout).text(), child.exited]);
    const result = stdout
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            type: string;
            data?: { code?: string; result?: { result?: { agents?: AgentOutcome[] } } };
          }
      )
      .find(({ type }) => type === 'result');
    const agents = result?.data?.result?.result?.agents ?? [];
    const count = (change: string) => agents.filter((agent) => agent.ok && agent.server?.change === change).length;
    return { status, count, stdout };
  };

  const json: Array<[string, string, string]> = [
    [join(home, '.cursor', 'mcp.json'), 'mcpServers', 'cursor'],
    [join(xdg, 'Code', 'User', 'mcp.json'), 'servers', 'vscode'],
    [join(xdg, 'opencode', 'opencode.json'), 'mcp', 'opencode'],
    [join(home, '.codeium', 'windsurf', 'mcp_config.json'), 'mcpServers', 'windsurf']
  ];
  for (const [path] of json) await mkdir(join(path, '..'), { recursive: true });
  const codexPath = join(home, '.codex', 'config.toml');
  await mkdir(join(codexPath, '..'), { recursive: true });
  // Claude Code's state file is only ever changed by `claude mcp add`; without that command it must stay untouched.
  const claudeState = '{"mcpServers":{"other":{"command":"j12-other"}}}';
  await writeFile(join(home, '.claude.json'), claudeState);

  const added = await run('mcp:add');
  assert.equal(added.status, 0);
  assert.equal(added.count('created'), 5);
  assert.deepEqual(await agentConfigsIn(project), [], 'Agent setup must never write into a project');
  for (const [path, rootKey, name] of json) {
    const config = JSON.parse(await readFile(path, 'utf8')) as Record<string, Record<string, Record<string, unknown>>>;
    const expected =
      name === 'opencode'
        ? { type: 'local', command: [binary, 'mcp'], enabled: true, environment: { STACKTAPE_MCP_CLIENT_NAME: name } }
        : {
            ...(name === 'windsurf' ? {} : { type: 'stdio' }),
            command: binary,
            args: ['mcp'],
            env: { STACKTAPE_MCP_CLIENT_NAME: name }
          };
    assert.deepEqual(config[rootKey].stacktape, expected, `${name} MCP launch configuration`);
    // An outdated entry next to another server, unrelated options and a comment: only the entry may change.
    config[rootKey].stacktape = { command: 'old' };
    config[rootKey].other = { command: 'j12-other' };
    config.theme = { name: { value: 'dark' } };
    await writeFile(path, `// keep me\n${JSON.stringify(config, null, 2)}\n`);
  }
  const codex = Bun.TOML.parse(await readFile(codexPath, 'utf8')) as { mcp_servers: { stacktape: unknown } };
  assert.deepEqual(codex.mcp_servers.stacktape, {
    command: binary,
    args: ['mcp'],
    env: { STACKTAPE_MCP_CLIENT_NAME: 'codex' }
  });
  await writeFile(
    codexPath,
    '[mcp_servers.stacktape]\ncommand = "old"\n\n[mcp_servers.other]\ncommand = "j12-other"\n\n[mcp_servers.stacktape.env]\nSTALE = "remove-me"\n'
  );

  assert.equal((await run('mcp:add')).count('updated'), 5);
  // Repeating the setup changes nothing, so it must not write the files or leave another backup.
  assert.equal((await run('mcp:add')).count('unchanged'), 5, 'Repeated installation should not rewrite configs');
  const updatedCodex = Bun.TOML.parse(await readFile(codexPath, 'utf8')) as {
    mcp_servers: { stacktape: unknown; other: { command: string } };
  };
  assert.deepEqual(updatedCodex.mcp_servers.stacktape, codex.mcp_servers.stacktape);
  assert.equal(updatedCodex.mcp_servers.other.command, 'j12-other');
  for (const [path, rootKey] of json) {
    const text = await readFile(path, 'utf8');
    assert(text.startsWith('// keep me'), `${path} lost its comment`);
    const config = Bun.JSONC.parse(text) as Record<string, Record<string, { command: string }>> & {
      theme: { name: { value: string } };
    };
    assert.equal(config[rootKey].other.command, 'j12-other');
    assert.equal(config.theme.name.value, 'dark');
    const fileName = path.split(/[\\/]/).at(-1)!;
    const backups = (await readdir(join(path, '..'))).filter((name) => name.startsWith(`${fileName}.bak.`));
    assert.equal(backups.length, 1, `${path} needs exactly one backup`);
  }

  // Table-looking text inside a multi-line string is content, not a table.
  const validCodex = await readFile(codexPath, 'utf8');
  const literalHeaders = `note = """\n[mcp_servers.stacktape]\nkeep this user text\n[unrelated]\n"""\n${validCodex}`;
  await writeFile(codexPath, literalHeaders);
  assert.equal((await run('mcp:add')).status, 0);
  assert.equal(await readFile(codexPath, 'utf8'), literalHeaders, 'Multi-line string content must remain intact');
  await writeFile(codexPath, validCodex);

  const invalidPath = json[0][0];
  await writeFile(invalidPath, '{ invalid json');
  assert.notEqual((await run('mcp:add')).status, 0, 'A broken config must fail the setup');
  assert.equal(await readFile(invalidPath, 'utf8'), '{ invalid json', 'Invalid config must remain intact');
  await rm(invalidPath);
  await writeFile(codexPath, '[invalid TOML');
  assert.notEqual((await run('mcp:add')).status, 0);
  assert.equal(await readFile(codexPath, 'utf8'), '[invalid TOML', 'Invalid TOML must remain intact');
  await writeFile(codexPath, validCodex);
  assert.equal((await run('mcp:add')).status, 0);
  assert.equal(await readFile(join(home, '.claude.json'), 'utf8'), claudeState, "Claude Code's state file was edited");

  // The documented comma-separated form names an agent that detection cannot find: Copilot CLI is not on PATH here.
  const named = await run('mcp:add', ['--coding-agents', 'copilot,cursor']);
  assert.equal(named.status, 0, named.stdout);
  assert.equal(named.count('created'), 1);
  assert.equal(named.count('unchanged'), 1);
  const copilotConfig = JSON.parse(await readFile(join(home, '.copilot', 'mcp-config.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };
  // Copilot CLI exposes none of a server's tools unless the entry lists them.
  assert.deepEqual(copilotConfig.mcpServers.stacktape, {
    type: 'local',
    command: binary,
    args: ['mcp'],
    env: { STACKTAPE_MCP_CLIENT_NAME: 'copilot' },
    tools: ['*']
  });

  const misspelled = await run('mcp:add', ['--coding-agents', 'cursr']);
  assert.notEqual(misspelled.status, 0);
  assert.match(misspelled.stdout, /MCP_CODING_AGENT_UNKNOWN/);

  if (process.platform !== 'win32') {
    // An older global Stacktape on PATH that has no MCP server: the entries now name it, so setup must not report Ready.
    const oldInstall = join(home, 'old-stacktape');
    await mkdir(oldInstall);
    await writeFile(join(oldInstall, 'stacktape'), '#!/bin/sh\necho "Unknown command: mcp" >&2\nexit 1\n', {
      mode: 0o755
    });
    const broken = await run('mcp:add', [], { PATH: oldInstall });
    assert.notEqual(broken.status, 0, 'A configured command that does not start an MCP server must fail the setup');
    assert.match(broken.stdout, /MCP_SERVER_CHECK_FAILED/);
  }

  const backupCount = async (path: string) => {
    const fileName = path.split(/[\\/]/).at(-1)!;
    return (await readdir(join(path, '..'))).filter((name) => name.startsWith(`${fileName}.bak.`)).length;
  };
  const backupsBeforeRemove = await Promise.all(json.map(([path]) => backupCount(path)));
  const removed = await run('mcp:remove');
  assert.equal(removed.status, 0);
  assert.equal(removed.count('removed'), 6);
  for (const [index, [path, rootKey]] of json.entries()) {
    const config = Bun.JSONC.parse(await readFile(path, 'utf8')) as Record<string, Record<string, unknown>>;
    assert.equal(config[rootKey].stacktape, undefined);
    if (index > 0) assert.deepEqual(config[rootKey].other, { command: 'j12-other' });
    assert.equal(
      await backupCount(path),
      backupsBeforeRemove[index] + 1,
      `${path}: removal must keep the previous file`
    );
  }
  console.info(
    'PASS executable mcp:add/mcp:remove user-level formats, preservation, backups, idempotence and invalid input'
  );
};

verify().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
