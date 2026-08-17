/** Handler-shaped source files in projects that do not carry a SAM descriptor. */

import { posix } from 'node:path';
import type { ServiceFactInput } from '../../facts/service';
import { citeFirstMatch, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

/**
 * Only exports that are actually handler-shaped.
 *
 * The directory name alone is not enough: `src/handlers/userHandler.js` containing
 * `module.exports = router` is a perfectly ordinary Express layout, and an earlier version of this
 * pattern matched any bare `module.exports =` — turning route files into phantom Lambda functions
 * beside the real web service. A function claim needs a `handler` export by name.
 */
const HANDLER_PATTERN =
  /(?:export\s+(?:const\s+handler|async\s+function\s+handler|function\s+handler)|def\s+(?:lambda_handler|handler)\s*\(|(?:module\.)?exports\.handler\s*=)/;

const languageFor = (path: string): string =>
  path.endsWith('.py') ? 'python' : path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'javascript';

const nameFor = (path: string): string => {
  const segments = path.split('/');
  const stem = posix.basename(path).replace(/\.[^.]+$/, '');
  if (!['handler', 'index'].includes(stem.toLowerCase())) return stem;
  for (let index = segments.length - 2; index >= 0; index -= 1) {
    const segment = segments[index]!;
    if (!['src', 'handlers', 'handler', 'functions', 'function', 'lambdas', 'lambda'].includes(segment.toLowerCase())) {
      return segment;
    }
  }
  return 'handler';
};

export const lambdaSourceProbe: Probe = {
  name: 'lambda-source',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    // SAM is more authoritative: it distinguishes multiple exports in one file and names events.
    for (const path of ['template.yaml', 'template.yml', 'sam-template.yaml', 'sam-template.yml']) {
      if (!context.files.includes(path)) continue;
      // oxlint-disable-next-line no-await-in-loop -- stop after the first authoritative SAM template.
      const raw = await readText(context, path);
      if (raw !== undefined && /AWS::Serverless-2016-10-31/.test(raw)) return {};
    }
    // Same deference to the Serverless Framework: its manifest names the functions and their
    // events, so pattern-matching the same handler files again would only mint duplicates.
    if (context.files.some((path) => /(^|\/)serverless\.ya?ml$/.test(path))) return {};
    // And to SST, whose config declares its functions by handler path.
    if (context.files.includes('sst.config.ts') || context.files.includes('sst.config.js')) return {};
    // And to CDK, whose stacks name their entry files and event sources.
    if (context.files.includes('cdk.json')) return {};

    const candidates = context.files.filter(
      (path) => /(?:^|\/)(?:functions?|lambdas?|handlers?)(?:\/|$)/i.test(path) && /\.(?:[cm]?js|tsx?|py)$/.test(path)
    );
    const services: ServiceFactInput[] = [];
    for (const path of candidates) {
      // oxlint-disable-next-line no-await-in-loop -- each candidate is small and reads are policy controlled.
      const raw = await readText(context, path);
      if (raw === undefined || !HANDLER_PATTERN.test(raw)) continue;
      const citation = citeFirstMatch(path, raw, HANDLER_PATTERN, 'functionEntrypoint');
      services.push({
        name: nameFor(path),
        path: posix.dirname(path) === '' ? '.' : posix.dirname(path),
        processType: path,
        language: languageFor(path),
        exposesHttp: false,
        executionModel: 'per-request',
        functionEntrypoint: path,
        functionTriggers: [],
        environmentVariables: [],
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    return services.length === 0 ? {} : { services };
  }
};
