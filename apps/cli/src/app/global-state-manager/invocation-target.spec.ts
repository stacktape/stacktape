import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configProvidedArgs, resolveInvocationTarget } from './invocation-target';

const directories: string[] = [];
const projectWith = (name: string, content: string) => {
  const directory = mkdtempSync(join(tmpdir(), 'stp-invocation-target-'));
  directories.push(directory);
  writeFileSync(join(directory, name), content);
  return directory;
};
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const SETTINGS =
  "export default defineConfig({ projectName: 'shop', region: 'eu-central-1' }, () => ({ resources: {} }));";
const ambient = {
  defaults: { projectName: 'machine-default', region: 'us-west-2' },
  envRegion: 'us-east-2',
  profileRegion: 'ap-southeast-2'
};

describe('the invocation target', () => {
  test('a project config beats every ambient source, and a flag beats the config', async () => {
    const cwd = projectWith('stacktape.ts', SETTINGS);
    const fromConfig = await resolveInvocationTarget({ command: 'deploy', args: {}, cwd, ...ambient });
    expect(fromConfig).toMatchObject({
      projectName: { value: 'shop', source: 'config' },
      region: { value: 'eu-central-1', source: 'config' },
      configPath: join(cwd, 'stacktape.ts')
    });
    expect(configProvidedArgs(fromConfig)).toEqual({ projectName: 'shop', region: 'eu-central-1' });

    const fromFlags = await resolveInvocationTarget({
      command: 'deploy',
      args: { projectName: 'other', region: 'us-west-1' },
      cwd,
      ...ambient
    });
    expect(fromFlags).toMatchObject({
      projectName: { value: 'other', source: 'flag' },
      region: { value: 'us-west-1', source: 'flag' }
    });
    expect(configProvidedArgs(fromFlags)).toEqual({});
  });

  type RegionSources = { envRegion?: string; defaultRegion?: string; profileRegion?: string };
  test.each<[RegionSources, string, string]>([
    [{ envRegion: 'us-east-2', defaultRegion: 'us-west-2', profileRegion: 'ap-southeast-2' }, 'us-east-2', 'env'],
    [{ defaultRegion: 'us-west-2', profileRegion: 'ap-southeast-2' }, 'us-west-2', 'default'],
    [{ profileRegion: 'ap-southeast-2' }, 'ap-southeast-2', 'profile']
  ])('outside a project the earlier order applies: %j', async (sources, value, source) => {
    const cwd = projectWith('README.md', '');
    const target = await resolveInvocationTarget({
      command: 'deploy',
      args: {},
      cwd,
      envRegion: sources.envRegion,
      defaults: { region: sources.defaultRegion },
      profileRegion: sources.profileRegion
    });
    expect(target.region).toEqual({ value, source } as never);
    expect(target.settings).toBeUndefined();
  });

  test('a command takes only the settings it accepts, and excluded commands take none', async () => {
    const cwd = projectWith('stacktape.ts', SETTINGS);
    expect(configProvidedArgs(await resolveInvocationTarget({ command: 'secret:set', args: {}, cwd }))).toEqual({
      region: 'eu-central-1'
    });
    expect(configProvidedArgs(await resolveInvocationTarget({ command: 'incidents', args: {}, cwd }))).toEqual({});
    expect(await resolveInvocationTarget({ command: 'help', args: {}, cwd })).toEqual({ appliedSettings: [] });
  });

  test('a broken config stops commands that load it and is ignored by the others', async () => {
    const cwd = projectWith('stacktape.ts', 'export default defineConfig({ region: pickRegion() }, () => ({}));');
    await expect(resolveInvocationTarget({ command: 'deploy', args: {}, cwd })).rejects.toMatchObject({
      code: 'CONFIG_PROJECT_SETTINGS_INVALID'
    });
    const ignored: unknown[] = [];
    const target = await resolveInvocationTarget({
      command: 'secret:get',
      args: { region: 'eu-west-1' },
      cwd,
      onIgnoredError: (error) => ignored.push(error)
    });
    expect(target.region).toEqual({ value: 'eu-west-1', source: 'flag' });
    expect(ignored).toHaveLength(1);
  });

  test('a preset config supplies the settings instead of the file', async () => {
    const cwd = projectWith('stacktape.ts', SETTINGS);
    const target = await resolveInvocationTarget({
      command: 'deploy',
      args: {},
      cwd,
      presetConfig: { projectName: 'preset', region: 'eu-west-2', resources: {} }
    });
    expect(configProvidedArgs(target)).toEqual({ projectName: 'preset', region: 'eu-west-2' });
  });
});

describe('config files the target cannot read', () => {
  test('a missing --config file leaves the error to config loading, which names the file', async () => {
    const cwd = projectWith('stacktape.ts', SETTINGS);
    expect(await resolveInvocationTarget({ command: 'deploy', args: { configPath: 'missing.yml' }, cwd })).toEqual({
      appliedSettings: ['projectName', 'region']
    });
  });
});
