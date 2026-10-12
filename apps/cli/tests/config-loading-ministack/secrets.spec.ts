import { CreateSecretCommand, PutSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import type { ConfigResolverContext } from '@domain-services/config-manager/config-resolver';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { TemplateManager } from '@domain-services/template-manager';
import { startMiniStack, type MiniStack, type MiniStackAccount } from '@stacktape/ministack/fixture';
import { getStackOutputName } from '@stacktape/naming/stack-output-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
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

const loadConfig = async (account: MiniStackAccount, yaml: string, stackOutput: Record<string, string> = {}) => {
  const workingDir = await mkdtemp(join(tmpdir(), 'stacktape-secret-config-'));
  directories.push(workingDir);
  const configPath = join(workingDir, 'stacktape.yml');
  await writeFile(configPath, yaml);
  const template = new TemplateManager();
  const context: ConfigResolverContext = {
    configPath,
    workingDir,
    authoringParams: { stage: 'test', region: 'eu-west-1', cliArgs: {}, command: 'dev', awsProfile: '' },
    builtInDirectives: {
      runtime: {
        calculatedStackOverviewManager,
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
      command: 'dev',
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
    resolver.resolveDirectives({
      itemToResolve: resolver.rawConfig.variables,
      resolveRuntime: true,
      useLocalResolve: local
    });
  return { resolver, template, resolve };
};

const inputs = `resources: {}
variables:
  password: $Secret('database.password')
  host: $SsmParam('/app/host')
  token: $SsmParam('/app/token')
`;

test('YAML pins secret and parameter versions in templates, while local resolution returns values', async () => {
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
      host: 'database.internal',
      token: 'synthetic-token'
    });

    const second = await secrets.send(
      new PutSecretValueCommand({ SecretId: 'database', SecretString: '{"password":"synthetic-second"}' })
    );
    await ssm.send(
      new PutParameterCommand({ Name: '/app/host', Value: 'new-database.internal', Type: 'String', Overwrite: true })
    );
    const deployed = await loadConfig(
      account,
      "resources: {}\nvariables:\n  password: $Secret('database.password')\n",
      { [getStackOutputName('database', 'CurrentSecretVersionId')]: first.VersionId! }
    );
    expect(await deployed.resolve(true)).toEqual({ password: 'synthetic-first' });
    const nextDeployment = await loadConfig(account, inputs);
    expect(await nextDeployment.resolve(false)).toEqual({
      password: `{{resolve:secretsmanager:database:SecretString:password::${second.VersionId}}}`,
      host: '{{resolve:ssm:/app/host:2}}',
      token: '{{resolve:ssm-secure:/app/token:1}}'
    });
  } finally {
    secrets.destroy();
    ssm.destroy();
  }
}, 30_000);

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
