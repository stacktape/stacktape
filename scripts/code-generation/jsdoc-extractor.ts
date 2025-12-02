import type { JSDocComment, PropertyInfo } from './types';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';

function extractJSDocFromNode(node: ts.Node): JSDocComment | undefined {
  const jsDocTags = ts.getJSDocTags(node);
  const jsDocComments = ts.getJSDocCommentsAndTags(node);

  if (jsDocComments.length === 0) {
    return undefined;
  }

  const firstComment = jsDocComments[0];
  if (!ts.isJSDoc(firstComment)) {
    return undefined;
  }

  const description = firstComment.comment
    ? typeof firstComment.comment === 'string'
      ? firstComment.comment
      : firstComment.comment.map((part) => part.text).join('')
    : '';

  const tags = jsDocTags.map((tag) => ({
    tag: tag.tagName.text,
    value: tag.comment ? (typeof tag.comment === 'string' ? tag.comment : tag.comment.map((p) => p.text).join('')) : ''
  }));

  return {
    description: description.trim(),
    tags
  };
}

function findPropertyInInterface(
  interfaceName: string,
  propertyName: string,
  sourceFile: ts.SourceFile
): PropertyInfo | undefined {
  let result: PropertyInfo | undefined;

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
          if (member.name.text === propertyName) {
            const type = member.type ? member.type.getText(sourceFile) : 'any';
            const optional = member.questionToken !== undefined;
            const jsdoc = extractJSDocFromNode(member);

            result = {
              name: propertyName,
              type,
              optional,
              jsdoc
            };
            return;
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

/**
 * Cache for parsed source files to avoid re-parsing
 */
const sourceFileCache = new Map<string, ts.SourceFile>();

/**
 * Gets a TypeScript source file, using cache if available
 */
function getSourceFile(filePath: string): ts.SourceFile | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }

  if (sourceFileCache.has(filePath)) {
    return sourceFileCache.get(filePath);
  }

  const content = readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  sourceFileCache.set(filePath, sourceFile);

  return sourceFile;
}

/**
 * Extracts property information (including JSDoc) from a type definition
 * @param typeName - The name of the type/interface (e.g., 'LambdaFunctionProps')
 * @param propertyName - The name of the property (e.g., 'connectTo')
 * @param searchPaths - Paths to search for the type definition
 */
export function extractPropertyInfo(
  typeName: string,
  propertyName: string,
  searchPaths: string[]
): PropertyInfo | undefined {
  for (const searchPath of searchPaths) {
    const sourceFile = getSourceFile(searchPath);
    if (!sourceFile) {
      continue;
    }

    const propertyInfo = findPropertyInInterface(typeName, propertyName, sourceFile);
    if (propertyInfo) {
      return propertyInfo;
    }
  }

  return undefined;
}

/**
 * Formats a JSDoc comment for code generation
 */
export function formatJSDoc(jsdoc: JSDocComment, indent: string = '  '): string {
  const lines: string[] = [];

  lines.push(`${indent}/**`);

  if (jsdoc.description) {
    // Split description into lines and add proper indentation
    const descriptionLines = jsdoc.description.split('\n');
    for (const line of descriptionLines) {
      lines.push(`${indent} * ${line}`);
    }
  }

  // Add tags if any
  for (const tag of jsdoc.tags) {
    if (tag.value) {
      lines.push(`${indent} * @${tag.tag} ${tag.value}`);
    } else {
      lines.push(`${indent} * @${tag.tag}`);
    }
  }

  lines.push(`${indent} */`);

  return lines.join('\n');
}

/**
 * Gets property info with JSDoc from SDK types
 * Searches common locations for SDK type definitions
 */
export function getSDKPropertyInfo(typeName: string, propertyName: string): PropertyInfo | undefined {
  const basePath = join(process.cwd(), 'types', 'stacktape-config');

  // Map type names to their likely file locations
  const typeFileMap: Record<string, string> = {
    LambdaFunctionProps: 'functions.d.ts',
    WebServiceProps: 'web-services.d.ts',
    PrivateServiceProps: 'private-services.d.ts',
    WorkerServiceProps: 'worker-services.d.ts',
    ContainerWorkloadProps: 'multi-container-workloads.d.ts',
    BatchJobProps: 'batch-jobs.d.ts',
    StateMachineProps: 'state-machines.d.ts',
    LocalScriptProps: 'scripts.d.ts',
    BastionScriptProps: 'scripts.d.ts',
    LocalScriptWithBastionTunnelingProps: 'scripts.d.ts'
  };

  const searchPaths: string[] = [];

  // Add specific file if we know it
  const specificFile = typeFileMap[typeName];
  if (specificFile) {
    searchPaths.push(join(basePath, specificFile));
  }

  // Also search common files
  searchPaths.push(join(basePath, '__helpers.d.ts'), join(basePath, 'services.d.ts'), join(basePath, 'packaging.d.ts'));

  return extractPropertyInfo(typeName, propertyName, searchPaths);
}

/**
 * Finds an interface declaration and extracts its JSDoc
 */
function findInterfaceJSDoc(interfaceName: string, sourceFile: ts.SourceFile): JSDocComment | undefined {
  let result: JSDocComment | undefined;

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      result = extractJSDocFromNode(node);
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

/**
 * Mapping of resource class names to their interface names and source files
 */
const RESOURCE_INTERFACE_MAP: Record<string, { interfaceName: string; file: string }> = {
  // Compute resources
  LambdaFunction: { interfaceName: 'LambdaFunction', file: 'functions.d.ts' },
  WebService: { interfaceName: 'WebService', file: 'web-services.d.ts' },
  PrivateService: { interfaceName: 'PrivateService', file: 'private-services.d.ts' },
  WorkerService: { interfaceName: 'WorkerService', file: 'worker-services.d.ts' },
  MultiContainerWorkload: { interfaceName: 'MultiContainerWorkload', file: 'multi-container-workloads.d.ts' },
  BatchJob: { interfaceName: 'BatchJob', file: 'batch-jobs.d.ts' },

  // Storage
  Bucket: { interfaceName: 'Bucket', file: 'buckets.d.ts' },
  HostingBucket: { interfaceName: 'HostingBucket', file: 'hosting-buckets.d.ts' },
  DynamoDbTable: { interfaceName: 'DynamoDbTable', file: 'dynamo-db-tables.d.ts' },
  EfsFilesystem: { interfaceName: 'EfsFilesystem', file: 'efs-filesystem.d.ts' },

  // Databases
  RelationalDatabase: { interfaceName: 'RelationalDatabase', file: 'relational-databases.d.ts' },
  RedisCluster: { interfaceName: 'RedisCluster', file: 'redis-cluster.d.ts' },
  MongoDbAtlasCluster: { interfaceName: 'MongoDbAtlasCluster', file: 'mongo-db-atlas-clusters.d.ts' },
  UpstashRedis: { interfaceName: 'UpstashRedis', file: 'upstash-redis.d.ts' },
  OpenSearchDomain: { interfaceName: 'OpenSearchDomain', file: 'open-search.d.ts' },

  // Networking
  HttpApiGateway: { interfaceName: 'HttpApiGateway', file: 'http-api-gateways.d.ts' },
  ApplicationLoadBalancer: { interfaceName: 'ApplicationLoadBalancer', file: 'application-load-balancers.d.ts' },
  NetworkLoadBalancer: { interfaceName: 'NetworkLoadBalancer', file: 'network-load-balancer.d.ts' },

  // Events & Messaging
  EventBus: { interfaceName: 'EventBus', file: 'event-buses.d.ts' },
  SqsQueue: { interfaceName: 'SqsQueue', file: 'sqs-queues.d.ts' },
  SnsTopic: { interfaceName: 'SnsTopic', file: 'sns-topic.d.ts' },

  // Other
  StateMachine: { interfaceName: 'StateMachine', file: 'state-machines.d.ts' },
  UserAuthPool: { interfaceName: 'UserAuthPool', file: 'user-pools.d.ts' },
  WebAppFirewall: { interfaceName: 'WebAppFirewall', file: 'web-app-firewall.d.ts' },
  NextjsWeb: { interfaceName: 'NextjsWeb', file: 'nextjs-web.d.ts' },
  Bastion: { interfaceName: 'Bastion', file: 'bastion.d.ts' }
};

/**
 * Extracts the JSDoc description for a resource class from its interface definition
 * @param className - The resource class name (e.g., 'LambdaFunction')
 * @returns The JSDoc comment or undefined if not found
 */
export function getResourceClassDescription(className: string): JSDocComment | undefined {
  const mapping = RESOURCE_INTERFACE_MAP[className];
  if (!mapping) {
    return undefined;
  }

  const filePath = join(process.cwd(), 'types', 'stacktape-config', mapping.file);
  const sourceFile = getSourceFile(filePath);

  if (!sourceFile) {
    return undefined;
  }

  return findInterfaceJSDoc(mapping.interfaceName, sourceFile);
}

/**
 * Mapping of type-properties class names to their interface names and source files
 */
const TYPE_PROPERTIES_INTERFACE_MAP: Record<string, { interfaceName: string; file: string }> = {
  // Database Engines
  RdsEnginePostgres: { interfaceName: 'RdsEngine', file: 'relational-databases.d.ts' },
  RdsEngineMariadb: { interfaceName: 'RdsEngine', file: 'relational-databases.d.ts' },
  RdsEngineMysql: { interfaceName: 'RdsEngine', file: 'relational-databases.d.ts' },
  RdsEngineOracleEE: { interfaceName: 'RdsEngine', file: 'relational-databases.d.ts' },
  RdsEngineOracleSE2: { interfaceName: 'RdsEngine', file: 'relational-databases.d.ts' },
  RdsEngineSqlServerEE: { interfaceName: 'RdsEngine', file: 'relational-databases.d.ts' },
  RdsEngineSqlServerEX: { interfaceName: 'RdsEngine', file: 'relational-databases.d.ts' },
  RdsEngineSqlServerSE: { interfaceName: 'RdsEngine', file: 'relational-databases.d.ts' },
  RdsEngineSqlServerWeb: { interfaceName: 'RdsEngine', file: 'relational-databases.d.ts' },
  AuroraEnginePostgresql: { interfaceName: 'AuroraEngine', file: 'relational-databases.d.ts' },
  AuroraEngineMysql: { interfaceName: 'AuroraEngine', file: 'relational-databases.d.ts' },
  AuroraServerlessEnginePostgresql: { interfaceName: 'AuroraServerlessEngine', file: 'relational-databases.d.ts' },
  AuroraServerlessEngineMysql: { interfaceName: 'AuroraServerlessEngine', file: 'relational-databases.d.ts' },
  AuroraServerlessV2EnginePostgresql: { interfaceName: 'AuroraServerlessV2Engine', file: 'relational-databases.d.ts' },
  AuroraServerlessV2EngineMysql: { interfaceName: 'AuroraServerlessV2Engine', file: 'relational-databases.d.ts' },

  // Lambda Packaging
  StacktapeLambdaBuildpackPackaging: {
    interfaceName: 'StpBuildpackLambdaPackaging',
    file: 'deployment-artifacts.d.ts'
  },
  CustomArtifactLambdaPackaging: { interfaceName: 'CustomArtifactLambdaPackaging', file: 'deployment-artifacts.d.ts' },

  // Container Packaging
  PrebuiltImagePackaging: { interfaceName: 'PrebuiltCwImagePackaging', file: 'deployment-artifacts.d.ts' },
  CustomDockerfilePackaging: { interfaceName: 'CustomDockerfileCwImagePackaging', file: 'deployment-artifacts.d.ts' },
  ExternalBuildpackPackaging: { interfaceName: 'ExternalBuildpackCwImagePackaging', file: 'deployment-artifacts.d.ts' },
  NixpacksPackaging: { interfaceName: 'NixpacksCwImagePackaging', file: 'deployment-artifacts.d.ts' },
  StacktapeImageBuildpackPackaging: {
    interfaceName: 'StpBuildpackCwImagePackaging',
    file: 'deployment-artifacts.d.ts'
  },

  // Scripts
  LocalScriptWithCommand: { interfaceName: 'LocalScript', file: '__helpers.d.ts' },
  LocalScriptWithCommands: { interfaceName: 'LocalScript', file: '__helpers.d.ts' },
  LocalScriptWithFileScript: { interfaceName: 'LocalScript', file: '__helpers.d.ts' },
  LocalScriptWithFileScripts: { interfaceName: 'LocalScript', file: '__helpers.d.ts' },
  BastionScriptWithCommand: { interfaceName: 'BastionScript', file: '__helpers.d.ts' },
  BastionScriptWithCommands: { interfaceName: 'BastionScript', file: '__helpers.d.ts' },
  LocalScriptWithBastionTunnelingCommand: { interfaceName: 'LocalScriptWithBastionTunneling', file: '__helpers.d.ts' },
  LocalScriptWithBastionTunnelingCommands: { interfaceName: 'LocalScriptWithBastionTunneling', file: '__helpers.d.ts' },
  LocalScriptWithBastionTunnelingFileScript: {
    interfaceName: 'LocalScriptWithBastionTunneling',
    file: '__helpers.d.ts'
  },
  LocalScriptWithBastionTunnelingFileScripts: {
    interfaceName: 'LocalScriptWithBastionTunneling',
    file: '__helpers.d.ts'
  },

  // Lambda Events/Integrations
  HttpApiIntegration: { interfaceName: 'HttpApiIntegration', file: 'events.d.ts' },
  S3Integration: { interfaceName: 'S3Integration', file: 'events.d.ts' },
  ScheduleIntegration: { interfaceName: 'ScheduleIntegration', file: 'events.d.ts' },
  SnsIntegration: { interfaceName: 'SnsIntegration', file: 'events.d.ts' },
  SqsIntegration: { interfaceName: 'SqsIntegration', file: 'events.d.ts' },
  KinesisIntegration: { interfaceName: 'KinesisIntegration', file: 'events.d.ts' },
  DynamoDbIntegration: { interfaceName: 'DynamoDbIntegration', file: 'events.d.ts' },
  CloudwatchLogIntegration: { interfaceName: 'CloudwatchLogIntegration', file: 'events.d.ts' },
  ApplicationLoadBalancerIntegration: { interfaceName: 'ApplicationLoadBalancerIntegration', file: 'events.d.ts' },
  EventBusIntegration: { interfaceName: 'EventBusIntegration', file: 'events.d.ts' },
  KafkaTopicIntegration: { interfaceName: 'KafkaTopicIntegration', file: 'events.d.ts' },
  AlarmIntegration: { interfaceName: 'AlarmIntegration', file: 'events.d.ts' }
};

/**
 * Extracts the JSDoc description for a type-properties class from its interface definition
 * @param className - The type-properties class name (e.g., 'StacktapeLambdaBuildpackPackaging')
 * @returns The JSDoc comment or undefined if not found
 */
export function getTypePropertiesDescription(className: string): JSDocComment | undefined {
  const mapping = TYPE_PROPERTIES_INTERFACE_MAP[className];
  if (!mapping) {
    return undefined;
  }

  const filePath = join(process.cwd(), 'types', 'stacktape-config', mapping.file);
  const sourceFile = getSourceFile(filePath);

  if (!sourceFile) {
    return undefined;
  }

  return findInterfaceJSDoc(mapping.interfaceName, sourceFile);
}
