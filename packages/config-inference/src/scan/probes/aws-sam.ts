/** Facts declared by an AWS SAM template. */

import { posix } from 'node:path';
import type { DependencyFact, DependencyKind } from '../../facts/dependency';
import type { ImportGap } from '../../facts/project-facts';
import type { EnvironmentVariableUse, FunctionTrigger, ServiceFactInput } from '../../facts/service';
import { parseCloudFormationYaml } from '../cloudformation-yaml';
import { citeFirstMatchOnly, citeLine, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { declaredEnvironmentVariable } from './declared-environment';
import {
  ABSENT,
  conditionHolds,
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
  conditionReview,
  declaredDependencySettings,
  declaredUserPools,
  referencedLogicalId,
  RESOURCE_ATTRIBUTES
} from './cloudformation-resources';
import {
  emptyReview,
  importerOutput,
  isOmitted,
  notImportedGap,
  omitFor,
  reviewGaps,
  reviewKeys,
  safeDeclaredName,
  type KeyReview,
  type KeyRules
} from './declared-keys';

type RecordValue = Record<string, unknown>;

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
  if (codeUriValue !== undefined && typeof codeUriValue !== 'string') return undefined;
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
    // Two modules can hold the same class name; the function's own CodeUri says which one it is.
    const inCodeUri = matches.filter((file) => codeUri !== '.' && file.startsWith(`${codeUri}/`));
    if (inCodeUri.length === 1) return inCodeUri[0];
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

// ── What each declaration may contain, and what init does with it ─────────────────────────────────────────────────

const FUNCTION_PROPERTIES: KeyRules = {
  CodeUri: 'carried',
  Handler: 'carried',
  Runtime: 'carried',
  Environment: 'carried',
  Events: 'carried',
  Timeout: 'carried',
  MemorySize: 'carried',
  Layers: 'carried',
  Architectures: 'carried',
  ReservedConcurrentExecutions: 'carried',
  Description: 'ignored',
  FunctionName: 'ignored',
  Tags: 'ignored',
  PropagateTags: 'ignored',
  AutoPublishAlias: 'ignored',
  AutoPublishAliasAllProperties: 'ignored',
  AutoPublishCodeSha256: 'ignored',
  VersionDescription: 'ignored',
  Tracing: 'ignored',
  LoggingConfig: 'ignored',
  RolePath: 'ignored',
  RuntimeManagementConfig: 'ignored',
  // Without them the function has only the permissions Stacktape grants: less access, not more.
  Policies: 'not-carried',
  Role: 'not-carried',
  AssumeRolePolicyDocument: 'not-carried',
  PermissionsBoundary: 'not-carried',
  DeploymentPreference: 'not-carried',
  ProvisionedConcurrencyConfig: 'not-carried',
  EphemeralStorage: 'not-carried',
  SnapStartConfig: 'not-carried',
  RecursiveLoop: 'not-carried',
  // No URL is created for it, which exposes nothing.
  FunctionUrlConfig: 'not-carried',
  VpcConfig: 'network',
  FileSystemConfigs: 'storage',
  DeadLetterQueue: 'failure-handling',
  EventInvokeConfig: 'failure-handling',
  KmsKeyArn: 'encryption',
  SourceKmsKeyArn: 'encryption',
  CodeSigningConfigArn: 'code-integrity',
  ImageUri: 'omit',
  ImageConfig: 'omit',
  PackageType: 'carried',
  InlineCode: 'omit'
};

const API_AUTH: KeyRules = {
  DefaultAuthorizer: 'carried',
  Authorizers: 'carried',
  ApiKeyRequired: 'carried',
  AddDefaultAuthorizerToCorsPreflight: 'ignored',
  AddApiKeyRequiredToCorsPreflight: 'ignored',
  InvokeRole: 'not-carried',
  ResourcePolicy: 'access',
  UsagePlan: 'access'
};

const API_PROPERTIES: KeyRules = {
  Auth: 'carried',
  EndpointConfiguration: 'carried',
  StageName: 'ignored',
  Name: 'ignored',
  Description: 'ignored',
  Tags: 'ignored',
  PropagateTags: 'ignored',
  TracingEnabled: 'ignored',
  AccessLogSetting: 'ignored',
  CacheClusterEnabled: 'ignored',
  CacheClusterSize: 'ignored',
  MinimumCompressionSize: 'ignored',
  OpenApiVersion: 'ignored',
  MergeDefinitions: 'ignored',
  AlwaysDeploy: 'ignored',
  FailOnWarnings: 'ignored',
  Mode: 'ignored',
  CanarySetting: 'ignored',
  Variables: 'not-carried',
  MethodSettings: 'not-carried',
  Cors: 'not-carried',
  GatewayResponses: 'not-carried',
  BinaryMediaTypes: 'not-carried',
  Models: 'not-carried',
  Domain: 'not-carried',
  // An OpenAPI definition can state its own routes, authorizers and policies.
  DefinitionBody: 'access',
  DefinitionUri: 'access',
  DisableExecuteApiEndpoint: 'access',
  ApiKeySourceType: 'access'
};

const HTTP_API_AUTH: KeyRules = {
  DefaultAuthorizer: 'carried',
  Authorizers: 'carried',
  EnableIamAuthorizer: 'ignored'
};

const HTTP_API_PROPERTIES: KeyRules = {
  Auth: 'carried',
  StageName: 'ignored',
  Name: 'ignored',
  Description: 'ignored',
  Tags: 'ignored',
  PropagateTags: 'ignored',
  FailOnWarnings: 'ignored',
  AccessLogSettings: 'ignored',
  CorsConfiguration: 'not-carried',
  Domain: 'not-carried',
  StageVariables: 'not-carried',
  DefaultRouteSettings: 'not-carried',
  RouteSettings: 'not-carried',
  DefinitionBody: 'access',
  DefinitionUri: 'access',
  DisableExecuteApiEndpoint: 'access'
};

/** The `Properties` of each event type init translates. Anything else leaves the event out. */
const EVENT_PROPERTIES: Readonly<Record<string, KeyRules>> = {
  Api: {
    Path: 'carried',
    Method: 'carried',
    RestApiId: 'carried',
    Auth: 'carried',
    TimeoutInMillis: 'not-carried',
    // Request validation the handler may rely on.
    RequestParameters: 'omit',
    RequestModel: 'omit'
  },
  HttpApi: {
    Path: 'carried',
    Method: 'carried',
    ApiId: 'carried',
    Auth: 'carried',
    PayloadFormatVersion: 'carried',
    TimeoutInMillis: 'not-carried',
    RouteSettings: 'not-carried'
  },
  Schedule: {
    Schedule: 'carried',
    Enabled: 'carried',
    State: 'carried',
    Input: 'carried',
    Name: 'ignored',
    Description: 'ignored',
    RetryPolicy: 'failure-handling',
    DeadLetterConfig: 'failure-handling'
  },
  ScheduleV2: {
    ScheduleExpression: 'carried',
    ScheduleExpressionTimezone: 'carried',
    State: 'carried',
    Input: 'carried',
    Name: 'ignored',
    Description: 'ignored',
    GroupName: 'ignored',
    OmitName: 'ignored',
    RoleArn: 'ignored',
    PermissionsBoundary: 'ignored',
    FlexibleTimeWindow: 'not-carried',
    StartDate: 'execution',
    EndDate: 'execution',
    RetryPolicy: 'failure-handling',
    DeadLetterConfig: 'failure-handling',
    KmsKeyArn: 'encryption'
  },
  SQS: {
    Queue: 'carried',
    BatchSize: 'carried',
    Enabled: 'carried',
    FilterCriteria: 'carried',
    FunctionResponseTypes: 'carried',
    MaximumBatchingWindowInSeconds: 'carried',
    ScalingConfig: 'execution',
    KmsKeyArn: 'encryption'
  },
  SNS: {
    Topic: 'carried',
    FilterPolicy: 'carried',
    FilterPolicyScope: 'carried',
    Region: 'omit',
    SqsSubscription: 'omit',
    RedrivePolicy: 'failure-handling'
  },
  S3: { Bucket: 'carried', Events: 'carried', Filter: 'carried' }
};

const APPLICATION_PROPERTIES: KeyRules = {
  Location: 'carried',
  Parameters: 'carried',
  Tags: 'ignored',
  NotificationARNs: 'ignored',
  TimeoutInMinutes: 'ignored'
};

/** Resource types read above as user pools and their app clients. */
const READ_ELSEWHERE = new Set(['AWS::Cognito::UserPool', 'AWS::Cognito::UserPoolClient']);

/** Event sources that invoke a function synchronously or by polling; every other source invokes it asynchronously. */
const SYNCHRONOUS_EVENTS = new Set([
  'Api',
  'HttpApi',
  'SQS',
  'Kinesis',
  'DynamoDB',
  'MSK',
  'MQ',
  'SelfManagedKafka',
  'DocumentDB'
]);

const hasAsynchronousEvent = (events: unknown, scope: TemplateScope): boolean =>
  isRecord(events) &&
  Object.values(events).some((declared) => {
    const event = selectBranch(declared, scope);
    return !isRecord(event) || typeof event.Type !== 'string' || !SYNCHRONOUS_EVENTS.has(event.Type);
  });

// ── Templates ───────────────────────────────────────────────────────────────────────────────────────────────────────

type Template = {
  path: string;
  raw: string;
  parsed: RecordValue;
  /** What a parent passes to its parameters, when this is a nested application's template. */
  parameterValues?: Record<string, unknown>;
  /** The parent's application resource is not provably created, so nothing here is either. */
  inactiveParent?: string;
};

type ApiState = { kind: 'ok'; auth: RecordValue } | { kind: 'omitted'; description: string };

/** Review an API resource's (or the implicit API's) declared settings; routes on an API left out are left out too. */
const apiState = (
  type: string,
  properties: RecordValue,
  label: string,
  review: KeyReview,
  scope: TemplateScope
): ApiState => {
  const rules = type === 'Api' ? API_PROPERTIES : HTTP_API_PROPERTIES;
  reviewKeys(properties, rules, { review });
  reviewKeys(properties.Auth, type === 'Api' ? API_AUTH : HTTP_API_AUTH, {
    prefix: 'Auth.',
    review,
    unknown: 'access'
  });
  if (type === 'Api' && properties.EndpointConfiguration !== undefined) {
    const configuration = resolveDeclaredValue(properties.EndpointConfiguration, scope);
    const endpointType =
      typeof configuration === 'string' ? configuration : isRecord(configuration) ? configuration.Type : undefined;
    const others = isRecord(configuration) ? Object.keys(configuration).filter((key) => key !== 'Type') : [];
    if ((endpointType !== 'REGIONAL' && endpointType !== 'EDGE') || others.length > 0) {
      omitFor(review, 'EndpointConfiguration', 'access');
    }
  }
  if (isOmitted(review)) {
    return {
      kind: 'omitted',
      description: `the ${label} API's ${review.omitted.map((entry) => entry.key).join(' and ')}`
    };
  }
  return { kind: 'ok', auth: isRecord(properties.Auth) ? properties.Auth : {} };
};

/**
 * The authorization a SAM `Api`/`HttpApi` event inherits: its own `Auth`, else the `Auth` defaults of the API it names
 * through `RestApiId`/`ApiId`, else the `Globals` defaults for that API type. A route on an API init left out, or on
 * an API it cannot resolve, is described rather than made public.
 */
const routeProtection = (
  eventType: string,
  properties: RecordValue,
  apis: ReadonlyMap<string, ApiState>,
  implicitApi: ApiState,
  scope: TemplateScope
): 'aws-iam' | string | undefined => {
  const apiReference = eventType === 'Api' ? properties.RestApiId : properties.ApiId;
  let state = implicitApi;
  if (apiReference !== undefined) {
    const selected = selectBranch(apiReference, scope);
    const apiId = isRecord(selected) && typeof selected.Ref === 'string' ? selected.Ref : undefined;
    const declared = apiId === undefined ? undefined : apis.get(apiId);
    if (declared === undefined) return 'an API init cannot resolve';
    state = declared;
  }
  if (state.kind === 'omitted') return state.description;
  const auth = isRecord(properties.Auth) ? properties.Auth : {};
  const defaults = state.auth;
  if ((auth.ApiKeyRequired ?? defaults.ApiKeyRequired) === true) return 'an API key (ApiKeyRequired)';
  if (auth.ResourcePolicy !== undefined) return 'a resource policy';
  const authorizer = auth.Authorizer ?? defaults.DefaultAuthorizer;
  if (authorizer === undefined || authorizer === 'NONE') return undefined;
  if (authorizer === 'AWS_IAM') return 'aws-iam';
  return typeof authorizer === 'string' ? `the ${JSON.stringify(authorizer)} authorizer` : 'an authorizer';
};

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
  if (Object.keys(resolved).length !== 1 || Object.keys(resolved.S3Key).some((key) => key !== 'Rules'))
    return UNRESOLVED;
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

type TriggerContext = {
  file: string;
  functionId: string;
  dependencyNames: ReadonlyMap<string, string>;
  /** Resources init left out, by logical ID: an event from one of them is left out too. */
  omittedResources: ReadonlySet<string>;
  apis: ReadonlyMap<string, ApiState>;
  implicitApis: Readonly<Record<'Api' | 'HttpApi', ApiState>>;
  scope: TemplateScope;
  importGaps: ImportGap[];
};

/** An event left out because of what it declares; the import gap says which key. */
const leftOut = (eventType: string, eventName: string): FunctionTrigger => ({
  type: 'unmapped',
  reason: 'import-gap',
  sourceType: `the ${eventType} event ${safeDeclaredName(eventName)}`
});

const triggersFor = (eventsValue: unknown, context: TriggerContext): FunctionTrigger[] => {
  const { file, functionId, dependencyNames, omittedResources, apis, implicitApis, scope, importGaps } = context;
  if (!isRecord(eventsValue)) return [];
  const triggers: FunctionTrigger[] = [];
  const known = new Set([...dependencyNames.keys(), ...omittedResources]);
  for (const [eventName, declaredEvent] of Object.entries(eventsValue)) {
    const object = `${functionId}.Events.${eventName}`;
    const event = selectBranch(declaredEvent, scope);
    // The condition selects no event: CloudFormation creates none either.
    if (event === ABSENT) continue;
    const review = emptyReview();
    if (event === UNRESOLVED) omitFor(review, 'Fn::If', 'condition');
    if (!isRecord(event) || typeof event.Type !== 'string') {
      importGaps.push(...reviewGaps(file, object, isOmitted(review) ? review : omitFor(review, 'Type')));
      triggers.push(leftOut('declared', eventName));
      continue;
    }
    reviewKeys(event, { Type: 'carried', Properties: 'carried' }, { review, unknown: 'omit' });
    const rules = EVENT_PROPERTIES[event.Type];
    if (rules === undefined) {
      // A type init does not translate: the event is reported as untranslated, which covers its settings too.
      triggers.push({ type: 'unmapped', sourceType: `a ${event.Type} event` });
      continue;
    }
    const properties = isRecord(event.Properties) ? event.Properties : {};
    reviewKeys(properties, rules, { review, unknown: 'omit' });
    if (event.Type === 'Api' || event.Type === 'HttpApi') {
      reviewKeys(
        properties.Auth,
        event.Type === 'Api'
          ? {
              Authorizer: 'carried',
              ApiKeyRequired: 'carried',
              AuthorizationScopes: 'carried',
              OverrideApiAuth: 'ignored',
              InvokeRole: 'not-carried',
              ResourcePolicy: 'carried'
            }
          : { Authorizer: 'carried', AuthorizationScopes: 'carried' },
        { prefix: 'Auth.', review, unknown: 'access' }
      );
    }

    // The settings init reads, resolved the way CloudFormation would with the parameters' defaults.
    const enabled = declaredSwitch(properties.Enabled, scope);
    const state = properties.State === undefined ? undefined : resolveDeclaredValue(properties.State, scope);
    if (enabled === UNRESOLVED) omitFor(review, 'Properties.Enabled', 'execution');
    if (state !== undefined && state !== 'ENABLED' && state !== 'DISABLED')
      omitFor(review, 'Properties.State', 'execution');
    const batchSize = declaredNumber(properties.BatchSize, scope);
    if (batchSize === UNRESOLVED || batchSize === 0) omitFor(review, 'Properties.BatchSize', 'execution');
    const batchWindow = declaredNumber(properties.MaximumBatchingWindowInSeconds, scope);
    if (batchWindow === UNRESOLVED || (typeof batchWindow === 'number' && batchWindow > 300)) {
      omitFor(review, 'Properties.MaximumBatchingWindowInSeconds', 'execution');
    }
    const path = properties.Path === undefined ? undefined : resolveDeclaredValue(properties.Path, scope);
    const method = properties.Method === undefined ? '*' : resolveDeclaredValue(properties.Method, scope);
    if (
      (event.Type === 'Api' || event.Type === 'HttpApi') &&
      (typeof path !== 'string' || typeof method !== 'string')
    ) {
      omitFor(review, typeof path !== 'string' ? 'Properties.Path' : 'Properties.Method');
    }
    const declaredSchedule = properties.Schedule ?? properties.ScheduleExpression;
    const schedule = declaredSchedule === undefined ? undefined : resolveDeclaredValue(declaredSchedule, scope);
    if ((event.Type === 'Schedule' || event.Type === 'ScheduleV2') && typeof schedule !== 'string') {
      omitFor(review, event.Type === 'Schedule' ? 'Properties.Schedule' : 'Properties.ScheduleExpression');
    }
    const referenceField = event.Type === 'SQS' ? 'Queue' : event.Type === 'SNS' ? 'Topic' : 'Bucket';
    const logicalId = referencedLogicalId(selectBranch(properties[referenceField], scope), known);
    if (logicalId !== undefined && omittedResources.has(logicalId)) {
      omitFor(review, `Properties.${referenceField}`);
    }

    if (isOmitted(review)) {
      importGaps.push(...reviewGaps(file, object, review));
      triggers.push(leftOut(event.Type, eventName));
      continue;
    }
    importGaps.push(...reviewGaps(file, object, review));

    if (event.Type === 'Api' || event.Type === 'HttpApi') {
      const route = { method: String(method), path: String(path) };
      const protection = routeProtection(event.Type, properties, apis, implicitApis[event.Type], scope);
      const payloadFormat = resolveDeclaredValue(properties.PayloadFormatVersion, scope);
      const format = payloadFormat === '2.0' ? { payloadFormat: '2.0' as const } : {};
      if (protection === undefined) triggers.push({ type: 'http', ...route, ...format });
      else if (protection === 'aws-iam') triggers.push({ type: 'http', ...route, ...format, authorization: 'aws-iam' });
      else {
        triggers.push({
          type: 'unmapped',
          reason: 'protected-route',
          sourceType: `the HTTP route ${route.method.toUpperCase()} ${route.path}, which your SAM template protects with ${protection}`
        });
      }
      continue;
    }
    if (event.Type === 'Schedule' || event.Type === 'ScheduleV2') {
      const rate = String(schedule);
      // EventBridge rules run in UTC.
      if (properties.ScheduleExpressionTimezone !== undefined) {
        const timezone = resolveDeclaredValue(properties.ScheduleExpressionTimezone, scope);
        triggers.push({
          type: 'unmapped',
          sourceType: `the schedule ${rate} in the ${typeof timezone === 'string' ? timezone : 'declared'} time zone`
        });
        continue;
      }
      const declaredInput = properties.Input === undefined ? undefined : resolveDeclaredValue(properties.Input, scope);
      const input = typeof declaredInput === 'string' ? declaredInput : undefined;
      if (declaredInput !== undefined && input === undefined) {
        triggers.push({
          type: 'unmapped',
          sourceType: `the schedule ${rate} with an Input payload init cannot resolve`
        });
        continue;
      }
      triggers.push({
        type: 'schedule',
        rate,
        ...(enabled === false || state === 'DISABLED' ? { enabled: false } : {}),
        ...(input === undefined || input === '' ? {} : { input })
      });
      continue;
    }
    const dependencyName = logicalId === undefined ? undefined : dependencyNames.get(logicalId);
    if (dependencyName === undefined) {
      triggers.push({ type: 'unmapped', sourceType: `a ${event.Type} event whose resource could not be resolved` });
      continue;
    }
    if (event.Type === 'SQS' && enabled === false) {
      triggers.push({ type: 'unmapped', reason: 'disabled', sourceType: `the event from the ${dependencyName} queue` });
    } else if (event.Type === 'SQS' && properties.FilterCriteria !== undefined) {
      triggers.push({
        type: 'unmapped',
        sourceType: `messages from the ${dependencyName} queue that match its FilterCriteria, which Stacktape cannot filter`
      });
    } else if (event.Type === 'SQS') {
      const responseTypes = resolveDeclaredValue(properties.FunctionResponseTypes, scope);
      triggers.push({
        type: 'queue',
        dependencyName,
        ...(typeof batchSize === 'number' ? { batchSize } : {}),
        ...(typeof batchWindow === 'number' && batchWindow > 0 ? { maxBatchWindowSeconds: batchWindow } : {}),
        ...(Array.isArray(responseTypes) && responseTypes.includes('ReportBatchItemFailures')
          ? { reportBatchItemFailures: true }
          : {})
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
    } else {
      // One Stacktape S3 event takes one event type; a list becomes one event per type rather than the default.
      const declaredTypes = resolveDeclaredValue(properties.Events, scope);
      const eventTypes = (Array.isArray(declaredTypes) ? declaredTypes : [declaredTypes]).filter(
        (eventType): eventType is string => typeof eventType === 'string' && eventType !== ''
      );
      const filter = keyFilter(properties.Filter, scope);
      if (filter === UNRESOLVED || declaredTypes === UNRESOLVED) {
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
    }
  }
  return triggers;
};

const LAYER_ARN = /^arn:aws[a-z-]*:lambda:[a-z0-9-]+:\d{12}:layer:[A-Za-z0-9_-]+:\d+$/;

/** The local template a nested application's `Location` names, when it is in the repository. */
const nestedLocation = (context: ProbeContext, templatePath: string, location: unknown): string | undefined => {
  if (typeof location !== 'string' || /^(?:s3|https?):\/\//.test(location)) return undefined;
  const directory = posix.dirname(templatePath);
  const target = posix.normalize(directory === '.' ? location : posix.join(directory, location));
  return target.startsWith('../') || !context.files.includes(target) ? undefined : target;
};

/**
 * Templates the scan finds, followed by the local templates their nested applications name, each with the parameter
 * values its parent passes. Every template is read before any parent's values are applied, so the result does not
 * depend on which file the listing names first.
 */
const readTemplates = async (context: ProbeContext): Promise<Template[]> => {
  const queue = context.files.filter((path) => /(^|\/)(?:template|sam-template)\.ya?ml$/.test(path)).slice(0, 20);
  const read = new Map<string, Template>();
  const referenced = new Set<string>();
  for (let index = 0; index < queue.length && index < 40; index += 1) {
    const path = queue[index]!;
    if (read.has(path)) continue;
    // oxlint-disable-next-line no-await-in-loop -- each template is a separate app boundary.
    const raw = await readText(context, path, { fullFile: true });
    if (raw === undefined || (!/AWS::Serverless-2016-10-31/.test(raw) && !referenced.has(path))) continue;
    let parsed: unknown;
    try {
      parsed = parseCloudFormationYaml(raw);
    } catch {
      continue;
    }
    if (!isRecord(parsed) || !isRecord(parsed.Resources)) continue;
    read.set(path, { path, raw, parsed });
    for (const resource of Object.values(parsed.Resources)) {
      if (!isRecord(resource) || resource.Type !== 'AWS::Serverless::Application') continue;
      const target = nestedLocation(
        context,
        path,
        isRecord(resource.Properties) ? resource.Properties.Location : undefined
      );
      if (target === undefined) continue;
      referenced.add(target);
      if (!queue.includes(target)) queue.push(target);
    }
  }
  // Parents pass values down one level per round; three rounds cover any nesting a repository plausibly has.
  for (let round = 0; round < 3; round += 1) {
    for (const template of read.values()) {
      const scope = templateScope(template);
      for (const [logicalId, resource] of Object.entries(template.parsed.Resources as RecordValue)) {
        if (!isRecord(resource) || resource.Type !== 'AWS::Serverless::Application') continue;
        const properties = isRecord(resource.Properties) ? resource.Properties : {};
        const child = read.get(nestedLocation(context, template.path, properties.Location) ?? '');
        if (child === undefined) continue;
        const passed = isRecord(properties.Parameters) ? properties.Parameters : {};
        child.parameterValues = Object.fromEntries(
          Object.entries(passed).map(([name, value]) => [name, resolveDeclaredValue(value, scope)])
        );
        const condition = resource.Condition;
        const active =
          template.inactiveParent === undefined &&
          (condition === undefined || (typeof condition === 'string' && conditionHolds(condition, scope) === true));
        if (active) delete child.inactiveParent;
        else child.inactiveParent = `${template.path}:${logicalId}`;
      }
    }
  }
  return [...read.values()];
};

const templateScope = (template: Template): TemplateScope => ({
  parameters: isRecord(template.parsed.Parameters) ? template.parsed.Parameters : {},
  logicalIds: new Set(Object.keys(template.parsed.Resources as RecordValue)),
  conditions: isRecord(template.parsed.Conditions) ? template.parsed.Conditions : {},
  ...(template.parameterValues === undefined ? {} : { parameterValues: template.parameterValues })
});

const environmentVariablesFor = ({
  file,
  raw,
  logicalId,
  globals,
  properties,
  dependencyNames,
  scope
}: {
  file: string;
  raw: string;
  logicalId: string;
  globals: RecordValue;
  properties: RecordValue;
  dependencyNames: ReadonlyMap<string, string>;
  scope: TemplateScope;
}): EnvironmentVariableUse[] => {
  const globalEnvironment =
    isRecord(globals.Environment) && isRecord(globals.Environment.Variables) ? globals.Environment.Variables : {};
  const localEnvironment =
    isRecord(properties.Environment) && isRecord(properties.Environment.Variables)
      ? properties.Environment.Variables
      : {};
  const environment = { ...globalEnvironment, ...localEnvironment };
  const known = new Set(dependencyNames.keys());

  return Object.entries(environment).flatMap(([name, declaredValue]) => {
    const value = selectBranch(declaredValue, scope);
    if (value === ABSENT) return [];
    const referenced = referencedLogicalId(value, known);
    const dependencyName = referenced === undefined ? undefined : dependencyNames.get(referenced);
    const citation =
      citeInBlock(file, raw, logicalId, new RegExp(`^\\s*${escapeRegExp(name)}\\s*:`)) ??
      citeFirstMatchOnly(file, raw, new RegExp(`^\\s*${escapeRegExp(name)}\\s*:`));
    const evidence = citation === undefined ? [] : [{ ...citation, quote: `${name}:` }];
    return [
      declaredEnvironmentVariable({
        name,
        dependencyName,
        evidence,
        value: resolveDeclaredValue(value, scope)
      })
    ];
  });
};

export const awsSamProbe: Probe = {
  name: 'aws-sam',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const templates = await readTemplates(context);
    if (templates.length === 0) return {};

    const services: ServiceFactInput[] = [];
    const dependencies: DependencyFact[] = [];
    const importGaps: ImportGap[] = [];
    const omittedEntrypoints = new Set<string>();
    const keptEntrypoints = new Set<string>();
    for (const template of templates) {
      const { path: templatePath, raw, parsed } = template;
      const resources = parsed.Resources as Record<string, RecordValue>;
      const templateGlobals = isRecord(parsed.Globals) ? parsed.Globals : {};
      const scope = templateScope(template);
      const globals = isRecord(templateGlobals.Function) ? templateGlobals.Function : {};
      const templateDirectory = posix.dirname(templatePath) === '' ? '.' : posix.dirname(templatePath);

      // Every resource first answers whether it deploys at all.
      const omittedResources = new Set<string>();
      const resourceReviews = new Map<string, KeyReview>();
      for (const [logicalId, resource] of Object.entries(resources)) {
        if (!isRecord(resource)) continue;
        const review = reviewKeys(resource, RESOURCE_ATTRIBUTES, { review: emptyReview() });
        if (template.inactiveParent !== undefined) omitFor(review, 'Condition', 'condition');
        else conditionReview(resource, scope, review);
        resourceReviews.set(logicalId, review);
      }

      // APIs: routes inherit their protection, so an API whose protection init cannot carry takes its routes along.
      const apis = new Map<string, ApiState>();
      for (const [logicalId, resource] of Object.entries(resources)) {
        const type =
          resource?.Type === 'AWS::Serverless::Api'
            ? 'Api'
            : resource?.Type === 'AWS::Serverless::HttpApi'
              ? 'HttpApi'
              : undefined;
        if (type === undefined) continue;
        const review = resourceReviews.get(logicalId)!;
        const properties = mergeSamGlobals(
          templateGlobals[type],
          isRecord(resource.Properties) ? resource.Properties : {}
        );
        apis.set(logicalId, apiState(type, isRecord(properties) ? properties : {}, logicalId, review, scope));
        if (isOmitted(review)) omittedResources.add(logicalId);
        importGaps.push(...reviewGaps(templatePath, logicalId, review));
      }
      const implicitApis = {
        Api: apiState(
          'Api',
          isRecord(templateGlobals.Api) ? templateGlobals.Api : {},
          'implicit',
          emptyReview(),
          scope
        ),
        HttpApi: apiState(
          'HttpApi',
          isRecord(templateGlobals.HttpApi) ? templateGlobals.HttpApi : {},
          'implicit',
          emptyReview(),
          scope
        )
      };
      for (const type of ['Api', 'HttpApi'] as const) {
        const review = emptyReview();
        if (templateGlobals[type] === undefined) continue;
        apiState(
          type,
          isRecord(templateGlobals[type]) ? (templateGlobals[type] as RecordValue) : {},
          'implicit',
          review,
          scope
        );
        importGaps.push(...reviewGaps(templatePath, `Globals.${type}`, review));
      }

      // Queues, topics, buckets and tables, with the settings their declarations carry.
      const queueNames = new Map<string, string>();
      for (const [logicalId, resource] of Object.entries(resources)) {
        if (resource?.Type === 'AWS::SQS::Queue') queueNames.set(logicalId, lowerFirst(logicalId));
      }
      const dependencyNames = new Map<string, string>();
      const declaredDependencies = new Map<string, DependencyFact>();
      for (const [logicalId, resource] of Object.entries(resources)) {
        const kind = typeof resource?.Type === 'string' ? resourceTypeToKind[resource.Type] : undefined;
        if (kind === undefined) continue;
        const review = resourceReviews.get(logicalId)!;
        const properties = isRecord(resource.Properties) ? resource.Properties : {};
        const name = lowerFirst(logicalId);
        const { queueSettings, tableKey, bucketVersioning } = declaredDependencySettings(
          String(resource.Type),
          properties,
          scope,
          review,
          queueNames
        );
        if (isOmitted(review)) {
          omittedResources.add(logicalId);
          importGaps.push(...reviewGaps(templatePath, logicalId, review));
          continue;
        }
        dependencyNames.set(logicalId, name);
        const evidence = [
          citeInBlock(templatePath, raw, logicalId, new RegExp(escapeRegExp(String(resource.Type))))
        ].filter((citation) => citation !== undefined);
        declaredDependencies.set(logicalId, {
          name,
          kind,
          ...(queueSettings === undefined ? {} : { queueSettings }),
          ...(tableKey === undefined ? {} : { tableKey }),
          ...(bucketVersioning ? { bucketVersioning: true as const } : {}),
          extensions: [],
          consumedBy: [],
          addressedBy: [],
          hostingEvidence: 'deployment-manifest',
          evidence,
          source: 'probe'
        });
        importGaps.push(...reviewGaps(templatePath, logicalId, review));
      }
      // User pools, and the app client each function's variables name. A variable naming a client is bound to its pool.
      const userPools = declaredUserPools(resources, scope, resourceReviews);
      for (const pool of userPools.pools) {
        if (isOmitted(pool.review)) omittedResources.add(pool.logicalId);
        else dependencyNames.set(pool.logicalId, pool.name);
        importGaps.push(...reviewGaps(templatePath, pool.logicalId, pool.review));
      }
      for (const [client, review] of userPools.clientReviews) {
        const pool = userPools.clientPools.get(client);
        if (pool !== undefined) dependencyNames.set(client, pool);
        importGaps.push(...reviewGaps(templatePath, client, review));
      }

      // A dead-letter queue nobody consumes is still where failures go; a queue whose target was left out cannot keep it.
      for (const dependency of declaredDependencies.values()) {
        const target = dependency.queueSettings?.deadLetter?.dependencyName;
        if (target !== undefined && ![...declaredDependencies.values()].some((entry) => entry.name === target)) {
          delete dependency.queueSettings!.deadLetter;
        }
      }

      const functions: Array<{ logicalId: string; name: string; properties: RecordValue; service: ServiceFactInput }> =
        [];
      for (const [logicalId, resource] of Object.entries(resources)) {
        if (resource?.Type !== 'AWS::Serverless::Function') continue;
        const review = resourceReviews.get(logicalId)!;
        const properties = isRecord(resource.Properties) ? resource.Properties : {};
        const mergedProperties = mergeSamGlobals(globals, properties);
        const declared = isRecord(mergedProperties) ? mergedProperties : properties;
        reviewKeys(declared, FUNCTION_PROPERTIES, { review });
        // A function's own dead-letter queue and retry settings apply to asynchronous invocations only. Without an
        // asynchronous trigger nothing ever reaches them, so leaving them out changes nothing that runs.
        if (!hasAsynchronousEvent(declared.Events, scope)) {
          review.omitted = review.omitted.filter((entry) => {
            if (entry.key !== 'DeadLetterQueue' && entry.key !== 'EventInvokeConfig') return true;
            review.notCarried.push(entry.key);
            return false;
          });
        }
        if (declared.PackageType !== undefined && resolveDeclaredValue(declared.PackageType, scope) !== 'Zip') {
          omitFor(review, 'PackageType');
        }
        const entrypoint = entrypointFor(
          context.files,
          templateDirectory,
          resolveDeclaredValue(declared.CodeUri, scope),
          // `Globals.Function` supplies whatever a function leaves out; Rust templates put `Handler: bootstrap` there.
          resolveDeclaredValue(declared.Handler, scope),
          resolveDeclaredValue(declared.Runtime, scope)
        );
        if (entrypoint === undefined) {
          // No source file in the repository matches its handler: nothing could be packaged for it.
          importGaps.push(
            ...reviewGaps(templatePath, logicalId, isOmitted(review) ? review : omitFor(review, 'Handler'))
          );
          continue;
        }

        const sizing = declaredSizing(declared.Timeout, declared.MemorySize, scope);
        for (const setting of sizing.unresolved) {
          omitFor(review, setting === 'timeout' ? 'Timeout' : 'MemorySize', 'execution');
        }
        const reserved = declaredNumber(declared.ReservedConcurrentExecutions, scope);
        if (reserved === UNRESOLVED) omitFor(review, 'ReservedConcurrentExecutions', 'execution');
        const architectures = resolveDeclaredValue(declared.Architectures, scope);
        const architecture =
          Array.isArray(architectures) &&
          architectures.length === 1 &&
          (architectures[0] === 'arm64' || architectures[0] === 'x86_64')
            ? architectures[0]
            : undefined;
        if (declared.Architectures !== undefined && architecture === undefined) review.notCarried.push('Architectures');
        const declaredLayers = resolveDeclaredValue(declared.Layers, scope);
        const layers =
          Array.isArray(declaredLayers) &&
          declaredLayers.every((layer) => typeof layer === 'string' && LAYER_ARN.test(layer))
            ? (declaredLayers as string[]).slice(0, 5)
            : undefined;
        if (declared.Layers !== undefined && layers === undefined) review.notCarried.push('Layers');

        if (isOmitted(review)) {
          importGaps.push(...reviewGaps(templatePath, logicalId, review));
          omittedEntrypoints.add(entrypoint);
          continue;
        }
        const functionGaps: ImportGap[] = [];
        const functionTriggers = triggersFor(properties.Events, {
          file: templatePath,
          functionId: logicalId,
          dependencyNames,
          omittedResources,
          apis,
          implicitApis,
          scope,
          importGaps: functionGaps
        });
        importGaps.push(...reviewGaps(templatePath, logicalId, review), ...functionGaps);
        keptEntrypoints.add(entrypoint);

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
        const handler = resolveDeclaredValue(declared.Handler, scope);
        const runtimeName = String(resolveDeclaredValue(declared.Runtime, scope) ?? '');
        // .NET's handler names the method; script runtimes' handler names an export of the entry file.
        const functionHandler =
          typeof handler !== 'string'
            ? undefined
            : runtimeName.startsWith('dotnet')
              ? handler
              : declaredHandlerExport(handler, entrypoint);
        const environmentVariables = environmentVariablesFor({
          file: templatePath,
          raw,
          logicalId,
          globals,
          properties,
          dependencyNames,
          scope
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
          ...sizing.settings,
          ...(layers === undefined || layers.length === 0 ? {} : { functionLayers: layers }),
          ...(architecture === undefined ? {} : { functionArchitecture: architecture }),
          ...(typeof reserved === 'number' ? { functionReservedConcurrency: reserved } : {}),
          functionTriggers,
          environmentVariables,
          evidence: [sourceCitation, ...samEvidence].filter((citation) => citation !== undefined),
          source: 'probe'
        };
        functions.push({ logicalId, name, properties, service });
      }

      const deadLetterTargets = new Set(
        [...declaredDependencies.values()].flatMap((dependency) =>
          dependency.queueSettings?.deadLetter?.dependencyName === undefined
            ? []
            : [dependency.queueSettings.deadLetter.dependencyName]
        )
      );
      const notImported: string[] = [];
      for (const [logicalId, dependency] of declaredDependencies) {
        const consumers = functions
          .filter(
            ({ properties, service }) =>
              JSON.stringify(properties).includes(`"${logicalId}"`) ||
              JSON.stringify(properties).includes(`${logicalId}.`) ||
              JSON.stringify(properties).includes(`\${${logicalId}}`) ||
              (service.environmentVariables ?? []).some((variable) => variable.dependencyName === dependency.name)
          )
          .map(({ name: functionName }) => functionName);
        // A resource no imported function uses is reported rather than recreated: reproducing an entire existing
        // stack is not init's job. A dead-letter queue is kept, because a consumed queue sends its failures there.
        if (consumers.length === 0 && !deadLetterTargets.has(dependency.name)) {
          notImported.push(logicalId);
          continue;
        }
        dependencies.push({
          ...dependency,
          // Only the redrive policy points here; no function reads it, so none gets access to it.
          ...(consumers.length === 0
            ? { evidence: dependency.evidence.map((citation) => ({ ...citation, field: 'deadLetterTarget' })) }
            : {}),
          consumedBy: consumers,
          addressedBy: [
            ...new Set(
              functions.flatMap(({ service }) =>
                (service.environmentVariables ?? [])
                  .filter((variable) => variable.dependencyName === dependency.name)
                  .map((variable) => variable.name)
              )
            )
          ]
        });
      }
      for (const pool of userPools.pools) {
        if (isOmitted(pool.review)) continue;
        const consumers = functions.filter(({ service }) =>
          (service.environmentVariables ?? []).some((variable) => variable.dependencyName === pool.name)
        );
        // A pool no function here names may still be the one the application's own code signs in to; another probe
        // attributes it, and its declared sign-in rules travel with it.
        dependencies.push({
          name: pool.name,
          kind: 'user-pool',
          // The template defines it, so the pool is this project's own.
          userPoolOwnership: 'project',
          ...(pool.settings === undefined ? {} : { userPoolSettings: pool.settings }),
          extensions: [],
          consumedBy: consumers.map(({ name: functionName }) => functionName),
          addressedBy: [
            ...new Set(
              consumers.flatMap(({ service }) =>
                (service.environmentVariables ?? [])
                  .filter((variable) => variable.dependencyName === pool.name)
                  .map((variable) => variable.name)
              )
            )
          ],
          hostingEvidence: 'deployment-manifest',
          evidence: [citeInBlock(templatePath, raw, pool.logicalId, /AWS::Cognito::UserPool\b/)].filter(
            (citation) => citation !== undefined
          ),
          source: 'probe'
        });
      }
      for (const client of userPools.clientReviews.keys()) {
        if (!userPools.clientPools.has(client) && !omittedResources.has(client)) notImported.push(client);
      }
      for (const [logicalId, resource] of Object.entries(resources)) {
        const type = isRecord(resource) ? String(resource.Type) : '';
        if (omittedResources.has(logicalId) || READ_ELSEWHERE.has(type)) continue;
        if (type === 'AWS::Serverless::Application') {
          const review = resourceReviews.get(logicalId)!;
          reviewKeys(resource.Properties, APPLICATION_PROPERTIES, { review });
          const location = isRecord(resource.Properties) ? resource.Properties.Location : undefined;
          const local = templates.some(
            (candidate) =>
              typeof location === 'string' &&
              candidate.path ===
                posix.normalize(templateDirectory === '.' ? location : posix.join(templateDirectory, location))
          );
          if (!local) notImported.push(logicalId);
          importGaps.push(...reviewGaps(templatePath, logicalId, review));
          continue;
        }
        if (
          type === 'AWS::Serverless::Function' ||
          type === 'AWS::Serverless::Api' ||
          type === 'AWS::Serverless::HttpApi' ||
          resourceTypeToKind[type] !== undefined
        ) {
          continue;
        }
        notImported.push(logicalId);
      }
      importGaps.push(...notImportedGap(templatePath, notImported));
      services.push(...functions.map(({ service }) => service));
    }

    return importerOutput({ services, dependencies, importGaps, omittedEntrypoints, keptEntrypoints });
  }
};
