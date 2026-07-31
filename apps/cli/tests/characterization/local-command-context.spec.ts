import { describe, expect, test } from 'bun:test';
import { GlobalStateManager } from '@application-services/global-state-manager';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';

const makeState = ({ projectName }: { projectName?: string } = {}) => {
  const state = new GlobalStateManager();
  state.rawArgs = {
    ...(projectName ? { projectName } : {}),
    region: 'eu-west-1',
    stage: 'dev'
  };
  state.persistedState = {
    systemId: 'test-system',
    cliArgsDefaults: {},
    otherDefaults: {}
  };
  state.awsConfigFileContent = {};
  state.localTargetAwsAccount = {
    id: 'local:123456789012',
    organizationId: 'local',
    name: 'test credentials',
    awsAccountId: '123456789012',
    connectionMode: 'BASIC',
    state: 'ACTIVE',
    primaryRegions: ['eu-west-1'],
    defaultRegion: 'eu-west-1'
  };
  return state;
};

describe('local command stack context', () => {
  test('uses projectName from config without a Console project', async () => {
    const state = makeState();

    await state.loadLocalTargetStackInfo({ configProjectName: 'config-project' });

    expect(state.targetStack).toEqual({
      projectName: 'config-project',
      stage: 'dev',
      stackName: 'config-project-dev',
      globallyUniqueStackHash: getGloballyUniqueStackHash({
        accountId: '123456789012',
        region: 'eu-west-1',
        stackName: 'config-project-dev'
      })
    });
  });

  test('lets the CLI projectName override the configured project', async () => {
    const state = makeState({ projectName: 'temporary-project' });

    await state.loadLocalTargetStackInfo({ configProjectName: 'config-project' });

    expect(state.targetStack.projectName).toBe('temporary-project');
    expect(state.targetStack.stackName).toBe('temporary-project-dev');
  });
});
