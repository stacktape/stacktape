import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { convertJsonSchemaToZod, generateZodSchema, shareRepeatedExpressions } from './generate-zod-schema';
import {
  compareEvaluations,
  evaluateCase,
  isolateSchemaModule,
  loadSchemaModule,
  zodPackageDirectory
} from './validator-differential';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-generate-zod-schema-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const moduleOf = (expression: string) =>
  `import { z } from "zod"\n\nexport const stacktapeConfigSchema = ${expression}\n`;
const COMMENT = '// Expressions used more than once are defined once, before their first use.\n';
// The coercions the generator inserts, exactly.
const NUMBER =
  'z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number())';
const BOOLEAN =
  'z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean())';

/** A schema module written into its own directory beside a link to the CLI's Zod, then imported. */
const load = async (name: string, code: string) => {
  const source = join(root, `${name}.ts`);
  await writeFile(source, code);
  return loadSchemaModule(
    await isolateSchemaModule({ source, directory: join(root, name), zodDirectory: zodPackageDirectory() })
  );
};

/** The module as written and with shared expressions, both imported. */
const loadBoth = async (name: string, expression: string) => {
  const code = moduleOf(expression);
  const shared = shareRepeatedExpressions(code);
  expect(shared.definitions).toBeGreaterThan(0);
  return { before: (await load(`${name}-unshared`, code)).schema, after: (await load(name, shared.code)).schema };
};

/** A service definition referenced from four places, with defaults and preprocessed values, and a recursive node. */
const JSON_SCHEMA = {
  type: 'object',
  properties: {
    api: { $ref: '#/definitions/Service' },
    worker: { $ref: '#/definitions/Service' },
    services: { type: 'object', additionalProperties: { $ref: '#/definitions/Service' } },
    either: { anyOf: [{ $ref: '#/definitions/Service' }, { type: 'string' }] },
    tree: { $ref: '#/definitions/Node' }
  },
  required: ['api'],
  additionalProperties: false,
  definitions: {
    Service: {
      type: 'object',
      properties: {
        port: { type: 'number', description: 'Port' },
        enabled: { type: 'boolean', default: false },
        mode: { type: 'string', enum: ['standard', 'fast'], default: 'standard' },
        timeout: { type: 'number', default: 10 },
        // Numbers: after an array of strings, the existing array-default fix can drop a later string default.
        tags: { type: 'array', items: { type: 'number' } }
      },
      required: ['port'],
      additionalProperties: false
    },
    Node: {
      type: 'object',
      properties: { name: { type: 'string' }, child: { $ref: '#/definitions/Node' } },
      additionalProperties: false
    }
  }
};

describe('shareRepeatedExpressions', () => {
  test('defines an expression used more than once before its uses and keeps single uses inline', () => {
    const input = moduleOf(
      'z.object({ "a": z.object({ "x": z.string().optional() }).strict(), "b": z.object({ "x": z.string().optional() }).strict().optional(), "c": z.array(z.number()) }).strict()'
    );
    expect(shareRepeatedExpressions(input)).toEqual({
      code:
        'import { z } from "zod"\n\n' +
        COMMENT +
        'const __stacktapeSharedZod0 = z.object({ "x": z.string().optional() }).strict()\n' +
        'export const stacktapeConfigSchema = z.object({ "a": __stacktapeSharedZod0, "b": __stacktapeSharedZod0.optional(), "c": z.array(z.number()) }).strict()\n',
      definitions: 1,
      distinctExpressions: 9,
      occurrences: 13
    });
  });

  test('keeps the wrappers of each use in their order and shares only identical chains', () => {
    const { code } = shareRepeatedExpressions(
      moduleOf(
        'z.object({ "a": z.number().optional().describe("n").default(5), "b": z.number().default(5).optional(), "c": z.number().optional().describe("n").default(5), "d": z.number() })'
      )
    );
    expect(code).toBe(
      'import { z } from "zod"\n\n' +
        COMMENT +
        'const __stacktapeSharedZod0 = z.number()\n' +
        'const __stacktapeSharedZod1 = __stacktapeSharedZod0.optional().describe("n").default(5)\n' +
        'export const stacktapeConfigSchema = z.object({ "a": __stacktapeSharedZod1, "b": __stacktapeSharedZod0.default(5).optional(), "c": __stacktapeSharedZod1, "d": __stacktapeSharedZod0 })\n'
    );
  });

  test('accepts the generated prefix inside a string, and the coercions the generator inserts', () => {
    const input = moduleOf(
      `z.object({ "text": z.string().describe("z.string() and \\"__stacktapeSharedZod0\\" in a description"), "n": ${NUMBER}, "b": ${BOOLEAN} })`
    );
    expect(shareRepeatedExpressions(input)).toMatchObject({ code: input, definitions: 0 });
  });

  test('keeps an array default at every use, and shares what it wraps', () => {
    const { code } = shareRepeatedExpressions(
      moduleOf(
        'z.object({ "a": z.array(z.string()).optional().default(["*"]), "b": z.array(z.string()).optional().default(["*"]) })'
      )
    );
    expect(code).toBe(
      'import { z } from "zod"\n\n' +
        COMMENT +
        'const __stacktapeSharedZod0 = z.array(z.string()).optional()\n' +
        'export const stacktapeConfigSchema = z.object({ "a": __stacktapeSharedZod0.default(["*"]), "b": __stacktapeSharedZod0.default(["*"]) })\n'
    );
  });

  test.each([
    ['an unknown constructor', 'z.date()', 'z.date is not a constructor the generator emits'],
    ['a lazy schema', 'z.lazy(() => z.string())', 'z.lazy is not a constructor the generator emits'],
    ['an inherited property as a constructor', 'z.constructor()', 'z.constructor is not a constructor'],
    ['a transform', 'z.string().transform((val) => val)', '.transform is not a method the generator emits'],
    ['a refinement', 'z.string().refine((val) => true)', '.refine is not a method the generator emits'],
    ['metadata', 'z.string().meta({ "a": 1 })', '.meta is not a method the generator emits'],
    ['a registration', 'z.string().register(z.globalRegistry, {})', '.register is not a method the generator emits'],
    [
      'a stateful preprocess callback',
      'z.preprocess((val) => counter++, z.number())',
      "z.preprocess expects one of the generator's two coercion callbacks"
    ],
    [
      'a generator callback with more code',
      `${NUMBER.slice(0, NUMBER.indexOf(', z.number()'))} + 1, z.number())`,
      'z.preprocess expects ","'
    ],
    [
      'a generator callback feeding another schema',
      NUMBER.replace(', z.number())', ', z.string())'),
      'z.preprocess expects z.number() after its callback'
    ],
    ['a mutable default []', 'z.array(z.string()).default([])', '.default expects at least 1 item'],
    ['a mutable default {}', 'z.object({}).default({})', '.default expects a string, a finite number or a boolean'],
    ['a list default of numbers', 'z.array(z.number()).default([1])', '.default expects a double-quoted string'],
    ['a variable description', 'z.string().describe(description)', '.describe expects a double-quoted string'],
    ['a variable limit', 'z.string().max(limit)', '.max expects a finite number'],
    ['an infinite limit', 'z.string().max(1e999)', '.max expects a finite number'],
    [
      'a single-quoted default',
      "z.string().default('a, b')",
      '.default expects a string, a finite number or a boolean'
    ],
    [
      'a string that is not JSON',
      'z.string().describe("\\x41")',
      '.describe has a string that is not a JSON string literal'
    ],
    ['an unterminated string', 'z.string().describe("open)', '.describe has an unterminated string'],
    ['an argument too many', 'z.string("x")', 'z.string expects ")"'],
    ['an argument too few', 'z.array()', 'z.array expects a Zod schema'],
    ['a record key other than a string', 'z.record(z.number(), z.any())', 'z.record expects the key schema z.string()'],
    ['a union of one option', 'z.union([z.string()])', 'z.union expects at least 2 items'],
    ['an empty enum', 'z.enum([])', 'z.enum expects at least 1 item'],
    ['a null literal', 'z.literal(null)', 'z.literal expects a string, a finite number or a boolean']
  ])('refuses %s, naming the call and offset', (_label, expression, message) => {
    expect(() => shareRepeatedExpressions(moduleOf(expression))).toThrow(message);
    expect(() => shareRepeatedExpressions(moduleOf(expression))).toThrow(/at offset \d+/);
  });

  test('refuses code around the schema that the converter does not write', () => {
    expect(() => shareRepeatedExpressions(`${moduleOf('z.string()')}export const other = 1\n`)).toThrow(
      'unexpected code after the schema'
    );
    expect(() => shareRepeatedExpressions(`${moduleOf('z.string()')}${moduleOf('z.string()')}`)).toThrow(
      'unexpected code after the schema'
    );
    expect(() =>
      shareRepeatedExpressions(
        'import { z } from "zod"\n\nconst other = 1\nexport const stacktapeConfigSchema = z.string()\n'
      )
    ).toThrow('expected the module to start with');
  });

  test('refuses a generated name outside strings, before the schema or inside it', () => {
    expect(() =>
      shareRepeatedExpressions(
        'import { z } from "zod"\n\nconst __stacktapeSharedZod7 = z.string()\nexport const stacktapeConfigSchema = z.string()\n'
      )
    ).toThrow('it already contains the generated name __stacktapeSharedZod7 at offset 31');
    expect(() => shareRepeatedExpressions(moduleOf('z.object({ "a": __stacktapeSharedZod0 })'))).toThrow(
      'it already contains the generated name __stacktapeSharedZod0'
    );
    expect(() => shareRepeatedExpressions(moduleOf("z.string().describe('__stacktapeSharedZod1')"))).toThrow(
      'it already contains the generated name __stacktapeSharedZod1'
    );
  });
});

describe('the generated schema with shared expressions', () => {
  test("gives each use of a shared base its own description and wrappers, sharing the base's children", async () => {
    const base = `z.object({ "port": ${NUMBER} }).strict()`;
    const { before, after } = await loadBoth(
      'metadata',
      `z.object({ "a": ${base}.describe("first"), "b": ${base}.describe("second"), "c": ${base}, "d": ${base}.optional().describe("fourth") })`
    );
    for (const schema of [before, after]) {
      expect(schema.shape.a.description).toBe('first');
      expect(schema.shape.b.description).toBe('second');
      expect(schema.shape.c.description).toBeUndefined();
      expect(schema.shape.d.description).toBe('fourth');
      expect(schema.shape.c.safeParse(undefined).success).toBe(false);
      expect(schema.shape.d.safeParse(undefined).success).toBe(true);
    }
    // What sharing changes: every use now holds the same child instances.
    expect(before.shape.a.shape.port).not.toBe(before.shape.b.shape.port);
    expect(after.shape.a.shape.port).toBe(after.shape.b.shape.port);
  });

  test("applies each use's defaults and coercions", async () => {
    const { before, after } = await loadBoth(
      'defaults',
      `z.object({ "x": ${NUMBER}.optional().default(5), "y": ${NUMBER}.optional().default(5), "z": ${NUMBER}.optional().default(6), "flag": ${BOOLEAN}.optional().default(false), "tags": z.array(z.string()).optional().default(["*"]), "more": z.array(z.string()).optional().default(["*"]) })`
    );
    for (const schema of [before, after]) {
      const parsed = schema.parse({});
      expect(parsed).toEqual({ x: 5, y: 5, z: 6, flag: false, tags: ['*'], more: ['*'] });
      expect(parsed.tags).not.toBe(parsed.more);
      expect(schema.parse({ x: '7', flag: 'true' })).toMatchObject({ x: 7, y: 5, z: 6, flag: true });
      expect(schema.safeParse({ flag: 'TRUE' }).success).toBe(false);
    }
    for (const config of [{}, { x: '7', flag: 'true' }, { flag: 'TRUE' }, { tags: 'x' }]) {
      expect(compareEvaluations(evaluateCase(before, config, null), evaluateCase(after, config, null))).toEqual({
        kinds: []
      });
    }
  });

  test('reports issues at the path of each use of a shared schema', async () => {
    const port = `z.object({ "port": ${NUMBER} }).strict()`;
    const { before, after } = await loadBoth(
      'paths',
      `z.object({ "rec": z.record(z.string(), ${port}), "arr": z.array(${port}), "direct": ${port}, "pair": z.tuple([${port}, ${port}]) }).strict()`
    );
    const config = {
      rec: { k: { port: 'x' } },
      arr: [{ port: 1 }, { port: 'y' }],
      direct: { port: 'z' },
      pair: [{ port: 2 }, { port: 3, extra: 1 }]
    };
    const issues = after.safeParse(config).error.issues.map(({ code, path }: any) => `${code} at ${path.join('.')}`);
    expect(issues).toEqual([
      'invalid_type at rec.k.port',
      'invalid_type at arr.1.port',
      'invalid_type at direct.port',
      'unrecognized_keys at pair.1'
    ]);
    expect(compareEvaluations(evaluateCase(before, config, null), evaluateCase(after, config, null))).toEqual({
      kinds: []
    });
  });

  test('accepts, parses and reports exactly what the unshared schema does', async () => {
    const converted = await convertJsonSchemaToZod(JSON_SCHEMA);
    const shared = shareRepeatedExpressions(converted);
    expect(shared.definitions).toBeGreaterThan(0);
    const before = await load('unshared', converted);
    const after = await load('shared', shared.code);
    const { validateConfigObject } = await import('./validate-config-string');
    for (const config of [
      {},
      { api: { port: 80 } },
      { api: { port: '8080', enabled: 'true', timeout: '30' } },
      { api: { port: 80, enabled: 'TRUE' } },
      { api: { port: 80, mode: 'Fast' } },
      { api: { port: 80, unknown: 1 } },
      { api: { port: 80 }, worker: { port: 'x' } },
      { api: { port: 80 }, services: { a: { port: 1 }, b: { port: 2, tags: ['x', 1] } } },
      { api: { port: 80 }, either: 'text' },
      { api: { port: 80 }, either: { port: 3 } },
      { api: { port: 80 }, either: 5 },
      { api: { port: 80 }, tree: { name: 'a', child: { anything: [1, 2] } } },
      { api: { port: 80 }, tree: { name: 1 } }
    ]) {
      const comparison = compareEvaluations(
        evaluateCase(before.schema, config, validateConfigObject),
        evaluateCase(after.schema, config, validateConfigObject)
      );
      expect(comparison).toEqual({ kinds: [] });
    }
    // Defaults and preprocessing still apply per use, and the recursive reference still accepts anything.
    expect(after.schema.parse({ api: { port: '8080', enabled: 'true' }, worker: { port: 1, timeout: '5' } })).toEqual({
      api: { port: 8080, enabled: true, mode: 'standard', timeout: 10 },
      worker: { port: 1, enabled: false, mode: 'standard', timeout: 5 }
    });
    expect(after.schema.safeParse({ api: { port: 80 }, tree: { child: { child: 'anything' } } }).success).toBe(true);
  });

  test('is written identically every time, with every definition before its first use', async () => {
    const first = join(root, 'first', 'validate-config-zod.ts');
    const second = join(root, 'second', 'validate-config-zod.ts');
    await generateZodSchema(JSON_SCHEMA, first);
    await generateZodSchema(JSON_SCHEMA, second);
    const written = await readFile(first, 'utf8');
    expect(await readFile(second, 'utf8')).toBe(written);
    expect(written).toStartWith(`// @ts-nocheck\nimport { z } from "zod"\n\n${COMMENT}const __stacktapeSharedZod0 = `);
    expect(written).toContain('export const stacktapeConfigSchema: z.ZodType<Record<string, unknown>> = ');
    const defined = new Set<string>();
    for (const line of written.split('\n')) {
      for (const [name] of line.matchAll(/__stacktapeSharedZod\d+/g)) {
        if (!defined.has(name)) expect(line).toStartWith(`const ${name} = `);
      }
      const definition = /^const (__stacktapeSharedZod\d+) = /.exec(line);
      if (definition) defined.add(definition[1]!);
    }
    const loaded = await load('written', written);
    expect(loaded.schema.parse({ api: { port: 80 } })).toEqual({
      api: { port: 80, enabled: false, mode: 'standard', timeout: 10 }
    });
  });
});
