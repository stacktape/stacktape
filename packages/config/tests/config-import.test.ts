import { describe, expect, test } from 'bun:test';
import configSchema from '@stacktape/config/config-schema.json';
import { equals, getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import { CONNECT_TO_AWS_SERVICE_MACROS } from '../src/aws-service-macros';
import canonicalConfigSchema from '../generated/config-schema.json';
import { acceptedConfiguration, alarmDefinition, api, rawSubscription } from './config-import.acceptance';

/**
 * The runtime half of the package's acceptance check.
 *
 * The configuration it asserts against is built in `config-import.acceptance.ts`, which the package's own
 * strict project compiles with `types: []`. This file needs `@types/bun` for `bun:test`, and Bun's declarations and
 * @types/node disagree about a few web-stream globals, so it compiles under `tests/tsconfig.json` instead.
 */

describe('a Stacktape configuration can be built from explicit package imports', () => {
  test('the authored resource model, packaging, events and escape hatch compose', () => {
    expect(Object.keys(acceptedConfiguration.resources)).toEqual(['api', 'site', 'uploads']);
    expect(acceptedConfiguration.cloudformationResources?.LegacyTopic?.Type).toBe('AWS::SNS::Topic');
    expect(api.properties.packaging.type).toBe('stacktape-lambda-buildpack');
    expect(alarmDefinition.trigger.type).toBe('lambda-error-rate');
  });
});

describe('the generated configuration schema package export', () => {
  test('resolves the canonical committed schema', () => {
    expect(configSchema).toBe(canonicalConfigSchema);
    expect(Object.keys(configSchema.definitions)).toHaveLength(444);
    expect(configSchema.definitions.StacktapeResourceDefinition.anyOf).toHaveLength(44);
  });

  test('publishes defaults that match the authored and runtime configuration contract', () => {
    expect('default' in configSchema.definitions.EsLanguageSpecificConfig.properties.nodeVersion).toBe(false);
    expect(configSchema.definitions.PyLanguageSpecificConfig.properties.pythonVersion.default).toBe(3.12);
    expect(configSchema.definitions.LambdaFunctionLogging.properties.retentionDays.default).toBe(90);
    expect(configSchema.definitions.RedisLogging.properties.retentionDays.default).toBe(30);

    // These defaults depend on another property or the containing log type. They are applied by the
    // packaging/synthesis runtime and cannot be represented by one scalar JSON Schema default.
    expect('default' in configSchema.definitions.EsLanguageSpecificConfig.properties.outputModuleFormat).toBe(false);
    expect('default' in configSchema.definitions.OpenSearchLogRetentionSettings.properties.retentionDays).toBe(false);
  });

  test('publishes current configuration documentation links', () => {
    const publishedSchema = JSON.stringify(configSchema);
    expect(publishedSchema).toContain('https://docs.stacktape.com/configuration/referenceable-parameters/');
    expect(publishedSchema).not.toContain('https://docs.stacktape.com/configuration/referencing-parameters/');
  });

  test('never publishes a default outside its declared JSON Schema type or enum', () => {
    const invalidDefaults: string[] = [];

    const visit = (node: unknown, path: string[] = []) => {
      if (!node || typeof node !== 'object') return;

      const schemaNode = node as {
        default?: unknown;
        enum?: unknown[];
        type?: string | string[];
        [key: string]: unknown;
      };
      if (Object.hasOwn(schemaNode, 'default')) {
        const declaredTypes = schemaNode.type
          ? Array.isArray(schemaNode.type)
            ? schemaNode.type
            : [schemaNode.type]
          : [];
        const actualType =
          schemaNode.default === null
            ? 'null'
            : Array.isArray(schemaNode.default)
              ? 'array'
              : Number.isInteger(schemaNode.default)
                ? 'integer'
                : typeof schemaNode.default;
        const matchesType =
          declaredTypes.length === 0 ||
          declaredTypes.includes(actualType) ||
          (actualType === 'integer' && declaredTypes.includes('number'));
        const matchesEnum =
          schemaNode.enum === undefined || schemaNode.enum.some((value) => Object.is(value, schemaNode.default));

        if (!matchesType || !matchesEnum) invalidDefaults.push(path.join('.'));
      }

      for (const [key, value] of Object.entries(schemaNode)) visit(value, [...path, key]);
    };

    visit(configSchema);
    expect(invalidDefaults).toEqual([]);
  });
});

describe('the CloudFormation value vocabulary the escape hatch is written against', () => {
  test('intrinsic helpers return the plain single-key objects CloudFormation expects', () => {
    expect(ref('MyBucket')).toEqual({ Ref: 'MyBucket' });
    expect(getAtt('MyBucket', 'Arn')).toEqual({ 'Fn::GetAtt': ['MyBucket', 'Arn'] });
    expect(equals('a', 'b')).toEqual({ 'Fn::Equals': ['a', 'b'] });
  });

  test('intrinsics survive serialisation from inside a raw resource', () => {
    expect(JSON.parse(JSON.stringify(rawSubscription))).toEqual({
      Type: 'AWS::SNS::Subscription',
      Properties: { TopicArn: { Ref: 'Topic' } },
      Condition: 'CreateRawResources'
    });
  });
});

describe('connectTo AWS service macros', () => {
  test('are the authored vocabulary, owned here rather than read back out of the CLI resolver', () => {
    expect(CONNECT_TO_AWS_SERVICE_MACROS).toEqual(['aws:ses']);
    // The CLI narrows `connectTo` entries with this list, so membership must be a real runtime check.
    expect(CONNECT_TO_AWS_SERVICE_MACROS.includes('aws:ses')).toBe(true);
    expect((CONNECT_TO_AWS_SERVICE_MACROS as readonly string[]).includes('myDatabase')).toBe(false);
  });
});
