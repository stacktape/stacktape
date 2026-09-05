import { describe, expect, test } from 'bun:test';
import configSchema from '@stacktape/config/config-schema.json';
import { equals, getAtt, ref } from '@stacktape/cloudformation/intrinsics';
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
    expect(Object.keys(acceptedConfiguration.resources)).toEqual([
      'api',
      'primaryDsql',
      'realtime',
      'site',
      'transactionalEmail',
      'uploads'
    ]);
    expect(acceptedConfiguration.cloudformationResources?.LegacyTopic?.Type).toBe('AWS::SNS::Topic');
    expect(api.properties.packaging.type).toBe('stacktape-lambda-buildpack');
    expect(alarmDefinition.trigger.type).toBe('lambda-error-rate');
  });
});

describe('the generated configuration schema package export', () => {
  test('resolves the canonical committed schema', () => {
    expect(configSchema).toBe(canonicalConfigSchema);
    const resourceDefinitions = configSchema.definitions.StacktapeResourceDefinition.anyOf;
    const resourceDefinitionRefs = resourceDefinitions.map((definition) => definition.$ref);

    expect(resourceDefinitions.length).toBeGreaterThan(0);
    expect(new Set(resourceDefinitionRefs).size).toBe(resourceDefinitionRefs.length);
    for (const definitionRef of resourceDefinitionRefs) {
      const definitionName = definitionRef.replace('#/definitions/', '');
      expect(Object.hasOwn(configSchema.definitions, definitionName)).toBe(true);
    }
    expect(configSchema.definitions.AppSyncApiProps).toBeDefined();
    expect(configSchema.definitions.KafkaClusterProps).toBeDefined();
  });

  test('publishes defaults that match the authored and runtime configuration contract', () => {
    expect('default' in configSchema.definitions.EsLanguageSpecificConfig.properties.nodeVersion).toBe(false);
    expect(configSchema.definitions.PyLanguageSpecificConfig.properties.pythonVersion.default).toBe(3.12);
    expect(configSchema.definitions.LambdaFunctionLogging.properties.retentionDays.default).toBe(90);
    expect(configSchema.definitions.RedisLogging.properties.retentionDays.default).toBe(30);
    expect(configSchema.definitions.LambdaFunctionLogging.properties.logClass).toMatchObject({
      default: 'standard',
      enum: ['infrequent-access', 'standard']
    });
    expect(configSchema.definitions.OpenSearchLogRetentionSettings.properties.logClass.default).toBe('standard');
    expect(configSchema.definitions.WebSocketApiGatewayProps.properties.routeSelectionExpression.default).toBe(
      '$request.body.action'
    );
    expect(configSchema.definitions.DsqlDatabaseProps.properties.deletionProtection.default).toBe(false);

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
