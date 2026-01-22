import { jsonSchemaToZod } from 'json-schema-to-zod';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { writeFile } from 'fs-extra';
import { join } from 'node:path';
import { logInfo, logSuccess } from '@shared/utils/logging';

const OUTPUT_PATH = join(process.cwd(), '@generated/schemas/validate-config-zod.ts');

// NOTE: We intentionally do NOT convert unions to discriminatedUnion.
// While discriminatedUnion gives better error messages, it is STRICTER than regular union.
// With z.union, Zod tries each option and succeeds if any matches.
// With z.discriminatedUnion, Zod checks the discriminator first and fails immediately if no match.
// This caused previously valid configs to fail validation (e.g. custom rule types in WAF).
// The AJV validator was more lenient, so we keep unions to maintain backwards compatibility.

// Marker prefix added to descriptions of optional properties
// This survives dereferencing and is used in post-processing to add .optional()
const OPTIONAL_MARKER = '[__OPTIONAL__]';

// Pre-process: Mark optional properties in the JSON schema before dereferencing
// This traverses the schema and adds a marker to the description of properties
// that are NOT in the required array of their parent object
const markOptionalProperties = (schema: any): { schema: any; count: number } => {
  let count = 0;

  const traverse = (node: any, path: string[] = []): any => {
    if (!node || typeof node !== 'object') return node;

    // Handle arrays
    if (Array.isArray(node)) {
      return node.map((item, i) => traverse(item, [...path, String(i)]));
    }

    // Clone the node to avoid mutating the original
    const result: any = {};

    for (const [key, value] of Object.entries(node)) {
      result[key] = traverse(value, [...path, key]);
    }

    // If this is an object with properties, mark non-required ones
    if (result.type === 'object' && result.properties && typeof result.properties === 'object') {
      const required = new Set(result.required || []);

      for (const [propName, propSchema] of Object.entries(result.properties)) {
        if (!required.has(propName) && propSchema && typeof propSchema === 'object') {
          const prop = propSchema as any;
          // Add marker to description (or create one)
          if (prop.description) {
            prop.description = `${OPTIONAL_MARKER}${prop.description}`;
          } else {
            prop.description = OPTIONAL_MARKER;
          }
          count++;
        }
      }
    }

    return result;
  };

  return { schema: traverse(schema), count };
};

// Post-process: Convert optional markers to .optional() calls
// Finds properties with our marker in their .describe() and adds .optional()
const applyOptionalMarkers = (code: string): { code: string; count: number } => {
  let count = 0;

  // Match: "propName": z.something().describe("[__OPTIONAL__]...")
  // We need to find the end of the zod chain and add .optional() before .describe()
  // Pattern: "propName": <zod-chain>.describe("[__OPTIONAL__]
  // The zod chain can be complex, but .describe() is always at the end

  // Strategy: Find all occurrences of .describe("[__OPTIONAL__] and work backwards to insert .optional()
  // We need to handle cases like:
  //   z.string().describe("[__OPTIONAL__]...")
  //   z.enum([...]).describe("[__OPTIONAL__]...")
  //   z.object({...}).strict().describe("[__OPTIONAL__]...")
  //   z.union([...]).describe("[__OPTIONAL__]...")
  //   z.array(z.string()).describe("[__OPTIONAL__]...")

  // Replace .describe("[__OPTIONAL__] with .optional().describe("
  // This works because .describe() is always at the end of the chain
  const modified = code.replace(/\.describe\("\[__OPTIONAL__\]/g, () => {
    count++;
    return '.optional().describe("';
  });

  return { code: modified, count };
};

// Post-process: Fix z.record() for Zod 4 (needs two arguments: key schema and value schema)
const fixRecordSyntax = (code: string): string => {
  let modified = code;
  let totalReplacements = 0;

  // z.record(valueSchema) -> z.record(z.string(), valueSchema)
  // Match z.record( followed by z. but NOT z.string(),
  // Run in a loop to handle nested records like z.record(z.string(), z.record(z.any()))
  const regex = /z\.record\(z\.(?!string\(\),)/g;
  let previousLength = 0;
  while (modified.length !== previousLength) {
    previousLength = modified.length;
    modified = modified.replace(regex, () => {
      totalReplacements++;
      return 'z.record(z.string(), z.';
    });
  }

  logInfo(`Fixed ${totalReplacements} z.record() calls for Zod 4 syntax`);
  return modified;
};

// Post-process: Fix .default() values that have extra quotes
const fixDefaultValues = (code: string): string => {
  let modified = code;
  let replacements = 0;

  // .default("'value'") -> .default("value")
  modified = modified.replace(/\.default\("'([^']+)'"\)/g, (_, value) => {
    replacements++;
    return `.default("${value}")`;
  });

  logInfo(`Fixed ${replacements} .default() values with extra quotes`);
  return modified;
};

// Post-process: Fix .default() with numeric values on enums that expect strings like "7.0"
// e.g. z.enum(["5.0","6.0","7.0"]).describe("...").default(7) -> ...default("7.0")
const fixEnumNumericDefaults = (code: string): string => {
  let modified = code;
  let replacements = 0;

  // Match enum followed by optional .describe() and then .default(number)
  // Use a more flexible pattern that captures the enum values and numeric default
  modified = modified.replace(
    /z\.enum\(\[([^\]]+)\]\)(\.describe\("[^"]*"\))?\.default\((\d+(?:\.\d+)?)\)/g,
    (match, enumValues, describeCall, numValue) => {
      // Check if the enum contains string versions like "7.0"
      const stringValue = numValue.includes('.') ? numValue : `${numValue}.0`;
      if (enumValues.includes(`"${stringValue}"`)) {
        replacements++;
        return `z.enum([${enumValues}])${describeCall || ''}.default("${stringValue}")`;
      }
      return match;
    }
  );

  logInfo(`Fixed ${replacements} .default() numeric values on enums`);
  return modified;
};

// Post-process: Fix .default() on arrays - should pass empty array or remove entirely
// e.g. z.array(z.string()).describe("...").default("*") is invalid - remove the .default()
const fixArrayDefaults = (code: string): string => {
  let modified = code;
  let replacements = 0;

  // Match z.array(...) with optional .optional() and .describe() followed by .default("string")
  // The .optional() may appear before .describe() now
  modified = modified.replace(
    /z\.array\(z\.string\(\)\)(\.optional\(\))?(\.describe\(".*?"\))?\.default\("[^"]*"\)/g,
    (_, optionalCall, describeCall) => {
      replacements++;
      return `z.array(z.string())${optionalCall || ''}${describeCall || ''}`;
    }
  );

  logInfo(`Fixed ${replacements} .default() on array types`);
  return modified;
};

// Post-process: Fix .default() on objects - should pass object literal or remove
// e.g. z.object({...}).describe("...").default("service-connect") is invalid
const fixObjectDefaults = (code: string): string => {
  let modified = code;
  let replacements = 0;

  // Match .strict() or .passthrough() with optional .optional() and .describe() followed by .default("string")
  modified = modified.replace(
    /\}\)\.strict\(\)(\.optional\(\))?(\.describe\("[^"]*"\))?\.default\("[^"]+"\)/g,
    (_, optionalCall, describeCall) => {
      replacements++;
      return `}).strict()${optionalCall || ''}${describeCall || ''}`;
    }
  );

  modified = modified.replace(
    /\}\)\.passthrough\(\)(\.optional\(\))?(\.describe\("[^"]*"\))?\.default\("[^"]+"\)/g,
    (_, optionalCall, describeCall) => {
      replacements++;
      return `}).passthrough()${optionalCall || ''}${describeCall || ''}`;
    }
  );

  logInfo(`Fixed ${replacements} .default() on object types`);
  return modified;
};

// Post-process: Add preprocessing for numbers to accept strings like "512"
// This maintains backwards compatibility with YAML configs where numbers might be quoted
// Uses z.preprocess to only accept number or numeric string (NOT boolean or other types)
const addNumberCoercion = (code: string): string => {
  let modified = code;
  let count = 0;
  // Replace z.number() with a preprocessed version that accepts numeric strings
  // z.preprocess checks if it's already a number, or a string that parses to a valid number
  modified = modified.replace(/z\.number\(\)/g, () => {
    count++;
    return 'z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number())';
  });
  logInfo(`Added number preprocessing to ${count} number fields (accepts strings like "512")`);
  return modified;
};

// Post-process: Add preprocessing for booleans to accept strings "true"/"false"
// Only accepts actual boolean or the exact strings "true"/"false" (case-insensitive)
// Does NOT accept truthy/falsy values like "yes", 1, etc.
const addBooleanCoercion = (code: string): string => {
  let modified = code;
  let count = 0;
  modified = modified.replace(/z\.boolean\(\)/g, () => {
    count++;
    return 'z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean())';
  });
  logInfo(`Added boolean preprocessing to ${count} boolean fields (accepts strings "true"/"false")`);
  return modified;
};

export const generateZodSchema = async (jsonSchema: object): Promise<void> => {
  // Step 1: Mark optional properties BEFORE dereferencing
  // This adds a marker to the description of properties not in the required array
  logInfo('Marking optional properties in JSON schema...');
  const { schema: markedSchema, count: markedCount } = markOptionalProperties(jsonSchema);
  logInfo(`Marked ${markedCount} optional properties`);

  // Step 2: Dereference $refs (this preserves our markers in descriptions)
  logInfo('Dereferencing JSON schema $ref pointers...');
  const dereferencedSchema = await $RefParser.dereference(markedSchema as any);

  // Step 3: Convert to Zod schema
  logInfo('Converting JSON schema to Zod schema...');
  let zodSchemaCode = jsonSchemaToZod(dereferencedSchema as any, {
    module: 'esm',
    name: 'stacktapeConfigSchema',
    type: true
  });

  // Step 4: Post-process the generated code
  logInfo('Post-processing Zod schema...');

  // Apply optional markers first (converts [__OPTIONAL__] to .optional())
  const { code: withOptionals, count: optionalCount } = applyOptionalMarkers(zodSchemaCode);
  zodSchemaCode = withOptionals;
  logInfo(`Applied ${optionalCount} .optional() modifiers from markers`);

  zodSchemaCode = fixRecordSyntax(zodSchemaCode);
  zodSchemaCode = fixDefaultValues(zodSchemaCode);
  zodSchemaCode = fixEnumNumericDefaults(zodSchemaCode);
  zodSchemaCode = fixArrayDefaults(zodSchemaCode);
  zodSchemaCode = fixObjectDefaults(zodSchemaCode);
  zodSchemaCode = addNumberCoercion(zodSchemaCode);
  zodSchemaCode = addBooleanCoercion(zodSchemaCode);

  logInfo('Writing Zod schema...');
  await writeFile(OUTPUT_PATH, zodSchemaCode);

  logSuccess(`Zod schema written to ${OUTPUT_PATH} (${(zodSchemaCode.length / 1024).toFixed(2)} KB)`);
};
