import { expect, test } from 'bun:test';
import { IAMClient, GetRoleCommand } from '@aws-sdk/client-iam';
import { isPendingTaskRole } from './run';

test('the real IAM SDK missing-role response remains retryable during plan bootstrap', async () => {
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () =>
      new Response(
        '<ErrorResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/"><Error><Type>Sender</Type><Code>NoSuchEntity</Code><Message>The owned role has not been created yet.</Message></Error><RequestId>owned-test</RequestId></ErrorResponse>',
        { status: 404, headers: { 'content-type': 'text/xml' } }
      )
  });
  try {
    const iam = new IAMClient({
      region: 'eu-west-1',
      endpoint: `http://127.0.0.1:${server.port}`,
      credentials: { accessKeyId: 'synthetic', secretAccessKey: 'synthetic' },
      maxAttempts: 1
    });
    const failure: unknown = await iam.send(new GetRoleCommand({ RoleName: 'owned-fixture' })).catch((error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(isPendingTaskRole(failure)).toBe(true);
    expect(isPendingTaskRole(Object.assign(new Error('denied'), { name: 'AccessDeniedException' }))).toBe(false);
    expect(isPendingTaskRole(new Error('transport failed'))).toBe(false);
    iam.destroy();
  } finally {
    server.stop(true);
  }
});
