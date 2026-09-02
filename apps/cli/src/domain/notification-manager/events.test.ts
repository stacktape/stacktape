import { describe, expect, test } from 'bun:test';
import { cliCommands } from '../../config/cli/commands';
import { resolveOperationNotificationEventType } from './events';

describe('operation notification event classification', () => {
  test.each([
    ['deploy', 'DEPLOY_FAILED'],
    ['delete', 'DELETE_FAILED'],
    ['rollback', 'ROLLBACK_FAILED'],
    ['script:run', 'SCRIPT_RUN_FAILED'],
    ['deployment-script:run', 'SCRIPT_RUN_FAILED']
  ] as const)('classifies a failed %s command as %s', (command, expectedEventType) => {
    expect(resolveOperationNotificationEventType({ command, messageType: 'error' })).toBe(expectedEventType);
  });

  test('does not classify failures from unrelated commands as deployments', () => {
    const commandsWithFailureNotifications = cliCommands
      .filter((command) => resolveOperationNotificationEventType({ command, messageType: 'error' }))
      .sort();

    expect(commandsWithFailureNotifications).toEqual([
      'delete',
      'deploy',
      'deployment-script:run',
      'rollback',
      'script:run'
    ]);
  });

  test.each(['progress', 'success', 'error'] as const)(
    'does not treat bucket:sync %s as a deployment',
    (messageType) => {
      expect(resolveOperationNotificationEventType({ command: 'bucket:sync', messageType })).toBeNull();
    }
  );
});
