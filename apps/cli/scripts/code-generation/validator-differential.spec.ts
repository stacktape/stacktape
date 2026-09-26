import type { Walker } from './validator-differential';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import {
  compareCorpus,
  compareEvaluations,
  effectsOf,
  evaluateCase,
  fingerprint,
  firstDifference,
  independenceProblems,
  isolateSchemaModule,
  loadSchemaModule,
  normalizeIssue,
  zodPackageDirectory
} from './validator-differential';
import {
  decodeCorpus,
  encodeCorpus,
  instantiate,
  minimalBudget,
  richBudget,
  seededRandom
} from './validator-differential-corpus';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-validator-differential-spec-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

// The preprocessing the generator emits: numbers from any string, booleans only from exact lowercase strings.
const toNumber = (value: unknown) =>
  typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : value;
const toBoolean = (value: unknown) =>
  typeof value === 'boolean' ? value : value === 'true' ? true : value === 'false' ? false : value;
const toBooleanIgnoringCase = (value: unknown) => toBoolean(typeof value === 'string' ? value.toLowerCase() : value);

/** A generation of a small schema shaped like the generated one: typed resources with defaults and preprocessing. */
const generation = ({ timeout = 10, boolean = toBoolean, architectures = ['arm64', 'x86_64'] } = {}) =>
  z
    .object({
      resources: z.record(
        z.string(),
        z.union([
          z
            .object({
              type: z.literal('function'),
              properties: z
                .object({
                  timeout: z.preprocess(toNumber, z.number()).optional().default(timeout),
                  joinDefaultVpc: z.preprocess(boolean, z.boolean()).optional(),
                  architecture: z.enum(architectures as [string, ...string[]]).optional()
                })
                .strict()
            })
            .strict(),
          z
            .object({
              type: z.literal('queue'),
              properties: z.object({ fifo: z.preprocess(toBoolean, z.boolean()).default(false) }).strict()
            })
            .strict()
        ])
      )
    })
    .strict();

const fn = (properties: Record<string, unknown>) => ({ resources: { worker: { type: 'function', properties } } });

const compare = (oracle: z.ZodType, current: z.ZodType, config: unknown, walk: Walker | null = null) =>
  compareEvaluations(evaluateCase(oracle, config, walk), evaluateCase(current, config, walk));

describe('fingerprint', () => {
  test('ignores key order unless asked, and keeps apart the values JSON would merge', () => {
    expect(fingerprint({ b: 1, a: 2 })).toBe(fingerprint({ a: 2, b: 1 }));
    expect(fingerprint({ b: 1, a: 2 }, true)).not.toBe(fingerprint({ a: 2, b: 1 }, true));
    const hole: unknown[] = [];
    hole.length = 1;
    const values = [
      {},
      { a: undefined },
      { a: null },
      { a: Number.NaN },
      { a: 0 },
      { a: -0 },
      { a: '0' },
      { a: false },
      { a: Number.POSITIVE_INFINITY },
      [],
      [undefined],
      hole,
      Object.create(null)
    ];
    expect(new Set(values.map((value) => fingerprint(value))).size).toBe(values.length);
  });
});

describe('firstDifference', () => {
  test('names the first differing path and shows configuration strings only by length and hash', () => {
    expect(firstDifference({ a: { b: [1, 2] } }, { a: { b: [1, 3] } })).toEqual({
      path: 'a.b[1]',
      oracle: '2',
      current: '3'
    });
    expect(firstDifference({ 'with.dot': 1 }, { 'with.dot': 1, secret: 'value' })).toEqual({
      path: 'secret',
      oracle: 'absent',
      current: expect.stringMatching(/^string\(5, sha256 [\da-f]{8}\)$/)
    });
    expect(firstDifference({ 'with.dot': 'x' }, { 'with.dot': 'y' }, { showStrings: true })).toEqual({
      path: '["with.dot"]',
      oracle: '"x"',
      current: '"y"'
    });
    expect(firstDifference({ a: [1, { b: undefined }] }, { a: [1, { b: undefined }] })).toBeUndefined();
    expect(firstDifference({ a: undefined }, {})).toEqual({ path: 'a', oracle: 'undefined', current: 'absent' });
  });
});

describe('normalizeIssue', () => {
  test('drops the rejected input and keeps every union branch in order', () => {
    expect(
      normalizeIssue({
        code: 'invalid_union',
        path: ['resources', 'worker'],
        message: 'Invalid input',
        input: { password: 'secret' },
        errors: [
          [{ code: 'invalid_type', path: [], message: 'Invalid input', expected: 'object', input: 1 }],
          [{ code: 'invalid_value', path: ['type'], message: 'Invalid input', values: ['queue'] }]
        ]
      })
    ).toEqual({
      code: 'invalid_union',
      path: ['resources', 'worker'],
      message: 'Invalid input',
      errors: [
        [{ code: 'invalid_type', path: [], message: 'Invalid input', expected: 'object' }],
        [{ code: 'invalid_value', path: ['type'], message: 'Invalid input', values: ['queue'] }]
      ]
    });
  });
});

describe('compareEvaluations', () => {
  test('finds nothing between two identical generations, on accepted and rejected cases', () => {
    for (const config of [
      fn({}),
      fn({ timeout: '30', joinDefaultVpc: 'true' }),
      fn({ timeout: 'abc' }),
      fn({ unknown: 1 }),
      { resources: { queue: { type: 'queue', properties: {} } } },
      { resources: { worker: { type: 'lambda' } } }
    ]) {
      expect(compare(generation(), generation(), config)).toEqual({ kinds: [] });
    }
  });

  test('reports a changed default with its path', () => {
    expect(compare(generation(), generation({ timeout: 11 }), fn({}))).toEqual({
      kinds: ['data'],
      difference: { path: 'resources.worker.properties.timeout', oracle: '10', current: '11' }
    });
  });

  test('reports boolean strings accepted in any case, and only where the case matters', () => {
    const current = generation({ boolean: toBooleanIgnoringCase });
    expect(compare(generation(), current, fn({ joinDefaultVpc: 'TRUE' })).kinds).toEqual(['acceptance']);
    expect(compare(generation(), current, fn({ joinDefaultVpc: 'true' })).kinds).toEqual([]);
  });

  test('reports a changed leaf error although the verdict is the same', () => {
    const result = compare(
      generation(),
      generation({ architectures: ['x86_64', 'arm64'] }),
      fn({ architecture: 'ARM' })
    );
    expect(result.kinds).toEqual(['issues']);
    expect(result.difference?.path).toStartWith('[0].errors[0]');
  });

  test('reports union branches in another order', () => {
    const a = z.object({ kind: z.literal('a') }).strict();
    const b = z.object({ kind: z.literal('b') }).strict();
    const result = compare(z.union([a, b]), z.union([b, a]), { kind: 'c' });
    expect(result.kinds).toEqual(['issues']);
    expect(result.difference).toEqual({
      path: '[0].errors[0][0].message',
      oracle: '"Invalid input: expected \\"a\\""',
      current: '"Invalid input: expected \\"b\\""'
    });
  });

  test('reports issues or parsed keys that only changed order', () => {
    const first = z.object({ a: z.string(), b: z.string() }).strict();
    const second = z.object({ b: z.string(), a: z.string() }).strict();
    expect(compare(first, second, { a: 1, b: 2 }).kinds).toEqual(['issue-order']);
    expect(compare(first, second, { a: 'x', b: 'y' }).kinds).toEqual(['key-order']);
  });

  test('reports a parse that throws, differs between runs or changes its input', () => {
    const throwing = z.preprocess(() => {
      throw new Error('boom');
    }, z.number());
    expect(compare(z.number(), throwing, 1).kinds).toEqual(['threw']);
    let calls = 0;
    expect(
      compare(
        z.number(),
        z.preprocess(() => ++calls, z.number()),
        1
      ).kinds
    ).toEqual(['unrepeatable']);
    const touching = z.preprocess(
      (value) => Object.assign(value as object, { touched: true }),
      z.object({ touched: z.boolean() }).strict()
    );
    expect(compare(z.object({ touched: z.boolean().default(true) }).strict(), touching, {}).kinds).toEqual([
      'input-changed'
    ]);
  });
});

describe('effectsOf', () => {
  test('finds the defaults, stripped keys and preprocessed strings of a parse, by path', () => {
    const found: string[] = [];
    const input = { a: { n: '1', flag: 'true', extra: 1 }, list: [{ n: '2' }] };
    const output = { a: { n: 1, flag: true, fallback: 5 }, list: [{ n: 2 }], added: false };
    expect(effectsOf(input, output, (effect, path) => found.push(`${effect} ${path.join('.')}`))).toEqual({
      defaults: 2,
      stripped: 1,
      numbers: 2,
      booleans: 1
    });
    expect(found.toSorted()).toEqual([
      'booleans a.flag',
      'defaults a.fallback',
      'defaults added',
      'numbers a.n',
      'numbers list.0.n',
      'stripped a.extra'
    ]);
  });
});

describe('compareCorpus', () => {
  test('runs the docs example walker with each schema and counts what the corpus exercised', async () => {
    const { validateConfigObject } = await import('./validate-config-string');
    // Without a schema the walker keeps validating against the generated one, which requires packaging.
    expect(validateConfigObject(fn({})).valid).toBe(false);
    expect(validateConfigObject(fn({}), generation() as never)).toEqual({ valid: true, errors: [] });

    const corpus = [
      { id: 'targeted/number', group: 'targeted' as const, config: fn({ timeout: '30' }) },
      { id: 'targeted/leaf', group: 'targeted' as const, config: fn({ architecture: 'ARM' }) },
      { id: 'targeted/directive', group: 'targeted' as const, config: { resources: { worker: "$File('a.json')" } } },
      { id: 'derived/arm', group: 'derived' as const, config: fn({ architecture: 'arm64' }) }
    ];
    const same = compareCorpus({ corpus, oracle: generation(), current: generation(), walk: validateConfigObject });
    expect(same.differences).toBe(0);
    expect(same.lines).toHaveLength(corpus.length);
    expect(same.coverage.effects.schemaPaths.numbers).toEqual(['resources.<function>.properties.timeout']);
    expect(same.coverage.effects.schemaPaths.defaults).toEqual(['resources.<function>.properties.timeout']);
    // The directive is filtered only because the rejected path is the directive itself.
    expect(same.coverage.walker).toMatchObject({ validWhenRejected: 1, deeperThanIssues: 1 });
    expect(same.walkerBaseline).toContainEqual({
      id: 'targeted/leaf',
      safeParse: 'rejected',
      issuePaths: ['resources.worker'],
      walker: {
        valid: false,
        errors: 1,
        first: [
          {
            path: 'resources.worker.properties.architecture',
            message: 'Invalid option: expected one of "arm64"|"x86_64"'
          }
        ]
      }
    });

    const changed = compareCorpus({
      corpus,
      oracle: generation(),
      current: generation({ architectures: ['x86_64'] }),
      walk: validateConfigObject
    });
    expect(changed.differing).toEqual([
      { id: 'targeted/leaf', kinds: ['issues', 'walker'] },
      { id: 'derived/arm', kinds: ['acceptance', 'walker'] }
    ]);
    expect(changed.detailed[1]).toMatchObject({
      id: 'derived/arm',
      oracle: { accepted: true },
      current: { accepted: false, first: ['invalid_union at resources.worker'] },
      walker: { firstDifference: { path: 'errors', oracle: 'array(0)', current: 'array(1)' } }
    });
  });
});

describe('loading two generations', () => {
  test('loads copies as independent modules on the Zod the CLI installs, and refuses an alias or another Zod', async () => {
    const source = join(root, 'schema.ts');
    await writeFile(
      source,
      "import { z } from 'zod';\nexport const stacktapeConfigSchema = z.object({ a: z.number().default(1) }).strict();\n"
    );
    const zodDirectory = zodPackageDirectory();
    const zodVersion = (await Bun.file(join(zodDirectory, 'package.json')).json()).version;
    const isolated = async (name: string, zod = zodDirectory) =>
      loadSchemaModule(await isolateSchemaModule({ source, directory: join(root, name), zodDirectory: zod }));
    const oracle = await isolated('oracle');
    const current = await isolated('current');
    expect(oracle.sha256).toBe(current.sha256);
    expect(independenceProblems(oracle, current, zodVersion)).toEqual([]);
    expect(current.schema.parse({})).toEqual({ a: 1 });

    const alias = join(root, 'alias.ts');
    await symlink(oracle.loadedFrom, alias);
    const aliased = await loadSchemaModule(alias);
    expect(aliased.loadedFrom).toBe(oracle.loadedFrom);
    expect(independenceProblems(oracle, aliased, zodVersion)).toContain(
      `both schemas were loaded from ${oracle.loadedFrom}`
    );

    // A second copy of the same Zod version builds schemas this script's Zod does not recognize.
    const otherZod = join(root, 'other-zod');
    await cp(zodDirectory, otherZod, { recursive: true });
    const foreign = await isolated('foreign', otherZod);
    expect(foreign.schema instanceof z.ZodObject).toBe(true);
    expect(independenceProblems(oracle, foreign, zodVersion)).toEqual([
      'the current schema was not built by the Zod module this script loads'
    ]);
  }, 60_000); // four isolated loads of the 1.4 MB validator plus a Zod copy exceed Bun's 5 s default on the Windows runner
});

describe('corpus', () => {
  test('saves and reloads every value exactly, including those JSON cannot hold', () => {
    const config = {
      a: undefined,
      b: Number.NaN,
      c: -0,
      d: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
      e: Object.defineProperty({}, '__proto__', { value: 1, enumerable: true, writable: true, configurable: true })
    };
    const text = encodeCorpus({ format: 1, seed: 7, mutations: 0, cases: [{ id: 'a', group: 'targeted', config }] });
    const decoded = decodeCorpus(text);
    expect(encodeCorpus(decoded)).toBe(text);
    expect(fingerprint(decoded.cases[0]!.config)).toBe(fingerprint(config));
    expect(Object.keys((decoded.cases[0]!.config as { e: object }).e)).toEqual(['__proto__']);
  });

  test('derives the smallest accepted value and seeded richer ones from a schema', () => {
    const schema = z
      .object({
        type: z.literal('function'),
        properties: z
          .object({
            timeout: z.preprocess(toNumber, z.number()).optional().default(10),
            memory: z.preprocess(toNumber, z.number()),
            flag: z.preprocess(toBoolean, z.boolean()).optional(),
            tags: z.array(z.string()).optional()
          })
          .strict()
      })
      .strict();
    // A preprocessed field refuses a missing value although Zod marks it optional; a defaulted one is left out.
    expect(instantiate(schema, minimalBudget())).toEqual({ type: 'function', properties: { memory: 1 } });
    const rich = (label: string) => instantiate(schema, richBudget(7, label)) as { properties: { memory: unknown } };
    expect(rich('a')).toEqual(rich('a'));
    const values = Array.from({ length: 20 }, (_, index) => rich(String(index)));
    expect(values.every((value) => schema.safeParse(value).success)).toBe(true);
    expect(values.some(({ properties }) => typeof properties.memory === 'string')).toBe(true);
    expect(seededRandom(1, 'a')()).toBe(seededRandom(1, 'a')());
    expect(seededRandom(1, 'a')()).not.toBe(seededRandom(2, 'a')());
  });
});
