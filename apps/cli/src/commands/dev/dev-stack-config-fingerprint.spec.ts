import { describe, expect, test } from 'bun:test';
import { devStackConfigNeedsUpdate, getDevStackConfigFingerprint } from './dev-stack-config-fingerprint';

describe('dev stack config fingerprint', () => {
  test('is deterministic across object key order', () => {
    expect(getDevStackConfigFingerprint({ stage: 'dev', resources: { api: { memory: 512, cpu: 0.5 } } })).toBe(
      getDevStackConfigFingerprint({ resources: { api: { cpu: 0.5, memory: 512 } }, stage: 'dev' })
    );
  });

  test('changes when support-stack configuration changes', () => {
    const original = getDevStackConfigFingerprint({ resources: { api: { iamRoleStatements: [] } } });
    const updated = getDevStackConfigFingerprint({
      resources: { api: { iamRoleStatements: [{ Action: ['secretsmanager:GetSecretValue'], Resource: ['*'] }] } }
    });

    expect(updated).not.toBe(original);
  });

  test('refreshes stacks without the fingerprint and reuses matching stacks', () => {
    const desiredFingerprint = getDevStackConfigFingerprint({ resources: {} });
    expect(devStackConfigNeedsUpdate({ deployedFingerprint: undefined, desiredFingerprint })).toBe(true);
    expect(devStackConfigNeedsUpdate({ deployedFingerprint: desiredFingerprint, desiredFingerprint })).toBe(false);
  });

  test('rejects circular configuration instead of producing an unstable fingerprint', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => getDevStackConfigFingerprint(circular)).toThrow('circular');
  });
});
