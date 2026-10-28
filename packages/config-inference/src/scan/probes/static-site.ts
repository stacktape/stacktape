/** Detect static files that deploy as they are, with no build step. */

import { posix } from 'node:path';
import type { Citation } from '../../facts/citation';
import type { ServiceFactInput } from '../../facts/service';
import { citeFirstMatch, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

const HTML = /<html\b|<!doctype\s+html/i;
/** A README sentence calling something a static site: `docs/ is a static site served from a CDN`. */
const STATIC_STATEMENT = /\bstatic\s+(?:site|website|web\s+site|pages|html)\b/i;
const NOT_SOURCE = /(?:^|\/)(?:node_modules|dist|build|out|\.next|\.output|coverage|vendor|\.stacktape)(?:\/|$)/;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Directories the root README says are a static site, and that hold an `index.html` and no package manifest of their
 * own: `docs/index.html` with "docs/ is a static site served by a CDN". A directory of HTML alone is no such statement:
 * generated API references and GitHub Pages sources look the same.
 */
const statedStaticDirectories = async (
  context: ProbeContext
): Promise<Array<{ directory: string; readme: string; statement: RegExp }>> => {
  const readme = context.files.find((path) => /^readme\.md$/i.test(path));
  if (readme === undefined) return [];
  const raw = await readText(context, readme, { fullFile: true });
  if (raw === undefined) return [];
  const sentences = raw.split(/(?<=[.!?])\s+|\r?\n/).filter((sentence) => STATIC_STATEMENT.test(sentence));
  if (sentences.length === 0) return [];
  const directories = context.files
    .filter((path) => posix.basename(path) === 'index.html' && path.includes('/') && !NOT_SOURCE.test(path))
    .map((path) => posix.dirname(path))
    .filter((directory) => !context.files.includes(`${directory}/package.json`));
  return directories.flatMap((directory) => {
    const named = new RegExp(`(?:^|[\\s\`'"(])${escapeRegExp(directory)}/?(?=[\\s\`'".,:;)]|$)`);
    const sentence = sentences.find((candidate) => named.test(candidate));
    return sentence === undefined
      ? []
      : [{ directory, readme, statement: new RegExp(escapeRegExp(sentence.trim().slice(0, 120))) }];
  });
};

const staticService = (name: string, path: string, citation: Citation | undefined) =>
  ({
    name,
    path,
    language: 'html',
    exposesHttp: false,
    executionModel: 'long-running',
    servesStaticAssets: { path },
    environmentVariables: [],
    evidence: citation === undefined ? [] : [citation],
    source: 'probe'
  }) satisfies ServiceFactInput;

export const staticSiteProbe: Probe = {
  name: 'static-site',
  run: async (context): Promise<ProbeOutput> => {
    const services: ServiceFactInput[] = [];
    // Manifests own generated frontends. A plain HTML root is only for a repository without one; otherwise the same
    // Vite project would become two resources.
    if (context.files.includes('index.html') && !context.files.includes('package.json')) {
      const contents = await readText(context, 'index.html');
      if (contents !== undefined && HTML.test(contents)) {
        services.push(
          staticService('staticSite', '.', citeFirstMatch('index.html', contents, HTML, 'servesStaticAssets'))
        );
      }
    }
    for (const { directory, readme, statement } of await statedStaticDirectories(context)) {
      // oxlint-disable-next-line no-await-in-loop -- one README, read again only for the citation.
      const raw = await readText(context, readme, { fullFile: true });
      const citation = raw === undefined ? undefined : citeFirstMatch(readme, raw, statement, 'servesStaticAssets');
      services.push(staticService(posix.basename(directory), directory, citation));
    }
    return services.length === 0 ? {} : { services };
  }
};
