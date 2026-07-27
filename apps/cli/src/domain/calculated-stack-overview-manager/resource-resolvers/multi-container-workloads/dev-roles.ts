import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferencesToMountedEfsFilesystems } from '@domain-services/config-manager/utils/efs-filesystems';
import { resolveConnectToList } from '@domain-services/config-manager/utils/resource-references';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { isDevCommand, isLegacyDevMode, LOCALLY_RUN_RESOURCE_TYPES } from '../../../../commands/dev/dev-mode-utils';
import { getEcsTaskRole } from './utils';

/**
 * In normal dev mode, container workloads (web-service, private-service, worker-service, multi-container-workload)
 * are excluded from the dev stack because they run locally. However, these workloads still need their IAM roles
 * to be created so that locally running containers can assume them and get the correct AWS permissions.
 *
 * This resolver creates ONLY the IAM roles for container workloads that would normally be excluded in dev mode.
 */
export const resolveDevContainerWorkloadRoles = () => {
  // Only run in normal dev mode (not legacy, not regular deploy)
  if (!isDevCommand() || isLegacyDevMode()) {
    return;
  }

  // Get all container workloads that are normally excluded in dev mode
  const excludedContainerWorkloads = configManager.allContainerWorkloads.filter((workload) =>
    LOCALLY_RUN_RESOURCE_TYPES.includes(workload.configParentResourceType)
  );

  for (const definition of excludedContainerWorkloads) {
    resolveDevContainerWorkloadRole({ definition });
  }
};

/**
 * Create only the IAM role for a container workload in dev mode.
 * This is a stripped-down version of resolveContainerWorkload that only creates the task role.
 */
const resolveDevContainerWorkloadRole = ({ definition }: { definition: StpContainerWorkload }) => {
  const { nameChain } = definition;

  // Resolve connectTo to get the required IAM statements
  const { accessToResourcesRequiringRoleChanges, accessToAwsServices } = resolveConnectToList({
    stpResourceNameOfReferencer: definition.name,
    connectTo: definition.connectTo
  });

  // Resolve EFS mounts (if any)
  const mountedEfsFilesystems = resolveReferencesToMountedEfsFilesystems({ resource: definition });

  // Create the task role
  const roleCfLogicalName = cfLogicalNames.ecsTaskRole(definition.name);
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: roleCfLogicalName,
    resource: getEcsTaskRole({
      workloadName: definition.name,
      iamRoleStatements: definition.iamRoleStatements,
      accessToResourcesRequiringRoleChanges,
      accessToAwsServices,
      enableRemoteSessions: definition.enableRemoteSessions,
      mountedEfsFilesystems
    }),
    nameChain
  });
};
