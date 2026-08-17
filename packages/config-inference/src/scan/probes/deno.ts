/** Deno task manifests, including Fresh applications. */

import { citeFirstMatch, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

export const denoProbe: Probe = {
  name: 'deno',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    if (!context.files.includes('deno.json')) return {};
    const raw = await readText(context, 'deno.json');
    if (raw === undefined) return {};
    let parsed: {
      tasks?: Record<string, unknown>;
      imports?: Record<string, unknown>;
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      return {};
    }
    const isFresh = Object.keys(parsed.imports ?? {}).some((name) => name.startsWith('$fresh/'));
    const preferredTask =
      typeof parsed.tasks?.preview === 'string'
        ? 'preview'
        : typeof parsed.tasks?.start === 'string'
          ? 'start'
          : undefined;
    if (!isFresh && preferredTask === undefined) return {};
    const evidence = [
      citeFirstMatch('deno.json', raw, /"\$fresh\/"/, 'framework'),
      ...(preferredTask === undefined
        ? []
        : [citeFirstMatch('deno.json', raw, new RegExp(`"${preferredTask}"\\s*:`), 'startCommand')])
    ].filter((citation) => citation !== undefined);
    return {
      services: [
        {
          name: context.root.split(/[/\\]/).findLast((segment) => segment !== '') ?? 'app',
          path: '.',
          language: 'typescript',
          ...(isFresh ? { framework: 'fresh' } : {}),
          exposesHttp: true,
          executionModel: 'long-running',
          ...(preferredTask === undefined ? {} : { startCommand: `deno task ${preferredTask}` }),
          environmentVariables: [],
          evidence,
          source: 'probe'
        }
      ]
    };
  }
};
