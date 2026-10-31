import { expect, test } from 'bun:test';
import { parse } from 'dotenv';
import { mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { localStatePaths } from 'src/config/local-state-paths';
import { mergeManagedEnvBlock, prepareFrontendEnvironment, readManagedBlockStage } from './frontend-env';

const START = '# >>> stacktape dev: managed block, rewritten on every dev start >>>';
const END = '# <<< stacktape dev <<<';

// Dev mode owns only the lines between its markers in a frontend's `.env.local`; the developer's lines stay.
test.each([
  ['a new file', '', { API_URL: 'http://localhost:3000' }, `${START}\nAPI_URL=http://localhost:3000\n${END}\n`],
  [
    "the developer's file, block appended",
    'VITE_FLAG=1\n# my notes\n\n',
    { API_URL: 'http://localhost:3000' },
    `VITE_FLAG=1\n# my notes\n\n${START}\nAPI_URL=http://localhost:3000\n${END}\n`
  ],
  [
    'an earlier block, replaced in place',
    `A=1\n${START}\nOLD=x\nSTP_DB_PASSWORD=y\n${END}\nB=2\n`,
    { API_URL: 'http://localhost:3000' },
    `A=1\n${START}\nAPI_URL=http://localhost:3000\n${END}\nB=2\n`
  ],
  ['an earlier block, removed when nothing is injected', `A=1\n${START}\nOLD=x\n${END}\n`, {}, 'A=1\n'],
  ["the developer's file, untouched when nothing is injected", 'A=1\n\n\n', {}, 'A=1\n\n\n'],
  ['Windows line endings', 'A=1\r\n', { B: '2' }, `A=1\r\n\r\n${START}\r\nB=2\r\n${END}\r\n`]
])('%s', (_case, existing, envVars, expected) => {
  expect(mergeManagedEnvBlock(existing, envVars)).toBe(expected);
});

test('dotenv reads every written value back unchanged', () => {
  const values = {
    URL: 'https://abc.execute-api.eu-west-1.amazonaws.com/api?x=1&y=2',
    CONNECTION: 'postgresql://postgres:2f9c1d@localhost:5432/app',
    HASH: 'a#b',
    SPACES: 'two words',
    DOUBLE: 'say "hi"',
    BOTH: `it's "both"`,
    EMPTY: '',
    MULTILINE: 'line one\nline two'
  };
  const parsed: Record<string, string> = parse(mergeManagedEnvBlock('USER_VALUE=kept\n', values));
  expect(parsed).toEqual({ USER_VALUE: 'kept', ...values });
});

// r2p: two dev sessions of one worktree (stages r2p and r2p2) rewrote the same web/.env.local. Each dev server kept its
// own values through process environment, but a build reading the file got the other stage's API URL.
test("a second stage's dev session leaves the block of a stage whose session runs the app", async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-frontend-env-'));
  const previousArgs = globalStateManager.rawArgs;
  try {
    const envFile = join(directory, '.env.local');
    await writeFile(envFile, 'MY_FLAG=1\n');
    const start = (stage: string, apiUrl: string) => {
      globalStateManager.rawArgs = { stage, currentWorkingDirectory: directory };
      return prepareFrontendEnvironment({
        name: 'web',
        workingDirectory: directory,
        connectedEnvVars: { API_URL: apiUrl }
      });
    };

    expect(await start('first', 'https://first.example.test')).toEqual({ API_URL: 'https://first.example.test' });
    const firstFile = await readFile(envFile, 'utf8');
    expect(readManagedBlockStage(firstFile)).toBe('first');
    expect(parse(firstFile) as Record<string, string>).toEqual({ MY_FLAG: '1', API_URL: 'https://first.example.test' });

    // Stage first's session runs the app: a live process (this test's parent) records it.
    const registry = localStatePaths.devAgentRegistryDirectory({ workingDirectory: directory });
    await mkdir(registry, { recursive: true });
    const firstSession = {
      pid: process.ppid,
      port: 7399,
      phase: 'ready',
      projectName: 'shop',
      stage: 'first',
      region: 'eu-west-1',
      startedAt: '',
      workloads: ['web'],
      databases: []
    };
    await writeFile(join(registry, 'shop-first.json'), JSON.stringify(firstSession));

    // The second stage's server still gets its own values, as process environment.
    expect(await start('second', 'https://second.example.test')).toEqual({ API_URL: 'https://second.example.test' });
    expect(await readFile(envFile, 'utf8')).toBe(firstFile);

    // Once stage first's session no longer runs the app, the block is the next start's.
    await writeFile(join(registry, 'shop-first.json'), JSON.stringify({ ...firstSession, workloads: ['api'] }));
    await start('second', 'https://second.example.test');
    const secondFile = await readFile(envFile, 'utf8');
    expect(readManagedBlockStage(secondFile)).toBe('second');
    expect(parse(secondFile) as Record<string, string>).toEqual({
      MY_FLAG: '1',
      API_URL: 'https://second.example.test'
    });
  } finally {
    globalStateManager.rawArgs = previousArgs;
    await rm(directory, { recursive: true, force: true });
  }
});

// Review of #422: two sessions that start together could both find no owner and both write the file, and a reader could
// meet a half-written file. A start waits for the session that writes it, writes a whole new file, and takes over a
// lock that a dead session left.
test('a start writes the env file only while it holds its lock, as a whole new file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-frontend-env-lock-'));
  const previousArgs = globalStateManager.rawArgs;
  try {
    globalStateManager.rawArgs = { stage: 'first', currentWorkingDirectory: directory };
    const envFile = join(directory, '.env.local');
    const lock = `${envFile}.stacktape-lock`;
    await writeFile(lock, '4242');
    const start = prepareFrontendEnvironment({
      name: 'web',
      workingDirectory: directory,
      connectedEnvVars: { API_URL: 'https://first.example.test' }
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(await readdir(directory)).toEqual(['.env.local.stacktape-lock']);
    await rm(lock);
    await start;
    expect(parse(await readFile(envFile, 'utf8')) as Record<string, string>).toEqual({
      API_URL: 'https://first.example.test'
    });
    expect(await readdir(directory)).toEqual(['.env.local']);

    // A lock its writer left behind long ago does not block the next start.
    await writeFile(lock, '4242');
    const longAgo = new Date(Date.now() - 60_000);
    await utimes(lock, longAgo, longAgo);
    await prepareFrontendEnvironment({
      name: 'web',
      workingDirectory: directory,
      connectedEnvVars: { API_URL: 'https://first.example.test/v2' }
    });
    expect(parse(await readFile(envFile, 'utf8')) as Record<string, string>).toEqual({
      API_URL: 'https://first.example.test/v2'
    });
    expect(await readdir(directory)).toEqual(['.env.local']);
  } finally {
    globalStateManager.rawArgs = previousArgs;
    await rm(directory, { recursive: true, force: true });
  }
});
