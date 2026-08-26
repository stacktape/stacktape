import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { parseLiteralMigrationCommand } from '@stacktape/config-inference/compose/migrations';
import { runGreenfieldMission } from '../init/missions/greenfield';
import { executeCommandHook } from './scripts';

const LITERAL_ARGS = [
  '--directory',
  'db migrations',
  '',
  "apostrophe's",
  'double"quote',
  '$STP_LITERAL_ARG',
  '%STP_LITERAL_ARG%',
  '!STP_LITERAL_ARG!',
  '$(printf changed)',
  '`printf changed`',
  '; printf changed',
  '&& printf changed',
  '| printf changed',
  '*.sql',
  'C:\\db\\migrations\\',
  'line\nbreak'
];
const BASH =
  process.platform === 'win32'
    ? join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')
    : '/bin/bash';
let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'stp-literal-hook-'));
  const files = {
    'package.json': JSON.stringify({ name: 'api', dependencies: { express: '5', pg: '8' } }),
    'server.js': 'require("express")().listen(3000);\n',
    'migrate.js': 'console.log(JSON.stringify(process.argv.slice(2)));\n',
    Dockerfile: 'FROM oven/bun:1\nWORKDIR /app\nCOPY . .\nEXPOSE 3000\n',
    'compose.yaml': [
      'services:',
      '  migrate:',
      '    build: .',
      '    entrypoint: ["bun"]',
      `    command: ${JSON.stringify(['migrate.js', ...LITERAL_ARGS])}`,
      '  api:',
      '    build: .',
      '    command: ["node", "server.js"]',
      '    ports: ["3000:3000"]',
      '    environment:',
      '      DATABASE_URL: postgres://db:5432/app',
      '    depends_on:',
      '      migrate:',
      '        condition: service_completed_successfully',
      '  db:',
      '    image: postgres:16',
      ''
    ].join('\n')
  };
  await Promise.all(Object.entries(files).map(([name, contents]) => writeFile(join(root, name), contents)));
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const importedCommand = async (): Promise<string> => {
  const result = await runGreenfieldMission({ repositoryRoot: root, projectName: 'literal-hook' });
  expect(result.composition.config.hooks?.afterDeploy).toEqual([{ scriptName: 'migrateDatabase' }]);
  expect(result.composition.gaps).toEqual([]);
  const script = result.composition.config.scripts?.migrateDatabase;
  expect(script?.type).toBe('local-script-with-bastion-tunneling');
  const command = script?.properties.executeCommand;
  if (typeof command !== 'string') throw new Error('The import did not emit its migration command.');
  return command;
};

describe('literal migration commands at the actual local hook boundary', () => {
  it('imports Compose argv and preserves it through native executeCommandHook without a shell', async () => {
    const command = await importedCommand();
    const lines: string[] = [];
    await executeCommandHook({
      command,
      cwd: root,
      env: { STP_LITERAL_ARG: 'expanded' },
      pipeStdio: true,
      onOutputLine: (line) => lines.push(line)
    });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toEqual(LITERAL_ARGS);
  });

  it('also preserves the imported arguments through a native Node runner', async () => {
    const command = (await importedCommand()).replace(/^bun /, 'node ');
    const lines: string[] = [];
    await executeCommandHook({
      command,
      cwd: root,
      env: { STP_LITERAL_ARG: 'expanded' },
      pipeStdio: true,
      onOutputLine: (line) => lines.push(line)
    });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toEqual(LITERAL_ARGS);
  });

  it.skipIf(!existsSync(BASH))('matches POSIX Bash argument semantics when Bash is available', async () => {
    const command = await importedCommand();
    const child = spawnSync(BASH, ['-c', command], {
      cwd: root,
      env: { ...process.env, STP_LITERAL_ARG: 'expanded' },
      encoding: 'utf8',
      windowsHide: true
    });
    expect(child.status).toBe(0);
    expect(child.stderr).toBe('');
    expect(JSON.parse(child.stdout)).toEqual(LITERAL_ARGS);
  });

  it('keeps a non-literal authored command on the existing execution path', async () => {
    const command = 'bun migrate.js "db migrations"';
    expect(parseLiteralMigrationCommand(command)).toBeUndefined();
    const lines: string[] = [];
    await executeCommandHook({
      command,
      cwd: root,
      env: {},
      pipeStdio: true,
      onOutputLine: (line) => lines.push(line)
    });
    expect(JSON.parse(lines[0]!)).toEqual(['db migrations']);
  });

  it.skipIf(process.platform !== 'win32')('allows ordinary arguments through a Windows runner shim', async () => {
    const shimDirectory = join(root, 'runner-shims');
    await mkdir(shimDirectory);
    await writeFile(
      join(shimDirectory, 'npm.cmd'),
      `@echo off\r\n"${process.execPath}" "${join(root, 'migrate.js')}" %*\r\n`
    );
    const lines: string[] = [];
    await executeCommandHook({
      command: 'npm migrate plain-argument',
      cwd: root,
      env: { PATH: `${shimDirectory};${process.env.PATH ?? process.env.Path}` },
      pipeStdio: true,
      onOutputLine: (line) => lines.push(line)
    });
    expect(JSON.parse(lines[0]!)).toEqual(['migrate', 'plain-argument']);
  });

  for (const argument of ["'db migrations'", "''", "'%STP_LITERAL_ARG%'", "'line\nbreak'", "'; printf changed'"]) {
    it.skipIf(process.platform !== 'win32')(
      `refuses Windows cmd-wrapper argument reinterpretation: ${JSON.stringify(argument)}`,
      async () => {
        const shimDirectory = join(root, 'runner-shims');
        await mkdir(shimDirectory);
        await writeFile(
          join(shimDirectory, 'npm.cmd'),
          `@echo off\r\n"${process.execPath}" "${join(root, 'migrate.js')}" %*\r\n`
        );
        const lines: string[] = [];
        await expect(
          executeCommandHook({
            command: `npm migrate ${argument}`,
            cwd: root,
            env: { PATH: `${shimDirectory};${process.env.PATH ?? process.env.Path}`, STP_LITERAL_ARG: 'expanded' },
            pipeStdio: true,
            onOutputLine: (line) => lines.push(line)
          })
        ).rejects.toMatchObject({ code: 'WINDOWS_LITERAL_SCRIPT_REQUIRES_EXECUTABLE' });
        expect(lines).toEqual([]);
      }
    );
  }
});
