import { access, readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const assertSame = async (actualPath, templatePath) => {
  const [actual, template] = await Promise.all([read(actualPath), read(templatePath)]);
  if (actual !== template) {
    throw new Error(`${actualPath} drifted from its approved template at ${templatePath}.`);
  }
};

await assertSame('AGENTS.md', 'architecture/v4/templates/ROOT-AGENTS.md');

if ((await read('CLAUDE.md')) !== '@AGENTS.md\n') {
  throw new Error('Root CLAUDE.md must contain only @AGENTS.md.');
}

try {
  await access(new URL('../../apps/console/AGENTS.md', import.meta.url));
  await assertSame('apps/console/AGENTS.md', 'architecture/v4/templates/PRIVATE-CONSOLE-AGENTS.md');
  if ((await read('apps/console/CLAUDE.md')) !== '@AGENTS.md\n') {
    throw new Error('Private Console CLAUDE.md must contain only @AGENTS.md.');
  }
} catch (error) {
  if (error?.code !== 'ENOENT') {
    throw error;
  }
}
