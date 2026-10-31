import { describe, expect, it } from 'bun:test';
import type { EnvironmentVar } from '@stacktape/config/shared';
import type { SsmPortForwardingTunnel } from './ssm-session';
import { PassThrough } from 'node:stream';
import {
  describePluginStartFailure,
  getTunneledEnvironmentVariableReferences,
  substituteTunneledEndpointsInEnvironmentVars,
  waitForPluginListening
} from './ssm-session';

const tunnel = {
  remoteHost: 'private-db.example.internal',
  remotePort: 5432,
  localPort: 15432,
  targetInfo: {
    targetStpName: 'mainDatabase',
    affectedReferencableParams: ['host', 'port', 'connectionString']
  }
} as SsmPortForwardingTunnel;

describe('bastion tunnel environment substitution', () => {
  it('retains application-named resource-parameter origins before directive resolution', () => {
    expect(
      getTunneledEnvironmentVariableReferences({
        tunnels: [tunnel],
        env: [
          { name: 'DATABASE_PORT', value: "$ResourceParam('mainDatabase', 'port')" },
          { name: 'OTHER_PORT', value: "$ResourceParam('otherDatabase', 'port')" }
        ]
      })
    ).toEqual([{ envName: 'DATABASE_PORT', targetStpName: 'mainDatabase', paramName: 'port' }]);
  });

  it('rewrites an application-named database URL as well as injected STP variables', () => {
    const environment: EnvironmentVar[] = [
      { name: 'DATABASE_URL', value: 'postgres://placeholder@private-db.example.internal:5432/app' },
      { name: 'DATABASE_PORT', value: '5432' },
      { name: 'STP_MAIN_DATABASE_PORT', value: '5432' },
      { name: 'STP_MAIN_DATABASE_HOST', value: 'private-db.example.internal' },
      { name: 'UNRELATED_PORT', value: '5432' }
    ];

    const substituted = substituteTunneledEndpointsInEnvironmentVars({
      tunnels: [tunnel],
      env: environment,
      references: [{ envName: 'DATABASE_PORT', targetStpName: 'mainDatabase', paramName: 'port' }]
    });

    expect(substituted).toEqual([
      { name: 'DATABASE_URL', value: 'postgres://placeholder@127.0.0.1:15432/app' },
      { name: 'DATABASE_PORT', value: '15432' },
      { name: 'STP_MAIN_DATABASE_PORT', value: '15432' },
      { name: 'STP_MAIN_DATABASE_HOST', value: '127.0.0.1' },
      { name: 'UNRELATED_PORT', value: '5432' },
      { name: 'STP_MAIN_DATABASE_TLS_SERVER_NAME', value: 'private-db.example.internal' }
    ]);
    expect(environment[0]?.value).toBe('postgres://placeholder@private-db.example.internal:5432/app');
  });
});

// The plugin's output carries the session ID and, in transport errors, the stream URL with its token. Errors name the
// local port and a fixed cause, never that output.
const SESSION_LINE = 'Starting session with SessionId: dev-user-0a1b2c3d4e5f67890';
const STREAM_URL =
  'wss://ssmmessages.ap-southeast-1.amazonaws.com/v1/data-channel/dev-user-0a1b2c3d4e5f67890?role=publish_subscribe&token=SECRET';

describe('Session Manager plugin start failures', () => {
  it.each([
    [['listen tcp 127.0.0.1:10703: bind: address already in use'], 'another program already listens on the local port'],
    [
      ['Only one usage of each socket address (protocol/network address/port) is normally permitted.'],
      'another program already listens on the local port'
    ],
    [
      ['listen tcp 127.0.0.1:80: bind: permission denied'],
      'the system did not let the Session Manager plugin listen on the local port'
    ],
    [
      ['An attempt was made to access a socket in a way forbidden by its access permissions.'],
      'the system did not let the Session Manager plugin listen on the local port'
    ],
    [
      [`failed to dial websocket ${STREAM_URL}: dial tcp: i/o timeout`],
      'the Session Manager plugin lost its connection to AWS Systems Manager (transport error)'
    ],
    [[SESSION_LINE, 'Port 10703 opened for sessionId dev-user-0a1b2c3d4e5f67890.'], undefined]
  ])('classifies %j', (output, expected) => {
    expect(describePluginStartFailure(output)).toBe(expected);
  });

  const fakePlugin = () => {
    let exit!: () => void;
    const exited = new Promise<void>((resolve) => (exit = resolve));
    return { plugin: { stdout: new PassThrough(), stderr: new PassThrough() }, exited, exit };
  };

  it('resolves once the plugin listens', async () => {
    const { plugin, exited } = fakePlugin();
    const listening = waitForPluginListening({ plugin, exited, tunnel: 'from local port 4321 to 127.0.0.1:7835' });
    plugin.stdout.write(`${SESSION_LINE}\nWaiting for connections...\n`);
    await listening;
  });

  // r2an: the losing plugin of two concurrent sessions stayed alive without listening, and the error named only the
  // remote 127.0.0.1:7835.
  it('names the local port and the bind failure of a plugin that stays alive without listening', async () => {
    const { plugin, exited } = fakePlugin();
    const listening = waitForPluginListening({
      plugin,
      exited,
      tunnel: 'from local port 10703 to 127.0.0.1:7835',
      timeoutMs: 50
    });
    plugin.stdout.write(`${SESSION_LINE}\n`);
    plugin.stderr.write('listen tcp 127.0.0.1:10703: bind: address already in use\n');
    const error = await listening.then(
      () => undefined,
      (failure: Error & { code?: string }) => failure
    );
    expect(error?.code).toBe('SSM_TUNNEL_START_TIMEOUT');
    expect(error?.message).toBe(
      'The SSM tunnel from local port 10703 to 127.0.0.1:7835 was not ready within 1 s: another program already listens on the local port.'
    );
  });

  it('names the transport failure and exit code of a plugin that exits first, without its output', async () => {
    const { plugin, exited, exit } = fakePlugin();
    const listening = waitForPluginListening({
      plugin,
      exited,
      exitCode: () => 1,
      tunnel: 'from local port 4321 to 127.0.0.1:7835'
    });
    plugin.stderr.write(`${SESSION_LINE}\nfailed to dial websocket ${STREAM_URL}: dial tcp: i/o timeout\n`);
    // The plugin exits right after writing; its last lines are read before the cause is chosen.
    exit();
    const error = await listening.then(
      () => undefined,
      (failure: Error & { code?: string }) => failure
    );
    expect(error?.code).toBe('SSM_TUNNEL_START_FAILED');
    expect(error?.message).toBe(
      'The SSM tunnel from local port 4321 to 127.0.0.1:7835 closed before it was ready: the Session Manager plugin lost its connection to AWS Systems Manager (transport error).'
    );
    expect(error?.message).not.toContain('dev-user');
    expect(error?.message).not.toContain('token');
  });

  it('reports the exit code when the output names no cause', async () => {
    const { plugin, exited, exit } = fakePlugin();
    const listening = waitForPluginListening({
      plugin,
      exited,
      exitCode: () => 255,
      tunnel: 'from local port 4321 to 127.0.0.1:7835'
    });
    plugin.stdout.write(`${SESSION_LINE}\n`);
    exit();
    await expect(listening).rejects.toThrow(
      'The SSM tunnel from local port 4321 to 127.0.0.1:7835 closed before it was ready: the Session Manager plugin exited with code 255.'
    );
  });
});
