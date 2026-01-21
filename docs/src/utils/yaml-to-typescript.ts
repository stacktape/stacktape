import yaml from 'yaml';

/**
 * Browser-compatible YAML to TypeScript converter for docs.
 * This is a simplified version that handles common cases.
 */

/** Resource type -> class name mapping */
const RESOURCE_TYPE_TO_CLASS: Record<string, string> = {
  'relational-database': 'RelationalDatabase',
  'web-service': 'WebService',
  'private-service': 'PrivateService',
  'worker-service': 'WorkerService',
  'multi-container-workload': 'MultiContainerWorkload',
  function: 'LambdaFunction',
  'batch-job': 'BatchJob',
  bucket: 'Bucket',
  'hosting-bucket': 'HostingBucket',
  'dynamo-db-table': 'DynamoDbTable',
  'event-bus': 'EventBus',
  'http-api-gateway': 'HttpApiGateway',
  'application-load-balancer': 'ApplicationLoadBalancer',
  'network-load-balancer': 'NetworkLoadBalancer',
  'redis-cluster': 'RedisCluster',
  'mongo-db-atlas-cluster': 'MongoDbAtlasCluster',
  'state-machine': 'StateMachine',
  'user-auth-pool': 'UserAuthPool',
  'upstash-redis': 'UpstashRedis',
  'sqs-queue': 'SqsQueue',
  'sns-topic': 'SnsTopic',
  'web-app-firewall': 'WebAppFirewall',
  'open-search-domain': 'OpenSearchDomain',
  'efs-filesystem': 'EfsFilesystem',
  'nextjs-web': 'NextjsWeb',
  bastion: 'Bastion'
};

/** Script type -> class name mapping */
const SCRIPT_TYPE_TO_CLASS: Record<string, string> = {
  'local-script': 'LocalScript',
  'local-script-with-bastion-tunneling': 'LocalScriptWithBastionTunneling'
};

/** Packaging type -> class name mapping */
const PACKAGING_TYPE_TO_CLASS: Record<string, string> = {
  'stacktape-lambda-buildpack': 'StacktapeLambdaBuildpackPackaging',
  'stacktape-image-buildpack': 'StacktapeImageBuildpackPackaging',
  'external-buildpack': 'ExternalBuildpackPackaging',
  'custom-dockerfile': 'CustomDockerfilePackaging',
  'prebuilt-image': 'PrebuiltImagePackaging',
  'custom-artifact': 'CustomArtifactPackaging'
};

/** Engine type -> class name mapping */
const ENGINE_TYPE_TO_CLASS: Record<string, string> = {
  postgres: 'RdsEnginePostgres',
  mysql: 'RdsEngineMysql',
  mariadb: 'RdsEngineMariadb',
  'oracle-ee': 'RdsEngineOracleEE',
  'oracle-se2': 'RdsEngineOracleSE2',
  'sqlserver-ee': 'RdsEngineSqlServerEE',
  'sqlserver-ex': 'RdsEngineSqlServerEX',
  'sqlserver-se': 'RdsEngineSqlServerSE',
  'sqlserver-web': 'RdsEngineSqlServerWeb',
  'aurora-postgresql': 'AuroraEnginePostgresql',
  'aurora-mysql': 'AuroraEngineMysql',
  'aurora-postgresql-serverless': 'AuroraServerlessEnginePostgresql',
  'aurora-mysql-serverless': 'AuroraServerlessEngineMysql'
};

/** Lambda event type -> class name mapping */
const LAMBDA_EVENT_TYPE_TO_CLASS: Record<string, string> = {
  'http-api-integration': 'HttpApiIntegration',
  'rest-api-integration': 'RestApiIntegration',
  'load-balancer-integration': 'LoadBalancerIntegration',
  'sqs-integration': 'SqsIntegration',
  'sns-integration': 'SnsIntegration',
  'kinesis-integration': 'KinesisIntegration',
  's3-integration': 'S3Integration',
  'dynamo-db-integration': 'DynamoDbIntegration',
  'event-bridge-integration': 'EventBridgeIntegration',
  'cloudwatch-logs-integration': 'CloudwatchLogsIntegration',
  'schedule-integration': 'ScheduleIntegration'
};

/** Container event type -> class name mapping */
const CONTAINER_EVENT_TYPE_TO_CLASS: Record<string, string> = {
  'http-api-integration': 'ContainerHttpApiIntegration',
  'load-balancer-integration': 'ContainerLoadBalancerIntegration',
  'network-load-balancer-integration': 'ContainerNetworkLoadBalancerIntegration'
};

/** Resource types that use container-style events */
const CONTAINER_RESOURCE_TYPES = new Set([
  'web-service',
  'private-service',
  'worker-service',
  'multi-container-workload',
  'batch-job'
]);

/** Regex to match directive strings like $Secret('value') */
const DIRECTIVE_REGEX = /^\$([A-Za-z]+)\(.*\)$/;

const isDirective = (value: unknown): value is string => {
  return typeof value === 'string' && DIRECTIVE_REGEX.test(value);
};

const getDirectiveName = (directive: string): string => {
  const match = directive.match(DIRECTIVE_REGEX);
  return match ? `$${match[1]}` : '';
};

const generateDirectiveCode = (directive: string, imports: Set<string>): string => {
  const name = getDirectiveName(directive);
  if (name) imports.add(name);
  return directive;
};

const generateValueCode = (value: unknown, imports: Set<string>): string => {
  if (isDirective(value)) {
    return generateDirectiveCode(value, imports);
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => generateValueCode(v, imports));
    return `[${items.join(', ')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => `${JSON.stringify(k)}: ${generateValueCode(v, imports)}`
    );
    return `{ ${entries.join(', ')} }`;
  }
  return JSON.stringify(value);
};

const isTypedProperty = (value: unknown): boolean => {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
};

const getEventTypeMapping = (resourceType?: string): Record<string, string> => {
  if (resourceType && CONTAINER_RESOURCE_TYPES.has(resourceType)) {
    return CONTAINER_EVENT_TYPE_TO_CLASS;
  }
  return LAMBDA_EVENT_TYPE_TO_CLASS;
};

const generateTypedPropertyCode = (
  value: Record<string, unknown>,
  typeMap: Record<string, string>,
  imports: Set<string>,
  indent: number,
  resourceType?: string
): string => {
  const type = value.type as string;
  const className = typeMap[type];

  if (!className) {
    return JSON.stringify(value, null, 2);
  }

  imports.add(className);
  const propsCode = generatePropsCode(value.properties as Record<string, unknown>, imports, indent, resourceType);
  return `new ${className}(${propsCode})`;
};

const generateArrayCode = (arr: unknown[], imports: Set<string>, indent: number, resourceType?: string): string => {
  const indentStr = '  '.repeat(indent);
  const items: string[] = [];
  const eventTypeMap = getEventTypeMapping(resourceType);

  for (const item of arr) {
    if (isDirective(item)) {
      items.push(generateDirectiveCode(item, imports));
    } else if (isTypedProperty(item)) {
      const typed = item as Record<string, unknown>;
      const type = typed.type as string;
      const className = eventTypeMap[type] || PACKAGING_TYPE_TO_CLASS[type] || ENGINE_TYPE_TO_CLASS[type];
      if (className) {
        items.push(generateTypedPropertyCode(typed, { [type]: className }, imports, indent, resourceType));
      } else {
        items.push(JSON.stringify(item, null, 2).split('\n').join(`\n${indentStr}`));
      }
    } else if (item && typeof item === 'object' && !Array.isArray(item)) {
      const objCode = generatePropsCode(item as Record<string, unknown>, imports, indent, resourceType);
      items.push(objCode);
    } else {
      items.push(generateValueCode(item, imports));
    }
  }

  if (items.length === 0) return '[]';
  if (items.length === 1 && !items[0].includes('\n')) return `[${items[0]}]`;

  return `[\n${indentStr}  ${items.join(`,\n${indentStr}  `)}\n${indentStr}]`;
};

const generatePropsCode = (
  props: Record<string, unknown> | undefined,
  imports: Set<string>,
  indent: number,
  resourceType?: string
): string => {
  if (!props) return '{}';

  const indentStr = '  '.repeat(indent);
  const entries: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    // Handle packaging
    if (key === 'packaging' && isTypedProperty(value)) {
      const code = generateTypedPropertyCode(
        value as Record<string, unknown>,
        PACKAGING_TYPE_TO_CLASS,
        imports,
        indent,
        resourceType
      );
      entries.push(`${key}: ${code}`);
      continue;
    }

    // Handle engine
    if (key === 'engine' && isTypedProperty(value)) {
      const code = generateTypedPropertyCode(
        value as Record<string, unknown>,
        ENGINE_TYPE_TO_CLASS,
        imports,
        indent,
        resourceType
      );
      entries.push(`${key}: ${code}`);
      continue;
    }

    // Handle environment array -> object
    if (key === 'environment' && Array.isArray(value)) {
      const envEntries: string[] = [];
      for (const item of value as Array<{ name: string; value: string }>) {
        if (item.name && item.value !== undefined) {
          const val = item.value;
          if (isDirective(val)) {
            envEntries.push(`${JSON.stringify(item.name)}: ${generateDirectiveCode(val, imports)}`);
          } else {
            envEntries.push(`${JSON.stringify(item.name)}: ${JSON.stringify(String(val))}`);
          }
        }
      }
      entries.push(`${key}: { ${envEntries.join(', ')} }`);
      continue;
    }

    // Handle connectTo - variable references
    if (key === 'connectTo' && Array.isArray(value)) {
      const refs = (value as (string | unknown)[]).map((ref) => (typeof ref === 'string' ? ref : JSON.stringify(ref)));
      entries.push(`${key}: [${refs.join(', ')}]`);
      continue;
    }

    // Handle events array
    if (key === 'events' && Array.isArray(value)) {
      const arrayCode = generateArrayCode(value, imports, indent + 1, resourceType);
      entries.push(`${key}: ${arrayCode}`);
      continue;
    }

    // Handle nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = generatePropsCode(value as Record<string, unknown>, imports, indent + 1, resourceType);
      entries.push(`${key}: ${nested}`);
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      const arrayCode = generateArrayCode(value, imports, indent + 1, resourceType);
      entries.push(`${key}: ${arrayCode}`);
      continue;
    }

    // Handle directives
    if (isDirective(value)) {
      entries.push(`${key}: ${generateDirectiveCode(value, imports)}`);
      continue;
    }

    // Default
    entries.push(`${key}: ${generateValueCode(value, imports)}`);
  }

  if (entries.length === 0) return '{}';

  return `{\n${indentStr}  ${entries.join(`,\n${indentStr}  `)}\n${indentStr}}`;
};

/**
 * Converts parsed YAML config to TypeScript code.
 */
const configObjectToTypescript = (config: Record<string, unknown>): string => {
  const imports = new Set<string>();
  const resourceDeclarations: string[] = [];
  const scriptDeclarations: string[] = [];
  const resourceNames: string[] = [];
  const scriptNames: string[] = [];

  imports.add('defineConfig');

  // Process resources
  if (config.resources && typeof config.resources === 'object') {
    const resources = config.resources as Record<string, Record<string, unknown>>;
    for (const [name, resource] of Object.entries(resources)) {
      const resourceType = resource.type as string;
      const className = RESOURCE_TYPE_TO_CLASS[resourceType];
      if (!className) {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }

      imports.add(className);
      const propsCode = generatePropsCode(resource.properties as Record<string, unknown>, imports, 2, resourceType);
      resourceDeclarations.push(`  const ${name} = new ${className}(${propsCode});`);
      resourceNames.push(name);
    }
  }

  // Process scripts
  if (config.scripts && typeof config.scripts === 'object') {
    const scripts = config.scripts as Record<string, Record<string, unknown>>;
    for (const [name, script] of Object.entries(scripts)) {
      const className = SCRIPT_TYPE_TO_CLASS[script.type as string];
      if (!className) {
        throw new Error(`Unknown script type: ${script.type}`);
      }

      imports.add(className);
      const propsCode = generatePropsCode(script.properties as Record<string, unknown>, imports, 2);
      scriptDeclarations.push(`  const ${name} = new ${className}(${propsCode});`);
      scriptNames.push(name);
    }
  }

  // Build TypeScript
  const lines: string[] = [];

  // Import
  const sortedImports = Array.from(imports).sort();
  lines.push(`import { ${sortedImports.join(', ')} } from 'stacktape';`);
  lines.push('');
  lines.push('export default defineConfig(() => {');

  // Resources
  if (resourceDeclarations.length) {
    lines.push(...resourceDeclarations);
    lines.push('');
  }

  // Scripts
  if (scriptDeclarations.length) {
    lines.push(...scriptDeclarations);
    lines.push('');
  }

  // Return
  lines.push('  return {');
  if (resourceNames.length) {
    lines.push(`    resources: { ${resourceNames.join(', ')} },`);
  }
  if (scriptNames.length) {
    lines.push(`    scripts: { ${scriptNames.join(', ')} },`);
  }

  // Other top-level keys
  const otherKeys = Object.keys(config).filter((k) => k !== 'resources' && k !== 'scripts');
  for (const key of otherKeys) {
    const value = config[key];
    const jsonStr = JSON.stringify(value, null, 2).split('\n').join('\n    ');
    lines.push(`    ${key}: ${jsonStr},`);
  }

  // Remove trailing comma
  if (lines[lines.length - 1].endsWith(',')) {
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
  }

  lines.push('  };');
  lines.push('});');

  return lines.join('\n');
};

/**
 * Converts YAML string to TypeScript code.
 * Returns null if conversion fails.
 */
export const convertYamlToTypescript = (yamlContent: string): string | null => {
  try {
    const config = yaml.parse(yamlContent);

    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return null;
    }

    // Check if it has resources or scripts (valid stacktape config)
    if (!config.resources && !config.scripts) {
      return null;
    }

    return configObjectToTypescript(config as Record<string, unknown>);
  } catch {
    return null;
  }
};
