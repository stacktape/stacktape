import { describe, expect, test } from 'bun:test';
import { isFailedStackStatus, resolveAutoRollback } from './auto-rollback';

const alarms = { triggerRollbackOnAlarms: ['api-errors'] };
const monitoring = { monitoringTimeAfterDeploymentInMinutes: 10 };

describe('whether a failed deploy rolls back', () => {
  test.each([
    ['nothing configured', undefined, undefined, false],
    ['an empty deployment config', {}, undefined, false],
    ['rollback alarms', alarms, undefined, true],
    ['a monitoring period', monitoring, undefined, true],
    ['a zero monitoring period', { monitoringTimeAfterDeploymentInMinutes: 0 }, undefined, false],
    ['an empty alarm list', { triggerRollbackOnAlarms: [] }, undefined, false],
    ['autoRollback: true', { autoRollback: true }, undefined, true],
    ['autoRollback: false', { autoRollback: false }, undefined, false],
    ['autoRollback: true with alarms', { ...alarms, autoRollback: true }, undefined, true],
    ['--auto-rollback', {}, true, true],
    ['--auto-rollback over autoRollback: false', { autoRollback: false }, true, true],
    ['--auto-rollback=false over autoRollback: true', { autoRollback: true }, false, false]
  ] as const)('%s', (_name, deploymentConfig, cliValue, expected) => {
    expect(resolveAutoRollback({ deploymentConfig, cliValue })).toBe(expected);
  });

  test('dev mode keeps rolling back unless the config turns it off', () => {
    expect(resolveAutoRollback({ deploymentConfig: {}, isDevCommand: true })).toBe(true);
    expect(resolveAutoRollback({ deploymentConfig: { autoRollback: false }, isDevCommand: true })).toBe(false);
  });

  test.each([
    ['autoRollback: false with alarms', { ...alarms, autoRollback: false }, undefined],
    ['autoRollback: false with a monitoring period', { ...monitoring, autoRollback: false }, undefined],
    ['--auto-rollback=false with alarms', alarms, false]
  ] as const)('rejects %s', (_name, deploymentConfig, cliValue) => {
    expect(() => resolveAutoRollback({ deploymentConfig, cliValue })).toThrow(/cannot be turned off/);
  });
});

test.each([
  ['CREATE_FAILED', true],
  ['UPDATE_FAILED', true],
  ['UPDATE_ROLLBACK_FAILED', false],
  ['ROLLBACK_COMPLETE', false],
  ['UPDATE_COMPLETE', false],
  [undefined, false]
] as const)('%s is a stack the next deploy continues: %p', (status, expected) => {
  expect(isFailedStackStatus(status)).toBe(expected);
});
