import { afterAll, beforeAll, expect, test } from 'bun:test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import stripAnsi from 'strip-ansi';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});

test('redirected help is readable and early failures preserve the JSONL result contract', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    const help = await fixture.run(['--help']);
    expect(help.exitCode).toBe(0);
    expect(help.stdout).toContain('Available commands:');
    expect(help.stdout).toContain('query:sql');
    expect(help.stdout).toBe(stripAnsi(help.stdout));
    expect(help.stderr).toBe('');
    const failure = await fixture.run(['script:run', '--outputFormat', 'jsonl']);
    expect(failure.exitCode).toBe(1);
    expect(failure.stderr).toBe('');
    const { result } = parseCliJsonl(failure.stdout, 'script:run');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Missing required');
    expect(failure.stdout).not.toContain('\\u001b');
    expect(fixture.aws.requests).toEqual([]);
    expect(fixture.api.calls).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);

test('script progress preserves captured stdout and stderr and finishes with one JSONL result', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    seedDeployedStack(fixture);
    await writeFile(
      join(fixture.directory, 'stacktape.yml'),
      JSON.stringify({
        resources: {},
        scripts: {
          report: {
            type: 'local-script',
            properties: {
              executeCommand: "printf '\\033[31mj9-out\\033[0m\\n'; printf 'j9-err\\n' >&2",
              stdioMode: 'capture'
            }
          }
        }
      })
    );
    for (const format of (process.platform === 'win32' ? ['plain', 'jsonl'] : ['plain', 'jsonl', 'tty']) as Array<
      'plain' | 'jsonl' | 'tty'
    >) {
      const run = await fixture.start(
        ['script:run', '--scriptName', 'report', '--outputFormat', format, ...targetArgs],
        { tty: format === 'tty' }
      ).finished;
      expect(run.exitCode, run.stdout + run.stderr).toBe(0);
      expect(run.stderr).toBe('');
      if (format !== 'tty') expect(run.stdout).toBe(stripAnsi(run.stdout));
      if (format !== 'jsonl') {
        const output = stripAnsi(run.stdout);
        expect(output).toContain('Running script report');
        expect(output).toContain('j9-out');
        expect(output).toContain('j9-err');
        expect(output).toContain('SCRIPT "report" COMPLETED');
      } else {
        const { events, result } = parseCliJsonl(run.stdout, 'script:run');
        expect(result.ok).toBe(true);
        expect(events).toContainEqual(expect.objectContaining({ type: 'output', stream: 'stdout', lines: ['j9-out'] }));
        expect(events).toContainEqual(expect.objectContaining({ type: 'output', stream: 'stderr', lines: ['j9-err'] }));
        expect(events).toContainEqual(
          expect.objectContaining({ type: 'event', eventType: 'RUN_SCRIPT', status: 'completed' })
        );
      }
    }
    expect(fixture.aws.unexpected).toEqual([]);
    expect(fixture.api.unexpected).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);

test('a failed script returns a nonzero exit and an actionable final result without success completion', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    seedDeployedStack(fixture);
    await writeFile(
      join(fixture.directory, 'stacktape.yml'),
      JSON.stringify({
        resources: {},
        scripts: {
          fail: {
            type: 'local-script',
            properties: {
              executeCommand: "printf 'j9-script-failure\\n' >&2; exit 7",
              stdioMode: 'capture'
            }
          }
        }
      })
    );
    const run = await fixture.run(['script:run', '--scriptName', 'fail', '--outputFormat', 'jsonl', ...targetArgs]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toBe('');
    const { events, result } = parseCliJsonl(run.stdout, 'script:run');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('j9-script-failure');
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'event',
        eventType: 'RUN_SCRIPT',
        status: 'completed',
        message: 'Script fail failed'
      })
    );
    expect(run.stdout).not.toContain('SCRIPT "fail" COMPLETED');
    expect(fixture.api.unexpected).toEqual([]);
    expect(fixture.aws.unexpected).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);

test('interrupting a running script cleans up its child and leaves plain and JSONL output complete', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    seedDeployedStack(fixture);
    await writeFile(
      join(fixture.directory, 'wait.ts'),
      `import { writeFileSync } from 'node:fs';
writeFileSync('child.pid', String(process.pid));
console.log('j9-child-ready');
setInterval(() => {}, 1000);
`
    );
    await writeFile(
      join(fixture.directory, 'stacktape.yml'),
      JSON.stringify({
        resources: {},
        scripts: { wait: { type: 'local-script', properties: { executeScript: 'wait.ts', stdioMode: 'capture' } } }
      })
    );
    for (const format of ['plain', 'jsonl'] as const) {
      const run = fixture.start(['script:run', '--scriptName', 'wait', '--outputFormat', format, ...targetArgs]);
      await run.waitFor('j9-child-ready');
      const pid = Number(await readFile(join(fixture.directory, 'child.pid'), 'utf8'));
      fixture.trackScriptPid(pid);
      run.child.kill('SIGINT');
      const result = await run.finished;
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe(stripAnsi(result.stdout));
      if (format === 'jsonl') {
        const parsed = parseCliJsonl(result.stdout, 'script:run');
        expect(parsed.result).toMatchObject({ ok: false, code: 'USER_INTERRUPTION' });
      }
      // On Linux an orphan can briefly be a zombie until its new parent reaps it; neither state may still run.
      let state = '';
      try {
        if (process.platform === 'linux') state = await readFile(`/proc/${pid}/stat`, 'utf8');
        else {
          process.kill(pid, 0);
          state = 'running';
        }
      } catch {}
      expect(state === '' || state.split(') ')[1]?.startsWith('Z ')).toBe(true);
    }
    expect(
      fixture.api.calls.filter(({ procedure }) => procedure === 'recordStackOperation').map(({ input }) => input)
    ).toContainEqual(expect.objectContaining({ success: false, interrupted: true, inProgress: false }));
    expect(fixture.aws.unexpected).toEqual([]);
    expect(fixture.api.unexpected).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);

test.skipIf(process.platform === 'win32')(
  'a PTY profile prompt saves the answer while keeping the password out of terminal output',
  async () => {
    const fixture = await createOperationsFixture(cli.path);
    const password = 'j9-synthetic-password-for-terminal';
    try {
      const run = fixture.start(['aws-profile:create'], { tty: true });
      await run.waitFor('Choose an arbitrary profile name:');
      run.write('j9-profile\r');
      await run.waitFor('AWS_ACCESS_KEY_ID:');
      run.write('j9-synthetic-access-id\r');
      await run.waitFor('AWS_SECRET_ACCESS_KEY:');
      run.write(password);
      // A following redraw proves the input was consumed before submission.
      run.write('\r');
      const result = await run.finished;
      expect(result.exitCode).toBe(0);
      expect(stripAnsi(result.stdout)).toContain('Saved credentials for AWS profile j9-profile');
      expect(result.stdout).not.toContain(password);
      expect(result.stdout).not.toContain('synthetic-password');
      const credentials = await readFile(join(fixture.home, '.aws/credentials'), 'utf8');
      expect(credentials).toContain('[j9-profile]');
      expect(credentials).toContain(`aws_secret_access_key=${password}`);
      expect(fixture.aws.requests).toEqual([]);
    } finally {
      await fixture.close();
    }
  },
  60_000
);

test.skipIf(process.platform === 'win32')(
  'Ctrl+C cancels a PTY prompt without saving a partially entered profile',
  async () => {
    const fixture = await createOperationsFixture(cli.path);
    try {
      const run = fixture.start(['aws-profile:create'], { tty: true });
      await run.waitFor('Choose an arbitrary profile name:');
      run.write('\x03');
      const result = await run.finished;
      expect(result.exitCode).toBe(0);
      expect(await Bun.file(join(fixture.home, '.aws/credentials')).exists()).toBe(false);
      expect(stripAnsi(result.stdout)).not.toContain('Saved credentials');
    } finally {
      await fixture.close();
    }
  },
  60_000
);
