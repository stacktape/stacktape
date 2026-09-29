import { expect, test } from 'bun:test';
import { join, resolve } from 'node:path';

test('command completion sends argument keys without values, while opt-out sends nothing', async () => {
  const requests: { body: string; pathname: string }[] = [];
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const bytes = Buffer.from(await request.arrayBuffer());
      requests.push({
        body:
          request.headers.get('content-encoding') === 'gzip'
            ? Buffer.from(Bun.gunzipSync(bytes)).toString()
            : bytes.toString(),
        pathname: new URL(request.url).pathname
      });
      return Response.json({ status: 1 });
    }
  });

  const runCompletion = async (disableTelemetry: '0' | '1') => {
    const child = Bun.spawn(
      [
        process.execPath,
        '--preload',
        join(import.meta.dir, '../../scripts/test-preload.ts'),
        join(import.meta.dir, 'telemetry-completion.fixture.ts')
      ],
      {
        cwd: resolve(import.meta.dir, '../..'),
        env: {
          ...process.env,
          POSTHOG_PROJECT_TOKEN: 'phc_synthetic_test',
          POSTHOG_HOST: `http://127.0.0.1:${server.port}`,
          POSTHOG_ENVIRONMENT: 'test',
          STP_DISABLE_TELEMETRY: disableTelemetry
        },
        stdout: 'ignore',
        stderr: 'pipe'
      }
    );
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const exitCode = await Promise.race([
        child.exited,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            child.kill();
            reject(new Error('Telemetry fixture timed out'));
          }, 5000);
        })
      ]);
      expect(exitCode).toBe(0);
      expect(await new Response(child.stderr).text()).toBe('');
    } finally {
      clearTimeout(timeout);
      if (child.exitCode === null) child.kill();
    }
  };

  try {
    await runCompletion('0');
    expect(requests).toHaveLength(1);
    expect(requests[0]?.pathname).toBe('/batch/');
    const event = JSON.parse(requests[0]!.body).batch[0];
    expect(event.event).toBe('cli_command_completed');
    expect(event.properties).toMatchObject({
      command: 'version',
      outcome: 'success',
      args_keys: ['apiKey', 'projectName', 'stage']
    });
    for (const value of [
      'synthetic-api-key-value',
      'synthetic-private-project-value',
      'synthetic-private-stage-value'
    ]) {
      expect(requests[0]!.body).not.toContain(value);
    }

    requests.length = 0;
    await runCompletion('1');
    await Bun.sleep(200);
    expect(requests).toHaveLength(0);
  } finally {
    server.stop(true);
  }
});

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
