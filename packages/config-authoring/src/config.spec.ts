import { describe, expect, test } from 'bun:test';
import * as authoringExports from './index.js';
import {
  Bucket,
  CustomResourceDefinition,
  CustomResourceInstance,
  defineConfig,
  EdgeLambdaFunction,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  LambdaS3FilesMount,
  LocalScript,
  RelationalDatabase
} from './index.js';
import { compileAuthoringConfig } from './config.js';
import {
  getResourceByType,
  MISC_TYPES_CONVERTIBLE_TO_CLASSES,
  RESOURCES_CONVERTIBLE_TO_CLASSES
} from './class-config.js';
import * as resourceClasses from './resources.js';
import * as typePropertyClasses from './type-properties.js';
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

  test('resolves direct resource and parameter references from the returned resource keys', () => {
    const api = new HttpApiGateway({});
    const database = new RelationalDatabase({
      credentials: { masterUserName: 'app', masterUserPassword: 'secret' },
      engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.micro' } } }
    });
    const handler = new LambdaFunction({
      packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/handler.ts' } },
      connectTo: [database],
      environment: { DATABASE_URL: database.connectionString },
      events: [
        {
          type: 'http-api-gateway',
          properties: { httpApiGatewayName: api, method: 'GET', path: '/' }
        }
      ]
    });

    const { config } = defineConfig(() => ({ resources: { api, database, handler } }))({
      projectName: 'p',
      stage: 'test',
      region: 'eu-west-1',
      cliArgs: {},
      command: 'synth',
      awsProfile: ''
    });
    const handlerProperties = config.resources.handler!.properties as Record<string, any>;

    expect(handlerProperties.connectTo).toEqual(['database']);
    expect(handlerProperties.environment).toEqual([
      { name: 'DATABASE_URL', value: "$ResourceParam('database','connectionString')" }
    ]);
    expect(handlerProperties.events[0].properties.httpApiGatewayName).toBe('api');
  });

  test('compiles typed helper classes to the same plain configuration shape', () => {
    const api = new HttpApiGateway({});
    const uploads = new Bucket({});
    const integration = new HttpApiIntegration({ httpApiGatewayName: api, method: 'POST', path: '/upload' });
    const mount = new LambdaS3FilesMount({
      accessPointArn: 'arn:aws:s3files:us-east-1:111111111111:fs/fs-abc/ap-abc',
      mountPath: '/mnt/data'
    });
    const handler = new LambdaFunction({
      packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/handler.ts' } },
      events: [integration],
      volumeMounts: [mount]
    });
    const seed = new LocalScript({ executeCommand: 'bun run seed.ts', connectTo: [uploads] });

    const { config } = compileAuthoringConfig({ resources: { api, handler, uploads }, scripts: { seed } });
    const handlerProperties = config.resources.handler!.properties as Record<string, any>;

    expect(handlerProperties.events).toEqual([
      {
        type: 'http-api-gateway',
        properties: { httpApiGatewayName: 'api', method: 'POST', path: '/upload' }
      }
    ]);
    expect(handlerProperties.volumeMounts).toEqual([
      {
        type: 's3files',
        properties: {
          accessPointArn: 'arn:aws:s3files:us-east-1:111111111111:fs/fs-abc/ap-abc',
          mountPath: '/mnt/data'
        }
      }
    ]);
    expect(config.scripts!.seed!.properties.connectTo).toEqual(['uploads']);
  });

  test('rejects references to resources omitted from the returned resources object', () => {
    const database = new RelationalDatabase({
      credentials: { masterUserName: 'app', masterUserPassword: 'secret' },
      engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.micro' } } }
    });
    const handler = new LambdaFunction({
      packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/handler.ts' } },
      environment: { DATABASE_URL: database.connectionString }
    });
    const config = defineConfig(() => ({ resources: { handler } }));

    expect(() =>
      config({
        projectName: 'p',
        stage: 'test',
        region: 'eu-west-1',
        cliArgs: {},
        command: 'synth',
        awsProfile: ''
      })
    ).toThrow('referenced but is not registered in the returned `resources` object');
  });

  test('fails clearly when a parameter reference is interpolated before compilation', () => {
    const database = new RelationalDatabase({
      credentials: { masterUserName: 'app', masterUserPassword: 'secret' },
      engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.micro' } } }
    });

    expect(() => `${database.connectionString}`).toThrow(
      'Pass it directly as a configuration value instead of interpolating it'
    );
  });

  test('does not retain a resource name between independent compilations', () => {
    const bucket = new Bucket({});

    expect(compileAuthoringConfig({ resources: { firstName: bucket } }).config.resources).toHaveProperty('firstName');
    expect(compileAuthoringConfig({ resources: { secondName: bucket } }).config.resources).toHaveProperty('secondName');
    expect(bucket).not.toHaveProperty('resourceName');
  });

  test('treats every top-level resource class as a resource, including the formerly misclassified classes', () => {
    const provisioner = new CustomResourceDefinition({
      packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/provisioner.ts' } }
    });
    const provisionedThing = new CustomResourceInstance({ definitionName: provisioner, resourceProperties: {} });
    const edgeHandler = new EdgeLambdaFunction({
      packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/edge.ts' } }
    });
    const api = new HttpApiGateway({ cdn: { enabled: true, edgeFunctions: { onRequest: edgeHandler } } });
    const { config } = compileAuthoringConfig({ resources: { api, edgeHandler, provisionedThing, provisioner } });

    expect((config.resources.provisionedThing!.properties as Record<string, unknown>).definitionName).toBe(
      'provisioner'
    );
    expect(
      ((config.resources.api!.properties as Record<string, any>).cdn.edgeFunctions as Record<string, unknown>).onRequest
    ).toBe('edgeHandler');

    for (const resourceType of [
      'custom-resource-definition',
      'custom-resource-instance',
      'deployment-script',
      'edge-lambda-function'
    ]) {
      expect(getResourceByType(resourceType)).toBeDefined();
      expect(MISC_TYPES_CONVERTIBLE_TO_CLASSES.some(({ typeValue }) => typeValue === resourceType)).toBe(false);
    }
  });

  test('exports every configured resource constructor at runtime', () => {
    const expectedClassNames = RESOURCES_CONVERTIBLE_TO_CLASSES.map(({ className }) => className).toSorted();
    const exportedConstructors: Record<string, unknown> = { ...authoringExports };

    expect(Object.keys(resourceClasses).toSorted()).toEqual(expectedClassNames);
    for (const className of expectedClassNames) {
      expect(exportedConstructors[className]).toBeFunction();
    }
  });

  test('exports every configured helper constructor at runtime', () => {
    const expectedClassNames = MISC_TYPES_CONVERTIBLE_TO_CLASSES.map(({ className }) => className).toSorted();
    const exportedConstructors: Record<string, unknown> = { ...authoringExports };

    expect(Object.keys(typePropertyClasses).toSorted()).toEqual(expectedClassNames);
    for (const className of expectedClassNames) {
      expect(exportedConstructors[className]).toBeFunction();
    }
  });
});
