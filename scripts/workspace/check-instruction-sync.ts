import { access, readFile } from 'node:fs/promises';

const read = (relativePath: string): Promise<string> =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

if ((await read('CLAUDE.md')) !== '@AGENTS.md\n') {
  throw new Error('Root CLAUDE.md must contain only @AGENTS.md.');
}

let consolePresent = true;
try {
  await access(new URL('../../apps/console/api/package.json', import.meta.url));
} catch (error) {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    consolePresent = false;
  } else {
    throw error;
  }
}

if (consolePresent) {
  if ((await read('apps/console/CLAUDE.md')) !== '@AGENTS.md\n') {
    throw new Error('Private Console CLAUDE.md must contain only @AGENTS.md.');
  }
}
