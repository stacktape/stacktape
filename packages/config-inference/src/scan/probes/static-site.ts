/** Detect a repository that is already a directory of static files, with no build step. */

import type { ServiceFactInput } from '../../facts/service';
import { citeFirstMatch, readText, type Probe, type ProbeOutput } from '../probe';

export const staticSiteProbe: Probe = {
  name: 'static-site',
  run: async (context): Promise<ProbeOutput> => {
    // Manifests own generated frontends. This probe is only for an already-built/plain HTML root;
    // otherwise the same Vite project would become two resources.
    if (!context.files.includes('index.html') || context.files.includes('package.json')) return {};
    const contents = await readText(context, 'index.html');
    if (contents === undefined || !/<html\b|<!doctype\s+html/i.test(contents)) return {};

    const citation = citeFirstMatch('index.html', contents, /<html\b|<!doctype\s+html/i, 'servesStaticAssets');
    const service: ServiceFactInput = {
      name: 'staticSite',
      path: '.',
      language: 'html',
      exposesHttp: false,
      executionModel: 'long-running',
      servesStaticAssets: { path: '.' },
      environmentVariables: [],
      evidence: citation === undefined ? [] : [citation],
      source: 'probe'
    };
    return { services: [service] };
  }
};
