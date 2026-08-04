import { cfnResource } from '@stacktape/cloudformation/resource';
import { ref } from '@stacktape/cloudformation/intrinsics';
import type { StpEfsFilesystem } from '@domain-services/config-manager/resolved-types/efs-filesystem';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { getMountsForEfsFilesystem } from '@domain-services/config-manager/utils/efs-filesystems';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

export const getEfsFilesystem = ({ efsConfig }: { efsConfig: StpEfsFilesystem }) => {
  return cfnResource('AWS::EFS::FileSystem', {
    BackupPolicy: efsConfig.backupEnabled
      ? {
          Status: 'ENABLED'
        }
      : undefined,
    PerformanceMode: 'generalPurpose',
    ThroughputMode: efsConfig.throughputMode || 'elastic',
    ProvisionedThroughputInMibps:
      efsConfig.throughputMode === 'provisioned' ? efsConfig.provisionedThroughputInMibps : undefined,
    Encrypted: true,
    FileSystemTags: stackManager.getTags()
  });
};

export const getEfsSecurityGroup = ({ efsConfig }: { efsConfig: StpEfsFilesystem }) => {
  const { stackName } = calculatedStackOverviewManager.context;
  const { name, nameChain } = efsConfig;
  return cfnResource('AWS::EC2::SecurityGroup', {
    GroupDescription: `Security group for EFS filesystem ${name}`,
    VpcId: vpcManager.getVpcId(),
    Tags: stackManager.getTags(),
    GroupName: awsResourceNames.efsSecurityGroup(name, stackName),
    SecurityGroupIngress: getMountsForEfsFilesystem({ efsFileSystemNameChain: nameChain }).map(
      ({ mountingResourceCfLogicalNameOfSecurityGroup }) => ({
        SourceSecurityGroupId: ref(mountingResourceCfLogicalNameOfSecurityGroup),
        FromPort: 2049,
        ToPort: 2049,
        IpProtocol: 'tcp'
      })
    )
  });
};

export const getEfsMountTargets = ({ efsConfig }: { efsConfig: StpEfsFilesystem }) => {
  const { name } = efsConfig;
  // Create mount targets in both subnets of the default VPC
  return [
    cfnResource('AWS::EFS::MountTarget', {
      FileSystemId: ref(cfLogicalNames.efsFilesystem(name)),
      SubnetId: vpcManager.getPublicSubnetIds()[0],
      SecurityGroups: [ref(cfLogicalNames.efsSecurityGroup(name))]
    }),
    cfnResource('AWS::EFS::MountTarget', {
      FileSystemId: ref(cfLogicalNames.efsFilesystem(name)),
      SubnetId: vpcManager.getPublicSubnetIds()[1],
      SecurityGroups: [ref(cfLogicalNames.efsSecurityGroup(name))]
    })
  ];
};
