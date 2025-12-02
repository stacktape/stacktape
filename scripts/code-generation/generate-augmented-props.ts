import type { ResourceClassName } from '@api/npm/ts/class-config';
import type { PropertyInfo } from './types';
import {
  getResourcesWithAugmentedProps,
  getResourcesWithOverrides,
  RESOURCES_CONVERTIBLE_TO_CLASSES
} from '../../src/api/npm/ts/resource-metadata';
import { formatJSDoc, getSDKPropertyInfo } from './jsdoc-extractor';

/**
 * Script props types that need augmented connectTo/environment
 */
const SCRIPT_PROPS_TYPES = ['LocalScriptProps', 'BastionScriptProps', 'LocalScriptWithBastionTunnelingProps'] as const;

/**
 * All connectable resource types (for scripts that can connect to anything)
 */
const ALL_CONNECTABLE_RESOURCES = [
  'RelationalDatabase',
  'Bucket',
  'HostingBucket',
  'DynamoDbTable',
  'EventBus',
  'RedisCluster',
  'MongoDbAtlasCluster',
  'UpstashRedis',
  'SqsQueue',
  'SnsTopic',
  'OpenSearchDomain',
  'EfsFilesystem',
  'PrivateService',
  'WebService',
  'LambdaFunction',
  'BatchJob',
  'UserAuthPool',
  'GlobalAwsServiceConstant'
] as const;

/**
 * Default JSDoc for connectTo property (used as fallback)
 */
const DEFAULT_CONNECT_TO_JSDOC = {
  description: `List of resources or AWS services to which this resource receives permissions.
Automatically grants necessary IAM permissions for accessing the connected resources.`,
  tags: []
};

/**
 * Default JSDoc for environment property (used as fallback)
 */
const DEFAULT_ENVIRONMENT_JSDOC = {
  description: `Environment variables to set for this resource.
You can reference resource parameters using directive syntax: \$ResourceParam('resourceName', 'paramName')`,
  tags: []
};

/**
 * Default JSDoc for overrides property
 */
const DEFAULT_OVERRIDES_JSDOC = {
  description: `Override properties of underlying CloudFormation resources.
Allows fine-grained control over the generated infrastructure.`,
  tags: []
};

/**
 * Default JSDoc for transforms property
 */
const DEFAULT_TRANSFORMS_JSDOC = {
  description: `Transform functions for underlying CloudFormation resources.
Each function receives the current properties and returns modified properties.
Unlike overrides, transforms allow dynamic modification based on existing values.`,
  tags: []
};

/**
 * Generates a property declaration with JSDoc
 */
function generatePropertyWithJSDoc(propertyInfo: PropertyInfo, indent: string = '  '): string {
  const lines: string[] = [];

  if (propertyInfo.jsdoc) {
    lines.push(formatJSDoc(propertyInfo.jsdoc, indent));
  }

  const optionalMarker = propertyInfo.optional ? '?' : '';
  lines.push(`${indent}${propertyInfo.name}${optionalMarker}: ${propertyInfo.type};`);

  return lines.join('\n');
}

/**
 * Gets connectTo property info with JSDoc from SDK type or uses default
 */
function getConnectToPropertyInfo(sdkTypeName: string, connectToType: string): PropertyInfo {
  const sdkPropertyInfo = getSDKPropertyInfo(sdkTypeName, 'connectTo');

  return {
    name: 'connectTo',
    type: `${connectToType}[]`,
    optional: true,
    jsdoc: sdkPropertyInfo?.jsdoc || DEFAULT_CONNECT_TO_JSDOC
  };
}

/**
 * Gets environment property info with JSDoc from SDK type or uses default
 */
function getEnvironmentPropertyInfo(sdkTypeName: string): PropertyInfo {
  const sdkPropertyInfo = getSDKPropertyInfo(sdkTypeName, 'environment');

  return {
    name: 'environment',
    type: '{ [envVarName: string]: string | number | boolean }',
    optional: true,
    jsdoc: sdkPropertyInfo?.jsdoc || DEFAULT_ENVIRONMENT_JSDOC
  };
}

/**
 * Gets overrides property info with JSDoc
 */
function getOverridesPropertyInfo(overridesTypeName: string): PropertyInfo {
  return {
    name: 'overrides',
    type: overridesTypeName,
    optional: true,
    jsdoc: DEFAULT_OVERRIDES_JSDOC
  };
}

/**
 * Gets transforms property info with JSDoc
 */
function getTransformsPropertyInfo(transformsTypeName: string): PropertyInfo {
  return {
    name: 'transforms',
    type: transformsTypeName,
    optional: true,
    jsdoc: DEFAULT_TRANSFORMS_JSDOC
  };
}

/**
 * Generates a ConnectTo type alias for a resource
 */
function generateConnectToType(resourceType: string, canConnectTo: readonly string[]): string {
  if (resourceType === 'Script') {
    return `type ${resourceType}ConnectTo = ${[...ALL_CONNECTABLE_RESOURCES].join(' | ')};`;
  }

  const connectToList = [...canConnectTo, 'GlobalAwsServiceConstant'];
  return `type ${resourceType}ConnectTo = ${connectToList.join(' | ')};`;
}

/**
 * Generates an augmented props type declaration
 */
function generateAugmentedPropsType(
  propsType: string,
  originalPropsType: string,
  resourceType: ResourceClassName,
  connectToType: string,
  includeOverridesAndTransforms: boolean
): string {
  const lines: string[] = [];

  // Special handling for ContainerWorkloadProps - also omit 'containers' to replace with augmented container type
  const isContainerWorkload = resourceType === 'MultiContainerWorkload';
  const omitFields = isContainerWorkload ? "'connectTo' | 'environment' | 'containers'" : "'connectTo' | 'environment'";

  // Start the type declaration
  lines.push(`export type ${propsType} = Omit<${originalPropsType}, ${omitFields}> & {`);

  // Add connectTo property with JSDoc
  const connectToProperty = getConnectToPropertyInfo(originalPropsType, connectToType);
  lines.push(generatePropertyWithJSDoc(connectToProperty));

  // Add environment property with JSDoc
  const environmentProperty = getEnvironmentPropertyInfo(originalPropsType);
  lines.push(generatePropertyWithJSDoc(environmentProperty));

  // Add containers with augmented type for ContainerWorkload
  if (isContainerWorkload) {
    lines.push(`  /**
   * A list of containers that will run in this workload.
   * Containers within the same workload share computing resources and scale together.
   */
  containers: ContainerWithObjectEnv[];`);
  }

  // Add overrides and transforms if needed
  if (includeOverridesAndTransforms) {
    const overridesProperty = getOverridesPropertyInfo(`${resourceType}Overrides`);
    lines.push(generatePropertyWithJSDoc(overridesProperty));

    const transformsProperty = getTransformsPropertyInfo(`${resourceType}Transforms`);
    lines.push(generatePropertyWithJSDoc(transformsProperty));
  }

  lines.push('};');

  return lines.join('\n');
}

/**
 * Generates augmented container types with object-style environment
 */
function generateContainerAugmentedTypes(): string {
  return `// Augmented container types with object-style environment
/**
 * Container configuration with object-style environment variables.
 * Environment is specified as { KEY: 'value' } for better developer experience.
 */
export type ContainerWithObjectEnv = Omit<import('./sdk').ContainerWorkloadContainer, 'environment'> & {
  /**
   * Environment variables to inject into the container.
   * Specified as key-value pairs: { PORT: '3000', NODE_ENV: 'production' }
   */
  environment?: { [envVarName: string]: string | number | boolean };
};
`;
}

/**
 * Generates a WithOverrides type for resources without augmented props
 * Also includes transforms
 */
function generateWithOverridesAndTransformsType(propsType: string, className: string): string {
  const lines: string[] = [];

  lines.push(`export type ${propsType}WithOverrides = ${propsType} & {`);

  const overridesProperty = getOverridesPropertyInfo(`${className}Overrides`);
  lines.push(generatePropertyWithJSDoc(overridesProperty));

  const transformsProperty = getTransformsPropertyInfo(`${className}Transforms`);
  lines.push(generatePropertyWithJSDoc(transformsProperty));

  lines.push('};');

  return lines.join('\n');
}

/**
 * Generate augmented props types (Props with modified connectTo and environment)
 * Preserves JSDoc comments from original SDK types
 */
export function generateAugmentedPropsTypes(): string {
  const result: string[] = [];

  const resourcesWithAugmented = getResourcesWithAugmentedProps();

  // Collect all props that need ConnectTo types
  const connectToTypeNeeded = new Set<string>();

  // Process main resources
  for (const resource of resourcesWithAugmented) {
    connectToTypeNeeded.add(resource.className as string);
  }

  // Add Script type for script props
  connectToTypeNeeded.add('Script');

  // Generate ConnectTo type aliases
  result.push('// ConnectTo type aliases');
  for (const resourceType of connectToTypeNeeded) {
    if (resourceType === 'Script') {
      result.push(generateConnectToType('Script', ALL_CONNECTABLE_RESOURCES));
    } else {
      const resource = RESOURCES_CONVERTIBLE_TO_CLASSES.find((r) => r.className === (resourceType as any));
      if (resource && resource.canConnectTo) {
        result.push(generateConnectToType(resourceType, resource.canConnectTo));
      }
    }
  }

  result.push('');

  // Generate augmented container types (for MultiContainerWorkload)
  result.push(generateContainerAugmentedTypes());

  result.push('// Augmented props types with connectTo, environment, overrides, and transforms');
  result.push('');

  // Generate augmented props for resources
  for (const resource of resourcesWithAugmented) {
    const augmentedType = generateAugmentedPropsType(
      resource.propsType,
      `Sdk${resource.propsType}`,
      resource.className as string,
      `${resource.className}ConnectTo`,
      true // includeOverridesAndTransforms
    );
    result.push(augmentedType);
    result.push('');
  }

  // Generate augmented props for scripts
  for (const scriptPropsType of SCRIPT_PROPS_TYPES) {
    const augmentedType = generateAugmentedPropsType(
      scriptPropsType,
      `Sdk${scriptPropsType}`,
      'Script',
      'ScriptConnectTo',
      false // Scripts don't have overrides or transforms
    );
    result.push(augmentedType);
    result.push('');
  }

  // Generate WithOverrides types for other resources
  result.push('// WithOverrides types for resources without connectTo augmentation');
  result.push('');

  const augmentedPropsNames = [...resourcesWithAugmented.map((r) => r.propsType), ...SCRIPT_PROPS_TYPES];

  const resourcesWithOverrides = getResourcesWithOverrides();
  for (const resource of resourcesWithOverrides) {
    if (!augmentedPropsNames.includes(resource.propsType)) {
      const withOverridesType = generateWithOverridesAndTransformsType(
        resource.propsType,
        resource.className as string
      );
      result.push(withOverridesType);
      result.push('');
    }
  }

  return result.join('\n');
}

/**
 * Generate SDK import aliases for props types
 * Returns a string for the import statement
 */
export function generateSdkPropsImports(): string {
  const sdkPropsWithAugmentation = [...getResourcesWithAugmentedProps().map((r) => r.propsType), ...SCRIPT_PROPS_TYPES];

  const allResources = RESOURCES_CONVERTIBLE_TO_CLASSES;
  const sdkPropsWithoutAugmentation = allResources
    .map((r) => r.propsType)
    .filter((propsType) => !sdkPropsWithAugmentation.includes(propsType));

  const imports = [...sdkPropsWithAugmentation.map((prop) => `${prop} as Sdk${prop}`), ...sdkPropsWithoutAugmentation];

  return imports.join(',\n  ');
}

/**
 * Generate a StacktapeConfig type export that properly types resources with class names
 * Accepts both class instances and plain objects matching the interface types
 */
export function generateStacktapeConfigType(): string {
  const resourceClassNames = RESOURCES_CONVERTIBLE_TO_CLASSES.map((r) => r.className);

  return `// Re-export StacktapeConfig with properly typed resources
// Accepts both class instances and plain objects
import type { StacktapeResourceDefinition } from './sdk';

/**
 * CloudFormation template structure
 */
export type CloudFormationTemplate = {
  AWSTemplateFormatVersion?: string;
  Description?: string;
  Transform?: string[];
  Parameters?: Record<string, unknown>;
  Mappings?: Record<string, unknown>;
  Conditions?: Record<string, unknown>;
  Resources: { [logicalName: string]: CloudFormationResource };
  Outputs?: Record<string, { Value: unknown; Description?: string; Export?: { Name: string } }>;
  Hooks?: Record<string, unknown>;
};

export type StacktapeConfig = Omit<import('./sdk').StacktapeConfig, 'resources' | 'cloudformationResources' | 'scripts'> & {
  resources: { [resourceName: string]: ${resourceClassNames.join(' | ')} | StacktapeResourceDefinition };
  /**
   * #### Scripts that can be executed using the \`stacktape script:run\` command.
   *
   * ---
   *
   * Scripts can be either shell commands or files written in JavaScript, TypeScript, or Python.
   */
  scripts?: { [scriptName: string]: LocalScript | BastionScript | LocalScriptWithBastionTunneling | import('./sdk').LocalScript | import('./sdk').BastionScript | import('./sdk').LocalScriptWithBastionTunneling };
  /**
   * #### Raw CloudFormation resources that will be deployed in this stack.
   *
   * ---
   *
   * These resources will be merged with the resources managed by Stacktape.
   * Each CloudFormation resource consists of a logical name and its definition.
   *
   * To avoid logical name conflicts, you can see all logical names for resources deployed by Stacktape using the \`stacktape stack-info --detailed\` command.
   * Resources specified here do not count towards your resource limit.
   *
   * For a list of all supported AWS CloudFormation resources, see the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html).
   */
  cloudformationResources?: { [resourceName: string]: CloudFormationResource };
  /**
   * #### Final transform function for the entire CloudFormation template.
   *
   * ---
   *
   * This function is called after all other processing (including resource transforms and overrides) is complete.
   * It receives the entire CloudFormation template and must return the modified template.
   *
   * Use this for advanced customizations that need access to the full template structure.
   *
   * @example
   * finalTransform: (template) => {
   *   // Add a global tag to all resources
   *   for (const resource of Object.values(template.Resources)) {
   *     if (resource.Properties?.Tags) {
   *       resource.Properties.Tags.push({ Key: 'Environment', Value: 'production' });
   *     }
   *   }
   *   return template;
   * }
   */
  finalTransform?: (template: CloudFormationTemplate) => CloudFormationTemplate;
};`;
}
