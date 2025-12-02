/**
 * Converts Stacktape config between TypeScript and YAML formats.
 *
 * TypeScript config uses classes like `new LambdaFunction({...})` with better DX.
 * YAML config is the serialized format for Stacktape CLI.
 */

import {
  ENGINE_TYPE_TO_CLASS,
  PACKAGING_TYPE_TO_CLASS,
  RESOURCE_TYPE_TO_CLASS,
  SCRIPT_TYPE_TO_CLASS
} from '../../src/api/npm/ts/class-config';
import { parseYaml, stringifyToYaml } from './yaml';

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
 * Converts a transformed TypeScript config object to YAML string.
 * The input should already be transformed (using `transformConfigWithResources`).
 *
 * @throws Error if config contains functions or non-serializable values
 */
export const configObjectToYaml = (config: Record<string, unknown>): string => {
  // Check for non-serializable content
  const nonSerializable = containsNonSerializable(config);
  if (nonSerializable) {
    throw new Error(`Config contains dynamic/non-serializable content: ${nonSerializable}. Cannot convert to YAML.`);
  }

  // Remove TypeScript-only properties that shouldn't be in YAML
  const cleanConfig = structuredClone(config);
  delete (cleanConfig as Record<string, unknown>).finalTransform;

  // Strip transforms from resources
  if (cleanConfig.resources && typeof cleanConfig.resources === 'object') {
    for (const resourceName of Object.keys(cleanConfig.resources as Record<string, unknown>)) {
      const resource = (cleanConfig.resources as Record<string, Record<string, unknown>>)[resourceName];
      if (resource && typeof resource === 'object') {
        delete resource.transforms;
      }
    }
  }

  return stringifyToYaml(cleanConfig);
};

/**
 * Converts YAML string to TypeScript config code.
 * Generates code using Stacktape SDK classes.
 */
export const yamlToTypescriptCode = (yamlContent: string): string => {
  const config = parseYaml(yamlContent) as Record<string, unknown>;
  return configObjectToTypescriptCode(config);
};

/**
 * Converts a parsed config object to TypeScript code.
 */
export const configObjectToTypescriptCode = (config: Record<string, unknown>): string => {
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
      const className = RESOURCE_TYPE_TO_CLASS[resource.type as string];
      if (!className) {
        throw new Error(`Unknown resource type: ${resource.type}`);
      }

      // Use LambdaFunction for Function class (JS reserved word)
      const exportedClassName = className === 'Function' ? 'LambdaFunction' : className;
      imports.add(exportedClassName);
      const propsCode = generatePropsCode(resource.properties as Record<string, unknown>, imports, 2);
      resourceDeclarations.push(`  const ${name} = new ${exportedClassName}(${propsCode});`);
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

  // Build the TypeScript file
  const lines: string[] = [];

  // Import statement
  const sortedImports = Array.from(imports).sort();
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
  lines.push('  return {');

  // Add resources
  if (resourceNames.length) {
    lines.push(`    resources: { ${resourceNames.join(', ')} },`);
  }

  // Add scripts
  if (scriptNames.length) {
    lines.push(`    scripts: { ${scriptNames.join(', ')} },`);
  }

  // Add other top-level config (hooks, etc.)
  const otherKeys = Object.keys(config).filter((k) => k !== 'resources' && k !== 'scripts');
  for (const key of otherKeys) {
    const value = config[key];
    lines.push(`    ${key}: ${JSON.stringify(value, null, 2).split('\n').join('\n    ')},`);
  }

  // Remove trailing comma from last line
  if (lines[lines.length - 1].endsWith(',')) {
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
  }

  lines.push('  };');
  lines.push('});');
  lines.push('');

  return lines.join('\n');
};

/**
 * Generates TypeScript code for a properties object.
 * Handles special types like packaging and engine.
 */
const generatePropsCode = (
  props: Record<string, unknown> | undefined,
  imports: Set<string>,
  indent: number
): string => {
  if (!props) return '{}';

  const indentStr = '  '.repeat(indent);
  const entries: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    // Handle special typed properties
    if (key === 'packaging' && isTypedProperty(value)) {
      const code = generateTypedPropertyCode(
        value as Record<string, unknown>,
        PACKAGING_TYPE_TO_CLASS,
        imports,
        indent
      );
      entries.push(`${key}: ${code}`);
      continue;
    }

    if (key === 'engine' && isTypedProperty(value)) {
      const code = generateTypedPropertyCode(value as Record<string, unknown>, ENGINE_TYPE_TO_CLASS, imports, indent);
      entries.push(`${key}: ${code}`);
      continue;
    }

    // Handle environment array -> object conversion
    if (key === 'environment' && Array.isArray(value)) {
      const envObj: Record<string, string> = {};
      for (const item of value as Array<{ name: string; value: string }>) {
        if (item.name && item.value !== undefined) {
          envObj[item.name] = String(item.value);
        }
      }
      entries.push(`${key}: ${JSON.stringify(envObj)}`);
      continue;
    }

    // Handle connectTo array (strings -> resource references in comment)
    if (key === 'connectTo' && Array.isArray(value)) {
      // In YAML these are strings; in TS they could be resource references
      // For now, keep as strings with a comment
      entries.push(`${key}: ${JSON.stringify(value)} /* resource references */`);
      continue;
    }

    // Handle nested objects that might have typed properties
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = generatePropsCode(value as Record<string, unknown>, imports, indent + 1);
      entries.push(`${key}: ${nested}`);
      continue;
    }

    // Handle arrays with potential typed properties
    if (Array.isArray(value)) {
      const arrayCode = generateArrayCode(value, imports, indent + 1);
      entries.push(`${key}: ${arrayCode}`);
      continue;
    }

    // Default: stringify
    entries.push(`${key}: ${JSON.stringify(value)}`);
  }

  if (entries.length === 0) return '{}';

  return `{\n${indentStr}  ${entries.join(`,\n${indentStr}  `)}\n${indentStr}}`;
};

/** Check if value is a typed property (has type and properties) */
const isTypedProperty = (value: unknown): boolean => {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
};

/** Generate code for typed properties (packaging, engine, etc.) */
const generateTypedPropertyCode = (
  value: Record<string, unknown>,
  typeMap: Record<string, string>,
  imports: Set<string>,
  indent: number
): string => {
  const type = value.type as string;
  const className = typeMap[type];

  if (!className) {
    // Fallback to plain object
    return JSON.stringify(value, null, 2);
  }

  imports.add(className);
  const propsCode = generatePropsCode(value.properties as Record<string, unknown>, imports, indent);
  return `new ${className}(${propsCode})`;
};

/** Generate code for arrays, handling nested typed properties */
const generateArrayCode = (arr: unknown[], imports: Set<string>, indent: number): string => {
  const indentStr = '  '.repeat(indent);
  const items: string[] = [];

  for (const item of arr) {
    if (isTypedProperty(item)) {
      // Determine type map based on the type field
      const typed = item as Record<string, unknown>;
      const type = typed.type as string;

      if (PACKAGING_TYPE_TO_CLASS[type]) {
        items.push(generateTypedPropertyCode(typed, PACKAGING_TYPE_TO_CLASS, imports, indent));
      } else if (ENGINE_TYPE_TO_CLASS[type]) {
        items.push(generateTypedPropertyCode(typed, ENGINE_TYPE_TO_CLASS, imports, indent));
      } else {
        // Event types or other - keep as plain objects
        items.push(JSON.stringify(item, null, 2).split('\n').join(`\n${indentStr}`));
      }
    } else if (item && typeof item === 'object' && !Array.isArray(item)) {
      const objCode = generatePropsCode(item as Record<string, unknown>, imports, indent);
      items.push(objCode);
    } else {
      items.push(JSON.stringify(item));
    }
  }

  if (items.length === 0) return '[]';
  if (items.length === 1 && !items[0].includes('\n')) return `[${items[0]}]`;

  return `[\n${indentStr}  ${items.join(`,\n${indentStr}  `)}\n${indentStr}]`;
};

/**
 * Converts YAML config to its serialized object representation.
 */
export const yamlToConfigObject = (yamlContent: string): Record<string, unknown> => {
  return parseYaml(yamlContent) as Record<string, unknown>;
};

/**
 * Validates that a config object can be serialized to YAML (no dynamic content).
 * @throws Error if config contains non-serializable content
 */
export const validateSerializable = (config: Record<string, unknown>): void => {
  const nonSerializable = containsNonSerializable(config);
  if (nonSerializable) {
    throw new Error(`Config contains dynamic/non-serializable content: ${nonSerializable}`);
  }
};
