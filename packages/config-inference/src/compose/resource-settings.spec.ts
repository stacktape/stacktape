import { describe, expect, it } from 'bun:test';
import Ajv from 'ajv';
import configSchema from '@stacktape/config/config-schema.json' with { type: 'json' };
import {
  applySetting,
  applyWrites,
  isDomainName,
  isSettingChange,
  settingsForResource,
  settingWrites,
  type SettingsContext
} from './resource-settings';

const ajv = new Ajv({ allErrors: true });
const validateConfig = ajv.compile(configSchema as object);

const context: SettingsContext = { engineVersions: { postgres: ['18', '17', '16', '15', '14', '13'] } };

/** One of each resource the wizard composes, shaped the way the composition writes them. */
const RESOURCES: Record<string, { type: string; properties: Record<string, unknown> }> = {
  mainDatabase: {
    type: 'relational-database',
    properties: {
      credentials: { masterUserName: 'stacktape', masterUserPassword: "$Secret('demo-mainDatabase.password')" },
      engine: { type: 'postgres', properties: { primaryInstance: { instanceSize: 'db.t4g.micro' }, version: '18' } },
      deletionProtection: true,
      automatedBackupRetentionDays: 7,
      alarms: [
        {
          description: 'Database has less than 2 GiB of free storage',
          trigger: { type: 'database-free-storage', properties: { thresholdMB: 2048 } },
          evaluation: { period: 300, evaluationPeriods: 3, breachedPeriods: 2 },
          includeInHistory: true
        }
      ]
    }
  },
  app: {
    type: 'nextjs-web',
    properties: { appDirectory: '.', serverLambda: { joinDefaultVpc: true }, connectTo: ['mainDatabase'] }
  },
  api: {
    type: 'web-service',
    properties: {
      packaging: { type: 'prebuilt-image', properties: { image: 'nginx:1.27' } },
      resources: { cpu: 0.5, memory: 1024 },
      scaling: { minInstances: 1, maxInstances: 3 }
    }
  },
  worker: {
    type: 'worker-service',
    properties: {
      packaging: { type: 'prebuilt-image', properties: { image: 'busybox:1.37' } },
      resources: { cpu: 0.25, memory: 512 }
    }
  },
  site: { type: 'hosting-bucket', properties: { uploadDirectoryPath: 'dist' } },
  files: { type: 'bucket', properties: {} },
  disk: { type: 'efs-filesystem', properties: { backupEnabled: true } },
  databaseBastion: { type: 'bastion', properties: { instanceSize: 't3.micro' } },
  cache: {
    type: 'redis',
    properties: {
      engine: { type: 'valkey', properties: { instanceSize: 'cache.t4g.micro' } },
      defaultUserPassword: "$Secret('demo-cache.password')"
    }
  },
  handler: {
    type: 'function',
    properties: {
      packaging: { type: 'custom-artifact', properties: { packagePath: 'dist/handler.zip', handler: 'index.handler' } }
    }
  }
};

const valid = (resources: typeof RESOURCES): string | undefined =>
  validateConfig({ projectName: 'demo', resources })
    ? undefined
    : (validateConfig.errors ?? []).map((error) => `${error.dataPath} ${error.message}`).join('\n');

describe('resource settings', () => {
  it('start from a file the schema accepts', () => {
    expect(valid(RESOURCES)).toBeUndefined();
  });

  it('write only configuration the Stacktape schema accepts, for every option of every setting', () => {
    const rejected: string[] = [];
    for (const [name, resource] of Object.entries(RESOURCES)) {
      for (const setting of settingsForResource(resource, context)) {
        if (setting.preference !== undefined || setting.disabledReason !== undefined) continue;
        const values = setting.control === 'domain' ? ['app.example.com', ''] : setting.options.map((o) => o.value);
        for (const value of values) {
          const properties = applySetting(resource, { setting: setting.id, value }, context);
          if (properties === undefined) {
            if (setting.options.find((option) => option.value === value)?.disabledReason === undefined) {
              rejected.push(`${name}.${setting.id}=${String(value)} was refused`);
            }
            continue;
          }
          const problem = valid({ ...RESOURCES, [name]: { ...resource, properties } });
          if (problem !== undefined) rejected.push(`${name}.${setting.id}=${String(value)}: ${problem}`);
          // Reading it back gives the value written.
          const after = settingsForResource({ ...resource, properties }, context).find((s) => s.id === setting.id);
          if (after?.value !== value)
            rejected.push(`${name}.${setting.id}=${String(value)} reads back ${after?.value}`);
        }
      }
    }
    expect(rejected).toEqual([]);
  });

  it('read the composed values, with the AWS name beside the plain one', () => {
    const database = settingsForResource(RESOURCES.mainDatabase!, context);
    const byId = Object.fromEntries(database.map((setting) => [setting.id, setting]));
    expect(byId.instanceSize).toMatchObject({ value: 'db.t4g.micro', awsTerm: 'Instance class', control: 'size' });
    expect(byId.multiAz).toMatchObject({ value: false, label: 'Standby copy', awsTerm: 'Multi-AZ' });
    expect(byId.backupRetention?.value).toBe(7);
    expect(byId.access).toMatchObject({ value: 'public', preference: 'databaseAccess' });
    expect(byId.version).toMatchObject({ value: '18', label: 'Postgres version' });
    expect(byId.version?.options.map((option) => option.value)).toEqual(['18', '17', '16', '15', '14']);
    expect(byId.alarmFreeStorage?.value).toBe(true);
    expect(byId.alarmCpu?.value).toBe(false);
    // Grouped in display order: size first, alerts last.
    expect(database[0]?.group).toBe('size');
    expect(database.at(-1)?.group).toBe('alerts');
  });

  it('keep a value set by hand among the options instead of showing another one', () => {
    const database = {
      ...RESOURCES.mainDatabase!,
      properties: applyWrites(RESOURCES.mainDatabase!.properties, [
        { path: ['engine', 'properties', 'primaryInstance', 'instanceSize'], value: 'db.m6g.2xlarge' }
      ])
    };
    const size = settingsForResource(database, context).find((setting) => setting.id === 'instanceSize')!;
    expect(size.value).toBe('db.m6g.2xlarge');
    expect(size.options[0]).toMatchObject({ value: 'db.m6g.2xlarge', label: 'db.m6g.2xlarge' });
  });

  it('keep what else is under the path it writes, and leave no empty objects behind', () => {
    const app = RESOURCES.app!;
    const bigger = applySetting(app, { setting: 'memory', value: 2048 })!;
    expect(bigger.serverLambda).toEqual({ joinDefaultVpc: true, memory: 2048 });
    // Back to the default: the key goes, the rest stays.
    expect(applySetting({ ...app, properties: bigger }, { setting: 'memory', value: 1024 })!.serverLambda).toEqual({
      joinDefaultVpc: true
    });
    const roomy = applySetting(RESOURCES.mainDatabase!, { setting: 'storage', value: 250 })!;
    expect((roomy.engine as { properties: { storage: unknown } }).properties.storage).toEqual({
      initialSize: 250,
      maxSize: 500
    });
    expect(
      (applySetting(RESOURCES.mainDatabase!, { setting: 'storage', value: 20 })!.engine as { properties: object })
        .properties
    ).not.toHaveProperty('storage');
  });

  it('keep dependent values consistent', () => {
    const api = RESOURCES.api!;
    // Three copies always running cannot scale to at most one.
    expect(applySetting(api, { setting: 'minInstances', value: 3 })!.scaling).toEqual({
      minInstances: 3,
      maxInstances: 3
    });
    const maxOptions = settingsForResource({
      ...api,
      properties: applySetting(api, { setting: 'minInstances', value: 3 })!
    })
      .find((setting) => setting.id === 'maxInstances')!
      .options.filter((option) => option.disabledReason !== undefined)
      .map((option) => option.value);
    expect(maxOptions).toEqual([1, 2]);
    // Rendering at the edge rules out warm copies and streaming.
    const edge = applySetting(
      {
        ...RESOURCES.app!,
        properties: { ...RESOURCES.app!.properties, warmServerInstances: 3, streamingEnabled: true }
      },
      { setting: 'edge', value: true }
    )!;
    expect(edge).toMatchObject({ useEdgeLambda: true });
    expect(edge).not.toHaveProperty('warmServerInstances');
    expect(settingWrites({ type: 'nextjs-web', properties: edge }, { setting: 'streaming', value: true })).toEqual({
      refused: 'Not available while it renders at the edge (Lambda@Edge)'
    });
    // The primary's size carries to its read copies.
    const replicated = applySetting(RESOURCES.mainDatabase!, { setting: 'readReplicas', value: 1 })!;
    const resized = applySetting(
      { ...RESOURCES.mainDatabase!, properties: replicated },
      { setting: 'instanceSize', value: 'db.t4g.large' }
    )!;
    expect((resized.engine as { properties: { readReplicas: unknown } }).properties.readReplicas).toEqual([
      { instanceSize: 'db.t4g.large' }
    ]);
  });

  it('pins a service with a data disk to one copy', () => {
    const pinned = { ...RESOURCES.api!, properties: { ...RESOURCES.api!.properties, volumeMounts: [{}] } };
    const settings = settingsForResource(pinned);
    expect(settings.find((setting) => setting.id === 'minInstances')?.disabledReason).toMatch(/one copy/);
    expect('refused' in settingWrites(pinned, { setting: 'minInstances', value: 2 })).toBe(true);
  });

  it('refuse anything it did not offer', () => {
    const database = RESOURCES.mainDatabase!;
    expect(settingWrites(database, { setting: 'instanceSize', value: 'db.x2iedn.32xlarge' })).toEqual({
      refused: 'That is not one of the options.'
    });
    expect(settingWrites(database, { setting: 'masterUserPassword', value: 'x' })).toEqual({
      refused: 'That setting does not apply to this resource.'
    });
    expect('refused' in settingWrites(database, { setting: 'access', value: 'private' })).toBe(true);
    expect(settingWrites(RESOURCES.site!, { setting: 'customDomain', value: 'https://example.com' })).toEqual({
      refused: 'https://example.com is not a domain name.'
    });
    expect(settingsForResource({ type: 'sns-topic', properties: {} })).toEqual([]);
  });

  it('checks the shape of a change from the page', () => {
    expect(isSettingChange({ resource: 'db', setting: 'multiAz', value: true })).toBe(true);
    expect(isSettingChange({ resource: 'db', setting: 'multiAz', value: { nested: true } })).toBe(false);
    expect(isSettingChange({ resource: 'db', setting: 'multiAz', value: true, extra: 1 })).toBe(false);
    expect(isSettingChange({ resource: '', setting: 'multiAz', value: true })).toBe(false);
    expect(isDomainName('app.example.com')).toBe(true);
    expect(isDomainName('example')).toBe(false);
    expect(isDomainName('-bad.example.com')).toBe(false);
  });
});
