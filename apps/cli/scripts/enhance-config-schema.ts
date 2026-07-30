import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { JsonSchemaGenerator } from 'typescript-json-schema';
import { CONFIG_SCHEMA_PATH, JSON_SCHEMAS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { writeJSON } from 'fs-extra';
import { marked } from 'marked';
import { getJsonSchemaGenerator } from './code-generation/utils';
import { stripExampleMarkersInSchema } from './code-generation/strip-example-markers';

type JsonSchema = {
  definitions?: Record<string, unknown>;
  [key: string]: unknown;
};

type FenceFocus = { lang: string; focusStart: number | null; focusEnd: number | null };
type Example = { lang: string; code: string };

const ENHANCED_CONFIG_SCHEMA_PATH = join(JSON_SCHEMAS_FOLDER_PATH, 'enhanced-config-schema.json');

// These public configuration shapes are documented directly but are not reachable from StacktapeConfig.
const DOCUMENTATION_ONLY_DEFINITIONS = [
  { definitionName: 'AlarmDefinition', generatorSymbol: 'AlarmDefinition' },
  { definitionName: 'LogForwardingBase', generatorSymbol: 'LogForwardingBase' }
] as const;

const addDocumentationOnlyDefinitions = ({
  schema,
  generator
}: {
  schema: JsonSchema;
  generator: JsonSchemaGenerator;
}) => {
  schema.definitions ??= {};

  for (const { definitionName, generatorSymbol } of DOCUMENTATION_ONLY_DEFINITIONS) {
    const supplementalSchema = generator.getSchemaForSymbol(generatorSymbol) as JsonSchema;
    Object.assign(schema.definitions, supplementalSchema.definitions ?? {});
    const { definitions: _nestedDefinitions, $schema: _schemaVersion, ...definition } = supplementalSchema;
    schema.definitions[definitionName] = definition;
  }

  // Supplemental definitions have not passed through the canonical schema's marker cleanup.
  stripExampleMarkersInSchema(schema);
};

const insertFocusMarkers = (
  code: string,
  comment: '#' | '//',
  focusStart: number | null,
  focusEnd: number | null
): string => {
  if (focusStart === null || focusEnd === null) return code;
  const lines = code.split('\n');
  if (focusStart < 0 || focusEnd >= lines.length || focusEnd < focusStart) return code;
  const indent = lines[focusStart].match(/^\s*/)?.[0] ?? '';
  const result: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    if (index === focusStart) result.push(`${indent}${comment} [!code focus-start]`);
    result.push(lines[index]);
    if (index === focusEnd) result.push(`${indent}${comment} [!code focus-end]`);
  }
  return result.join('\n');
};

const fenceAfter = (text: string, label: string): string | undefined => {
  const labelIndex = text.indexOf(label);
  if (labelIndex === -1) return undefined;
  return text.slice(labelIndex + label.length).match(/```[a-zA-Z0-9]*\n([\s\S]*?)\n```/)?.[1];
};

const extractLabeledExamples = (
  description: string,
  focusRanges: FenceFocus[] | undefined
): { description: string; examples: Example[] } => {
  const examplesStart = description.indexOf('**Example (YAML):**');
  if (examplesStart === -1) return { description, examples: [] };

  const cleanedDescription = description
    .slice(0, examplesStart)
    .replace(/\n+(?:---[ \t]*)?\n*$/, '')
    .trimEnd();
  const yamlCode = fenceAfter(description, '**Example (YAML):**');
  const typescriptCode = fenceAfter(description, '**Example (TypeScript):**');
  const yamlFocus = focusRanges?.find(({ lang, focusStart }) => lang === 'yaml' && focusStart !== null);
  const typescriptFocus = focusRanges?.find(
    ({ lang, focusStart }) => (lang === 'ts' || lang === 'typescript') && focusStart !== null
  );
  const examples: Example[] = [];

  if (yamlCode) {
    examples.push({
      lang: 'yaml',
      code: insertFocusMarkers(yamlCode, '#', yamlFocus?.focusStart ?? null, yamlFocus?.focusEnd ?? null)
    });
  }
  if (typescriptCode) {
    examples.push({
      lang: 'typescript',
      code: insertFocusMarkers(
        typescriptCode,
        '//',
        typescriptFocus?.focusStart ?? null,
        typescriptFocus?.focusEnd ?? null
      )
    });
  }

  return { description: cleanedDescription, examples };
};

const renderMarkdown = (source: string) => String(marked.parse(source.replace('####', ''))).trim();

const enhanceDescriptions = (node: unknown): void => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach(enhanceDescriptions);
    return;
  }

  const record = node as Record<string, unknown>;
  if ((record.type || record.$ref || record.anyOf) && typeof record.description === 'string') {
    const { description, examples } = extractLabeledExamples(
      record.description,
      record['x-stp-focus'] as FenceFocus[] | undefined
    );
    if (examples.length > 0) record._examples = examples;
    const [shortDescription = '', ...longDescriptionParts] = description.split('---');
    const longDescription = longDescriptionParts.join('---');
    record._MdxDesc = {
      sd: renderMarkdown(shortDescription),
      ...(longDescription ? { ld: renderMarkdown(longDescription) } : {})
    };
  }

  Object.values(record).forEach(enhanceDescriptions);
};

export const enhanceConfigSchema = async ({
  schema,
  generator
}: {
  schema?: JsonSchema;
  generator?: JsonSchemaGenerator;
} = {}): Promise<JsonSchema> => {
  logInfo('Enhancing config schema for documentation...');
  const baseSchema = schema ?? (JSON.parse(await readFile(CONFIG_SCHEMA_PATH, 'utf-8')) as JsonSchema);
  const enhancedSchema = structuredClone(baseSchema);
  addDocumentationOnlyDefinitions({
    schema: enhancedSchema,
    generator: generator ?? (await getJsonSchemaGenerator())
  });
  enhanceDescriptions(enhancedSchema);
  await writeJSON(ENHANCED_CONFIG_SCHEMA_PATH, enhancedSchema);
  logSuccess(`Enhanced config schema saved to ${ENHANCED_CONFIG_SCHEMA_PATH}.`);
  return enhancedSchema;
};

if (import.meta.main) {
  enhanceConfigSchema().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
