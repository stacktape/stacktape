import { describe, expect, it } from 'bun:test';
import type { EnvironmentVar } from '@stacktape/config/shared';
import type { SsmPortForwardingTunnel } from './ssm-session';
import { getTunneledEnvironmentVariableReferences, substituteTunneledEndpointsInEnvironmentVars } from './ssm-session';

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
      { name: 'UNRELATED_PORT', value: '5432' }
    ]);
    expect(environment[0]?.value).toBe('postgres://placeholder@private-db.example.internal:5432/app');
  });
});
