import { afterEach, expect, test } from 'bun:test';
import { join } from 'node:path';
import { getHomeDir } from '@utils/misc';
import { localStatePaths } from './local-state-paths';

const originalEnvironment = {
  STACKTAPE_DEV_PROXY_STATE_DIR: process.env.STACKTAPE_DEV_PROXY_STATE_DIR,
  STACKTAPE_DEV_AGENT_TOKEN_DIR: process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR
};

afterEach(() => {
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

// Released CLIs read and write these paths. Moving one logs users out, drops their defaults or loses local data.
test('local state stays at the paths released CLIs use', () => {
  const home = join(getHomeDir(), '.stacktape');
  const project = join(process.cwd(), 'example-project');
  delete process.env.STACKTAPE_DEV_PROXY_STATE_DIR;
  delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;

  expect({
    persistedState: localStatePaths.persistedStateFile(),
    devProxy: localStatePaths.devProxyDirectory(),
    invocation: localStatePaths.invocationDirectory({ commandWorkingDirectory: project, invocationId: 'invocation-1' }),
    devData: localStatePaths.devResourceDataDirectory({ workingDirectory: project, stage: 'dev', resourceName: 'db' }),
    // Lock files are named by project and stage only, so they must stay inside the checkout.
    devAgent: localStatePaths.devAgentDirectory({ workingDirectory: project }),
    devAgentRegistry: localStatePaths.devAgentRegistryDirectory({ workingDirectory: project }),
    // Clients find a running agent's token by port alone, from any directory and any CLI version.
    devAgentToken: localStatePaths.devAgentTokenFile({ port: 7331 })
  }).toEqual({
    persistedState: join(home, 'persisted-state.json'),
    devProxy: join(home, 'dev-proxy'),
    invocation: join(project, '.stacktape', 'invocation-1'),
    devData: join(project, '.stacktape', 'dev-data', 'dev', 'db', 'data'),
    devAgent: join(project, '.stacktape', 'dev-agent'),
    devAgentRegistry: join(project, '.stacktape', 'dev-agents'),
    devAgentToken: join(home, 'dev-agent-tokens', '7331.token')
  });

  process.env.STACKTAPE_DEV_PROXY_STATE_DIR = join(process.cwd(), 'proxy-state');
  expect(localStatePaths.devProxyDirectory()).toBe(join(process.cwd(), 'proxy-state'));
});
