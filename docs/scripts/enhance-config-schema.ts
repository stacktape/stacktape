import { join } from 'node:path';
import configSchema from '@generated/schemas/config-schema.json';
import { writeJSON } from 'fs-extra';
import { getJsonSchemaGenerator } from '../../scripts/code-generation/utils';
import { stripExampleMarkersInSchema } from '../../scripts/code-generation/strip-example-markers';
import { logInfo, logSuccess } from '../../shared/utils/logging';
import { marked } from './utils/marked-mdx-parser';
import { processAllNodes } from './utils/misc';

type FenceFocus = { lang: string; focusStart: number | null; focusEnd: number | null };
type Example = { lang: string; code: string };

// These public configuration shapes are documented directly, but are not reachable from
// StacktapeConfig (for example, global alarm rules are managed through the Console). Keep them
// out of the validation schema and add them only to the documentation schema.
const DOCUMENTATION_ONLY_DEFINITIONS = ['AlarmDefinition', 'LogForwardingBase'] as const;

const addDocumentationOnlyDefinitions = async (schema: any) => {
  const generator = await getJsonSchemaGenerator(join(__dirname, '..', '..'));
  schema.definitions ??= {};

  for (const definitionName of DOCUMENTATION_ONLY_DEFINITIONS) {
    const supplementalSchema = generator.getSchemaForSymbol(definitionName) as any;
    Object.assign(schema.definitions, supplementalSchema.definitions ?? {});

    const { definitions: _nestedDefinitions, $schema: _schemaVersion, ...definition } = supplementalSchema;
    schema.definitions[definitionName] = definition;
  }

  // Supplemental schemas come directly from typescript-json-schema, before the normal schema
  // cleanup pass that records example focus ranges and removes authoring markers.
  stripExampleMarkersInSchema(schema);
};

// Re-insert Shiki-style focus markers (consumed by <CodeBlockNew>) from the recorded `x-stp-focus`
// line ranges, so the docs example highlights the documented property and collapses the rest.
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
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i === focusStart) out.push(`${indent}${comment} [!code focus-start]`);
    out.push(lines[i]);
    if (i === focusEnd) out.push(`${indent}${comment} [!code focus-end]`);
  }
  return out.join('\n');
};

const fenceAfter = (text: string, label: string): string | null => {
  const labelIdx = text.indexOf(label);
  if (labelIdx === -1) return null;
  const m = text.slice(labelIdx + label.length).match(/```[a-zA-Z0-9]*\n([\s\S]*?)\n```/);
  return m ? m[1] : null;
};

// Pulls the labeled "**Example (YAML/TypeScript):**" blocks out of the prose into structured data
// (so the renderer shows them via <CodeBlockNew> with tabs/focus/collapse), leaving the rest of the
// description as plain prose. Inline (unlabeled) code fences are left in the description untouched.
const extractLabeledExamples = (
  description: string,
  xStpFocus: FenceFocus[] | undefined
): { cleanedDescription: string; examples: Example[] } => {
  const startIdx = description.indexOf('**Example (YAML):**');
  if (startIdx === -1) return { cleanedDescription: description, examples: [] };

  const cleanedDescription = description
    .slice(0, startIdx)
    .replace(/\n+(?:---[ \t]*)?\n*$/, '')
    .trimEnd();

  const yamlCode = fenceAfter(description, '**Example (YAML):**');
  const tsCode = fenceAfter(description, '**Example (TypeScript):**');
  const focus = xStpFocus ?? [];
  const yamlFocus = focus.find((f) => f.lang === 'yaml' && f.focusStart !== null);
  const tsFocus = focus.find((f) => (f.lang === 'ts' || f.lang === 'typescript') && f.focusStart !== null);

  const examples: Example[] = [];
  if (yamlCode)
    examples.push({
      lang: 'yaml',
      code: insertFocusMarkers(yamlCode, '#', yamlFocus?.focusStart ?? null, yamlFocus?.focusEnd ?? null)
    });
  if (tsCode)
    examples.push({
      lang: 'typescript',
      code: insertFocusMarkers(tsCode, '//', tsFocus?.focusStart ?? null, tsFocus?.focusEnd ?? null)
    });

  return { cleanedDescription, examples };
};

export const enhanceConfigSchema = async () => {
  logInfo('Enhancing config schema...');
  await addDocumentationOnlyDefinitions(configSchema);
  await processAllNodes(configSchema, async (node) => {
    try {
      if (node && (node.type || node.$ref || node.anyOf) && node.description) {
        const { cleanedDescription, examples } = extractLabeledExamples(node.description, node['x-stp-focus']);
        if (examples.length) node._examples = examples;
        const [sd, ld] = cleanedDescription.split('---');
        const [parsedSd, parsedLd] = await Promise.all([marked((sd ?? '').replace('####', '')), ld && marked(ld)]);
        node._MdxDesc = { sd: parsedSd, ...(ld && { ld: parsedLd }) };
      }
    } catch (err) {
      console.error('Processing of schema node ended with error', err, node);
      throw err;
    }
  });

  const schemaPath = join(__dirname, '../..', '@generated', 'schemas', 'enhanced-config-schema.json');
  await writeJSON(schemaPath, configSchema);
  logSuccess(`Config schema enhanced successfully and saved to ${schemaPath}`);
};

if (import.meta.main) {
  enhanceConfigSchema();
}
