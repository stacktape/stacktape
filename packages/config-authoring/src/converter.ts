import type {
  AuthoringStacktapeConfig,
  CompiledStacktapeConfig,
  DefinedStacktapeConfig,
  GetConfigParams
} from './config.js';
import {
  ENGINE_TYPE_TO_CLASS,
  MISC_TYPES_CONVERTIBLE_TO_CLASSES,
  PACKAGING_TYPE_TO_CLASS,
  RESOURCE_TYPE_TO_CLASS,
  SCRIPT_TYPE_TO_CLASS
} from './class-config.js';
import { compileAuthoringConfig, defineConfig, isCompiledStacktapeConfig } from './config.js';
import { $CfFormat, $CfResourceParam, $CfStackOutput, $GitInfo, $ResourceParam, $Secret } from './directives.js';
import { AWS_SES } from './global-aws-services.js';
import * as resourceClasses from './resources.js';
import * as typePropertyClasses from './type-properties.js';
import { parseYaml, stringifyToYaml } from './yaml.js';

/** Lambda function event types (from events.d.ts) */
const LAMBDA_EVENT_TYPE_TO_CLASS: Record<string, string> = Object.fromEntries(
  MISC_TYPES_CONVERTIBLE_TO_CLASSES.filter(
    (t) => t.sourceFile === 'events.d.ts' && t.className.includes('Integration')
  ).map((t) => [t.typeValue, t.className])
);

/** Multi-container workload event types */
const CONTAINER_EVENT_TYPE_TO_CLASS: Record<string, string> = Object.fromEntries(
  MISC_TYPES_CONVERTIBLE_TO_CLASSES.filter(
    (t) => t.sourceFile === 'multi-container-workloads.d.ts' && t.className.includes('Integration')
  ).map((t) => [t.typeValue, t.className])
);

/** Resource types that use container-style events */
const CONTAINER_RESOURCE_TYPES = new Set([
  'web-service',
  'private-service',
  'worker-service',
  'multi-container-workload',
  'batch-job'
]);

/** Get the appropriate event type mapping based on resource type */
const getEventTypeMapping = (resourceType?: string): Record<string, string> => {
  if (resourceType && CONTAINER_RESOURCE_TYPES.has(resourceType)) {
    return CONTAINER_EVENT_TYPE_TO_CLASS;
  }
  return LAMBDA_EVENT_TYPE_TO_CLASS;
};

/** All stacktape exports that can be used in configs */
const STACKTAPE_EXPORTS: Record<string, unknown> = {
  // Directives
  $Secret,
  $ResourceParam,
  $CfFormat,
  $CfResourceParam,
  $CfStackOutput,
  $GitInfo,
  // Helper
  defineConfig,
  // AWS services
  AWS_SES,
  // Resource classes
  ...resourceClasses,
  // Type property classes (packaging, engines, integrations, etc.)
  ...typePropertyClasses
};

/** Default params for executing defineConfig */
const DEFAULT_CONFIG_PARAMS: GetConfigParams = {
  stage: 'dev',
  projectName: 'test',
  region: 'us-east-1',
  cliArgs: {},
  command: 'deploy',
  awsProfile: 'default',
  user: { id: '123', name: 'John Doe', email: 'john.doe@example.com' }
};

/** Regex to match directive strings like $Secret('value') or $Param('name', 'default') */
const DIRECTIVE_REGEX = /^\$([a-z]+)\(.*\)$/i;

/** YAML directive names that differ from SDK export names */
const DIRECTIVE_YAML_TO_SDK: Record<string, string> = {
  $Format: '$CfFormat',
  $StackOutput: '$CfStackOutput'
};

/** Check if a string is a directive */
const isDirective = (value: unknown): value is string => {
  return typeof value === 'string' && DIRECTIVE_REGEX.test(value);
};

/** Extract directive name from directive string */
const getDirectiveName = (directive: string): string => {
  const match = directive.match(DIRECTIVE_REGEX);
  return match ? `$${match[1]}` : '';
};

/** Generate code for a directive, mapping YAML names to SDK export names */
const generateDirectiveCode = (directive: string, imports: Set<string>): string => {
  const yamlName = getDirectiveName(directive);
  if (!yamlName) return directive;

  const sdkName = DIRECTIVE_YAML_TO_SDK[yamlName] || yamlName;
  imports.add(sdkName);

  if (sdkName !== yamlName) {
    return directive.replace(yamlName, sdkName);
  }
  return directive;
};

/** Generate code for any value, handling directives */
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

/** Check if a value contains functions or other non-serializable content */
const containsNonSerializable = (value: unknown, path = ''): string | null => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'function') {
    return `Function found at ${path || 'root'}`;
  }

  if (typeof value === 'symbol') {
    return `Symbol found at ${path || 'root'}`;
  }

  if (value instanceof Date || value instanceof RegExp) {
    return `${value.constructor.name} found at ${path || 'root'}`;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const result = containsNonSerializable(value[i], `${path}[${i}]`);
      if (result) return result;
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const result = containsNonSerializable((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
      if (result) return result;
    }
    return null;
  }

  return null;
};

/**
 * @throws Error if config contains functions or non-serializable values
 */
const configObjectToYaml = (config: Record<string, unknown>): string => {
  // Check for non-serializable content
  const nonSerializable = containsNonSerializable(config);
  if (nonSerializable) {
    throw new Error(`Config contains dynamic/non-serializable content: ${nonSerializable}. Cannot convert to YAML.`);
  }

  return stringifyToYaml(config);
};

/** Collect resource names referenced in a properties tree (connectTo, *Name fields in events, etc.) */
const collectResourceRefs = (obj: unknown, resourceNames: Set<string>): Set<string> => {
  const refs = new Set<string>();
  const walk = (val: unknown, key?: string) => {
    if (!val) return;
    if (Array.isArray(val)) {
      // connectTo arrays contain direct resource name strings
      if (key === 'connectTo') {
        for (const item of val) {
          if (typeof item === 'string' && resourceNames.has(item)) refs.add(item);
        }
      }
      val.forEach((v) => walk(v));
      return;
    }
    if (typeof val === 'object') {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        // Fields like httpApiGatewayName, sqsQueueName, eventBusName, userPoolName, targetSqsQueueName
        if (k.endsWith('Name') && typeof v === 'string' && resourceNames.has(v)) {
          refs.add(v);
        }
        walk(v, k);
      }
    }
  };
  walk(obj);
  return refs;
};

/** Topological sort of resources so dependencies (connectTo, *Name refs) come first */
const topologicalSortResources = (resources: Record<string, Record<string, unknown>>): string[] => {
  const names = new Set(Object.keys(resources));
  const deps = new Map<string, Set<string>>();
  for (const [name, resource] of Object.entries(resources)) {
    const refs = collectResourceRefs(resource.properties, names);
    // Also check redrivePolicy.targetSqsQueueName at resource level
    const allRefs = new Set([...refs, ...collectResourceRefs(resource, names)]);
    allRefs.delete(name); // no self-refs
    deps.set(name, allRefs);
  }

  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (name: string) => {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      // Circular dependency - just push in original order
      sorted.push(name);
      visited.add(name);
      return;
    }
    visiting.add(name);
    for (const dep of deps.get(name) || []) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  };

  for (const name of Object.keys(resources)) {
    visit(name);
  }
  return sorted;
};

/**
 * Converts a parsed config object to TypeScript code.
 */
const configObjectToTypescriptCode = (config: Record<string, unknown>): string => {
  const imports = new Set<string>();
  const resourceDeclarations: string[] = [];
  const scriptDeclarations: string[] = [];
  const resourceNames: string[] = [];
  const scriptNames: string[] = [];

  imports.add('defineConfig');

  // Process resources (topologically sorted so connectTo references are declared before use)
  if (config.resources && typeof config.resources === 'object') {
    const resources = config.resources as Record<string, Record<string, unknown>>;
    const sortedNames = topologicalSortResources(resources);

    for (const name of sortedNames) {
      const resource = resources[name];
      if (!resource) {
        throw new Error(`Resource ${name} disappeared while converting the configuration.`);
      }
      const resourceType = resource.type as string;
      const className = RESOURCE_TYPE_TO_CLASS[resourceType];
      if (!className) {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }

      imports.add(className as string);
      const propsCode = generatePropsCode(resource.properties as Record<string, unknown>, imports, 2, resourceType);
      resourceDeclarations.push(`const ${name} = new ${className}(${propsCode});`);
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
      scriptDeclarations.push(`const ${name} = new ${className}(${propsCode});`);
      scriptNames.push(name);
    }
  }

  // Build the TypeScript file
  const lines: string[] = [];

  // Import statement
  const sortedImports = Array.from(imports).toSorted();
  lines.push(`import { ${sortedImports.join(', ')} } from 'stacktape';`);
  lines.push('');

  // defineConfig
  lines.push('export default defineConfig(() => {');

  // Resource declarations
  if (resourceDeclarations.length) {
    lines.push(...resourceDeclarations);
    lines.push('');
  }

  // Script declarations
  if (scriptDeclarations.length) {
    lines.push(...scriptDeclarations);
    lines.push('');
  }

  // Return statement
  lines.push('return {');

  // Add resources
  if (resourceNames.length) {
    lines.push(`resources: { ${resourceNames.join(', ')} },`);
  }

  // Add scripts
  if (scriptNames.length) {
    lines.push(`scripts: { ${scriptNames.join(', ')} },`);
  }

  // Add other top-level config (hooks, etc.)
  const otherKeys = Object.keys(config).filter((k) => k !== 'resources' && k !== 'scripts');
  for (const key of otherKeys) {
    const value = config[key];
    lines.push(`${key}: ${JSON.stringify(value, null, 2)},`);
  }

  // Remove trailing comma from last line
  const lastLine = lines.at(-1);
  if (lastLine?.endsWith(',')) {
    lines[lines.length - 1] = lastLine.slice(0, -1);
  }

  lines.push('};');
  lines.push('});');

  return lines.join('\n');
};

/**
 * Generates TypeScript code for a properties object.
 * Handles special types like packaging, engine, and events.
 */
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
    const k = safeKey(key);

    // Handle special typed properties
    if (key === 'packaging' && isTypedProperty(value)) {
      const code = generateTypedPropertyCode(
        value as Record<string, unknown>,
        PACKAGING_TYPE_TO_CLASS,
        imports,
        indent,
        resourceType
      );
      entries.push(`${k}: ${code}`);
      continue;
    }

    if (key === 'engine' && isTypedProperty(value)) {
      const code = generateTypedPropertyCode(
        value as Record<string, unknown>,
        ENGINE_TYPE_TO_CLASS,
        imports,
        indent,
        resourceType
      );
      entries.push(`${k}: ${code}`);
      continue;
    }

    // Handle environment array -> object conversion
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
      entries.push(`${k}: { ${envEntries.join(', ')} }`);
      continue;
    }

    // Handle connectTo array - use variable references instead of strings
    if (key === 'connectTo' && Array.isArray(value)) {
      const refs = (value as (string | unknown)[]).map((ref) => {
        // If it's a string like "mainDatabase", convert to variable reference
        if (typeof ref === 'string') return ref;
        return JSON.stringify(ref);
      });
      entries.push(`${k}: [${refs.join(', ')}]`);
      continue;
    }

    // Handle events array with context-aware mapping
    if (key === 'events' && Array.isArray(value)) {
      const arrayCode = generateArrayCode(value, imports, indent + 1, resourceType);
      entries.push(`${k}: ${arrayCode}`);
      continue;
    }

    // Handle nested objects that might have typed properties
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = generatePropsCode(value as Record<string, unknown>, imports, indent + 1, resourceType);
      entries.push(`${k}: ${nested}`);
      continue;
    }

    // Handle arrays with potential typed properties
    if (Array.isArray(value)) {
      const arrayCode = generateArrayCode(value, imports, indent + 1, resourceType);
      entries.push(`${k}: ${arrayCode}`);
      continue;
    }

    // Handle directive strings
    if (isDirective(value)) {
      entries.push(`${k}: ${generateDirectiveCode(value, imports)}`);
      continue;
    }

    // Default: stringify
    entries.push(`${k}: ${generateValueCode(value, imports)}`);
  }

  if (entries.length === 0) return '{}';

  return `{\n${indentStr}  ${entries.join(`,\n${indentStr}  `)}\n${indentStr}}`;
};

/** Quote a key if it's not a valid JS identifier */
const safeKey = (key: string): string => (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key));

/** Check if value is a typed property (has type and properties) */
const isTypedProperty = (value: unknown): boolean => {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
};

/** Generate code for typed properties (packaging, engine, events, etc.) */
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
    // Fallback to plain object
    return JSON.stringify(value, null, 2);
  }

  imports.add(className);
  const propsCode = generatePropsCode(value.properties as Record<string, unknown>, imports, indent, resourceType);
  return `new ${className}(${propsCode})`;
};

/** Generate code for arrays, handling nested typed properties */
const generateArrayCode = (arr: unknown[], imports: Set<string>, indent: number, resourceType?: string): string => {
  const indentStr = '  '.repeat(indent);
  const items: string[] = [];
  const eventTypeMap = getEventTypeMapping(resourceType);

  for (const item of arr) {
    if (isDirective(item)) {
      items.push(generateDirectiveCode(item, imports));
    } else if (isTypedProperty(item)) {
      // Determine type map based on the type field
      const typed = item as Record<string, unknown>;
      const type = typed.type as string;

      // Check event types first (context-aware), then packaging/engine
      const className = eventTypeMap[type] || PACKAGING_TYPE_TO_CLASS[type] || ENGINE_TYPE_TO_CLASS[type];
      if (className) {
        items.push(generateTypedPropertyCode(typed, { [type]: className }, imports, indent, resourceType));
      } else {
        // Unknown typed property - keep as plain object
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
  const onlyItem = items.length === 1 ? items[0] : undefined;
  if (onlyItem && !onlyItem.includes('\n')) return `[${onlyItem}]`;

  return `[\n${indentStr}  ${items.join(`,\n${indentStr}  `)}\n${indentStr}]`;
};

/**
 * Validates that a config object can be serialized to YAML (no dynamic content).
 * @throws Error if config contains non-serializable content
 */
const validateSerializable = (config: Record<string, unknown>): void => {
  const nonSerializable = containsNonSerializable(config);
  if (nonSerializable) {
    throw new Error(`Config contains dynamic/non-serializable content: ${nonSerializable}`);
  }
};

/**
 * Converts a TypeScript config (with classes) to a plain serialized config object.
 * Handles both defineConfig style (function) and plain object configs.
 */
type ConfigExport = Record<string, unknown> | DefinedStacktapeConfig;

const typescriptConfigToObject = (
  configOrFn: ConfigExport,
  params: Partial<GetConfigParams> = {}
): Record<string, unknown> => {
  const mergedParams = { ...DEFAULT_CONFIG_PARAMS, ...params };

  // If it's a function (from defineConfig), call it
  const configOrCompiled: Record<string, unknown> | CompiledStacktapeConfig =
    typeof configOrFn === 'function' ? configOrFn(mergedParams) : configOrFn;

  const compiledConfig = isCompiledStacktapeConfig(configOrCompiled)
    ? configOrCompiled
    : compileAuthoringConfig(configOrCompiled as unknown as AuthoringStacktapeConfig);
  const transformedResources = Object.keys(compiledConfig.transforms);
  if (transformedResources.length) {
    throw new Error(
      `Cannot convert resource transforms from TypeScript to YAML (CloudFormation resources: ${transformedResources
        .map((name) => `\`${name}\``)
        .join(', ')}).`
    );
  }
  if (compiledConfig.finalTransform) {
    throw new Error('Cannot convert a final template transform from TypeScript to YAML.');
  }
  return compiledConfig.config as unknown as Record<string, unknown>;
};

/**
 * Converts a TypeScript config (with classes) to YAML string.
 * @throws Error if config contains dynamic/non-serializable content
 */
export const convertTypescriptToYaml = (
  input: string | ConfigExport,
  params: Partial<GetConfigParams> = {}
): string => {
  let configOrFn: ConfigExport;

  // If input is a string, evaluate it as TypeScript code
  if (typeof input === 'string') {
    configOrFn = evaluateTypescriptConfig(input);
  } else {
    configOrFn = input;
  }

  const config = typescriptConfigToObject(configOrFn, params);

  // Validate it can be serialized
  validateSerializable(config);

  return configObjectToYaml(config);
};

/**
 * Evaluates TypeScript config code and returns the exported config.
 * Works in both Node.js and browser environments using Function constructor.
 */
const evaluateTypescriptConfig = (tsCode: string): ConfigExport => {
  // Transform the code:
  // 1. Remove import statements (we inject stacktape exports)
  // 2. Replace "export default" with a return statement

  // Remove import statements (handles multi-line imports)
  let transformedCode = tsCode
    // Remove multi-line imports: import { ... } from '...'
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*['"];?/g, '')
    // Remove single-line imports: import x from '...' or import '...'
    .replace(/import\s[^;]*;?/g, '')
    .trim();

  // Handle "export default defineConfig(...)" -> "return defineConfig(...)"
  // Not anchored to start because there may be const declarations before it
  transformedCode = transformedCode.replace(/export\s+default\s+/, 'return ');

  // Create parameter names and values arrays for Function constructor
  const paramNames = Object.keys(STACKTAPE_EXPORTS);
  const paramValues = Object.values(STACKTAPE_EXPORTS);

  try {
    // Create function with stacktape exports as parameters
    const evaluator = new Function(...paramNames, transformedCode) as (...args: unknown[]) => unknown;

    // Execute with stacktape exports
    const result = evaluator(...paramValues) as ConfigExport;

    if (!result) {
      throw new Error('TypeScript config must have a default export (defineConfig) or return a config object');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to evaluate TypeScript config: ${message}`, { cause: error });
  }
};

/**
 * Converts YAML string to TypeScript config code.
 * Generates code using Stacktape SDK classes.
 */
export const convertYamlToTypescript = (yamlContent: string): string => {
  const config = parseYaml(yamlContent);

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Invalid YAML: expected an object with resources/scripts');
  }

  return configObjectToTypescriptCode(config as Record<string, unknown>);
};
