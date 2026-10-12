/**
 * Qualifies the fixture through its own contract: the emulator answers on a loopback port with synthetic credentials,
 * two accounts from one container cannot see each other's state, the container cannot leave the machine, and `stop()`
 * removes the container and its volumes after success and after a deliberate failure. Needs Docker; run with
 * `pnpm --filter @stacktape/ministack test:fixture`.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { CreateBucketCommand, HeadBucketCommand, ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { assertLocalAwsEndpoint, MINISTACK_DEFAULT_ACCOUNT_ID, startMiniStack, type MiniStack } from './fixture';

const dockerExists = (kind: 'container' | 'volume', name: string) =>
  spawnSync('docker', [...(kind === 'volume' ? ['volume'] : []), 'inspect', name], { stdio: 'ignore' }).status === 0;

const started: MiniStack[] = [];
afterAll(async () => {
  await Promise.all(started.map((ministack) => ministack.stop()));
});

describe('MiniStack fixture', () => {
  test('rejects any AWS endpoint that is not a loopback port', () => {
    expect(() => assertLocalAwsEndpoint('https://s3.eu-west-1.amazonaws.com')).toThrow(/not a loopback emulator/);
    expect(() => assertLocalAwsEndpoint('http://localhost:4566')).toThrow(/not a loopback emulator/);
    expect(() => assertLocalAwsEndpoint('http://127.0.0.1')).toThrow(/not a loopback emulator/);
    expect(assertLocalAwsEndpoint('http://127.0.0.1:4566')).toBe('http://127.0.0.1:4566');
  });

  test('starts ready on a loopback port, isolates accounts inside one container, blocks egress and cleans up', async () => {
    const ministack = await startMiniStack({ label: 'fixture-test' });
    started.push(ministack);
    expect(ministack.endpoint).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(ministack.startupMs).toBeGreaterThan(0);
    expect(dockerExists('container', ministack.containerName)).toBe(true);

    // The container keeps only its directly connected subnet; no default route means no path to real AWS.
    const routes = spawnSync('docker', ['exec', ministack.containerName, 'cat', '/proc/net/route'], {
      encoding: 'utf8'
    }).stdout;
    expect(
      routes
        .split('\n')
        .slice(1)
        .some((line) => line.split(/\s+/)[1] === '00000000')
    ).toBe(false);

    const environment = ministack.childEnvironment();
    expect(Object.keys(environment).some((name) => /PROFILE/.test(name))).toBe(false);
    expect(environment.AWS_ENDPOINT_URL).toBe(ministack.endpoint);
    expect(environment.AWS_SECRET_ACCESS_KEY).toContain('synthetic');
    expect(environment.AWS_ACCESS_KEY_ID).toBe(MINISTACK_DEFAULT_ACCOUNT_ID);

    const first = ministack.account();
    const second = ministack.account();
    expect(first.accountId).not.toBe(second.accountId);
    const sts = new STSClient(ministack.clientConfig(first));
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    expect(identity.Account).toBe(first.accountId);
    const defaultIdentity = await new STSClient(ministack.clientConfig()).send(new GetCallerIdentityCommand({}));
    expect(defaultIdentity.Account).toBe(MINISTACK_DEFAULT_ACCOUNT_ID);

    const firstS3 = new S3Client(ministack.clientConfig(first));
    const secondS3 = new S3Client(ministack.clientConfig(second));
    await firstS3.send(
      new CreateBucketCommand({
        Bucket: 'owned-by-first',
        CreateBucketConfiguration: { LocationConstraint: 'eu-west-1' }
      })
    );
    await firstS3.send(new HeadBucketCommand({ Bucket: 'owned-by-first' }));
    const seenBySecond = (await secondS3.send(new ListBucketsCommand({}))).Buckets ?? [];
    expect(seenBySecond.map(({ Name }) => Name)).not.toContain('owned-by-first');

    const { containerName, volumes } = ministack;
    await ministack.stop();
    expect(dockerExists('container', containerName)).toBe(false);
    for (const volume of volumes) expect(dockerExists('volume', volume)).toBe(false);
    await ministack.stop();
  }, 120_000);

  test('removes the container after a failure in the caller', async () => {
    let ministack: MiniStack | undefined;
    await expect(
      (async () => {
        ministack = await startMiniStack({ label: 'fixture-failure' });
        try {
          throw new Error('deliberate failure after startup');
        } finally {
          await ministack.stop();
        }
      })()
    ).rejects.toThrow('deliberate failure after startup');
    expect(ministack).toBeDefined();
    expect(dockerExists('container', ministack!.containerName)).toBe(false);
    for (const volume of ministack!.volumes) expect(dockerExists('volume', volume)).toBe(false);
  }, 120_000);
});
