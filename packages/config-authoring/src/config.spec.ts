import { describe, expect, test } from 'bun:test';
import * as authoringExports from './index.js';
import { Bucket, defineConfig, RelationalDatabase } from './index.js';
import { RESOURCES_CONVERTIBLE_TO_CLASSES } from './class-config.js';
import * as resourceClasses from './resources.js';
import { AuroraServerlessV2EnginePostgresql } from './type-properties.js';

const getTransformedResourceOverrides = (overrides: Record<string, any>) => {
  const resource = new RelationalDatabase({
    credentials: { masterUserName: 'x', masterUserPassword: 'y' },
    engine: new AuroraServerlessV2EnginePostgresql({
      dbName: 'a',
      version: '15.10',
      minCapacity: 0.5,
      maxCapacity: 2
    }),
    overrides
  });
  const { config } = defineConfig(() => ({
    resources: {
      auroraPostgresDatabase: resource
    }
  }))({
    projectName: 'p',
    stage: 'staging',
    region: 'us-east-1',
    cliArgs: {},
    command: 'deploy',
    awsProfile: '',
    user: { id: '', name: '', email: '' }
  });

  return (config.resources.auroraPostgresDatabase as { overrides: Record<string, unknown> }).overrides;
};

describe('class config overrides transformation', () => {
  test('preserves dotted keys in map-like override values', () => {
    const overrides = getTransformedResourceOverrides({
      auroraDbInstanceParameterGroup: {
        Parameters: {
          'rds.allowed_extensions': '*'
        }
      }
    });

    const logicalOverrideValue = Object.values(overrides)[0] as Record<string, any>;
    expect(logicalOverrideValue.Parameters).toEqual({ 'rds.allowed_extensions': '*' });
    expect(logicalOverrideValue['Parameters.rds.allowed_extensions']).toBeUndefined();
  });

  test('preserves non-path-safe keys in map-like override values', () => {
    const overrides = getTransformedResourceOverrides({
      auroraDbInstanceParameterGroup: {
        Parameters: {
          'notify-keyspace-events': 'AKE'
        }
      }
    });

    const logicalOverrideValue = Object.values(overrides)[0] as Record<string, any>;
    expect(logicalOverrideValue.Parameters).toEqual({ 'notify-keyspace-events': 'AKE' });
    expect(logicalOverrideValue['Parameters.notify-keyspace-events']).toBeUndefined();
  });

  test('still flattens regular nested override objects', () => {
    const overrides = getTransformedResourceOverrides({
      dbSecurityGroup: {
        SecurityGroupIngress: {
          0: {
            Description: 'hello'
          }
        }
      }
    });

    const logicalOverrideValue = Object.values(overrides)[0] as Record<string, any>;
    expect(logicalOverrideValue['SecurityGroupIngress.0.Description']).toBe('hello');
  });
});

describe('TypeScript authoring compilation', () => {
  test('returns serializable config and executable transforms from one compilation', () => {
    const finalTransform = <Template extends { Resources: Record<string, any> }>(template: Template): Template =>
      template;
    const compiled = defineConfig(() => {
      const uploads = new Bucket({
        transforms: {
          bucket: (properties) => ({ ...properties, VersioningConfiguration: { Status: 'Enabled' } })
        }
      });
      return { resources: { uploads }, finalTransform };
    })({
      projectName: 'p',
      stage: 'test',
      region: 'eu-west-1',
      cliArgs: {},
      command: 'synth',
      awsProfile: ''
    });

    expect(compiled).toMatchObject({ format: 'stacktape-compiled-config', version: 1 });
    expect(compiled.config.resources.uploads).not.toHaveProperty('transforms');
    const [bucketTransform] = Object.values(compiled.transforms);
    expect(bucketTransform).toBeFunction();
    if (!bucketTransform) {
      throw new Error('Expected the bucket transform to be compiled.');
    }
    expect(bucketTransform({ BucketName: 'uploads' })).toEqual({
      BucketName: 'uploads',
      VersioningConfiguration: { Status: 'Enabled' }
    });
    expect(compiled.finalTransform).toBe(finalTransform);
  });

  test('rejects registering one resource instance under two names', () => {
    const uploads = new Bucket({});
    const config = defineConfig(() => ({ resources: { uploads, duplicate: uploads } }));

    expect(() =>
      config({
        projectName: 'p',
        stage: 'test',
        region: 'eu-west-1',
        cliArgs: {},
        command: 'synth',
        awsProfile: ''
      })
    ).toThrow('cannot be registered as both "uploads" and "duplicate"');
  });

  test('exports every configured resource constructor at runtime', () => {
    const expectedClassNames = RESOURCES_CONVERTIBLE_TO_CLASSES.map(({ className }) => className).toSorted();
    const exportedConstructors: Record<string, unknown> = { ...authoringExports };

    expect(Object.keys(resourceClasses).toSorted()).toEqual(expectedClassNames);
    for (const className of expectedClassNames) {
      expect(exportedConstructors[className]).toBeFunction();
    }
  });
});
