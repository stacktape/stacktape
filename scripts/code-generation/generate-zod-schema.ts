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

// Post-process: Make certain fields optional that have defaults in the implementation
// These fields are marked as required in JSON schema but actually have runtime defaults
const makeFieldsOptional = (code: string): string => {
  let modified = code;
  let replacements = 0;

  // Fields that should be optional (have runtime defaults)
  // Format: property name pattern -> make the field optional by adding .optional()
  const fieldsToMakeOptional = [
    // Script cwd - defaults to current working directory
    {
      pattern: /"cwd": z\.string\(\)\.describe\("#### Working Directory/g,
      replacement: '"cwd": z.string().optional().describe("#### Working Directory'
    },
    // Bastion instanceSize - has default (matches all instanceSize that are z.string)
    {
      pattern: /"instanceSize": z\.string\(\)\.describe\(/g,
      replacement: '"instanceSize": z.string().optional().describe('
    },
    // HTTP API integration payloadFormat - defaults to "1.0"
    {
      pattern: /"payloadFormat": z\.enum\(\["1\.0","2\.0"\]\)\.describe\(/g,
      replacement: '"payloadFormat": z.enum(["1.0","2.0"]).optional().describe('
    },
    // Function URL authMode - defaults to "NONE"
    {
      pattern: /"authMode": z\.enum\(\["AWS_IAM","NONE"\]\)\.describe\(/g,
      replacement: '"authMode": z.enum(["AWS_IAM","NONE"]).optional().describe('
    },
    // CORS allowedOrigins - defaults to ["*"]
    {
      pattern: /"allowedOrigins": z\.array\(z\.string\(\)\)\.describe\(/g,
      replacement: '"allowedOrigins": z.array(z.string()).optional().describe('
    },
    // IAM role statement Effect - defaults to "Allow"
    { pattern: /"Effect": z\.string\(\)\.describe\(/g, replacement: '"Effect": z.string().optional().describe(' },
    // Resources architecture - has default based on packaging
    {
      pattern: /"architecture": z\.enum\(\["arm64","x86_64"\]\)\.describe\(/g,
      replacement: '"architecture": z.enum(["arm64","x86_64"]).optional().describe('
    },
    // CDN cloudfrontPriceClass - has default
    {
      pattern: /"cloudfrontPriceClass": z\.enum\(\["PriceClass_100","PriceClass_200","PriceClass_All"\]\)\.describe\(/g,
      replacement:
        '"cloudfrontPriceClass": z.enum(["PriceClass_100","PriceClass_200","PriceClass_All"]).optional().describe('
    },
    // languageSpecificConfig outputModuleFormat - has default
    {
      pattern: /"outputModuleFormat": z\.enum\(\["cjs","esm"\]\)\.describe\(/g,
      replacement: '"outputModuleFormat": z.enum(["cjs","esm"]).optional().describe('
    }
  ];

  for (const { pattern, replacement } of fieldsToMakeOptional) {
    const before = modified;
    modified = modified.replace(pattern, replacement);
    if (modified !== before) {
      const count = (before.match(pattern) || []).length;
      replacements += count;
    }
  }

  logInfo(`Made ${replacements} fields optional (have runtime defaults)`);
  return modified;
};

// Post-process: Add coercion for numbers to accept strings like "512"
// This maintains backwards compatibility with YAML configs where numbers might be quoted
const addNumberCoercion = (code: string): string => {
  let modified = code;
  let count = 0;
  // Replace z.number() with z.coerce.number() - handles "512" -> 512
  modified = modified.replace(/z\.number\(\)/g, () => {
    count++;
    return 'z.coerce.number()';
  });
  logInfo(`Added coercion to ${count} number fields (accepts strings like "512")`);
  return modified;
};

// Post-process: Add coercion for booleans to accept strings like "true"/"false"
// Note: z.coerce.boolean() treats any truthy value as true, which might be too permissive
// But it's needed for backwards compatibility with string booleans in YAML
const addBooleanCoercion = (code: string): string => {
  let modified = code;
  let count = 0;
  modified = modified.replace(/z\.boolean\(\)/g, () => {
    count++;
    return 'z.coerce.boolean()';
  });
  logInfo(`Added coercion to ${count} boolean fields (accepts strings like "true")`);
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
  zodSchemaCode = fixRecordSyntax(zodSchemaCode);
  zodSchemaCode = fixDefaultValues(zodSchemaCode);
  zodSchemaCode = fixEnumNumericDefaults(zodSchemaCode);
  zodSchemaCode = fixArrayDefaults(zodSchemaCode);
  zodSchemaCode = fixObjectDefaults(zodSchemaCode);
  zodSchemaCode = makeFieldsOptional(zodSchemaCode);
  zodSchemaCode = addNumberCoercion(zodSchemaCode);
  zodSchemaCode = addBooleanCoercion(zodSchemaCode);

  logInfo('Writing Zod schema...');
  await writeFile(OUTPUT_PATH, zodSchemaCode);

  logSuccess(`Zod schema written to ${OUTPUT_PATH} (${(zodSchemaCode.length / 1024).toFixed(2)} KB)`);
};
