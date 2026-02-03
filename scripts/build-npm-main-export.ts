/* eslint-disable ts/no-require-imports */
import type { JsonSchemaGenerator } from 'typescript-json-schema';
import type { ChildResourcesMap, ReferenceableParamsMap } from './code-generation/types';
import { join } from 'node:path';
import { NPM_RELEASE_FOLDER_PATH, SOURCE_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { buildEsCode } from '@shared/packaging/bundlers/es';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { localBuildTsConfigPath } from '@shared/utils/misc';
import { prettifyFile } from '@shared/utils/prettier';
import { outputFile } from 'fs-extra';
import * as ts from 'typescript';
import {
  getResourcesWithAugmentedProps,
  MISC_TYPES_CONVERTIBLE_TO_CLASSES,
  RESOURCES_CONVERTIBLE_TO_CLASSES
} from '../src/api/npm/ts/resource-metadata';
import {
  generateAugmentedPropsTypes,
  generatePlainPropsImports,
  generateStacktapeConfigType
} from './code-generation/generate-augmented-props';
import { generatePropertiesInterfaces } from './code-generation/generate-cf-properties';
import { generateCloudFormationResourceType } from './code-generation/generate-cloudformation-resource-type';
import { generateOverrideTypes, generateTransformsTypes } from './code-generation/generate-overrides';
import { generateResourceClassDeclarations } from './code-generation/generate-resource-classes';
import {
  generateTypePropertiesClassDeclarations,
  getTypePropertiesImports
} from './code-generation/generate-type-properties';
import { getJsonSchemaGenerator, getTsTypeDef } from './code-generation/utils';

const PATHS = {
  source: join(SOURCE_FOLDER_PATH, 'api', 'npm', 'ts', 'index.ts'),
  distJs: join(NPM_RELEASE_FOLDER_PATH, 'index.js'),
  distDts: join(NPM_RELEASE_FOLDER_PATH, 'index.d.ts'),
  distTypesDts: join(NPM_RELEASE_FOLDER_PATH, 'types.d.ts'),
  distPlainDts: join(NPM_RELEASE_FOLDER_PATH, 'plain.d.ts'),
  distCloudformationDts: join(NPM_RELEASE_FOLDER_PATH, 'cloudformation.d.ts'),
  childResources: join(SOURCE_FOLDER_PATH, 'api', 'npm', 'ts', 'child-resources.ts'),
  resourceMetadata: join(SOURCE_FOLDER_PATH, 'api', 'npm', 'ts', 'resource-metadata.ts')
} as const;

const SOURCE_FILES = [
  'config.ts',
  'resources.ts',
  'type-properties.ts',
  'global-aws-services.ts',
  'directives.ts',
  'resource-metadata.ts'
].map((file) => join(SOURCE_FOLDER_PATH, 'api', 'npm', 'ts', file));

/**
 * Type aliases for Props types that need to extract 'properties' from discriminated unions
 * Maps expected propsType name to the path to access the properties
 */
const PROPS_TYPE_PROPERTIES_ALIASES: Record<string, string> = {
  // Lambda event integration types - need ['properties'] accessor
  HttpApiIntegrationProps: "HttpApiIntegration['properties']",
  S3IntegrationProps: "S3Integration['properties']",
  ScheduleIntegrationProps: "ScheduleIntegration['properties']",
  SnsIntegrationProps: "SnsIntegration['properties']",
  SqsIntegrationProps: "SqsIntegration['properties']",
  KinesisIntegrationProps: "KinesisIntegration['properties']",
  DynamoDbIntegrationProps: "DynamoDbIntegration['properties']",
  CloudwatchLogIntegrationProps: "CloudwatchLogIntegration['properties']",
  ApplicationLoadBalancerIntegrationProps: "ApplicationLoadBalancerIntegration['properties']",
  EventBusIntegrationProps: "EventBusIntegration['properties']",
  KafkaTopicIntegrationProps: "KafkaTopicIntegration['properties']",
  AlarmIntegrationProps: "AlarmIntegration['properties']",
  // Container workload integration types
  SqsQueueEventBusIntegrationProps: "SqsQueueEventBusIntegration['properties']",
  ContainerWorkloadHttpApiIntegrationProps: "ContainerWorkloadHttpApiIntegration['properties']",
  ContainerWorkloadLoadBalancerIntegrationProps: "ContainerWorkloadLoadBalancerIntegration['properties']",
  ContainerWorkloadNetworkLoadBalancerIntegrationProps: "ContainerWorkloadNetworkLoadBalancerIntegration['properties']",
  ContainerWorkloadInternalIntegrationProps: "ContainerWorkloadInternalIntegration['properties']",
  ContainerWorkloadServiceConnectIntegrationProps: "ContainerWorkloadServiceConnectIntegration['properties']"
};

/**
 * Type aliases for Props types that map directly to different type names (no properties extraction)
 */
const PROPS_TYPE_ALIASES: Record<string, string> = {
  // EFS mount types - these don't have type/properties structure
  ContainerEfsMountProps: 'ContainerEfsMount',
  LambdaEfsMountProps: 'LambdaEfsMount'
};

/**
 * Types that don't exist at all and need placeholder definitions
 * These are typically types that aren't referenced from StacktapeConfig root
 */
const MISSING_TYPES_PLACEHOLDERS = [
  'IotIntegrationProps' // IoT integration exists in source but not generated from schema
];

/**
 * Generates type aliases for Props types that don't exist in plain.d.ts
 * Also generates placeholder types for types that don't exist at all
 */
function generatePropsTypeAliases(): string {
  // Aliases that extract 'properties' from discriminated unions
  const propertiesAliases = Object.entries(PROPS_TYPE_PROPERTIES_ALIASES)
    .map(([aliasName, path]) => `export type ${aliasName} = import('./plain').${path};`)
    .join('\n');

  // Aliases that map directly to different type names
  const directAliases = Object.entries(PROPS_TYPE_ALIASES)
    .map(([aliasName, actualName]) => `export type ${aliasName} = import('./plain').${actualName};`)
    .join('\n');

  const placeholders = MISSING_TYPES_PLACEHOLDERS.map(
    (typeName) => `export type ${typeName} = Record<string, unknown>;`
  ).join('\n');

  return `// Props type aliases extracting 'properties' from discriminated unions\n${propertiesAliases}\n\n// Direct type aliases\n${directAliases}\n\n// Placeholder types for missing types\n${placeholders}`;
}

/**
 * Plain types that need to be bundled into plain.d.ts
 * These are the YAML-equivalent types without class augmentation
 */
const _PLAIN_TYPES_TO_GENERATE = [
  'StacktapeConfig',
  'StacktapeResourceDefinition',
  // Resource types
  'LambdaFunction',
  'WebService',
  'PrivateService',
  'WorkerService',
  'MultiContainerWorkload',
  'ContainerWorkload',
  'BatchJob',
  'RelationalDatabase',
  'Bucket',
  'HostingBucket',
  'DynamoDbTable',
  'EventBus',
  'HttpApiGateway',
  'ApplicationLoadBalancer',
  'NetworkLoadBalancer',
  'RedisCluster',
  'MongoDbAtlasCluster',
  'StateMachine',
  'UserAuthPool',
  'UpstashRedis',
  'SqsQueue',
  'SnsTopic',
  'KinesisStream',
  'WebAppFirewall',
  'OpenSearchDomain',
  'EfsFilesystem',
  'NextjsWeb',
  'Bastion',
  'EdgeLambdaFunction',
  // Script types
  'LocalScript',
  'BastionScript',
  'LocalScriptWithBastionTunneling',
  // Props types (for resources)
  'WebServiceProps',
  'PrivateServiceProps',
  'WorkerServiceProps',
  'ContainerWorkloadProps',
  'LambdaFunctionProps',
  'BatchJobProps',
  'StateMachineProps',
  'NextjsWebProps',
  'LocalScriptProps',
  'BastionScriptProps',
  'LocalScriptWithBastionTunnelingProps',
  'RelationalDatabaseProps',
  'BucketProps',
  'HostingBucketProps',
  'DynamoDbTableProps',
  'EventBusProps',
  'HttpApiGatewayProps',
  'ApplicationLoadBalancerProps',
  'NetworkLoadBalancerProps',
  'RedisClusterProps',
  'MongoDbAtlasClusterProps',
  'UserAuthPoolProps',
  'UpstashRedisProps',
  'SqsQueueProps',
  'SnsTopicProps',
  'KinesisStreamProps',
  'WebAppFirewallProps',
  'OpenSearchDomainProps',
  'EfsFilesystemProps',
  'BastionProps',
  'EdgeLambdaFunctionProps',
  // Engine types
  'RdsEngineProperties',
  'AuroraEngineProperties',
  'AuroraServerlessEngineProperties',
  'AuroraServerlessV2EngineProperties',
  // Packaging types
  'StpBuildpackLambdaPackagingProps',
  'CustomArtifactLambdaPackagingProps',
  'PrebuiltImageCwPackagingProps',
  'CustomDockerfileCwImagePackagingProps',
  'ExternalBuildpackCwImagePackagingProps',
  'NixpacksCwImagePackagingProps',
  'StpBuildpackCwImagePackagingProps',
  // Event integration types
  'HttpApiIntegrationProps',
  'S3IntegrationProps',
  'ScheduleIntegrationProps',
  'SnsIntegrationProps',
  'SqsIntegrationProps',
  'KinesisIntegrationProps',
  'DynamoDbIntegrationProps',
  'CloudwatchLogIntegrationProps',
  'ApplicationLoadBalancerIntegrationProps',
  'EventBusIntegrationProps',
  'KafkaTopicIntegrationProps',
  'AlarmIntegrationProps',
  'IotIntegrationProps',
  // CDN types
  'CdnLoadBalancerOrigin',
  'CdnHttpApiGatewayOrigin',
  'CdnLambdaFunctionOrigin',
  'CdnCustomOrigin',
  'CdnBucketOrigin',
  // WAF types
  'ManagedRuleGroupProps',
  'CustomRuleGroupProps',
  'RateBasedStatementProps',
  // Container workload integration types
  'SqsQueueEventBusIntegrationProps',
  'ContainerWorkloadHttpApiIntegrationProps',
  'ContainerWorkloadLoadBalancerIntegrationProps',
  'ContainerWorkloadNetworkLoadBalancerIntegrationProps',
  'ContainerWorkloadInternalIntegrationProps',
  'ContainerWorkloadServiceConnectIntegrationProps',
  'ContainerWorkloadContainer',
  'BatchJobContainer',
  // Log forwarding types
  'HttpEndpointLogForwardingProps',
  'HighlightLogForwardingProps',
  'DatadogLogForwardingProps',
  // Lifecycle rules
  'ExpirationProps',
  'NonCurrentVersionExpirationProps',
  // EFS mount types
  'ContainerEfsMountProps',
  'LambdaEfsMountProps',
  // Authorizer types
  'CognitoAuthorizerProperties',
  'LambdaAuthorizerProperties',
  // Alarm trigger types
  'ApplicationLoadBalancerCustomTriggerProps',
  'ApplicationLoadBalancerErrorRateTriggerProps',
  'ApplicationLoadBalancerUnhealthyTargetsTriggerProps',
  'HttpApiGatewayErrorRateTriggerProps',
  'HttpApiGatewayLatencyTriggerProps',
  'RelationalDatabaseReadLatencyTriggerProps',
  'RelationalDatabaseWriteLatencyTriggerProps',
  'RelationalDatabaseCPUUtilizationTriggerProps',
  'RelationalDatabaseFreeStorageTriggerProps',
  'RelationalDatabaseFreeMemoryTriggerProps',
  'RelationalDatabaseConnectionCountTriggerProps',
  'SqsQueueReceivedMessagesCountTriggerProps',
  'SqsQueueNotEmptyTrigger',
  'LambdaErrorRateTriggerProps',
  'LambdaDurationTriggerProps',
  // Custom resource types
  'CustomResourceDefinitionProps',
  'CustomResourceInstanceProps',
  'DeploymentScriptProps',
  // Alarm types
  'AlarmUserIntegration',
  // IAM types
  'StpIamRoleStatement',
  // Config section types
  'Hooks',
  'DeploymentConfig',
  'StackConfig',
  'BudgetControl'
];

/**
 * Extracts essential declarations from compiled config.d.ts
 */
/**
 * Generates essential declarations inline to avoid duplication issues from compiled TS
 */
function generateEssentialDeclarations(): string {
  return `
/**
 * Parameters passed to the getConfig/defineConfig function.
 */
export type GetConfigParams = {
  /** Project name used for this operation */
  projectName: string;
  /** Stage ("environment") used for this operation */
  stage: string;
  /** AWS region used for this operation */
  region: string;
  /** List of arguments passed to the operation */
  cliArgs: StacktapeArgs;
  /** Stacktape command used to perform this operation */
  command: string;
  /** Locally-configured AWS profile used to execute the operation */
  profile: string | undefined;
};

declare const getParamReferenceSymbol: unique symbol;
declare const getTypeSymbol: unique symbol;
declare const getPropertiesSymbol: unique symbol;
declare const getOverridesSymbol: unique symbol;
declare const getTransformsSymbol: unique symbol;
declare const setResourceNameSymbol: unique symbol;
declare const resourceParamRefSymbol: unique symbol;
declare const baseTypePropertiesSymbol: unique symbol;
declare const alarmSymbol: unique symbol;

/**
 * A reference to a resource parameter that will be resolved at runtime.
 * Stores a reference to the resource for lazy name resolution.
 */
export declare class ResourceParamReference {
  private __resource;
  private __param;
  readonly [resourceParamRefSymbol]: true;
  constructor(resource: BaseResource, param: string);
  toString(): string;
  toJSON(): string;
  valueOf(): string;
}

/**
 * Base class for type/properties structures (engines, packaging, events, etc.)
 */
export declare class BaseTypeProperties {
  readonly type: string;
  readonly properties: any;
  readonly [baseTypePropertiesSymbol]: true;
  constructor(type: string, properties: any);
}

/**
 * Base class for type-only structures (no properties field, just type discriminator)
 */
export declare class BaseTypeOnly {
  readonly type: string;
  readonly [baseTypePropertiesSymbol]: true;
  constructor(type: string);
}

/**
 * Defines a CloudWatch alarm that monitors a metric and triggers notifications when thresholds are breached.
 */
export declare class Alarm {
  readonly trigger: any;
  readonly evaluation?: any;
  readonly notificationTargets?: import('./plain').AlarmUserIntegration[];
  readonly description?: string;
  readonly [alarmSymbol]: true;
  constructor(props: { trigger: any; evaluation?: any; notificationTargets?: import('./plain').AlarmUserIntegration[]; description?: string });
}

/**
 * Base resource class that provides common functionality
 */
export declare class BaseResource {
  private readonly _type;
  private _properties;
  private _overrides?;
  private _transforms?;
  private _resourceName;
  private _explicitName;
  constructor(name: string | undefined, type: string, properties: any, overrides?: any);
  private _processOverridesAndTransforms;
  get resourceName(): string;
  [setResourceNameSymbol](name: string): void;
  [getParamReferenceSymbol](paramName: string): ResourceParamReference;
  [getTypeSymbol](): string;
  [getPropertiesSymbol](): any;
  [getOverridesSymbol](): any | undefined;
  [getTransformsSymbol](): any | undefined;
}
`;
}

const compileTsConfigHelpersSource = async () => {
  logInfo('Compiling TypeScript config helpers source...');

  await buildEsCode({
    keepNames: true,
    sourceMapBannerType: 'pre-compiled',
    sourceMaps: 'inline',
    minify: false,
    nodeTarget: '22',
    cwd: process.cwd(),
    externals: [],
    tsConfigPath: localBuildTsConfigPath,
    sourcePath: PATHS.source,
    distPath: PATHS.distJs
  });

  logSuccess('TypeScript config helpers source compiled successfully');
};

function cleanDeclarations(content: string, keepSdkImports: boolean = false): string {
  let cleaned = content;

  if (keepSdkImports) {
    const sdkImportMatch = cleaned.match(/^import\s+type\s+\{[^}]+\}\s+from\s+['"]@stacktape\/sdk\/sdk['"];?\s*$/gm);
    const sdkImports = sdkImportMatch ? sdkImportMatch.join('\n') : '';
    cleaned = cleaned.replace(/^import\s+(?:\S.*?)??from\s+['"].*?['"];?\s*$/gm, '');
    if (sdkImports) {
      cleaned = `${sdkImports}\n\n${cleaned}`;
    }
  } else {
    cleaned = cleaned.replace(/^import\s+(?:\S.*?)??from\s+['"].*?['"];?\s*$/gm, '');
  }

  cleaned = cleaned.replace(/^export\s*\{[\s\S]*?\}\s*from\s+['"].*?['"];?\s*$/gm, '');

  return cleaned.trim();
}

function removeDuplicateDeclarations(content: string): string {
  const duplicatePatterns = [
    'declare const getParamReferenceSymbol:',
    'declare const getTypeSymbol:',
    'declare const getPropertiesSymbol:',
    'declare const getOverridesSymbol:',
    'declare const getTransformsSymbol:',
    'declare const setResourceNameSymbol:',
    'declare const resourceParamRefSymbol:',
    'declare const baseTypePropertiesSymbol:',
    'declare const alarmSymbol:',
    'export declare class BaseResource',
    'export declare class ResourceParamReference',
    'export declare class BaseTypeProperties',
    'export declare class BaseTypeOnly',
    'export declare class Alarm',
    'export type GetConfigParams'
  ];

  const linesToSkip = new Set<number>();
  const lines = content.split('\n');
  let inBlockToSkip = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inBlockToSkip && duplicatePatterns.some((pattern) => line.includes(pattern))) {
      inBlockToSkip = true;
      braceDepth = 0;
    }

    if (inBlockToSkip) {
      linesToSkip.add(i);
      braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

      if (braceDepth <= 0 && (line.includes('}') || line.includes(';'))) {
        inBlockToSkip = false;
      }
    }
  }

  return lines
    .filter((_, i) => !linesToSkip.has(i))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function compileDeclarations(): Map<string, string> {
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false,
    types: ['node'],
    baseUrl: process.cwd()
  };

  const program = ts.createProgram(SOURCE_FILES, compilerOptions);
  const declarations = new Map<string, string>();

  program.emit(
    undefined,
    (fileName, data) => {
      if (fileName.endsWith('.d.ts')) {
        const baseName = fileName.split(/[/\\]/).pop()!.replace('.d.ts', '');
        declarations.set(baseName, data);
      }
    },
    undefined,
    true
  );

  if (declarations.size === 0) {
    throw new Error('Failed to generate TypeScript declarations');
  }

  return declarations;
}

/**
 * Post-processes generated types to fix index signature patterns.
 * Converts `{ [k: string]: any }` to `any` for fields that were originally typed as `any`.
 * This fixes issues with EventBusIntegrationPattern and similar types where fields
 * should accept arrays, objects, or any other value.
 */
function postProcessPlainTypes(content: string): string {
  // Replace standalone `{ [k: string]: any }` or `{ [k: string]: any; }` with `any`
  // This pattern appears when json-schema-to-typescript converts `any` types
  return content
    .replace(/\?:\s*\{\s*\[k:\s*string\]:\s*any;?\s*\}/g, '?: any')
    .replace(/:\s*\{\s*\[k:\s*string\]:\s*any;?\s*\}/g, ': any');
}

/**
 * Generates plain.d.ts - plain types (YAML-equivalent) without class augmentation
 * Uses StacktapeConfig as the root type to generate all types once without duplication
 */
async function generatePlainTypes(jsonSchemaGenerator: JsonSchemaGenerator): Promise<string> {
  logInfo('Generating plain types...');

  // Generate all types from StacktapeConfig root - this includes all nested types without duplication
  const typeDef = await getTsTypeDef({
    typeName: 'StacktapeConfig',
    newTypeName: 'StacktapeConfig',
    jsonSchemaGenerator
  });

  logSuccess('Plain types generated successfully');

  const rawContent = `/* eslint-disable */
// Generated file - Do not edit manually
// Plain types (YAML-equivalent) - no class augmentation
// For class-based types, use: import { X } from 'stacktape'

${typeDef}
`;

  return postProcessPlainTypes(rawContent);
}

/**
 * Generates plain section types for stacktape/types export
 */
function generatePlainSectionTypes(): string {
  return `
// ==========================================
// PLAIN SECTION TYPES (for getConfig pattern)
// ==========================================

/**
 * Plain resources section type (YAML-equivalent).
 * Use this with GetConfigFunction for legacy configs.
 */
export type StacktapeResourcesPlain = import('./plain').StacktapeConfig['resources'];

/**
 * Plain scripts section type (YAML-equivalent).
 * Use this with GetConfigFunction for legacy configs.
 */
export type StacktapeScriptsPlain = import('./plain').StacktapeConfig['scripts'];

/**
 * Plain hooks section type.
 */
export type StacktapeHooksPlain = import('./plain').Hooks;

/**
 * Plain deployment config section type.
 */
export type StacktapeDeploymentConfigPlain = import('./plain').DeploymentConfig;

/**
 * Plain stack config section type.
 */
export type StacktapeStackConfigPlain = import('./plain').StackConfig;

/**
 * Plain cloudformation resources section type.
 */
export type StacktapeCloudformationResourcesPlain = import('./plain').StacktapeConfig['cloudformationResources'];

/**
 * Plain stack outputs type (stackConfig.outputs).
 */
export type StacktapeOutputsPlain = import('./plain').StackConfig['outputs'];

/**
 * Plain variables section type.
 */
export type StacktapeVariablesPlain = import('./plain').StacktapeConfig['variables'];

/**
 * Plain provider config section type.
 */
export type StacktapeProviderConfigPlain = import('./plain').StacktapeConfig['providerConfig'];

/**
 * Plain budget control section type.
 */
export type StacktapeBudgetControlPlain = import('./plain').BudgetControl;

/**
 * Plain directives section type.
 */
export type StacktapeDirectivesPlain = import('./plain').StacktapeConfig['directives'];

/**
 * Function type for plain config (legacy getConfig pattern).
 * Returns plain objects (YAML-equivalent), no class instances.
 */
export type GetConfigFunction = (params: GetConfigParams) => import('./plain').StacktapeConfig;
`;
}

/**
 * Generates augmented section types for stacktape (index) export
 */
function generateAugmentedSectionTypes(resourceClassNames: string[]): string {
  // Use import('./types') syntax for classes to ensure they're properly resolved
  const classTypeRefs = resourceClassNames.map((name) => `import('./types').${name}`).join(' | ');

  return `
// ==========================================
// AUGMENTED SECTION TYPES (for defineConfig pattern)
// ==========================================

/**
 * Resources section type (accepts class instances).
 * Use this with defineConfig for enhanced type-safe configs.
 */
export type StacktapeResources = { [resourceName: string]: ${classTypeRefs} | import('./plain').StacktapeResourceDefinition };

/**
 * Scripts section type (accepts class instances).
 * Use this with defineConfig for enhanced type-safe configs.
 */
export type StacktapeScripts = { [scriptName: string]: import('./types').LocalScript | import('./types').BastionScript | import('./types').LocalScriptWithBastionTunneling | import('./plain').LocalScript | import('./plain').BastionScript | import('./plain').LocalScriptWithBastionTunneling };

/**
 * Hooks section type.
 */
export type StacktapeHooks = import('./plain').Hooks;

/**
 * Deployment config section type.
 */
export type StacktapeDeploymentConfig = import('./plain').DeploymentConfig;

/**
 * Stack config section type.
 */
export type StacktapeStackConfig = import('./plain').StackConfig;

/**
 * Cloudformation resources section type.
 */
export type StacktapeCloudformationResources = { [resourceName: string]: StacktapeCloudformationResource };

/**
 * Single cloudformation resource type.
 */
export type StacktapeCloudformationResource = import('./cloudformation').CloudFormationResource;

/**
 * Stack outputs type (stackConfig.outputs).
 */
export type StacktapeOutputs = import('./plain').StackConfig['outputs'];

/**
 * Variables section type.
 */
export type StacktapeVariables = import('./plain').StacktapeConfig['variables'];

/**
 * Provider config section type.
 */
export type StacktapeProviderConfig = import('./plain').StacktapeConfig['providerConfig'];

/**
 * Budget control section type.
 */
export type StacktapeBudgetControl = import('./plain').BudgetControl;

/**
 * Directives section type.
 */
export type StacktapeDirectives = import('./plain').StacktapeConfig['directives'];
`;
}

export async function generateTypeDeclarations(): Promise<void> {
  logInfo('Generating TypeScript declarations for config...');

  // Load runtime metadata
  const CHILD_RESOURCES: ChildResourcesMap = require(PATHS.childResources).CHILD_RESOURCES;
  const REFERENCEABLE_PARAMS: ReferenceableParamsMap = require(PATHS.resourceMetadata).REFERENCEABLE_PARAMS;

  // Initialize JSON schema generator (needed for SDK types)
  logInfo('Initializing JSON schema generator...');
  const jsonSchemaGenerator = await getJsonSchemaGenerator();

  // Generate CloudFormation-related types
  logInfo('Extracting Properties interfaces from CloudFormation files...');
  const { content: propertiesInterfaces, generatedTypes: cfGeneratedTypes } =
    generatePropertiesInterfaces(CHILD_RESOURCES);
  const overridesTypes = generateOverrideTypes(CHILD_RESOURCES);
  const transformsTypes = generateTransformsTypes(CHILD_RESOURCES);
  const cloudFormationResourceType = generateCloudFormationResourceType(cfGeneratedTypes);

  // Compile source files
  logInfo('Compiling TypeScript source files...');
  const declarations = compileDeclarations();

  // Extract and process declarations
  const configDts = cleanDeclarations(declarations.get('config') || '');
  const configCleaned = removeDuplicateDeclarations(configDts);

  // Essential declarations are defined inline to avoid duplication issues from compiled TS
  const essentialDeclarations = generateEssentialDeclarations();

  // Generate custom declarations
  logInfo('Generating resource and type property declarations...');
  const augmentedPropsTypes = generateAugmentedPropsTypes();
  const stacktapeConfigType = generateStacktapeConfigType();
  const resourceClassDeclarations = generateResourceClassDeclarations(REFERENCEABLE_PARAMS);
  const typePropertiesClassDeclarations = generateTypePropertiesClassDeclarations();

  // Generate imports
  const plainPropsImports = generatePlainPropsImports();
  const resourcesWithAugmented = getResourcesWithAugmentedProps();
  const propsWithAugmentation = [
    ...resourcesWithAugmented.map((r) => r.propsType),
    'LocalScriptProps',
    'BastionScriptProps',
    'LocalScriptWithBastionTunnelingProps'
  ];
  const rawTypePropertiesImports = getTypePropertiesImports(propsWithAugmentation);
  // Filter out types that have aliases or placeholders (will be generated as type aliases instead)
  const typePropertiesImports = rawTypePropertiesImports.filter(
    (t) =>
      !(t in PROPS_TYPE_ALIASES) && !(t in PROPS_TYPE_PROPERTIES_ALIASES) && !MISSING_TYPES_PLACEHOLDERS.includes(t)
  );

  // Generate Sdk* type imports for augmented props (import from ./plain with Sdk prefix)
  const sdkTypeImports = propsWithAugmentation.map((prop) => `${prop} as Sdk${prop}`).join(',\n  ');

  // Get CloudFormation types used in overrides/transforms (from ./cloudformation)
  const cfTypesUsedInOverrides = new Set<string>();
  for (const match of overridesTypes.matchAll(/Partial<(Aws[A-Za-z0-9]+)>/g)) {
    cfTypesUsedInOverrides.add(match[1]);
  }
  for (const match of transformsTypes.matchAll(/Partial<(Aws[A-Za-z0-9]+)>/g)) {
    cfTypesUsedInOverrides.add(match[1]);
  }
  const cfTypeImports = [...cfTypesUsedInOverrides].sort().join(',\n  ');

  // Get all class names for re-export
  const resourceClassNames = RESOURCES_CONVERTIBLE_TO_CLASSES.map((r) => r.className) as string[];
  const typePropertiesClassNames = MISC_TYPES_CONVERTIBLE_TO_CLASSES.map((t) => t.className) as string[];
  const utilityClassNames = ['Alarm'];
  const allClassNames = [...resourceClassNames, ...typePropertiesClassNames, ...utilityClassNames];

  // Generate plain.d.ts - plain types
  const plainDts = await generatePlainTypes(jsonSchemaGenerator);

  // Generate cloudformation.d.ts - CloudFormation resource types (separate file due to size)
  const cloudformationDts = `/* eslint-disable */
// Generated file - Do not edit manually
// CloudFormation resource types
// Import: import type { CloudFormationResource } from 'stacktape/cloudformation'

// ==========================================
// CLOUDFORMATION PROPERTIES INTERFACES
// ==========================================

${propertiesInterfaces}

// ==========================================
// CLOUDFORMATION RESOURCE TYPE
// ==========================================

${cloudFormationResourceType}
`;

  // Generate types.d.ts - plain section types + GetConfigFunction
  const typesDts = `/* eslint-disable */
// Generated file - Do not edit manually
// Types export for 'stacktape/types'
// For plain configs using getConfig pattern

// ==========================================
// CLOUDFORMATION TYPE IMPORTS (for overrides/transforms)
// ==========================================

import type {
  ${cfTypeImports}
} from './cloudformation';

// ==========================================
// SDK TYPE IMPORTS (for augmented props base types)
// ==========================================

import type {
  ${sdkTypeImports}
} from './plain';

// ==========================================
// PLAIN TYPE RE-EXPORTS
// ==========================================

export type {
  ${plainPropsImports},
  ${typePropertiesImports.join(',\n  ')},
  AlarmUserIntegration,
  StpIamRoleStatement
} from './plain';

// ==========================================
// PROPS TYPE ALIASES
// These map expected *Props type names to actual generated types
// ==========================================

${generatePropsTypeAliases()}

// ==========================================
// ADDITIONAL TYPE DEFINITIONS
// ==========================================

/**
 * CLI arguments passed to the getConfig function.
 * Contains any additional arguments passed via --arg flag.
 */
export type StacktapeArgs = Record<string, string | number | boolean>;

// ==========================================
// CONFIG TYPES
// ==========================================

${configCleaned}

// ==========================================
// BASE CLASSES AND UTILITIES
// ==========================================
${essentialDeclarations}

// ==========================================
// AUGMENTED PROPS TYPES
// ==========================================

${augmentedPropsTypes}

// ==========================================
// CLOUDFORMATION OVERRIDES
// ==========================================

${overridesTypes}

// ==========================================
// CLOUDFORMATION TRANSFORMS
// ==========================================

${transformsTypes}

// ==========================================
// RESOURCE CLASS DECLARATIONS
// ==========================================

${resourceClassDeclarations}

// ==========================================
// TYPE PROPERTIES CLASS DECLARATIONS
// ==========================================

${typePropertiesClassDeclarations}

// ==========================================
// STACKTAPE CONFIG TYPE
// ==========================================

${stacktapeConfigType}

// ==========================================
// ADDITIONAL SDK TYPE RE-EXPORTS
// ==========================================

${cleanDeclarations(declarations.get('global-aws-services') || '')}

${cleanDeclarations(declarations.get('resource-metadata') || '')}

${generatePlainSectionTypes()}
`;

  // Generate index.d.ts - classes, defineConfig, directives, augmented section types
  const indexDts = `/* eslint-disable */
// Generated file - Do not edit manually
// Main export for 'stacktape' - classes, directives, defineConfig, augmented section types
// For plain types (getConfig pattern), use: import type { X } from 'stacktape/types'

// Re-export classes and defineConfig from types
export {
  defineConfig,
  ${allClassNames.join(',\n  ')}
} from './types';

// Re-export GetConfigParams for convenience
export type { GetConfigParams, StacktapeConfig } from './types';

// ==========================================
// DIRECTIVES
// ==========================================

${cleanDeclarations(declarations.get('directives') || '')}

// ==========================================
// AWS SERVICE CONSTANTS
// ==========================================

export declare const AWS_SES: "aws:ses";

${generateAugmentedSectionTypes(resourceClassNames)}
`;

  // Write all output files
  await Promise.all([
    outputFile(PATHS.distPlainDts, plainDts, { encoding: 'utf8' }),
    outputFile(PATHS.distCloudformationDts, cloudformationDts, { encoding: 'utf8' }),
    outputFile(PATHS.distTypesDts, typesDts, { encoding: 'utf8' }),
    outputFile(PATHS.distDts, indexDts, { encoding: 'utf8' })
  ]);

  // Format all files (run twice for prettier bug)
  await Promise.all([
    prettifyFile({ filePath: PATHS.distPlainDts }),
    prettifyFile({ filePath: PATHS.distCloudformationDts }),
    prettifyFile({ filePath: PATHS.distTypesDts }),
    prettifyFile({ filePath: PATHS.distDts })
  ]);
  await Promise.all([
    prettifyFile({ filePath: PATHS.distPlainDts }),
    prettifyFile({ filePath: PATHS.distCloudformationDts }),
    prettifyFile({ filePath: PATHS.distTypesDts }),
    prettifyFile({ filePath: PATHS.distDts })
  ]);

  logSuccess(
    `TypeScript declarations generated to:\n  - ${PATHS.distDts}\n  - ${PATHS.distTypesDts}\n  - ${PATHS.distPlainDts}\n  - ${PATHS.distCloudformationDts}`
  );
}

export async function buildNpmMainExport(): Promise<void> {
  await Promise.all([compileTsConfigHelpersSource(), generateTypeDeclarations()]);
  logSuccess('NPM main export build completed successfully');
}

// Run if executed directly
const isMain = process.argv[1]?.includes('build-npm-main-export');
if (isMain) {
  buildNpmMainExport();
}
