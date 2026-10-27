import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { CloudFormationClient, DescribeStacksCommand, StackStatus } from '@aws-sdk/client-cloudformation';
import { ModifyDBClusterCommand, ModifyDBInstanceCommand, RDSClient } from '@aws-sdk/client-rds';

/**
 * Stack states in which CloudFormation deletes this custom resource while the database stays: a deploy that sets
 * `deletionProtection: false` removes it during cleanup, and a failed deploy that added it rolls it back. In both, the
 * database returns to its unprotected state. A stack delete (DELETE_IN_PROGRESS) is not one of them.
 */
const STATES_THAT_TURN_PROTECTION_OFF: string[] = [
  StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS,
  StackStatus.UPDATE_ROLLBACK_IN_PROGRESS,
  StackStatus.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS,
  StackStatus.ROLLBACK_IN_PROGRESS
];

const cfClient = new CloudFormationClient({});
const rdsClient = new RDSClient({});

/**
 * Turns AWS deletion protection on for the database while this custom resource exists, which is while the database's
 * config says `deletionProtection: true`.
 *
 * On Delete it turns protection off only when the database stays in the stack. On a stack delete, and in any state it
 * does not recognise, protection stays on, so CloudFormation fails to delete the database instead of deleting it.
 * A stack it cannot read fails the Delete, which leaves protection on as well.
 */
export const setDatabaseDeletionProtection: ServiceLambdaResolver<
  StpServiceCustomResourceProperties['setDatabaseDeletionProtection']
> = async (currentProps, _previousProps, operation) => {
  const target = currentProps.clusterId
    ? `cluster "${currentProps.clusterId}"`
    : `instance "${currentProps.instanceId}"`;
  let enable = true;
  if (operation === 'Delete') {
    const stack = (await cfClient.send(new DescribeStacksCommand({ StackName: process.env.STACK_NAME }))).Stacks?.[0];
    if (!stack?.StackStatus || !STATES_THAT_TURN_PROTECTION_OFF.includes(stack.StackStatus)) {
      console.info(`Keeping deletion protection on ${target}: the stack is ${stack?.StackStatus ?? 'not found'}.`);
      return { data: {} };
    }
    enable = false;
  }
  console.info(`${enable ? 'Enabling' : 'Disabling'} deletion protection on ${target}...`);
  if (currentProps.clusterId) {
    await rdsClient.send(
      new ModifyDBClusterCommand({
        DBClusterIdentifier: currentProps.clusterId,
        DeletionProtection: enable,
        ApplyImmediately: true
      })
    );
  }
  if (currentProps.instanceId) {
    await rdsClient.send(
      new ModifyDBInstanceCommand({
        DBInstanceIdentifier: currentProps.instanceId,
        DeletionProtection: enable,
        ApplyImmediately: true
      })
    );
  }
  console.info(`Success: ${enable ? 'enabled' : 'disabled'} deletion protection on ${target}.`);
  return { data: {} };
};
