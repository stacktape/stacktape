/**
 * The configurations the validator differential (`validator-differential.ts`) runs through two generations of the
 * generated config schema. The corpus is plain data. The same seed, frozen schema and repository examples always build
 * the same cases, and a saved corpus reloads byte for byte, so a later run can use exactly the cases of an earlier one.
 *
 * - `starter`: every starter project's `stacktape.yml`.
 * - `docs`: every ```yaml example in the config model sources, as the docs example validation reads them.
 * - `targeted`: hand-written cases for what the generated schema encodes: defaults, number preprocessing, booleans
 *   accepted only as exact lowercase strings, unknown keys, records, arrays, typed and plain unions, directives, and
 *   CloudFormation resources and intrinsic functions, nested and with malformed arities. Cases from the
 *   characterization tests are included as data; their expected verdicts are not asserted here.
 * - `derived`: values built from the schema's own structure. `minimal` is the smallest value each resource type, script
 *   type, top-level section and CloudFormation entry accepts; `rich` adds seeded optional properties, union branches,
 *   array and record entries and coercible strings, bounded in depth and size.
 * - `mutation`: one seeded change to an accepted case of the groups above.
 */
import type { FencedExample } from './extract-examples';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseYaml } from '@utils/yaml';
import { STARTER_PROJECTS_SOURCE_PATH } from 'src/config/project-paths';
import { listConfigSourceFiles } from './config-sources';
import { extractFencedExamples } from './extract-examples';

export type CorpusCase = {
  id: string;
  group: 'starter' | 'docs' | 'targeted' | 'derived' | 'mutation';
  /** How a mutation was made, for reading a mismatch: the operation, its base case and the changed path. */
  origin?: string;
  config: unknown;
};

export type Corpus = { format: 1; seed: number; mutations: number; cases: CorpusCase[] };

/** Only for the cases being built: the schema accepted this configuration. */
type Accepts = (config: unknown) => boolean;

// Values JSON cannot hold are written as `{ "$corpus": name }`; configurations never contain that key.
const SPECIAL_VALUES: Record<string, unknown> = {
  undefined,
  NaN: Number.NaN,
  Infinity: Number.POSITIVE_INFINITY,
  '-Infinity': Number.NEGATIVE_INFINITY,
  '-0': -0
};

const specialName = (value: unknown) => {
  if (value === undefined) return 'undefined';
  if (typeof value !== 'number') return null;
  if (Number.isNaN(value)) return 'NaN';
  if (value === Number.POSITIVE_INFINITY) return 'Infinity';
  if (value === Number.NEGATIVE_INFINITY) return '-Infinity';
  return Object.is(value, -0) ? '-0' : null;
};

export const encodeCorpus = (corpus: Corpus) =>
  `${JSON.stringify(corpus, (_key, value) => {
    const name = specialName(value);
    return name === null ? value : { $corpus: name };
  })}\n`;

const decodeValue = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') return value;
  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === '$corpus') {
    const name = (value as { $corpus: string }).$corpus;
    if (!(name in SPECIAL_VALUES)) throw new Error(`Unknown corpus value "${name}".`);
    return SPECIAL_VALUES[name];
  }
  if (Array.isArray(value)) return value.map(decodeValue);
  const decoded: Record<string, unknown> = {};
  // `defineProperty` keeps a `__proto__` key an own property instead of replacing the prototype.
  for (const key of keys) {
    Object.defineProperty(decoded, key, {
      value: decodeValue((value as Record<string, unknown>)[key]),
      enumerable: true,
      writable: true,
      configurable: true
    });
  }
  return decoded;
};

export const decodeCorpus = (text: string): Corpus => {
  const corpus = decodeValue(JSON.parse(text)) as Corpus;
  if (corpus.format !== 1 || !Array.isArray(corpus.cases)) throw new Error('Not a validator differential corpus.');
  return corpus;
};

const hashLabel = (text: string) => {
  let hash = 0x811c9dc5;
  for (const character of text) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
};

/** Mulberry32, seeded by the corpus seed and a label, so one case's values do not depend on any other case. */
export const seededRandom = (seed: number, label: string) => {
  let state = (seed ^ hashLabel(label)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)]!;

const defOf = (schema: any) => schema?._zod?.def ?? {};
const WRAPPERS = ['optional', 'default', 'prefault', 'nullable', 'nonoptional', 'readonly', 'catch'];
const unwrap = (schema: any): any => {
  let current = schema;
  while (WRAPPERS.includes(defOf(current).type) || defOf(current).type === 'lazy') {
    current = defOf(current).type === 'lazy' ? defOf(current).getter() : defOf(current).innerType;
  }
  return current;
};

type Budget = { random: () => number; rich: boolean; depthLimit: number; optionalSlots: number };

export const minimalBudget = (): Budget => ({ random: () => 0, rich: false, depthLimit: 0, optionalSlots: 0 });
export const richBudget = (seed: number, label: string): Budget => ({
  random: seededRandom(seed, label),
  rich: true,
  depthLimit: 6,
  optionalSlots: 40
});

const includeOptional = (budget: Budget, depth: number) => {
  if (!budget.rich || depth >= budget.depthLimit || budget.optionalSlots <= 0 || budget.random() >= 0.5) return false;
  budget.optionalSlots--;
  return true;
};

const recordKeys = (keyType: any, budget: Budget): unknown[] => {
  const key = defOf(unwrap(keyType));
  const allowed = key.type === 'enum' ? Object.values(key.entries) : key.type === 'literal' ? key.values : null;
  const count = 1 + Math.floor(budget.random() * 2);
  return (allowed ?? ['entryA', 'entryB']).slice(0, count);
};

/**
 * A value the schema describes: every required property, and in `rich` mode seeded optional properties, union
 * branches, array and record entries, and preprocessed numbers and booleans sometimes written as strings.
 */
export const instantiate = (schema: any, budget: Budget, depth = 0): unknown => {
  const def = defOf(schema);
  if (WRAPPERS.includes(def.type)) return instantiate(def.innerType, budget, depth);
  switch (def.type) {
    case 'lazy':
      return instantiate(def.getter(), budget, depth);
    case 'pipe': {
      // `z.preprocess` is a pipe from a transform; the schema it feeds describes the values it accepts.
      if (defOf(def.in).type !== 'transform') return instantiate(def.in, budget, depth);
      const value = instantiate(def.out, budget, depth);
      const asString =
        (typeof value === 'number' || typeof value === 'boolean') && budget.rich && budget.random() < 0.5;
      return asString ? String(value) : value;
    }
    case 'object': {
      const value: Record<string, unknown> = {};
      for (const [key, field] of Object.entries<any>(def.shape)) {
        // Zod's `optin` marks a preprocessed field optional although it refuses a missing value, and a defaulted field
        // as `defaulted`: whether the field accepts `undefined` is what decides that it may be left out.
        if (field.safeParse(undefined).success && !includeOptional(budget, depth)) continue;
        value[key] = instantiate(field, budget, depth + 1);
      }
      return value;
    }
    case 'union': {
      const typed = def.options.filter((option: any) => !['any', 'unknown'].includes(defOf(option).type));
      const options = typed.length ? typed : def.options;
      return instantiate(budget.rich ? pick(budget.random, options) : options[0], budget, depth);
    }
    case 'array':
      if (!budget.rich || depth >= budget.depthLimit) return [];
      return Array.from({ length: 1 + Math.floor(budget.random() * 2) }, () =>
        instantiate(def.element, budget, depth + 1)
      );
    case 'record':
      if (!budget.rich || depth >= budget.depthLimit) return {};
      return Object.fromEntries(
        recordKeys(def.keyType, budget).map((key) => [key, instantiate(def.valueType, budget, depth + 1)])
      );
    case 'tuple':
      return def.items.map((item: any) => instantiate(item, budget, depth + 1));
    case 'literal':
      return def.values[0];
    case 'enum': {
      const values = Object.values(def.entries);
      return budget.rich ? pick(budget.random, values) : values[0];
    }
    case 'string':
      return 'example';
    case 'number':
      return budget.rich ? pick(budget.random, [1, 2, 30, 128, 1024]) : 1;
    case 'boolean':
      return budget.rich ? budget.random() < 0.5 : true;
    case 'null':
      return null;
    default:
      return 'example';
  }
};

/** The options of a union of objects, by the literal value of their `field`. */
const optionsByLiteral = (union: any, field: string) =>
  new Map<string, any>(
    defOf(unwrap(union)).options.map((option: any) => [
      String(defOf(unwrap(defOf(unwrap(option)).shape[field])).values[0]),
      option
    ])
  );

type SchemaParts = {
  resources: Map<string, any>;
  scripts: Map<string, any>;
  sections: [string, any][];
  cloudformation: any[];
};

const schemaParts = (schema: any): SchemaParts => {
  const shape = defOf(schema).shape;
  return {
    resources: optionsByLiteral(defOf(unwrap(shape.resources)).valueType, 'type'),
    scripts: optionsByLiteral(defOf(unwrap(shape.scripts)).valueType, 'type'),
    sections: Object.entries<any>(shape).filter(
      ([key]) => !['resources', 'scripts', 'cloudformationResources'].includes(key)
    ),
    cloudformation: defOf(defOf(unwrap(shape.cloudformationResources)).valueType).options
  };
};

const derivedCases = (parts: SchemaParts, seed: number): CorpusCase[] => {
  const cases: CorpusCase[] = [];
  const add = (id: string, config: unknown) => cases.push({ id: `derived/${id}`, group: 'derived', config });
  const variants = (prefix: string, rich: number, schema: any, wrap: (value: unknown) => unknown) => {
    add(`minimal/${prefix}`, wrap(instantiate(schema, minimalBudget())));
    for (let index = 0; index < rich; index++) {
      const label = `rich/${prefix}/${index}`;
      add(label, wrap(instantiate(schema, richBudget(seed, label))));
    }
  };
  for (const [type, option] of parts.resources) {
    variants(`resource/${type}`, 16, option, (value) => ({ resources: { corpusResource: value } }));
  }
  for (const [type, option] of parts.scripts) {
    variants(`script/${type}`, 4, option, (value) => ({ resources: {}, scripts: { corpusScript: value } }));
  }
  for (const [key, section] of parts.sections) {
    variants(`section/${key}`, 10, section, (value) => ({ resources: {}, [key]: value }));
  }
  parts.cloudformation.forEach((option, index) =>
    variants(`cloudformation/option-${index}`, 20, option, (value) => ({
      resources: {},
      cloudformationResources: { CorpusResource: value }
    }))
  );
  return cases;
};

type Builders = {
  resource: (type: string, properties?: Record<string, unknown>) => Record<string, unknown>;
  script: (type: string) => Record<string, unknown>;
};

const builders = (parts: SchemaParts): Builders => {
  const minimal = (options: Map<string, any>, type: string) => {
    if (!options.has(type)) throw new Error(`The schema has no "${type}" option.`);
    return instantiate(options.get(type), minimalBudget()) as Record<string, any>;
  };
  return {
    resource: (type, properties = {}) => {
      const base = minimal(parts.resources, type);
      return { ...base, properties: { ...base.properties, ...properties } };
    },
    script: (type) => minimal(parts.scripts, type)
  };
};

/** One property of an object, created so that even `__proto__` stays an own key. */
const ownProperty = (key: string, value: unknown) =>
  Object.defineProperty({}, key, { value, enumerable: true, writable: true, configurable: true });

const INTRINSICS: [string, unknown][] = [
  ['ref', { Ref: 'CorpusParameter' }],
  ['ref-number', { Ref: 1 }],
  ['ref-extra-key', { Ref: 'CorpusParameter', Extra: 'value' }],
  ['two-functions', { Ref: 'CorpusParameter', 'Fn::GetAtt': ['CorpusResource', 'Arn'] }],
  ['get-att', { 'Fn::GetAtt': ['CorpusResource', 'Arn'] }],
  ['get-att-one', { 'Fn::GetAtt': ['CorpusResource'] }],
  ['get-att-three', { 'Fn::GetAtt': ['CorpusResource', 'Arn', 'Extra'] }],
  ['get-att-string', { 'Fn::GetAtt': 'CorpusResource.Arn' }],
  ['join', { 'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }]] }],
  ['join-one', { 'Fn::Join': [','] }],
  ['join-three', { 'Fn::Join': [',', ['a'], 'extra'] }],
  ['select', { 'Fn::Select': [0, { 'Fn::Split': [',', 'a,b'] }] }],
  ['select-one', { 'Fn::Select': [0] }],
  ['split-three', { 'Fn::Split': [',', 'a,b', 'c'] }],
  ['find-in-map', { 'Fn::FindInMap': ['Map', 'Key', 'Value'] }],
  ['find-in-map-two', { 'Fn::FindInMap': ['Map', 'Key'] }],
  ['find-in-map-four', { 'Fn::FindInMap': ['Map', 'Key', 'Value', { DefaultValue: 1 }] }],
  ['if', { 'Fn::If': ['CorpusCondition', 100, 50] }],
  ['if-two', { 'Fn::If': ['CorpusCondition', 100] }],
  ['if-four', { 'Fn::If': ['CorpusCondition', 1, 2, 3] }],
  ['equals-one', { 'Fn::Equals': ['a'] }],
  ['not-two', { 'Fn::Not': [{ Condition: 'A' }, { Condition: 'B' }] }],
  ['and', { 'Fn::And': [{ Condition: 'A' }, { 'Fn::Equals': ['a', 'b'] }] }],
  ['sub', { 'Fn::Sub': '${AWS::StackName}-corpus' }],
  ['sub-with-map', { 'Fn::Sub': ['${Name}-corpus', { Name: { Ref: 'AWS::StackName' } }] }],
  ['sub-three', { 'Fn::Sub': ['a', {}, 'extra'] }],
  ['base64', { 'Fn::Base64': 'corpus' }],
  ['get-azs', { 'Fn::GetAZs': '' }],
  ['import-value', { 'Fn::ImportValue': { 'Fn::Sub': '${AWS::StackName}-export' } }],
  ['cidr', { 'Fn::Cidr': ['10.0.0.0/16', 4, 8] }],
  ['unknown-function', { 'Fn::Corpus': ['a'] }]
];

/** An intrinsic nested `depth` times through Select, Split and Join, with `innermost` at the bottom. */
const nestedIntrinsic = (depth: number, innermost: unknown): unknown => {
  let value = innermost;
  for (let level = 0; level < depth; level++) {
    value =
      level % 3 === 0
        ? { 'Fn::Join': [',', [value, 'corpus']] }
        : level % 3 === 1
          ? { 'Fn::Split': [',', value] }
          : { 'Fn::Select': [0, value] };
  }
  return value;
};

const targetedCases = ({ resource, script }: Builders): CorpusCase[] => {
  const fn = (properties: Record<string, unknown> = {}) => resource('function', properties);
  const one = (value: unknown) => ({ resources: { corpusResource: value } });
  const cfn = (entry: unknown) => ({ resources: {}, cloudformationResources: { CorpusResource: entry } });
  const scalingGroup = (policy: Record<string, unknown>) =>
    cfn({ Type: 'AWS::AutoScaling::AutoScalingGroup', Properties: { MinSize: '1', MaxSize: '2' }, ...policy });
  const minSuccessful = (value: unknown) =>
    scalingGroup({ CreationPolicy: { AutoScalingCreationPolicy: { MinSuccessfulInstancesPercent: value } } });
  const accessPoint = (accessPointArn: unknown) =>
    one(fn({ volumeMounts: [{ type: 's3files', properties: { accessPointArn, mountPath: '/mnt/files' } }] }));
  const kafka = (properties: Record<string, unknown>) =>
    one(
      fn({
        events: [{ type: 'kafka-topic', properties }],
        packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/worker.ts' } }
      })
    );
  const basicAuth = {
    type: 'BASIC_AUTH',
    properties: { authenticationSecretArn: 'arn:aws:secretsmanager:eu-west-1:111111111111:secret:kafka' }
  };
  const cases: [string, unknown][] = [
    ['defaults/minimal-function', one(fn())],
    ['defaults/empty-nested-objects', one(fn({ logging: {}, cdn: {}, url: { enabled: true } }))],
    ['defaults/explicit-values', one(fn({ timeout: 30, joinDefaultVpc: true, storage: 1024 }))],
    ['defaults/explicit-undefined', one(fn({ timeout: undefined, joinDefaultVpc: undefined, memory: undefined }))],
    ['defaults/null-value', one(fn({ timeout: null }))],
    [
      'defaults/characterization-buildpack-and-logging',
      {
        resources: {
          nodeFunction: resource('function', {
            packaging: {
              type: 'stacktape-lambda-buildpack',
              properties: { entryfilePath: 'src/index.ts', languageSpecificConfig: {} }
            },
            runtime: 'nodejs22.x',
            logging: {}
          }),
          pythonFunction: resource('function', {
            packaging: {
              type: 'stacktape-lambda-buildpack',
              properties: { entryfilePath: 'src/index.py', languageSpecificConfig: { packageManager: 'uv' } }
            }
          }),
          cache: resource('redis-cluster', {
            defaultUserPassword: "$Secret('redis.password')",
            instanceSize: 'cache.t4g.micro',
            logging: {}
          })
        }
      }
    ],
    [
      'defaults/characterization-open-search-logging',
      one(resource('open-search-domain', { logging: { errorLogs: {}, searchSlowLogs: {}, indexSlowLogs: {} } }))
    ],
    ...['512', ' 512 ', '', '0x200', '1e3', '5.5', '-1', 'abc', 'Infinity', '512MB'].map(
      (memory, index): [string, unknown] => [`numbers/memory-string-${index}`, one(fn({ memory }))]
    ),
    ...[true, null, [], {}, Number.NaN, -0, Number.POSITIVE_INFINITY].map((memory, index): [string, unknown] => [
      `numbers/memory-non-string-${index}`,
      one(fn({ memory }))
    ]),
    ['numbers/cloudformation-string', minSuccessful('50')],
    ['numbers/cloudformation-invalid-string', minSuccessful('fifty')],
    ...['true', 'false', 'TRUE', 'True', 'FALSE', 'yes', 'no', '1', '0', '', ' true'].map(
      (joinDefaultVpc, index): [string, unknown] => [`booleans/string-${index}`, one(fn({ joinDefaultVpc }))]
    ),
    ...[1, 0, null, ['true']].map((joinDefaultVpc, index): [string, unknown] => [
      `booleans/non-string-${index}`,
      one(fn({ joinDefaultVpc }))
    ]),
    ['booleans/nested-string', one(fn({ url: { enabled: 'true', responseStreamEnabled: 'false' } }))],
    ['booleans/nested-uppercase', one(fn({ url: { enabled: 'True' } }))],
    [
      'booleans/cloudformation-string',
      scalingGroup({ UpdatePolicy: { AutoScalingRollingUpdate: { WaitOnResourceSignals: 'true' } } })
    ],
    ['unknown-keys/top-level', { resources: {}, corpusUnknown: 1 }],
    ['unknown-keys/resource', one({ ...fn(), corpusUnknown: 1 })],
    ['unknown-keys/properties', one(fn({ corpusUnknown: 1 }))],
    ['unknown-keys/nested-object', one(fn({ logging: { corpusUnknown: true } }))],
    ['unknown-keys/array-element', one(fn({ environment: [{ name: 'A', value: 'b', corpusUnknown: 1 }] }))],
    ['unknown-keys/cloudformation-entry', cfn({ Type: 'AWS::SQS::Queue', Properties: {}, CorpusUnknown: 1 })],
    [
      'unknown-keys/cloudformation-properties',
      cfn({ Type: 'AWS::SQS::Queue', Properties: { QueueName: 'a', Nested: { Deep: [1, { Value: null }] } } })
    ],
    ['unknown-keys/cloudformation-metadata', cfn({ Type: 'AWS::SQS::Queue', Metadata: { Any: { Nested: 1 } } })],
    ['unknown-keys/variables', { resources: {}, variables: { a: 1, b: { c: [true, null] } } }],
    ['records/empty-resources', { resources: {} }],
    ['records/several-resources', { resources: { a: fn(), b: fn({ memory: 256 }), c: resource('sqs-queue') } }],
    ['records/unusual-names', { resources: { 'with.dot': fn(), '123': fn(), 'with space': fn(), '': fn() } }],
    ['records/proto-name', { resources: ownProperty('__proto__', fn()) }],
    ['records/missing-resources', {}],
    ['records/resources-array', { resources: [] }],
    ['records/resources-null', { resources: null }],
    ['records/resources-string', { resources: 'corpus' }],
    ['records/resource-null', one(null)],
    ['records/resource-array', one([])],
    ['records/resource-number', one(1)],
    ['records/scripts', { resources: {}, scripts: { a: script('local-script'), b: script('bastion-script') } }],
    ['records/scripts-array', { resources: {}, scripts: [script('local-script')] }],
    ['arrays/environment', one(fn({ environment: [{ name: 'A', value: 'b' }] }))],
    ['arrays/environment-empty', one(fn({ environment: [] }))],
    ['arrays/environment-missing-value', one(fn({ environment: [{ name: 'A' }] }))],
    ['arrays/environment-object-value', one(fn({ environment: [{ name: 'A', value: { nested: 1 } }] }))],
    ['arrays/environment-number-value', one(fn({ environment: [{ name: 'A', value: 1 }] }))],
    ['arrays/environment-not-array', one(fn({ environment: { name: 'A', value: 'b' } }))],
    ['arrays/layers-string', one(fn({ layers: 'arn:aws:lambda:eu-west-1:111111111111:layer:corpus:1' }))],
    ['arrays/layers-undefined-element', one(fn({ layers: [undefined] }))],
    ['arrays/layers-mixed', one(fn({ layers: ['a', 1, null] }))],
    ['arrays/cloudformation-depends-on-string', cfn({ Type: 'AWS::SQS::Queue', DependsOn: 'A' })],
    ['arrays/cloudformation-depends-on-list', cfn({ Type: 'AWS::SQS::Queue', DependsOn: ['A', 'B'] })],
    ['arrays/cloudformation-depends-on-empty', cfn({ Type: 'AWS::SQS::Queue', DependsOn: [] })],
    ['arrays/cloudformation-depends-on-number', cfn({ Type: 'AWS::SQS::Queue', DependsOn: [1] })],
    ['typed-unions/characterization-misspelled-type', one({ type: 'functon', properties: {} })],
    ['typed-unions/wrong-case-type', one({ ...fn(), type: 'Function' })],
    ['typed-unions/missing-type', one({ properties: fn().properties })],
    ['typed-unions/number-type', one({ ...fn(), type: 1 })],
    ['typed-unions/missing-properties', one({ type: 'function' })],
    ['typed-unions/other-type-properties', one({ type: 'sqs-queue', properties: fn().properties })],
    ['typed-unions/packaging-unknown-type', one(fn({ packaging: { type: 'docker', properties: {} } }))],
    ['typed-unions/script-unknown-type', { resources: {}, scripts: { a: { type: 'remote-script', properties: {} } } }],
    [
      'typed-unions/kafka-cluster-name',
      kafka({ kafkaClusterName: 'ordersKafka', topicName: 'events', startFrom: 'latest' })
    ],
    [
      'typed-unions/kafka-msk-arn',
      kafka({
        mskClusterArn: 'arn:aws:kafka:eu-west-1:111111111111:cluster/orders/uuid',
        topicName: 'events',
        startFrom: 'earliest'
      })
    ],
    [
      'typed-unions/kafka-custom',
      kafka({
        customKafkaConfiguration: {
          authentication: basicAuth,
          bootstrapServers: ['broker.example.com:9092'],
          topicName: 'events'
        },
        startFrom: 'latest'
      })
    ],
    ['typed-unions/kafka-missing-source', kafka({ topicName: 'events', startFrom: 'latest' })],
    ['typed-unions/kafka-missing-start', kafka({ kafkaClusterName: 'ordersKafka', topicName: 'events' })],
    [
      'typed-unions/kafka-competing-sources',
      kafka({
        kafkaClusterName: 'ordersKafka',
        mskClusterArn: 'arn:aws:kafka:eu-west-1:111111111111:cluster/orders/uuid',
        topicName: 'events',
        startFrom: 'latest'
      })
    ],
    [
      'typed-unions/kafka-missing-authentication',
      kafka({
        customKafkaConfiguration: { bootstrapServers: ['broker.example.com:9092'], topicName: 'events' },
        startFrom: 'latest'
      })
    ],
    [
      'typed-unions/kafka-mtls-without-certificate',
      kafka({
        customKafkaConfiguration: {
          authentication: { type: 'MTLS', properties: {} },
          bootstrapServers: ['broker.example.com:9092'],
          topicName: 'events'
        },
        startFrom: 'latest'
      })
    ],
    ['plain-unions/tracing-boolean', one(fn({ tracing: true }))],
    ['plain-unions/tracing-object', one(fn({ tracing: { enabled: 'true' } }))],
    ['plain-unions/tracing-string', one(fn({ tracing: 'on' }))],
    ['plain-unions/architecture-arm64', one(fn({ architecture: 'arm64' }))],
    ['plain-unions/architecture-uppercase', one(fn({ architecture: 'ARM64' }))],
    ['plain-unions/runtime-unknown', one(fn({ runtime: 'nodejs99.x' }))],
    ['plain-unions/cloudformation-depends-on-object', cfn({ Type: 'AWS::SQS::Queue', DependsOn: { A: 1 } })],
    ['plain-unions/cloudformation-deletion-policy-case', cfn({ Type: 'AWS::SQS::Queue', DeletionPolicy: 'retain' })],
    ['directives/string-array', one(fn({ layers: ["$Secret('corpus.layer')"] }))],
    ['directives/number', one(fn({ memory: "$ResourceParam('corpusTable', 'memory')" }))],
    ['directives/boolean', one(fn({ joinDefaultVpc: '$Stage()' }))],
    ['directives/with-path', one(fn({ memory: "$File('config.json').memory" }))],
    ['directives/not-a-directive', one(fn({ memory: '$Stage()x' }))],
    ['directives/whole-resource', one("$File('resource.json')")],
    ['directives/whole-properties', one({ type: 'function', properties: "$File('properties.json')" })],
    ['directives/whole-resources', { resources: "$File('resources.json')" }],
    ['directives/environment-value', one(fn({ environment: [{ name: 'A', value: "$Secret('corpus.value')" }] }))],
    ['directives/beside-an-error', one(fn({ memory: "$Secret('corpus.memory')", timeout: 'abc' }))],
    ['directives/section', { resources: {}, deploymentConfig: "$File('deployment.json')" }],
    ['directives/cloudformation-deletion-policy', cfn({ Type: 'AWS::SQS::Queue', DeletionPolicy: '$Stage()' })],
    ['directives/cloudformation-entry', { resources: {}, cloudformationResources: { A: "$File('entry.json')" } }],
    ['intrinsics/characterization-access-point-string', accessPoint('arn:aws:s3:eu-west-1:123:accesspoint/files')],
    ['intrinsics/characterization-access-point-ref', accessPoint({ Ref: 'FilesAccessPoint' })],
    ['intrinsics/characterization-access-point-sub', accessPoint({ 'Fn::Sub': '${FilesAccessPointArn}' })],
    ['intrinsics/characterization-access-point-object', accessPoint({ arbitrary: 'object' })],
    ...INTRINSICS.map(([name, value]): [string, unknown] => [`intrinsics/access-point-${name}`, accessPoint(value)]),
    ...INTRINSICS.map(([name, value]): [string, unknown] => [
      `intrinsics/cloudformation-${name}`,
      minSuccessful(value)
    ]),
    ['intrinsics/stacktape-number-ref', one(fn({ memory: { Ref: 'CorpusParameter' } }))],
    ...[1, 2, 3, 4, 5, 6].flatMap((depth): [string, unknown][] => [
      [`intrinsics/nested-${depth}-cloudformation`, minSuccessful(nestedIntrinsic(depth, { Ref: 'A' }))],
      [
        `intrinsics/nested-${depth}-cloudformation-malformed`,
        minSuccessful(nestedIntrinsic(depth, { 'Fn::GetAtt': ['A'] }))
      ],
      [`intrinsics/nested-${depth}-access-point`, accessPoint(nestedIntrinsic(depth, { Ref: 'A' }))],
      [`intrinsics/nested-${depth}-access-point-malformed`, accessPoint(nestedIntrinsic(depth, { 'Fn::If': ['A'] }))]
    ]),
    [
      'cloudformation/bucket',
      cfn({
        Type: 'AWS::S3::Bucket',
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
        Properties: {
          BucketName: { 'Fn::Sub': '${AWS::StackName}-files' },
          Tags: [{ Key: 'Region', Value: { Ref: 'AWS::Region' } }]
        }
      })
    ],
    [
      'cloudformation/queue-with-options',
      cfn({
        Type: 'AWS::SQS::Queue',
        Condition: 'IsProduction',
        DependsOn: ['CorpusTopic'],
        DeletionPolicy: 'Snapshot',
        Metadata: { Owner: 'corpus' },
        Properties: { VisibilityTimeout: '60' }
      })
    ],
    [
      'cloudformation/scaling-group-policies',
      scalingGroup({
        CreationPolicy: {
          ResourceSignal: { Count: '2', Timeout: 'PT15M' },
          AutoScalingCreationPolicy: { MinSuccessfulInstancesPercent: { 'Fn::If': ['IsProduction', 100, 50] } }
        },
        UpdatePolicy: {
          AutoScalingRollingUpdate: {
            MaxBatchSize: { Ref: 'BatchSize' },
            MinInstancesInService: '1',
            PauseTime: 'PT5M',
            WaitOnResourceSignals: true
          },
          AutoScalingScheduledAction: { IgnoreUnmodifiedGroupSizeProperties: 'false' }
        }
      })
    ],
    ['cloudformation/without-properties', cfn({ Type: 'AWS::SNS::Topic' })],
    ['cloudformation/missing-type', cfn({ Properties: {} })],
    ['cloudformation/type-number', cfn({ Type: 1, Properties: {} })],
    ['cloudformation/properties-array', cfn({ Type: 'AWS::SQS::Queue', Properties: [] })],
    ['cloudformation/properties-null', cfn({ Type: 'AWS::SQS::Queue', Properties: null })],
    ['cloudformation/policy-unknown-key', scalingGroup({ CreationPolicy: { Corpus: {} } })],
    ['cloudformation/entry-null', cfn(null)]
  ];
  return cases.map(([id, config]) => ({ id: `targeted/${id}`, group: 'targeted', config }));
};

const readStarterCases = async (): Promise<CorpusCase[]> => {
  const names = (await readdir(STARTER_PROJECTS_SOURCE_PATH, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();
  const cases: CorpusCase[] = [];
  for (const name of names) {
    const text = await readFile(join(STARTER_PROJECTS_SOURCE_PATH, name, 'stacktape.yml'), 'utf8').catch(() => null);
    if (text !== null) cases.push({ id: `starter/${name}`, group: 'starter', config: parseYaml(text) });
  }
  return cases;
};

const readDocsCases = async (): Promise<{ cases: CorpusCase[]; unparsable: string[] }> => {
  const examples: FencedExample[] = [];
  for (const file of listConfigSourceFiles().toSorted()) {
    examples.push(...extractFencedExamples(file, await readFile(file, 'utf8')).filter(({ lang }) => lang === 'yaml'));
  }
  const cases: CorpusCase[] = [];
  const unparsable: string[] = [];
  for (const example of examples) {
    const id = `docs/${example.file.split('/').at(-1)}:${example.line}`;
    try {
      cases.push({ id, group: 'docs', config: parseYaml(example.code) });
    } catch {
      unparsable.push(id);
    }
  }
  return { cases, unparsable };
};

type Location = { path: (string | number)[]; value: unknown };

/** Every value below the root, depth first, in key order. */
const locations = (value: unknown, path: (string | number)[] = [], found: Location[] = []): Location[] => {
  if (value === null || typeof value !== 'object') return found;
  const entries: [string | number, unknown][] = Array.isArray(value)
    ? value.map((item, index) => [index, item])
    : Object.entries(value);
  for (const [key, child] of entries) {
    found.push({ path: [...path, key], value: child });
    locations(child, [...path, key], found);
  }
  return found;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const locationValue = (root: unknown, path: (string | number)[]) =>
  path.reduce<unknown>((value, key) => (value as Record<string | number, unknown>)[key], root);

const DELETE = Symbol('delete');

type Mutation = {
  name: string;
  applies: (location: Location, parent: unknown) => boolean;
  /** The replacement value, or `DELETE` to remove the key. */
  change: (value: unknown, random: () => number) => unknown;
};

const MUTATIONS: Mutation[] = [
  { name: 'drop-key', applies: (_location, parent) => isPlainObject(parent), change: () => DELETE },
  {
    name: 'add-unknown-key',
    applies: ({ value }) => isPlainObject(value),
    change: (value) => ({ ...(value as object), corpusUnknown: 'corpus' })
  },
  {
    name: 'number-as-string',
    applies: ({ value }) => typeof value === 'number',
    change: (value, random) => pick(random, [String(value), ` ${value} `, '', '0x10', '1e3', 'abc', 'Infinity'])
  },
  {
    name: 'boolean-as-string',
    applies: ({ value }) => typeof value === 'boolean',
    change: (value, random) => pick(random, [String(value), String(value).toUpperCase(), 'True', 'yes', '1', ''])
  },
  {
    name: 'string-as-other-type',
    applies: ({ value }) => typeof value === 'string',
    change: (_value, random) => pick(random, [42, true, null, [], {}])
  },
  {
    name: 'enum-case',
    applies: ({ value }) => typeof value === 'string' && /^[a-z]/.test(value),
    change: (value) => `${(value as string)[0]!.toUpperCase()}${(value as string).slice(1)}`
  },
  { name: 'null', applies: () => true, change: () => null },
  {
    name: 'explicit-undefined',
    applies: (_location, parent) => isPlainObject(parent),
    change: () => undefined
  },
  {
    name: 'wrap-in-array',
    applies: ({ value }) => !Array.isArray(value),
    change: (value) => [value]
  },
  {
    name: 'array-as-object',
    applies: ({ value }) => Array.isArray(value) && value.length > 0,
    change: (value) => ({ ...(value as unknown[]) })
  },
  {
    name: 'directive',
    applies: ({ value }) => value === null || typeof value !== 'object',
    change: (_value, random) =>
      pick(random, ["$Secret('corpus.secret')", "$ResourceParam('corpusResource', 'arn')", '$Stage()'])
  },
  {
    name: 'intrinsic',
    applies: ({ value }) => value === null || typeof value !== 'object',
    change: (_value, random) => pick(random, INTRINSICS)[1]
  },
  {
    name: 'other-type-literal',
    applies: ({ path, value }) => path.at(-1) === 'type' && typeof value === 'string',
    change: (value, random) =>
      pick(random, ['function', 'sqs-queue', 'web-service', `${value}-corpus`, (value as string).toUpperCase()])
  }
];

const replaceAt = (root: unknown, path: (string | number)[], replacement: unknown): unknown => {
  if (path.length === 0) return replacement;
  const [key, ...rest] = path;
  if (Array.isArray(root)) {
    const copy = [...root];
    copy[key as number] = replaceAt(root[key as number], rest, replacement);
    return copy;
  }
  const source = root as Record<string, unknown>;
  const copy: Record<string, unknown> = {};
  for (const ownKey of Object.keys(source)) {
    if (ownKey === key && rest.length === 0 && replacement === DELETE) continue;
    const value = ownKey === key ? replaceAt(source[ownKey], rest, replacement) : source[ownKey];
    Object.defineProperty(copy, ownKey, { value, enumerable: true, writable: true, configurable: true });
  }
  return copy;
};

const formatPath = (path: (string | number)[]) => path.map(String).join('.');

/**
 * Up to `count` single mutations, their operations taken in turn. Each changes a seeded base the schema accepts at a
 * seeded location the operation applies to; a base without one is replaced by another, a bounded number of times.
 */
const mutationCases = (bases: CorpusCase[], count: number, seed: number): CorpusCase[] => {
  const cases: CorpusCase[] = [];
  for (let index = 0; index < count && bases.length > 0; index++) {
    const mutation = MUTATIONS[index % MUTATIONS.length]!;
    const random = seededRandom(seed, `mutation/${index}`);
    for (let attempt = 0; attempt < 16; attempt++) {
      const base = pick(random, bases);
      const candidates = locations(base.config).filter((location) =>
        mutation.applies(location, locationValue(base.config, location.path.slice(0, -1)))
      );
      if (!candidates.length) continue;
      const location = pick(random, candidates);
      cases.push({
        id: `mutation/${String(index).padStart(4, '0')}`,
        group: 'mutation',
        origin: `${mutation.name} at ${formatPath(location.path)} of ${base.id}`,
        config: replaceAt(base.config, location.path, mutation.change(location.value, random))
      });
      break;
    }
  }
  return cases;
};

export type CorpusSummary = { groups: Record<string, number>; unparsableDocsExamples: string[]; mutationBases: number };

/**
 * The corpus, built from the frozen schema (`schema`) and the repository examples. `accepts` tells which starter, docs,
 * targeted and derived cases the frozen schema accepts; only those are mutated.
 */
export const buildCorpus = async ({
  schema,
  accepts,
  seed,
  mutations
}: {
  schema: unknown;
  accepts: Accepts;
  seed: number;
  mutations: number;
}): Promise<{ corpus: Corpus; summary: CorpusSummary }> => {
  const parts = schemaParts(schema);
  const docs = await readDocsCases();
  const unmutated = [
    ...(await readStarterCases()),
    ...docs.cases,
    ...targetedCases(builders(parts)),
    ...derivedCases(parts, seed)
  ];
  const bases = unmutated.filter((corpusCase) => accepts(corpusCase.config));
  const cases = [...unmutated, ...mutationCases(bases, mutations, seed)];
  const groups: Record<string, number> = {};
  for (const { group } of cases) groups[group] = (groups[group] ?? 0) + 1;
  return {
    corpus: { format: 1, seed, mutations, cases },
    summary: { groups, unparsableDocsExamples: docs.unparsable, mutationBases: bases.length }
  };
};
