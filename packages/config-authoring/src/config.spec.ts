import { describe, expect, test } from 'bun:test';
import { defineConfig, RelationalDatabase } from './index.js';
import { AuroraServerlessV2EnginePostgresql } from './type-properties.js';

const getTransformedResourceOverrides = (overrides: Record<string, any>) => {
  const resource = new RelationalDatabase({
    credentials: { masterUserName: 'x', masterUserPassword: 'y' },
    engine: new AuroraServerlessV2EnginePostgresql({
      dbName: 'a',
      version: '15.10',
      minCapacity: 0.5,
      maxCapacity: 2
    }),
    overrides
  });
  const config = defineConfig(() => ({
    resources: {
      auroraPostgresDatabase: resource
    }
  }))({
    projectName: 'p',
    stage: 'staging',
    region: 'us-east-1',
    cliArgs: {},
    command: 'deploy',
    awsProfile: '',
    user: { id: '', name: '', email: '' }
  });

  return config.resources.auroraPostgresDatabase.overrides;
};

describe('class config overrides transformation', () => {
  test('preserves dotted keys in map-like override values', () => {
    const overrides = getTransformedResourceOverrides({
      auroraDbInstanceParameterGroup: {
        Parameters: {
          'rds.allowed_extensions': '*'
        }
      }
    });

    const logicalOverrideValue = Object.values(overrides)[0] as Record<string, any>;
    expect(logicalOverrideValue.Parameters).toEqual({ 'rds.allowed_extensions': '*' });
    expect(logicalOverrideValue['Parameters.rds.allowed_extensions']).toBeUndefined();
  });

  test('preserves non-path-safe keys in map-like override values', () => {
    const overrides = getTransformedResourceOverrides({
      auroraDbInstanceParameterGroup: {
        Parameters: {
          'notify-keyspace-events': 'AKE'
        }
      }
    });

    const logicalOverrideValue = Object.values(overrides)[0] as Record<string, any>;
    expect(logicalOverrideValue.Parameters).toEqual({ 'notify-keyspace-events': 'AKE' });
    expect(logicalOverrideValue['Parameters.notify-keyspace-events']).toBeUndefined();
  });

  test('still flattens regular nested override objects', () => {
    const overrides = getTransformedResourceOverrides({
      dbSecurityGroup: {
        SecurityGroupIngress: {
          0: {
            Description: 'hello'
          }
        }
      }
    });

    const logicalOverrideValue = Object.values(overrides)[0] as Record<string, any>;
    expect(logicalOverrideValue['SecurityGroupIngress.0.Description']).toBe('hello');
  });
});
