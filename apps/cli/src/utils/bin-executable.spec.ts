import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { checkExecutableInPath } from './bin-executable';

const pathEnvironmentKey = process.platform === 'win32' ? 'Path' : 'PATH';
const originalPath = process.env[pathEnvironmentKey];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  process.env[pathEnvironmentKey] = originalPath;
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('native executable discovery', () => {
  test('uses PATH changes made after Bun starts and honors platform executable rules', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-bun-which-'));
    temporaryDirectories.push(directory);
    const command = `stacktape-which-${process.pid}`;
    const executablePath = join(directory, process.platform === 'win32' ? `${command}.cmd` : command);
    await writeFile(executablePath, process.platform === 'win32' ? '@exit /b 0\r\n' : '#!/bin/sh\nexit 0\n');
    if (process.platform !== 'win32') await chmod(executablePath, 0o755);
    process.env[pathEnvironmentKey] = [directory, originalPath].filter(Boolean).join(delimiter);

    expect(resolve(checkExecutableInPath(command)!)).toBe(resolve(executablePath));
    expect(resolve(checkExecutableInPath(executablePath)!)).toBe(resolve(executablePath));
    expect(checkExecutableInPath(`${command}-missing`)).toBeUndefined();

    process.env[pathEnvironmentKey] = '';
    expect(checkExecutableInPath(command)).toBeUndefined();
    expect(resolve(checkExecutableInPath(executablePath)!)).toBe(resolve(executablePath));
  });
});
