import { CHILD_RESOURCES } from './child-resources';

// Private symbols for internal methods - not accessible from outside
// Use Symbol.for() so it can be accessed across modules (crucial for npm package interop)
const getParamReferenceSymbol = Symbol.for('stacktape:getParamReference');
const getTypeSymbol = Symbol.for('stacktape:getType');
const getPropertiesSymbol = Symbol.for('stacktape:getProperties');
const getOverridesSymbol = Symbol.for('stacktape:getOverrides');
const getTransformsSymbol = Symbol.for('stacktape:getTransforms');
const setResourceNameSymbol = Symbol.for('stacktape:setResourceName');
const resourceParamRefSymbol = Symbol.for('stacktape:isResourceParamRef');
const baseTypePropertiesSymbol = Symbol.for('stacktape:isBaseTypeProperties');
const alarmSymbol = Symbol.for('stacktape:isAlarm');

// Duck-type checkers - use symbols instead of instanceof for cross-module compatibility
const isBaseResource = (value: unknown): value is BaseResource =>
  value !== null && typeof value === 'object' && setResourceNameSymbol in value;

const isBaseTypeProperties = (value: unknown): value is BaseTypeProperties =>
  value !== null && typeof value === 'object' && baseTypePropertiesSymbol in value;

const isAlarm = (value: unknown): value is Alarm => value !== null && typeof value === 'object' && alarmSymbol in value;

const isResourceParamReference = (value: unknown): value is ResourceParamReference =>
  value !== null && typeof value === 'object' && resourceParamRefSymbol in value;

const deferredNameSymbol = Symbol.for('stacktape:isDeferredResourceName');

const isDeferredResourceName = (value: unknown): value is DeferredResourceName =>
  value !== null && typeof value === 'object' && deferredNameSymbol in value;

/**
 * A deferred reference to a resource's name.
 * Used when accessing resourceName before the name is set.
 * Resolves lazily during transformation.
 */
class DeferredResourceName {
  private __resource: BaseResource;
  readonly [deferredNameSymbol] = true;

  constructor(resource: BaseResource) {
    this.__resource = resource;
  }

  resolve(): string {
    // At resolution time, the name should be set
    const name = (this.__resource as any)._resourceName;
    if (name === undefined) {
      throw new Error(
        'Resource name not set. Make sure to add the resource to the resources object in your config. ' +
          'The resource name is automatically derived from the object key.'
      );
    }
    return name;
  }

  toString(): string {
    return this.resolve();
  }

  toJSON(): string {
    return this.resolve();
  }

  valueOf(): string {
    return this.resolve();
  }
}

/**
 * A reference to a resource parameter that will be resolved at runtime.
 * Stores a reference to the resource for lazy name resolution.
 */
export class ResourceParamReference {
  private __resource: BaseResource;
  private __param: string;
  readonly [resourceParamRefSymbol] = true;

  constructor(resource: BaseResource, param: string) {
    this.__resource = resource;
    this.__param = param;
  }

  toString(): string {
    return `$ResourceParam('${this.__resource.resourceName}', '${this.__param}')`;
  }

  toJSON(): string {
    return this.toString();
  }

  // Allow the reference to be used directly in template strings
  valueOf(): string {
    return this.toString();
  }
}

/**
 * Base class for type/properties structures (engines, packaging, events, etc.)
 */
export class BaseTypeProperties {
  public readonly type: string;
  public readonly properties: any;
  readonly [baseTypePropertiesSymbol] = true;

  constructor(type: string, properties: any) {
    this.type = type;
    this.properties = properties;
  }
}

/**
 * Base class for type-only structures (no properties field, just type discriminator)
 */
export class BaseTypeOnly {
  public readonly type: string;
  readonly [baseTypePropertiesSymbol] = true;

  constructor(type: string) {
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
 *   notificationTargets: [{ slack: { url: $Secret('slack-webhook-url') } }],
 *   description: 'Lambda error rate exceeded 5%'
 * })
 * ```
 */
export class Alarm {
  readonly [alarmSymbol] = true;
  public readonly trigger: any;
  public readonly evaluation?: any;
  public readonly notificationTargets?: any[];
  public readonly description?: string;

  constructor(props: { trigger: any; evaluation?: any; notificationTargets?: any[]; description?: string }) {
    this.trigger = props.trigger;
    this.evaluation = props.evaluation;
    this.notificationTargets = props.notificationTargets;
    this.description = props.description;
  }
}

/**
 * Base resource class that provides common functionality
 */
export class BaseResource {
  private readonly _type: string;
  private _properties: any;
  private _overrides?: any;
  private _transforms?: any;
  private _resourceName: string | undefined;
  private _explicitName: boolean;

  constructor(name: string | undefined, type: string, properties: any, overrides?: any) {
    this._resourceName = name;
    this._explicitName = name !== undefined;
    this._type = type;

    // Store properties and overrides initially - they'll be processed when name is set
    this._properties = properties;
    this._overrides = overrides;

    // If name is already set, process overrides and transforms now
    if (name !== undefined) {
      this._processOverridesAndTransforms();
    }
  }

  /**
   * Process overrides and transforms extraction from properties.
   * Called when the resource name is available.
   */
  private _processOverridesAndTransforms(): void {
    const properties = this._properties;
    if (properties && typeof properties === 'object') {
      // Clone properties without overrides and transforms
      const finalProperties = { ...properties };

      // Handle overrides from properties (if they weren't extracted by child class)
      if ('overrides' in finalProperties) {
        const propertiesOverrides = finalProperties.overrides;
        delete finalProperties.overrides;

        // Transform overrides using cfLogicalNames
        if (propertiesOverrides && typeof propertiesOverrides === 'object') {
          this._overrides = transformOverridesToLogicalNames(this._resourceName!, this._type, propertiesOverrides);
        }
      }

      // Handle transforms from properties (if they weren't extracted by child class)
      if ('transforms' in finalProperties) {
        const propertiesTransforms = finalProperties.transforms;
        delete finalProperties.transforms;

        // Transform transforms using cfLogicalNames (same mapping as overrides)
        if (propertiesTransforms && typeof propertiesTransforms === 'object') {
          this._transforms = transformTransformsToLogicalNames(this._resourceName!, this._type, propertiesTransforms);
        }
      }

      this._properties = finalProperties;
    }

    // Also transform overrides/transforms that were passed directly via constructor
    // (when child class extracts them before calling super)
    if (this._overrides && typeof this._overrides === 'object') {
      this._overrides = transformOverridesToLogicalNames(this._resourceName!, this._type, this._overrides);
    }
    if (this._transforms && typeof this._transforms === 'object') {
      this._transforms = transformTransformsToLogicalNames(this._resourceName!, this._type, this._transforms);
    }
  }

  // Public getter for resource name (used for referencing resources)
  // Returns a deferred reference when name isn't set yet, which resolves during transformation
  get resourceName(): string {
    if (this._resourceName === undefined) {
      // Return a deferred reference that will resolve during transformation
      // TypeScript sees this as string due to toString/valueOf, runtime resolves lazily
      return new DeferredResourceName(this) as unknown as string;
    }
    return this._resourceName;
  }

  /**
   * Internal method to set the resource name from the object key.
   * Called by transformConfigWithResources.
   */
  [setResourceNameSymbol](name: string): void {
    if (this._explicitName && this._resourceName !== name) {
      // If an explicit name was provided and it differs from the key, use the explicit name
      return;
    }
    if (this._resourceName === undefined) {
      this._resourceName = name;
      // Now that we have a name, process overrides and transforms
      this._processOverridesAndTransforms();
    }
  }

  // Private methods using symbols - not accessible from outside or in autocomplete
  [getParamReferenceSymbol](paramName: string): ResourceParamReference {
    return new ResourceParamReference(this, paramName);
  }

  [getTypeSymbol](): string {
    return this._type;
  }

  [getPropertiesSymbol](): any {
    return this._properties;
  }

  [getOverridesSymbol](): any | undefined {
    return this._overrides;
  }

  [getTransformsSymbol](): any | undefined {
    return this._transforms;
  }
}

/**
 * Flatten nested objects into dot-notation paths.
 * E.g., { SmsConfiguration: { ExternalId: 'value' } } becomes { 'SmsConfiguration.ExternalId': 'value' }
 * Preserves arrays and non-plain objects as leaf values.
 */
function flattenToDotNotation(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    // Check if value is a plain object (not array, not null, not special types)
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
      // Recursively flatten nested objects
      Object.assign(result, flattenToDotNotation(value, newKey));
    } else {
      // Leaf value - keep as is
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Transform user-friendly overrides (with property names like 'bucket', 'lambdaLogGroup')
 * to CloudFormation logical names using cfLogicalNames
 */
function transformOverridesToLogicalNames(resourceName: string, resourceType: string, overrides: any): any {
  // Get child resources for this resource type
  const childResources = CHILD_RESOURCES[resourceType] || [];

  // Build a map of property names to child resources
  const propertyNameMap = new Map<string, any>();

  for (const childResource of childResources) {
    // The logicalName function has a name property that matches the property name
    if (childResource.logicalName && childResource.logicalName.name) {
      propertyNameMap.set(childResource.logicalName.name, childResource);
    }
  }

  // Transform overrides object
  const transformedOverrides: any = {};
  const errorMessage = `Override of property {propertyName} of resource ${resourceName} is not supported.\n
Remove the override, run 'stacktape compile:template' command, and find the logical name of the resource you want to override manually. Then add it to the overrides object.`;

  for (const propertyName in overrides) {
    const childResource = propertyNameMap.get(propertyName);

    // Skip unresolvable resources
    if (childResource?.unresolvable) {
      throw new Error(errorMessage.replace('{propertyName}', propertyName));
    }

    if (childResource) {
      const logicalNameFn = childResource.logicalName;
      // Call the cfLogicalNames function to get the actual CloudFormation logical name
      // Try with resourceName first (most common), then try without arguments
      let logicalName: string;
      try {
        logicalName = logicalNameFn(resourceName);
      } catch {
        try {
          logicalName = logicalNameFn();
        } catch {
          // If both fail, use property name as-is
          logicalName = propertyName;
        }
      }
      if (logicalName.includes('undefined')) {
        throw new Error(errorMessage.replace('{propertyName}', propertyName));
      }
      // When using SDK property names, flatten nested objects to dot-notation
      // so { SmsConfiguration: { ExternalId: 'x' } } becomes { 'SmsConfiguration.ExternalId': 'x' }
      const overrideValue = overrides[propertyName];
      if (!transformedOverrides[logicalName]) {
        transformedOverrides[logicalName] = {};
      }
      Object.assign(transformedOverrides[logicalName], flattenToDotNotation(overrideValue));
    } else {
      // If not found in map, use property name as-is (CF logical name used directly)
      // Don't flatten - user is using CF logical names and may want full object replacement
      transformedOverrides[propertyName] = overrides[propertyName];
    }
  }

  return transformedOverrides;
}

/**
 * Transform user-friendly transforms (with property names like 'lambda', 'lambdaLogGroup')
 * to CloudFormation logical names using cfLogicalNames
 * Similar to overrides but the values are functions instead of objects
 */
function transformTransformsToLogicalNames(resourceName: string, resourceType: string, transforms: any): any {
  // Get child resources for this resource type
  const childResources = CHILD_RESOURCES[resourceType] || [];

  // Build a map of property names to child resources
  const propertyNameMap = new Map<string, any>();

  for (const childResource of childResources) {
    // The logicalName function has a name property that matches the property name
    if (childResource.logicalName && childResource.logicalName.name) {
      propertyNameMap.set(childResource.logicalName.name, childResource);
    }
  }

  // Transform transforms object
  const transformedTransforms: any = {};
  const errorMessage = `Transform of property {propertyName} of resource ${resourceName} is not supported.\n
Remove the transform, run 'stacktape compile:template' command, and find the logical name of the resource you want to transform manually. Then add it to the transforms object.`;

  for (const propertyName in transforms) {
    const childResource = propertyNameMap.get(propertyName);

    // Skip unresolvable resources
    if (childResource?.unresolvable) {
      throw new Error(errorMessage.replace('{propertyName}', propertyName));
    }

    if (childResource) {
      const logicalNameFn = childResource.logicalName;
      // Call the cfLogicalNames function to get the actual CloudFormation logical name
      // Try with resourceName first (most common), then try without arguments
      let logicalName: string;
      try {
        logicalName = logicalNameFn(resourceName);
      } catch {
        try {
          logicalName = logicalNameFn();
        } catch {
          // If both fail, use property name as-is
          logicalName = propertyName;
        }
      }
      if (logicalName.includes('undefined')) {
        throw new Error(errorMessage.replace('{propertyName}', propertyName));
      }
      transformedTransforms[logicalName] = transforms[propertyName];
    } else {
      // If not found in map, use property name as-is (shouldn't happen with proper types)
      transformedTransforms[propertyName] = transforms[propertyName];
    }
  }

  return transformedTransforms;
}

export type GetConfigParams = {
  /**
   * Project name used for this operation
   */
  projectName: string;
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
  cliArgs: StacktapeArgs;
  /**
   * Stacktape command used to perform this operation (can be either deploy, codebuild:deploy, delete, etc.)
   */
  command: string;
  /**
   * Locally-configured AWS profile used to execute the operation.
   * Doesn't apply if you have your AWS account connected in "automatic" mode.
   */
  awsProfile: string;
  /**
   * Information about the user performing the stack operation
   */
  user: {
    id: string;
    name: string;
    email: string;
  };
};

/**
 * Helper function to define a config with automatic transformation
 * Use this when exporting your config for the Stacktape CLI
 */
export const defineConfig = (configFn: (params: GetConfigParams) => StacktapeConfig) => {
  return (params: GetConfigParams) => {
    const config = configFn(params);
    return transformConfigWithResources(config);
  };
};

/**
 * Transforms a config with resource instances into a plain config object
 */
export const transformConfigWithResources = (config: any): any => {
  if (!config || typeof config !== 'object') {
    return config;
  }

  // First pass: set all resource names from object keys
  // This must happen before any transformation so that ResourceParamReferences can resolve names
  if (config.resources && typeof config.resources === 'object') {
    for (const key in config.resources) {
      const resource = config.resources[key];
      if (isBaseResource(resource)) {
        (resource as any)[setResourceNameSymbol](key);
      }
    }
  }

  // Second pass: transform the config
  const result: any = {};
  for (const key in config) {
    if (key === 'resources') {
      // Resources are transformed as definitions
      result[key] = transformResourceDefinitions(config[key]);
    } else if (key === 'scripts') {
      // Scripts are also transformed as definitions
      result[key] = transformScriptDefinitions(config[key]);
    } else {
      result[key] = transformValue(config[key]);
    }
  }
  return result;
};

/**
 * Transforms environment object to array format
 */
const transformEnvironment = (env: any): any => {
  if (!env || typeof env !== 'object' || Array.isArray(env)) {
    return env;
  }

  // Convert { KEY: value } to [{ name: 'KEY', value }]
  return Object.entries(env).map(([name, value]) => ({
    name,
    value: transformValue(value)
  }));
};

/**
 * Transforms resource definitions (values in the resources object)
 */
const transformResourceDefinitions = (resources: any): any => {
  if (!resources || typeof resources !== 'object') {
    return resources;
  }

  const result: any = {};
  for (const key in resources) {
    const resource = resources[key];
    if (isBaseResource(resource)) {
      const type = (resource as any)[getTypeSymbol]();
      const properties = (resource as any)[getPropertiesSymbol]();
      const overrides = (resource as any)[getOverridesSymbol]();
      const transforms = (resource as any)[getTransformsSymbol]();
      result[key] = {
        type,
        properties: transformValue(properties),
        ...(overrides !== undefined && { overrides: transformValue(overrides) }),
        ...(transforms !== undefined && { transforms })
      };
    } else {
      result[key] = transformValue(resource);
    }
  }
  return result;
};

/**
 * Transforms script definitions (values in the scripts object)
 */
const transformScriptDefinitions = (scripts: any): any => {
  if (!scripts || typeof scripts !== 'object') {
    return scripts;
  }

  const result: any = {};
  for (const key in scripts) {
    const script = scripts[key];
    if (isBaseTypeProperties(script)) {
      result[key] = {
        type: script.type,
        properties: transformValue(script.properties)
      };
    } else {
      result[key] = transformValue(script);
    }
  }
  return result;
};

export const transformValue = (value: any): any => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    const rewrittenDirective = rewriteEmbeddedDirectivesToCfFormat(value);
    if (rewrittenDirective !== null) {
      return rewrittenDirective;
    }
  }

  // Transform DeferredResourceName - resolve to actual name
  if (isDeferredResourceName(value)) {
    return value.resolve();
  }

  // Transform ResourceParamReference
  if (isResourceParamReference(value)) {
    return value.toString();
  }

  // Transform BaseResource references (not definitions) to resourceName
  // This handles cases like connectTo: [database]
  if (isBaseResource(value)) {
    return value.resourceName;
  }

  // Transform BaseTypeProperties (engines, packaging, events) to plain object
  if (isBaseTypeProperties(value)) {
    // Handle type-only classes (no properties)
    if (!('properties' in value) || value.properties === undefined) {
      return { type: value.type };
    }
    return {
      type: value.type,
      properties: transformValue(value.properties)
    };
  }

  // Transform Alarm class to plain object
  if (isAlarm(value)) {
    const result: any = {
      trigger: transformValue(value.trigger)
    };
    if (value.evaluation !== undefined) {
      result.evaluation = transformValue(value.evaluation);
    }
    if (value.notificationTargets !== undefined) {
      result.notificationTargets = transformValue(value.notificationTargets);
    }
    if (value.description !== undefined) {
      result.description = value.description;
    }
    return result;
  }

  // Transform arrays
  if (Array.isArray(value)) {
    return value.map((item) => {
      // If it's a resource instance in an array (e.g., connectTo), transform to resourceName
      if (isBaseResource(item)) {
        return item.resourceName;
      }
      return transformValue(item);
    });
  }

  // Transform objects
  if (typeof value === 'object') {
    const result: any = {};
    for (const key in value) {
      // Special handling for environment and injectEnvironment properties
      if (key === 'environment' || key === 'injectEnvironment') {
        result[key] = transformEnvironment(value[key]);
      } else {
        result[key] = transformValue(value[key]);
      }
    }
    return result;
  }

  return value;
};

const rewriteEmbeddedDirectivesToCfFormat = (value: string): string | null => {
  const embeddedDirectives = getEmbeddedDirectives(value);
  if (embeddedDirectives.length === 0) {
    return null;
  }

  if (
    embeddedDirectives.length === 1 &&
    embeddedDirectives[0].startPos === 0 &&
    embeddedDirectives[0].endPos === value.length
  ) {
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
  return `$CfFormat('${escapedInterpolatedString}', ${directiveArgs})`;
};

const getEmbeddedDirectives = (value: string): Array<{ definition: string; startPos: number; endPos: number }> => {
  const directives: Array<{ definition: string; startPos: number; endPos: number }> = [];

  const tryParseDirectiveAt = (str: string, startPos: number): { definition: string; endPos: number } | null => {
    if (str[startPos] !== '$') {
      return null;
    }

    let idx = startPos + 1;
    const firstNameChar = str[idx];
    if (!firstNameChar || !firstNameChar.match(/[A-Z_]/i)) {
      return null;
    }

    while (idx < str.length && str[idx].match(/[\w$]/)) {
      idx++;
    }

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
      while (endPos < str.length && str[endPos].match(/[\w$\.]/)) {
        endPos++;
      }
    }

    return {
      definition: str.slice(startPos, endPos),
      endPos
    };
  };

  let idx = 0;
  while (idx < value.length) {
    if (value[idx] === '$') {
      const parsed = tryParseDirectiveAt(value, idx);
      if (parsed) {
        directives.push({ definition: parsed.definition, startPos: idx, endPos: parsed.endPos });
        idx = parsed.endPos;
        continue;
      }
    }
    idx++;
  }

  return directives;
};
