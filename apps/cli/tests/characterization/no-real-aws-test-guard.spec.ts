import { describe, expect, test } from 'bun:test';
import http from 'node:http';
import https from 'node:https';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

describe('no-real-AWS test guard', () => {
  test('replaces inherited credentials and disables instance metadata', () => {
    expect(process.env.AWS_ACCESS_KEY_ID).toBe('stacktape-tests-no-real-aws');
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBe('stacktape-tests-no-real-aws');
    expect(process.env.AWS_SESSION_TOKEN).toBe('stacktape-tests-no-real-aws');
    expect(process.env.AWS_EC2_METADATA_DISABLED).toBe('true');
    expect(process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS).toBe('true');
    expect(process.env.AWS_PROFILE).toBeUndefined();
  });

  test('blocks external fetch before dispatch', async () => {
    await expect(fetch('https://sts.eu-west-1.amazonaws.com')).rejects.toThrow(
      'Tests cannot access external network target: sts.eu-west-1.amazonaws.com'
    );
    expect(() => fetch.preconnect('https://sts.eu-west-1.amazonaws.com')).toThrow(
      'Tests cannot access external network target: sts.eu-west-1.amazonaws.com'
    );
  });

  test('blocks Node HTTP transports before dispatch', () => {
    expect(() => http.get('http://example.com')).toThrow('Tests cannot access external network target: example.com');
    expect(() => https.request('https://example.com')).toThrow(
      'Tests cannot access external network target: example.com'
    );
  });

  test('continues to allow loopback traffic', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () => new Response('local')
    });
    try {
      expect(await (await fetch(server.url)).text()).toBe('local');
    } finally {
      await server.stop(true);
    }
  });

  test('blocks a default AWS SDK client without changing the request it would sign', async () => {
    const client = new STSClient({
      region: 'eu-west-1',
      maxAttempts: 1
    });

    try {
      await expect(client.send(new GetCallerIdentityCommand({}))).rejects.toThrow(
        'Tests cannot access external network target: sts.eu-west-1.amazonaws.com'
      );
    } finally {
      client.destroy();
    }
  });
});
