import { jsonSchemaToZod } from 'json-schema-to-zod';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { writeFile } from 'fs-extra';
import { join } from 'node:path';
import { logInfo, logSuccess } from '@shared/utils/logging';

const OUTPUT_PATH = join(process.cwd(), '@generated/schemas/validate-config-zod.ts');

// Post-process: Convert z.union with type discriminator to z.discriminatedUnion
const convertUnionsToDiscriminated = (code: string): string => {
  let modified = code;
  let replacements = 0;

  // Find z.union([z.object({ "type": and replace with z.discriminatedUnion("type", [z.object({ "type":
  // This works because if the first element has "type" as first property, it's likely a discriminated union
  modified = modified.replace(/z\.union\(\[z\.object\(\{ "type": z\.literal\(/g, () => {
    replacements++;
    return 'z.discriminatedUnion("type", [z.object({ "type": z.literal(';
  });

  logInfo(`Converted ${replacements} unions to discriminatedUnion`);
  return modified;
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

  // Match z.array(z.string()) with optional .describe() followed by .default("string")
  // Use non-greedy .*? to match describe content since it may contain \n sequences
  modified = modified.replace(
    /z\.array\(z\.string\(\)\)(\.describe\(".*?"\))?\.default\("[^"]*"\)/g,
    (_, describeCall) => {
      replacements++;
      return `z.array(z.string())${describeCall || ''}`;
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

  // Match .strict() or .passthrough() with optional .describe() followed by .default("string")
  modified = modified.replace(/\}\)\.strict\(\)(\.describe\("[^"]*"\))?\.default\("[^"]+"\)/g, (_, describeCall) => {
    replacements++;
    return `}).strict()${describeCall || ''}`;
  });

  modified = modified.replace(
    /\}\)\.passthrough\(\)(\.describe\("[^"]*"\))?\.default\("[^"]+"\)/g,
    (_, describeCall) => {
      replacements++;
      return `}).passthrough()${describeCall || ''}`;
    }
  );

  logInfo(`Fixed ${replacements} .default() on object types`);
  return modified;
};

export const generateZodSchema = async (jsonSchema: object): Promise<void> => {
  logInfo('Dereferencing JSON schema $ref pointers...');
  const dereferencedSchema = await $RefParser.dereference(jsonSchema as any);

  logInfo('Converting JSON schema to Zod schema...');
  let zodSchemaCode = jsonSchemaToZod(dereferencedSchema as any, {
    module: 'esm',
    name: 'stacktapeConfigSchema',
    type: true
  });

  logInfo('Post-processing Zod schema...');
  zodSchemaCode = convertUnionsToDiscriminated(zodSchemaCode);
  zodSchemaCode = fixRecordSyntax(zodSchemaCode);
  zodSchemaCode = fixDefaultValues(zodSchemaCode);
  zodSchemaCode = fixEnumNumericDefaults(zodSchemaCode);
  zodSchemaCode = fixArrayDefaults(zodSchemaCode);
  zodSchemaCode = fixObjectDefaults(zodSchemaCode);

  logInfo('Writing Zod schema...');
  await writeFile(OUTPUT_PATH, zodSchemaCode);

  logSuccess(`Zod schema written to ${OUTPUT_PATH} (${(zodSchemaCode.length / 1024).toFixed(2)} KB)`);
};
