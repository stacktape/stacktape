import { createWriteStream, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import { Parse } from 'unzipper';

const SCHEMA_ZIP_URL = 'https://schema.cloudformation.us-east-1.amazonaws.com/CloudformationSchema.zip';

interface JsonSchemaProperty {
  description?: string;
  type?: string | string[];
  $ref?: string;
  enum?: (string | number | boolean)[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  additionalProperties?: boolean | JsonSchemaProperty;
  patternProperties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  pattern?: string;
  default?: unknown;
  oneOf?: JsonSchemaProperty[];
  anyOf?: JsonSchemaProperty[];
  allOf?: JsonSchemaProperty[];
}

interface CloudFormationSchema {
  typeName: string;
  description?: string;
  definitions?: Record<string, JsonSchemaProperty>;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

function convertTypeName(typeName: string): string {
  return typeName
    .split('::')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function generateJsDoc(prop: JsonSchemaProperty, indent: string = ''): string {
  const lines: string[] = [];

  if (prop.description) {
    // Split description into multiple lines if too long
    const descLines = prop.description.split('\n');
    for (const line of descLines) {
      // Wrap long lines
      const words = line.split(' ');
      let currentLine = '';
      for (const word of words) {
        if (currentLine.length + word.length + 1 > 100) {
          lines.push(currentLine.trim());
          currentLine = `${word} `;
        } else {
          currentLine += `${word} `;
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
    }
  }

  // Add directives
  if (prop.default !== undefined) {
    lines.push(`@default ${JSON.stringify(prop.default)}`);
  }
  if (prop.minimum !== undefined) {
    lines.push(`@minimum ${prop.minimum}`);
  }
  if (prop.maximum !== undefined) {
    lines.push(`@maximum ${prop.maximum}`);
  }
  if (prop.minLength !== undefined) {
    lines.push(`@minLength ${prop.minLength}`);
  }
  if (prop.maxLength !== undefined) {
    lines.push(`@maxLength ${prop.maxLength}`);
  }
  if (prop.minItems !== undefined) {
    lines.push(`@minItems ${prop.minItems}`);
  }
  if (prop.maxItems !== undefined) {
    lines.push(`@maxItems ${prop.maxItems}`);
  }
  if (prop.uniqueItems !== undefined) {
    lines.push(`@uniqueItems ${prop.uniqueItems}`);
  }
  if (prop.pattern !== undefined) {
    lines.push(`@pattern ${prop.pattern}`);
  }
  if (prop.enum !== undefined) {
    lines.push(`@enum ${JSON.stringify(prop.enum)}`);
  }

  if (lines.length === 0) {
    return '';
  }

  if (lines.length === 1) {
    return `${indent}/** ${lines[0]} */\n`;
  }

  return `${indent}/**\n${lines.map((line) => `${indent} * ${line}`).join('\n')}\n${indent} */\n`;
}

function resolveRefName(ref: string): string | null {
  // Format: "#/definitions/ImageConfig"
  const match = ref.match(/^#\/definitions\/(.+)$/);
  return match ? match[1] : null;
}

function propertyToTypeScript(
  prop: JsonSchemaProperty,
  definitions: Record<string, JsonSchemaProperty>,
  indent: string = '  ',
  expandingRefs: Set<string> = new Set()
): string {
  if (prop.$ref) {
    const refName = resolveRefName(prop.$ref);
    if (!refName) {
      return 'unknown';
    }

    // Check for circular reference
    if (expandingRefs.has(refName)) {
      return 'unknown'; // Break circular reference
    }

    const refDef = definitions[refName];
    if (!refDef) {
      return 'unknown';
    }

    // Track this ref to detect circular references
    const newExpandingRefs = new Set(expandingRefs);
    newExpandingRefs.add(refName);

    // Inline the referenced type
    return propertyToTypeScript(refDef, definitions, indent, newExpandingRefs);
  }

  if (prop.enum) {
    return prop.enum.map((v) => JSON.stringify(v)).join(' | ');
  }

  if (prop.oneOf || prop.anyOf) {
    const variants = prop.oneOf || prop.anyOf || [];
    return variants.map((v) => propertyToTypeScript(v, definitions, indent, expandingRefs)).join(' | ');
  }

  if (prop.allOf) {
    return prop.allOf.map((v) => propertyToTypeScript(v, definitions, indent, expandingRefs)).join(' & ');
  }

  const type = prop.type;

  if (Array.isArray(type)) {
    return type.map((t) => jsonTypeToTs(t)).join(' | ');
  }

  switch (type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array':
      if (prop.items) {
        const itemType = propertyToTypeScript(prop.items, definitions, indent, expandingRefs);
        // Wrap union types in parentheses for correct precedence
        const needsParens = itemType.includes(' | ') || itemType.includes(' & ');
        return needsParens ? `(${itemType})[]` : `${itemType}[]`;
      }
      return 'unknown[]';
    case 'object':
      if (prop.properties) {
        return generateInlineObject(prop, definitions, indent, expandingRefs);
      }
      if (prop.patternProperties) {
        // Get the first pattern property type
        const patternValues = Object.values(prop.patternProperties);
        if (patternValues.length > 0) {
          const valueType = propertyToTypeScript(patternValues[0], definitions, indent, expandingRefs);
          return `Record<string, ${valueType}>`;
        }
      }
      if (prop.additionalProperties === true) {
        return 'Record<string, unknown>';
      }
      if (typeof prop.additionalProperties === 'object') {
        const valueType = propertyToTypeScript(prop.additionalProperties, definitions, indent, expandingRefs);
        return `Record<string, ${valueType}>`;
      }
      return 'Record<string, unknown>';
    default:
      return 'unknown';
  }
}

function jsonTypeToTs(type: string): string {
  switch (type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array':
      return 'unknown[]';
    case 'object':
      return 'Record<string, unknown>';
    default:
      return 'unknown';
  }
}

function generateInlineObject(
  prop: JsonSchemaProperty,
  definitions: Record<string, JsonSchemaProperty>,
  indent: string,
  expandingRefs: Set<string> = new Set()
): string {
  if (!prop.properties) {
    return 'Record<string, unknown>';
  }

  const requiredProps = new Set(prop.required || []);
  const lines: string[] = ['{'];
  const innerIndent = `${indent}  `;

  for (const [propName, propDef] of Object.entries(prop.properties)) {
    const jsDoc = generateJsDoc(propDef, innerIndent);
    const isRequired = requiredProps.has(propName);
    const tsType = propertyToTypeScript(propDef, definitions, innerIndent, expandingRefs);
    const optionalMark = isRequired ? '' : '?';

    if (jsDoc) {
      lines.push(jsDoc.trimEnd());
    }
    lines.push(`${innerIndent}${propName}${optionalMark}: ${tsType};`);
  }

  lines.push(`${indent}}`);
  return lines.join('\n');
}

function generateMainType(
  typeName: string,
  schema: CloudFormationSchema,
  definitions: Record<string, JsonSchemaProperty>
): string {
  const safeName = convertTypeName(typeName);
  const requiredProps = new Set(schema.required || []);

  let jsDoc = '';
  if (schema.description) {
    jsDoc = generateJsDoc({ description: schema.description }, '');
  }

  const propLines: string[] = [];

  if (schema.properties) {
    for (const [propName, propDef] of Object.entries(schema.properties)) {
      const propJsDoc = generateJsDoc(propDef, '  ');
      const isRequired = requiredProps.has(propName);
      const tsType = propertyToTypeScript(propDef, definitions, '  ');
      const optionalMark = isRequired ? '' : '?';

      if (propJsDoc) {
        propLines.push(propJsDoc.trimEnd());
      }
      propLines.push(`  ${propName}${optionalMark}: ${tsType};`);
    }
  }

  return `${jsDoc}export type ${safeName} = {\n${propLines.join('\n')}\n};\n`;
}

export function generateCloudFormationTypes(schemaPath: string, outputPath: string): void {
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const schema: CloudFormationSchema = JSON.parse(schemaContent);

  const definitions = schema.definitions || {};
  const output: string[] = [];

  output.push('// This file is auto-generated. Do not edit manually.');
  output.push(`// Source: ${basename(schemaPath)}`);
  output.push('');

  // Generate main type with all types inlined
  output.push(generateMainType(schema.typeName, schema, definitions));

  writeFileSync(outputPath, output.join('\n'), 'utf-8');
}

/**
 * Converts a schema filename to a TypeScript filename
 * e.g., "aws-lambda-function.json" -> "AwsLambdaFunction.ts"
 */
function schemaFileToTsFile(schemaFile: string): string {
  const baseName = basename(schemaFile, '.json');
  const typeName = baseName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `${typeName}.ts`;
}

/**
 * Downloads and extracts the CloudFormation schema ZIP file
 */
async function downloadAndExtractSchemas(tempDir: string): Promise<void> {
  console.log(`Downloading schemas from ${SCHEMA_ZIP_URL}...`);

  const response = await fetch(SCHEMA_ZIP_URL);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  console.log('Extracting schemas...');

  // Create temp directory
  mkdirSync(tempDir, { recursive: true });

  // Extract ZIP contents
  const zipStream = response.body;
  if (!zipStream) {
    throw new Error('No response body');
  }

  await new Promise<void>((resolve, reject) => {
    const nodeStream = Readable.fromWeb(zipStream);
    const writePromises: Promise<void>[] = [];

    nodeStream
      .pipe(Parse())
      .on(
        'entry',
        (entry: { path: string; type: string; pipe: (dest: NodeJS.WritableStream) => void; autodrain: () => void }) => {
          const fileName = entry.path;
          const type = entry.type;

          if (type === 'File' && fileName.endsWith('.json')) {
            const outputPath = join(tempDir, basename(fileName));
            const writeStream = createWriteStream(outputPath);

            // Track when this file finishes writing
            const writePromise = new Promise<void>((resolveWrite, rejectWrite) => {
              writeStream.on('finish', resolveWrite);
              writeStream.on('error', rejectWrite);
            });
            writePromises.push(writePromise);

            entry.pipe(writeStream);
          } else {
            entry.autodrain();
          }
        }
      )
      .on('close', async () => {
        // Wait for all files to finish writing
        try {
          await Promise.all(writePromises);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });

  console.log('Extraction complete.');
}

/**
 * Processes all JSON schema files from a directory and generates TypeScript types
 */
function generateTypesFromDirectory(schemasDir: string, outputDir: string): { success: number; errors: number } {
  const files = readdirSync(schemasDir).filter((file: string) => file.endsWith('.json'));

  console.log(`Found ${files.length} schema files`);

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const schemaPath = join(schemasDir, file);
    const outputFile = schemaFileToTsFile(file);
    const outputPath = join(outputDir, outputFile);

    try {
      generateCloudFormationTypes(schemaPath, outputPath);
      successCount++;
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
      errorCount++;
    }
  }

  return { success: successCount, errors: errorCount };
}

/**
 * Main function: downloads schemas, generates types, and cleans up
 */
async function generateCloudformationTypes(): Promise<void> {
  const tempDir = join(process.cwd(), '.temp-cf-schemas');
  const outputDir = '@generated/cloudformation-ts-types';

  try {
    // Download and extract schemas
    await downloadAndExtractSchemas(tempDir);

    // Generate TypeScript types
    const result = generateTypesFromDirectory(tempDir, outputDir);

    console.log(`\nGeneration complete: ${result.success} succeeded, ${result.errors} failed`);
  } finally {
    // Clean up temporary files
    console.log('Cleaning up temporary files...');
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      console.warn('Warning: Could not clean up temporary directory');
    }
  }
}

if (import.meta.main) {
  generateCloudformationTypes();
}
