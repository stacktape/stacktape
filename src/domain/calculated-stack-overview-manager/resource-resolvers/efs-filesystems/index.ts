import { GetAtt } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getEfsFilesystem, getEfsMountTargets, getEfsSecurityGroup } from './utils';

export const resolveEfsFilesystems = async () => {
  configManager.efsFilesystems.forEach((efsConfig) => {
    const { name, nameChain } = efsConfig;

    // Create the EFS filesystem
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.efsFilesystem(name),
      nameChain,
      resource: getEfsFilesystem({ efsConfig })
    });

    // Create security group for the EFS filesystem
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.efsSecurityGroup(name),
      nameChain,
      resource: getEfsSecurityGroup({ efsConfig })
    });

    // Create mount targets in both subnets
    getEfsMountTargets({ efsConfig }).forEach((mountTarget, index) => {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.efsMountTarget(name, index),
        nameChain,
        resource: mountTarget
      });
    });

    // Add console link
    calculatedStackOverviewManager.addStacktapeResourceLink({
      nameChain,
      linkName: 'console',
      linkValue: cfEvaluatedLinks.efsFilesystem({
        filesystemId: GetAtt(cfLogicalNames.efsFilesystem(name), 'FileSystemId')
      })
    });

    // Add referenceable parameters
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'arn',
      paramValue: GetAtt(cfLogicalNames.efsFilesystem(name), 'Arn'),
      nameChain,
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'id',
      paramValue: GetAtt(cfLogicalNames.efsFilesystem(name), 'FileSystemId'),
      nameChain,
      showDuringPrint: false
    });
  });
};
