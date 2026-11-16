import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { CreateSecretCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
// oxlint-disable-next-line import/no-unassigned-import
import './offline-preload';
import {
  cliRoot,
  createFamilyProject,
  describeStackResources,
  runSourceCli,
  runSourceCliCommand,
  sourceCliEnvironment,
  STAGE,
  writeProjectFiles,
  type FamilyProject
} from './harness';

type ResultRecord = { type?: string; ok?: boolean; code?: string; message?: string; data?: { result?: any } };

const ACCOUNT = 'cli-process-account';
const SECRET_NAME = 'command-output-secret';
const SECRET_VALUE = 'secret-value-that-must-stay-private-6f1c';

const terminalResult = (stdout: string) =>
  stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line) as ResultRecord)
    .findLast((record) => record.type === 'result');

const config = (scriptProperties: Record<string, unknown> = {}) => ({
  scripts: {
    // Captured (the default): its output reaches the command's own output.
    greet: {
      type: 'local-script',
      properties: { executeCommand: `${process.execPath} greet.mjs`, ...scriptProperties }
    },
    // Inherited: it reads the terminal's input itself.
    ask: { type: 'local-script', properties: { executeCommand: `${process.execPath} ask.mjs`, stdioMode: 'inherit' } },
    // Fails with a secret in its resolved command line.
    leaky: { type: 'local-script', properties: { executeCommand: `$Format('false {}', $Secret('${SECRET_NAME}'))` } }
  },
  hooks: { afterDeploy: [{ scriptName: 'greet' }] },
  resources: { pool: { type: 'user-auth-pool', properties: { generateClientSecret: true } } }
});

// The source CLI deploys a user pool whose client secret is a sensitive stack parameter: the service Lambda reads it
// from Cognito into SSM, and every command that loads the deployed stack resolves it again. No command output may
// contain it unless --show-secrets is passed, and the MCP server never returns it.
describe('command output', () => {
  let out: string;
  let ministack: MiniStack;
  let project: FamilyProject;
  let cloudFormation: CloudFormationClient;
  let deployed = false;
  let clientSecret: string;
  let firstDeploy: { exitCode: number; stdout: string; stderr: string; result?: ResultRecord; tail: string };

  const run = async (logName: string, args: string[], options: { stdin?: string; targetArgs?: boolean } = {}) => {
    const result = await runSourceCliCommand({ project, ministack, logName, args, ...options });
    return {
      ...result,
      result: terminalResult(result.stdout),
      tail: `${result.stdout}\n${result.stderr}`.slice(-3000)
    };
  };
  const stackInfoFile = () =>
    readFile(join(project.directory, '.stacktape-stack-info', `${project.stackName}.json`), 'utf8');

  beforeAll(async () => {
    out = await mkdtemp(join(tmpdir(), 'stp-command-output-'));
    ministack = await startMiniStack({ label: 'command-output' });
    cloudFormation = new CloudFormationClient(ministack.clientConfig());
    project = await createFamilyProject({ familyName: 'command-output', out, ministack });
    const secrets = new SecretsManagerClient(ministack.clientConfig());
    try {
      await secrets.send(new CreateSecretCommand({ Name: SECRET_NAME, SecretString: SECRET_VALUE }));
    } finally {
      secrets.destroy();
    }
    await writeProjectFiles(project, {
      'stacktape.yml': config(),
      'greet.mjs': "console.log('captured hook says hello');\n",
      'ask.mjs': `import { createInterface } from 'node:readline';
const lines = createInterface({ input: process.stdin });
for await (const line of lines) {
  console.log('answer: ' + line);
  break;
}
`
    });
    firstDeploy = await run('deploy', ['deploy', '--autoConfirmOperation', '--agent']);
    deployed = (await describeStackResources(cloudFormation, project.stackName)) !== undefined;
    expect(firstDeploy.exitCode, firstDeploy.tail).toBe(0);
    const params = firstDeploy.result?.data?.result?.stackInfo?.resources?.pool?.referenceableParams;
    const cognito = new CognitoIdentityProviderClient(ministack.clientConfig());
    try {
      const { UserPoolClient } = await cognito.send(
        new DescribeUserPoolClientCommand({ UserPoolId: params?.id, ClientId: params?.clientId })
      );
      clientSecret = UserPoolClient?.ClientSecret ?? '';
    } finally {
      cognito.destroy();
    }
    // A short value could appear in the output by chance and make the absence checks meaningless.
    expect(clientSecret.length).toBeGreaterThanOrEqual(16);
  }, 420_000);

  afterAll(async () => {
    try {
      if (deployed) {
        await writeProjectFiles(project, { 'stacktape.yml': config() });
        const deleted = await runSourceCli({ project, step: 'delete', ministack });
        expect(deleted.exitCode, deleted.tail).toBe(0);
      }
    } finally {
      await project?.close();
      cloudFormation?.destroy();
      try {
        await ministack?.stop();
      } finally {
        await rm(out, { recursive: true, force: true });
      }
    }
  }, 300_000);

  test('deploy withholds secret values from its result and stack-info file unless --show-secrets is passed', async () => {
    const params = firstDeploy.result?.data?.result?.stackInfo?.resources?.pool?.referenceableParams;
    expect(params?.clientSecret).toBe('<<OMITTED>>');
    expect(params?.clientId).toEqual(expect.any(String));
    expect(`${firstDeploy.stdout}\n${firstDeploy.stderr}`).not.toContain(clientSecret);
    expect(await stackInfoFile()).not.toContain(clientSecret);
    expect(JSON.parse(await stackInfoFile()).resources.pool.referenceableParams.clientSecret).toBe('<<OMITTED>>');

    const shown = await run('deploy-show-secrets', ['deploy', '--autoConfirmOperation', '--agent', '--show-secrets']);
    expect(shown.exitCode, shown.tail).toBe(0);
    expect(shown.result?.data?.result?.stackInfo?.resources?.pool?.referenceableParams?.clientSecret).toBe(
      clientSecret
    );
    expect(JSON.parse(await stackInfoFile()).resources.pool.referenceableParams.clientSecret).toBe(clientSecret);
  }, 300_000);

  test('param get and secret get print a secret value only with --show-secrets', async () => {
    const paramArgs = ['param:get', '--resourceName', 'pool', '--paramName', 'clientSecret', '--agent'];
    const omitted = await run('param-get', paramArgs);
    expect(omitted.exitCode, omitted.tail).toBe(0);
    expect(omitted.result?.data?.result).toBe('<<OMITTED>>');
    expect(`${omitted.stdout}\n${omitted.stderr}`).not.toContain(clientSecret);
    const shown = await run('param-get-show-secrets', [...paramArgs, '--show-secrets']);
    expect(shown.result?.data?.result).toBe(clientSecret);

    const secretArgs = [
      'secret:get',
      '--secretName',
      SECRET_NAME,
      '--region',
      ministack.region,
      '--awsAccount',
      ACCOUNT
    ];
    const hidden = await run('secret-get', [...secretArgs, '--agent'], { targetArgs: false });
    expect(hidden.exitCode, hidden.tail).toBe(0);
    expect(hidden.result?.data?.result).toMatchObject({ name: SECRET_NAME, value: '<<OMITTED>>' });
    expect(`${hidden.stdout}\n${hidden.stderr}`).not.toContain(SECRET_VALUE);
    const revealed = await run('secret-get-show-secrets', [...secretArgs, '--agent', '--show-secrets'], {
      targetArgs: false
    });
    expect(revealed.result?.data?.result?.value).toBe(SECRET_VALUE);
  }, 300_000);

  test('the MCP server never returns a secret value', async () => {
    // `stacktape mcp` runs each command as a child CLI; the wrapper keeps those children on the emulator.
    const wrapper = join(out, 'stacktape-source-cli.sh');
    const preload = join(import.meta.dir, 'offline-preload.ts');
    await writeFile(
      wrapper,
      `#!/bin/sh\nexec "${process.execPath}" --preload "${preload}" "${join(cliRoot, 'scripts', 'dev.ts')}" "$@"\n`
    );
    await chmod(wrapper, 0o755);
    const transport = new StdioClientTransport({
      command: wrapper,
      args: ['mcp'],
      cwd: project.directory,
      env: {
        ...sourceCliEnvironment({ project, ministack, invocationName: 'mcp' }),
        STACKTAPE_MCP_CLI_COMMAND: wrapper
      },
      stderr: 'pipe'
    });
    const client = new Client({ name: 'command-output-test', version: '1.0.0' }, { capabilities: {} });
    try {
      await client.connect(transport, { timeout: 60_000 });
      const call = async (command: string, args: Record<string, unknown>) =>
        (
          await client.callTool(
            { name: 'stacktape_cli', arguments: { action: 'run', command, args } },
            { timeout: 180_000 }
          )
        ).structuredContent as { ok: boolean; code: string; data?: Record<string, any> };
      const target = {
        stage: STAGE,
        region: ministack.region,
        projectName: project.projectName,
        awsAccount: ACCOUNT,
        currentWorkingDirectory: project.directory
      };

      const param = await call('param:get', { ...target, resourceName: 'pool', paramName: 'clientSecret' });
      expect(param.ok, JSON.stringify(param).slice(0, 2000)).toBe(true);
      expect(param.data?.cli?.result).toBe('<<OMITTED>>');
      expect(JSON.stringify(param)).not.toContain(clientSecret);

      const secret = await call('secret:get', {
        region: ministack.region,
        awsAccount: ACCOUNT,
        secretName: SECRET_NAME
      });
      expect(secret.ok, JSON.stringify(secret).slice(0, 2000)).toBe(true);
      expect(JSON.stringify(secret)).not.toContain(SECRET_VALUE);

      for (const [command, args] of [
        ['param:get', { ...target, resourceName: 'pool', paramName: 'clientSecret' }],
        ['secret:get', { region: ministack.region, awsAccount: ACCOUNT, secretName: SECRET_NAME }]
      ] as const) {
        const refused = await call(command, { ...args, showSensitiveValues: true });
        expect(refused, command).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
      }
    } finally {
      await client.close();
      await transport.close();
    }
  }, 300_000);

  test('scripts: a captured hook reports its output, an inherited script reads the terminal, pipeStdio is rejected', async () => {
    expect(firstDeploy.stdout).toContain('captured hook says hello');

    const asked = await run('script-run-inherit', ['script:run', '--scriptName', 'ask', '--agent'], {
      stdin: 'blue\n'
    });
    expect(asked.exitCode, asked.tail).toBe(0);
    expect(asked.stdout).toContain('answer: blue');

    // A failing command is named as it is written in the config, not with the secret it resolved to.
    const failed = await run('script-run-leaky', ['script:run', '--scriptName', 'leaky', '--agent']);
    expect(failed.exitCode, failed.tail).toBe(1);
    expect(failed.result?.message).toContain('$Secret(');
    expect(`${failed.stdout}\n${failed.stderr}`).not.toContain(SECRET_VALUE);

    for (const [pipeStdio, replacement] of [
      [false, 'stdioMode: ignore'],
      [true, 'stdioMode: capture']
    ] as const) {
      await writeProjectFiles(project, { 'stacktape.yml': config({ pipeStdio }) });
      const rejected = await run(`script-run-pipe-stdio-${pipeStdio}`, [
        'script:run',
        '--scriptName',
        'greet',
        '--agent'
      ]);
      expect(rejected.exitCode, rejected.tail).toBe(1);
      expect(rejected.result).toMatchObject({ ok: false, code: 'CONFIG_SCRIPT_PIPE_STDIO_REMOVED' });
      expect(rejected.result?.message).toContain(replacement);
    }
    await writeProjectFiles(project, { 'stacktape.yml': config() });
  }, 300_000);
});
