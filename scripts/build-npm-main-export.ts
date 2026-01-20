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
  generateSdkPropsImports,
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
  distSdkDts: join(NPM_RELEASE_FOLDER_PATH, 'sdk.d.ts'),
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
 * Plain SDK types that need to be bundled into sdk.d.ts
 * These are the YAML-equivalent types without class augmentation
 */
const SDK_TYPES_TO_GENERATE = [
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
function extractEssentialDeclarations(configDts: string): string {
  const matches: string[] = [];

  const symbolPatterns = [
    'declare const getParamReferenceSymbol:',
    'declare const getTypeSymbol:',
    'declare const getPropertiesSymbol:',
    'declare const getOverridesSymbol:'
  ];

  for (const pattern of symbolPatterns) {
    const startIdx = configDts.indexOf(pattern);
    if (startIdx !== -1) {
      const endIdx = configDts.indexOf(';', startIdx);
      if (endIdx !== -1) {
        matches.push(configDts.substring(startIdx, endIdx + 1));
      }
    }
  }

  const classPatterns = [
    'export declare class ResourceParamReference',
    'export declare class BaseTypeProperties',
    'export declare class BaseTypeOnly',
    'export declare class Alarm',
    'export declare class BaseResource',
    'export type GetConfigParams'
  ];

  for (const pattern of classPatterns) {
    let startIdx = configDts.indexOf(pattern);
    if (startIdx !== -1) {
      const searchStart = Math.max(0, startIdx - 1000);
      const beforePattern = configDts.substring(searchStart, startIdx);
      const jsdocMatch = beforePattern.match(/\/\*\*[\s\S]*?\*\/\s*$/);
      if (jsdocMatch) {
        startIdx = searchStart + beforePattern.lastIndexOf(jsdocMatch[0]);
      }

      let braceCount = 0;
      let inBlock = false;
      let endIdx = startIdx;

      for (let i = configDts.indexOf(pattern); i < configDts.length; i++) {
        const char = configDts[i];

        if (char === '{') {
          inBlock = true;
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (inBlock && braceCount === 0) {
            endIdx = i;
            break;
          }
        } else if (char === ';' && !inBlock) {
          endIdx = i;
          break;
        }
      }

      matches.push(configDts.substring(startIdx, endIdx + 1));
    }
  }

  return matches.join('\n\n');
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
 * Generates sdk.d.ts - plain types (YAML-equivalent) without class augmentation
 */
async function generateSdkTypes(jsonSchemaGenerator: JsonSchemaGenerator): Promise<string> {
  logInfo('Generating SDK plain types...');

  const typeDefinitions: string[] = [];

  for (const typeName of SDK_TYPES_TO_GENERATE) {
    try {
      const typeDef = await getTsTypeDef({ typeName, newTypeName: typeName, jsonSchemaGenerator });
      if (typeDef && typeDef.trim()) {
        typeDefinitions.push(typeDef);
      }
    } catch {
      // Type might not exist, skip it
    }
  }

  logSuccess('SDK plain types generated successfully');

  return `/* eslint-disable */
// @ts-nocheck
// Generated file - Do not edit manually
// Plain SDK types (YAML-equivalent) - no class augmentation
// For class-based types, use: import { X } from 'stacktape'

${typeDefinitions.join('\n\n')}
`;
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
export type StacktapeResourcesPlain = import('./sdk').StacktapeConfig['resources'];

/**
 * Plain scripts section type (YAML-equivalent).
 * Use this with GetConfigFunction for legacy configs.
 */
export type StacktapeScriptsPlain = import('./sdk').StacktapeConfig['scripts'];

/**
 * Plain hooks section type.
 */
export type StacktapeHooksPlain = import('./sdk').Hooks;

/**
 * Plain deployment config section type.
 */
export type StacktapeDeploymentConfigPlain = import('./sdk').DeploymentConfig;

/**
 * Plain stack config section type.
 */
export type StacktapeStackConfigPlain = import('./sdk').StackConfig;

/**
 * Plain cloudformation resources section type.
 */
export type StacktapeCloudformationResourcesPlain = import('./sdk').StacktapeConfig['cloudformationResources'];

/**
 * Function type for plain config (legacy getConfig pattern).
 * Returns plain objects (YAML-equivalent), no class instances.
 */
export type GetConfigFunction = (params: GetConfigParams) => import('./sdk').StacktapeConfig;
`;
}

/**
 * Generates augmented section types for stacktape (index) export
 */
function generateAugmentedSectionTypes(resourceClassNames: string[]): string {
  return `
// ==========================================
// AUGMENTED SECTION TYPES (for defineConfig pattern)
// ==========================================

/**
 * Resources section type (accepts class instances).
 * Use this with defineConfig for enhanced type-safe configs.
 */
export type StacktapeResources = { [resourceName: string]: ${resourceClassNames.join(' | ')} | import('./sdk').StacktapeResourceDefinition };

/**
 * Scripts section type (accepts class instances).
 * Use this with defineConfig for enhanced type-safe configs.
 */
export type StacktapeScripts = { [scriptName: string]: LocalScript | BastionScript | LocalScriptWithBastionTunneling | import('./sdk').LocalScript | import('./sdk').BastionScript | import('./sdk').LocalScriptWithBastionTunneling };

/**
 * Hooks section type.
 */
export type StacktapeHooks = import('./sdk').Hooks;

/**
 * Deployment config section type.
 */
export type StacktapeDeploymentConfig = import('./sdk').DeploymentConfig;

/**
 * Stack config section type.
 */
export type StacktapeStackConfig = import('./sdk').StackConfig;

/**
 * Cloudformation resources section type.
 * Use import from 'stacktape/cloudformation' for CloudFormationResource type.
 */
export type StacktapeCloudformationResources = { [resourceName: string]: import('./cloudformation').CloudFormationResource };
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
  const propertiesInterfaces = generatePropertiesInterfaces(CHILD_RESOURCES);
  const overridesTypes = generateOverrideTypes(CHILD_RESOURCES);
  const transformsTypes = generateTransformsTypes(CHILD_RESOURCES);
  const cloudFormationResourceType = generateCloudFormationResourceType();

  // Compile source files
  logInfo('Compiling TypeScript source files...');
  const declarations = compileDeclarations();

  // Extract and process declarations
  const configDts = cleanDeclarations(declarations.get('config') || '');
  const essentialDeclarations = extractEssentialDeclarations(configDts);
  const configCleaned = removeDuplicateDeclarations(configDts);

  // Generate custom declarations
  logInfo('Generating resource and type property declarations...');
  const augmentedPropsTypes = generateAugmentedPropsTypes();
  const stacktapeConfigType = generateStacktapeConfigType();
  const resourceClassDeclarations = generateResourceClassDeclarations(REFERENCEABLE_PARAMS);
  const typePropertiesClassDeclarations = generateTypePropertiesClassDeclarations();

  // Generate imports
  const sdkPropsImports = generateSdkPropsImports();
  const resourcesWithAugmented = getResourcesWithAugmentedProps();
  const sdkPropsWithAugmentation = [
    ...resourcesWithAugmented.map((r) => r.propsType),
    'LocalScriptProps',
    'BastionScriptProps',
    'LocalScriptWithBastionTunnelingProps'
  ];
  const typePropertiesImports = getTypePropertiesImports(sdkPropsWithAugmentation);

  // Get all class names for re-export
  const resourceClassNames = RESOURCES_CONVERTIBLE_TO_CLASSES.map((r) => r.className) as string[];
  const typePropertiesClassNames = MISC_TYPES_CONVERTIBLE_TO_CLASSES.map((t) => t.className) as string[];
  const utilityClassNames = ['Alarm'];
  const allClassNames = [...resourceClassNames, ...typePropertiesClassNames, ...utilityClassNames];

  // Generate sdk.d.ts - plain types
  const sdkDts = await generateSdkTypes(jsonSchemaGenerator);

  // Generate cloudformation.d.ts - CloudFormation resource types (separate file due to size)
  const cloudformationDts = `/* eslint-disable */
// @ts-nocheck
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
// @ts-nocheck
// Generated file - Do not edit manually
// Types export for 'stacktape/types'
// For plain configs using getConfig pattern

// ==========================================
// SDK TYPE RE-EXPORTS
// ==========================================

export type {
  ${sdkPropsImports},
  ${typePropertiesImports.join(',\n  ')},
  AlarmUserIntegration,
  StpIamRoleStatement
} from './sdk';

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
// @ts-nocheck
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
    outputFile(PATHS.distSdkDts, sdkDts, { encoding: 'utf8' }),
    outputFile(PATHS.distCloudformationDts, cloudformationDts, { encoding: 'utf8' }),
    outputFile(PATHS.distTypesDts, typesDts, { encoding: 'utf8' }),
    outputFile(PATHS.distDts, indexDts, { encoding: 'utf8' })
  ]);

  // Format all files (run twice for prettier bug)
  await Promise.all([
    prettifyFile({ filePath: PATHS.distSdkDts }),
    prettifyFile({ filePath: PATHS.distCloudformationDts }),
    prettifyFile({ filePath: PATHS.distTypesDts }),
    prettifyFile({ filePath: PATHS.distDts })
  ]);
  await Promise.all([
    prettifyFile({ filePath: PATHS.distSdkDts }),
    prettifyFile({ filePath: PATHS.distCloudformationDts }),
    prettifyFile({ filePath: PATHS.distTypesDts }),
    prettifyFile({ filePath: PATHS.distDts })
  ]);

  logSuccess(
    `TypeScript declarations generated to:\n  - ${PATHS.distDts}\n  - ${PATHS.distTypesDts}\n  - ${PATHS.distSdkDts}\n  - ${PATHS.distCloudformationDts}`
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
