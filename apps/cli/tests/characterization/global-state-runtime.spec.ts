import { describe, expect, test } from 'bun:test';
import { GlobalStateManager } from '@application-services/global-state-manager';

describe('global state runtime values', () => {
  test('reflects command arguments that are deliberately filled after initialization', () => {
    const state = new GlobalStateManager();
    state.persistedState = {
      systemId: 'test-system',
      cliArgsDefaults: {},
      otherDefaults: {}
    };
    state.awsConfigFileContent = {};
    state.rawCommands = ['dev'];
    state.rawArgs = { region: 'us-east-1' };

    expect(state.command).toBe('dev');
    expect(state.stage).toBeUndefined();
    expect(state.region).toBe('us-east-1');

    state.rawArgs.stage = 'dev';
    state.rawArgs.region = 'eu-west-1';

    expect(state.stage).toBe('dev');
    expect(state.region).toBe('eu-west-1');
  });

  test('does not retain an account selected before local credentials replace it', () => {
    const state = new GlobalStateManager();
    state.connectedAwsAccounts = [
      {
        id: 'connected-account',
        organizationId: 'organization',
        name: 'connected',
        awsAccountId: '111111111111',
        connectionMode: 'BASIC',
        state: 'ACTIVE',
        primaryRegions: ['eu-west-1'],
        defaultRegion: 'eu-west-1'
      }
    ];
    state.rawArgs = {};
    state.persistedState = {
      systemId: 'test-system',
      cliArgsDefaults: {},
      otherDefaults: {}
    };

    expect(state.targetAwsAccount.awsAccountId).toBe('111111111111');

    state.localTargetAwsAccount = {
      id: 'local-account',
      organizationId: 'local',
      name: 'local',
      awsAccountId: '222222222222',
      connectionMode: 'BASIC',
      state: 'ACTIVE',
      primaryRegions: ['eu-west-1'],
      defaultRegion: 'eu-west-1'
    };

    expect(state.targetAwsAccount.awsAccountId).toBe('222222222222');
  });
});
