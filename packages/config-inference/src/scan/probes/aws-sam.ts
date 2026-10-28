/** Facts declared by an AWS SAM template. */

import { posix } from 'node:path';
import type { DependencyFact, DependencyKind } from '../../facts/dependency';
import type { EnvironmentVariableUse, FunctionTrigger, ServiceFactInput } from '../../facts/service';
import { parseCloudFormationYaml } from '../cloudformation-yaml';
import { citeFirstMatchOnly, citeLine, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { declaredEnvironmentVariable } from './declared-environment';
import {
  declaredHandlerExport,
  declaredQueueSettings,
  declaredSizing,
  resolveDeclaredValue,
  UNRESOLVED,
  type TemplateScope
} from './declared-function';

type RecordValue = Record<string, unknown>;
type SamResource = { Type?: unknown; Properties?: RecordValue };

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const resourceTypeToKind: Readonly<Record<string, DependencyKind>> = {
  'AWS::DynamoDB::Table': 'dynamodb',
  'AWS::SQS::Queue': 'queue',
  'AWS::SNS::Topic': 'topic',
  'AWS::S3::Bucket': 'object-storage'
};

const lowerFirst = (value: string): string => value.slice(0, 1).toLowerCase() + value.slice(1);
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalize = (value: string): string => value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
const blockFor = (raw: string, logicalId: string): { lines: string[]; start: number; end: number } | undefined => {
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^  ${escapeRegExp(logicalId)}:\\s*$`).test(line));
  if (start === -1) return undefined;
  const next = lines.findIndex((line, index) => index > start && /^  [A-Za-z0-9][A-Za-z0-9_-]*:\s*$/.test(line));
  return { lines, start, end: next === -1 ? lines.length : next };
};

const citeInBlock = (file: string, raw: string, logicalId: string, pattern: RegExp, field?: string) => {
  const block = blockFor(raw, logicalId);
  if (block === undefined) return undefined;
  const relative = block.lines.slice(block.start, block.end).findIndex((line) => pattern.test(line));
  return relative === -1 ? undefined : citeLine(file, block.lines, block.start + relative, field);
};

const languageFor = (path: string): string => {
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) return 'javascript';
  if (path.endsWith('.go')) return 'go';
  if (path.endsWith('.rb')) return 'ruby';
  if (path.endsWith('.java')) return 'java';
  if (path.endsWith('.rs')) return 'rust';
  if (path.endsWith('.cs')) return 'dotnet';
  return 'unknown';
};

const entrypointFor = (
  files: readonly string[],
  templateDirectory: string,
  codeUriValue: unknown,
  handlerValue: unknown,
  runtimeValue: unknown
): string | undefined => {
  if (typeof handlerValue !== 'string') return undefined;
  const declaredCodeUri = normalize(typeof codeUriValue === 'string' ? codeUriValue : '.');
  const codeUri = normalize(
    templateDirectory === '.' ? declaredCodeUri : posix.join(templateDirectory, declaredCodeUri)
  );
  const handlerSeparator = handlerValue.lastIndexOf('.');
  const modulePath = normalize(handlerSeparator > 0 ? handlerValue.slice(0, handlerSeparator) : handlerValue);
  const runtime = typeof runtimeValue === 'string' ? runtimeValue : '';
  if (runtime.startsWith('dotnet')) {
    // `Assembly::Namespace.Class::Method`: the class file carries the handler.
    const typeName = handlerValue.split('::')[1]?.trim();
    const className = typeName?.split('.').at(-1);
    if (className === undefined || className === '') return undefined;
    const matches = files.filter((file) => file === `${codeUri}/${className}.cs` || file.endsWith(`/${className}.cs`));
    const scoped = matches.filter((file) => file.startsWith(`${codeUri}/`) || codeUri === '.');
    return scoped.length === 1 ? scoped[0] : matches.length === 1 ? matches[0] : undefined;
  }
  if (runtime.startsWith('java') || handlerValue.includes('::')) {
    const className = handlerValue.split('::')[0]?.trim();
    if (className === undefined || className === '') return undefined;
    const classPath = `${className.replace(/\./g, '/')}.java`;
    const matches = files.filter(
      (file) => file.endsWith(`/src/main/java/${classPath}`) || file.endsWith(`/${classPath}`) || file === classPath
    );
    const scoped = matches.filter((file) => templateDirectory === '.' || file.startsWith(`${templateDirectory}/`));
    if (scoped.length === 1) return scoped[0];
    if (matches.length === 1) return matches[0];
    return undefined;
  }
  // A Rust function is a `bootstrap` binary built by cargo-lambda: the handler names no file, so the crate's own
  // binary target is the entry point (`src/main.rs`, or the single file under `src/bin`).
  if (handlerValue === 'bootstrap' && files.includes(normalize(posix.join(codeUri, 'Cargo.toml')))) {
    const mainFile = normalize(posix.join(codeUri, 'src/main.rs'));
    if (files.includes(mainFile)) return mainFile;
    const binaryPrefix = `${normalize(posix.join(codeUri, 'src/bin'))}/`;
    const binaries = files.filter(
      (file) => file.startsWith(binaryPrefix) && /^(?:[^/]+\.rs|[^/]+\/main\.rs)$/.test(file.slice(binaryPrefix.length))
    );
    return binaries.length === 1 ? binaries[0] : undefined;
  }
  const extensions = runtime.startsWith('python') ? ['py'] : ['ts', 'tsx', 'js', 'mjs', 'cjs', 'py', 'go', 'rb'];
  const baseCandidates = [
    posix.join(codeUri, modulePath),
    posix.join(codeUri, 'src', posix.basename(modulePath)),
    posix.join(codeUri.replace(/^dist(?=\/|$)/, 'src'), posix.basename(modulePath)),
    posix.join(codeUri, modulePath).replace(/(^|\/)dist\//, '$1src/')
  ].map(normalize);

  for (const base of baseCandidates) {
    for (const extension of extensions) {
      const candidate = `${base}.${extension}`;
      if (files.includes(candidate)) return candidate;
    }
  }

  const basename = posix.basename(modulePath).toLowerCase();
  const meaningfulSegments = codeUri
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.' && !['dist', 'build', 'out', 'src'].includes(segment));
  const matches = files.filter((file) => {
    const stem = posix
      .basename(file)
      .replace(/\.[^.]+$/, '')
      .toLowerCase();
    return stem === basename && extensions.some((extension) => file.endsWith(`.${extension}`));
  });
  const ranked = matches
    .map((file) => ({
      file,
      score: meaningfulSegments.filter((segment) => file.includes(`/${segment}/`) || file.startsWith(`${segment}/`))
        .length
    }))
    .toSorted((left, right) => right.score - left.score || left.file.localeCompare(right.file));
  return ranked.length === 1 || (ranked[0]?.score ?? 0) > (ranked[1]?.score ?? -1) ? ranked[0]?.file : undefined;
};

const referencedLogicalId = (value: unknown, known: ReadonlySet<string>): string | undefined => {
  if (typeof value === 'string') {
    const prefix = value.split('.')[0] ?? value;
    if (known.has(prefix)) return prefix;
    return [...known].find((logicalId) => value.includes(`\${${logicalId}}`));
  }
  if (!isRecord(value)) return undefined;
  const reference = value.Ref ?? value['Fn::GetAtt'] ?? value['Fn::Sub'];
  if (Array.isArray(reference)) return referencedLogicalId(reference[0], known);
  return referencedLogicalId(reference, known);
};

const environmentVariablesFor = ({
  file,
  raw,
  logicalId,
  globals,
  properties,
  dependencyNames
}: {
  file: string;
  raw: string;
  logicalId: string;
  globals: RecordValue;
  properties: RecordValue;
  dependencyNames: ReadonlyMap<string, string>;
}): EnvironmentVariableUse[] => {
  const globalEnvironment =
    isRecord(globals.Environment) && isRecord(globals.Environment.Variables) ? globals.Environment.Variables : {};
  const localEnvironment =
    isRecord(properties.Environment) && isRecord(properties.Environment.Variables)
      ? properties.Environment.Variables
      : {};
  const environment = { ...globalEnvironment, ...localEnvironment };
  const known = new Set(dependencyNames.keys());

  return Object.entries(environment).map(([name, value]) => {
    const referenced = referencedLogicalId(value, known);
    const dependencyName = referenced === undefined ? undefined : dependencyNames.get(referenced);
    const citation =
      citeInBlock(file, raw, logicalId, new RegExp(`^\\s*${escapeRegExp(name)}\\s*:`)) ??
      citeFirstMatchOnly(file, raw, new RegExp(`^\\s*${escapeRegExp(name)}\\s*:`));
    const evidence = citation === undefined ? [] : [{ ...citation, quote: `${name}:` }];
    return declaredEnvironmentVariable({
      name,
      dependencyName,
      evidence,
      value
    });
  });
};

/**
 * SAM's `Globals` rule: maps merge key by key with the resource's value winning, lists append, and any other value
 * replaces the global one. A resource `Auth` that sets one key therefore keeps the global `DefaultAuthorizer`.
 */
const mergeSamGlobals = (globalValue: unknown, localValue: unknown): unknown => {
  if (localValue === undefined) return globalValue;
  if (isRecord(globalValue) && isRecord(localValue)) {
    const merged: RecordValue = { ...globalValue };
    for (const [key, value] of Object.entries(localValue)) merged[key] = mergeSamGlobals(globalValue[key], value);
    return merged;
  }
  if (Array.isArray(globalValue) && Array.isArray(localValue)) return [...globalValue, ...localValue];
  return localValue;
};

/**
 * The authorization a SAM `Api`/`HttpApi` event inherits: its own `Auth`, else the `Auth` defaults of the API it names
 * through `RestApiId`/`ApiId`, else the `Globals` defaults for that API type.
 */
const routeProtection = (
  eventType: string,
  properties: RecordValue,
  resources: Readonly<Record<string, SamResource>>,
  globals: RecordValue
): 'aws-iam' | string | undefined => {
  const apiReference = eventType === 'Api' ? properties.RestApiId : properties.ApiId;
  // The template parser reads `!Ref Gateway` as the logical ID itself.
  const apiId =
    typeof apiReference === 'string'
      ? apiReference
      : isRecord(apiReference) && typeof apiReference.Ref === 'string'
        ? apiReference.Ref
        : undefined;
  const apiAuth = apiId === undefined ? undefined : resources[apiId]?.Properties?.Auth;
  const globalApi = globals[eventType];
  const globalAuth = isRecord(globalApi) ? globalApi.Auth : undefined;
  const auth = isRecord(properties.Auth) ? properties.Auth : {};
  // The implicit API of events without RestApiId/ApiId takes the Globals as they are.
  const mergedDefaults = mergeSamGlobals(globalAuth, apiAuth);
  const defaults = isRecord(mergedDefaults) ? mergedDefaults : {};
  if ((auth.ApiKeyRequired ?? defaults.ApiKeyRequired) === true) return 'an API key (ApiKeyRequired)';
  const authorizer = auth.Authorizer ?? defaults.DefaultAuthorizer;
  if (authorizer === undefined || authorizer === 'NONE') return undefined;
  if (authorizer === 'AWS_IAM') return 'aws-iam';
  return typeof authorizer === 'string' ? `the ${JSON.stringify(authorizer)} authorizer` : 'an authorizer';
};

/** `Enabled: false` or `State: DISABLED`; anything that is not literally on counts as off. */
const isDisabled = (properties: RecordValue): boolean =>
  (properties.Enabled !== undefined && properties.Enabled !== true && properties.Enabled !== 'true') ||
  (properties.State !== undefined && properties.State !== 'ENABLED');

/**
 * The `Filter.S3Key.Rules` of an S3 event as a prefix and a suffix, or `UNRESOLVED` when a filter is declared that
 * init cannot read: subscribing without it would deliver every object.
 */
const keyFilter = (
  filter: unknown,
  scope: TemplateScope
): { keyPrefix?: string; keySuffix?: string } | typeof UNRESOLVED => {
  if (filter === undefined) return {};
  const resolved = resolveDeclaredValue(filter, scope);
  if (resolved === UNRESOLVED || !isRecord(resolved) || !isRecord(resolved.S3Key)) return UNRESOLVED;
  const rules = resolved.S3Key.Rules;
  if (!Array.isArray(rules)) return UNRESOLVED;
  const values: { keyPrefix?: string; keySuffix?: string } = {};
  for (const rule of rules) {
    const name = isRecord(rule) && typeof rule.Name === 'string' ? rule.Name.toLowerCase() : undefined;
    const value = isRecord(rule) ? rule.Value : undefined;
    if ((name !== 'prefix' && name !== 'suffix') || (typeof value !== 'string' && typeof value !== 'number')) {
      return UNRESOLVED;
    }
    if (String(value) !== '') values[name === 'prefix' ? 'keyPrefix' : 'keySuffix'] = String(value);
  }
  return values;
};

const triggersFor = (
  eventsValue: unknown,
  dependencyNames: ReadonlyMap<string, string>,
  resources: Readonly<Record<string, SamResource>>,
  globals: RecordValue,
  scope: TemplateScope
): FunctionTrigger[] => {
  if (!isRecord(eventsValue)) return [];
  const triggers: FunctionTrigger[] = [];
  for (const event of Object.values(eventsValue)) {
    if (!isRecord(event) || typeof event.Type !== 'string') continue;
    const properties = isRecord(event.Properties) ? event.Properties : {};
    if ((event.Type === 'Api' || event.Type === 'HttpApi') && typeof properties.Path === 'string') {
      const route = {
        method: typeof properties.Method === 'string' ? properties.Method : '*',
        path: properties.Path
      };
      const protection = routeProtection(event.Type, properties, resources, globals);
      if (protection === undefined) triggers.push({ type: 'http', ...route });
      else if (protection === 'aws-iam') triggers.push({ type: 'http', ...route, authorization: 'aws-iam' });
      else {
        triggers.push({
          type: 'unmapped',
          reason: 'protected-route',
          sourceType: `the HTTP route ${route.method.toUpperCase()} ${route.path}, which your SAM template protects with ${protection}`
        });
      }
      continue;
    }
    const schedule = properties.Schedule ?? properties.ScheduleExpression;
    if ((event.Type === 'Schedule' || event.Type === 'ScheduleV2') && typeof schedule === 'string') {
      // EventBridge rules run in UTC.
      if (typeof properties.ScheduleExpressionTimezone === 'string') {
        triggers.push({
          type: 'unmapped',
          sourceType: `the schedule ${schedule} in the ${properties.ScheduleExpressionTimezone} time zone`
        });
        continue;
      }
      const declaredInput = properties.Input === undefined ? undefined : resolveDeclaredValue(properties.Input, scope);
      const input = typeof declaredInput === 'string' ? declaredInput : undefined;
      if (declaredInput !== undefined && input === undefined) {
        triggers.push({
          type: 'unmapped',
          sourceType: `the schedule ${schedule} with an Input payload init cannot resolve`
        });
        continue;
      }
      triggers.push({
        type: 'schedule',
        rate: schedule,
        ...(isDisabled(properties) ? { enabled: false } : {}),
        ...(input === undefined || input === '' ? {} : { input })
      });
      continue;
    }
    const referenceField = event.Type === 'SQS' ? 'Queue' : event.Type === 'SNS' ? 'Topic' : 'Bucket';
    const logicalId = referencedLogicalId(properties[referenceField], new Set(dependencyNames.keys()));
    const dependencyName = logicalId === undefined ? undefined : dependencyNames.get(logicalId);
    if (dependencyName === undefined) {
      triggers.push({
        type: 'unmapped',
        sourceType: `a ${event.Type} event whose resource could not be resolved`
      });
      continue;
    }
    if (event.Type === 'SQS' && isDisabled(properties)) {
      triggers.push({ type: 'unmapped', reason: 'disabled', sourceType: `the event from the ${dependencyName} queue` });
    } else if (event.Type === 'SQS' && properties.FilterCriteria !== undefined) {
      triggers.push({
        type: 'unmapped',
        sourceType: `messages from the ${dependencyName} queue that match its FilterCriteria, which Stacktape cannot filter`
      });
    } else if (event.Type === 'SQS') {
      const responseTypes = Array.isArray(properties.FunctionResponseTypes) ? properties.FunctionResponseTypes : [];
      triggers.push({
        type: 'queue',
        dependencyName,
        ...(typeof properties.BatchSize === 'number' ? { batchSize: properties.BatchSize } : {}),
        ...(responseTypes.includes('ReportBatchItemFailures') ? { reportBatchItemFailures: true } : {})
      });
    } else if (event.Type === 'SNS' && properties.FilterPolicyScope === 'MessageBody') {
      triggers.push({
        type: 'unmapped',
        sourceType: `messages from the ${dependencyName} topic whose body matches its FilterPolicy, which Stacktape cannot filter`
      });
    } else if (event.Type === 'SNS') {
      const declaredPolicy =
        properties.FilterPolicy === undefined ? undefined : resolveDeclaredValue(properties.FilterPolicy, scope);
      const filterPolicy = isRecord(declaredPolicy) ? declaredPolicy : undefined;
      if (declaredPolicy !== undefined && filterPolicy === undefined) {
        triggers.push({
          type: 'unmapped',
          sourceType: `messages from the ${dependencyName} topic that match a FilterPolicy init cannot resolve`
        });
      } else {
        triggers.push({ type: 'topic', dependencyName, ...(filterPolicy === undefined ? {} : { filterPolicy }) });
      }
    } else if (event.Type === 'S3') {
      // One Stacktape S3 event takes one event type; a list becomes one event per type rather than the default.
      const eventTypes = (Array.isArray(properties.Events) ? properties.Events : [properties.Events]).filter(
        (eventType): eventType is string => typeof eventType === 'string' && eventType !== ''
      );
      const filter = keyFilter(properties.Filter, scope);
      if (filter === UNRESOLVED) {
        triggers.push({
          type: 'unmapped',
          sourceType: `objects in the ${dependencyName} bucket that match a key filter init cannot resolve`
        });
        continue;
      }
      for (const eventType of eventTypes.length === 0 ? [undefined] : eventTypes) {
        triggers.push({
          type: 'object-storage',
          dependencyName,
          ...(eventType === undefined ? {} : { eventType }),
          ...filter
        });
      }
    } else {
      triggers.push({ type: 'unmapped', sourceType: `a ${event.Type} event` });
    }
  }
  return triggers;
};

export const awsSamProbe: Probe = {
  name: 'aws-sam',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const templatePaths = context.files
      .filter((path) => /(^|\/)(?:template|sam-template)\.ya?ml$/.test(path))
      .slice(0, 20);
    if (templatePaths.length === 0) return {};

    const services: ServiceFactInput[] = [];
    const dependencies: DependencyFact[] = [];
    for (const templatePath of templatePaths) {
      // oxlint-disable-next-line no-await-in-loop -- each template is a separate app boundary.
      const raw = await readText(context, templatePath, { fullFile: true });
      if (raw === undefined || !/AWS::Serverless-2016-10-31/.test(raw)) continue;

      let parsed: unknown;
      try {
        parsed = parseCloudFormationYaml(raw);
      } catch {
        continue;
      }
      if (!isRecord(parsed) || !isRecord(parsed.Resources)) continue;
      const resources = parsed.Resources as Record<string, SamResource>;
      const templateGlobals = isRecord(parsed.Globals) ? parsed.Globals : {};
      const scope: TemplateScope = {
        parameters: isRecord(parsed.Parameters) ? parsed.Parameters : {},
        logicalIds: new Set(Object.keys(parsed.Resources))
      };
      const globals = isRecord(templateGlobals.Function) ? templateGlobals.Function : {};
      const templateDirectory = posix.dirname(templatePath) === '' ? '.' : posix.dirname(templatePath);

      const dependencyNames = new Map<string, string>();
      for (const [logicalId, resource] of Object.entries(resources)) {
        if (typeof resource?.Type === 'string' && resourceTypeToKind[resource.Type] !== undefined) {
          dependencyNames.set(logicalId, lowerFirst(logicalId));
        }
      }

      const functions: Array<{
        logicalId: string;
        name: string;
        properties: RecordValue;
        service: ServiceFactInput;
      }> = [];
      for (const [logicalId, resource] of Object.entries(resources)) {
        if (resource?.Type !== 'AWS::Serverless::Function') continue;
        const properties = isRecord(resource.Properties) ? resource.Properties : {};
        const mergedProperties = mergeSamGlobals(globals, properties);
        const declared = isRecord(mergedProperties) ? mergedProperties : properties;
        const entrypoint = entrypointFor(
          context.files,
          templateDirectory,
          declared.CodeUri,
          // `Globals.Function` supplies whatever a function leaves out; Rust templates put `Handler: bootstrap` there.
          declared.Handler,
          declared.Runtime
        );
        if (entrypoint === undefined) continue;
        const name = lowerFirst(logicalId.replace(/Function$/, ''));
        // oxlint-disable-next-line no-await-in-loop -- one small handler read per declared SAM function.
        const source = await readText(context, entrypoint);
        const sourceCitation =
          source === undefined
            ? undefined
            : citeFirstMatchOnly(
                entrypoint,
                source,
                /(?:export\s+(?:const|async\s+function|function)\s+\w+|def\s+\w+\s*\(|(?:module\.)?exports(?:\.\w+)?\s*=|class\s+\w+)/,
                'functionEntrypoint'
              );
        const handler = declared.Handler;
        const runtimeName = String(declared.Runtime ?? '');
        // .NET's handler names the method; script runtimes' handler names an export of the entry file.
        const functionHandler =
          typeof handler !== 'string'
            ? undefined
            : runtimeName.startsWith('dotnet')
              ? handler
              : declaredHandlerExport(handler, entrypoint);
        const functionTriggers = triggersFor(properties.Events, dependencyNames, resources, templateGlobals, scope);
        const environmentVariables = environmentVariablesFor({
          file: templatePath,
          raw,
          logicalId,
          globals,
          properties,
          dependencyNames
        });
        const samEvidence = [
          citeInBlock(templatePath, raw, logicalId, /^\s*Handler:\s*/, 'functionEntrypoint'),
          citeInBlock(
            templatePath,
            raw,
            logicalId,
            /^\s*Type:\s*(?:Api|HttpApi|SQS|SNS|S3|Schedule)\s*$/,
            'functionTriggers'
          ),
          ...functionTriggers.flatMap((trigger) => {
            const value =
              trigger.type === 'http' ? trigger.path : trigger.type === 'schedule' ? trigger.rate : undefined;
            return value === undefined
              ? []
              : [citeInBlock(templatePath, raw, logicalId, new RegExp(escapeRegExp(value)), 'functionTriggers')];
          })
        ].filter((citation) => citation !== undefined);
        const service: ServiceFactInput = {
          name,
          path: posix.dirname(entrypoint) === '' ? '.' : posix.dirname(entrypoint),
          processType: logicalId,
          language: languageFor(entrypoint),
          framework: 'aws-sam',
          exposesHttp: false,
          executionModel: 'per-request',
          functionEntrypoint: entrypoint,
          ...(functionHandler === undefined ? {} : { functionHandler }),
          ...declaredSizing(declared.Timeout, declared.MemorySize),
          functionTriggers,
          environmentVariables,
          evidence: [sourceCitation, ...samEvidence].filter((citation) => citation !== undefined),
          source: 'probe'
        };
        functions.push({ logicalId, name, properties, service });
      }

      for (const [logicalId, name] of dependencyNames) {
        const resource = resources[logicalId];
        const kind = typeof resource?.Type === 'string' ? resourceTypeToKind[resource.Type] : undefined;
        if (kind === undefined) continue;
        const consumers = functions
          .filter(
            ({ properties, service }) =>
              JSON.stringify(properties).includes(logicalId) ||
              (service.environmentVariables ?? []).some((variable) => variable.dependencyName === name)
          )
          .map(({ name: functionName }) => functionName);
        // Ignore descriptor resources unrelated to any function. Reproducing an entire existing stack
        // is not init's job, and relationships such as a queue's dead-letter queue need richer facts.
        if (consumers.length === 0) continue;
        const evidence = [
          citeInBlock(templatePath, raw, logicalId, new RegExp(escapeRegExp(String(resource?.Type))))
        ].filter((citation) => citation !== undefined);
        const queueSettings = kind === 'queue' ? declaredQueueSettings(resource?.Properties) : undefined;
        dependencies.push({
          name,
          kind,
          ...(queueSettings === undefined ? {} : { queueSettings }),
          extensions: [],
          consumedBy: consumers,
          addressedBy: [
            ...new Set(
              functions.flatMap(({ service }) =>
                (service.environmentVariables ?? [])
                  .filter((variable) => variable.dependencyName === name)
                  .map((variable) => variable.name)
              )
            )
          ],
          hostingEvidence: 'deployment-manifest',
          evidence,
          source: 'probe'
        });
      }

      services.push(...functions.map(({ service }) => service));
    }

    return {
      ...(services.length === 0 ? {} : { services }),
      ...(dependencies.length === 0 ? {} : { dependencies })
    };
  }
};
