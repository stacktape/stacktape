import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGitDeploymentConfigFromCliInputSchema,
  getGitProviderConnectionStatusInputSchema,
  recordStackOperationInputSchema,
  syncUptimeChecksInputSchema
} from './api-key.js';

/**
 * `commandArgs` keeps only the flags that name an operation's target and how it ran. The schema applies the same
 * allowlist the CLI does, so an older CLI that sends every parsed flag cannot store the rest.
 */

const operation = (commandArgs: unknown) => ({
  invocationId: 'inv-1',
  command: 'deploy',
  projectName: 'my-project',
  commandArgs
});

test('commandArgs keeps operational flags with the values the parser made of them', () => {
  const parsed = recordStackOperationInputSchema.parse(
    operation({
      stage: 2024,
      region: 'eu-west-1',
      fullDeploy: true,
      targetVersion: 'v000041',
      __stacktapeInvocation: { initiator: 'ai-agent', interface: 'mcp', client: 'codex', tool: 'deploy', extra: 'x' }
    })
  );

  assert.deepEqual(parsed.commandArgs, {
    stage: 2024,
    region: 'eu-west-1',
    fullDeploy: true,
    targetVersion: 'v000041',
    __stacktapeInvocation: { initiator: 'ai-agent', interface: 'mcp', client: 'codex', tool: 'deploy' }
  });
});

test('commandArgs drops free-form flags an older CLI still sends', () => {
  const synthetic = 'synthetic-credential-value';
  const parsed = recordStackOperationInputSchema.parse(
    operation({
      stage: 'production',
      dockerArgs: [`--build-arg=NPM_TOKEN=${synthetic}`],
      env: [`TOKEN=${synthetic}`],
      sdkInput: synthetic,
      command: synthetic,
      apiKey: synthetic,
      hotSwap: true,
      resourcesToSkip: ['bucket'],
      configPath: { nested: synthetic }
    })
  );

  assert.deepEqual(parsed.commandArgs, { stage: 'production' });
  assert.equal(JSON.stringify(parsed).includes(synthetic), false);
});

test('commandArgs may be absent, null, or empty', () => {
  assert.equal(recordStackOperationInputSchema.parse(operation(undefined)).commandArgs, undefined);
  assert.equal(recordStackOperationInputSchema.parse(operation(null)).commandArgs, null);
  assert.deepEqual(recordStackOperationInputSchema.parse(operation({})).commandArgs, {});
});

test('commandArgs is an object, not any value at all', () => {
  // The point of describing it as a record rather than `any`: a caller cannot hand the Console a scalar
  // or a list and have it stored as the operation's arguments.
  for (const notAnObject of ['--stage dev', 42, true, ['--stage', 'dev']]) {
    assert.equal(
      recordStackOperationInputSchema.safeParse(operation(notAnObject)).success,
      false,
      `commandArgs accepted ${JSON.stringify(notAnObject)}`
    );
  }
});

test('Git provider status accepts nested GitLab owners but rejects URL-shaped repository input', () => {
  assert.equal(
    getGitProviderConnectionStatusInputSchema.safeParse({
      organizationId: 'org-1',
      provider: 'GITLAB',
      owner: 'company/platform/team',
      repository: 'public-api.v4'
    }).success,
    true
  );
  for (const input of [
    { owner: 'company?admin=true', repository: 'api' },
    { owner: 'company', repository: '../api' },
    { owner: 'https://attacker.example', repository: 'api' }
  ]) {
    assert.equal(
      getGitProviderConnectionStatusInputSchema.safeParse({
        organizationId: 'org-1',
        provider: 'GITLAB',
        ...input
      }).success,
      false
    );
  }
  assert.equal(
    getGitProviderConnectionStatusInputSchema.safeParse({
      organizationId: 'org-1',
      provider: 'BITBUCKET',
      owner: 'company/team',
      repository: 'api'
    }).success,
    false
  );
});

test('CLI Git deployment setup requires the provider stable repository identity', () => {
  const input = {
    organizationId: 'org-1',
    projectId: 'project-1',
    gitProviderInstallationId: 'connection-1',
    awsAccountConnectionId: 'aws-1',
    branch: 'main',
    targetRegion: 'eu-west-1',
    stage: 'production',
    deployOnGitEvent: 'PUSHED_TO_BRANCH' as const,
    configPath: null
  };
  assert.equal(createGitDeploymentConfigFromCliInputSchema.safeParse(input).success, false);
  assert.equal(
    createGitDeploymentConfigFromCliInputSchema.safeParse({ ...input, gitProviderRepositoryId: 'repo-42' }).success,
    true
  );
});

test('CLI Git deployment setup may name the provider, so a project without a repository can be linked', () => {
  const input = {
    organizationId: 'org-1',
    projectId: 'project-1',
    gitProviderInstallationId: 'connection-1',
    gitProviderRepositoryId: 'repo-42',
    awsAccountConnectionId: 'aws-1',
    branch: 'main',
    targetRegion: 'eu-west-1',
    stage: 'production',
    deployOnGitEvent: 'PUSHED_TO_BRANCH' as const,
    configPath: 'services/api/stacktape.ts'
  };
  // Older CLIs omit the provider; the Console then accepts only projects that already have a repository.
  assert.equal(createGitDeploymentConfigFromCliInputSchema.safeParse(input).success, true);
  assert.equal(createGitDeploymentConfigFromCliInputSchema.safeParse({ ...input, provider: 'GITLAB' }).success, true);
  assert.equal(createGitDeploymentConfigFromCliInputSchema.safeParse({ ...input, provider: 'GITEA' }).success, false);
});

test('a Stacktape 3 CLI names the project in serviceName, and the Console reads it as projectName', () => {
  // 3.7.1 sends the project only in its progress report, as `serviceName`.
  const v3Progress = { invocationId: 'inv-1', command: 'deploy', stackName: 'shop-production', serviceName: 'shop' };
  const parsed = recordStackOperationInputSchema.parse(v3Progress);
  assert.equal(parsed.projectName, 'shop');
  assert.equal('serviceName' in parsed, false);

  assert.equal(
    recordStackOperationInputSchema.parse({ ...v3Progress, projectName: 'billing' }).projectName,
    'billing',
    'projectName wins when a client sends both'
  );
  assert.equal(recordStackOperationInputSchema.parse({ invocationId: 'inv-1' }).projectName, undefined);
});

test('uptime sync drops channels with credentials that Stacktape 4 previews sent, and keeps named properties only', () => {
  const synthetic = 'synthetic-uptime-credential';
  const parsed = syncUptimeChecksInputSchema.parse({
    project: 'shop',
    stage: 'production',
    checks: [
      {
        name: 'site',
        revision: 'r1',
        enabled: true,
        url: 'https://example.invalid/health',
        method: 'GET',
        intervalSeconds: 60,
        timeoutSeconds: 10,
        followRedirects: true,
        regions: ['eu-west-1'],
        consecutiveFailures: 2,
        consecutiveSuccesses: 2,
        notificationChannels: [
          { name: 'Slack', type: 'slack', properties: { conversationId: 'C1', accessToken: synthetic } },
          { name: 'ms-teams', type: 'ms_teams', properties: { webhookUrl: `https://example.invalid/${synthetic}` } },
          { name: 'discord', type: 'discord', properties: { webhookUrl: `https://example.invalid/${synthetic}` } },
          { name: 'webhook', type: 'webhook', properties: { url: 'https://example.invalid', secret: synthetic } },
          { name: 'on-call', type: 'console-channel', properties: { token: synthetic } },
          {
            name: '#alerts',
            type: 'slack_app',
            properties: {
              channel: '#alerts',
              connectionId: 'c',
              channelId: 'C2',
              channelName: 'alerts',
              token: synthetic
            }
          },
          {
            name: 'Email',
            type: 'e_mail',
            properties: { sender: 'a@example.com', recipient: 'b@example.com', x: synthetic }
          }
        ]
      }
    ]
  });

  assert.deepEqual(parsed.checks[0]!.notificationChannels, [
    { name: 'on-call', type: 'console-channel', properties: {} },
    {
      name: '#alerts',
      type: 'slack_app',
      properties: { channel: '#alerts', connectionId: 'c', channelId: 'C2', channelName: 'alerts' }
    },
    { name: 'Email', type: 'e_mail', properties: { sender: 'a@example.com', recipient: 'b@example.com' } }
  ]);
  assert.equal(JSON.stringify(parsed).includes(synthetic), false);
});
