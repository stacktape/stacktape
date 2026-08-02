import { CHILD_RESOURCES } from './child-resources.js';
import type { AlarmDefinitionBase, AlarmTrigger } from '@stacktape/config/alarms';
import type { StacktapeConfig } from '@stacktape/config';
import type { StacktapeResourceType } from '@stacktape/config/schema-inspection';
import type { StacktapeResourceDefinition } from '@stacktape/config/shared';

// Private symbols for internal methods - not accessible from outside
// Use Symbol.for() so it can be accessed across modules (crucial for npm package interop)
const getParamReferenceSymbol = Symbol.for('stacktape:getParamReference');
const getTypeSymbol = Symbol.for('stacktape:getType');
const getPropertiesSymbol = Symbol.for('stacktape:getProperties');
const getReferencedResourceSymbol = Symbol.for('stacktape:getReferencedResource');
const getReferencedParamSymbol = Symbol.for('stacktape:getReferencedParam');
const resourceParamRefSymbol = Symbol.for('stacktape:isResourceParamRef');
const baseTypePropertiesSymbol = Symbol.for('stacktape:isBaseTypeProperties');
const alarmSymbol = Symbol.for('stacktape:isAlarm');

// Duck-type checkers - use symbols instead of instanceof for cross-module compatibility
const isBaseResource = (value: unknown): value is BaseResource =>
  value !== null && typeof value === 'object' && getTypeSymbol in value;

const isBaseTypeProperties = (value: unknown): value is BaseTypeProperties =>
  value !== null && typeof value === 'object' && baseTypePropertiesSymbol in value;

const isAlarm = (value: unknown): value is Alarm => value !== null && typeof value === 'object' && alarmSymbol in value;

const isResourceParamReference = (value: unknown): value is ResourceParamReference =>
  value !== null && typeof value === 'object' && resourceParamRefSymbol in value;

/**
 * A reference to a resource parameter that will be resolved at runtime.
 * The compiler resolves the target resource from the config's `resources` keys.
 */
export class ResourceParamReference {
  readonly #resource: BaseResource;
  readonly #param: string;
  readonly [resourceParamRefSymbol] = true;

  constructor(resource: BaseResource, param: string) {
    this.#resource = resource;
    this.#param = param;
  }

  [getReferencedResourceSymbol](): BaseResource {
    return this.#resource;
  }

  [getReferencedParamSymbol](): string {
    return this.#param;
  }

  toString(): never {
    throw new TypeError(
      'A Stacktape resource parameter reference cannot be converted to a string while the config is being authored. Pass it directly as a configuration value instead of interpolating it.'
    );
  }

  toJSON(): never {
    return this.toString();
  }

  valueOf(): never {
    return this.toString();
  }
}

/**
 * Base class for type/properties structures (engines, packaging, events, etc.)
 */
export class BaseTypeProperties<Type extends string = string, Properties = unknown> {
  public readonly type: Type;
  public readonly properties: Properties;
  readonly [baseTypePropertiesSymbol] = true;

  constructor(type: Type, properties: Properties) {
    this.type = type;
    this.properties = properties;
  }
}

/**
 * Base class for type-only structures (no properties field, just type discriminator)
 */
export class BaseTypeOnly<Type extends string = string> {
  public readonly type: Type;
  readonly [baseTypePropertiesSymbol] = true;

  constructor(type: Type) {
    this.type = type;
  }
}

/**
 * Defines a CloudWatch alarm that monitors a metric and triggers notifications when thresholds are breached.
 *
 * Alarms can be attached to resources like Lambda functions, databases, load balancers, SQS queues, and HTTP API Gateways.
 * When the alarm condition is met (e.g., error rate exceeds 5%), notifications are sent to configured targets (Slack, email, MS Teams).
 *
 * @example
 * ```ts
 * new Alarm({
 *   trigger: new LambdaErrorRateTrigger({ thresholdPercent: 5 }),
 *   evaluation: { period: 60, evaluationPeriods: 3, breachedPeriods: 2 },
 *   notificationTargets: [
 *     {
 *       type: 'slack',
 *       properties: { conversationId: 'C0123456789', accessToken: $Secret('slack-bot-token') }
 *     }
 *   ],
 *   description: 'Lambda error rate exceeded 5%'
 * })
 * ```
 */
export type AuthoringAlarmProps<Trigger extends AlarmTrigger = AlarmTrigger> = AlarmDefinitionBase & {
  trigger: WithAuthoringNamedResourceReferences<Trigger>;
};

export class Alarm<Trigger extends AlarmTrigger = AlarmTrigger> {
  readonly [alarmSymbol] = true;
  public readonly trigger: AuthoringAlarmProps<Trigger>['trigger'];
  public readonly evaluation?: NonNullable<AuthoringAlarmProps<Trigger>['evaluation']>;
  public readonly notificationTargets?: NonNullable<AuthoringAlarmProps<Trigger>['notificationTargets']>;
  public readonly includeInHistory?: NonNullable<AuthoringAlarmProps<Trigger>['includeInHistory']>;
  public readonly description?: NonNullable<AuthoringAlarmProps<Trigger>['description']>;

  constructor(props: AuthoringAlarmProps<Trigger>) {
    this.trigger = props.trigger;
    if (props.evaluation !== undefined) this.evaluation = props.evaluation;
    if (props.notificationTargets !== undefined) this.notificationTargets = props.notificationTargets;
    if (props.includeInHistory !== undefined) this.includeInHistory = props.includeInHistory;
    if (props.description !== undefined) this.description = props.description;
  }
}

/**
 * Base resource class that provides common functionality
 */
export class BaseResource<Type extends StacktapeResourceType = StacktapeResourceType> {
  private readonly _type: Type;
  private readonly _properties: any;

  constructor(type: Type, properties: any) {
    this._type = type;

    this._properties = properties;
  }

  // Private methods using symbols - not accessible from outside or in autocomplete
  [getParamReferenceSymbol](paramName: string): ResourceParamReference {
    return new ResourceParamReference(this, paramName);
  }

  [getTypeSymbol](): Type {
    return this._type;
  }

  [getPropertiesSymbol](): any {
    return this._properties;
  }
}

/**
 * Flatten nested objects into dot-notation paths.
 * E.g., { SmsConfiguration: { ExternalId: 'value' } } becomes { 'SmsConfiguration.ExternalId': 'value' }
 * Preserves arrays, non-plain objects, and map-like objects with special keys as leaf values.
 */
function flattenToDotNotation(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    // Check if value is a plain object (not array, not null, not special types)
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
      // Preserve map-like objects with non-path-safe keys (for example
      // RDS parameter names like "rds.allowed_extensions" or OpenSearch options).
      // This prevents splitting literal keys into nested paths later.
      if (Object.keys(value).some((childKey) => !/^[A-Za-z0-9_]+$/.test(childKey))) {
        result[newKey] = value;
        continue;
      }
      // Recursively flatten nested objects
      Object.assign(result, flattenToDotNotation(value, newKey));
    } else {
      // Leaf value - keep as is
      result[newKey] = value;
    }
  }

  return result;
}

const transformChildResourceProperties = ({
  resourceName,
  resourceType,
  values,
  operation,
  transformValue
}: {
  resourceName: string;
  resourceType: string;
  values: Record<string, any>;
  operation: 'override' | 'transform';
  transformValue: (value: any, currentValue: any) => any;
}): Record<string, any> => {
  const propertyNameMap = new Map(
    (CHILD_RESOURCES[resourceType as StacktapeResourceType] || []).map((childResource) => [
      childResource.logicalName.name,
      childResource
    ])
  );
  const result: Record<string, any> = {};
  const unsupported = (propertyName: string) =>
    new Error(
      `${operation === 'override' ? 'Override' : 'Transform'} of property ${propertyName} of resource ${resourceName} is not supported.\n\n` +
        `Remove the ${operation}, run 'stacktape compile:template' command, and find the logical name of the resource you want to ${operation} manually. Then add it to the ${operation}s object.`
    );

  for (const [propertyName, value] of Object.entries(values)) {
    const childResource = propertyNameMap.get(propertyName);
    if (!childResource) {
      // An explicit CloudFormation logical name is already in its final form.
      result[propertyName] = value;
      continue;
    }
    if (childResource.unresolvable) {
      throw unsupported(propertyName);
    }

    let logicalName: string;
    try {
      logicalName = childResource.logicalName(resourceName);
    } catch {
      try {
        logicalName = childResource.logicalName();
      } catch {
        logicalName = propertyName;
      }
    }
    if (logicalName.includes('undefined')) {
      throw unsupported(propertyName);
    }
    result[logicalName] = transformValue(value, result[logicalName]);
  }

  return result;
};

/** Transform user-friendly override property names to CloudFormation logical names. */
function transformOverridesToLogicalNames(resourceName: string, resourceType: string, overrides: any): any {
  return transformChildResourceProperties({
    resourceName,
    resourceType,
    values: overrides,
    operation: 'override',
    transformValue: (value, currentValue = {}) => ({ ...currentValue, ...flattenToDotNotation(value) })
  });
}

/** Transform user-friendly transform property names to CloudFormation logical names. */
function transformTransformsToLogicalNames(resourceName: string, resourceType: string, transforms: any): any {
  return transformChildResourceProperties({
    resourceName,
    resourceType,
    values: transforms,
    operation: 'transform',
    transformValue: (value) => value
  });
}

export type ConfigCliArgs = Readonly<Record<string, unknown>>;

export type ResourceTransform = (
  properties: Record<string, unknown>
) => Partial<Record<string, unknown>> | Record<string, unknown>;

export type CloudFormationTemplateResource = {
  Type?: string;
  Properties?: Record<string, unknown>;
  [attribute: string]: unknown;
};

export type CloudFormationTemplate = {
  AWSTemplateFormatVersion?: string;
  Description?: string;
  Metadata?: Record<string, unknown>;
  Transform?: string | string[];
  Parameters?: Record<string, unknown>;
  Mappings?: Record<string, unknown>;
  Conditions?: Record<string, unknown>;
  Resources: Record<string, CloudFormationTemplateResource>;
  Outputs?: Record<string, { Value: unknown; Description?: unknown; Export?: unknown }>;
  Hooks?: Record<string, unknown>;
};

export type FinalTransform = <Template extends CloudFormationTemplate>(template: Template) => Template;

export type AuthoringResourceCustomization = {
  overrides?: Record<string, Record<string, unknown>>;
  transforms?: Record<string, ResourceTransform>;
};

type ResourceDefinitionOf<Type extends StacktapeResourceType> = Extract<StacktapeResourceDefinition, { type: Type }>;

type ResourcePropertiesOf<Type extends StacktapeResourceType> =
  ResourceDefinitionOf<Type> extends {
    properties?: infer Properties;
  }
    ? NonNullable<Properties>
    : Record<string, never>;

type AuthoringEnvironment = Record<string, string | number | boolean>;

/**
 * Property names whose string values identify another resource in the same Stacktape config.
 * `'*'` means that any resource can be referenced; otherwise the tuple is the accepted resource type.
 */
export const RESOURCE_REFERENCE_TARGETS = {
  afterTrafficShiftFunction: ['function'],
  assumeRoleOfResource: '*',
  bastionResource: ['bastion'],
  beforeAllowTrafficFunction: ['function'],
  bucketName: ['bucket'],
  definitionName: ['custom-resource-definition'],
  efsFilesystemName: ['efs-filesystem'],
  eventBusName: ['event-bus'],
  function: ['function'],
  functionName: ['function'],
  httpApiGatewayName: ['http-api-gateway'],
  kinesisStreamName: ['kinesis-stream'],
  loadBalancerName: ['application-load-balancer', 'network-load-balancer'],
  onOriginRequest: ['edge-lambda-function'],
  onOriginResponse: ['edge-lambda-function'],
  onRequest: ['edge-lambda-function'],
  onResponse: ['edge-lambda-function'],
  snsTopicName: ['sns-topic'],
  sqsQueueName: ['sqs-queue'],
  targetSqsQueueName: ['sqs-queue'],
  useBrowser: ['agentcore-browser'],
  useCodeInterpreter: ['agentcore-code-interpreter'],
  useFirewall: ['web-app-firewall'],
  useGateway: ['agentcore-gateway'],
  useMemory: ['agentcore-memory'],
  userPool: ['user-auth-pool'],
  userPoolName: ['user-auth-pool']
} as const satisfies Record<string, readonly StacktapeResourceType[] | '*'>;

export type ResourceReferencePropertyKey = keyof typeof RESOURCE_REFERENCE_TARGETS;

type ReferencedResourceType<Key extends ResourceReferencePropertyKey> =
  (typeof RESOURCE_REFERENCE_TARGETS)[Key] extends readonly StacktapeResourceType[]
    ? (typeof RESOURCE_REFERENCE_TARGETS)[Key][number]
    : StacktapeResourceType;

export const isResourceReferencePropertyKey = (
  key: string,
  resourceType?: string
): key is ResourceReferencePropertyKey =>
  Object.hasOwn(RESOURCE_REFERENCE_TARGETS, key) && !(key === 'bucketName' && resourceType === 'agentcore-browser');

type IsDirectResourceReference<
  Key,
  ResourceType extends StacktapeResourceType | undefined
> = Key extends ResourceReferencePropertyKey
  ? Key extends 'bucketName'
    ? ResourceType extends 'agentcore-browser'
      ? false
      : true
    : true
  : false;

export type WithAuthoringNamedResourceReferences<
  Value,
  ResourceType extends StacktapeResourceType | undefined = undefined
> = Value extends (...args: any[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? Array<WithAuthoringNamedResourceReferences<Item, ResourceType>>
    : Value extends object
      ? {
          [Key in keyof Value]: IsDirectResourceReference<Key, ResourceType> extends true
            ? Value[Key] extends string | undefined
              ? Value[Key] | BaseResource<ReferencedResourceType<Key & ResourceReferencePropertyKey>>
              : WithAuthoringNamedResourceReferences<Value[Key], ResourceType>
            : WithAuthoringNamedResourceReferences<Value[Key], ResourceType>;
        }
      : Value;

type WithAuthoringEnvironment<Value> = Value extends object
  ? Omit<Value, 'environment'> &
      ('environment' extends keyof Value ? { environment?: AuthoringEnvironment } : Record<never, never>)
  : Value;

type WithAuthoringArrayEnvironment<
  Properties,
  Key extends PropertyKey,
  Required extends boolean = false
> = Key extends keyof Properties
  ? Omit<Properties, Key> &
      (Required extends true
        ? {
            [CurrentKey in Key]: NonNullable<Properties[CurrentKey]> extends Array<infer Item>
              ? Array<WithAuthoringEnvironment<Item>>
              : Properties[CurrentKey];
          }
        : {
            [CurrentKey in Key]?: NonNullable<Properties[CurrentKey]> extends Array<infer Item>
              ? Array<WithAuthoringEnvironment<Item>>
              : Properties[CurrentKey];
          })
  : Properties;

type WithAuthoringObjectEnvironment<Properties, Key extends PropertyKey> = Key extends keyof Properties
  ? Omit<Properties, Key> & {
      [CurrentKey in Key]: WithAuthoringEnvironment<NonNullable<Properties[CurrentKey]>>;
    }
  : Properties;

export type WithAuthoringResourceReferences<Properties> = Omit<
  Properties,
  'connectTo' | 'environment' | 'injectEnvironment'
> &
  ('connectTo' extends keyof Properties ? { connectTo?: Array<string | BaseResource> } : Record<never, never>) &
  ('environment' extends keyof Properties ? { environment?: AuthoringEnvironment } : Record<never, never>) &
  ('injectEnvironment' extends keyof Properties ? { injectEnvironment?: AuthoringEnvironment } : Record<never, never>);

type ResourcesWithoutCloudFormationCustomization =
  | 'convex'
  | 'custom-resource-definition'
  | 'custom-resource-instance'
  | 'deployment-script'
  | 'mongo-db-atlas-cluster'
  | 'upstash-redis'
  | 'aws-cdk-construct';

export type AuthoringResourceProps<Type extends StacktapeResourceType> = WithAuthoringObjectEnvironment<
  WithAuthoringArrayEnvironment<
    WithAuthoringArrayEnvironment<
      WithAuthoringResourceReferences<WithAuthoringNamedResourceReferences<ResourcePropertiesOf<Type>, Type>>,
      'containers',
      true
    >,
    'sideContainers'
  >,
  'container'
> &
  (Type extends ResourcesWithoutCloudFormationCustomization ? Record<never, never> : AuthoringResourceCustomization);

export type AuthoringStacktapeConfig = Omit<StacktapeConfig, 'resources' | 'scripts'> & {
  resources: Record<string, BaseResource | StacktapeResourceDefinition>;
  scripts?: Record<string, BaseTypeProperties | NonNullable<StacktapeConfig['scripts']>[string]>;
  finalTransform?: FinalTransform;
};

export type CompiledStacktapeConfig = {
  readonly format: 'stacktape-compiled-config';
  readonly version: 1;
  readonly config: StacktapeConfig;
  readonly transforms: Record<string, ResourceTransform>;
  readonly finalTransform: FinalTransform | null;
};

export type DefinedStacktapeConfig = (params: GetConfigParams) => CompiledStacktapeConfig;

export type GetConfigParams = {
  /**
   * Project name selected before the configuration is evaluated. This is absent when the project name is declared
   * by the configuration itself rather than supplied by a CLI/default value.
   */
  projectName?: string;
  /**
   * Stage ("environment") used for this operation
   */
  stage: string;
  /**
   * AWS region used for this operation
   * The list of available regions is available at https://www.aws-services.info/regions.html
   */
  region: string;
  /**
   * List of arguments passed to the operation
   */
  cliArgs: ConfigCliArgs;
  /**
   * Stacktape command used to perform this operation (for example deploy, delete, etc.)
   */
  command: string;
  /**
   * Locally-configured AWS profile used to execute the operation.
   * Doesn't apply if you have your AWS account connected in "automatic" mode.
   */
  awsProfile: string;
  /**
   * Information about the authenticated Stacktape user, when the command uses the Stacktape control plane.
   * Local commands such as `package`, `synth`, and `validate` do not authenticate a Stacktape user.
   */
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

/**
 * Helper function to define a config with automatic transformation
 * Use this when exporting your config for the Stacktape CLI
 */
export const defineConfig =
  (configFn: (params: GetConfigParams) => AuthoringStacktapeConfig): DefinedStacktapeConfig =>
  (params) =>
    compileAuthoringConfig(configFn(params));

export const isCompiledStacktapeConfig = (value: unknown): value is CompiledStacktapeConfig =>
  value !== null &&
  typeof value === 'object' &&
  (value as Partial<CompiledStacktapeConfig>).format === 'stacktape-compiled-config' &&
  (value as Partial<CompiledStacktapeConfig>).version === 1;

type ResourceNames = ReadonlyMap<BaseResource, string>;

const collectResourceNames = (resources: AuthoringStacktapeConfig['resources']): ResourceNames => {
  const names = new Map<BaseResource, string>();
  for (const [name, resource] of Object.entries(resources ?? {})) {
    if (!isBaseResource(resource)) {
      continue;
    }
    const previousName = names.get(resource);
    if (previousName !== undefined && previousName !== name) {
      throw new Error(
        `The same Stacktape resource instance cannot be registered as both "${previousName}" and "${name}".`
      );
    }
    names.set(resource, name);
  }
  return names;
};

const getRegisteredResourceName = (resource: BaseResource, resourceNames: ResourceNames): string => {
  const name = resourceNames.get(resource);
  if (name === undefined) {
    throw new Error(
      'A Stacktape resource is referenced but is not registered in the returned `resources` object. Add the resource there and use its object key as its name.'
    );
  }
  return name;
};

/**
 * Compiles the TypeScript authoring model into the serializable configuration consumed by the CLI and keeps
 * executable CloudFormation transforms in an explicit side channel.
 */
export const compileAuthoringConfig = (config: AuthoringStacktapeConfig): CompiledStacktapeConfig => {
  if (!config || typeof config !== 'object') {
    throw new TypeError('A Stacktape configuration factory must return an object.');
  }

  const resourceNames = collectResourceNames(config.resources);

  // Second pass: transform the config
  const result: Record<string, unknown> = {};
  const transforms: Record<string, ResourceTransform> = {};
  let finalTransform: FinalTransform | null = null;
  for (const key in config) {
    if (key === 'resources') {
      const compiledResources = transformResourceDefinitions(config[key], resourceNames);
      result[key] = compiledResources.resources;
      Object.assign(transforms, compiledResources.transforms);
    } else if (key === 'scripts') {
      // Scripts are also transformed as definitions
      result[key] = transformScriptDefinitions(config[key], resourceNames);
    } else if (key === 'finalTransform') {
      if (config.finalTransform !== undefined && typeof config.finalTransform !== 'function') {
        throw new TypeError('Stacktape config finalTransform must be a function.');
      }
      finalTransform = config.finalTransform ?? null;
    } else {
      result[key] = transformValue((config as unknown as Record<string, unknown>)[key], resourceNames);
    }
  }
  return {
    format: 'stacktape-compiled-config',
    version: 1,
    config: result as unknown as StacktapeConfig,
    transforms,
    finalTransform
  };
};

/** Convert an authored configuration to its serializable form for converters and other tooling. */
export const transformConfigWithResources = (config: AuthoringStacktapeConfig): StacktapeConfig =>
  compileAuthoringConfig(config).config;

/**
 * Transforms environment object to array format
 */
const transformEnvironment = (env: any, resourceNames: ResourceNames): any => {
  if (!env || typeof env !== 'object' || Array.isArray(env)) {
    return env;
  }

  // Convert { KEY: value } to [{ name: 'KEY', value }]
  return Object.entries(env).map(([name, value]) => ({
    name,
    value: transformValue(value, resourceNames)
  }));
};

/**
 * Transforms resource definitions (values in the resources object)
 */
const transformResourceDefinitions = (
  resources: AuthoringStacktapeConfig['resources'],
  resourceNames: ResourceNames
): { resources: StacktapeConfig['resources']; transforms: Record<string, ResourceTransform> } => {
  if (!resources || typeof resources !== 'object') {
    return { resources: resources as unknown as StacktapeConfig['resources'], transforms: {} };
  }

  const result: any = {};
  const collectedTransforms: Record<string, ResourceTransform> = {};
  for (const key in resources) {
    const resource = resources[key];
    if (isBaseResource(resource)) {
      const type = (resource as any)[getTypeSymbol]();
      const authoredProperties = (resource as any)[getPropertiesSymbol]();
      let overrides: unknown;
      let transforms: unknown;
      let properties = authoredProperties;
      if (authoredProperties && typeof authoredProperties === 'object' && !Array.isArray(authoredProperties)) {
        properties = { ...authoredProperties };
        if ('overrides' in properties) {
          overrides = properties.overrides;
          delete properties.overrides;
        }
        if ('transforms' in properties) {
          transforms = properties.transforms;
          delete properties.transforms;
        }
      }
      const compiledOverrides =
        overrides && typeof overrides === 'object' && !Array.isArray(overrides)
          ? transformOverridesToLogicalNames(key, type, overrides)
          : overrides;
      const compiledTransforms =
        transforms && typeof transforms === 'object' && !Array.isArray(transforms)
          ? transformTransformsToLogicalNames(key, type, transforms)
          : transforms;
      result[key] = {
        type,
        properties: transformValue(properties, resourceNames),
        ...(compiledOverrides !== undefined && { overrides: transformValue(compiledOverrides, resourceNames) })
      };
      collectResourceTransforms(compiledTransforms, collectedTransforms, key);
    } else {
      const transformedResource = transformValue(resource, resourceNames);
      if (transformedResource?.transforms !== undefined) {
        collectResourceTransforms(transformedResource.transforms, collectedTransforms, key);
        delete transformedResource.transforms;
      }
      result[key] = transformedResource;
    }
  }
  return { resources: result, transforms: collectedTransforms };
};

const collectResourceTransforms = (
  transforms: unknown,
  collectedTransforms: Record<string, ResourceTransform>,
  resourceName: string
): void => {
  if (transforms === undefined) {
    return;
  }
  if (transforms === null || typeof transforms !== 'object' || Array.isArray(transforms)) {
    throw new TypeError(`Transforms for resource "${resourceName}" must be an object of functions.`);
  }
  for (const [logicalName, transform] of Object.entries(transforms)) {
    if (typeof transform !== 'function') {
      throw new TypeError(`Transform "${logicalName}" for resource "${resourceName}" must be a function.`);
    }
    collectedTransforms[logicalName] = transform as ResourceTransform;
  }
};

/**
 * Transforms script definitions (values in the scripts object)
 */
const transformScriptDefinitions = (scripts: any, resourceNames: ResourceNames): any => {
  if (!scripts || typeof scripts !== 'object') {
    return scripts;
  }

  const result: any = {};
  for (const key in scripts) {
    const script = scripts[key];
    if (isBaseTypeProperties(script)) {
      result[key] = {
        type: script.type,
        properties: transformValue(script.properties, resourceNames)
      };
    } else {
      result[key] = transformValue(script, resourceNames);
    }
  }
  return result;
};

export const transformValue = (value: any, resourceNames: ResourceNames = new Map()): any => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    const rewrittenDirective = rewriteEmbeddedDirectivesToCfFormat(value);
    if (rewrittenDirective !== null) {
      return rewrittenDirective;
    }
  }

  // Transform ResourceParamReference
  if (isResourceParamReference(value)) {
    const resource = (value as any)[getReferencedResourceSymbol]() as BaseResource;
    const param = (value as any)[getReferencedParamSymbol]() as string;
    return `$ResourceParam('${getRegisteredResourceName(resource, resourceNames)}','${param}')`;
  }

  // Transform BaseResource references (not definitions) to resourceName
  // This handles cases like connectTo: [database]
  if (isBaseResource(value)) {
    return getRegisteredResourceName(value, resourceNames);
  }

  // Transform BaseTypeProperties (engines, packaging, events) to plain object
  if (isBaseTypeProperties(value)) {
    // Handle type-only classes (no properties)
    if (!('properties' in value) || value.properties === undefined) {
      return { type: value.type };
    }
    return {
      type: value.type,
      properties: transformValue(value.properties, resourceNames)
    };
  }

  // Transform Alarm class to plain object
  if (isAlarm(value)) {
    const result: any = {
      trigger: transformValue(value.trigger, resourceNames)
    };
    if (value.evaluation !== undefined) {
      result.evaluation = transformValue(value.evaluation, resourceNames);
    }
    if (value.notificationTargets !== undefined) {
      result.notificationTargets = transformValue(value.notificationTargets, resourceNames);
    }
    if (value.includeInHistory !== undefined) {
      result.includeInHistory = value.includeInHistory;
    }
    if (value.description !== undefined) {
      result.description = value.description;
    }
    return result;
  }

  // Transform arrays
  if (Array.isArray(value)) {
    return value.map((item) => transformValue(item, resourceNames));
  }

  // Transform objects
  if (typeof value === 'object') {
    const result: any = {};
    for (const key in value) {
      // Special handling for environment and injectEnvironment properties
      if (key === 'environment' || key === 'injectEnvironment') {
        result[key] = transformEnvironment(value[key], resourceNames);
      } else {
        result[key] = transformValue(value[key], resourceNames);
      }
    }
    return result;
  }

  return value;
};

const RUNTIME_DIRECTIVE_NAMES = new Set(['ResourceParam', 'CfResourceParam', 'Secret', 'CfFormat', 'CfStackOutput']);

const rewriteEmbeddedDirectivesToCfFormat = (value: string): string | null => {
  const embeddedDirectives = getEmbeddedDirectives(value);
  if (embeddedDirectives.length === 0) {
    return null;
  }

  const onlyDirective = embeddedDirectives.length === 1 ? embeddedDirectives[0] : undefined;
  if (onlyDirective?.startPos === 0 && onlyDirective.endPos === value.length) {
    return null;
  }

  let interpolatedString = '';
  let currentPos = 0;
  embeddedDirectives.forEach(({ startPos, endPos }) => {
    interpolatedString += `${value.slice(currentPos, startPos)}{}`;
    currentPos = endPos;
  });
  interpolatedString += value.slice(currentPos);

  const escapedInterpolatedString = interpolatedString
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');

  const directiveArgs = embeddedDirectives.map(({ definition }) => definition).join(', ');
  const hasRuntimeDirective = embeddedDirectives.some(({ name }) => RUNTIME_DIRECTIVE_NAMES.has(name));
  const formatDirectiveName = hasRuntimeDirective ? 'CfFormat' : 'Format';
  return `$${formatDirectiveName}('${escapedInterpolatedString}', ${directiveArgs})`;
};

const getEmbeddedDirectives = (
  value: string
): Array<{ definition: string; name: string; startPos: number; endPos: number }> => {
  const directives: Array<{ definition: string; name: string; startPos: number; endPos: number }> = [];

  const tryParseDirectiveAt = (
    str: string,
    startPos: number
  ): { definition: string; name: string; endPos: number } | null => {
    if (str[startPos] !== '$') {
      return null;
    }

    let idx = startPos + 1;
    const firstNameChar = str[idx];
    if (!firstNameChar || !firstNameChar.match(/[A-Z_]/i)) {
      return null;
    }

    while (str[idx]?.match(/[\w$]/)) {
      idx++;
    }

    const name = str.slice(startPos + 1, idx);

    if (str[idx] !== '(') {
      return null;
    }

    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let closingParenPos = -1;

    for (let i = idx; i < str.length; i++) {
      const char = str[i];
      const prevChar = i > 0 ? str[i - 1] : '';

      if (char === "'" && prevChar !== '\\' && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prevChar !== '\\' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      }

      if (!inSingleQuote && !inDoubleQuote) {
        if (char === '(') {
          depth++;
        } else if (char === ')') {
          depth--;
          if (depth === 0) {
            closingParenPos = i;
            break;
          }
        }
      }
    }

    if (closingParenPos === -1) {
      return null;
    }

    let endPos = closingParenPos + 1;
    if (str[endPos] === '.') {
      endPos++;
      while (str[endPos]?.match(/[\w$.]/)) {
        endPos++;
      }
    }

    return {
      definition: str.slice(startPos, endPos),
      name,
      endPos
    };
  };

  let idx = 0;
  while (idx < value.length) {
    if (value[idx] === '$') {
      const parsed = tryParseDirectiveAt(value, idx);
      if (parsed) {
        directives.push({ definition: parsed.definition, name: parsed.name, startPos: idx, endPos: parsed.endPos });
        idx = parsed.endPos;
        continue;
      }
    }
    idx++;
  }

  return directives;
};
