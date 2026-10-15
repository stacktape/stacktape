import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  Client,
  ProtocolError,
  ProtocolErrorCode,
  isInputRequiredResult,
  type InputRequiredResult
} from '@modelcontextprotocol/client';
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
    try {
      await assert.rejects(legacyClient.connect(legacyTransport, { timeout: 5_000 }), (error: unknown) => {
        assert(error instanceof ProtocolError);
        assert.equal(error.code, ProtocolErrorCode.UnsupportedProtocolVersion);
        assert.deepEqual((error.data as { supported: string[] }).supported, ['2026-07-28']);
        return true;
      });
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
      ['/cli/aws-profile-update', '--logLevel'],
      ['/getting-started/starter-projects', 'stacktape init --starterId'],
      ['/config-reference/alarms', 'notificationChannels']
    ]) {
      const rendered = await call('stacktape_docs', { action: 'get', route, includeFullPage: true });
      assert.equal(rendered.ok, true);
      assert(String(rendered.data?.content).includes(expected), `${route}: missing rendered content ${expected}`);
      assert(!String(rendered.data?.content).includes('@@LLM_DOCS_'));
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
      ['mutating', ['deploy', 'rollback', 'domain:add', 'issues:resolve', 'container:exec']],
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
    await writeFile(join(otherProject, 'package.json'), JSON.stringify({ dependencies: { stacktape: '*' } }));
    const installed = await call('stacktape_cli', {
      action: 'run',
      command: 'mcp:add',
      cwd: otherProject,
      confirm: true
    });
    assert.equal(installed.ok, true);
    const context = installed.data?.resolvedContext as { cwd: string };
    assert.equal(await realpath(context.cwd), await realpath(otherProject));
    const otherConfig = JSON.parse(await readFile(join(otherProject, '.mcp.json'), 'utf8'));
    assert.equal(otherConfig.mcpServers.stacktape.command, 'node_modules/.bin/stacktape');
    await assert.rejects(stat(join(project, '.mcp.json')), { code: 'ENOENT' });
    console.info('PASS executable MCP explicit cwd writes only the selected project');
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
      ['secret:get', { region: 'eu-west-1' }],
      ['package', { stage: 'dev', region: 'eu-west-1', configPath: 'stacktape.ts' }]
    ] as const) {
      assert.equal(
        (await call('stacktape_cli', { action: 'run', command, args, confirm: true })).code,
        'VALIDATION_ERROR',
        command
      );
    }
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

const verifyClientConfigs = async (binary: string, project: string, env: Record<string, string>) => {
  const run = async (overrides: Record<string, string> = {}, cwd = project) => {
    const process = Bun.spawn({
      cmd: [binary, 'mcp:add', '--agent'],
      cwd,
      env: { ...env, ...overrides },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30_000
    });
    const [stdout, stderr, status] = await Promise.all([
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
      process.exited
    ]);
    assert.equal(status, 0, `mcp:add failed: ${stderr}`);
    const result = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { type: string; data?: { result?: { result?: Record<string, unknown> } } })
      .find(({ type }) => type === 'result');
    assert(result, 'mcp:add must emit a final agent result');
    return result.data?.result?.result;
  };
  assert.equal((await run())?.created, 6);
  const targets = [
    ['.mcp.json', 'mcpServers', 'claude-code'],
    ['.cursor/mcp.json', 'mcpServers', 'cursor'],
    ['.vscode/mcp.json', 'servers', 'vscode'],
    ['opencode.jsonc', 'mcp', 'opencode'],
    ['.codeium/windsurf/mcp_config.json', 'mcpServers', 'windsurf']
  ];
  for (const [path, rootKey, name] of targets) {
    const config = JSON.parse(await readFile(join(project, path), 'utf8')) as Record<
      string,
      Record<string, Record<string, unknown>>
    >;
    const expected =
      name === 'opencode'
        ? {
            type: 'local',
            command: ['node_modules/.bin/stacktape', 'mcp'],
            enabled: true,
            environment: { STACKTAPE_MCP_CLIENT_NAME: name }
          }
        : {
            ...(name === 'windsurf' ? {} : { type: 'stdio' }),
            command: 'node_modules/.bin/stacktape',
            args: ['mcp'],
            env: { STACKTAPE_MCP_CLIENT_NAME: name }
          };
    assert.deepEqual(config[rootKey].stacktape, expected, `${name} MCP launch configuration`);
    // Preserve another server and unrelated client options, and keep an exact backup before replacing the config.
    config[rootKey].other = { command: 'j12-other' };
    config.theme = { name: { value: 'dark' } };
    const original = `${JSON.stringify(config)}\n`;
    await writeFile(join(project, path), original);
  }
  const codexPath = join(project, '.codex/config.toml');
  const codex = Bun.TOML.parse(await readFile(codexPath, 'utf8')) as {
    mcp_servers: { stacktape: Record<string, unknown> };
  };
  assert.deepEqual(codex.mcp_servers.stacktape, {
    command: 'node_modules/.bin/stacktape',
    args: ['mcp'],
    enabled: true,
    env: { STACKTAPE_MCP_CLIENT_NAME: 'codex' }
  });
  await writeFile(
    codexPath,
    '[mcp_servers.stacktape]\ncommand = "old"\n\n[mcp_servers.other]\ncommand = "j12-other"\n\n[mcp_servers.stacktape.env]\nSTALE = "remove-me"\n'
  );
  assert.equal((await run())?.updated, 6);
  const updatedCodex = Bun.TOML.parse(await readFile(codexPath, 'utf8')) as {
    mcp_servers: { stacktape: Record<string, unknown>; other: Record<string, unknown> };
  };
  assert.deepEqual(updatedCodex.mcp_servers.stacktape, codex.mcp_servers.stacktape);
  assert.equal(updatedCodex.mcp_servers.other.command, 'j12-other');
  for (const [path, rootKey] of targets) {
    const config = JSON.parse(await readFile(join(project, path), 'utf8'));
    assert.equal(config[rootKey].other.command, 'j12-other');
    assert.equal(config.theme.name.value, 'dark');
    const backups = (await readdir(join(project, path, '..'))).filter((name) =>
      name.startsWith(path.split('/').at(-1)! + '.bak.')
    );
    assert.equal(backups.length, 1);
    const backup = JSON.parse(await readFile(join(project, path, '..', backups[0]), 'utf8'));
    assert.equal(backup[rootKey].other.command, 'j12-other');
  }
  assert.equal((await run())?.unchanged, 6, 'Repeated installation should not rewrite configs');
  const validCodexRaw = await readFile(codexPath, 'utf8');
  const literalHeaders = 'note = """\n[mcp_servers.stacktape]\nkeep this user text\n[unrelated]\n"""\n' + validCodexRaw;
  await writeFile(codexPath, literalHeaders);
  assert.equal((await run())?.failed, 1, 'Unsupported TOML must fail safely instead of changing unrelated values');
  assert.equal(
    await readFile(codexPath, 'utf8'),
    literalHeaders,
    'Table-looking text inside a multiline string must remain intact'
  );
  await writeFile(codexPath, validCodexRaw);
  const invalidPath = join(project, '.cursor/mcp.json');
  await writeFile(invalidPath, '{ invalid json');
  assert.equal((await run())?.failed, 1);
  assert.equal(await readFile(invalidPath, 'utf8'), '{ invalid json', 'Invalid config must remain intact');
  await writeFile(codexPath, '[invalid TOML');
  assert.equal((await run())?.failed, 2);
  assert.equal(await readFile(codexPath, 'utf8'), '[invalid TOML', 'Invalid TOML must remain intact');

  const globalHome = `${project}-home`;
  const otherProject = join(project, 'other-project');
  await mkdir(globalHome);
  await mkdir(otherProject);
  await writeFile(join(globalHome, '.claude.json'), '{"mcpServers":{"other":{"command":"j12-other"}}}');
  // The home shares the project path's prefix but is outside it. A user config must use the global executable.
  await rm(join(project, '.mcp.json'));
  const globalResult = await run({ HOME: globalHome, USERPROFILE: globalHome }, project);
  assert.equal(globalResult?.failed, 2);
  const globalConfig = JSON.parse(await readFile(join(globalHome, '.claude.json'), 'utf8'));
  assert.equal(globalConfig.mcpServers.stacktape.command, 'stacktape');
  // With no local dependency, a project config also uses the executable found on PATH.
  assert.equal((await run({ HOME: globalHome, USERPROFILE: globalHome }, otherProject))?.unchanged, 1);
  console.info('PASS executable mcp:add client formats, preservation, backups, idempotence and invalid input');
};

verify().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
