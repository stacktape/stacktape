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
import type { ImportGap } from '../../facts/project-facts';
import type { EnvironmentVariableUse, FunctionTrigger, ServiceFactInput } from '../../facts/service';
import { parseCloudFormationYaml } from '../cloudformation-yaml';
import { citeFirstMatchOnly, readText } from '../probe';
import type { Probe, ProbeContext, ProbeOutput } from '../probe';
import { declaredEnvironmentVariable } from './declared-environment';
import {
  conditionReview,
  declaredDependencySettings,
  declaredUserPools,
  RESOURCE_ATTRIBUTES
} from './cloudformation-resources';
import { declaredStatements } from './declared-permissions';
import {
  declaredHandlerExport,
  declaredNumber,
  declaredSizing,
  declaredSwitch,
  resolveDeclaredValue,
  selectBranch,
  UNRESOLVED,
  type TemplateScope
} from './declared-function';
import {
  emptyReview,
  groupEventGaps,
  importerOutput,
  isOmitted,
  notImportedGap,
  omitFor,
  reviewGaps,
  reviewKeys,
  type KeyReview,
  type KeyRules
} from './declared-keys';

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

/**
 * RDS `Engine` values, in our vocabulary. Anything else, or an engine that is not a literal, is no claim at all. MariaDB
 * is MySQL-compatible, and keeps its engine through `mysqlEngine`.
 */
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

// ── What each declaration may contain, and what init does with it ─────────────────────────────────────────────────

const TOP_LEVEL: KeyRules = {
  service: 'carried',
  provider: 'carried',
  functions: 'carried',
  resources: 'carried',
  constructs: 'carried',
  custom: 'ignored',
  package: 'ignored',
  frameworkVersion: 'ignored',
  useDotenv: 'ignored',
  configValidationMode: 'ignored',
  variablesResolutionMode: 'ignored',
  deprecationNotificationMode: 'ignored',
  disabledDeprecations: 'ignored',
  params: 'ignored',
  stages: 'ignored',
  app: 'ignored',
  org: 'ignored',
  tenant: 'ignored',
  console: 'ignored',
  dashboard: 'ignored',
  outputs: 'ignored',
  build: 'ignored',
  // Plugins can rewrite the generated stack in ways the manifest does not show.
  plugins: 'not-carried',
  layers: 'not-carried',
  stepFunctions: 'not-carried'
};

const PROVIDER: KeyRules = {
  name: 'carried',
  runtime: 'carried',
  environment: 'carried',
  timeout: 'carried',
  memorySize: 'carried',
  layers: 'carried',
  architecture: 'carried',
  apiGateway: 'carried',
  httpApi: 'carried',
  endpointType: 'carried',
  stage: 'ignored',
  region: 'ignored',
  profile: 'ignored',
  tags: 'ignored',
  stackTags: 'ignored',
  deploymentBucket: 'ignored',
  deploymentMethod: 'ignored',
  deploymentPrefix: 'ignored',
  logRetentionInDays: 'ignored',
  logDataProtectionPolicy: 'ignored',
  logs: 'ignored',
  tracing: 'ignored',
  versionFunctions: 'ignored',
  lambdaHashingVersion: 'ignored',
  stackName: 'ignored',
  apiName: 'ignored',
  disableRollback: 'ignored',
  runtimeManagement: 'ignored',
  cfnRole: 'ignored',
  notificationArns: 'ignored',
  stackPolicy: 'ignored',
  eventBridge: 'ignored',
  websocketsApiName: 'ignored',
  websocketsApiRouteSelectionExpression: 'ignored',
  websocketsDescription: 'ignored',
  // Statements are translated into each function's own; a role or managed policy init cannot read is not.
  iam: 'carried',
  iamRoleStatements: 'carried',
  // Read below: the functions get none of a role's or managed policies' permissions, and no `connectTo` instead.
  iamManagedPolicies: 'carried',
  role: 'carried',
  rolePermissionsBoundary: 'permissions',
  stackParameters: 'not-carried',
  ecr: 'not-carried',
  s3: 'not-carried',
  alb: 'not-carried',
  apiKeys: 'not-carried',
  usagePlan: 'not-carried',
  vpc: 'network',
  kmsKeyArn: 'encryption',
  vpcEndpointIds: 'access',
  resourcePolicy: 'access'
};

const API_GATEWAY: KeyRules = {
  minimumCompressionSize: 'ignored',
  shouldStartNameWithService: 'ignored',
  description: 'ignored',
  metrics: 'ignored',
  stage: 'ignored',
  websocketApiId: 'ignored',
  apiKeys: 'not-carried',
  usagePlan: 'not-carried',
  binaryMediaTypes: 'not-carried',
  request: 'not-carried',
  timeoutInMillis: 'not-carried',
  resourcePolicy: 'access',
  restApiId: 'access',
  restApiRootResourceId: 'access',
  restApiResources: 'access',
  apiKeySourceType: 'access',
  disableDefaultEndpoint: 'access'
};

const HTTP_API: KeyRules = {
  authorizers: 'carried',
  name: 'ignored',
  metrics: 'ignored',
  useProviderTags: 'ignored',
  cors: 'not-carried',
  payload: 'not-carried',
  id: 'access',
  disableDefaultEndpoint: 'access'
};

const FUNCTION: KeyRules = {
  handler: 'carried',
  events: 'carried',
  environment: 'carried',
  timeout: 'carried',
  memorySize: 'carried',
  runtime: 'carried',
  layers: 'carried',
  architecture: 'carried',
  reservedConcurrency: 'carried',
  name: 'ignored',
  description: 'ignored',
  tags: 'ignored',
  package: 'ignored',
  tracing: 'ignored',
  logRetentionInDays: 'ignored',
  logDataProtectionPolicy: 'ignored',
  logs: 'ignored',
  disableLogs: 'ignored',
  versionFunction: 'ignored',
  dependsOn: 'ignored',
  runtimeManagement: 'ignored',
  role: 'carried',
  iamRoleStatements: 'carried',
  iamRoleStatementsInherit: 'carried',
  iamRoleStatementsName: 'ignored',
  provisionedConcurrency: 'not-carried',
  ephemeralStorageSize: 'not-carried',
  snapStart: 'not-carried',
  // No URL is created for it, which exposes nothing.
  url: 'not-carried',
  image: 'omit',
  vpc: 'network',
  kmsKeyArn: 'encryption',
  fileSystemConfig: 'storage',
  onError: 'failure-handling',
  destinations: 'failure-handling',
  maximumRetryAttempts: 'failure-handling',
  maximumEventAge: 'failure-handling',
  condition: 'condition'
};

/** The settings of each event type init translates. Anything else leaves the event out. */
const EVENT_SETTINGS: Readonly<Record<string, KeyRules>> = {
  http: {
    path: 'carried',
    method: 'carried',
    authorizer: 'carried',
    private: 'carried',
    integration: 'carried',
    operationId: 'ignored',
    documentation: 'ignored',
    cors: 'not-carried',
    request: 'not-carried',
    response: 'not-carried',
    caching: 'not-carried',
    timeoutInMillis: 'not-carried',
    async: 'omit',
    connectionType: 'network',
    connectionId: 'network'
  },
  httpApi: { method: 'carried', path: 'carried', authorizer: 'carried' },
  schedule: {
    rate: 'carried',
    enabled: 'carried',
    input: 'carried',
    inputPath: 'carried',
    inputTransformer: 'carried',
    timezone: 'carried',
    name: 'ignored',
    description: 'ignored',
    method: 'ignored'
  },
  sqs: {
    arn: 'carried',
    batchSize: 'carried',
    maximumBatchingWindow: 'carried',
    enabled: 'carried',
    filterPatterns: 'carried',
    functionResponseType: 'carried',
    maximumConcurrency: 'carried'
  },
  sns: {
    arn: 'carried',
    topicName: 'carried',
    filterPolicy: 'carried',
    filterPolicyScope: 'carried',
    displayName: 'ignored',
    redrivePolicy: 'failure-handling',
    kmsMasterKeyId: 'encryption'
  },
  s3: { bucket: 'carried', event: 'carried', rules: 'carried', existing: 'carried', forceDeploy: 'ignored' }
};

const RESOURCES_SECTION: KeyRules = {
  Resources: 'carried',
  Conditions: 'carried',
  Parameters: 'carried',
  Outputs: 'ignored',
  Description: 'ignored',
  // Overrides of the resources Serverless generates, such as a function's own properties.
  extensions: 'not-carried'
};

/**
 * How a Serverless HTTP event protects its route: `aws-iam`, a description of protection Stacktape cannot express,
 * or nothing for a public route. Serverless accepts `aws_iam` both as the authorizer string and as its `type`.
 */
const routeProtection = (
  http: RecordValue,
  apiProtection: string | undefined,
  scope: TemplateScope
): 'aws-iam' | string | undefined => {
  if (apiProtection !== undefined) return apiProtection;
  // A setting init cannot resolve counts as protection.
  const isPrivate = declaredSwitch(http.private, scope);
  if (isPrivate === UNRESOLVED) return 'a private setting init cannot resolve';
  if (isPrivate === true) return 'an API key (private: true)';
  const authorizer = selectBranch(http.authorizer, scope);
  if (authorizer === UNRESOLVED) return 'an authorizer init cannot resolve';
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

/** Every expression of a `schedule` event, each with the state and payload the declaration gives them all. */
const scheduleTriggers = (schedule: RecordValue, scope: TemplateScope): FunctionTrigger[] => {
  const declaredRates = resolveDeclaredValue(schedule.rate, scope);
  const rates = (Array.isArray(declaredRates) ? declaredRates : [declaredRates]).filter(
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
    ...(declaredSwitch(schedule.enabled, scope) === false ? { enabled: false as const } : {}),
    ...(input === undefined || input === '' ? {} : { input }),
    ...(inputPath === undefined || inputPath === '' ? {} : { inputPath })
  };
  return rates.map((rate) => Object.assign({ type: 'schedule' as const, rate }, settings));
};

type TriggerContext = {
  file: string;
  functionName: string;
  dependencyNames: ReadonlyMap<string, string>;
  /** Resources init left out: an event from one of them is left out too. */
  omittedResources: ReadonlySet<string>;
  scope: TemplateScope;
  /** Protection the provider's REST API or HTTP API declares that init cannot carry, which every route there has. */
  restApiProtection: string | undefined;
  httpApiProtection: string | undefined;
  importGaps: ImportGap[];
  /** Events left out because the resource they name was left out, by index. */
  fromOmittedResources?: number[];
};

const EVENT_TYPES = ['http', 'httpApi', 'schedule', 'sqs', 'sns', 's3'] as const;

/** Events that invoke a function synchronously or by polling; every other event invokes it asynchronously. */
const SYNCHRONOUS_EVENTS = new Set([
  'http',
  'httpApi',
  'sqs',
  'stream',
  'websocket',
  'alb',
  'kafka',
  'msk',
  'activemq',
  'rabbitmq'
]);

const triggersFor = (events: unknown, context: TriggerContext): FunctionTrigger[] => {
  const { file, functionName, dependencyNames, omittedResources, scope, importGaps } = context;
  if (!Array.isArray(events)) return [];
  const triggers: FunctionTrigger[] = [];
  const known = new Set([...dependencyNames.keys(), ...omittedResources]);
  for (const [index, event] of events.entries()) {
    if (!isRecord(event)) continue;
    const declaredType = EVENT_TYPES.find((type) => event[type] !== undefined);
    const object = `functions.${functionName}.events.${index}`;
    const review = emptyReview();
    if (declaredType !== undefined) {
      reviewKeys(event, { [declaredType]: 'carried' }, { review, unknown: 'omit' });
      const settings = event[declaredType];
      if (isRecord(settings)) {
        reviewKeys(settings, EVENT_SETTINGS[declaredType]!, { review, unknown: 'omit' });
        if (
          declaredType === 'http' &&
          settings.integration !== undefined &&
          !['lambda-proxy', 'aws-proxy', 'aws_proxy'].includes(String(settings.integration))
        ) {
          omitFor(review, `${declaredType}.integration`);
        }
        const batchSize = declaredNumber(settings.batchSize, scope);
        if (declaredType === 'sqs' && (batchSize === UNRESOLVED || batchSize === 0))
          omitFor(review, 'sqs.batchSize', 'execution');
        const window = declaredNumber(settings.maximumBatchingWindow, scope);
        if (declaredType === 'sqs' && (window === UNRESOLVED || (typeof window === 'number' && window > 300))) {
          omitFor(review, 'sqs.maximumBatchingWindow', 'execution');
        }
        const concurrency = declaredNumber(settings.maximumConcurrency, scope);
        if (
          declaredType === 'sqs' &&
          (concurrency === UNRESOLVED || (typeof concurrency === 'number' && (concurrency < 2 || concurrency > 1000)))
        ) {
          omitFor(review, 'sqs.maximumConcurrency', 'execution');
        }
        if (declaredSwitch(settings.enabled, scope) === UNRESOLVED)
          omitFor(review, `${declaredType}.enabled`, 'execution');
      }
      const reference =
        declaredType === 'sqs'
          ? isRecord(settings)
            ? settings.arn
            : settings
          : declaredType === 'sns'
            ? isRecord(settings)
              ? settings.arn
              : settings
            : declaredType === 's3'
              ? isRecord(settings)
                ? settings.bucket
                : settings
              : undefined;
      const referenced = referencedLogicalId(reference, known);
      if (referenced !== undefined && omittedResources.has(referenced)) {
        context.fromOmittedResources?.push(index);
        omitFor(review, `${declaredType}.${declaredType === 's3' ? 'bucket' : 'arn'}`);
      }
    }
    importGaps.push(...reviewGaps(file, object, review));
    if (isOmitted(review)) {
      triggers.push({
        type: 'unmapped',
        reason: 'import-gap',
        sourceType: `the ${declaredType ?? 'declared'} event ${index + 1}`
      });
      continue;
    }
    const triggerCountBefore = triggers.length;

    const http = event.http ?? event.httpApi;
    const apiProtection = event.http !== undefined ? context.restApiProtection : context.httpApiProtection;
    if (typeof http === 'string') {
      // The shorthand: `GET /users`, or `*` for the whole function over HTTP.
      const route =
        http.trim() === '*'
          ? { method: '*', path: '/{proxy+}' }
          : (() => {
              const match = /^([A-Za-z*]+)\s+(\/\S*)$/.exec(http.trim());
              return match === null ? undefined : { method: match[1]!.toUpperCase(), path: match[2]! };
            })();
      if (route === undefined) continue;
      if (apiProtection === undefined) triggers.push({ type: 'http', ...route });
      else {
        triggers.push({
          type: 'unmapped',
          reason: 'protected-route',
          sourceType: `the HTTP route ${route.method} ${route.path}, which serverless.yml protects with ${apiProtection}`
        });
      }
      continue;
    }
    if (isRecord(http)) {
      const method = typeof http.method === 'string' ? http.method : undefined;
      const path = typeof http.path === 'string' ? http.path : undefined;
      if (method !== undefined && path !== undefined) {
        const route = { method: method.toUpperCase(), path: path.startsWith('/') ? path : `/${path}` };
        const protection = routeProtection(http, apiProtection, scope);
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
      const batchSize = declaredNumber(options.batchSize, scope);
      const window = declaredNumber(options.maximumBatchingWindow, scope);
      const maximumConcurrency = declaredNumber(options.maximumConcurrency, scope);
      if (declaredSwitch(options.enabled, scope) === false) {
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
          ...(typeof batchSize === 'number' ? { batchSize } : {}),
          ...(typeof window === 'number' && window > 0 ? { maxBatchWindowSeconds: window } : {}),
          ...(typeof maximumConcurrency === 'number' ? { maximumConcurrency } : {}),
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
                  : declaredType === undefined
                    ? `a ${Object.keys(event)[0] ?? 'declared'} event`
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

const LAYER_ARN = /^arn:aws[a-z-]*:lambda:[a-z0-9-]+:\d{12}:layer:[A-Za-z0-9_-]+:\d+$/;

/** A protection the provider declares for one API type that init cannot carry, from the review that found it. */
const apiProtectionOf = (label: string, review: KeyReview): string | undefined =>
  isOmitted(review) ? `the ${label} ${review.omitted.map((entry) => entry.key).join(' and ')}` : undefined;

export const serverlessFrameworkProbe: Probe = {
  name: 'serverless-framework',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const manifests = context.files.filter((file) => /(^|\/)serverless\.ya?ml$/.test(file));
    if (manifests.length === 0) return {};

    const services: ServiceFactInput[] = [];
    const dependencies: DependencyFact[] = [];
    const importGaps: ImportGap[] = [];
    const omittedEntrypoints = new Set<string>();
    const keptEntrypoints = new Set<string>();
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
      const providerSettings = isRecord(parsed.provider) ? parsed.provider : {};
      const resourcesSection = isRecord(parsed.resources) ? parsed.resources : {};
      const cloudFormationResources = isRecord(resourcesSection.Resources) ? resourcesSection.Resources : {};
      const scope: TemplateScope = {
        parameters: isRecord(resourcesSection.Parameters) ? resourcesSection.Parameters : {},
        logicalIds: new Set(Object.keys(cloudFormationResources)),
        conditions: isRecord(resourcesSection.Conditions) ? resourcesSection.Conditions : {},
        self: parsed
      };
      const declaredRuntime = resolveDeclaredValue(providerSettings.runtime, scope);
      const runtime = typeof declaredRuntime === 'string' ? declaredRuntime : undefined;
      const providerEnvironment = isRecord(providerSettings.environment) ? providerSettings.environment : {};

      importGaps.push(...reviewGaps(file, 'top-level', reviewKeys(parsed, TOP_LEVEL)));
      importGaps.push(...reviewGaps(file, 'resources', reviewKeys(resourcesSection, RESOURCES_SECTION)));
      // The provider's own settings; its API settings decide whether their routes can be carried at all.
      const providerReview = reviewKeys(providerSettings, PROVIDER);
      // `provider.iam.role` is a role ARN or the statements, managed policies and boundary of the generated role.
      const iam = isRecord(providerSettings.iam) ? providerSettings.iam : {};
      reviewKeys(iam, { role: 'carried', deploymentRole: 'ignored' }, { prefix: 'iam.', review: providerReview });
      reviewKeys(
        iam.role,
        { statements: 'carried', managedPolicies: 'carried', name: 'ignored', path: 'ignored', tags: 'ignored' },
        { prefix: 'iam.role.', review: providerReview, unknown: 'permissions' }
      );
      const permissionContext = {
        scope,
        dependencyNames: new Map<string, string>(),
        variableDependencies: new Map<string, string>()
      };
      const declaredProviderStatements = isRecord(iam.role) ? iam.role.statements : providerSettings.iamRoleStatements;
      const functionWide = providerReview.omitted.filter((entry) =>
        ['network', 'encryption', 'permissions'].includes(entry.concern ?? '')
      );
      const restReview = reviewKeys(providerSettings.apiGateway, API_GATEWAY, { prefix: 'apiGateway.' });
      for (const entry of providerReview.omitted) {
        if (entry.key === 'vpcEndpointIds' || entry.key === 'resourcePolicy') restReview.omitted.push(entry);
      }
      const endpointType = resolveDeclaredValue(providerSettings.endpointType, scope);
      if (
        providerSettings.endpointType !== undefined &&
        endpointType !== 'REGIONAL' &&
        endpointType !== 'regional' &&
        endpointType !== 'EDGE' &&
        endpointType !== 'edge'
      ) {
        omitFor(restReview, 'endpointType', 'access');
      }
      const httpApiReview = reviewKeys(providerSettings.httpApi, HTTP_API, { prefix: 'httpApi.' });
      const restApiProtection = apiProtectionOf("REST API's", restReview);
      const httpApiProtection = apiProtectionOf("HTTP API's", httpApiReview);
      importGaps.push(
        ...reviewGaps(file, 'provider', {
          omitted: [],
          notCarried: [...providerReview.notCarried, ...restReview.notCarried, ...httpApiReview.notCarried]
        })
      );
      if (restApiProtection !== undefined)
        importGaps.push(...reviewGaps(file, 'provider.apiGateway', { omitted: restReview.omitted, notCarried: [] }));
      if (httpApiProtection !== undefined)
        importGaps.push(...reviewGaps(file, 'provider.httpApi', { omitted: httpApiReview.omitted, notCarried: [] }));

      const resourceEntries = Object.entries(cloudFormationResources).filter(
        (entry): entry is [string, RecordValue] => isRecord(entry[1]) && typeof entry[1].Type === 'string'
      );
      const resourceNames = new Map(
        resourceEntries
          .filter(([, resource]) => resource.Type === 'AWS::SQS::Queue')
          .map(([logicalId]) => [logicalId, ''])
      );
      const kindCounts = new Map<DependencyKind, number>();
      for (const [, resource] of resourceEntries) {
        const kind = resourceKind(resource);
        if (kind !== undefined) kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
      }
      for (const [logicalId, resource] of resourceEntries) {
        const kind = resourceKind(resource);
        if (kind !== undefined)
          resourceNames.set(
            logicalId,
            (kindCounts.get(kind) ?? 0) === 1 ? defaultDependencyName(kind) : factName(logicalId)
          );
      }
      const dependencyNames = new Map<string, string>();
      const omittedResources = new Set<string>();
      const manifestDependencies: DependencyFact[] = [];
      const notImported: string[] = [];
      const userPoolReviews = new Map<string, KeyReview>();
      for (const [logicalId, resource] of resourceEntries) {
        const review = reviewKeys(resource, RESOURCE_ATTRIBUTES);
        conditionReview(resource, scope, review);
        const kind = resourceKind(resource);
        if (resource.Type === 'AWS::Cognito::UserPool' || resource.Type === 'AWS::Cognito::UserPoolClient') {
          userPoolReviews.set(logicalId, review);
          continue;
        }
        if (kind === undefined) {
          if (isOmitted(review)) importGaps.push(...reviewGaps(file, logicalId, review));
          else notImported.push(logicalId);
          continue;
        }
        const properties = isRecord(resource.Properties) ? resource.Properties : {};
        const settings = declaredDependencySettings(String(resource.Type), properties, scope, review, resourceNames);
        importGaps.push(...reviewGaps(file, logicalId, review));
        if (isOmitted(review)) {
          omittedResources.add(logicalId);
          continue;
        }
        const name = resourceNames.get(logicalId)!;
        dependencyNames.set(logicalId, name);
        const citation = citeFirstMatchOnly(file, raw, new RegExp(`^\\s*${escapeRegExp(logicalId)}:`));
        const engineVersion = engineVersionOf(resource);
        const mariadb = String(properties.Engine).toLowerCase() === 'mariadb';
        manifestDependencies.push({
          ...manifestDependencyFact(name, kind, citation, settings.queueSettings),
          ...(settings.tableKey === undefined ? {} : { tableKey: settings.tableKey }),
          ...(settings.bucketVersioning === true ? { bucketVersioning: true as const } : {}),
          ...(engineVersion === undefined ? {} : { engineVersion }),
          ...(mariadb ? { mysqlEngine: 'mariadb' as const } : {})
        });
      }
      // User pools, and the app client each variable names. A variable naming a client is bound to its pool.
      const userPools = declaredUserPools(
        Object.fromEntries(resourceEntries.filter(([logicalId]) => userPoolReviews.has(logicalId))),
        scope,
        userPoolReviews
      );
      for (const pool of userPools.pools) {
        if (isOmitted(pool.review)) omittedResources.add(pool.logicalId);
        else dependencyNames.set(pool.logicalId, pool.name);
        importGaps.push(...reviewGaps(file, pool.logicalId, pool.review));
      }
      for (const [client, review] of userPools.clientReviews) {
        const pool = userPools.clientPools.get(client);
        if (pool !== undefined) dependencyNames.set(client, pool);
        else if (!userPools.omittedClients.has(client)) notImported.push(client);
        importGaps.push(...reviewGaps(file, client, review));
      }
      for (const pool of userPools.pools) {
        if (isOmitted(pool.review)) continue;
        manifestDependencies.push({
          ...manifestDependencyFact(
            pool.name,
            'user-pool',
            citeFirstMatchOnly(file, raw, new RegExp(`^\\s*${escapeRegExp(pool.logicalId)}:`))
          ),
          userPoolOwnership: 'project',
          ...(pool.settings === undefined ? {} : { userPoolSettings: pool.settings })
        });
      }
      importGaps.push(...notImportedGap(file, notImported));
      const constructs = isRecord(parsed.constructs) ? parsed.constructs : {};
      const constructEntries = Object.entries(constructs).filter(
        (entry): entry is [string, RecordValue] =>
          isRecord(entry[1]) && (entry[1].type === 'storage' || entry[1].type === 'queue')
      );
      importGaps.push(
        ...notImportedGap(
          file,
          Object.keys(constructs).filter((name) => !constructEntries.some(([constructName]) => constructName === name))
        )
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
      // A queue whose dead-letter queue was left out would retry failing messages until they expire, so it is left out
      // too, and so is every queue that sends its failures to it. A kept dead-letter queue is used by no function.
      for (let changed = true; changed;) {
        changed = false;
        // A copy: queues are removed from the list while it is walked.
        for (const dependency of manifestDependencies.slice()) {
          const target = dependency.queueSettings?.deadLetter?.dependencyName;
          if (target === undefined || manifestDependencies.some((entry) => entry.name === target)) continue;
          const logicalId = [...dependencyNames].find(([, name]) => name === dependency.name)?.[0] ?? dependency.name;
          importGaps.push(...reviewGaps(file, logicalId, omitFor(emptyReview(), 'RedrivePolicy', 'failure-handling')));
          manifestDependencies.splice(manifestDependencies.indexOf(dependency), 1);
          dependencyNames.delete(logicalId);
          omittedResources.add(logicalId);
          changed = true;
        }
      }
      for (const dependency of manifestDependencies) {
        const target = manifestDependencies.find(
          (entry) => entry.name === dependency.queueSettings?.deadLetter?.dependencyName
        );
        for (const citation of target?.evidence ?? []) citation.field = 'deadLetterTarget';
      }
      const environmentDependencyNames = environmentDependencyNamesFor(
        resourceEntries,
        dependencyNames,
        providerEnvironment
      );
      for (const [logicalId, name] of dependencyNames) permissionContext.dependencyNames.set(logicalId, name);
      for (const [variable, name] of environmentDependencyNames) {
        permissionContext.variableDependencies.set(`self:provider.environment.${variable}`, name);
      }

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
        const object = `functions.${functionName}`;
        const review = reviewKeys(declaration, FUNCTION);
        // Failure destinations and retries apply to asynchronous invocations only; without such a trigger nothing
        // reaches them.
        const events = Array.isArray(declaration.events) ? declaration.events : [];
        const asynchronous = events.some(
          (event) => !isRecord(event) || Object.keys(event).some((type) => !SYNCHRONOUS_EVENTS.has(type))
        );
        if (!asynchronous) {
          review.omitted = review.omitted.filter((entry) => {
            if (entry.concern !== 'failure-handling') return true;
            review.notCarried.push(entry.key);
            return false;
          });
        }
        for (const entry of functionWide) omitFor(review, `provider.${entry.key}`, entry.concern);
        // The function's own statements (`serverless-iam-roles-per-function`) replace the provider's unless it inherits.
        const inheritsProvider =
          declaration.iamRoleStatements === undefined || declaration.iamRoleStatementsInherit === true;
        const noStatements: ReturnType<typeof declaredStatements> = { statements: [], dropped: [] };
        const providerStatements =
          declaredProviderStatements === undefined || !inheritsProvider
            ? noStatements
            : declaredStatements(declaredProviderStatements, permissionContext, 'provider.iam.role.statements');
        const ownStatements =
          declaration.iamRoleStatements === undefined
            ? noStatements
            : declaredStatements(declaration.iamRoleStatements, permissionContext, 'iamRoleStatements');
        for (const statements of [providerStatements, ownStatements]) {
          review.notCarried.push(...statements.dropped);
          if (statements.blocking !== undefined) omitFor(review, statements.blocking, 'permissions');
        }
        // A role or managed policies the permissions come from, which init cannot read: the function gets none of them.
        const providerRole = typeof iam.role === 'string' || providerSettings.role !== undefined;
        const managedPolicies =
          providerSettings.iamManagedPolicies !== undefined ||
          (isRecord(iam.role) && iam.role.managedPolicies !== undefined);
        if (providerRole) review.notCarried.push('provider.role');
        if (managedPolicies) review.notCarried.push('provider.iamManagedPolicies');
        if (declaration.role !== undefined) review.notCarried.push('role');
        const declaresStatements =
          declaredProviderStatements !== undefined ||
          declaration.iamRoleStatements !== undefined ||
          providerRole ||
          managedPolicies ||
          declaration.role !== undefined;
        const functionStatements =
          declaration.role !== undefined || (providerRole && declaration.iamRoleStatements === undefined)
            ? []
            : [...providerStatements.statements, ...ownStatements.statements];
        const sizing = declaredSizing(
          declaration.timeout ?? providerSettings.timeout,
          declaration.memorySize ?? providerSettings.memorySize,
          scope
        );
        for (const setting of sizing.unresolved)
          omitFor(review, setting === 'timeout' ? 'timeout' : 'memorySize', 'execution');
        const reserved = declaredNumber(declaration.reservedConcurrency, scope);
        if (reserved === UNRESOLVED) omitFor(review, 'reservedConcurrency', 'execution');
        const declaredArchitecture = resolveDeclaredValue(
          declaration.architecture ?? providerSettings.architecture,
          scope
        );
        const architecture =
          declaredArchitecture === 'arm64' || declaredArchitecture === 'x86_64' ? declaredArchitecture : undefined;
        if ((declaration.architecture ?? providerSettings.architecture) !== undefined && architecture === undefined) {
          review.notCarried.push('architecture');
        }
        const declaredLayers = resolveDeclaredValue(declaration.layers ?? providerSettings.layers, scope);
        const layers =
          Array.isArray(declaredLayers) &&
          declaredLayers.every((layer) => typeof layer === 'string' && LAYER_ARN.test(layer))
            ? (declaredLayers as string[]).slice(0, 5)
            : undefined;
        if ((declaration.layers ?? providerSettings.layers) !== undefined && layers === undefined)
          review.notCarried.push('layers');
        if (isOmitted(review)) {
          importGaps.push(...reviewGaps(file, object, review));
          omittedEntrypoints.add(entrypoint);
          continue;
        }
        const fromOmittedResources: number[] = [];
        const functionTriggers = triggersFor(declaration.events, {
          fromOmittedResources,
          file,
          functionName,
          dependencyNames,
          omittedResources,
          scope,
          restApiProtection,
          httpApiProtection,
          importGaps
        });
        // A consumer whose every event names a resource init left out has nothing left to do here.
        if (functionTriggers.length > 0 && fromOmittedResources.length === functionTriggers.length) {
          for (const index of fromOmittedResources) omitFor(review, `events.${index}`);
          importGaps.push(...reviewGaps(file, object, review));
          omittedEntrypoints.add(entrypoint);
          continue;
        }
        importGaps.push(...reviewGaps(file, object, review));
        keptEntrypoints.add(entrypoint);

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
        const declaredFunctionRuntime = resolveDeclaredValue(declaration.runtime, scope);

        services.push({
          name: serviceName,
          path: directory,
          // Several functions share the manifest's directory; the name is what keeps them apart.
          processType: `serverless:${functionName}`,
          language: languageForRuntime(
            typeof declaredFunctionRuntime === 'string' ? declaredFunctionRuntime : runtime,
            entrypoint
          ),
          exposesHttp: false,
          executionModel: 'per-request',
          functionEntrypoint: entrypoint,
          ...(handlerExport === undefined ? {} : { functionHandler: handlerExport }),
          ...sizing.settings,
          ...(layers === undefined || layers.length === 0 ? {} : { functionLayers: layers }),
          ...(architecture === undefined ? {} : { functionArchitecture: architecture }),
          ...(typeof reserved === 'number' ? { functionReservedConcurrency: reserved } : {}),
          ...(declaresStatements ? { functionIamStatements: functionStatements } : {}),
          functionTriggers,
          environmentVariables,
          evidence: citation === undefined ? [] : [citation],
          source: 'probe'
        });
      }
      dependencies.push(...manifestDependencies);
    }

    return importerOutput({
      services,
      dependencies,
      importGaps: groupEventGaps(importGaps),
      omittedEntrypoints,
      keptEntrypoints
    });
  }
};
