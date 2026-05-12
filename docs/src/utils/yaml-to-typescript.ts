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
  'custom-artifact': 'CustomArtifactLambdaPackaging'
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

const invertRecord = (record: Record<string, string>) =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [value, key])) as Record<string, string>;

const CLASS_TO_RESOURCE_TYPE = invertRecord(RESOURCE_TYPE_TO_CLASS);
const CLASS_TO_SCRIPT_TYPE = invertRecord(SCRIPT_TYPE_TO_CLASS);
const CLASS_TO_TYPED_PROPERTY_TYPE = {
  ...invertRecord(PACKAGING_TYPE_TO_CLASS),
  ...invertRecord(ENGINE_TYPE_TO_CLASS),
  ...invertRecord(LAMBDA_EVENT_TYPE_TO_CLASS),
  ...invertRecord(CONTAINER_EVENT_TYPE_TO_CLASS)
};

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

type TsParsedValue =
  | null
  | string
  | number
  | boolean
  | TsParsedValue[]
  | {
      [key: string]: TsParsedValue;
    };

type IdentifierValue = {
  __identifier: string;
};

const isIdentifierValue = (value: unknown): value is IdentifierValue =>
  Boolean(value && typeof value === 'object' && '__identifier' in value);

class TypescriptConfigExpressionParser {
  private cursor = 0;

  constructor(private readonly source: string) {}

  parse(): TsParsedValue | IdentifierValue {
    const value = this.parseValue();
    this.skipWhitespaceAndComments();
    return value;
  }

  private parseValue(): TsParsedValue | IdentifierValue {
    this.skipWhitespaceAndComments();
    if (this.source[this.cursor] === '{') return this.parseObject();
    if (this.source[this.cursor] === '[') return this.parseArray();
    if (this.source[this.cursor] === "'" || this.source[this.cursor] === '"' || this.source[this.cursor] === '`') {
      return this.parseString();
    }
    if (this.source.startsWith('new ', this.cursor)) return this.parseNewExpression();
    if (this.source[this.cursor] === '$') return this.parseDirectiveCall();
    if (this.source.startsWith('true', this.cursor)) {
      this.cursor += 4;
      return true;
    }
    if (this.source.startsWith('false', this.cursor)) {
      this.cursor += 5;
      return false;
    }
    if (this.source.startsWith('null', this.cursor)) {
      this.cursor += 4;
      return null;
    }
    if (this.source.startsWith('undefined', this.cursor)) {
      this.cursor += 'undefined'.length;
      return null;
    }
    if (/[+-]?\d/.test(this.source.slice(this.cursor, this.cursor + 2))) {
      return this.parseNumber();
    }
    return { __identifier: this.parseIdentifier() };
  }

  private parseObject(): Record<string, TsParsedValue | IdentifierValue> {
    const result: Record<string, TsParsedValue | IdentifierValue> = {};
    this.expect('{');
    while (this.cursor < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.source[this.cursor] === '}') {
        this.cursor += 1;
        break;
      }

      if (this.source.startsWith('...', this.cursor)) {
        throw new Error('Object spreads are not supported in generated YAML examples.');
      }

      const key = this.parseObjectKey();
      this.skipWhitespaceAndComments();
      if (this.source[this.cursor] === ':') {
        this.cursor += 1;
        result[key] = this.parseValue();
      } else {
        result[key] = { __identifier: key };
      }

      this.skipWhitespaceAndComments();
      if (this.source[this.cursor] === ',') {
        this.cursor += 1;
      }
    }
    return result;
  }

  private parseArray(): Array<TsParsedValue | IdentifierValue> {
    const result: Array<TsParsedValue | IdentifierValue> = [];
    this.expect('[');
    while (this.cursor < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.source[this.cursor] === ']') {
        this.cursor += 1;
        break;
      }
      result.push(this.parseValue());
      this.skipWhitespaceAndComments();
      if (this.source[this.cursor] === ',') {
        this.cursor += 1;
      }
    }
    return result;
  }

  private parseObjectKey(): string {
    this.skipWhitespaceAndComments();
    if (this.source[this.cursor] === "'" || this.source[this.cursor] === '"' || this.source[this.cursor] === '`') {
      return this.parseString();
    }
    return this.parseIdentifier();
  }

  private parseNewExpression(): TsParsedValue {
    this.cursor += 'new '.length;
    const className = this.parseIdentifier();
    this.skipWhitespaceAndComments();
    this.expect('(');
    const argsStart = this.cursor;
    const args = this.readBalanced('(', ')', argsStart);
    this.cursor = args.end + 1;

    const type = CLASS_TO_TYPED_PROPERTY_TYPE[className];
    if (!type) {
      throw new Error(`Unsupported class in generated YAML example: ${className}`);
    }

    return {
      type,
      properties: parseTypescriptExpression(args.content) as TsParsedValue
    };
  }

  private parseDirectiveCall(): string {
    const start = this.cursor;
    this.cursor += 1;
    this.parseIdentifier();
    this.skipWhitespaceAndComments();
    this.expect('(');
    const args = this.readBalanced('(', ')', this.cursor);
    this.cursor = args.end + 1;
    return this.source.slice(start, this.cursor);
  }

  private parseString(): string {
    const quote = this.source[this.cursor];
    this.cursor += 1;
    let result = '';
    while (this.cursor < this.source.length) {
      const ch = this.source[this.cursor];
      if (ch === '\\') {
        result += this.source[this.cursor + 1] ?? '';
        this.cursor += 2;
        continue;
      }
      if (ch === quote) {
        this.cursor += 1;
        return result;
      }
      if (quote === '`' && ch === '$' && this.source[this.cursor + 1] === '{') {
        throw new Error('Template interpolation is not supported in generated YAML examples.');
      }
      result += ch;
      this.cursor += 1;
    }
    throw new Error('Unterminated string in generated YAML example.');
  }

  private parseNumber(): number {
    const start = this.cursor;
    while (/[0-9.eE+-]/.test(this.source[this.cursor] ?? '')) {
      this.cursor += 1;
    }
    return Number(this.source.slice(start, this.cursor));
  }

  private parseIdentifier(): string {
    this.skipWhitespaceAndComments();
    const match = this.source.slice(this.cursor).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
    if (!match) {
      throw new Error(`Expected identifier near: ${this.source.slice(this.cursor, this.cursor + 30)}`);
    }
    this.cursor += match[0].length;
    return match[0];
  }

  private expect(char: string) {
    this.skipWhitespaceAndComments();
    if (this.source[this.cursor] !== char) {
      throw new Error(`Expected "${char}" near: ${this.source.slice(this.cursor, this.cursor + 30)}`);
    }
    this.cursor += 1;
  }

  private skipWhitespaceAndComments() {
    while (this.cursor < this.source.length) {
      if (/\s/.test(this.source[this.cursor])) {
        this.cursor += 1;
        continue;
      }
      if (this.source.startsWith('//', this.cursor)) {
        const newline = this.source.indexOf('\n', this.cursor + 2);
        this.cursor = newline === -1 ? this.source.length : newline + 1;
        continue;
      }
      if (this.source.startsWith('/*', this.cursor)) {
        const end = this.source.indexOf('*/', this.cursor + 2);
        this.cursor = end === -1 ? this.source.length : end + 2;
        continue;
      }
      break;
    }
  }

  private readBalanced(open: string, close: string, start: number): { content: string; end: number } {
    let depth = 1;
    let cursor = start;
    let quote: string | null = null;
    while (cursor < this.source.length) {
      const ch = this.source[cursor];
      if (quote) {
        if (ch === '\\') {
          cursor += 2;
          continue;
        }
        if (ch === quote) quote = null;
        cursor += 1;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch;
        cursor += 1;
        continue;
      }
      if (ch === open) depth += 1;
      if (ch === close) depth -= 1;
      if (depth === 0) {
        return { content: this.source.slice(start, cursor), end: cursor };
      }
      cursor += 1;
    }
    throw new Error(`Unbalanced "${open}${close}" in generated YAML example.`);
  }
}

const parseTypescriptExpression = (source: string) => new TypescriptConfigExpressionParser(source).parse();

const stripCodeMarkers = (source: string) =>
  source
    .replace(/^\s*\/\/\s*\[!code\s+(?:focus|highlight)(?:-(?:start|end))?(?::\d+)?\]\s*$/gm, '')
    .replace(/\/\/\s*\[!code\s+(?:focus|highlight)(?:-(?:start|end))?(?::\d+)?\]/g, '');

const readBalancedFrom = (source: string, openIndex: number, open: string, close: string) => {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === open) depth += 1;
    if (ch === close) depth -= 1;
    if (depth === 0) {
      return {
        content: source.slice(openIndex + 1, i),
        end: i
      };
    }
  }
  throw new Error(`Unbalanced "${open}${close}" in generated YAML example.`);
};

const extractResourceDeclarations = (source: string) => {
  const declarations = new Map<string, { kind: 'resource' | 'script'; type: string; properties: TsParsedValue }>();
  const declarationRegex = /\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*new\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  for (const match of source.matchAll(declarationRegex)) {
    const name = match[1];
    const className = match[2];
    const openIndex = (match.index ?? 0) + match[0].length - 1;
    const args = readBalancedFrom(source, openIndex, '(', ')');
    const resourceType = CLASS_TO_RESOURCE_TYPE[className];
    const scriptType = CLASS_TO_SCRIPT_TYPE[className];
    if (!resourceType && !scriptType) continue;
    declarations.set(name, {
      kind: resourceType ? 'resource' : 'script',
      type: resourceType || scriptType,
      properties: parseTypescriptExpression(args.content) as TsParsedValue
    });
  }
  return declarations;
};

const findReturnedConfigObject = (source: string) => {
  const returnIndex = source.indexOf('return');
  if (returnIndex === -1) return null;
  const openIndex = source.indexOf('{', returnIndex);
  if (openIndex === -1) return null;
  return readBalancedFrom(source, openIndex, '{', '}').content;
};

const replaceIdentifierValues = (
  value: TsParsedValue | IdentifierValue,
  declarations: Map<string, { kind: 'resource' | 'script'; type: string; properties: TsParsedValue }>
): TsParsedValue => {
  if (isIdentifierValue(value)) return value.__identifier;
  if (Array.isArray(value)) return value.map((item) => replaceIdentifierValues(item, declarations));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => [key, replaceIdentifierValues(childValue, declarations)])
    );
  }
  return value;
};

const buildSectionFromReturnMap = (
  sectionValue: TsParsedValue | IdentifierValue | undefined,
  declarations: Map<string, { kind: 'resource' | 'script'; type: string; properties: TsParsedValue }>,
  kind: 'resource' | 'script'
) => {
  if (
    !sectionValue ||
    typeof sectionValue !== 'object' ||
    Array.isArray(sectionValue) ||
    isIdentifierValue(sectionValue)
  ) {
    return undefined;
  }

  const section: Record<string, { type: string; properties: TsParsedValue }> = {};
  for (const [outputName, declaredValue] of Object.entries(sectionValue)) {
    const declarationName = isIdentifierValue(declaredValue) ? declaredValue.__identifier : outputName;
    const declaration = declarations.get(declarationName);
    if (declaration?.kind === kind) {
      section[outputName] = {
        type: declaration.type,
        properties: replaceIdentifierValues(declaration.properties, declarations)
      };
    }
  }
  return Object.keys(section).length > 0 ? section : undefined;
};

/**
 * Converts a class-based TypeScript stacktape.ts example to YAML.
 * Returns null when the example uses unsupported TypeScript constructs.
 */
export const convertTypescriptToYaml = (typescriptContent: string): string | null => {
  try {
    const source = stripCodeMarkers(typescriptContent);
    if (!source.includes('defineConfig') || !/from\s+['"]stacktape['"]/.test(source)) {
      return null;
    }

    const declarations = extractResourceDeclarations(source);
    const returnedConfigObject = findReturnedConfigObject(source);
    if (!returnedConfigObject || declarations.size === 0) {
      return null;
    }

    const returnedConfig = parseTypescriptExpression(`{${returnedConfigObject}}`);
    if (
      !returnedConfig ||
      typeof returnedConfig !== 'object' ||
      Array.isArray(returnedConfig) ||
      isIdentifierValue(returnedConfig)
    ) {
      return null;
    }

    const yamlConfig: Record<string, TsParsedValue> = {};
    const resources = buildSectionFromReturnMap(returnedConfig.resources, declarations, 'resource');
    const scripts = buildSectionFromReturnMap(returnedConfig.scripts, declarations, 'script');
    if (resources) yamlConfig.resources = resources;
    if (scripts) yamlConfig.scripts = scripts;

    for (const [key, value] of Object.entries(returnedConfig)) {
      if (key === 'resources' || key === 'scripts') continue;
      yamlConfig[key] = replaceIdentifierValues(value, declarations);
    }

    if (!yamlConfig.resources && !yamlConfig.scripts) {
      return null;
    }

    return yaml
      .stringify(yamlConfig, {
        indent: 2,
        lineWidth: 100,
        singleQuote: true
      })
      .trim();
  } catch {
    return null;
  }
};
