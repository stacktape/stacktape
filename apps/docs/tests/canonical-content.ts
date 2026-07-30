import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Shared reader for the canonical corpus, used by the route and MDX-component tests. */

export const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const CONTENT_DIR = resolve(APP_ROOT, 'content');

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

/** Every canonical page, as a `content/`-relative POSIX path. */
export const contentFiles = (): string[] =>
  walk(CONTENT_DIR)
    .filter((path) => path.endsWith('.mdx'))
    .map((path) => relative(CONTENT_DIR, path).replace(/\\/g, '/'))
    .sort();

/** Page bodies with fenced code blocks removed, so samples cannot be mistaken for MDX markup. */
export const contentBodiesWithoutCodeFences = (): string[] =>
  contentFiles().map((file) => readFileSync(join(CONTENT_DIR, file), 'utf8').replace(/^```[\s\S]*?^```/gm, ''));
