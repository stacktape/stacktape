import { ModifyDBClusterCommand, ModifyDBInstanceCommand, RDS } from '@aws-sdk/client-rds';

export const setDatabaseDeletionProtection: ServiceLambdaResolver<
  StpServiceCustomResourceProperties['setDatabaseDeletionProtection']
> = async (currentProps, _previousProps, operation) => {
  const rdsCli = new RDS({ region: process.env.AWS_REGION });
  if (operation === 'Delete') {
    console.info(
      `Disabling delete protection on ${
        currentProps.clusterId ? `cluster "${currentProps.clusterId}"` : `instance "${currentProps.instanceId}"`
      }...`
    );
    if (currentProps.clusterId) {
      await rdsCli.send(
        new ModifyDBClusterCommand({
          DBClusterIdentifier: currentProps.clusterId,
          DeletionProtection: false,
          ApplyImmediately: true
        })
      );
    }
    if (currentProps.instanceId) {
      await rdsCli.send(
        new ModifyDBInstanceCommand({
          DBInstanceIdentifier: currentProps.instanceId,
          DeletionProtection: false,
          ApplyImmediately: true
        })
      );
    }
    console.info(
      `Success: Disabling delete protection on ${
        currentProps.clusterId ? `cluster "${currentProps.clusterId}"` : `instance "${currentProps.instanceId}".`
      }.`
    );
  } else {
    console.info(
      `Enabling delete protection on ${
        currentProps.clusterId ? `cluster "${currentProps.clusterId}"` : `instance "${currentProps.instanceId}"`
      }...`
    );
    if (currentProps.clusterId) {
      await rdsCli.send(
        new ModifyDBClusterCommand({
          DBClusterIdentifier: currentProps.clusterId,
          DeletionProtection: true,
          ApplyImmediately: true
        })
      );
    }
    if (currentProps.instanceId) {
      await rdsCli.send(
        new ModifyDBInstanceCommand({
          DBInstanceIdentifier: currentProps.instanceId,
          DeletionProtection: true,
          ApplyImmediately: true
        })
      );
    }
    console.info(
      `Success: Enabling delete protection on ${
        currentProps.clusterId ? `cluster "${currentProps.clusterId}"` : `instance "${currentProps.instanceId}".`
      }.`
    );
  }
  return { data: {} };
};
