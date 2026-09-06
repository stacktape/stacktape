import { afterAll, expect, mock, test } from 'bun:test';

let attempts = 0;
let targetInitiallyUnavailable = false;
const denied = Object.assign(new Error('SSM access denied'), { name: 'AccessDeniedException' });
mock.module('@application-services/global-state-manager', () => ({
  globalStateManager: { region: 'eu-west-1', userData: { id: 'fixture' } }
}));
mock.module('@application-services/tui-manager', () => ({ tuiManager: { debug() {} } }));
mock.module('./aws-sdk-manager', () => ({
  awsSdkManager: {
    systemsManager: {
      startSession: async () => {
        attempts++;
        if (targetInitiallyUnavailable && attempts === 1)
          throw Object.assign(new Error('TargetNotConnected'), { name: 'TargetNotConnected' });
        throw denied;
      }
    }
  }
}));
afterAll(() => mock.restore());
const connect = async () => {
  const { SsmPortForwardingTunnel } = await import('./ssm-session');
  return new SsmPortForwardingTunnel({
    localPort: 15433,
    targetInfo: {
      bastionInstanceId: 'i-fixture',
      remoteHost: 'fixture.internal',
      remotePort: 5432
    } as ConstructorParameters<typeof SsmPortForwardingTunnel>[0]['targetInfo']
  }).connect();
};

test('an SSM denial preserves the original error without retrying', async () => {
  attempts = 0;
  targetInitiallyUnavailable = false;
  await expect(connect()).rejects.toBe(denied);
  expect(attempts).toBe(1);
});
test('a disconnected SSM target retries before reporting a subsequent terminal failure', async () => {
  attempts = 0;
  targetInitiallyUnavailable = true;
  await expect(connect()).rejects.toBe(denied);
  expect(attempts).toBe(2);
});
