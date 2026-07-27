import { globalStateManager } from '@application-services/global-state-manager';
import SecurityGroup from '@cloudform/ec2/securityGroup';
import EfsFilesystem from '@cloudform/efs/fileSystem';
import EfsMountTarget from '@cloudform/efs/mountTarget';
import { Ref } from '@cloudform/functions';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { getMountsForEfsFilesystem } from '@domain-services/config-manager/utils/efs-filesystems';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const getEfsFilesystem = ({ efsConfig }: { efsConfig: StpEfsFilesystem }) => {
  return new EfsFilesystem({
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
  const { stackName } = globalStateManager.targetStack;
  const { name, nameChain } = efsConfig;
  return new SecurityGroup({
    GroupDescription: `Security group for EFS filesystem ${name}`,
    VpcId: vpcManager.getVpcId(),
    Tags: stackManager.getTags(),
    GroupName: awsResourceNames.efsSecurityGroup(name, stackName),
    SecurityGroupIngress: getMountsForEfsFilesystem({ efsFileSystemNameChain: nameChain }).map(
      ({ mountingResourceCfLogicalNameOfSecurityGroup }) => ({
        SourceSecurityGroupId: Ref(mountingResourceCfLogicalNameOfSecurityGroup),
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
    new EfsMountTarget({
      FileSystemId: Ref(cfLogicalNames.efsFilesystem(name)),
      SubnetId: vpcManager.getPublicSubnetIds()[0],
      SecurityGroups: [Ref(cfLogicalNames.efsSecurityGroup(name))]
    }),
    new EfsMountTarget({
      FileSystemId: Ref(cfLogicalNames.efsFilesystem(name)),
      SubnetId: vpcManager.getPublicSubnetIds()[1],
      SecurityGroups: [Ref(cfLogicalNames.efsSecurityGroup(name))]
    })
  ];
};
