/**
 * next-sitemap runs AFTER `next build` has already exported public/ into out/, so the freshly
 * generated sitemap + robots land in public/ but not in the deployed out/ directory. Copy them
 * (and the published llms files) into out/ so the static export actually ships the current files.
 */
import { join } from 'node:path';
import { copy, pathExists, readFile, writeFile } from 'fs-extra';
import { logInfo, logSuccess } from '../../shared/utils/logging';

const PUBLIC_DIR = join(__dirname, '..', 'public');
const OUT_DIR = join(__dirname, '..', 'out');
const FILES = ['robots.txt', 'sitemap.xml', 'sitemap-0.xml', 'llms.txt', 'llms-full.txt'];

const syncSeoToOut = async () => {
  if (!(await pathExists(OUT_DIR))) {
    console.warn('[sync-seo] out/ does not exist — skipping (run after next build).');
    return;
  }
  logInfo('Syncing generated SEO files (sitemap, robots, llms) into out/...');
  for (const name of FILES) {
    const src = join(PUBLIC_DIR, name);
    if (!(await pathExists(src))) continue;
    if (name === 'robots.txt') {
      // next-sitemap always emits a non-standard `Host:` directive — strip it.
      const content = (await readFile(src, 'utf8')).replace(/#\s*Host\r?\nHost:[^\n]*\r?\n+/i, '');
      await writeFile(join(OUT_DIR, name), content);
    } else {
      await copy(src, join(OUT_DIR, name), { overwrite: true });
    }
  }
  logSuccess('Synced SEO files into out/.');
};

if (import.meta.main) {
  syncSeoToOut();
}
