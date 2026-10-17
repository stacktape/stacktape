import { expect, test } from 'bun:test';
import { join, resolve } from 'node:path';

const collector = (status = 200) => {
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
      return Response.json({ status: status === 200 ? 1 : 0 }, { status });
    }
  });

  const run = async (mode: 'completion' | 'init' | 'exception', disabled = false) => {
    const child = Bun.spawn(
      [
        process.execPath,
        '--no-env-file',
        '--preload',
        join(import.meta.dir, '../../scripts/test-preload.ts'),
        mode === 'init'
          ? join(import.meta.dir, '../init/telemetry-init.fixture.ts')
          : join(import.meta.dir, 'telemetry-completion.fixture.ts'),
        mode
      ],
      {
        cwd: resolve(import.meta.dir, '../..'),
        env: {
          PATH: process.env.PATH,
          POSTHOG_PROJECT_TOKEN: 'phc_synthetic_test',
          POSTHOG_HOST: `http://127.0.0.1:${server.port}`,
          POSTHOG_ENVIRONMENT: 'test',
          STP_DISABLE_TELEMETRY: disabled ? '1' : '0'
        },
        stdout: 'pipe',
        stderr: 'pipe'
      }
    );
    const stdout = new Response(child.stdout).text();
    const stderr = new Response(child.stderr).text();
    const timeout = setTimeout(() => child.kill(), 5000);
    try {
      expect(await child.exited).toBe(0);
      expect(await stderr).toBe('');
      return (await stdout).trim();
    } finally {
      clearTimeout(timeout);
      if (child.exitCode === null) child.kill();
      await child.exited;
    }
  };
  return { requests, run, stop: () => server.stop(true) };
};

test('command completion sends argument keys without values, while opt-out sends nothing', async () => {
  const { requests, run, stop } = collector();
  try {
    expect(await run('completion')).toBe('command-completed');
    expect(requests).toHaveLength(1);
    expect(requests[0]!.pathname).toBe('/batch/');
    const event = JSON.parse(requests[0]!.body).batch[0];
    expect(event.event).toBe('cli_command_completed');
    expect(event.properties).toMatchObject({
      app: 'cli',
      environment: 'test',
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
    expect(await run('completion', true)).toBe('command-completed');
    expect(requests).toHaveLength(0);
  } finally {
    stop();
  }
});

test('unexpected CLI errors send a useful exception envelope without user or credential values', async () => {
  const { requests, run, stop } = collector();
  try {
    expect(JSON.parse(await run('exception')).id).toMatch(/^[0-9a-f-]{36}$/);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.pathname).toBe('/batch/');
    const event = JSON.parse(requests[0]!.body).batch[0];
    expect(event.event).toBe('$exception');
    expect(event.properties).toMatchObject({ app: 'cli', environment: 'test', mechanism: 'command_handler' });
    expect(event.properties.$exception_list[0].value).toBe(
      'Failed for [redacted:email]@example.com in account [REDACTED_AWS_ACCOUNT_ID] with token=[REDACTED] at /home/[user]/app'
    );
    expect(event.properties).toMatchObject({
      error_tracking_id: JSON.parse(requests[0]!.body).batch[0].properties.error_tracking_id,
      platform: process.platform,
      arch: process.arch,
      runtime_version: `bun ${process.versions.bun}`
    });
    for (const value of ['user@example.com', '123456789012', 'secret-value', 'synthetic-user']) {
      expect(requests[0]!.body).not.toContain(value);
    }
  } finally {
    stop();
  }
});

test('init sends categories and measured outcomes without repository content, and respects opt-out', async () => {
  const { requests, run, stop } = collector();
  try {
    expect(await run('init')).toBe('init-completed');
    expect(requests).toHaveLength(1);
    const event = JSON.parse(requests[0]!.body).batch[0];
    expect(event.event).toBe('init_completed');
    expect(event.properties).toMatchObject({
      app: 'cli',
      environment: 'test',
      verification: 'inconclusive',
      verification_passed_services: 1,
      verification_skipped_services: 1,
      analysis_duration_ms: 1200,
      deploy_duration_ms: 3400,
      mode: 'custom',
      capacity: 'performance',
      preferences_changed: 1,
      frameworks: ['express'],
      resource_types: ['web-service'],
      service_count: 1
    });
    for (const value of [
      'customer-project-name',
      'customer-service-name',
      '/private/repository',
      'private result text',
      'customerResourceName',
      'private-worker-name',
      'privateWorkerResource'
    ]) {
      expect(requests[0]!.body).not.toContain(value);
    }
    requests.length = 0;
    expect(await run('init', true)).toBe('init-completed');
    expect(requests).toHaveLength(0);
  } finally {
    stop();
  }
});

test('rejected analytics does not fail command completion, init or error reporting', async () => {
  // A permanent provider rejection exercises SDK failure without retry delays.
  const { requests, run, stop } = collector(400);
  try {
    expect(await run('completion')).toBe('command-completed');
    expect(await run('init')).toBe('init-completed');
    // The SDK returns after attempting delivery; a tracking ID does not promise ingestion succeeded.
    expect(JSON.parse(await run('exception')).id).toMatch(/^[0-9a-f-]{36}$/);
    expect(requests.map(({ body }) => JSON.parse(body).batch[0].event)).toEqual([
      'cli_command_completed',
      'init_completed',
      '$exception'
    ]);
  } finally {
    stop();
  }
});
