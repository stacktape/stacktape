import { CreateSecretCommand, PutSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import type { ConfigResolverContext } from '@domain-services/config-manager/config-resolver';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { TemplateManager } from '@domain-services/template-manager';
import { startMiniStack, type MiniStack, type MiniStackAccount } from '@stacktape/ministack/fixture';
import { getStackOutputName } from '@stacktape/naming/stack-output-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ensureMissingSecretsCreated, findMissingSecrets } from '../../src/commands/_utils/secret-preflight';
import {
  escapeCloudformationSecretDynamicReference,
  locallyResolveSensitiveValue
} from '@utils/stack-info-map-sensitive-values';
import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let ministack: MiniStack;
const directories: string[] = [];
beforeAll(async () => {
  ministack = await startMiniStack({ label: 't01-config-loading' });
}, 120_000);
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});
afterAll(async () => {
  await ministack?.stop();
});

const loadConfig = async (
  account: MiniStackAccount,
  yaml: string,
  stackOutput: Record<string, string> = {},
  command: 'dev' | 'deploy' | 'validate' = 'dev'
) => {
  const workingDir = await mkdtemp(join(tmpdir(), 'stacktape-secret-config-'));
  directories.push(workingDir);
  const configPath = join(workingDir, 'stacktape.yml');
  await writeFile(configPath, yaml);
  const template = new TemplateManager();
  const context: ConfigResolverContext = {
    configPath,
    workingDir,
    authoringParams: { stage: 'test', region: 'eu-west-1', cliArgs: {}, command, awsProfile: '' },
    builtInDirectives: {
      runtime: {
        calculatedStackOverviewManager,
        configManager,
        deployedStackOverviewManager,
        stackManager: {
          getExistingResourceDetails: stackManager.getExistingResourceDetails,
          existingStackDetails: { ...stackManager.existingStackDetails, stackOutput }
        },
        templateManager: template
      },
      accountId: account.accountId,
      additionalArgs: {},
      awsProfile: '',
      cliArgs: {},
      command,
      disableEmulation: false,
      region: 'eu-west-1',
      stage: 'test',
      workingDir
    }
  };
  awsSdkManager.init({ ...ministack.clientConfig(account), region: 'eu-west-1' });
  const resolver = new ConfigResolver();
  await resolver.loadRawConfig({ context });
  resolver.registerBuiltInDirectives();
  const resolve = (local: boolean) =>
    resolver.resolveDirectives<Record<string, string>>({
      itemToResolve: resolver.rawConfig.variables,
      resolveRuntime: true,
      useLocalResolve: local
    });
  return { resolver, template, resolve };
};

const inputs = `resources: {}
variables:
  password: $Secret('database.password')
  secret: $Secret('database')
  host: $SsmParam('/app/host')
  token: $SsmParam('/app/token')
`;

test('local directives read current values after rotation while deployed references stay pinned', async () => {
  const account = ministack.account();
  const secrets = new SecretsManagerClient(ministack.clientConfig(account));
  const ssm = new SSMClient(ministack.clientConfig(account));
  try {
    const first = await secrets.send(
      new CreateSecretCommand({ Name: 'database', SecretString: '{"password":"synthetic-first"}' })
    );
    await ssm.send(new PutParameterCommand({ Name: '/app/host', Value: 'database.internal', Type: 'String' }));
    await ssm.send(new PutParameterCommand({ Name: '/app/token', Value: 'synthetic-token', Type: 'SecureString' }));
    const loaded = await loadConfig(account, inputs);
    const references = await loaded.resolve(false);
    expect(references).toEqual({
      password: `{{resolve:secretsmanager:database:SecretString:password::${first.VersionId}}}`,
      secret: `{{resolve:secretsmanager:database:SecretString:::${first.VersionId}}}`,
      host: '{{resolve:ssm:/app/host:1}}',
      token: '{{resolve:ssm-secure:/app/token:1}}'
    });
    await Promise.all(loaded.template.templateOverrideFunctions.map((override) => override(loaded.template.template)));
    const outputs = loaded.template.getTemplate().Outputs;
    expect(outputs[getStackOutputName('database', 'CurrentSecretVersionId')].Value).toBe(first.VersionId);
    expect(outputs[getStackOutputName('-app-host', 'CurrentSsmParamVersion')].Value).toBe('1');
    expect(outputs[getStackOutputName('-app-token', 'CurrentSsmParamVersion')].Value).toBe('1');
    expect(JSON.stringify(loaded.template.getTemplate())).not.toContain('synthetic-first');
    expect(JSON.stringify(loaded.template.getTemplate())).not.toContain('synthetic-token');
    expect(await loaded.resolve(true)).toEqual({
      password: 'synthetic-first',
      secret: '{"password":"synthetic-first"}',
      host: 'database.internal',
      token: 'synthetic-token'
    });

    const second = await secrets.send(
      new PutSecretValueCommand({ SecretId: 'database', SecretString: '{"password":"synthetic-second"}' })
    );
    await ssm.send(
      new PutParameterCommand({ Name: '/app/host', Value: 'new-database.internal', Type: 'String', Overwrite: true })
    );
    await ssm.send(
      new PutParameterCommand({
        Name: '/app/token',
        Value: 'synthetic-new-token',
        Type: 'SecureString',
        Overwrite: true
      })
    );
    const deployed = await loadConfig(account, inputs, {
      [getStackOutputName('database', 'CurrentSecretVersionId')]: first.VersionId!
    });
    expect(await deployed.resolve(true)).toEqual({
      password: 'synthetic-second',
      secret: '{"password":"synthetic-second"}',
      host: 'new-database.internal',
      token: 'synthetic-new-token'
    });
    // Query commands resolve the password embedded in the deployed connection string, not the local directive.
    await ssm.send(
      new PutParameterCommand({
        Name: '/app/deployed-connection',
        Type: 'String',
        Value: `postgres://app:${escapeCloudformationSecretDynamicReference(references.password)}@database.example/app`
      })
    );
    expect(await locallyResolveSensitiveValue({ ssmParameterName: '/app/deployed-connection' })).toBe(
      'postgres://app:synthetic-first@database.example/app'
    );
    // A password that looks like a replacement pattern is inserted as it is.
    await secrets.send(new CreateSecretCommand({ Name: 'dollars', SecretString: "pa$$w$&rd$'" }));
    await ssm.send(
      new PutParameterCommand({
        Name: '/app/dollar-connection',
        Type: 'String',
        Value: `postgres://app:${escapeCloudformationSecretDynamicReference('{{resolve:secretsmanager:dollars}}')}@database.example/app`
      })
    );
    expect(await locallyResolveSensitiveValue({ ssmParameterName: '/app/dollar-connection' })).toBe(
      "postgres://app:pa$$w$&rd$'@database.example/app"
    );
    expect(outputs[getStackOutputName('database', 'CurrentSecretVersionId')].Value).toBe(first.VersionId);
    const nextDeployment = await loadConfig(account, inputs);
    expect(await nextDeployment.resolve(false)).toEqual({
      password: `{{resolve:secretsmanager:database:SecretString:password::${second.VersionId}}}`,
      secret: `{{resolve:secretsmanager:database:SecretString:::${second.VersionId}}}`,
      host: '{{resolve:ssm:/app/host:2}}',
      token: '{{resolve:ssm-secure:/app/token:2}}'
    });
  } finally {
    secrets.destroy();
    ssm.destroy();
  }
}, 30_000);

test('container secrets resolve to version-pinned selectors and require SecureString parameters', async () => {
  const account = ministack.account();
  const secrets = new SecretsManagerClient(ministack.clientConfig(account));
  const ssm = new SSMClient(ministack.clientConfig(account));
  const containerInputs = `resources: {}
variables:
  password: $ContainerSecret('database.password')
  secret: $ContainerSecret('database')
  token: $ContainerSsmParameterVersion('/app/token')
`;
  try {
    const first = await secrets.send(
      new CreateSecretCommand({ Name: 'database', SecretString: '{"password":"synthetic-first"}' })
    );
    await ssm.send(new PutParameterCommand({ Name: '/app/token', Value: 'synthetic-token', Type: 'SecureString' }));
    await ssm.send(new PutParameterCommand({ Name: '/app/host', Value: 'database.internal', Type: 'String' }));
    expect(await (await loadConfig(account, containerInputs)).resolve(false)).toEqual({
      password: `${first.ARN}:password::${first.VersionId}`,
      secret: `${first.ARN}:::${first.VersionId}`,
      token: '1'
    });

    // A rotation changes the selector and the version label, so ECS registers a new task definition.
    const second = await secrets.send(
      new PutSecretValueCommand({ SecretId: 'database', SecretString: '{"password":"synthetic-second"}' })
    );
    await ssm.send(
      new PutParameterCommand({ Name: '/app/token', Value: 'synthetic-new', Type: 'SecureString', Overwrite: true })
    );
    expect(await (await loadConfig(account, containerInputs)).resolve(false)).toEqual({
      password: `${first.ARN}:password::${second.VersionId}`,
      secret: `${first.ARN}:::${second.VersionId}`,
      token: '2'
    });

    // ECS can inject only SecureString parameters as secrets; a plain String is refused before deployment.
    const plain = await loadConfig(
      account,
      "resources: {}\nvariables:\n  host: $ContainerSsmParameterVersion('/app/host')\n"
    );
    await expect(plain.resolve(false)).rejects.toMatchObject({ code: 'CONFIG_CONTAINER_SECRET_SSM_TYPE_INVALID' });
  } finally {
    secrets.destroy();
    ssm.destroy();
  }
});

test.each([
  { value: 'synthetic-private-not-json', code: 'DIRECTIVE_SECRET_JSON_INVALID' },
  { value: '{"token":"synthetic-private-token"}', code: 'DIRECTIVE_SECRET_JSON_KEY_MISSING' }
])('secret errors keep the requested key and hide stored values ($code)', async ({ value, code }) => {
  const account = ministack.account();
  const secrets = new SecretsManagerClient(ministack.clientConfig(account));
  try {
    await secrets.send(new CreateSecretCommand({ Name: 'database', SecretString: value }));
    const loaded = await loadConfig(account, "resources: {}\nvariables:\n  password: $Secret('database.password')\n");
    for (const local of [false, true]) {
      const error = await loaded.resolve(local).then(
        () => {
          throw new Error('Expected secret resolution to fail');
        },
        (failure: unknown) => failure
      );
      expect(error).toMatchObject({
        code,
        message:
          code === 'DIRECTIVE_SECRET_JSON_INVALID'
            ? "Cannot resolve key `password` from `$Secret('database')` because the secret is not valid JSON."
            : "Secret `database` does not contain JSON key `password` required by `$Secret('database.password')`."
      });
      const printable = error as { message: string; hints: string[] };
      expect(`${printable.message}\n${printable.hints.join('\n')}`).not.toContain('synthetic-private');
    }
  } finally {
    secrets.destroy();
  }
});

test('validate checks a template around a secret it reported missing, and deploy still fails on it', async () => {
  const account = ministack.account();
  const yaml =
    "resources: {}\nvariables:\n  password: $Secret('app-cache.password')\n  container: $ContainerSecret('app-cache.password')\n";
  configManager.reportSecretsMissing(['app-cache']);
  try {
    expect(await (await loadConfig(account, yaml, {}, 'validate')).resolve(false)).toEqual({
      password: '{{resolve:secretsmanager:app-cache:SecretString:password::}}',
      container: `arn:aws:secretsmanager:eu-west-1:${account.accountId}:secret:app-cache:password::`
    });
    await expect((await loadConfig(account, yaml, {}, 'deploy')).resolve(false)).rejects.toMatchObject({
      code: 'DIRECTIVE_SECRET_UNRESOLVED'
    });
  } finally {
    configManager.reset();
  }
  // A secret validate did not report is looked up as before.
  await expect((await loadConfig(account, yaml, {}, 'validate')).resolve(false)).rejects.toMatchObject({
    code: 'DIRECTIVE_SECRET_UNRESOLVED'
  });
});

test('validate and the deploy preflight find a $Secret nested in $CfFormat', async () => {
  const account = ministack.account();
  const yaml =
    "resources: {}\nvariables:\n  url: $CfFormat('https://{}@api.example', $Secret('app-token.token'))\n  plain: $Secret('app-db')\n";
  const loaded = await loadConfig(account, yaml, {}, 'validate');
  configManager.config = loaded.resolver.rawConfig;
  try {
    const missing = await findMissingSecrets();
    expect(missing).toEqual([
      { name: 'app-token', jsonKeys: ['token'], generated: false },
      { name: 'app-db', jsonKeys: [], generated: false }
    ]);
    // Validate checks the template around both, instead of stopping at the nested one.
    configManager.reportSecretsMissing(missing.map(({ name }) => name));
    expect((await loaded.resolve(false)) as Record<string, unknown>).toEqual({
      url: {
        'Fn::Sub': [
          'https://${sub0}@api.example',
          { sub0: '{{resolve:secretsmanager:app-token:SecretString:token::}}' }
        ]
      },
      plain: '{{resolve:secretsmanager:app-db:SecretString:::}}'
    });
    // Deploy asks for both before it does any work, and without a terminal it stops and names them.
    await expect(ensureMissingSecretsCreated()).rejects.toMatchObject({
      message: 'Missing 2 secret(s): app-token, app-db'
    });
  } finally {
    configManager.reset();
  }
});
