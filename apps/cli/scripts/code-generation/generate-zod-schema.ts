import { jsonSchemaToZod } from 'json-schema-to-zod';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { ensureDir, writeFile } from 'fs-extra';
import { dirname, join } from 'node:path';
import { logInfo, logSuccess } from '@scripts/support/logging';

export const ZOD_SCHEMA_OUTPUT_PATH = join(process.cwd(), '@generated/schemas/validate-config-zod.ts');

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
  let emptySchemaReplacements = 0;

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

  // Empty JSON schema objects (`additionalProperties: {}`) mean "any value allowed".
  // json-schema-to-zod currently emits `z.record(z.never())` for those, which becomes
  // `z.record(z.string(), z.never())` after the Zod 4 rewrite above and incorrectly rejects all values.
  modified = modified.replace(/z\.record\(z\.string\(\), z\.never\(\)\)/g, () => {
    emptySchemaReplacements++;
    return 'z.record(z.string(), z.any())';
  });

  logInfo(`Fixed ${totalReplacements} z.record() calls for Zod 4 syntax`);
  logInfo(`Fixed ${emptySchemaReplacements} empty-schema z.record() calls`);
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

// Post-process: define each repeated expression once.
// json-schema-to-zod inlines a definition wherever it is referenced, so the same expressions (CloudFormation intrinsic
// functions, shared property types) occur hundreds of thousands of times. A definition is evaluated once, and every use
// then shares that schema instance. This is equivalent only when evaluating the expression has no effect beyond building
// the schema and registering its description, and while the validator's consumers (the CLI wrapper and the docs example
// walker) parse and inspect schemas without mutating them or depending on their identity. So the pass reads exactly what
// the converter and the repairs above emit, and generation fails on anything else. It accepts the known constructors and
// methods with literal or schema arguments, the two coercion callbacks inserted above, and primitive defaults. An array
// default stays inline at every use, and so does everything that contains it. Each call of a method chain is its own
// expression, so a shared object keeps each use's wrappers in order. Coercions, union order, records and the `z.any()`
// the converter emits at recursive references stay as they are.
const SHARED_NAME_PREFIX = '__stacktapeSharedZod';
const IMPORT_HEAD = 'import { z } from "zod"\n\n';
const SCHEMA_DECLARATION = 'export const stacktapeConfigSchema = ';
const SHARED_DEFINITIONS_COMMENT = '// Expressions used more than once are defined once, before their first use.';
// The callbacks `addNumberCoercion` and `addBooleanCoercion` insert, and the schema each one feeds.
const PREPROCESS_CALLS = [
  ['(val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val', 'z.number()'],
  ['(val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val', 'z.boolean()']
] as const;

/** An argument of a call the converter emits. */
type Argument =
  | 'schema' // a Zod expression
  | 'string-schema' // exactly `z.string()`, a record key
  | 'shape' // `{ "key": <schema>, ... }`
  | 'options' // `[<schema>, <schema>, ...]`, at least two
  | 'items' // `[<schema>, ...]`, at least one
  | 'strings' // `["a", ...]`, at least one
  | 'string'
  | 'finite-number'
  | 'literal' // a string, finite number or boolean
  | 'default' // a literal, or a list of strings that is never shared
  | 'coercion'; // one of PREPROCESS_CALLS: the callback, then its schema

const CONSTRUCTORS: Record<string, Argument[]> = {
  any: [],
  array: ['schema'],
  boolean: [],
  enum: ['strings'],
  literal: ['literal'],
  number: [],
  object: ['shape'],
  preprocess: ['coercion'],
  record: ['string-schema', 'schema'],
  string: [],
  tuple: ['items'],
  union: ['options']
};
const METHODS: Record<string, Argument[]> = {
  catchall: ['schema'],
  default: ['default'],
  describe: ['string'],
  max: ['finite-number'],
  optional: [],
  strict: []
};

/**
 * A `z.<name>(...)` call or one method call of its chain, with the expressions in its arguments. `pinned` marks a call
 * whose own argument is mutable, so it must be evaluated at every use.
 */
type Expression = { start: number; end: number; children: Expression[]; pinned: boolean };

/**
 * Reads the chain at `start` and checks each call against the grammar above: its name, argument count and argument
 * shapes. Anything else fails with the call and offset.
 */
const parseZodExpression = (code: string, start: number): Expression => {
  let position = start;
  const fail = (message: string, at = position): never => {
    const context = JSON.stringify(code.slice(at, at + 60));
    throw new Error(`Cannot share the generated Zod schema's expressions: ${message} at offset ${at}: ${context}`);
  };
  const skipWhitespace = () => {
    while (position < code.length && ' \n\r\t'.includes(code[position]!)) position++;
  };
  const next = () => {
    skipWhitespace();
    return code[position];
  };
  const expect = (token: string, call: string) => {
    skipWhitespace();
    if (!code.startsWith(token, position)) fail(`${call} expects ${JSON.stringify(token)}`);
    position += token.length;
  };
  const identifier = /[A-Za-z_$][\w$]*/y;
  const readIdentifier = (call: string) => {
    identifier.lastIndex = position;
    const name = identifier.exec(code)?.[0];
    if (!name) return fail(`${call} expects a name`);
    position += name.length;
    return name;
  };
  const readString = (call: string) => {
    skipWhitespace();
    const literalStart = position;
    if (code[position] !== '"') fail(`${call} expects a double-quoted string`);
    position++;
    for (;;) {
      const character = code[position];
      if (character === undefined) fail(`${call} has an unterminated string`, literalStart);
      position += character === '\\' ? 2 : 1;
      if (character === '"') break;
    }
    try {
      JSON.parse(code.slice(literalStart, position));
    } catch {
      fail(`${call} has a string that is not a JSON string literal`, literalStart);
    }
  };
  const number = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?(?![\w$.])/y;
  const readNumber = (call: string) => {
    skipWhitespace();
    number.lastIndex = position;
    const literal = number.exec(code)?.[0];
    if (!literal || !Number.isFinite(Number(literal))) fail(`${call} expects a finite number`);
    position += literal!.length;
  };
  const readLiteral = (call: string) => {
    const character = next();
    if (character === '"') return readString(call);
    for (const keyword of ['true', 'false']) {
      if (code.startsWith(keyword, position) && !/[\w$]/.test(code[position + keyword.length] ?? '')) {
        position += keyword.length;
        return;
      }
    }
    if (character === '-' || /\d/.test(character ?? '')) return readNumber(call);
    fail(`${call} expects a string, a finite number or a boolean`);
  };
  const readList = (open: string, close: string, call: string, minimum: number, readItem: () => void) => {
    expect(open, call);
    let count = 0;
    if (next() === close) position++;
    else {
      for (;;) {
        readItem();
        count++;
        if (next() === close) {
          position++;
          break;
        }
        expect(',', call);
      }
    }
    if (count < minimum) fail(`${call} expects at least ${minimum} item${minimum === 1 ? '' : 's'}`);
  };
  const readSchema = (call: string, children: Expression[]) => {
    skipWhitespace();
    if (!code.startsWith('z.', position)) fail(`${call} expects a Zod schema`);
    const schema = readChain();
    children.push(schema);
    return schema;
  };
  /** Reads one argument; returns whether it is mutable. */
  const readArgument = (argument: Argument, call: string, children: Expression[]): boolean => {
    switch (argument) {
      case 'schema':
        readSchema(call, children);
        return false;
      case 'string-schema': {
        const key = readSchema(call, children);
        if (code.slice(key.start, key.end) !== 'z.string()')
          fail(`${call} expects the key schema z.string()`, key.start);
        return false;
      }
      case 'shape':
        readList('{', '}', call, 0, () => {
          readString(call);
          expect(':', call);
          readSchema(call, children);
        });
        return false;
      case 'options':
      case 'items':
        readList('[', ']', call, argument === 'options' ? 2 : 1, () => readSchema(call, children));
        return false;
      case 'strings':
        readList('[', ']', call, 1, () => readString(call));
        return false;
      case 'string':
        readString(call);
        return false;
      case 'finite-number':
        readNumber(call);
        return false;
      case 'literal':
        readLiteral(call);
        return false;
      case 'default':
        if (next() !== '[') {
          readLiteral(call);
          return false;
        }
        readList('[', ']', call, 1, () => readString(call));
        return true;
      case 'coercion': {
        skipWhitespace();
        const coercion = PREPROCESS_CALLS.find(([callback]) => code.startsWith(callback, position));
        if (!coercion) return fail(`${call} expects one of the generator's two coercion callbacks`);
        position += coercion[0].length;
        expect(',', call);
        const schema = readSchema(call, children);
        if (code.slice(schema.start, schema.end) !== coercion[1]) {
          fail(`${call} expects ${coercion[1]} after its callback`, schema.start);
        }
        return false;
      }
    }
  };
  const readCall = (call: string, signature: Argument[], children: Expression[]) => {
    expect('(', call);
    let pinned = false;
    signature.forEach((argument, index) => {
      if (index > 0) expect(',', call);
      pinned = readArgument(argument, call, children) || pinned;
    });
    expect(')', call);
    return pinned;
  };
  const readChain = (): Expression => {
    skipWhitespace();
    const chainStart = position;
    expect('z.', 'a schema');
    const nameStart = position;
    const name = readIdentifier('z.');
    if (!Object.hasOwn(CONSTRUCTORS, name)) fail(`z.${name} is not a constructor the generator emits`, nameStart);
    const children: Expression[] = [];
    const pinned = readCall(`z.${name}`, CONSTRUCTORS[name]!, children);
    let expression: Expression = { start: chainStart, end: position, children, pinned };
    for (;;) {
      const afterCall = position;
      if (next() !== '.') {
        position = afterCall;
        return expression;
      }
      position++;
      const methodStart = position;
      const method = readIdentifier('a method call');
      if (!Object.hasOwn(METHODS, method)) fail(`.${method} is not a method the generator emits`, methodStart);
      const methodChildren: Expression[] = [];
      const methodPinned = readCall(`.${method}`, METHODS[method]!, methodChildren);
      expression = {
        start: chainStart,
        end: position,
        children: [expression, ...methodChildren],
        pinned: methodPinned
      };
    }
  };
  return readChain();
};

const isNameStart = (code: number) =>
  (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95 || code === 36;
const isNamePart = (code: number) => isNameStart(code) || (code >= 48 && code <= 57);

/**
 * Refuses code that already contains a name with the generated prefix outside double-quoted strings: a definition could
 * otherwise capture or shadow it. The prefix inside a string, such as a description, is fine.
 */
const refuseGeneratedNames = (code: string) => {
  let position = 0;
  while (position < code.length) {
    const character = code.charCodeAt(position);
    if (character === 34) {
      position++;
      while (position < code.length && code.charCodeAt(position) !== 34)
        position += code.charCodeAt(position) === 92 ? 2 : 1;
      position++;
    } else if (isNameStart(character) && !(position > 0 && isNamePart(code.charCodeAt(position - 1)))) {
      const nameStart = position;
      while (position < code.length && isNamePart(code.charCodeAt(position))) position++;
      const name = code.slice(nameStart, position);
      if (name.startsWith(SHARED_NAME_PREFIX)) {
        throw new Error(
          `Cannot share the generated Zod schema's expressions: it already contains the generated name ${name} at offset ${nameStart}.`
        );
      }
    } else position++;
  }
};

/** `text` with every shared name outside string literals replaced by the expanded text of its definition. */
const expandSharedNames = (text: string, definitionOf: (name: string) => string) => {
  const name = new RegExp(`${SHARED_NAME_PREFIX}\\d+`, 'y');
  const isNameCharacter = (character: string | undefined) => character !== undefined && /[\w$]/.test(character);
  let expanded = '';
  let copied = 0;
  let position = 0;
  while (position < text.length) {
    if (text[position] === '"') {
      position++;
      while (position < text.length && text[position] !== '"') position += text[position] === '\\' ? 2 : 1;
      position++;
      continue;
    }
    if (text.startsWith(SHARED_NAME_PREFIX, position) && !isNameCharacter(text[position - 1])) {
      name.lastIndex = position;
      const match = name.exec(text);
      if (match && !isNameCharacter(text[position + match[0].length])) {
        expanded += text.slice(copied, position) + definitionOf(match[0]);
        position += match[0].length;
        copied = position;
        continue;
      }
    }
    position++;
  }
  return expanded + text.slice(copied);
};

/**
 * Defines every expression the schema uses more than once as a `const`, children before parents, and references it
 * where it occurred. Names follow the order in which definitions complete, left to right, so equal input gives equal
 * output. The emitted text is checked to expand back to exactly the input expression: definitions only factor text.
 * That check is syntactic; the grammar is what makes evaluating a factored expression once equivalent.
 */
export const shareRepeatedExpressions = (code: string) => {
  refuseGeneratedNames(code);
  if (code.includes('\u0000')) throw new Error('The generated Zod schema contains a NUL character.');
  if (!code.startsWith(`${IMPORT_HEAD}${SCHEMA_DECLARATION}`)) {
    throw new Error(
      `Cannot share the generated Zod schema's expressions: expected the module to start with ${JSON.stringify(IMPORT_HEAD + SCHEMA_DECLARATION)}.`
    );
  }
  const root = parseZodExpression(code, IMPORT_HEAD.length + SCHEMA_DECLARATION.length);
  if (code.slice(root.end).trim() !== '') {
    throw new Error(
      `Cannot share the generated Zod schema's expressions: unexpected code after the schema at offset ${root.end}.`
    );
  }

  // Equal text is one expression: its key is its text with each child replaced by the child's number. Children are
  // numbered before their parents, so the root has the highest number.
  const keys: string[] = [];
  const childrenOf: number[][] = [];
  const shareable: boolean[] = [];
  const numbers = new Map<string, number>();
  let occurrences = 0;
  const intern = (expression: Expression): number => {
    occurrences++;
    const children = expression.children.map(intern);
    let key = '';
    let cursor = expression.start;
    expression.children.forEach((child, index) => {
      key += `${code.slice(cursor, child.start)}\u0000${children[index]}\u0000`;
      cursor = child.end;
    });
    key += code.slice(cursor, expression.end);
    let number = numbers.get(key);
    if (number === undefined) {
      number = keys.length;
      numbers.set(key, number);
      keys.push(key);
      childrenOf.push(children);
      shareable.push(!expression.pinned && children.every((child) => shareable[child]));
    }
    return number;
  };
  const rootNumber = intern(root);

  // How often each expression is written, parents first. A shared expression is written once as a definition; any
  // other expression is written wherever a written parent uses it.
  const references = Array.from({ length: keys.length }, () => 0);
  const shared = Array.from({ length: keys.length }, () => false);
  references[rootNumber] = 1;
  for (let number = rootNumber; number >= 0; number--) {
    shared[number] = number !== rootNumber && shareable[number]! && references[number]! > 1;
    const written = shared[number] ? 1 : references[number]!;
    for (const child of childrenOf[number]!) references[child]! += written;
  }

  const names = new Map<number, string>();
  const texts = new Map<number, string>();
  const definitions = new Map<string, string>();
  const write = (number: number): string => {
    const written = texts.get(number);
    if (written !== undefined) return written;
    const parts = keys[number]!.split('\u0000');
    let text = '';
    parts.forEach((part, index) => {
      if (index % 2 === 0) text += part;
      else {
        const childText = write(Number(part));
        text += names.get(Number(part)) ?? childText;
      }
    });
    texts.set(number, text);
    if (shared[number]) {
      const name = `${SHARED_NAME_PREFIX}${names.size}`;
      names.set(number, name);
      definitions.set(name, text);
    }
    return text;
  };
  const rootText = write(rootNumber);

  const expansions = new Map<string, string>();
  const expandDefinition = (name: string): string => {
    const cached = expansions.get(name);
    if (cached !== undefined) return cached;
    const expansion = expandSharedNames(definitions.get(name)!, expandDefinition);
    expansions.set(name, expansion);
    return expansion;
  };
  if (expandSharedNames(rootText, expandDefinition) !== code.slice(root.start, root.end)) {
    throw new Error('Sharing repeated expressions changed the generated Zod schema text.');
  }

  const header = definitions.size
    ? `${SHARED_DEFINITIONS_COMMENT}\n${[...definitions].map(([name, text]) => `const ${name} = ${text}\n`).join('')}`
    : '';
  return {
    code: `${IMPORT_HEAD}${header}${SCHEMA_DECLARATION}${rootText}${code.slice(root.end)}`,
    definitions: definitions.size,
    distinctExpressions: keys.length,
    occurrences
  };
};

/**
 * The generated schema module before sharing and formatting: optional markers, dereferencing, conversion and every
 * post-processing fix up to number and boolean coercion.
 */
export const convertJsonSchemaToZod = async (jsonSchema: object): Promise<string> => {
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
    // Inferring and exporting the type of this 100k-line expression makes every consumer ask
    // TypeScript to materialize an enormous recursive Zod type. The CLI consumes only safeParse;
    // authored config types come from @stacktape/config-authoring.
    type: false
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
  return zodSchemaCode;
};

export const generateZodSchema = async (jsonSchema: object, outputPath = ZOD_SCHEMA_OUTPUT_PATH): Promise<void> => {
  const shared = shareRepeatedExpressions(await convertJsonSchemaToZod(jsonSchema));
  logInfo(
    `Defined ${shared.definitions} repeated expressions once (${shared.distinctExpressions} distinct of ${shared.occurrences})`
  );
  let zodSchemaCode = shared.code.replace(
    'export const stacktapeConfigSchema =',
    'export const stacktapeConfigSchema: z.ZodType<Record<string, unknown>> ='
  );
  // The generated expression is exercised as executable validation code. Asking TypeScript to
  // semantically walk all 100k generated lines consumes multiple gigabytes without checking any
  // authored decision; the explicit public type keeps consumers checked while parsing still
  // catches malformed generated TypeScript.
  zodSchemaCode = `// @ts-nocheck\n${zodSchemaCode}`;

  logInfo('Formatting Zod schema...');
  // Add line breaks for readability without full prettier (too slow on large files)
  // This makes TypeScript errors easier to locate by putting each property on its own line
  let formattedCode = zodSchemaCode
    .replace(/^(import .+;)$/gm, '$1\n') // Line break after imports
    .replace(new RegExp(`"(\\w+)":\\s*(z\\.|${SHARED_NAME_PREFIX}\\d)`, 'g'), '\n"$1": $2') // Line break before each property definition
    .replace(/\.strict\(\)\.optional\(\)/g, '.strict().optional()') // Keep these together
    .replace(/\.strict\(\)/g, '.strict()\n'); // Line break after .strict()

  // Add proper indentation (simple 2-space indent for readability)
  let depth = 0;
  const lines = formattedCode.split('\n');
  formattedCode = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      // Decrease depth for closing braces/brackets at start of line
      const closingAtStart = (trimmed.match(/^[\}\]]/g) || []).length;
      depth = Math.max(0, depth - closingAtStart);

      const indent = '  '.repeat(depth);
      const result = indent + trimmed;

      // Increase depth for opening braces/brackets
      const openCount = (trimmed.match(/[\{\[]/g) || []).length;
      const closeCount = (trimmed.match(/[\}\]]/g) || []).length;
      depth = Math.max(0, depth + openCount - closeCount + closingAtStart);

      return result;
    })
    .join('\n')
    .trimEnd()
    .concat('\n');

  logInfo('Writing Zod schema...');
  await ensureDir(dirname(outputPath));
  await writeFile(outputPath, formattedCode);

  logSuccess(`Zod schema written to ${outputPath} (${(formattedCode.length / 1024).toFixed(2)} KB)`);
};
