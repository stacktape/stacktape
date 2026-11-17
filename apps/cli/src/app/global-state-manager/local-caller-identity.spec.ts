import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GlobalStateManager } from '@application-services/global-state-manager';
import { cacheAwsIdentity } from 'src/aws/identity-cache';

const SSO_ARN = 'arn:aws:sts::111122223333:assumed-role/AWSReservedSSO_Developer_abc/jane';
let home: string;
const originalHome = process.env.HOME;
beforeAll(async () => {
  // The identity cache answers for these keys, so the lookup needs no network.
  home = await mkdtemp(join(tmpdir(), 'stacktape-caller-identity-'));
  process.env.HOME = home;
  await cacheAwsIdentity('ASIASSOCALLER', { account: '111122223333', arn: SSO_ARN, userId: 'AROAFAKE:jane' });
});
afterAll(async () => {
  process.env.HOME = originalHome;
  await rm(home, { recursive: true, force: true });
});

test('a profile that names its account still resolves the real caller for commands that use it', async () => {
  const manager = new GlobalStateManager();
  manager.rawCommands = ['dev'];
  manager.rawArgs = { region: 'eu-west-1' };
  manager.localCredentialsProvider = async () => ({
    accessKeyId: 'ASIASSOCALLER',
    secretAccessKey: 'fake',
    sessionToken: 'fake'
  });
  // What `prepareLocalAwsCredentials` sets when an SSO profile names its account.
  manager.localTargetAwsAccount = {
    id: 'local:111122223333',
    organizationId: 'local',
    awsAccountId: '111122223333',
    connectionMode: 'BASIC',
    name: 'sso',
    state: 'ACTIVE',
    primaryRegions: ['eu-west-1'],
    defaultRegion: 'eu-west-1'
  };

  // The account alone needs no lookup, so the identity is still the placeholder.
  await manager.resolveLocalAwsAccount();
  expect(manager.credentials.identity.arn).toBe('arn:aws:iam::123456789999:user/dummy');

  await manager.resolveLocalCallerIdentity();
  expect(manager.credentials.identity).toEqual({ account: '111122223333', arn: SSO_ARN });
  expect(manager.targetAwsAccount.awsAccountId).toBe('111122223333');
});
