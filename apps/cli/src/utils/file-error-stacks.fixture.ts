import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDir, readJson } from 'fs-extra';
import { addCallerStacksToFileErrors } from './file-error-stacks';

const main = async () => {
  // Like the hooks some tools install: it rejects anything but an error, as Bun's own does under some source maps.
  Error.prepareStackTrace = (error, frames) => {
    if (!(error instanceof Error)) throw new TypeError('First argument must be an Error object');
    return [`${error.name}: ${error.message}`, ...frames.map((frame) => `    at ${frame}`)].join('\n');
  };
  addCallerStacksToFileErrors();
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-file-error-stacks-'));
  const file = join(directory, 'file');
  await writeFile(file, '');

  async function awaitingCaller() {
    await ensureDir(file);
  }
  async function returningCaller() {
    return readJson(join(directory, 'missing.json'));
  }

  const stacks: Record<string, string | undefined> = {};
  for (const operation of [awaitingCaller, returningCaller]) {
    try {
      await operation();
    } catch (error) {
      stacks[operation.name] = (error as Error).stack;
    }
  }
  await rm(directory, { recursive: true, force: true });
  console.log(JSON.stringify(stacks));
};

main();
