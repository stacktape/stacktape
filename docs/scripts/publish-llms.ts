/**
 * Publish the generated LLM-docs index to the public docs domain so AI agents/crawlers can find
 * it at https://docs.stacktape.com/llms.txt (and /llms-full.txt). Rewrites the generator's
 * root-relative links to absolute docs URLs and strips the internal `- source: ...` annotations.
 *
 * Runs as a build step (see docs/package.json `build`). The published files are gitignored — they
 * are regenerated from @generated/llm-docs on every build.
 */
import { join } from 'node:path';
import { readFile, writeFile, ensureDir, pathExists } from 'fs-extra';
import { logInfo, logSuccess } from '../../shared/utils/logging';

const SITE_URL = 'https://docs.stacktape.com';
const SRC_DIR = join(__dirname, '..', '..', '@generated', 'llm-docs');
const PUBLIC_DIR = join(__dirname, '..', 'public');

const toPublicMarkdown = (markdown: string) =>
  markdown
    // Drop internal source-path annotations (`- source: docs/docs/....mdx`).
    .replace(/ - source: [^\n]+/g, '')
    // Rewrite root-relative markdown links to absolute docs URLs.
    .replace(/\]\(\/([^)\s]*)\)/g, `](${SITE_URL}/$1)`);

export const publishLlms = async () => {
  logInfo('Publishing llms.txt / llms-full.txt to public/...');
  await ensureDir(PUBLIC_DIR);
  for (const name of ['llms.txt', 'llms-full.txt']) {
    const srcPath = join(SRC_DIR, name);
    if (!(await pathExists(srcPath))) {
      console.warn(`[publish-llms] ${name} not found at ${srcPath} — skipping (run gen:llm-docs first).`);
      continue;
    }
    const content = await readFile(srcPath, 'utf8');
    await writeFile(join(PUBLIC_DIR, name), toPublicMarkdown(content));
    logSuccess(`Published public/${name}`);
  }
};

if (import.meta.main) {
  publishLlms();
}
