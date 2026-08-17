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

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SECRETISH_NAME = /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|APIKEY|ACCESS_KEY|CREDENTIAL|_KEY$/;

const RESOURCE_KINDS: Readonly<Record<string, DependencyKind>> = {
  'AWS::DynamoDB::Table': 'dynamodb',
  'AWS::SQS::Queue': 'queue',
  'AWS::SNS::Topic': 'topic',
  'AWS::S3::Bucket': 'object-storage',
  'AWS::RDS::DBInstance': 'postgres',
  'AWS::RDS::DBCluster': 'postgres',
  'AWS::ElastiCache::CacheCluster': 'redis',
  'AWS::ElastiCache::ReplicationGroup': 'redis',
  'AWS::OpenSearchService::Domain': 'search',
  'AWS::Elasticsearch::Domain': 'search'
};

const factName = (value: string): string => {
  let result = value.replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase());
  result = result.replace(/[^a-zA-Z0-9]/g, '');
  result = result.replace(/^(.)/, (character) => character.toLowerCase());
  return result || 'resource';
};

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
  dependencyNames: ReadonlyMap<string, string>
): ReadonlyMap<string, string> => {
  const targets = new Map<string, Set<string>>();
  const visit = (value: unknown, dependencyName: string): void => {
    if (typeof value === 'string') {
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
  return new Map(
    [...targets.entries()].flatMap(([variableName, dependencyTargets]) =>
      dependencyTargets.size === 1 ? [[variableName, [...dependencyTargets][0]!] as const] : []
    )
  );
};

const triggersFor = (events: unknown, dependencyNames: ReadonlyMap<string, string>): FunctionTrigger[] => {
  if (!Array.isArray(events)) return [];
  const triggers: FunctionTrigger[] = [];
  const known = new Set(dependencyNames.keys());
  for (const event of events) {
    if (!isRecord(event)) continue;

    const http = event.http ?? event.httpApi;
    if (typeof http === 'string') {
      // The shorthand: `GET /users`, or `*` for the whole function over HTTP.
      if (http.trim() === '*') {
        triggers.push({ type: 'http', method: '*', path: '/{proxy+}' });
        continue;
      }
      const match = /^([A-Za-z*]+)\s+(\/\S*)$/.exec(http.trim());
      if (match !== null) triggers.push({ type: 'http', method: match[1]!.toUpperCase(), path: match[2]! });
      continue;
    }
    if (isRecord(http)) {
      const method = typeof http.method === 'string' ? http.method : undefined;
      const path = typeof http.path === 'string' ? http.path : undefined;
      if (method !== undefined && path !== undefined) {
        triggers.push({ type: 'http', method: method.toUpperCase(), path: path.startsWith('/') ? path : `/${path}` });
      }
      continue;
    }

    const schedule = event.schedule;
    const rate =
      typeof schedule === 'string'
        ? schedule
        : isRecord(schedule) && typeof schedule.rate === 'string'
          ? schedule.rate
          : isRecord(schedule) && Array.isArray(schedule.rate) && typeof schedule.rate[0] === 'string'
            ? schedule.rate[0]
            : undefined;
    if (rate !== undefined) triggers.push({ type: 'schedule', rate });

    const sqs = isRecord(event.sqs) ? event.sqs.arn : event.sqs;
    const sqsLogicalId = referencedLogicalId(sqs, known);
    const queueName = sqsLogicalId === undefined ? undefined : dependencyNames.get(sqsLogicalId);
    if (queueName !== undefined) {
      const batchSize =
        isRecord(event.sqs) && typeof event.sqs.batchSize === 'number' ? event.sqs.batchSize : undefined;
      triggers.push({ type: 'queue', dependencyName: queueName, ...(batchSize === undefined ? {} : { batchSize }) });
    }

    const sns = isRecord(event.sns) ? event.sns.arn : event.sns;
    const snsLogicalId = referencedLogicalId(sns, known);
    const topicName = snsLogicalId === undefined ? undefined : dependencyNames.get(snsLogicalId);
    if (topicName !== undefined) triggers.push({ type: 'topic', dependencyName: topicName });

    const s3 = isRecord(event.s3) ? event.s3.bucket : event.s3;
    const s3LogicalId = referencedLogicalId(s3, known);
    const bucketName = s3LogicalId === undefined ? undefined : dependencyNames.get(s3LogicalId);
    if (bucketName !== undefined) {
      const eventType = isRecord(event.s3) && typeof event.s3.event === 'string' ? event.s3.event : undefined;
      triggers.push({
        type: 'object-storage',
        dependencyName: bucketName,
        ...(eventType === undefined ? {} : { eventType })
      });
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
    const base = { name, required: true, hasDeclaredValue: true, evidence };
    if (dependencyName !== undefined) {
      variables.push({ ...base, role: 'infra-dependency', dependencyName });
    } else {
      variables.push({ ...base, role: SECRETISH_NAME.test(name) ? 'third-party-secret' : 'runtime-config' });
    }
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
      const providerEnvironment =
        isRecord(parsed.provider) && isRecord(parsed.provider.environment) ? parsed.provider.environment : {};

      const cloudFormationResources =
        isRecord(parsed.resources) && isRecord(parsed.resources.Resources) ? parsed.resources.Resources : {};
      const resourceEntries = Object.entries(cloudFormationResources).filter(
        (entry): entry is [string, RecordValue] => isRecord(entry[1]) && typeof entry[1].Type === 'string'
      );
      const kindCounts = new Map<DependencyKind, number>();
      for (const [, resource] of resourceEntries) {
        const kind = RESOURCE_KINDS[String(resource.Type)];
        if (kind !== undefined) kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
      }
      const dependencyNames = new Map<string, string>();
      const manifestDependencies: DependencyFact[] = [];
      for (const [logicalId, resource] of resourceEntries) {
        const kind = RESOURCE_KINDS[String(resource.Type)];
        if (kind === undefined) continue;
        const name = (kindCounts.get(kind) ?? 0) === 1 ? defaultDependencyName(kind) : factName(logicalId);
        dependencyNames.set(logicalId, name);
        const citation = citeFirstMatchOnly(file, raw, new RegExp(`^\\s*${escapeRegExp(logicalId)}:`));
        manifestDependencies.push({
          name,
          kind,
          extensions: [],
          consumedBy: [],
          addressedBy: [],
          hostingEvidence: 'deployment-manifest',
          evidence: citation === undefined ? [] : [citation],
          source: 'probe'
        });
      }
      const environmentDependencyNames = environmentDependencyNamesFor(resourceEntries, dependencyNames);

      for (const [functionName, declaration] of Object.entries(parsed.functions)) {
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
        const functionTriggers = triggersFor(declaration.events, dependencyNames);
        const serviceName = factName(functionName);
        for (const variable of environmentVariables) {
          if (variable.role !== 'infra-dependency' || variable.dependencyName === undefined) continue;
          const dependency = manifestDependencies.find((entry) => entry.name === variable.dependencyName);
          if (dependency === undefined) continue;
          dependency.addressedBy.push(variable.name);
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
