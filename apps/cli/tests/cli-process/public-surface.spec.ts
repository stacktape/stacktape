import { buildOperationsCli, createOperationsFixture } from '../../scripts/operations/cli-process';
import { afterAll, beforeAll, afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});
const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});
const home = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-public-cli-'));
  directories.push(directory);
  return directory;
};
const run = async (directory: string, args: string[]) => {
  await mkdir(join(directory, '__stacktape-dist/dev/helper-lambdas'), { recursive: true });
  const child = Bun.spawn([process.execPath, cli.path, ...args], {
    cwd: directory,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
    env: {
      PATH: process.env.PATH,
      HOME: directory,
      USERPROFILE: directory,
      SKIP_LOADING_ENV: '1',
      STP_DISABLE_TELEMETRY: '1',
      AWS_EC2_METADATA_DISABLED: 'true',
      FORCE_COLOR: '0',
      STP_DEV_MODE: 'true'
    }
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  return { stdout, stderr, exitCode };
};

test('public defaults set persists values, rejects invalid regions, and leaves other defaults intact', async () => {
  const directory = await home();
  for (const args of [
    ['defaults', 'set', 'region', 'eu-west-1'],
    ['defaults', 'set', 'stage', 'preview']
  ]) {
    const result = await run(directory, [...args, args.includes('region') ? '--agent' : '--json']);
    expect(result.exitCode, result.stdout + result.stderr).toBe(0);
  }
  const invalid = await run(directory, ['defaults', 'set', 'region', 'invalid', '--json']);
  expect(invalid.exitCode).toBe(1);
  expect(invalid.stdout).toContain('CLI_DEFAULT_INVALID');
  const listed = await run(directory, ['defaults', 'list', '--json']);
  expect(listed.stdout).toContain('eu-west-1');
  expect(listed.stdout).toContain('preview');
}, 120_000);

test('bootstrap parse failures produce NDJSON and an error exit code', async () => {
  const result = await run(await home(), ['deploy', '-prj', 'shop', '--json']);
  expect(result.exitCode).toBe(1);
  const records = result.stdout
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(records.at(-1)).toMatchObject({ type: 'result', ok: false, code: 'CLI_SHORT_OPTION_INVALID' });
  expect(result.stdout).toContain('--project');
}, 120_000);

test('group help and quiet mode use the real output boundary', async () => {
  const directory = await home();
  const help = await run(directory, ['secret', '--help', '--json']);
  expect(help.exitCode, help.stderr + help.stdout).toBe(0);
  expect(help.stdout).toContain('secret set');
  expect(help.stdout).not.toContain('secret:set');
  const quiet = await run(directory, ['help', '--quiet', '--json']);
  expect(quiet.exitCode).toBe(0);
  expect(
    quiet.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
  ).toEqual([expect.objectContaining({ type: 'result', ok: true })]);
}, 120_000);

test('ordinary secret set accepts --value, --file and piped stdin without a value prompt', async () => {
  const fixture = await createOperationsFixture(cli.path);
  const stored = new Map<string, string>();
  fixture.api.on('reportEvent', () => ({}));
  fixture.aws.on('secretsmanager.ListSecrets', () => ({ kind: 'json', body: { SecretList: [] } }));
  fixture.aws.on('secretsmanager.CreateSecret', ({ input }) => {
    stored.set(String(input.Name), String(input.SecretString));
    return {
      kind: 'json',
      body: {
        ARN: `arn:aws:secretsmanager:eu-west-1:111122223333:secret:${input.Name}`,
        Name: input.Name,
        VersionId: '11111111-1111-1111-1111-111111111111'
      }
    };
  });
  try {
    const file = join(fixture.directory, 'secret.txt');
    await writeFile(file, 'from file');
    for (const [name, flags, value] of [
      ['inline', ['--value', 'from flag'], 'from flag'],
      ['file', ['--file', file], 'from file'],
      ['stdin', [], 'from stdin']
    ] as const) {
      const child = fixture.start(['secret', 'set', name, ...flags, '--region', 'eu-west-1', '--json', '--quiet']);
      child.write(value);
      child.child.stdin?.end();
      const result = await child.finished;
      expect(result.exitCode, result.stdout + result.stderr).toBe(0);
      expect(stored.get(name)).toBe(value);
      expect(result.stdout).not.toContain(value);
      expect(
        result.stdout
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line))
      ).toEqual([expect.objectContaining({ type: 'result', ok: true })]);
    }
    const conflict = await fixture.run([
      'secret',
      'set',
      'conflict',
      '--value',
      'inline',
      '--file',
      file,
      '--region',
      'eu-west-1',
      '--json'
    ]);
    expect(conflict.exitCode).toBe(1);
    expect(conflict.stdout).toContain('CLI_SECRET_INPUT_CONFLICT');
    expect(stored.has('conflict')).toBe(false);
    expect(fixture.aws.unexpected).toEqual([]);
    expect(fixture.api.unexpected).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 120_000);

test('quiet mode keeps plain errors visible and suppresses successful help', async () => {
  const directory = await home();
  const help = await run(directory, ['secret', '--help', '--quiet']);
  expect(help.exitCode).toBe(0);
  expect(help.stdout).toBe('');
  expect(help.stderr).toBe('');
  const invalid = await run(directory, ['defaults', 'set', 'region', 'invalid', '--quiet']);
  expect(invalid.exitCode).toBe(1);
  expect(invalid.stdout).toBe('');
  expect(invalid.stderr).toContain('Invalid value for default region');
}, 120_000);
