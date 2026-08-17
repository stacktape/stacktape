/**
 * High-level concepts from AWS CDK code — extraction, never execution.
 *
 * CDK stacks are programs, and `cdk synth` runs them, which is consent the scan does not have. But
 * the construct idiom is textually regular — `new rds.DatabaseInstance(this, "Database", {...})` —
 * and the `(this, "Name", ...)` scope-and-id signature is distinctive enough to read the concepts
 * straight off the source: what backing services exist, what they are sized as, which Lambda entry
 * files exist and what invokes them. Not a 1:1 translation, and not trying to be: CDK's full
 * semantics belong to the adopt mission and to `cdk synth` run by the user.
 *
 * Gated on `cdk.json` — the unambiguous CDK marker — and on each file actually importing
 * `aws-cdk-lib`, so `new Queue(...)` in ordinary application code never reads as infrastructure.
 * Stateful constructs carry declaration evidence for UX and provenance. A declaration is not
 * proof that a stack was ever deployed, so it must not trigger a live-resource replacement choice.
 *
 * Deliberately partial, stated once: TypeScript/JavaScript stacks only (Python/Java CDK stays
 * recognition-only); schedules, container constructs and multi-file wiring are not followed;
 * computed values read as absent, never as guesses.
 */

import { posix } from 'node:path';
import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import type { EnvironmentVariableUse, FunctionTrigger, ServiceFactInput } from '../../facts/service';
import { sliceBalancedBraces } from '../balanced-slice';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { declaredEnvironmentVariable } from './declared-environment';

/** How many stack files one repository may reasonably ask the scan to read. */
const MAX_FILES_READ = 30;

/** Construct class names this importer understands. Ambiguous ones also require a qualifier. */
const CONSTRUCT_PATTERN =
  /new\s+(?:([\w$]+)\.)?(DatabaseInstance|DatabaseCluster|ServerlessCluster|CfnCacheCluster|CfnReplicationGroup|Queue|Topic|Bucket|Table|TableV2|Domain|NodejsFunction|PythonFunction|Function|LambdaRestApi|RestApi)\s*\(\s*(?:this|scope|stack|[\w$]+)\s*,\s*["'`]([^"'`]+)["'`]\s*(?:,\s*\{)?/g;

type CdkConstruct = {
  qualifier: string | undefined;
  construct: string;
  name: string;
  /** Balanced-brace slice of the props object, as text, for shallow literal reads. */
  body: string;
  file: string;
};

export const readCdkConstructs = (file: string, contents: string): CdkConstruct[] => {
  const constructs: CdkConstruct[] = [];
  CONSTRUCT_PATTERN.lastIndex = 0;
  for (const match of contents.matchAll(CONSTRUCT_PATTERN)) {
    let body = '';
    if (match[0]!.endsWith('{')) {
      const openingBrace = (match.index ?? 0) + match[0]!.length - 1;
      body = sliceBalancedBraces(contents, openingBrace)?.body ?? '';
    }
    constructs.push({ qualifier: match[1], construct: match[2]!, name: match[3]!, body, file });
  }
  return constructs;
};

const objectBindingsOf = (contents: string): ReadonlyMap<string, string> => {
  const bindings = new Map<string, string>();
  for (const match of contents.matchAll(/(?:const|let|var)\s+([\w$]+)(?:\s*:\s*[^=]+)?\s*=\s*\{/g)) {
    const openingBrace = (match.index ?? 0) + match[0]!.length - 1;
    const body = sliceBalancedBraces(contents, openingBrace)?.body;
    if (body !== undefined) bindings.set(match[1]!, body);
  }
  return bindings;
};

const expandObjectSpreads = (body: string, bindings: ReadonlyMap<string, string>): string => {
  const expanded = [...body.matchAll(/\.\.\.([\w$]+)/g)]
    .map((match) => bindings.get(match[1]!))
    .filter((value): value is string => value !== undefined);
  return expanded.length === 0 ? body : `${body},${expanded.join(',')}`;
};

/** Whether an otherwise ambiguous construct name came from a specific CDK package. */
const importsNamedConstruct = (contents: string, construct: string, packageSuffix: string): boolean =>
  new RegExp(`import\\s*\\{[^}]*\\b${construct}\\b[^}]*\\}\\s*from\\s*["'\`]aws-cdk-lib/${packageSuffix}["'\`]`).test(
    contents
  );

/** `InstanceClass.T4G` + `InstanceSize.SMALL` → `t4g.small`; `new ec2.InstanceType('t3.small')` as-is. */
const instanceTypeOf = (body: string): string | undefined => {
  const literal = /InstanceType\s*\(\s*["'`]([a-z0-9]+\.[a-z0-9]+)["'`]/.exec(body)?.[1];
  if (literal !== undefined) return literal;
  const instanceClass = /InstanceClass\.([A-Z0-9_]+)/.exec(body)?.[1];
  const instanceSize = /InstanceSize\.([A-Z0-9_]+)/.exec(body)?.[1];
  if (instanceClass === undefined || instanceSize === undefined) return undefined;
  return `${instanceClass.toLowerCase().replace(/_/g, '')}.${instanceSize.toLowerCase()}`;
};

/** `PostgresEngineVersion.VER_16_3` → `16.3`; `VER_16` → `16`. */
const engineVersionOf = (body: string): string | undefined => {
  const match = /EngineVersion\.VER_(\d+)(?:_(\d+))?/.exec(body);
  if (match === null) return undefined;
  return match[2] === undefined ? match[1]! : `${match[1]}.${match[2]}`;
};

const databaseKindOf = (body: string): DependencyKind => {
  if (/mysql|maria/i.test(body)) return 'mysql';
  if (/sqlserver|sql_server/i.test(body)) return 'mssql';
  return 'postgres';
};

const factName = (value: string): string => {
  const safe = value
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^(.)/, (character) => character.toLowerCase());
  return safe.length === 0 ? 'resource' : safe;
};

const stringProperty = (body: string, key: string): string | undefined =>
  new RegExp(`\\b${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`).exec(body)?.[1];

/** Resolve a Lambda entry declaration to a real source file, or nothing. */
const functionEntrypointOf = (construct: CdkConstruct, files: readonly string[]): string | undefined => {
  // NodejsFunction / PythonFunction name their entry file directly.
  const entry = stringProperty(construct.body, 'entry');
  if (entry !== undefined) {
    const normalized = entry.replace(/^\.\//, '');
    if (files.includes(normalized)) return normalized;
    if (construct.construct === 'PythonFunction') {
      const index = stringProperty(construct.body, 'index') ?? 'index.py';
      const candidate = posix.join(normalized, index);
      if (files.includes(candidate)) return candidate;
    }
  }
  // The canonical CDK examples use `path.join(__dirname, "../src/api.ts")`. It is computed JS,
  // but this one operation is deterministic from the file we are already reading and never runs
  // project code.
  const joinedEntry = /\bentry\s*:\s*(?:(?:path\.)?(?:join|resolve))\(\s*__dirname\s*,([^)]*)\)/.exec(
    construct.body
  )?.[1];
  if (joinedEntry !== undefined) {
    const pathSegments = [...joinedEntry.matchAll(/["'`]([^"'`]+)["'`]/g)].map((match) => match[1]!);
    const unexplained = joinedEntry.replace(/["'`][^"'`]+["'`]/g, '').replace(/[\s,]/g, '');
    const candidate = posix.normalize(posix.join(posix.dirname(construct.file), ...pathSegments));
    if (pathSegments.length > 0 && unexplained === '' && !candidate.startsWith('../') && files.includes(candidate)) {
      return candidate;
    }
  }
  // lambda.Function: an asset directory plus `handler: "index.handler"`.
  const asset = /fromAsset\s*\(\s*["'`]([^"'`]+)["'`]/
    .exec(construct.body)?.[1]
    ?.replace(/^\.\//, '')
    .replace(/\/$/, '');
  const handler = stringProperty(construct.body, 'handler');
  if (asset === undefined || handler === undefined) return undefined;
  const modulePath = handler.slice(0, handler.lastIndexOf('.')) || handler;
  return ['ts', 'js', 'mjs', 'cjs', 'py']
    .map((extension) => `${asset}/${modulePath}.${extension}`)
    .find((candidate) => files.includes(candidate));
};

const environmentVariablesOf = ({
  construct,
  bindings,
  assignedNames,
  evidence
}: {
  construct: CdkConstruct;
  bindings: ReadonlyMap<string, string>;
  assignedNames: ReadonlyMap<string, string>;
  evidence: ServiceFactInput['evidence'];
}): EnvironmentVariableUse[] => {
  const start = /\benvironment\s*:\s*\{/.exec(construct.body);
  if (start === null || start.index === undefined) return [];
  const opening = start.index + start[0].length - 1;
  const body = sliceBalancedBraces(construct.body, opening)?.body;
  if (body === undefined) return [];

  const variables: EnvironmentVariableUse[] = [];
  for (const match of body.matchAll(/(?:^|,)\s*["'`]?([A-Za-z_][A-Za-z0-9_]*)["'`]?\s*:\s*([\w$]+)?/g)) {
    const name = match[1]!;
    const dependencyId = match[2] === undefined ? undefined : bindings.get(match[2]);
    const dependencyName = dependencyId === undefined ? undefined : assignedNames.get(dependencyId);
    variables.push(declaredEnvironmentVariable({ name, dependencyName, evidence }));
  }
  return variables;
};

export const cdkProbe: Probe = {
  name: 'cdk',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    // The unambiguous marker. Without it, a `new Queue(this, ...)` is somebody's own class.
    if (!context.files.includes('cdk.json')) return {};

    // Stack code lives shallow by convention: bin/ and lib/ above all. Content-gated below anyway.
    const candidates = context.files
      .filter((file) => /\.(?:ts|js|mjs|cjs)$/.test(file) && !file.endsWith('.d.ts'))
      .filter((file) => file.split('/').length <= 3)
      .slice(0, MAX_FILES_READ * 2);

    const constructs: CdkConstruct[] = [];
    /** Variable bindings across all stack files: variable → construct id it holds. */
    const bindings = new Map<string, string>();
    const rawByFile = new Map<string, string>();

    let filesRead = 0;
    for (const file of candidates) {
      if (filesRead >= MAX_FILES_READ) break;
      // oxlint-disable-next-line no-await-in-loop -- bounded by MAX_FILES_READ, order is identity.
      const raw = await readText(context, file, { fullFile: true });
      if (raw === undefined || !raw.includes('aws-cdk-lib')) continue;
      filesRead += 1;
      rawByFile.set(file, raw);
      const objectBindings = objectBindingsOf(raw);

      for (const parsedConstruct of readCdkConstructs(file, raw)) {
        const construct = {
          ...parsedConstruct,
          body: expandObjectSpreads(parsedConstruct.body, objectBindings)
        };
        // The generic names are trusted only with a telling qualifier.
        if (
          construct.construct === 'Function' &&
          !/lambda/i.test(construct.qualifier ?? '') &&
          !importsNamedConstruct(raw, 'Function', 'aws-lambda')
        )
          continue;
        if (
          construct.construct === 'Domain' &&
          !/search/i.test(construct.qualifier ?? '') &&
          !importsNamedConstruct(raw, 'Domain', '(?:aws-opensearchservice|aws-elasticsearch)')
        )
          continue;
        if (
          construct.construct === 'Table' &&
          !/dynamo/i.test(construct.qualifier ?? '') &&
          !importsNamedConstruct(raw, 'Table', 'aws-dynamodb')
        )
          continue;
        constructs.push(construct);

        const binding = new RegExp(
          `(?:const|let|var)\\s+([\\w$]+)\\s*=\\s*new\\s+(?:[\\w$]+\\.)?${construct.construct}\\s*\\(\\s*(?:this|scope|stack|[\\w$]+)\\s*,\\s*["'\`]${construct.name}["'\`]`
        ).exec(raw)?.[1];
        if (binding !== undefined) bindings.set(binding, construct.name);
      }
    }
    if (constructs.length === 0) return {};

    const dependencies: DependencyFact[] = [];
    const services: ServiceFactInput[] = [];
    const functionServices = new Map<string, ServiceFactInput>();
    /** Construct id → assigned dependency fact name, for event-source wiring. */
    const assignedNames = new Map<string, string>();
    const seen = new Set<string>();

    const addDependency = (construct: CdkConstruct, kind: DependencyKind, extra: Partial<DependencyFact>): void => {
      const key = `${kind}:${construct.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      const assigned = dependencies.some((entry) => entry.kind === kind)
        ? factName(construct.name)
        : defaultDependencyName(kind);
      assignedNames.set(construct.name, assigned);
      const raw = rawByFile.get(construct.file) ?? '';
      const citation = citeFirstMatchOnly(
        construct.file,
        raw,
        new RegExp(`new\\s+(?:[\\w$]+\\.)?${construct.construct}\\s*\\(`)
      );
      dependencies.push({
        name: assigned,
        kind,
        extensions: [],
        consumedBy: [],
        addressedBy: [],
        // A CDK declaration is useful provenance, but not evidence that the stack was deployed.
        hostingEvidence: 'deployment-manifest',
        evidence: citation === undefined ? [] : [citation],
        source: 'probe',
        ...extra
      });
    };

    for (const construct of constructs) {
      switch (construct.construct) {
        case 'DatabaseInstance':
        case 'DatabaseCluster':
        case 'ServerlessCluster': {
          const instance = instanceTypeOf(construct.body);
          const storage = Number.parseInt(/allocatedStorage\s*:\s*(\d+)/.exec(construct.body)?.[1] ?? '', 10);
          addDependency(construct, databaseKindOf(construct.body), {
            ...(engineVersionOf(construct.body) === undefined
              ? {}
              : { engineVersion: engineVersionOf(construct.body) }),
            ...(instance !== undefined || (Number.isInteger(storage) && storage > 0)
              ? {
                  sizeHint: {
                    ...(instance === undefined ? {} : { instance: `db.${instance}` }),
                    ...(Number.isInteger(storage) && storage > 0 ? { storageGb: storage } : {})
                  }
                }
              : {})
          });
          break;
        }
        case 'CfnCacheCluster':
        case 'CfnReplicationGroup': {
          if (/memcached/i.test(construct.body)) break;
          const nodeType = stringProperty(construct.body, 'cacheNodeType');
          addDependency(construct, 'redis', nodeType === undefined ? {} : { sizeHint: { instance: nodeType } });
          break;
        }
        case 'Queue':
          addDependency(construct, 'queue', {});
          break;
        case 'Topic':
          addDependency(construct, 'topic', {});
          break;
        case 'Bucket':
          addDependency(construct, 'object-storage', {});
          break;
        case 'Table':
        case 'TableV2':
          addDependency(construct, 'dynamodb', {});
          break;
        case 'Domain':
          addDependency(construct, 'search', {});
          break;
        default:
          break;
      }
    }

    for (const construct of constructs) {
      if (!['NodejsFunction', 'PythonFunction', 'Function'].includes(construct.construct)) continue;
      const entrypoint = functionEntrypointOf(construct, context.files);
      if (entrypoint === undefined) continue;

      const raw = rawByFile.get(construct.file) ?? '';
      const triggers: FunctionTrigger[] = [];

      // `new LambdaRestApi(this, "Api", { handler: fn })` — the whole API proxied to one function.
      const variable = [...bindings.entries()].find(([, id]) => id === construct.name)?.[0];
      if (variable !== undefined) {
        if (new RegExp(`LambdaRestApi\\s*\\([^)]*handler\\s*:\\s*${variable}\\b`, 's').test(raw)) {
          // LambdaRestApi is proxy-everything by definition: any method, greedy path.
          triggers.push({ type: 'http', method: '*', path: '/{proxy+}' });
        }
        // `fn.addEventSource(new SqsEventSource(queue))` — the dependency names its consumer.
        for (const eventSource of raw.matchAll(
          new RegExp(
            `${variable}\\.addEventSource\\(\\s*new\\s+(?:[\\w$]+\\.)?(SqsEventSource|SnsEventSource|S3EventSource)\\(\\s*([\\w$]+)`,
            'g'
          )
        )) {
          const dependencyId = bindings.get(eventSource[2]!);
          const dependencyName = dependencyId === undefined ? undefined : assignedNames.get(dependencyId);
          if (dependencyName === undefined) continue;
          triggers.push(
            eventSource[1] === 'SqsEventSource'
              ? { type: 'queue', dependencyName }
              : eventSource[1] === 'SnsEventSource'
                ? { type: 'topic', dependencyName }
                : { type: 'object-storage', dependencyName }
          );
        }
      }

      const citation = citeFirstMatchOnly(
        construct.file,
        raw,
        new RegExp(`new\\s+(?:[\\w$]+\\.)?${construct.construct}\\s*\\(`),
        'functionEntrypoint'
      );
      const environmentVariables = environmentVariablesOf({
        construct,
        bindings,
        assignedNames,
        evidence: citation === undefined ? [] : [citation]
      });
      const service: ServiceFactInput = {
        name: factName(construct.name),
        path: '.',
        processType: `cdk:${construct.name}`,
        language: entrypoint.endsWith('.py') ? 'python' : entrypoint.endsWith('.ts') ? 'typescript' : 'javascript',
        exposesHttp: false,
        executionModel: 'per-request',
        functionEntrypoint: entrypoint,
        functionTriggers: triggers,
        environmentVariables,
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      };
      services.push(service);
      if (variable !== undefined) functionServices.set(variable, service);

      for (const dependencyName of new Set([
        ...triggers.flatMap((trigger) => ('dependencyName' in trigger ? [trigger.dependencyName] : [])),
        ...environmentVariables.flatMap((environmentVariable) => environmentVariable.dependencyName ?? [])
      ])) {
        const dependency = dependencies.find((entry) => entry.name === dependencyName);
        if (dependency === undefined) continue;
        if (!dependency.consumedBy.includes(service.name)) dependency.consumedBy.push(service.name);
        for (const environmentVariable of environmentVariables.filter(
          (entry) => entry.dependencyName === dependencyName
        )) {
          if (!dependency.addressedBy.includes(environmentVariable.name)) {
            dependency.addressedBy.push(environmentVariable.name);
          }
        }
      }
    }

    // API Gateway v2's common integration form:
    // `const integration = new HttpLambdaIntegration("Orders", fn); api.addRoutes({...})`.
    for (const raw of rawByFile.values()) {
      const integrations = new Map<string, string>();
      for (const match of raw.matchAll(
        /(?:const|let|var)\s+([\w$]+)\s*=\s*new\s+(?:[\w$]+\.)?HttpLambdaIntegration\s*\(\s*["'`][^"'`]+["'`]\s*,\s*([\w$]+)/g
      )) {
        integrations.set(match[1]!, match[2]!);
      }
      for (const match of raw.matchAll(/[\w$]+\.addRoutes\s*\(\s*\{/g)) {
        const opening = (match.index ?? 0) + match[0]!.length - 1;
        const body = sliceBalancedBraces(raw, opening)?.body;
        if (body === undefined) continue;
        const integration =
          /\bintegration\s*:\s*([\w$]+)/.exec(body)?.[1] ?? (/\bintegration\b/.test(body) ? 'integration' : undefined);
        const path = stringProperty(body, 'path');
        const functionVariable = integration === undefined ? undefined : integrations.get(integration);
        const service = functionVariable === undefined ? undefined : functionServices.get(functionVariable);
        if (path === undefined || service === undefined) continue;
        const methods = [...body.matchAll(/HttpMethod\.([A-Z]+)/g)].map((entry) => entry[1]!);
        const declaredMethods = methods.length === 0 ? ['*'] : methods;
        service.functionTriggers = [
          ...(service.functionTriggers ?? []),
          ...declaredMethods.map((method) => ({ type: 'http' as const, method: method === 'ANY' ? '*' : method, path }))
        ];
      }

      // API Gateway v1's explicit form: LambdaIntegration variables are attached to a resource
      // tree with addMethod. Keeping the tiny resource-path graph is enough to recover exact CRUD
      // routes without executing the CDK program.
      const lambdaIntegrations = new Map<string, string>();
      for (const match of raw.matchAll(
        /(?:const|let|var)\s+([\w$]+)\s*=\s*new\s+(?:[\w$]+\.)?LambdaIntegration\s*\(\s*([\w$]+)/g
      )) {
        lambdaIntegrations.set(match[1]!, match[2]!);
      }
      const resourcePaths = new Map<string, string>();
      for (const match of raw.matchAll(
        /(?:const|let|var)\s+([\w$]+)\s*=\s*([\w$]+(?:\.root)?)\.addResource\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g
      )) {
        const parent = match[2]!;
        const parentPath = parent.endsWith('.root') ? '' : resourcePaths.get(parent);
        if (parentPath === undefined) continue;
        resourcePaths.set(match[1]!, `${parentPath}/${match[3]!}`);
      }
      for (const match of raw.matchAll(/([\w$]+(?:\.root)?)\.addMethod\s*\(\s*["'`]([A-Za-z]+)["'`]\s*,\s*([\w$]+)/g)) {
        const path = match[1]!.endsWith('.root') ? '/' : resourcePaths.get(match[1]!);
        const functionVariable = lambdaIntegrations.get(match[3]!);
        const service = functionVariable === undefined ? undefined : functionServices.get(functionVariable);
        if (path === undefined || service === undefined) continue;
        const trigger = { type: 'http' as const, method: match[2]!.toUpperCase(), path };
        service.functionTriggers = [
          ...new Map(
            [...(service.functionTriggers ?? []), trigger].map((entry) => [JSON.stringify(entry), entry])
          ).values()
        ];
      }
    }

    return {
      ...(services.length === 0 ? {} : { services }),
      ...(dependencies.length === 0 ? {} : { dependencies })
    };
  }
};
