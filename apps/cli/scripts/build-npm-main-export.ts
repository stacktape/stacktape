import type { JsonSchemaGenerator } from 'typescript-json-schema';
import type { ChildResourcesMap, ReferenceableParamsMap } from './code-generation/types';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONFIG_AUTHORING_PACKAGE_SRC_PATH,
  NPM_RELEASE_FOLDER_PATH,
  SOURCE_MAP_INSTALL_DIST_PATH
} from 'src/config/project-paths';
import { buildEsCode } from '@stacktape/packaging/bundlers/es';
import { logInfo, logSuccess } from '@scripts/support/logging';
import { createCliPackagingError } from '@domain-services/packaging-manager/errors';
import { localBuildTsConfigPath } from '@utils/misc';
import { prettifyFile } from '@scripts/support/prettier';
import { outputFile } from 'fs-extra';
import * as ts from 'typescript';
import {
  getResourcesWithAugmentedProps,
  MISC_TYPES_CONVERTIBLE_TO_CLASSES,
  RESOURCES_CONVERTIBLE_TO_CLASSES,
  type ResourceDefinition
} from '@stacktape/config-authoring/resource-metadata';
import {
  generateAugmentedPropsTypes,
  generatePlainPropsImports,
  generateStacktapeConfigType
} from './code-generation/generate-augmented-props';
import { generatePropertiesInterfaces } from './code-generation/generate-cloudformation-properties';
import { generateCloudFormationResourceMap } from './code-generation/generate-cloudformation-resource-map';
import { generateOverrideTypes, generateTransformsTypes } from './code-generation/generate-overrides';
import { generateResourceClassDeclarations } from './code-generation/generate-resource-classes';
import {
  generateTypePropertiesClassDeclarations,
  getTypePropertiesImports,
  TYPE_PROPERTY_PROPS_TO_PLAIN_PROPERTIES
} from './code-generation/generate-type-properties';
import { getJsonSchemaGenerator, getTsTypeDef } from './code-generation/utils';
import { verifyNpmDeclarations } from './verify-npm-declarations';

const PATHS = {
  source: join(CONFIG_AUTHORING_PACKAGE_SRC_PATH, 'index.ts'),
  distJs: join(NPM_RELEASE_FOLDER_PATH, 'index.js'),
  childResources: join(CONFIG_AUTHORING_PACKAGE_SRC_PATH, 'child-resources.ts'),
  resourceMetadata: join(CONFIG_AUTHORING_PACKAGE_SRC_PATH, 'resource-metadata.ts')
} as const;

export const NPM_DECLARATION_FILE_NAMES = ['index.d.ts', 'types.d.ts', 'plain.d.ts', 'cloudformation.d.ts'] as const;

const declarationOutputPaths = (outputDirectory: string) => ({
  index: join(outputDirectory, 'index.d.ts'),
  types: join(outputDirectory, 'types.d.ts'),
  plain: join(outputDirectory, 'plain.d.ts'),
  cloudformation: join(outputDirectory, 'cloudformation.d.ts')
});

export const NPM_SOURCE_FILES = [
  'config.ts',
  'resources.ts',
  'type-properties.ts',
  'directives.ts',
  'resource-metadata.ts'
].map((file) => join(CONFIG_AUTHORING_PACKAGE_SRC_PATH, file));

/**
 * Types that don't exist at all and need placeholder definitions
 * These are typically types that aren't referenced from StacktapeConfig root
 */
// Types with no declaration at all. `IotIntegrationProps` used to be here; it is generated from its own
// symbol now, so the published alias carries the authored shape instead of a placeholder.
const MISSING_TYPES_PLACEHOLDERS: string[] = [];

/**
 * Generates type aliases for Props types that don't exist in plain.d.ts
 * Also generates placeholder types for types that don't exist at all
 */
function generatePropsTypeAliases(): string {
  // Aliases that extract 'properties' from discriminated unions
  const propertiesAliases = Object.entries(TYPE_PROPERTY_PROPS_TO_PLAIN_PROPERTIES)
    .map(([aliasName, path]) => `export type ${aliasName} = import('./plain').${path};`)
    .join('\n');

  const placeholders = MISSING_TYPES_PLACEHOLDERS.map(
    (typeName) => `export type ${typeName} = Record<string, unknown>;`
  ).join('\n');

  return `// Props type aliases extracting 'properties' from discriminated unions\n${propertiesAliases}\n\n// Placeholder types for missing types\n${placeholders}`;
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
  'WebSocketApiGateway',
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
  'WebSocketApiGatewayProps',
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
  // Volume mount types
  'ContainerEfsMountProps',
  'LambdaEfsMountProps',
  'LambdaS3FilesMountProps',
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
 * Parameters passed to the defineConfig function.
 */
export type GetConfigParams = {
  /** Project name selected before config evaluation; absent when the config itself declares it. */
  projectName?: string;
  /** Stage ("environment") used for this operation */
  stage: string;
  /** AWS region used for this operation */
  region: string;
  /** List of arguments passed to the operation */
  cliArgs: StacktapeArgs;
  /** Stacktape command used to perform this operation */
  command: string;
  /** Locally-configured AWS profile used to execute the operation */
  awsProfile: string;
  /** Authenticated Stacktape user, absent for local commands that do not use the control plane */
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

type StacktapeResourceType = import('./plain').StacktapeResourceDefinition['type'];

declare const getParamReferenceSymbol: unique symbol;
declare const getTypeSymbol: unique symbol;
declare const getPropertiesSymbol: unique symbol;
declare const getReferencedResourceSymbol: unique symbol;
declare const getReferencedParamSymbol: unique symbol;
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
  [getReferencedResourceSymbol](): BaseResource;
  [getReferencedParamSymbol](): string;
  toString(): never;
  toJSON(): never;
  valueOf(): never;
}

/**
 * Base class for type/properties structures (engines, packaging, events, etc.)
 */
export declare class BaseTypeProperties<Type extends string = string, Properties = unknown> {
  readonly type: Type;
  readonly properties: Properties;
  readonly [baseTypePropertiesSymbol]: true;
  constructor(type: Type, properties: Properties);
}

/**
 * Base class for type-only structures (no properties field, just type discriminator)
 */
export declare class BaseTypeOnly<Type extends string = string> {
  readonly type: Type;
  readonly [baseTypePropertiesSymbol]: true;
  constructor(type: Type);
}

/**
 * Defines a CloudWatch alarm that monitors a metric and triggers notifications when thresholds are breached.
 */
type AuthoringAlarmTrigger =
  | import('./plain').ApplicationLoadBalancerAlarmTrigger
  | import('./plain').HttpApiGatewayAlarmTrigger
  | import('./plain').LambdaAlarmTrigger
  | import('./plain').RelationalDatabaseAlarmTrigger
  | import('./plain').SqsQueueAlarmTrigger;
type PublishedAlarmProps<Trigger extends AuthoringAlarmTrigger> = {
  trigger: WithAuthoringNamedResourceReferences<Trigger>;
  evaluation?: import('./plain').AlarmEvaluation;
  notificationTargets?: import('./plain').AlarmUserIntegration[];
  includeInHistory?: boolean;
  description?: string;
};
export declare class Alarm<Trigger extends AuthoringAlarmTrigger = AuthoringAlarmTrigger> {
  readonly trigger: PublishedAlarmProps<Trigger>['trigger'];
  readonly evaluation?: NonNullable<PublishedAlarmProps<Trigger>['evaluation']>;
  readonly notificationTargets?: NonNullable<PublishedAlarmProps<Trigger>['notificationTargets']>;
  readonly includeInHistory?: NonNullable<PublishedAlarmProps<Trigger>['includeInHistory']>;
  readonly description?: string;
  readonly [alarmSymbol]: true;
  constructor(props: PublishedAlarmProps<Trigger>);
}

/**
 * Base resource class that provides common functionality
 */
export declare class BaseResource<
  Type extends StacktapeResourceType = StacktapeResourceType,
  Properties = unknown
> {
  private readonly _type: Type;
  private readonly _properties: Properties;
  constructor(type: Type, properties: Properties);
  [getParamReferenceSymbol](paramName: string): ResourceParamReference;
  [getTypeSymbol](): Type;
  [getPropertiesSymbol](): Properties;
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
    distPath: PATHS.distJs,
    createPackagingError: createCliPackagingError,
    sourceMapInstallPath: SOURCE_MAP_INSTALL_DIST_PATH
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

/**
 * `resource-metadata.ts` also exports the class metadata used by Stacktape's generators. That data is an internal
 * build-time API; historically, only `REFERENCEABLE_PARAMS` was copied into the published `stacktape/types`
 * declaration. Select that declaration explicitly so a change in how the source module re-exports its internal
 * metadata cannot leak dangling symbols into the assembled npm declarations.
 */
export function extractReferenceableParamsDeclaration(content: string): string {
  const sourceFile = ts.createSourceFile(
    'resource-metadata.d.ts',
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const matches = sourceFile.statements.filter(
    (statement): statement is ts.VariableStatement =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'REFERENCEABLE_PARAMS'
      )
  );

  if (matches.length !== 1) {
    throw new Error(`Expected one REFERENCEABLE_PARAMS declaration, got ${matches.length}.`);
  }

  return matches[0].getText(sourceFile);
}

function removeDuplicateDeclarations(content: string): string {
  const duplicatePatterns = [
    'declare const getParamReferenceSymbol:',
    'declare const getTypeSymbol:',
    'declare const getPropertiesSymbol:',
    'declare const getReferencedResourceSymbol:',
    'declare const getReferencedParamSymbol:',
    'declare const resourceParamRefSymbol:',
    'declare const baseTypePropertiesSymbol:',
    'declare const alarmSymbol:',
    'export declare class BaseResource',
    'export declare class ResourceParamReference',
    'export declare class BaseTypeProperties',
    'export declare class BaseTypeOnly',
    'export declare class Alarm',
    'export type AuthoringAlarmProps',
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

/**
 * The source authoring types derive `connectTo` object compatibility from the runtime resource catalog. The npm
 * declaration bundle is flattened into one file and deliberately strips imports, so retain only the small,
 * declaration-only projection needed by those types instead of publishing the full build-time catalog.
 */
function generateResourceConnectionMetadataDeclaration(): string {
  const entries = RESOURCES_CONVERTIBLE_TO_CLASSES.map((resource) => {
    const definition: ResourceDefinition = resource;
    const properties = [
      `readonly className: ${JSON.stringify(resource.className)};`,
      `readonly resourceType: ${JSON.stringify(resource.resourceType)};`
    ];
    if (definition.canConnectTo) {
      properties.push(
        `readonly canConnectTo: readonly [${definition.canConnectTo.map((className) => JSON.stringify(className)).join(', ')}];`
      );
    }
    if (definition.hasAugmentedProps) {
      properties.push('readonly hasAugmentedProps: true;');
    }
    return `{ ${properties.join(' ')} }`;
  });

  return `declare const RESOURCES_CONVERTIBLE_TO_CLASSES: readonly [\n  ${entries.join(',\n  ')}\n];`;
}

/**
 * The npm entry sources compiled with the CLI project's real compiler options.
 *
 * The npm sources are ordinary CLI files: they use `String.replaceAll`, which needs the CLI's `ES2023` lib, and
 * their dependencies are ordinary explicit imports. This reuses the parsed `tsconfig.json` so its target, library,
 * module resolution and path mappings cannot drift from the application build.
 *
 * Only `declaration`/`emit` are overridden; nothing else is second-guessed, so this cannot drift from the
 * project the same files are type-checked under.
 */
export function createDeclarationProgram(): { program: ts.Program; sourceFiles: ts.SourceFile[] } {
  const configPath = join(process.cwd(), 'tsconfig.json');
  const cliConfig = ts.readConfigFile(configPath, ts.sys.readFile);
  if (cliConfig.error) {
    throw new Error(`Cannot read ${configPath}: ${ts.flattenDiagnosticMessageText(cliConfig.error.messageText, ' ')}`);
  }
  const parsed = ts.parseJsonConfigFileContent(cliConfig.config, ts.sys, process.cwd());
  if (parsed.errors.length > 0) {
    throw new Error(
      `Cannot parse ${configPath}: ${parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('; ')}`
    );
  }

  const program = ts.createProgram(NPM_SOURCE_FILES, {
    ...parsed.options,
    declaration: true,
    emitDeclarationOnly: true,
    noEmit: false
  });

  const sourceFiles = NPM_SOURCE_FILES.map((fileName) => {
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) {
      throw new Error(`${fileName} is not part of the declaration program.`);
    }
    return sourceFile;
  });

  return { program, sourceFiles };
}

/**
 * Compiles the npm entry sources to declarations.
 *
 * The emit is inspected: a declaration build that reported errors or skipped emit used to be indistinguishable
 * from a good one, which is how invalid published declarations reached the packed artifact. Emit is requested
 * per npm source file so the output stays scoped to the published entry points rather than to everything the
 * program had to load to type-check them.
 */
export function compileDeclarations(): Map<string, string> {
  const { program, sourceFiles } = createDeclarationProgram();
  const declarations = new Map<string, string>();
  const emitDiagnostics: ts.Diagnostic[] = [];
  let emitSkipped = false;

  for (const sourceFile of sourceFiles) {
    const emitResult = program.emit(
      sourceFile,
      (fileName, data) => {
        if (fileName.endsWith('.d.ts')) {
          const baseName = fileName.split(/[/\\]/).pop()!.replace('.d.ts', '');
          declarations.set(baseName, data);
        }
      },
      undefined,
      true
    );
    emitDiagnostics.push(...emitResult.diagnostics);
    emitSkipped ||= emitResult.emitSkipped;
  }

  // Every repository-owned `.ts` diagnostic fails this build; third-party files are excluded by path.
  //
  // Third-party declaration files are skipped because the CLI project uses `skipLibCheck`; repository-owned source
  // types are ordinary `.ts` modules and are checked here. The published artifact is covered independently — the
  // consumer check in `verifyNpmDeclarations` compiles the emitted declarations with `skipLibCheck` off.
  const diagnostics = [...ts.getPreEmitDiagnostics(program), ...emitDiagnostics].filter(
    (diagnostic) => !diagnostic.file || !diagnostic.file.fileName.includes('node_modules')
  );
  if (diagnostics.length > 0) {
    const rendered = diagnostics
      .slice(0, 20)
      .map(
        (d) => `${d.file?.fileName ?? '<program>'}: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`
      )
      .join('\n');
    throw new Error(`The published declarations do not compile:\n${rendered}`);
  }
  if (emitSkipped) {
    throw new Error('Declaration emit was skipped; the published declarations would be stale or missing.');
  }
  if (declarations.size !== NPM_SOURCE_FILES.length) {
    throw new Error(
      `Expected a declaration for each of the ${NPM_SOURCE_FILES.length} npm sources, got ${declarations.size}.`
    );
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
  return (
    content
      .replace(/\?:\s*\{\s*\[k:\s*string\]:\s*any;?\s*\}/g, '?: any')
      .replace(/:\s*\{\s*\[k:\s*string\]:\s*any;?\s*\}/g, ': any')
      // json-schema-to-typescript occasionally emits an impossible `boolean & string` (≡ never) for
      // boolean properties carrying an `@default` tag, when compiling the full StacktapeConfig schema
      // (a structural-dedup quirk in the library — the schema node itself is a clean `boolean`).
      // The intersection is always a bug; collapse it back to `boolean` so e.g. `new Bucket({ enableEventBusNotifications: true })` typechecks.
      .replace(/\b(?:boolean & string|string & boolean)\b/g, 'boolean')
      // Same json-schema-to-typescript quirk produces an impossible `{ ... } & string` (≡ never) for
      // object types whose sole property is a string-literal union (e.g. PrivateServiceLoadBalancing's
      // `{ type: "application-load-balancer" | "service-connect" }`). The trailing `& string` is always a
      // bug; drop it so `loadBalancing: { type: 'application-load-balancer' }` typechecks.
      .replace(/(\}\s*)& string\b/g, '$1')
  );
}

/**
 * Strips authoring-only focus markers (# stp-focus / // stp-focus, standalone or trailing) from the
 * JSDoc of the shipped .d.ts so editor (tsserver) hovers don't show marker noise. The `*\/` escaping of
 * glob examples is LEFT INTACT — it must stay for the .d.ts to remain valid TypeScript.
 */
function stripFocusMarkersFromDts(content: string): string {
  return content
    .replace(/^[ \t]*\*[ \t]*(?:#|\/\/)[ \t]*stp-(?:end-)?focus[ \t]*\r?\n/gm, '')
    .replace(/[ \t]*(?:#|\/\/)[ \t]*stp-(?:end-)?focus[ \t]*$/gm, '');
}

/**
 * Generates plain.d.ts - plain types (YAML-equivalent) without class augmentation
 * Uses StacktapeConfig as the root type to generate all types once without duplication
 */
/**
 * Authored types the package publishes that are not reachable from `StacktapeConfig`.
 *
 * `plain.d.ts` is generated from the configuration root, so an unreferenced type never appears in it, and the
 * `stacktape/types` aliases that point at it (`StacktapeBudgetControl`, `IotIntegrationProps`) resolve to
 * nothing. They are generated from their own symbol instead of being declared as placeholders, so the published
 * names keep their real authored shape and documentation.
 */
const UNREACHABLE_PUBLISHED_TYPES = ['BudgetControl', 'IotIntegrationProps'];

async function generatePlainTypes(jsonSchemaGenerator: JsonSchemaGenerator): Promise<string> {
  logInfo('Generating plain types...');

  // Generate all types from StacktapeConfig root - this includes all nested types without duplication
  const typeDef = await getTsTypeDef({
    typeName: 'StacktapeConfig',
    newTypeName: 'StacktapeConfig',
    jsonSchemaGenerator
  });

  const auxiliaryTypeDefs = await Promise.all(
    UNREACHABLE_PUBLISHED_TYPES.map(async (typeName) => {
      const definition = await getTsTypeDef({ typeName, newTypeName: typeName, jsonSchemaGenerator });
      if (!definition.includes(typeName)) {
        throw new Error(`Published type ${typeName} generated no declaration; stacktape/types would export nothing.`);
      }
      return definition;
    })
  );

  logSuccess('Plain types generated successfully');

  const rawContent = `/* eslint-disable */
// Generated file - Do not edit manually
// Plain types (YAML-equivalent) - no class augmentation
// For class-based types, use: import { X } from 'stacktape'

${typeDef}

${auxiliaryTypeDefs.join('\n\n')}
`;

  return postProcessPlainTypes(rawContent);
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
export type StacktapeCloudformationResource = import('./cloudformation').AnyCloudFormationResource;

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

/** Convenient aliases for consumers that need one plain YAML-equivalent configuration section. */
function generatePlainSectionTypes(): string {
  return `
export type StacktapeResourcesPlain = import('./plain').StacktapeConfig['resources'];
export type StacktapeScriptsPlain = import('./plain').StacktapeConfig['scripts'];
export type StacktapeHooksPlain = import('./plain').Hooks;
export type StacktapeDeploymentConfigPlain = import('./plain').DeploymentConfig;
export type StacktapeStackConfigPlain = import('./plain').StackConfig;
export type StacktapeCloudformationResourcesPlain = import('./plain').StacktapeConfig['cloudformationResources'];
export type StacktapeOutputsPlain = import('./plain').StackConfig['outputs'];
export type StacktapeVariablesPlain = import('./plain').StacktapeConfig['variables'];
export type StacktapeProviderConfigPlain = import('./plain').StacktapeConfig['providerConfig'];
export type StacktapeBudgetControlPlain = import('./plain').BudgetControl;
export type StacktapeDirectivesPlain = import('./plain').StacktapeConfig['directives'];
`;
}

function declarationFromSource(filePath: string, { inlineDependencies = false } = {}): string {
  const result = ts.transpileDeclaration(readFileSync(filePath, 'utf8'), {
    fileName: filePath,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022
    },
    reportDiagnostics: true
  });
  if (result.diagnostics?.length) {
    throw new Error(
      ts.formatDiagnostics(result.diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => '\n'
      })
    );
  }
  if (!inlineDependencies) {
    return result.outputText;
  }

  const declarationFile = ts.createSourceFile(`${filePath}.d.ts`, result.outputText, ts.ScriptTarget.Latest, true);
  return declarationFile.statements
    .filter((statement) => !ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement))
    .map((statement) => statement.getFullText(declarationFile))
    .join('')
    .trim();
}

export function generateCloudFormationCoreDeclarations(): string {
  const packageSourcePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'packages',
    'cloudformation',
    'src'
  );
  const intrinsics = declarationFromSource(join(packageSourcePath, 'intrinsics.ts'));
  const resource = declarationFromSource(join(packageSourcePath, 'resource.ts'), { inlineDependencies: true });

  return `${intrinsics}\n${resource}`;
}

export const removeCloudFormationTemplateReexports = (declarations: string): string =>
  declarations.replace(
    /^export type \{ CloudFormationTemplate \}(?: from '@stacktape\/cloudformation\/resource')?;\r?\n/gm,
    ''
  );

export async function generateTypeDeclarations({
  outputDirectory = NPM_RELEASE_FOLDER_PATH
}: {
  outputDirectory?: string;
} = {}): Promise<void> {
  const outputPaths = declarationOutputPaths(outputDirectory);
  logInfo('Generating TypeScript declarations for config...');

  // Load runtime metadata
  const CHILD_RESOURCES: ChildResourcesMap = require(PATHS.childResources).CHILD_RESOURCES;
  const REFERENCEABLE_PARAMS: ReferenceableParamsMap = require(PATHS.resourceMetadata).REFERENCEABLE_PARAMS;

  // Initialize JSON schema generator (needed for SDK types)
  logInfo('Initializing JSON schema generator...');
  const jsonSchemaGenerator = await getJsonSchemaGenerator();

  // Generate CloudFormation-related types
  logInfo('Extracting Properties interfaces from CloudFormation files...');
  const { content: propertiesInterfaces, generatedTypes: cfGeneratedTypes } = generatePropertiesInterfaces();
  const overridesTypes = generateOverrideTypes(CHILD_RESOURCES);
  const transformsTypes = generateTransformsTypes(CHILD_RESOURCES);
  const cloudFormationResourceMap = generateCloudFormationResourceMap(cfGeneratedTypes);
  const cloudFormationCoreDeclarations = generateCloudFormationCoreDeclarations();

  // Compile source files
  logInfo('Compiling TypeScript source files...');
  const declarations = compileDeclarations();

  // Extract and process declarations
  const configDts = cleanDeclarations(declarations.get('config') || '');
  const configCleaned = removeCloudFormationTemplateReexports(removeDuplicateDeclarations(configDts));

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
    (typeName) =>
      !(typeName in TYPE_PROPERTY_PROPS_TO_PLAIN_PROPERTIES) && !MISSING_TYPES_PLACEHOLDERS.includes(typeName)
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
// STRUCTURAL INTRINSICS AND RESOURCE ENVELOPE
// ==========================================

${cloudFormationCoreDeclarations}

// ==========================================
// CLOUDFORMATION PROPERTIES INTERFACES
// ==========================================

${propertiesInterfaces}

// ==========================================
// CLOUDFORMATION RESOURCE TYPE
// ==========================================

${cloudFormationResourceMap}
`;

  // Generate types.d.ts - authoring types and class declarations
  const typesDts = `/* eslint-disable */
// Generated file - Do not edit manually
// Types export for 'stacktape/types'
// Plain YAML-equivalent types remain available from './plain'.

// ==========================================
// CLOUDFORMATION TYPE IMPORTS (for overrides/transforms)
// ==========================================

import type {
  CloudFormationTemplate,
  ${cfTypeImports}
} from './cloudformation';

export type { CloudFormationTemplate } from './cloudformation';

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
 * CLI arguments passed to the defineConfig function.
 * Contains any additional arguments passed via --arg flag.
 */
export type StacktapeArgs = Record<string, string | number | boolean>;

// ==========================================
// CONFIG TYPES
// ==========================================

${generateResourceConnectionMetadataDeclaration()}

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

${extractReferenceableParamsDeclaration(declarations.get('resource-metadata') || '')}

${generatePlainSectionTypes()}
`;

  // Generate index.d.ts - classes, defineConfig, directives, augmented section types
  const indexDts = `/* eslint-disable */
// Generated file - Do not edit manually
// Main export for 'stacktape' - classes, directives, defineConfig, augmented section types
// Plain YAML-equivalent types are available from 'stacktape/plain'.

// Re-export classes and defineConfig from types
export {
  defineConfig,
  ${allClassNames.join(',\n  ')}
} from './types';

// Re-export authoring types for convenience
export type {
  CompiledStacktapeConfig,
  DefinedStacktapeConfig,
  FinalTransform,
  GetConfigParams,
  ResourceTransform,
  StacktapeConfig
} from './types';

export {
  and,
  base64,
  cfnResource,
  cfnResourceUnchecked,
  condition,
  equals,
  findInMap,
  getAtt,
  getAzs,
  ifCondition,
  importValue,
  isIntrinsic,
  join,
  not,
  or,
  ref,
  select,
  split,
  sub
} from './cloudformation';

export type {
  AnyCloudFormationResource,
  CloudFormationJson,
  CloudFormationList,
  CloudFormationResource,
  CloudFormationResourceAttributes,
  CloudFormationTag,
  CloudFormationTemplate,
  CloudFormationValue,
  ConditionExpression,
  Intrinsic,
  KnownCloudFormationResource,
  KnownCloudFormationResourceType,
  PropertylessCloudFormationResource,
  StructuralIntrinsic
} from './cloudformation';

// ==========================================
// DIRECTIVES
// ==========================================

${cleanDeclarations(declarations.get('directives') || '')}

${generateAugmentedSectionTypes(resourceClassNames)}
`;

  // Write all output files
  await Promise.all([
    outputFile(outputPaths.plain, stripFocusMarkersFromDts(plainDts), { encoding: 'utf8' }),
    outputFile(outputPaths.cloudformation, cloudformationDts, { encoding: 'utf8' }),
    outputFile(outputPaths.types, stripFocusMarkersFromDts(typesDts), { encoding: 'utf8' }),
    outputFile(outputPaths.index, stripFocusMarkersFromDts(indexDts), { encoding: 'utf8' })
  ]);

  // Format all files (run twice for prettier bug)
  await Promise.all([
    prettifyFile({ filePath: outputPaths.plain }),
    prettifyFile({ filePath: outputPaths.cloudformation }),
    prettifyFile({ filePath: outputPaths.types }),
    prettifyFile({ filePath: outputPaths.index })
  ]);
  await Promise.all([
    prettifyFile({ filePath: outputPaths.plain }),
    prettifyFile({ filePath: outputPaths.cloudformation }),
    prettifyFile({ filePath: outputPaths.types }),
    prettifyFile({ filePath: outputPaths.index })
  ]);

  logSuccess(
    `TypeScript declarations generated to:\n  - ${outputPaths.index}\n  - ${outputPaths.types}\n  - ${outputPaths.plain}\n  - ${outputPaths.cloudformation}`
  );
}

export async function buildNpmMainExport(): Promise<void> {
  await Promise.all([compileTsConfigHelpersSource(), generateTypeDeclarations()]);
  // The declarations that were just assembled have to compile for a consumer before this reports success.
  // Source-level checks cannot see the assembled `types.d.ts`, which is where dangling published aliases live.
  verifyNpmDeclarations({ packageDir: NPM_RELEASE_FOLDER_PATH });
  logSuccess('NPM main export build completed successfully');
}

// Run if executed directly
const isMain = process.argv[1]?.includes('build-npm-main-export');
if (isMain) {
  buildNpmMainExport();
}
