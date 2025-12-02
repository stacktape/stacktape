import type { Ingress } from '@cloudform/ec2/securityGroup';
import type { DomainProperties } from '@cloudform/openSearchService/domain';
import { globalStateManager } from '@application-services/global-state-manager';
import SecurityGroup from '@cloudform/ec2/securityGroup';
import { GetAtt, Ref } from '@cloudform/functions';
import LogGroup from '@cloudform/logs/logGroup';
import Domain from '@cloudform/openSearchService/domain';
import { getConnectToReferencesForResource } from '@domain-services/config-manager/utils/resource-references';
import { resolveReferenceToUserPool } from '@domain-services/config-manager/utils/user-pools';
import { ec2Manager } from '@domain-services/ec2-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const getOpenSearchDomainResource = ({ resource }: { resource: StpOpenSearchDomain }) => {
  const input: DomainProperties = {
    DomainName: awsResourceNames.openSearchDomainName(resource.name, globalStateManager.targetStack.stackName),
    ClusterConfig: {
      InstanceType: resource.clusterConfig?.instanceType,
      InstanceCount: resource.clusterConfig?.instanceCount
    }
  };
  if (resource.clusterConfig?.dedicatedMasterCount > 0) {
    input.ClusterConfig.DedicatedMasterEnabled = true;
    input.ClusterConfig.DedicatedMasterCount = resource.clusterConfig.dedicatedMasterCount;
    input.ClusterConfig.DedicatedMasterType = resource.clusterConfig.dedicatedMasterType;
  }
  if (resource.clusterConfig?.warmCount > 0) {
    input.ClusterConfig.WarmEnabled = true;
    input.ClusterConfig.WarmCount = resource.clusterConfig.warmCount;
    input.ClusterConfig.WarmType = resource.clusterConfig.warmType;
  }
  if (!resource.clusterConfig?.multiAzDisabled && resource.clusterConfig?.instanceCount > 1) {
    input.ClusterConfig.ZoneAwarenessEnabled = true;
    input.ClusterConfig.ZoneAwarenessConfig = {
      AvailabilityZoneCount: resource.clusterConfig?.instanceCount === 2 ? 2 : 3
    };
  }
  if (resource.clusterConfig?.standbyEnabled) {
    input.ClusterConfig.MultiAZWithStandbyEnabled = true;
  }
  // if (resource.storage) {
  const instanceTypesUsed = [
    resource.clusterConfig?.instanceType,
    // resource.clusterConfig?.dedicatedMasterType,
    resource.clusterConfig?.warmType
  ].filter(Boolean);

  if (
    resource.accessibility?.accessibilityMode === 'vpc' ||
    resource.accessibility?.accessibilityMode === 'scoping-workloads-in-vpc'
  ) {
    input.VPCOptions = {
      SecurityGroupIds: [Ref(cfLogicalNames.openSearchSecurityGroup(resource.name))],
      SubnetIds: vpcManager.getPublicSubnetIds().slice(0, resource.clusterConfig?.instanceCount || 1)
    };
  }

  const { gp3Supported, ebsSupported } = ec2Manager.checkOpenSearchEbsSupport({
    instanceTypesUsed,
    version: resource.version ?? '2.17'
  });

  if (!ebsSupported && resource.storage) {
    throw stpErrors.e1007({ domainName: resource.name });
  }

  // configuration of iops and throughput is only supported for gp3
  if (!gp3Supported && (resource.storage?.iops || resource.storage?.throughput)) {
    throw stpErrors.e1006({ domainName: resource.name });
  }

  // storage configuration only supported for ebs instances (not with dedicated storage)
  if (ebsSupported) {
    input.EBSOptions = {
      EBSEnabled: true,
      VolumeSize: resource.storage?.size || 10,
      VolumeType: gp3Supported ? 'gp3' : 'gp2',
      Iops: resource.storage?.iops,
      Throughput: resource.storage?.throughput
    };
  }
  // }

  if (!resource.logging.indexSlowLogs.disabled) {
    input.LogPublishingOptions = {
      INDEX_SLOW_LOGS: {
        Enabled: true,
        CloudWatchLogsLogGroupArn: GetAtt(
          cfLogicalNames.openSearchDomainLogGroup(resource.name, 'indexSlowLogs'),
          'Arn'
        )
      }
    };
  }
  if (!resource.logging.searchSlowLogs.disabled) {
    input.LogPublishingOptions = {
      SEARCH_SLOW_LOGS: {
        Enabled: true,
        CloudWatchLogsLogGroupArn: GetAtt(
          cfLogicalNames.openSearchDomainLogGroup(resource.name, 'searchSlowLogs'),
          'Arn'
        )
      }
    };
  }
  if (!resource.logging.errorLogs.disabled) {
    input.LogPublishingOptions = {
      ES_APPLICATION_LOGS: {
        Enabled: true,
        CloudWatchLogsLogGroupArn: GetAtt(cfLogicalNames.openSearchDomainLogGroup(resource.name, 'errorLogs'), 'Arn')
      }
    };
  }

  // user pool configuration
  if (resource.userPool) {
    resolveReferenceToUserPool({
      referencedFrom: resource.name,
      referencedFromType: resource.configParentResourceType,
      stpResourceReference: resource.userPool
    });
    input.CognitoOptions = {
      Enabled: true,
      UserPoolId: Ref(cfLogicalNames.userPool(resource.userPool)),
      RoleArn: 'arn:aws:iam::aws:policy/AmazonOpenSearchServiceCognitoAccess'
    };
  }
  return new Domain(input);
};

export const getOpenSearchDomainLogGroup = ({
  domainName,
  logGroupType,
  retentionDays,
  region,
  stackName
}: {
  domainName: string;
  logGroupType: string;
  retentionDays: number;
  region: string;
  stackName: string;
}) => {
  return new LogGroup({
    LogGroupName: awsResourceNames.openSearchLogGroup(domainName, logGroupType, region, stackName),
    RetentionInDays: retentionDays
  });
};

export const getOpenSearchDomainSecurityGroup = ({ resource }: { resource: StpOpenSearchDomain }) => {
  const basicIngressRules: Ingress[] =
    resource.accessibility.accessibilityMode === 'vpc'
      ? [{ CidrIp: vpcManager.getVpcCidr(), FromPort: 443, ToPort: 443, IpProtocol: 'tcp' }]
      : resource.accessibility.accessibilityMode === 'scoping-workloads-in-vpc'
        ? getConnectToReferencesForResource({ nameChain: resource.nameChain }).map(
            ({ scopingCfLogicalNameOfSecurityGroup }) => ({
              SourceSecurityGroupId: Ref(scopingCfLogicalNameOfSecurityGroup),
              FromPort: 443,
              ToPort: 443,
              IpProtocol: 'tcp'
            })
          ) || []
        : [];
  return new SecurityGroup({
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.dbSecurityGroup(resource.name, globalStateManager.targetStack.stackName),
    GroupDescription: `Stacktape generated security group for database ${resource.name} in stack ${globalStateManager.targetStack.stackName}`,
    SecurityGroupIngress: basicIngressRules
  });
};
