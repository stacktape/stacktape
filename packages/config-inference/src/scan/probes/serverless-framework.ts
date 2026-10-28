/**
 * Functions and their triggers, as a Serverless Framework project already declared them.
 *
 * The eval's second failure class in one line: "handlers had no declared trigger". A
 * `serverless.yml` declares exactly that — the handler and the HTTP route or schedule that invokes
 * it — so the trigger gap closes deterministically for these projects. Only the YAML form is read:
 * `serverless.ts`/`.js` are programs, and running a program to learn its configuration is a consent
 * the scan does not have.
 *
 * Local SQS/SNS/S3 declarations and CloudFormation references travel with their consumers. An ARN
 * or computed value that does not resolve to a resource declared in this manifest stays a
 * non-claim; the scanner never reaches into another stack.
 */

import { posix } from 'node:path';
import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import type { EnvironmentVariableUse, FunctionTrigger, ServiceFactInput } from '../../facts/service';
import { parseCloudFormationYaml } from '../cloudformation-yaml';
import { citeFirstMatchOnly, readText } from '../probe';
import type { Probe, ProbeContext, ProbeOutput } from '../probe';
import { declaredEnvironmentVariable } from './declared-environment';
import {
  declaredHandlerExport,
  declaredQueueSettings,
  declaredSizing,
  resolveDeclaredValue,
  type TemplateScope
} from './declared-function';

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const RESOURCE_KINDS: Readonly<Record<string, DependencyKind>> = {
  'AWS::DynamoDB::Table': 'dynamodb',
  'AWS::SQS::Queue': 'queue',
  'AWS::SNS::Topic': 'topic',
  'AWS::S3::Bucket': 'object-storage',
  'AWS::ElastiCache::CacheCluster': 'redis',
  'AWS::ElastiCache::ReplicationGroup': 'redis',
  'AWS::OpenSearchService::Domain': 'search',
  'AWS::Elasticsearch::Domain': 'search'
};

/** RDS `Engine` values, in our vocabulary. Anything else, or an engine that is not a literal, is no claim at all. */
const RDS_ENGINES: Readonly<Record<string, DependencyKind>> = {
  postgres: 'postgres',
  'aurora-postgresql': 'postgres',
  mysql: 'mysql',
  'aurora-mysql': 'mysql',
  mariadb: 'mysql'
};

/** The dependency a declared resource is, reading a database's engine from its properties. */
const resourceKind = (resource: RecordValue): DependencyKind | undefined => {
  const type = String(resource.Type);
  if (type !== 'AWS::RDS::DBInstance' && type !== 'AWS::RDS::DBCluster') return RESOURCE_KINDS[type];
  const engine = isRecord(resource.Properties) ? resource.Properties.Engine : undefined;
  if (typeof engine !== 'string') return undefined;
  const normalized = engine.toLowerCase();
  return normalized.startsWith('sqlserver-') ? 'mssql' : RDS_ENGINES[normalized];
};

/** A literal `EngineVersion` on an RDS database. */
const engineVersionOf = (resource: RecordValue): string | undefined => {
  if (resource.Type !== 'AWS::RDS::DBInstance' && resource.Type !== 'AWS::RDS::DBCluster') return undefined;
  const version = isRecord(resource.Properties) ? resource.Properties.EngineVersion : undefined;
  return typeof version === 'string' || typeof version === 'number' ? String(version) : undefined;
};

const factName = (value: string): string => {
  let result = value.replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase());
  result = result.replace(/[^a-zA-Z0-9]/g, '');
  result = result.replace(/^(.)/, (character) => character.toLowerCase());
  return result || 'resource';
};

const manifestDependencyFact = (
  name: string,
  kind: DependencyKind,
  citation: ReturnType<typeof citeFirstMatchOnly>,
  queueSettings?: DependencyFact['queueSettings']
): DependencyFact => ({
  name,
  kind,
  ...(queueSettings === undefined ? {} : { queueSettings }),
  extensions: [],
  consumedBy: [],
  addressedBy: [],
  hostingEvidence: 'deployment-manifest',
  evidence: citation === undefined ? [] : [citation],
  source: 'probe'
});

const languageForRuntime = (runtime: string | undefined, entrypoint: string): string => {
  if (entrypoint.endsWith('.py')) return 'python';
  if (entrypoint.endsWith('.ts')) return 'typescript';
  if (entrypoint.endsWith('.rb')) return 'ruby';
  if (entrypoint.endsWith('.go')) return 'go';
  if (runtime?.startsWith('python') === true) return 'python';
  if (runtime?.startsWith('ruby') === true) return 'ruby';
  if (runtime?.startsWith('go') === true) return 'go';
  return 'javascript';
};

/**
 * Resolve `src/handlers/create.main` to the source file it names, against the real file list.
 *
 * Returns nothing when no candidate exists: a function fact needs an entrypoint that is actually
 * there, and a fabricated path would fail packaging with a worse message than an honest miss.
 */
const entrypointFor = (files: readonly string[], manifestDirectory: string, handler: string): string | undefined => {
  const modulePath = handler.slice(0, handler.lastIndexOf('.')) || handler;
  const base = manifestDirectory === '.' ? modulePath : `${manifestDirectory}/${modulePath}`;
  return ['ts', 'js', 'mjs', 'cjs', 'py', 'rb', 'go']
    .map((extension) => `${base}.${extension}`)
    .find((candidate) => files.includes(candidate));
};

const referencedLogicalId = (value: unknown, known: ReadonlySet<string>): string | undefined => {
  if (typeof value === 'string') {
    const construct = /^\$\{construct:([A-Za-z_][A-Za-z0-9_-]*)\./.exec(value)?.[1];
    if (construct !== undefined && known.has(construct)) return construct;
    const prefix = value.split('.')[0] ?? value;
    return known.has(prefix) ? prefix : undefined;
  }
  if (!isRecord(value)) return undefined;
  if (typeof value.Ref === 'string' && known.has(value.Ref)) return value.Ref;
  const getAtt = value['Fn::GetAtt'];
  const fromGetAtt = Array.isArray(getAtt) ? getAtt[0] : typeof getAtt === 'string' ? getAtt.split('.')[0] : undefined;
  return typeof fromGetAtt === 'string' && known.has(fromGetAtt) ? fromGetAtt : undefined;
};

/**
 * Serverless commonly names a local resource through a provider variable:
 *
 * `TableName: ${self:provider.environment.DYNAMODB_TABLE}`
 *
 * That makes `DYNAMODB_TABLE` an alias for this manifest's table, not a user-owned secret. Resolve
 * only aliases with exactly one local target; an ambiguous name remains ordinary runtime config.
 */
const environmentDependencyNamesFor = (
  resourceEntries: readonly [string, RecordValue][],
  dependencyNames: ReadonlyMap<string, string>,
  providerEnvironment: RecordValue
): ReadonlyMap<string, string> => {
  const targets = new Map<string, Set<string>>();
  const literalTargets = new Map<string, Set<string>>();
  const visit = (value: unknown, dependencyName: string): void => {
    if (typeof value === 'string') {
      const literalNames = literalTargets.get(value) ?? new Set<string>();
      literalNames.add(dependencyName);
      literalTargets.set(value, literalNames);
      for (const match of value.matchAll(/\$\{self:provider\.environment\.([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
        const names = targets.get(match[1]!) ?? new Set<string>();
        names.add(dependencyName);
        targets.set(match[1]!, names);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, dependencyName);
      return;
    }
    if (isRecord(value)) {
      for (const item of Object.values(value)) visit(item, dependencyName);
    }
  };

  for (const [logicalId, resource] of resourceEntries) {
    const dependencyName = dependencyNames.get(logicalId);
    if (dependencyName !== undefined) visit(resource, dependencyName);
  }
  // The inverse shape is equally common: both a resource and an environment variable refer to the
  // same custom name (`TableName: ${self:custom.jobsTable}` and
  // `JOBS_TABLE: ${self:custom.jobsTable}`). Equality of the complete expression is strong evidence
  // and avoids asking the user to put a table name we just created into a secret.
  for (const [variableName, value] of Object.entries(providerEnvironment)) {
    if (typeof value !== 'string') continue;
    const dependencyTargets = literalTargets.get(value);
    if (dependencyTargets === undefined) continue;
    const names = targets.get(variableName) ?? new Set<string>();
    for (const dependencyName of dependencyTargets) names.add(dependencyName);
    targets.set(variableName, names);
  }
  return new Map(
    [...targets.entries()].flatMap(([variableName, dependencyTargets]) =>
      dependencyTargets.size === 1 ? [[variableName, [...dependencyTargets][0]!] as const] : []
    )
  );
};

/**
 * How a Serverless HTTP event protects its route: `aws-iam`, a description of protection Stacktape cannot express,
 * or nothing for a public route. Serverless accepts `aws_iam` both as the authorizer string and as its `type`.
 */
const routeProtection = (http: RecordValue): 'aws-iam' | string | undefined => {
  if (http.private === true) return 'an API key (private: true)';
  const authorizer = http.authorizer;
  if (authorizer === undefined || authorizer === null) return undefined;
  const type = typeof authorizer === 'string' ? authorizer : isRecord(authorizer) ? authorizer.type : undefined;
  if (typeof type === 'string' && type.toLowerCase() === 'aws_iam') return 'aws-iam';
  const name =
    typeof authorizer === 'string'
      ? authorizer
      : isRecord(authorizer) && typeof authorizer.name === 'string'
        ? authorizer.name
        : undefined;
  return name === undefined ? 'an authorizer' : `the ${JSON.stringify(name)} authorizer`;
};

/** A switch that is not literally on. A variable (`${self:custom.enabled}`) may resolve either way, so it counts as off. */
const isDisabled = (value: unknown): boolean => value !== undefined && value !== true && value !== 'true';

/** Every expression of a `schedule` event, each with the state and payload the declaration gives them all. */
const scheduleTriggers = (schedule: RecordValue, scope: TemplateScope): FunctionTrigger[] => {
  const rates = (Array.isArray(schedule.rate) ? schedule.rate : [schedule.rate]).filter(
    (rate): rate is string => typeof rate === 'string' && rate !== ''
  );
  if (rates.length === 0) return [];
  // EventBridge rules run in UTC; a payload rewritten per event needs the transformer Stacktape has no fact for yet.
  const unsupported =
    typeof schedule.timezone === 'string'
      ? `the ${schedule.timezone} time zone`
      : schedule.inputTransformer !== undefined
        ? 'an inputTransformer'
        : undefined;
  if (unsupported !== undefined) {
    return rates.map((rate) => ({ type: 'unmapped', sourceType: `the schedule ${rate} with ${unsupported}` }));
  }
  const declaredInput = schedule.input === undefined ? undefined : resolveDeclaredValue(schedule.input, scope);
  const declaredInputPath =
    schedule.inputPath === undefined ? undefined : resolveDeclaredValue(schedule.inputPath, scope);
  const input = isRecord(declaredInput) || typeof declaredInput === 'string' ? declaredInput : undefined;
  const inputPath = typeof declaredInputPath === 'string' ? declaredInputPath : undefined;
  if (
    (declaredInput !== undefined && input === undefined) ||
    (declaredInputPath !== undefined && inputPath === undefined)
  ) {
    return rates.map((rate) => ({
      type: 'unmapped',
      sourceType: `the schedule ${rate} with an input init cannot resolve`
    }));
  }
  const settings = {
    ...(isDisabled(schedule.enabled) ? { enabled: false as const } : {}),
    ...(input === undefined || input === '' ? {} : { input }),
    ...(inputPath === undefined || inputPath === '' ? {} : { inputPath })
  };
  return rates.map((rate) => Object.assign({ type: 'schedule' as const, rate }, settings));
};

const triggersFor = (
  events: unknown,
  dependencyNames: ReadonlyMap<string, string>,
  scope: TemplateScope
): FunctionTrigger[] => {
  if (!Array.isArray(events)) return [];
  const triggers: FunctionTrigger[] = [];
  const known = new Set(dependencyNames.keys());
  for (const event of events) {
    if (!isRecord(event)) continue;
    const triggerCountBefore = triggers.length;

    const http = event.http ?? event.httpApi;
    if (typeof http === 'string') {
      // The shorthand: `GET /users`, or `*` for the whole function over HTTP.
      if (http.trim() === '*') {
        triggers.push({ type: 'http', method: '*', path: '/{proxy+}' });
        continue;
      }
      const match = /^([A-Za-z*]+)\s+(\/\S*)$/.exec(http.trim());
      if (match !== null)
        triggers.push({
          type: 'http',
          method: match[1]!.toUpperCase(),
          path: match[2]!
        });
      continue;
    }
    if (isRecord(http)) {
      const method = typeof http.method === 'string' ? http.method : undefined;
      const path = typeof http.path === 'string' ? http.path : undefined;
      if (method !== undefined && path !== undefined) {
        const route = { method: method.toUpperCase(), path: path.startsWith('/') ? path : `/${path}` };
        const protection = routeProtection(http);
        if (protection === undefined) triggers.push({ type: 'http', ...route });
        else if (protection === 'aws-iam') triggers.push({ type: 'http', ...route, authorization: 'aws-iam' });
        else {
          triggers.push({
            type: 'unmapped',
            reason: 'protected-route',
            sourceType: `the HTTP route ${route.method} ${route.path}, which serverless.yml protects with ${protection}`
          });
        }
      }
      continue;
    }

    const schedule = event.schedule;
    if (typeof schedule === 'string') triggers.push({ type: 'schedule', rate: schedule });
    if (isRecord(schedule)) triggers.push(...scheduleTriggers(schedule, scope));

    const sqs = isRecord(event.sqs) ? event.sqs.arn : event.sqs;
    const sqsLogicalId = referencedLogicalId(sqs, known);
    const queueName = sqsLogicalId === undefined ? undefined : dependencyNames.get(sqsLogicalId);
    if (queueName !== undefined) {
      const options = isRecord(event.sqs) ? event.sqs : {};
      if (isDisabled(options.enabled)) {
        triggers.push({ type: 'unmapped', reason: 'disabled', sourceType: `the event from the ${queueName} queue` });
      } else if (options.filterPatterns !== undefined) {
        triggers.push({
          type: 'unmapped',
          sourceType: `messages from the ${queueName} queue that match its filterPatterns, which Stacktape cannot filter`
        });
      } else {
        triggers.push({
          type: 'queue',
          dependencyName: queueName,
          ...(typeof options.batchSize === 'number' ? { batchSize: options.batchSize } : {}),
          ...(options.functionResponseType === 'ReportBatchItemFailures' ? { reportBatchItemFailures: true } : {})
        });
      }
    }

    const sns = isRecord(event.sns) ? event.sns.arn : event.sns;
    const snsLogicalId = referencedLogicalId(sns, known);
    const topicName = snsLogicalId === undefined ? undefined : dependencyNames.get(snsLogicalId);
    if (topicName !== undefined) {
      const options = isRecord(event.sns) ? event.sns : {};
      if (options.filterPolicyScope === 'MessageBody') {
        triggers.push({
          type: 'unmapped',
          sourceType: `messages from the ${topicName} topic whose body matches its filterPolicy, which Stacktape cannot filter`
        });
      } else {
        const declaredPolicy =
          options.filterPolicy === undefined ? undefined : resolveDeclaredValue(options.filterPolicy, scope);
        const filterPolicy = isRecord(declaredPolicy) ? declaredPolicy : undefined;
        if (declaredPolicy !== undefined && filterPolicy === undefined) {
          triggers.push({
            type: 'unmapped',
            sourceType: `messages from the ${topicName} topic that match a filterPolicy init cannot resolve`
          });
        } else {
          triggers.push({
            type: 'topic',
            dependencyName: topicName,
            ...(filterPolicy === undefined ? {} : { filterPolicy })
          });
        }
      }
    }

    const s3 = isRecord(event.s3) ? event.s3.bucket : event.s3;
    const s3LogicalId = referencedLogicalId(s3, known);
    const bucketName = s3LogicalId === undefined ? undefined : dependencyNames.get(s3LogicalId);
    if (bucketName !== undefined) {
      const eventType = isRecord(event.s3) && typeof event.s3.event === 'string' ? event.s3.event : undefined;
      const declaredRules = isRecord(event.s3) ? event.s3.rules : undefined;
      const rules = declaredRules === undefined ? [] : resolveDeclaredValue(declaredRules, scope);
      // Each rule is `{ prefix }` or `{ suffix }`; anything else would be dropped and the subscription widened.
      const readable =
        Array.isArray(rules) &&
        rules.every(
          (rule) =>
            isRecord(rule) &&
            Object.keys(rule).length === 1 &&
            (typeof rule.prefix === 'string' || typeof rule.suffix === 'string')
        );
      if (!readable) {
        triggers.push({
          type: 'unmapped',
          sourceType: `objects in the ${bucketName} bucket that match key rules init cannot resolve`
        });
      } else {
        const keyPrefix = rules.map((rule) => (rule as RecordValue).prefix).find((value) => typeof value === 'string');
        const keySuffix = rules.map((rule) => (rule as RecordValue).suffix).find((value) => typeof value === 'string');
        triggers.push({
          type: 'object-storage',
          dependencyName: bucketName,
          ...(eventType === undefined ? {} : { eventType }),
          ...(typeof keyPrefix !== 'string' || keyPrefix === '' ? {} : { keyPrefix }),
          ...(typeof keySuffix !== 'string' || keySuffix === '' ? {} : { keySuffix })
        });
      }
    }
    if (triggers.length === triggerCountBefore) {
      const sourceType =
        event.websocket !== undefined
          ? 'a WebSocket route'
          : event.stream !== undefined
            ? 'a Kinesis or DynamoDB stream event'
            : event.s3 !== undefined
              ? 'an S3 event whose bucket is external or plugin-managed'
              : event.sqs !== undefined
                ? 'an SQS event whose queue reference could not be resolved'
                : event.sns !== undefined
                  ? 'an SNS event whose topic reference could not be resolved'
                  : undefined;
      if (sourceType !== undefined) triggers.push({ type: 'unmapped', sourceType });
    }
  }
  return triggers;
};

const environmentVariablesFor = ({
  file,
  raw,
  environment,
  dependencyNames,
  environmentDependencyNames
}: {
  file: string;
  raw: string;
  environment: RecordValue;
  dependencyNames: ReadonlyMap<string, string>;
  environmentDependencyNames: ReadonlyMap<string, string>;
}): EnvironmentVariableUse[] => {
  const known = new Set(dependencyNames.keys());
  const variables: EnvironmentVariableUse[] = [];
  for (const [name, value] of Object.entries(environment)) {
    const logicalId = referencedLogicalId(value, known);
    const dependencyName =
      (logicalId === undefined ? undefined : dependencyNames.get(logicalId)) ?? environmentDependencyNames.get(name);
    const citation = citeFirstMatchOnly(file, raw, new RegExp(`^\\s*${escapeRegExp(name)}\\s*:`));
    // An environment value may be an SSM path or, unfortunately, plaintext. The fact needs only
    // the name; keep its citation useful without copying the value into the facts document.
    const evidence = citation === undefined ? [] : [{ ...citation, quote: `${name}:` }];
    variables.push(declaredEnvironmentVariable({ name, dependencyName, evidence, value }));
  }
  return variables;
};

export const serverlessFrameworkProbe: Probe = {
  name: 'serverless-framework',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const manifests = context.files.filter((file) => /(^|\/)serverless\.ya?ml$/.test(file));
    if (manifests.length === 0) return {};

    const services: ServiceFactInput[] = [];
    const dependencies: DependencyFact[] = [];
    for (const file of manifests) {
      // oxlint-disable-next-line no-await-in-loop -- a handful of manifests, read in listing order.
      const raw = await readText(context, file);
      if (raw === undefined) continue;
      let parsed: unknown;
      try {
        parsed = parseCloudFormationYaml(raw);
      } catch {
        continue;
      }
      if (!isRecord(parsed) || !isRecord(parsed.functions)) continue;

      const directory = posix.dirname(file) === '' ? '.' : posix.dirname(file);
      const runtime =
        isRecord(parsed.provider) && typeof parsed.provider.runtime === 'string' ? parsed.provider.runtime : undefined;
      const providerSettings = isRecord(parsed.provider) ? parsed.provider : {};
      const providerEnvironment = isRecord(providerSettings.environment) ? providerSettings.environment : {};

      const cloudFormationResources =
        isRecord(parsed.resources) && isRecord(parsed.resources.Resources) ? parsed.resources.Resources : {};
      const scope: TemplateScope = {
        parameters:
          isRecord(parsed.resources) && isRecord(parsed.resources.Parameters) ? parsed.resources.Parameters : {},
        logicalIds: new Set(Object.keys(cloudFormationResources))
      };
      const resourceEntries = Object.entries(cloudFormationResources).filter(
        (entry): entry is [string, RecordValue] => isRecord(entry[1]) && typeof entry[1].Type === 'string'
      );
      const kindCounts = new Map<DependencyKind, number>();
      for (const [, resource] of resourceEntries) {
        const kind = resourceKind(resource);
        if (kind !== undefined) kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
      }
      const dependencyNames = new Map<string, string>();
      const manifestDependencies: DependencyFact[] = [];
      for (const [logicalId, resource] of resourceEntries) {
        const kind = resourceKind(resource);
        if (kind === undefined) continue;
        const name = (kindCounts.get(kind) ?? 0) === 1 ? defaultDependencyName(kind) : factName(logicalId);
        dependencyNames.set(logicalId, name);
        const citation = citeFirstMatchOnly(file, raw, new RegExp(`^\\s*${escapeRegExp(logicalId)}:`));
        const engineVersion = engineVersionOf(resource);
        manifestDependencies.push({
          ...manifestDependencyFact(
            name,
            kind,
            citation,
            kind === 'queue' ? declaredQueueSettings(resource.Properties) : undefined
          ),
          ...(engineVersion === undefined ? {} : { engineVersion })
        });
      }
      const constructs = isRecord(parsed.constructs) ? parsed.constructs : {};
      const constructEntries = Object.entries(constructs).filter(
        (entry): entry is [string, RecordValue] =>
          isRecord(entry[1]) && (entry[1].type === 'storage' || entry[1].type === 'queue')
      );
      const constructKindCounts = new Map<DependencyKind, number>();
      for (const [, construct] of constructEntries) {
        const kind: DependencyKind = construct.type === 'storage' ? 'object-storage' : 'queue';
        constructKindCounts.set(kind, (constructKindCounts.get(kind) ?? 0) + 1);
      }
      for (const [constructName, construct] of constructEntries) {
        const kind: DependencyKind = construct.type === 'storage' ? 'object-storage' : 'queue';
        const name = (constructKindCounts.get(kind) ?? 0) === 1 ? defaultDependencyName(kind) : factName(constructName);
        dependencyNames.set(constructName, name);
        const citation = citeFirstMatchOnly(file, raw, new RegExp(`^\\s*${escapeRegExp(constructName)}:`));
        manifestDependencies.push(manifestDependencyFact(name, kind, citation));
      }
      const environmentDependencyNames = environmentDependencyNamesFor(
        resourceEntries,
        dependencyNames,
        providerEnvironment
      );

      const functionDeclarations: Array<[string, RecordValue]> = Object.entries(parsed.functions).filter(
        (entry): entry is [string, RecordValue] => isRecord(entry[1])
      );
      for (const [constructName, construct] of constructEntries) {
        if (construct.type !== 'queue' || !isRecord(construct.worker) || typeof construct.worker.handler !== 'string') {
          continue;
        }
        functionDeclarations.push([
          `${constructName}Worker`,
          {
            ...construct.worker,
            events: [{ sqs: `\${construct:${constructName}.queueArn}` }]
          }
        ]);
      }

      for (const [functionName, declaration] of functionDeclarations) {
        if (!isRecord(declaration) || typeof declaration.handler !== 'string') continue;
        const entrypoint = entrypointFor(context.files, directory, declaration.handler);
        if (entrypoint === undefined) continue;

        const citation = citeFirstMatchOnly(
          file,
          raw,
          new RegExp(`^\\s*${escapeRegExp(functionName)}:`),
          'functionEntrypoint'
        );
        const environment = {
          ...providerEnvironment,
          ...(isRecord(declaration.environment) ? declaration.environment : {})
        };
        const environmentVariables = environmentVariablesFor({
          file,
          raw,
          environment,
          dependencyNames,
          environmentDependencyNames
        });
        const functionTriggers = triggersFor(declaration.events, dependencyNames, scope);
        const handlerExport = declaredHandlerExport(declaration.handler, entrypoint);
        const serviceName = factName(functionName);
        for (const variable of environmentVariables) {
          if (variable.role !== 'infra-dependency' || variable.dependencyName === undefined) continue;
          const dependency = manifestDependencies.find((entry) => entry.name === variable.dependencyName);
          if (dependency === undefined) continue;
          if (!dependency.addressedBy.includes(variable.name)) dependency.addressedBy.push(variable.name);
          dependency.consumedBy.push(serviceName);
        }
        for (const trigger of functionTriggers) {
          if (!('dependencyName' in trigger)) continue;
          const dependency = manifestDependencies.find((entry) => entry.name === trigger.dependencyName);
          if (dependency !== undefined && !dependency.consumedBy.includes(serviceName)) {
            dependency.consumedBy.push(serviceName);
          }
        }

        services.push({
          name: serviceName,
          path: directory,
          // Several functions share the manifest's directory; the name is what keeps them apart.
          processType: `serverless:${functionName}`,
          language: languageForRuntime(
            typeof declaration.runtime === 'string' ? declaration.runtime : runtime,
            entrypoint
          ),
          exposesHttp: false,
          executionModel: 'per-request',
          functionEntrypoint: entrypoint,
          ...(handlerExport === undefined ? {} : { functionHandler: handlerExport }),
          ...declaredSizing(
            declaration.timeout ?? providerSettings.timeout,
            declaration.memorySize ?? providerSettings.memorySize
          ),
          functionTriggers,
          environmentVariables,
          evidence: citation === undefined ? [] : [citation],
          source: 'probe'
        });
      }
      dependencies.push(...manifestDependencies);
    }

    return {
      ...(services.length === 0 ? {} : { services }),
      ...(dependencies.length === 0 ? {} : { dependencies })
    };
  }
};
