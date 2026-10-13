import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { compareLlmDocPaths, installGeneratedCorpus, recoverInterruptedCorpus } from './generate-llm-docs';
import { htmlToMarkdownText } from './llm-docs/html-to-markdown';

describe('generated LLM docs corpus', () => {
  test('sorts paths ordinally after normalizing platform separators', () => {
    expect(
      ['zeta\\last.mdx', 'alpha/shared.mdx', 'alpha\\first.mdx', 'zeta/first.mdx'].sort(compareLlmDocPaths)
    ).toEqual(['alpha\\first.mdx', 'alpha/shared.mdx', 'zeta/first.mdx', 'zeta\\last.mdx']);
    expect(htmlToMarkdownText('<p>&quot;A&quot; &amp; B &#39;C&#39; &#x1F680; &copy;</p>')).toBe(`"A" & B 'C' 🚀 ©`);
  });

  test('recovers the last valid corpus after an interrupted swap', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'stacktape-llm-doc-recovery-'));
    const distDirectory = join(fixture, 'llm-docs');
    const backupDirectory = `${distDirectory}.previous`;
    try {
      await mkdir(backupDirectory);
      await writeFile(join(backupDirectory, 'index.json'), '{"version":"last-valid"}\n');

      await recoverInterruptedCorpus(distDirectory);

      await expect(readFile(join(distDirectory, 'index.json'), 'utf-8')).resolves.toContain('last-valid');
      await expect(stat(backupDirectory)).rejects.toThrow();
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  test('restores the current corpus when installing a staged corpus fails', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'stacktape-llm-doc-install-'));
    const distDirectory = join(fixture, 'llm-docs');
    const stagingDirectory = join(fixture, 'staging');
    try {
      await mkdir(distDirectory);
      await mkdir(stagingDirectory);
      await writeFile(join(distDirectory, 'index.json'), '{"version":"current"}\n');
      await writeFile(join(stagingDirectory, 'index.json'), '{"version":"next"}\n');

      await expect(
        installGeneratedCorpus({
          distDirectory,
          stagingDirectory,
          renameDirectory: async (source, destination) => {
            if (source === stagingDirectory && destination === distDirectory)
              throw new Error('injected install failure');
            await rename(source, destination);
          }
        })
      ).rejects.toThrow('injected install failure');

      await expect(readFile(join(distDirectory, 'index.json'), 'utf-8')).resolves.toContain('current');
      await expect(stat(`${distDirectory}.previous`)).rejects.toThrow();
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  test('synchronizes the exact staged corpus when a watcher blocks the directory swap', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'stacktape-llm-doc-watched-install-'));
    const distDirectory = join(fixture, 'llm-docs');
    const stagingDirectory = join(fixture, 'staging');
    try {
      await mkdir(join(distDirectory, 'obsolete'), { recursive: true });
      await mkdir(join(stagingDirectory, 'nested'), { recursive: true });
      await writeFile(join(distDirectory, 'index.json'), '{"version":"current"}\n');
      await writeFile(join(distDirectory, 'obsolete', 'page.md'), 'obsolete\n');
      await writeFile(join(stagingDirectory, 'index.json'), '{"version":"next"}\n');
      await writeFile(join(stagingDirectory, 'nested', 'page.md'), 'next\n');

      await installGeneratedCorpus({
        distDirectory,
        stagingDirectory,
        renameDirectory: async () => {
          throw Object.assign(new Error('directory is watched'), { code: 'EPERM' });
        }
      });

      await expect(readFile(join(distDirectory, 'index.json'), 'utf-8')).resolves.toContain('next');
      await expect(readFile(join(distDirectory, 'nested', 'page.md'), 'utf-8')).resolves.toBe('next\n');
      await expect(stat(join(distDirectory, 'obsolete'))).rejects.toThrow();
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });
});
