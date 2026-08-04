import { describe, expect, test } from 'bun:test';
import { type ConfigJsonSchema, restoreImportedConfigTypes } from './config-schema-overrides';

describe('imported config-schema types', () => {
  test('restores the imported Intrinsic union without replacing authored property metadata', () => {
    const accessPointArn: ConfigJsonSchema = { description: 'Access point ARN' };
    const schema: ConfigJsonSchema = {
      definitions: {
        LambdaS3FilesMountProps: { properties: { accessPointArn } }
      }
    };

    restoreImportedConfigTypes({ schema });

    expect(accessPointArn).toEqual({
      description: 'Access point ARN',
      anyOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: expect.any(Object),
          minProperties: 1,
          maxProperties: 1,
          additionalProperties: false
        }
      ]
    });
    const intrinsicSchema = (accessPointArn.anyOf as ConfigJsonSchema[])[1];
    expect(Object.keys(intrinsicSchema.properties ?? {})).toHaveLength(16);
  });

  test('fails closed if the source model moves and the bridge no longer has a target', () => {
    expect(() => restoreImportedConfigTypes({ schema: { definitions: {} } })).toThrow(
      'LambdaS3FilesMountProps.accessPointArn is missing'
    );
  });
});
