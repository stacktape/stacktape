import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { RDSClient } from '@aws-sdk/client-rds';
import { setDatabaseDeletionProtection } from './database-deletion-protection';

/**
 * The custom resource exists while a database's config says `deletionProtection: true`. Deleting it may turn AWS
 * deletion protection off only when the database stays: a deploy that sets `deletionProtection: false`, or the rollback
 * of a deploy that turned it on. A stack delete must leave protection on, so CloudFormation cannot delete the database.
 */
describe('setDatabaseDeletionProtection', () => {
  const rdsCalls: { name: string; input: Record<string, unknown> }[] = [];
  let stackStatus: string | Error;
  let stubs: { mockRestore: () => void }[] = [];

  beforeEach(() => {
    process.env.STACK_NAME = 'project-prod';
    stubs = [
      spyOn(RDSClient.prototype, 'send').mockImplementation((async (command: {
        constructor: { name: string };
        input: Record<string, unknown>;
      }) => {
        rdsCalls.push({ name: command.constructor.name, input: command.input });
        return {};
      }) as never),
      spyOn(CloudFormationClient.prototype, 'send').mockImplementation((async () => {
        if (stackStatus instanceof Error) throw stackStatus;
        return { Stacks: [{ StackName: 'project-prod', StackStatus: stackStatus }] };
      }) as never)
    ];
  });

  afterEach(() => {
    rdsCalls.length = 0;
    for (const stub of stubs) stub.mockRestore();
  });

  test.each(['Create', 'Update'] as const)(
    '%s turns protection on for an instance and a cluster',
    async (operation) => {
      await setDatabaseDeletionProtection({ instanceId: 'project-prod-db' }, undefined, operation);
      await setDatabaseDeletionProtection({ clusterId: 'project-prod-aurora' }, undefined, operation);
      expect(rdsCalls).toEqual([
        {
          name: 'ModifyDBInstanceCommand',
          input: { DBInstanceIdentifier: 'project-prod-db', DeletionProtection: true, ApplyImmediately: true }
        },
        {
          name: 'ModifyDBClusterCommand',
          input: { DBClusterIdentifier: 'project-prod-aurora', DeletionProtection: true, ApplyImmediately: true }
        }
      ]);
    }
  );

  test.each([
    'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS',
    'UPDATE_ROLLBACK_IN_PROGRESS',
    'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS',
    'ROLLBACK_IN_PROGRESS'
  ])('Delete in %s turns protection off: the database stays in the stack', async (status) => {
    stackStatus = status;
    await setDatabaseDeletionProtection({ instanceId: 'project-prod-db' }, undefined, 'Delete');
    expect(rdsCalls).toEqual([
      {
        name: 'ModifyDBInstanceCommand',
        input: { DBInstanceIdentifier: 'project-prod-db', DeletionProtection: false, ApplyImmediately: true }
      }
    ]);
  });

  test.each(['DELETE_IN_PROGRESS', 'UPDATE_IN_PROGRESS', 'IMPORT_IN_PROGRESS'])(
    'Delete in %s keeps protection on',
    async (status) => {
      stackStatus = status;
      const result = await setDatabaseDeletionProtection({ clusterId: 'project-prod-aurora' }, undefined, 'Delete');
      expect(result).toEqual({ data: {} });
      expect(rdsCalls).toEqual([]);
    }
  );

  test('Delete fails and keeps protection on when the stack status cannot be read', async () => {
    stackStatus = new Error('AccessDenied');
    await expect(setDatabaseDeletionProtection({ instanceId: 'project-prod-db' }, undefined, 'Delete')).rejects.toThrow(
      'AccessDenied'
    );
    expect(rdsCalls).toEqual([]);
  });
});
