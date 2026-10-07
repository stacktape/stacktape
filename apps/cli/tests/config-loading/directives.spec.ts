/**
 * Config loads and resolves predictably (J2.3).
 *
 * The anchor scenario loads a YAML configuration file through the real config resolver and synthesizes it: every
 * built-in directive that resolves without AWS, user directives written in TypeScript and Python, resource references
 * (`connectTo`, event sources by name, `$ResourceParam`, `$CfResourceParam`) and stage-specific values. The template
 * is the observable result. A TypeScript configuration for the same resources must synthesize the same references.
 *
 * The failure cases load deliberately broken files through the same loader and check that the error names the
 * problem (the directive, the resource, the file) and never carries secret values.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { templateManager } from '@domain-services/template-manager';
import type { GetConfigParams } from '@stacktape/config-authoring';
import type { StacktapeConfig } from '@stacktape/config';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { afterEach, describe, expect, test } from 'bun:test';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { synthesizeFixture, withCredentiallessSynthesisBoundary } from '../characterization/synthesis-fixture';

const directivesFixture = join(import.meta.dir, 'fixtures', 'directives');
const identity = { accountId: '123456789999', region: 'us-east-1' as const, projectName: 'directive-project' };

type EnvironmentEntry = { Name?: string; Value: unknown } | [string, unknown];

/** The function's environment as a plain map, whatever shape the template uses. */
const functionEnvironment = (template: CloudFormationTemplate, logicalId: string) => {
  const fn = template.Resources[logicalId] as { Type: string; Properties: { Environment: { Variables: unknown } } };
  expect(fn?.Type).toBe('AWS::Lambda::Function');
  const variables = fn.Properties.Environment.Variables;
  if (Array.isArray(variables)) {
    return Object.fromEntries(
      (variables as EnvironmentEntry[]).map((entry) => (Array.isArray(entry) ? entry : [entry.Name, entry.Value]))
    ) as Record<string, unknown>;
  }
  return variables as Record<string, unknown>;
};

const synthesizeYaml = (stage: string, workingDir = directivesFixture) =>
  synthesizeFixture({
    configPath: join(workingDir, 'stacktape.yml'),
    workingDir,
    identity: { ...identity, stage }
  });

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

/** A copy of the directives fixture whose config is replaced, so each failure case loads a real file. */
const fixtureWithConfig = async (yaml: string) => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-j2-config-'));
  temporaryDirectories.push(directory);
  await cp(directivesFixture, directory, { recursive: true });
  await writeFile(join(directory, 'stacktape.yml'), yaml);
  return directory;
};

const captureError = async (operation: () => Promise<unknown>) => {
  try {
    await operation();
  } catch (error) {
    return error as Error & { code?: string; hints?: string[] };
  }
  throw new Error('Expected the operation to fail.');
};

describe('a YAML config with directives, references and stage-specific values synthesizes predictably', () => {
  test('every directive resolves to the value the template needs', async () => {
    const template = await synthesizeYaml('production');
    const environment = functionEnvironment(template, 'ApiFunction');

    // Context directives.
    expect(environment.STAGE).toBe('production');
    expect(environment.REGION).toBe('us-east-1');
    expect(environment.ACCOUNT).toBe('123456789999');
    expect(environment.CLI_FLAVOR).toBe('default-flavor');
    // Config-local directives.
    expect(environment.OWNER).toBe('platform-team');
    expect(environment.PROJECT).toBe('directive-project');
    // Files: JSON, .env and raw content, with nested property access.
    expect(environment.LOG_LEVEL).toBe('debug');
    expect(String(environment.RETENTION)).toBe('14');
    expect(environment.FEATURE_FLAG).toBe('enabled');
    expect(environment.BANNER).toBe('raw file content\n');
    // Formatting and a TypeScript user directive receiving resolved arguments.
    expect(environment.GREETING).toBe('hello platform-team from production');
    expect(environment.SHOUTED).toBe('PLATFORM-TEAM-env');
    // Resource references become CloudFormation references to the synthesized resources.
    expect(environment.TABLE_NAME).toEqual({ Ref: 'RecordsGlobalTable' });
    expect(environment.TABLE_ARN).toEqual({ 'Fn::GetAtt': ['RecordsGlobalTable', 'Arn'] });
    // The gateway's URL is its default domain, which derives from the resource, stack and account.
    expect(environment.GATEWAY_URL).toMatch(
      /^https:\/\/gateway-directive-project-production-[0-9a-f]{8}\.stacktape-app\.com$/
    );

    // Stage-specific values selected through nested directives, and variables used in a non-string property.
    const fn = template.Resources.ApiFunction as { Properties: { MemorySize: number } };
    expect(fn.Properties.MemorySize).toBe(1024);
    const logGroup = template.Resources.ApiLogGroup as { Properties: { RetentionInDays: number } };
    expect(logGroup.Properties.RetentionInDays).toBe(7);

    // References: the function may read and write the table it connects to, and the route reaches the function.
    const role = template.Resources.ApiRole as {
      Properties: { Policies: { PolicyDocument: { Statement: { Action: string[]; Resource: unknown }[] } }[] };
    };
    const statements = role.Properties.Policies.flatMap((policy) => policy.PolicyDocument.Statement);
    const tableStatement = statements.find((statement) =>
      JSON.stringify(statement.Resource).includes('RecordsGlobalTable')
    );
    expect(tableStatement?.Action).toEqual(expect.arrayContaining(['dynamodb:Get*', 'dynamodb:DescribeTable']));
    expect(tableStatement?.Action.some((action) => /^dynamodb:(Put|Update|Delete|BatchWrite)/.test(action))).toBe(true);
    const integration = Object.values(template.Resources).find(
      (resource) => resource.Type === 'AWS::ApiGatewayV2::Integration'
    ) as { Properties: { IntegrationUri: unknown } };
    expect(JSON.stringify(integration.Properties.IntegrationUri)).toContain('ApiFunction');
  });

  test('another stage selects its own values from the same file', async () => {
    const template = await synthesizeYaml('staging');
    const fn = template.Resources.ApiFunction as { Properties: { MemorySize: number } };
    expect(fn.Properties.MemorySize).toBe(512);
    expect(functionEnvironment(template, 'ApiFunction').STAGE).toBe('staging');
  });

  // Open product bug: under Bun, the Python bridge's child process reads end-of-file after its first reply and exits,
  // so every Python directive (and hook) fails with "Python process closed with exit code 0". Node keeps the IPC
  // channel open. The transport in `src/utils/python-bridge` needs to stop relying on Node IPC semantics.
  test('a Python user directive resolves like a TypeScript one', async () => {
    const dir = await fixtureWithConfig(`projectName: directive-project
directives:
  - name: shoutPy
    filePath: ./directives/custom.py:shout
resources:
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/api.ts
      environment:
        - name: SHOUTED_PY
          value: $shoutPy($Stage())
`);
    const template = await synthesizeYaml('production', dir);
    expect(functionEnvironment(template, 'ApiFunction').SHOUTED_PY).toBe('PRODUCTION');
  });

  test('the TypeScript form of the same resources synthesizes the same references', async () => {
    const yamlTemplate = await synthesizeYaml('production');
    const typescriptDir = join(import.meta.dir, 'fixtures', 'directives-typescript');
    const typescriptTemplate = await synthesizeFixture({
      configPath: join(typescriptDir, 'stacktape.ts'),
      workingDir: typescriptDir,
      identity: { ...identity, stage: 'production' }
    });

    const yamlEnvironment = functionEnvironment(yamlTemplate, 'ApiFunction');
    const typescriptEnvironment = functionEnvironment(typescriptTemplate, 'ApiFunction');
    for (const name of ['STAGE', 'REGION', 'TABLE_NAME', 'TABLE_ARN', 'GATEWAY_URL', 'GREETING']) {
      expect(typescriptEnvironment[name]).toEqual(yamlEnvironment[name]);
    }
    expect(Object.keys(typescriptTemplate.Resources).sort()).toEqual(Object.keys(yamlTemplate.Resources).sort());
    const yamlRole = JSON.stringify(yamlTemplate.Resources.ApiRole);
    expect(JSON.stringify(typescriptTemplate.Resources.ApiRole)).toBe(yamlRole);
  });
});

describe('a broken config fails with an error that names the problem', () => {
  const baseConfig = (resources: string) => `projectName: directive-project
resources:
  records:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: id
          type: string
${resources}
`;
  const functionWith = (properties: string) =>
    baseConfig(`  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/api.ts
${properties}`);

  test('a $ResourceParam of a resource that does not exist', async () => {
    const dir = await fixtureWithConfig(
      functionWith(`      environment:
        - name: TABLE
          value: $ResourceParam('recordz', 'name')`)
    );
    const error = await captureError(() => synthesizeYaml('production', dir));
    expect(error.code).toBe('DIRECTIVE_RESOURCE_NOT_FOUND');
    expect(error.message).toContain('recordz');
  });

  test('a $ResourceParam asking for a parameter the resource does not expose', async () => {
    const dir = await fixtureWithConfig(
      functionWith(`      environment:
        - name: TABLE
          value: $ResourceParam('records', 'url')`)
    );
    const error = await captureError(() => synthesizeYaml('production', dir));
    expect(error.message).toContain('url');
    expect(error.message).toContain('records');
    expect(`${error.message}\n${(error.hints ?? []).join('\n')}`).toContain('name');
  });

  test('a connectTo naming a resource that does not exist', async () => {
    const dir = await fixtureWithConfig(
      functionWith(`      connectTo:
        - recordz`)
    );
    const error = await captureError(() => synthesizeYaml('production', dir));
    expect(error.message).toContain('recordz');
  });

  test('an unknown directive', async () => {
    const dir = await fixtureWithConfig(
      functionWith(`      environment:
        - name: X
          value: $Nope('a')`)
    );
    const error = await captureError(() => synthesizeYaml('production', dir));
    expect(error.code).toBe('DIRECTIVE_UNKNOWN');
    expect(error.message).toContain('Nope');
  });

  test('a user directive whose handler throws keeps the directive name and the handler error, nothing else', async () => {
    const dir = await fixtureWithConfig(`projectName: directive-project
directives:
  - name: broken
    filePath: ./directives/custom.ts:broken
resources:
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/api.ts
      environment:
        - name: DB_PASSWORD
          value: hunter2-config-secret
        - name: X
          value: $broken()
`);
    const error = await captureError(() => synthesizeYaml('production', dir));
    const printable = `${error.message}\n${(error.hints ?? []).join('\n')}`;
    expect(printable).toContain('broken');
    expect(printable).toContain('directive handler exploded');
    expect(printable).not.toContain('hunter2');
  });

  test('a user directive whose file does not exist', async () => {
    const dir = await fixtureWithConfig(`projectName: directive-project
directives:
  - name: missing
    filePath: ./directives/missing.ts
resources: {}
`);
    const error = await captureError(() => synthesizeYaml('production', dir));
    expect(error.message).toContain('missing');
  });

  test('a $File pointing at a file that does not exist', async () => {
    const dir = await fixtureWithConfig(
      functionWith(`      environment:
        - name: X
          value: $File('./data/nope.json').x`)
    );
    const error = await captureError(() => synthesizeYaml('production', dir));
    expect(error.message).toContain('nope.json');
  });
});

describe('secret values never reach an error message', () => {
  const resolverContext = {
    authoringParams: {
      projectName: 'directive-project',
      stage: 'production',
      region: 'us-east-1',
      cliArgs: {} as never,
      command: 'dev',
      awsProfile: '',
      user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
    } satisfies GetConfigParams,
    builtInDirectives: {
      runtime: { calculatedStackOverviewManager, deployedStackOverviewManager, stackManager, templateManager },
      accountId: '123456789999',
      additionalArgs: {},
      awsProfile: '',
      cliArgs: {} as never,
      command: 'dev' as const,
      disableEmulation: false,
      region: 'us-east-1' as const,
      stage: 'production',
      workingDir: directivesFixture
    },
    workingDir: directivesFixture
  };

  const resolveLocally = async (value: string, secretString: string) =>
    withCredentiallessSynthesisBoundary(async () => {
      const secrets = awsSdkManager.secrets;
      const originalGet = secrets.get;
      secrets.get = (async () => ({ SecretString: secretString })) as typeof secrets.get;
      try {
        const resolver = new ConfigResolver();
        resolver.rawConfig = { resources: {} } as StacktapeConfig;
        resolver.setContext(resolverContext);
        resolver.registerBuiltInDirectives();
        return await resolver.resolveDirectives<{ value: unknown }>({
          itemToResolve: { value },
          resolveRuntime: true,
          useLocalResolve: true
        });
      } finally {
        secrets.get = originalGet;
      }
    });

  test('a JSON key read from a secret that is not JSON reports the key, not the secret', async () => {
    // Bun's JSON parser quotes the token it stopped at; the message must not carry it.
    const error = await captureError(() => resolveLocally("$Secret('db.password')", 'hunter2-not-json-secret'));
    expect(error.code).toBe('DIRECTIVE_SECRET_JSON_INVALID');
    expect(error.message).toContain('password');
    expect(error.message).toContain('db');
    expect(`${error.message}\n${(error.hints ?? []).join('\n')}`).not.toContain('hunter2');
  });

  test('a JSON key missing from a JSON secret reports the key and keeps other values private', async () => {
    const error = await captureError(() =>
      resolveLocally("$Secret('db.password')", JSON.stringify({ username: 'admin', token: 'hunter2-token' }))
    );
    expect(error.message).toContain('password');
    expect(`${error.message}\n${(error.hints ?? []).join('\n')}`).not.toContain('hunter2');
  });

  test('a readable secret resolves to its value locally', async () => {
    const resolved = await resolveLocally("$Secret('db.password')", JSON.stringify({ password: 'hunter2-value' }));
    expect(resolved.value).toBe('hunter2-value');
  });
});
