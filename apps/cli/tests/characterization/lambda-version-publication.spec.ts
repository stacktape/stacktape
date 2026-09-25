import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import {
  DynamoDbTable,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '@stacktape/config-authoring';
import { synthesizeFixture } from './synthesis-fixture';

/**
 * A function with `deployment` or `provisionedConcurrency` is invoked through an alias. The alias points at the version
 * a custom resource publishes, and CloudFormation runs that publisher only when its own properties change. A version
 * snapshots the function's configuration as well as its code, so a configuration-only change has to change the
 * publisher's properties too, or the alias keeps serving the old configuration after a successful deploy.
 */

const IDENTITY = 'versionedConfiguration';
const PLAINTEXT = 'greeting-plaintext';

const createConfig = ({
  greeting = `${PLAINTEXT}-1`,
  secretVersion = 'version-1',
  transformedMemory
}: { greeting?: string; secretVersion?: string; transformedMemory?: number } = {}) =>
  defineConfig(() => {
    const records = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'id', type: 'string' } } });
    // Behind a CodeDeploy alias.
    const releases = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }),
      connectTo: [records],
      environment: {
        GREETING: greeting,
        RELEASE_TOKEN: `{{resolve:secretsmanager:release-token:SecretString:::${secretVersion}}}`
      },
      deployment: { strategy: 'AllAtOnce' },
      ...(transformedMemory
        ? { transforms: { lambda: (properties) => ({ ...properties, MemorySize: transformedMemory }) } }
        : {})
    });
    // Behind an alias that exists only for provisioned concurrency.
    const warm = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
      environment: { GREETING: greeting },
      provisionedConcurrency: 1
    });
    return { resources: { records, releases, warm } };
  })({
    projectName: 'characterization',
    stage: 'baseline',
    region: 'eu-west-1',
    cliArgs: {} as any,
    command: 'synth',
    awsProfile: '',
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
  });

const synthesize = (options?: Parameters<typeof createConfig>[0]) =>
  synthesizeFixture({
    compiledConfig: createConfig(options),
    workingDir: join(import.meta.dir, 'fixtures', 'dense-application')
  });

const ALIASED_FUNCTIONS = ['releases', 'warm'] as const;
const functionOf = (template: CloudFormationTemplate, name: string) =>
  template.Resources[cfLogicalNames.lambda(name)] as { Properties: Record<string, any> };
const publisherOf = (template: CloudFormationTemplate, name: string) =>
  template.Resources[cfLogicalNames.lambdaVersionPublisherCustomResource(name)] as {
    Properties: Record<string, any>;
    DependsOn?: string | string[];
  };

/** Every leaf of `value` by its dotted path, with its JSON. */
const leaves = (value: unknown, path: string, into = new Map<string, string>()) => {
  if (value && typeof value === 'object') {
    const entries = Array.isArray(value)
      ? value.map((child, index) => [String(index), child] as const)
      : Object.entries(value);
    if (entries.length === 0) into.set(path, JSON.stringify(value));
    for (const [key, child] of entries) leaves(child, `${path}.${key}`, into);
    return into;
  }
  into.set(path, JSON.stringify(value));
  return into;
};

const changedResourcePaths = (before: CloudFormationTemplate, after: CloudFormationTemplate) => {
  const [left, right] = [before, after].map((template) => leaves(template.Resources, 'Resources'));
  return [...new Set([...left!.keys(), ...right!.keys()])]
    .filter((path) => left!.get(path) !== right!.get(path))
    .toSorted();
};

const containsNode = (value: unknown, node: unknown): boolean =>
  JSON.stringify(value) === JSON.stringify(node) ||
  (Boolean(value) &&
    typeof value === 'object' &&
    Object.values(value as Record<string, unknown>).some((child) => containsNode(child, node)));

describe('Lambda version publication', () => {
  let base: CloudFormationTemplate;
  let repeat: CloudFormationTemplate;
  let environmentChanged: CloudFormationTemplate;
  let secretChanged: CloudFormationTemplate;
  let transformed: CloudFormationTemplate;

  beforeAll(async () => {
    base = await synthesize();
    repeat = await synthesize();
    environmentChanged = await synthesize({ greeting: `${PLAINTEXT}-2` });
    secretChanged = await synthesize({ secretVersion: 'version-2' });
    transformed = await synthesize({ transformedMemory: 1536 });
  });

  test('a no-op resynthesis yields a byte-identical template', () => {
    expect(JSON.stringify(repeat)).toBe(JSON.stringify(base));
  });

  test('an environment-only change changes exactly the environment and each publisher identity', () => {
    const changed = changedResourcePaths(base, environmentChanged);
    const environmentPaths = ALIASED_FUNCTIONS.map(
      (name) => `Resources.${cfLogicalNames.lambda(name)}.Properties.Environment.Variables.GREETING`
    );
    const identityPrefixes = ALIASED_FUNCTIONS.map(
      (name) => `Resources.${cfLogicalNames.lambdaVersionPublisherCustomResource(name)}.Properties.${IDENTITY}`
    );
    const unexpected = changed.filter(
      (path) => !environmentPaths.includes(path) && !identityPrefixes.some((prefix) => path.startsWith(prefix))
    );
    expect(unexpected).toEqual([]);
    expect(environmentPaths.every((path) => changed.includes(path))).toBe(true);
    for (const prefix of identityPrefixes) {
      expect(changed.filter((path) => path.startsWith(prefix)).length).toBeGreaterThan(0);
    }
  });

  test('an intrinsic in the environment stays an intrinsic in the identity', () => {
    const variables = functionOf(base, 'releases').Properties.Environment.Variables as Record<string, unknown>;
    const intrinsics = Object.values(variables).filter((value) => value && typeof value === 'object');
    expect(intrinsics.length).toBeGreaterThan(0);
    const identity = publisherOf(base, 'releases').Properties[IDENTITY];
    for (const intrinsic of intrinsics) {
      expect(containsNode(identity, intrinsic)).toBe(true);
    }
  });

  test('the identity carries no secret reference or plaintext value, but follows the pinned reference', () => {
    for (const name of ALIASED_FUNCTIONS) {
      const publisher = JSON.stringify(publisherOf(base, name));
      expect(publisher).not.toContain('{{resolve:');
      expect(publisher).not.toContain(PLAINTEXT);
    }
    const before = publisherOf(base, 'releases').Properties[IDENTITY];
    const after = publisherOf(secretChanged, 'releases').Properties[IDENTITY];
    expect(before).toBeDefined();
    expect(after).not.toEqual(before);
  });

  test('a memory change made by a resource transform changes the identity', () => {
    expect(functionOf(base, 'releases').Properties.MemorySize).not.toBe(1536);
    expect(functionOf(transformed, 'releases').Properties.MemorySize).toBe(1536);
    const before = publisherOf(base, 'releases').Properties[IDENTITY];
    expect(before).toBeDefined();
    expect(publisherOf(transformed, 'releases').Properties[IDENTITY]).not.toEqual(before);
  });

  test('the publisher keeps its code digest and runs after the function, and the alias after the publisher', () => {
    for (const name of ALIASED_FUNCTIONS) {
      const publisher = publisherOf(base, name);
      expect(publisher.Properties).toHaveProperty('codeDigest');
      expect([publisher.DependsOn ?? []].flat()).toContain(cfLogicalNames.lambda(name));
      const alias = base.Resources[cfLogicalNames.lambdaStpAlias(name)] as { DependsOn?: string | string[] };
      expect([alias.DependsOn ?? []].flat()).toContain(cfLogicalNames.lambdaVersionPublisherCustomResource(name));
    }
  });
});
