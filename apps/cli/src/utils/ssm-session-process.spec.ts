import { afterAll, expect, mock, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspect } from 'node:util';

const directory = mkdtempSync(join(tmpdir(), 'stacktape-ssm-process-'));
const plugin = join(directory, 'session-manager-plugin');
const pidFile = join(directory, 'pid');
const syntheticToken = 'synthetic-ssm-token-must-not-appear-in-errors';
let mode = 'ready-exit-zero';
const terminated = new Set<string>();
writeFileSync(
  plugin,
  `#!${process.execPath}
import { writeFileSync } from 'node:fs';
const session = JSON.parse(process.argv[2]);
writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
if (session.SessionId === 'before-ready') {
  console.error(session.TokenValue);
  process.exit(7);
}
if (session.SessionId === 'ignore-term') {
  process.on('SIGTERM', () => {});
  setInterval(() => {}, 1000);
} else {
  setTimeout(() => process.exit(session.SessionId === 'ready-exit-zero' ? 0 : 7), 200);
}
console.log('Waiting for connections...');
`,
  { mode: 0o755 }
);
mock.module('@application-services/global-state-manager', () => ({
  globalStateManager: { region: 'eu-west-1', userData: { id: 'fixture' } }
}));
mock.module('@application-services/tui-manager', () => ({ tuiManager: { debug() {} } }));
mock.module('src/config/runtime-paths', () => ({ fsPaths: { sessionManagerPath: () => plugin } }));
mock.module('./aws-sdk-manager', () => ({
  awsSdkManager: {
    systemsManager: {
      startSession: async () => ({ SessionId: mode, TokenValue: syntheticToken }),
      terminateSession: async ({ sessionId }: { sessionId: string }) => terminated.add(sessionId)
    }
  }
}));
afterAll(() => {
  mock.restore();
  rmSync(directory, { recursive: true, force: true });
});
const createTunnel = async () => {
  const { SsmPortForwardingTunnel } = await import('./ssm-session');
  return new SsmPortForwardingTunnel({
    localPort: 15433,
    targetInfo: {
      bastionInstanceId: 'i-fixture',
      remoteHost: 'fixture.internal',
      remotePort: 5432
    } as ConstructorParameters<typeof SsmPortForwardingTunnel>[0]['targetInfo']
  });
};

for (const exitMode of ['ready-exit-zero', 'ready-exit-failure']) {
  test(`observes the real plugin closing after readiness: ${exitMode}`, async () => {
    mode = exitMode;
    const tunnel = await createTunnel();
    try {
      await tunnel.connect();
      const pid = Number(readFileSync(pidFile, 'utf8'));
      expect(() => process.kill(pid, 0)).not.toThrow();
      await tunnel.waitForExit();
      expect(() => process.kill(pid, 0)).toThrow();
    } finally {
      await tunnel.kill();
    }
    expect(terminated.has(exitMode)).toBe(true);
  });
}

test('startup failure is immediate and does not retain token-bearing argv or stderr', async () => {
  mode = 'before-ready';
  const tunnel = await createTunnel();
  try {
    const error = await tunnel.connect().catch((failure: unknown) => failure);
    expect(error).toMatchObject({ code: 'SSM_TUNNEL_START_FAILED' });
    expect(inspect(error, { depth: null })).not.toContain(syntheticToken);
  } finally {
    await tunnel.kill();
  }
  expect(terminated.has(mode)).toBe(true);
});

test('cleanup kills a plugin that ignores SIGTERM and terminates its server session', async () => {
  mode = 'ignore-term';
  const tunnel = await createTunnel();
  try {
    await tunnel.connect();
    const pid = Number(readFileSync(pidFile, 'utf8'));
    await Promise.all([tunnel.kill(), tunnel.kill()]);
    await tunnel.waitForExit();
    expect(() => process.kill(pid, 0)).toThrow();
    expect(terminated.has(mode)).toBe(true);
  } finally {
    await tunnel.kill();
  }
});
