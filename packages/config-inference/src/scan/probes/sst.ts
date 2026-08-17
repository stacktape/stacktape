/**
 * High-level concepts from an SST (Ion) configuration — extraction, never execution.
 *
 * `sst.config.ts` is a program, and running a program to learn its configuration is a consent the
 * scan does not have. But the Ion style is highly regular — `new sst.aws.Postgres("Database", {...})`
 * — regular enough that the component constructors and their literal properties can be read as
 * text. That yields exactly what the product wants from an importer: the concepts ("a Next.js app,
 * a Postgres database, a queue"), the wiring (`link:` names who uses what), and the concrete
 * details worth carrying (instance sizes, handler paths). Not a 1:1 translation; SST v2 projects
 * (`sst.json` + CDK-style stacks) stay recognition-only.
 *
 * Stateful components are marked as declared for AWS. The file does not prove that they were ever
 * deployed, so the wording stays conditional; the cautious default still avoids creating a
 * replacement, and a new copy remains an explicit choice. Compute components become ordinary
 * service facts the rest of the scan corroborates.
 */

import { posix } from 'node:path';
import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import type { ServiceFactInput } from '../../facts/service';
import { sliceBalancedBraces } from '../balanced-slice';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

const CONFIG_FILES = ['sst.config.ts', 'sst.config.js'] as const;

/** Stateful Ion components, in our dependency vocabulary. */
const DEPENDENCY_COMPONENTS: Readonly<Record<string, DependencyKind>> = {
  Postgres: 'postgres',
  Aurora: 'postgres',
  Mysql: 'mysql',
  Redis: 'redis',
  Valkey: 'redis',
  Bucket: 'object-storage',
  Queue: 'queue',
  SnsTopic: 'topic',
  Dynamo: 'dynamodb',
  OpenSearch: 'search',
  Kafka: 'kafka'
};

/** SSR components SST deploys as a unit, in the framework names our classifier speaks. */
const SSR_COMPONENTS: Readonly<Record<string, string>> = {
  Nextjs: 'nextjs',
  Remix: 'remix',
  Astro: 'astro',
  Nuxt: 'nuxt',
  SvelteKit: 'sveltekit',
  SolidStart: 'solid-start',
  TanStackStart: 'tanstack-start'
};

type SstComponent = {
  component: string;
  name: string;
  /** The literal object body, as text, for shallow property reads. */
  body: string;
  file: string;
};

/**
 * Every `new sst.aws.X("Name", {...})` in the file, with a balanced-brace slice of its options.
 *
 * Text-level on purpose: the interesting properties are literals in practice, and anything computed
 * simply reads as absent rather than as a guess.
 */
export const readSstComponents = (contents: string, file = 'sst.config.ts'): SstComponent[] => {
  const components: SstComponent[] = [];
  const pattern = /new\s+sst\.aws\.(\w+)\s*\(\s*["'`]([^"'`]+)["'`]\s*(?:,\s*\{)?/g;
  for (const match of contents.matchAll(pattern)) {
    let body = '';
    if (match[0]!.endsWith('{')) {
      const openingBrace = (match.index ?? 0) + match[0]!.length - 1;
      body = sliceBalancedBraces(contents, openingBrace)?.body ?? '';
    }
    components.push({ component: match[1]!, name: match[2]!, body, file });
  }
  return components;
};

const MAX_SOURCE_FILES = 30;

const resolveLocalModule = (from: string, specifier: string, files: readonly string[]): string | undefined => {
  const base = posix.normalize(posix.join(posix.dirname(from), specifier));
  if (base === '..' || base.startsWith('../')) return undefined;
  const candidates = /\.[cm]?[jt]sx?$/.test(base)
    ? [base]
    : [
        base,
        ...['ts', 'tsx', 'js', 'mjs', 'cjs'].map((extension) => `${base}.${extension}`),
        `${base}/index.ts`,
        `${base}/index.js`
      ];
  return candidates.find((candidate) => files.includes(candidate));
};

/** Follow only literal, repository-local imports reachable from sst.config; never load or execute them. */
const readSstSourceGraph = async (
  context: ProbeContext,
  entrypoint: string
): Promise<Array<{ file: string; raw: string }>> => {
  const pending = [entrypoint];
  const seen = new Set<string>();
  const sources: Array<{ file: string; raw: string }> = [];
  while (pending.length > 0 && sources.length < MAX_SOURCE_FILES) {
    const file = pending.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    // oxlint-disable-next-line no-await-in-loop -- bounded local import graph, kept in source order.
    const raw = await readText(context, file, { fullFile: true });
    if (raw === undefined) continue;
    sources.push({ file, raw });
    for (const match of raw.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)["'`]([^"'`]+)["'`]/g)) {
      const specifier = match[1]!;
      if (!specifier.startsWith('.')) continue;
      const resolved = resolveLocalModule(file, specifier, context.files);
      if (resolved !== undefined && !seen.has(resolved)) pending.push(resolved);
    }
  }
  return sources;
};

const stringProperty = (body: string, key: string): string | undefined =>
  new RegExp(`\\b${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`).exec(body)?.[1];

const entrypointForHandler = (handler: string, files: readonly string[]): string | undefined => {
  const modulePath = handler.slice(0, handler.lastIndexOf('.')) || handler;
  return ['ts', 'js', 'mjs', 'cjs', 'py']
    .map((extension) => `${modulePath}.${extension}`)
    .find((candidate) => files.includes(candidate));
};

/** The component names a `link: [db, bucket]` array references, matched back to variable bindings. */
const linkedNames = (body: string, bindings: ReadonlyMap<string, string>): string[] => {
  const list = /\blink\s*:\s*\[([^\]]*)\]/.exec(body)?.[1];
  if (list === undefined) return [];
  return list
    .split(',')
    .map((entry) => entry.trim())
    .map((variable) => bindings.get(variable))
    .filter((name): name is string => name !== undefined);
};

const factName = (value: string): string => {
  const safe = value
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^(.)/, (character) => character.toLowerCase());
  return safe.length === 0 ? 'resource' : safe;
};

export const sstProbe: Probe = {
  name: 'sst',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const file = CONFIG_FILES.find((candidate) => context.files.includes(candidate));
    if (file === undefined) return {};
    const sources = await readSstSourceGraph(context, file);
    const components = sources.flatMap(({ file: sourceFile, raw }) => readSstComponents(raw, sourceFile));
    if (components.length === 0) return {};

    /** `const db = new sst.aws.Postgres("Database")` — variable → the component it holds. */
    const bindings = new Map<string, string>();
    for (const component of components) {
      const raw = sources.find((source) => source.file === component.file)?.raw ?? '';
      const binding = new RegExp(
        `(?:const|let|var)\\s+(\\w+)\\s*=\\s*new\\s+sst\\.aws\\.${component.component}\\s*\\(\\s*["'\`]${component.name}["'\`]`
      ).exec(raw)?.[1];
      if (binding !== undefined) bindings.set(binding, component.name);
    }

    const dependencies: DependencyFact[] = [];
    const services: ServiceFactInput[] = [];
    /** SST component name → the dependency fact name it was assigned, for `link:` resolution. */
    const assignedNames = new Map<string, string>();

    for (const component of components) {
      const raw = sources.find((source) => source.file === component.file)?.raw ?? '';
      const citation = citeFirstMatchOnly(
        component.file,
        raw,
        new RegExp(`sst\\.aws\\.${component.component}\\s*\\(\\s*["'\`]${component.name}`)
      );
      const evidence = citation === undefined ? [] : [citation];

      const kind = DEPENDENCY_COMPONENTS[component.component];
      if (kind !== undefined) {
        const instance = stringProperty(component.body, 'instance');
        const assigned = dependencies.some((entry) => entry.kind === kind)
          ? factName(component.name)
          : defaultDependencyName(kind);
        assignedNames.set(component.name, assigned);
        dependencies.push({
          name: assigned,
          kind,
          extensions: [],
          consumedBy: [],
          addressedBy: [],
          ...(stringProperty(component.body, 'version') === undefined
            ? {}
            : { engineVersion: stringProperty(component.body, 'version') }),
          ...(instance === undefined ? {} : { sizeHint: { instance } }),
          // Declared in a deployed SST app means managed and running there today.
          hostingEvidence: 'deployment-manifest',
          evidence,
          source: 'probe'
        });
        continue;
      }

      const framework = SSR_COMPONENTS[component.component];
      if (framework !== undefined) {
        const path = stringProperty(component.body, 'path') ?? '.';
        services.push({
          name: factName(component.name),
          path,
          language: 'javascript',
          framework,
          exposesHttp: true,
          executionModel: 'long-running',
          environmentVariables: [],
          evidence,
          source: 'probe'
        });
        continue;
      }

      if (component.component === 'Function') {
        const handler = stringProperty(component.body, 'handler');
        if (handler === undefined) continue;
        const entrypoint = entrypointForHandler(handler, context.files);
        if (entrypoint === undefined) continue;
        services.push({
          name: factName(component.name),
          path: '.',
          processType: `sst:${component.name}`,
          language: entrypoint.endsWith('.ts') ? 'typescript' : 'javascript',
          exposesHttp: false,
          executionModel: 'per-request',
          functionEntrypoint: entrypoint,
          // `url: true` is SST's function URL — the whole function over HTTP, so the catch-all
          // route in the gateway's own vocabulary: any method, greedy path.
          functionTriggers: /\burl\s*:\s*true\b/.test(component.body)
            ? [{ type: 'http', method: '*', path: '/{proxy+}' }]
            : [],
          environmentVariables: [],
          evidence,
          source: 'probe'
        });
        continue;
      }

      if (component.component === 'Cron') {
        const schedule = stringProperty(component.body, 'schedule');
        const handler = stringProperty(component.body, 'job') ?? stringProperty(component.body, 'handler');
        const entrypoint = handler === undefined ? undefined : entrypointForHandler(handler, context.files);
        if (schedule === undefined || entrypoint === undefined) continue;
        services.push({
          name: factName(component.name),
          path: '.',
          processType: `sst:cron:${component.name}`,
          language: entrypoint.endsWith('.py') ? 'python' : entrypoint.endsWith('.ts') ? 'typescript' : 'javascript',
          exposesHttp: false,
          executionModel: 'per-request',
          functionEntrypoint: entrypoint,
          functionTriggers: [{ type: 'schedule', rate: schedule }],
          environmentVariables: [],
          evidence,
          source: 'probe'
        });
      }
    }

    // `link:` is SST's own consumption statement — the sharpest wiring evidence there is.
    for (const component of components) {
      if (DEPENDENCY_COMPONENTS[component.component] !== undefined) continue;
      const consumer = factName(component.name);
      for (const linkedComponent of linkedNames(component.body, bindings)) {
        const assigned = assignedNames.get(linkedComponent);
        const dependency = assigned === undefined ? undefined : dependencies.find((entry) => entry.name === assigned);
        if (dependency !== undefined && !dependency.consumedBy.includes(consumer)) {
          dependency.consumedBy.push(consumer);
        }
      }
    }

    const addDeclaredFunction = ({
      name,
      entrypoint,
      trigger,
      evidence
    }: {
      name: string;
      entrypoint: string;
      trigger: NonNullable<ServiceFactInput['functionTriggers']>[number];
      evidence: ServiceFactInput['evidence'];
    }): ServiceFactInput => {
      const existing = services.find((service) => service.functionEntrypoint === entrypoint);
      if (existing !== undefined) {
        existing.functionTriggers = [
          ...new Map(
            [...(existing.functionTriggers ?? []), trigger].map((entry) => [JSON.stringify(entry), entry])
          ).values()
        ];
        return existing;
      }
      const service: ServiceFactInput = {
        name: factName(name),
        path: '.',
        processType: `sst:handler:${entrypoint}`,
        language: entrypoint.endsWith('.py') ? 'python' : entrypoint.endsWith('.ts') ? 'typescript' : 'javascript',
        exposesHttp: false,
        executionModel: 'per-request',
        functionEntrypoint: entrypoint,
        functionTriggers: [trigger],
        environmentVariables: [],
        evidence,
        source: 'probe'
      };
      services.push(service);
      return service;
    };

    // SST Ion APIs declare routes after construction: `api.route("GET /", "src/api.handler")`.
    // The constructor alone says no function exists, so routes are the actual service declarations.
    for (const component of components.filter((entry) => ['ApiGatewayV1', 'ApiGatewayV2'].includes(entry.component))) {
      const raw = sources.find((source) => source.file === component.file)?.raw ?? '';
      const variable = [...bindings.entries()].find(([, name]) => name === component.name)?.[0];
      if (variable === undefined) continue;
      const routePattern = new RegExp(
        `${variable}\\.route\\(\\s*["'\`]([^"'\`]+)["'\`]\\s*,\\s*["'\`]([^"'\`]+)["'\`]`,
        'g'
      );
      for (const route of raw.matchAll(routePattern)) {
        const declaration = route[1]!;
        const handler = route[2]!;
        const entrypoint = entrypointForHandler(handler, context.files);
        if (entrypoint === undefined) continue;
        const routeParts = /^(ANY|[A-Za-z]+)\s+(\/.*)$/.exec(declaration);
        const trigger =
          declaration === '$default'
            ? { type: 'http' as const, method: '*', path: '/{proxy+}' }
            : routeParts === null
              ? undefined
              : {
                  type: 'http' as const,
                  method: routeParts[1]!.toUpperCase() === 'ANY' ? '*' : routeParts[1]!.toUpperCase(),
                  path: routeParts[2]!
                };
        if (trigger === undefined) continue;
        const citation = citeFirstMatchOnly(
          component.file,
          raw,
          new RegExp(`${variable}\\.route\\(\\s*["'\`]${declaration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
          'functionTriggers'
        );
        addDeclaredFunction({
          name: `${component.name}-${posix.basename(entrypoint).replace(/\.[^.]+$/, '')}`,
          entrypoint,
          trigger,
          evidence: citation === undefined ? [] : [citation]
        });
      }
    }

    // Queue/topic subscriptions are event-source declarations, not merely links.
    for (const component of components.filter(
      (entry) => entry.component === 'Queue' || entry.component === 'SnsTopic'
    )) {
      const raw = sources.find((source) => source.file === component.file)?.raw ?? '';
      const variable = [...bindings.entries()].find(([, name]) => name === component.name)?.[0];
      const dependencyName = assignedNames.get(component.name);
      if (variable === undefined || dependencyName === undefined) continue;
      const subscriptionPattern = new RegExp(`${variable}\\.subscribe\\(\\s*["'\`]([^"'\`]+)["'\`]`, 'g');
      for (const subscription of raw.matchAll(subscriptionPattern)) {
        const entrypoint = entrypointForHandler(subscription[1]!, context.files);
        if (entrypoint === undefined) continue;
        const citation = citeFirstMatchOnly(
          component.file,
          raw,
          new RegExp(`${variable}\\.subscribe\\(`),
          'functionTriggers'
        );
        const service = addDeclaredFunction({
          name: `${component.name}-subscriber`,
          entrypoint,
          trigger:
            component.component === 'Queue' ? { type: 'queue', dependencyName } : { type: 'topic', dependencyName },
          evidence: citation === undefined ? [] : [citation]
        });
        const dependency = dependencies.find((entry) => entry.name === dependencyName);
        if (dependency !== undefined && !dependency.consumedBy.includes(service.name)) {
          dependency.consumedBy.push(service.name);
        }
      }
    }

    return {
      ...(services.length === 0 ? {} : { services }),
      ...(dependencies.length === 0 ? {} : { dependencies })
    };
  }
};
