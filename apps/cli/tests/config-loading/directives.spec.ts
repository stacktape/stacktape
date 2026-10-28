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
import { globalStateManager } from '@application-services/global-state-manager';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import { getConfigPath, killPythonBridge } from '@utils/file-loaders';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

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

// `.gitignore` excludes every `.env*` file and `$File` accepts dotenv files only under that name, so the fixture's
// dotenv file is written here instead of being committed.
const dotenvFixture = join(directivesFixture, 'data', '.env');
const dotenvVariantFixture = join(directivesFixture, 'data', '.env.production');
beforeAll(async () => {
  await writeFile(dotenvFixture, 'FEATURE_FLAG=enabled\nSTAGE_SUFFIX=-env\n');
  await writeFile(dotenvVariantFixture, 'VARIANT=from-production-dotenv\n');
});
afterAll(async () => {
  killPythonBridge();
  await rm(dotenvFixture, { force: true });
  await rm(dotenvVariantFixture, { force: true });
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
  await symlink(join(import.meta.dir, '../../node_modules'), join(directory, 'node_modules'), 'junction');
  await writeFile(join(directory, 'stacktape.yml'), yaml);
  return directory;
};

const captureError = async (operation: () => Promise<unknown>) => {
  try {
    await operation();
  } catch (error) {
    return error as Error & { category?: string; code?: string; hints?: string[]; errorDetails?: { title?: string } };
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
    // Any `.env*` file is dotenv, not an unsupported file type.
    expect(environment.ENV_VARIANT).toBe('from-production-dotenv');
    expect(environment.BANNER).toBe('raw file content\n');
    // Node 22 is the first runtime that needs the CJS/ESM interop flags. The maps stay in the deployment bucket, so
    // there is nothing for `--enable-source-maps` to read.
    expect(String(environment.NODE_OPTIONS).split(' ')).toEqual(
      expect.arrayContaining(['--experimental-require-module', '--experimental-detect-module'])
    );
    expect(String(environment.NODE_OPTIONS)).not.toContain('--enable-source-maps');
    // Formatting and a TypeScript user directive receiving resolved arguments.
    expect(environment.GREETING).toBe('hello platform-team from production');
    expect(environment.SHOUTED).toBe('PLATFORM-TEAM-env');
    // Resource references become CloudFormation references to the synthesized resources.
    expect(environment.FORMATTED_REFERENCE).toEqual({
      'Fn::Sub': ['${sub0}-${sub1}-${sub2}', { sub0: { Ref: 'RecordsGlobalTable' }, sub1: 'production', sub2: 'ready' }]
    });
    expect(environment.TABLE_NAME).toEqual({ Ref: 'RecordsGlobalTable' });
    expect(environment.TABLE_ARN).toEqual({ 'Fn::GetAtt': ['RecordsGlobalTable', 'Arn'] });
    // The gateway's URL is its default domain. A new stack gets version 2: the first 80 bits of
    // sha256("us-east-1\0directive-project-production\0123456789999").
    expect(environment.GATEWAY_URL).toBe(
      'https://gateway-directive-project-production-072f189a8335b485d6b6.stacktape-app.com'
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
    // Connecting to a hosting bucket grants access to the S3 bucket it synthesizes, not to the parent resource.
    const s3Resources = JSON.stringify(
      statements
        .filter((statement) => statement.Action.some((action) => action.startsWith('s3:')))
        .map((s) => s.Resource)
    );
    expect(s3Resources).toContain('"SiteBucket"');
    expect(template.Resources.SiteBucket?.Type).toBe('AWS::S3::Bucket');
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

  test('custom directive property paths survive standalone, nested and embedded use in YAML and TypeScript', async () => {
    const dir = await fixtureWithConfig(`projectName: directive-project
directives:
  - name: structured
    filePath: ./directives/custom.ts:structured
  - name: $structured
    filePath: ./directives/custom.ts:structured
resources:
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/api.ts
      environment:
        - name: ARRAY
          value: $structured().items[0].label
        - name: HYPHEN
          value: $structured().some-key
        - name: NESTED
          value: $Format('{}-{}', $structured().items[0].label, $structured().some-key)
        - name: EMBEDDED
          value: $Format('prefix-{}/{}', $structured().items[0].label, $structured().some-key)
        - name: DOLLAR_NAME
          value: $$structured().some-key
`);
    await writeFile(
      join(dir, 'stacktape.ts'),
      `
import { defineConfig, $CfFormat } from '@stacktape/config-authoring';
export default defineConfig({ projectName: 'directive-project' }, () => ({
  directives: [
    { name: 'structured', filePath: './directives/custom.ts:structured' },
    { name: '$structured', filePath: './directives/custom.ts:structured' }
  ],
  resources: {
    api: {
      type: 'function',
      properties: {
        packaging: { type: 'js-bundle', properties: { entryfilePath: './src/api.ts' } },
        environment: {
          ARRAY: '$structured().items[0].label',
          HYPHEN: '$structured().some-key',
          NESTED: $CfFormat('{}-{}', '$structured().items[0].label', '$structured().some-key'),
          EMBEDDED: 'prefix-$structured().items[0].label/$structured().some-key',
          DOLLAR_NAME: '$$structured().some-key'
        }
      }
    }
  }
}));
`
    );
    for (const filename of ['stacktape.yml', 'stacktape.ts']) {
      const template = await synthesizeFixture({
        configPath: join(dir, filename),
        workingDir: dir,
        identity: { ...identity, stage: 'production' }
      });
      expect(functionEnvironment(template, 'ApiFunction')).toMatchObject({
        ARRAY: 'first',
        HYPHEN: 'second',
        DOLLAR_NAME: 'second',
        NESTED: filename.endsWith('.ts')
          ? { 'Fn::Sub': ['${sub0}-${sub1}', { sub0: 'first', sub1: 'second' }] }
          : 'first-second',
        EMBEDDED: 'prefix-first/second'
      });
    }
  });

  // The bridge speaks newline-delimited JSON over the child's stdin and stdout. Node IPC, the previous channel, closes
  // after the first reply under Bun, which made every Python directive fail in the compiled CLI.
  // Starting Python on the Windows CI runner is slow and uneven: the same test took 0.9 s in one run and over 5 s
  // (bun's default budget) in the next. One minute covers a cold start; a real hang still fails, just later.
  test('a Python user directive resolves like a TypeScript one', async () => {
    const dir = await fixtureWithConfig(`projectName: directive-project
directives:
  - name: shoutPy
    filePath: ./directives/custom.py:shout
  - name: tagPy
    filePath: ./directives/custom.py:tag
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
        - name: SHOUTED_REGION
          value: $shoutPy($Region())
        - name: TAGGED
          value: $tagPy(true, "it's")
`);
    const template = await synthesizeYaml('production', dir);
    expect(functionEnvironment(template, 'ApiFunction')).toMatchObject({
      SHOUTED_PY: 'PRODUCTION',
      SHOUTED_REGION: 'US-EAST-1',
      // Arguments cross into Python as Python literals: a boolean is `True`, a quote inside a string stays a quote.
      TAGGED: "on:it's"
    });
  }, 60_000);

  test('a project with both stacktape.ts and stacktape.yml loads the TypeScript one', async () => {
    const dir = await fixtureWithConfig(`projectName: directive-project
resources:
  onlyInYaml:
    type: bucket
`);
    await writeFile(
      join(dir, 'stacktape.ts'),
      "import { Bucket, defineConfig } from '@stacktape/config-authoring';\nexport default defineConfig({ projectName: 'directive-project' }, () => ({ resources: { onlyInTypescript: new Bucket({}) } }));\n"
    );
    const originalArgs = globalStateManager.rawArgs;
    globalStateManager.rawArgs = { currentWorkingDirectory: dir } as typeof originalArgs;
    let configPath: string;
    try {
      configPath = getConfigPath();
    } finally {
      globalStateManager.rawArgs = originalArgs;
    }
    expect(configPath).toBe(join(dir, 'stacktape.ts'));
    const template = await synthesizeFixture({
      configPath,
      workingDir: dir,
      identity: { ...identity, stage: 'production' }
    });
    expect(template.Resources.OnlyInTypescriptBucket?.Type).toBe('AWS::S3::Bucket');
    expect(template.Resources).not.toHaveProperty('OnlyInYamlBucket');
  });

  test('a secret interpolated into a TypeScript string stays a deployment-time directive', async () => {
    const dir = await fixtureWithConfig('projectName: directive-project\nresources: {}\n');
    await writeFile(
      join(dir, 'stacktape.ts'),
      `
import { defineConfig, $Secret } from '@stacktape/config-authoring';
export default defineConfig({ projectName: 'directive-project' }, () => ({
  resources: {},
  variables: { databaseUrl: \`postgres://app:\${$Secret('db.password')}@db.internal/app\` }
}));
`
    );
    // Loading resolves every directive that does not need the deployed stack. The interpolated secret must survive
    // that pass as a runtime \`$CfFormat\` so nothing tries to read Secrets Manager here, and nothing rejects it.
    const resolver = new ConfigResolver();
    const context = {
      configPath: join(dir, 'stacktape.ts'),
      workingDir: dir,
      authoringParams: { stage: 'production', region: 'us-east-1', cliArgs: {}, command: 'synth', awsProfile: '' },
      builtInDirectives: {
        runtime: {
          calculatedStackOverviewManager: { getStpResource: () => undefined },
          configManager: { findResourceInConfig: () => ({ resource: undefined, fullyResolved: false }) as never },
          deployedStackOverviewManager: { getStpResource: () => undefined },
          stackManager: { getExistingResourceDetails: () => undefined, existingStackDetails: undefined },
          templateManager: {
            template: { Resources: {} },
            addFinalTemplateOverrideFn: () => {},
            addStackOutput: () => {}
          }
        },
        accountId: identity.accountId,
        additionalArgs: {},
        awsProfile: '',
        cliArgs: {},
        command: 'synth' as const,
        disableEmulation: false,
        region: identity.region,
        stage: 'production',
        workingDir: dir
      }
    } as unknown as Parameters<ConfigResolver['loadRawConfig']>[0]['context'];
    await resolver.loadRawConfig({ context });
    resolver.registerBuiltInDirectives();
    await resolver.loadResolvedConfig();
    expect(resolver.resolvedConfig.variables).toEqual({
      databaseUrl: "$CfFormat('postgres://app:{}@db.internal/app', $Secret('db.password'))"
    });
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
    for (const name of [
      'STAGE',
      'REGION',
      'TABLE_NAME',
      'TABLE_ARN',
      'GATEWAY_URL',
      'GREETING',
      'FORMATTED_REFERENCE',
      'NODE_OPTIONS'
    ]) {
      expect(typescriptEnvironment[name]).toEqual(yamlEnvironment[name]);
    }
    expect(Object.keys(typescriptTemplate.Resources).sort()).toEqual(Object.keys(yamlTemplate.Resources).sort());
    expect(typescriptEnvironment.FORMATTED_LITERAL).toEqual({
      'Fn::Sub': ['${sub0}-${sub1}', { sub0: `it's "ready"`, sub1: 0 }]
    });
    expect(typescriptEnvironment.FORMATTED_NO_VALUES).toEqual({ 'Fn::Sub': 'literal text' });
    expect(typescriptEnvironment.FORMATTED_BOUNDARIES).toEqual({
      'Fn::Sub': [
        '${sub0}-${sub1}-${sub2}',
        { sub0: '$Stage() suffix', sub1: '$Stage() (prod)', sub2: 'C:\\workspace\\' }
      ]
    });
    const yamlRole = JSON.stringify(yamlTemplate.Resources.ApiRole);
    expect(JSON.stringify(typescriptTemplate.Resources.ApiRole)).toBe(yamlRole);
  });
});

describe('a broken config fails with an error that names the problem', () => {
  test('an undefined TypeScript format argument is rejected instead of silently disappearing', async () => {
    const dir = await fixtureWithConfig('projectName: directive-project\nresources: {}\n');
    await writeFile(
      join(dir, 'stacktape.ts'),
      `
import { defineConfig, $CfFormat } from '@stacktape/config-authoring';
export default defineConfig({ projectName: 'directive-project' }, () => ({ resources: {}, variables: { label: $CfFormat('{}', undefined, 'ready') }
}));
`
    );
    const error = await captureError(() =>
      synthesizeFixture({
        configPath: join(dir, 'stacktape.ts'),
        workingDir: dir,
        identity: { ...identity, stage: 'production' }
      })
    );
    expect(error.code).toBe('CONFIG_TYPESCRIPT_EXECUTION_FAILED');
    expect(error.errorDetails?.title).toContain('$CfFormat argument 1 cannot be serialized');
  });

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

  // #386 review: a credential referenced with $CfResourceParam became a stack output, readable by DescribeStacks.
  test('a credential of a raw resource reaches the function that reads it, never a stack output', async () => {
    const dir = await fixtureWithConfig(`${functionWith(`      environment:
        - name: KEY_SECRET
          value: $CfResourceParam('RawKey', 'SecretAccessKey')
        - name: KEY_USER
          value: $CfResourceParam('RawUser', 'Arn')`)}cloudformationResources:
  RawUser:
    Type: AWS::IAM::User
  RawKey:
    Type: AWS::IAM::AccessKey
    Properties:
      UserName: $CfResourceParam('RawUser', 'UserName')
`);
    const template = await synthesizeYaml('production', dir);
    expect(functionEnvironment(template, 'ApiFunction').KEY_SECRET).toEqual({
      'Fn::GetAtt': ['RawKey', 'SecretAccessKey']
    });
    const outputs = Object.keys(template.Outputs ?? {});
    expect(outputs).toContain('RawUserArn');
    expect(outputs.filter((name) => name.startsWith('RawKey'))).toEqual([]);
    expect(JSON.stringify(template.Outputs)).not.toContain('SecretAccessKey');
  });

  test('a $Format whose argument is only known at deployment time names the directive to use instead', async () => {
    const dir = await fixtureWithConfig(
      functionWith(`      environment:
        - name: TABLE_URL
          value: $Format('https://{}.example.com', $ResourceParam('records', 'name'))`)
    );
    const error = await captureError(() => synthesizeYaml('production', dir));
    expect(error.code).toBe('DIRECTIVE_RUNTIME_DEPENDENCY_INVALID');
    expect(error.message).toContain('Format');
    expect(error.message).toContain('ResourceParam');
    expect((error.hints ?? []).join('\n')).toContain('$CfFormat');
  });

  test('a TypeScript config importing a package that is not installed names the package', async () => {
    const dir = await fixtureWithConfig('projectName: directive-project\nresources: {}\n');
    await writeFile(
      join(dir, 'stacktape.ts'),
      "import { defineConfig } from '@stacktape/config-authoring';\nimport { value } from 'not-installed-config-helper';\nexport default defineConfig({ projectName: 'directive-project' }, () => ({ resources: {}, variables: { value } }));\n"
    );
    const error = await captureError(() =>
      synthesizeFixture({
        configPath: join(dir, 'stacktape.ts'),
        workingDir: dir,
        identity: { ...identity, stage: 'production' }
      })
    );
    expect(error.code).toBe('CONFIG_DEPENDENCY_MISSING');
    expect(error.message).toContain('not-installed-config-helper');
    expect((error.hints ?? []).join('\n')).toContain('not-installed-config-helper');
  });

  test('a js-bundle function without an entry file is rejected by the schema, not by packaging later', async () => {
    const dir = await fixtureWithConfig(
      baseConfig(`  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties: {}`)
    );
    const error = await captureError(() => synthesizeYaml('production', dir));
    expect(error.code).toBe('CONFIG_SCHEMA_INVALID');
    expect(error.message).toContain('entryfilePath');
    expect(error.message).toContain('api');
  });

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

  test('a retired AWS-service macro is rejected as an authored connection', async () => {
    const dir = await fixtureWithConfig(
      functionWith(`      connectTo:
        - aws:ses`)
    );
    const error = await captureError(() => synthesizeYaml('production', dir));
    expect(error.message).toContain('aws:ses');
    expect(error.code).toBe('CONFIG_RESOURCE_REFERENCE_UNRESOLVED');
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
    expect(error.category).toBe('DIRECTIVE');
    expect(error.message).toContain('Nope');
    expect(error.hints).toEqual(['If this is a custom directive, register it in your Stacktape config.']);
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

  test('a failing Python handler preserves the useful exception at the loading boundary', async () => {
    const dir = await fixtureWithConfig(`projectName: directive-project
directives:
  - name: brokenPy
    filePath: ./directives/custom.py:broken
resources: {}
variables:
  broken: $brokenPy()
`);
    const error = await captureError(() => synthesizeYaml('production', dir));
    expect(error.code).toBe('PYTHON_DIRECTIVE_EXECUTION_FAILED');
    expect(error.category).toBe('SOURCE_CODE');
    expect(error.message).toMatch(/^Python directive in `.*custom\.py` failed:\n/);
    expect(error.message).toContain('python handler failed');
    expect(error.cause).toBeInstanceOf(Error);
    expect((error.cause as Error).message).toContain('python handler failed');
  }, 60_000);

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
