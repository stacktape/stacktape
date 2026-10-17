import { afterEach, expect, test } from 'bun:test';
import { join } from 'node:path';
import { getHomeDir } from '@utils/misc';
import { localStatePaths } from './local-state-paths';

const originalProxyStateDirectory = process.env.STACKTAPE_DEV_PROXY_STATE_DIR;

afterEach(() => {
  if (originalProxyStateDirectory === undefined) {
    delete process.env.STACKTAPE_DEV_PROXY_STATE_DIR;
  } else {
    process.env.STACKTAPE_DEV_PROXY_STATE_DIR = originalProxyStateDirectory;
  }
});

// Released CLIs read and write these paths. Moving one logs users out, drops their defaults or loses local data.
test('local state stays at the paths released CLIs use', () => {
  const home = join(getHomeDir(), '.stacktape');
  const project = join(process.cwd(), 'example-project');
  delete process.env.STACKTAPE_DEV_PROXY_STATE_DIR;

  expect({
    persistedState: localStatePaths.persistedStateFile(),
    devProxy: localStatePaths.devProxyDirectory(),
    invocation: localStatePaths.invocationDirectory({ commandWorkingDirectory: project, invocationId: 'invocation-1' }),
    devData: localStatePaths.devResourceDataDirectory({ workingDirectory: project, stage: 'dev', resourceName: 'db' })
  }).toEqual({
    persistedState: join(home, 'persisted-state.json'),
    devProxy: join(home, 'dev-proxy'),
    invocation: join(project, '.stacktape', 'invocation-1'),
    devData: join(project, '.stacktape', 'dev-data', 'dev', 'db', 'data')
  });

  process.env.STACKTAPE_DEV_PROXY_STATE_DIR = join(process.cwd(), 'proxy-state');
  expect(localStatePaths.devProxyDirectory()).toBe(join(process.cwd(), 'proxy-state'));
});
