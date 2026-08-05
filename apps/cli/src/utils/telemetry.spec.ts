import { expect, test } from 'bun:test';

test('unexpected CLI errors use the PostHog exception envelope and the shared privacy boundary', async () => {
  let resolveRequest!: (request: { body: string; url: URL }) => void;
  const receivedRequest = new Promise<{ body: string; url: URL }>((resolve) => {
    resolveRequest = resolve;
  });
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const bytes = Buffer.from(await request.arrayBuffer());
      const body =
        request.headers.get('content-encoding') === 'gzip'
          ? Buffer.from(Bun.gunzipSync(bytes)).toString()
          : bytes.toString();
      resolveRequest({ body, url: new URL(request.url) });
      return Response.json({ status: 1 });
    }
  });

  process.env.STP_POSTHOG_PROJECT_TOKEN = 'phc_test';
  process.env.STP_POSTHOG_HOST = `http://127.0.0.1:${server.port}`;
  process.env.STP_POSTHOG_ENVIRONMENT = 'test';

  try {
    const { reportErrorToPostHog } = await import('./telemetry');
    const errorTrackingId = await reportErrorToPostHog({
      error: new Error('Failed for user@example.com in account 123456789012 with token=secret-value'),
      mechanism: 'command_handler'
    });
    const request = await Promise.race([
      receivedRequest,
      Bun.sleep(2000).then(() => {
        throw new Error('Timed out waiting for the PostHog test request');
      })
    ]);

    expect(errorTrackingId).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.url.pathname).toBe('/batch/');
    expect(request.body).toContain('$exception');
    expect(request.body).toContain('"app":"cli"');
    expect(request.body).toContain('"environment":"test"');
    expect(request.body).not.toContain('user@example.com');
    expect(request.body).not.toContain('123456789012');
    expect(request.body).not.toContain('secret-value');
  } finally {
    server.stop(true);
    delete process.env.STP_POSTHOG_PROJECT_TOKEN;
    delete process.env.STP_POSTHOG_HOST;
    delete process.env.STP_POSTHOG_ENVIRONMENT;
  }
});
