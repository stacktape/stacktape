import type { ClusterConfig, DomainProperties } from '@stacktape/cloudformation/resources/aws-opensearchservice-domain';
import type { Ingress } from '@stacktape/cloudformation/resources/aws-ec2-securitygroup';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpOpenSearchDomain } from '@domain-services/config-manager/resolved-types/open-search';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { getConnectToReferencesForResource } from '@domain-services/config-manager/utils/resource-references';
import { resolveReferenceToUserPool } from '@domain-services/config-manager/utils/user-pools';
import { ec2Manager } from '@domain-services/ec2-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCloudFormationLogRetentionDays } from '@utils/cloudformation';

export const getOpenSearchDomainResource = ({ resource }: { resource: StpOpenSearchDomain }) => {
  const clusterConfig: ClusterConfig = {
    InstanceType: resource.clusterConfig?.instanceType,
    InstanceCount: resource.clusterConfig?.instanceCount
  };
  const input: DomainProperties = {
    DomainName: awsResourceNames.openSearchDomainName(resource.name, calculatedStackOverviewManager.context.stackName),
    ClusterConfig: clusterConfig
  };
  if (resource.clusterConfig?.dedicatedMasterCount > 0) {
    clusterConfig.DedicatedMasterEnabled = true;
    clusterConfig.DedicatedMasterCount = resource.clusterConfig.dedicatedMasterCount;
    clusterConfig.DedicatedMasterType = resource.clusterConfig.dedicatedMasterType;
  }
  if (resource.clusterConfig?.warmCount > 0) {
    clusterConfig.WarmEnabled = true;
    clusterConfig.WarmCount = resource.clusterConfig.warmCount;
    clusterConfig.WarmType = resource.clusterConfig.warmType;
  }
  if (!resource.clusterConfig?.multiAzDisabled && resource.clusterConfig?.instanceCount > 1) {
    clusterConfig.ZoneAwarenessEnabled = true;
    clusterConfig.ZoneAwarenessConfig = {
      AvailabilityZoneCount: resource.clusterConfig?.instanceCount === 2 ? 2 : 3
    };
  }
  if (resource.clusterConfig?.standbyEnabled) {
    clusterConfig.MultiAZWithStandbyEnabled = true;
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
      SecurityGroupIds: [ref(cfLogicalNames.openSearchSecurityGroup(resource.name))],
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
        CloudWatchLogsLogGroupArn: getAtt(
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
        CloudWatchLogsLogGroupArn: getAtt(
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
        CloudWatchLogsLogGroupArn: getAtt(cfLogicalNames.openSearchDomainLogGroup(resource.name, 'errorLogs'), 'Arn')
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
      UserPoolId: ref(cfLogicalNames.userPool(resource.userPool)),
      RoleArn: 'arn:aws:iam::aws:policy/AmazonOpenSearchServiceCognitoAccess'
    };
  }
  return cfnResource('AWS::OpenSearchService::Domain', input);
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
  return cfnResource('AWS::Logs::LogGroup', {
    LogGroupName: awsResourceNames.openSearchLogGroup(domainName, logGroupType, region, stackName),
    RetentionInDays: getCloudFormationLogRetentionDays(retentionDays)
  });
};

export const getOpenSearchDomainSecurityGroup = ({ resource }: { resource: StpOpenSearchDomain }) => {
  const basicIngressRules: Ingress[] =
    resource.accessibility.accessibilityMode === 'vpc'
      ? [{ CidrIp: vpcManager.getVpcCidr(), FromPort: 443, ToPort: 443, IpProtocol: 'tcp' }]
      : resource.accessibility.accessibilityMode === 'scoping-workloads-in-vpc'
        ? getConnectToReferencesForResource({ nameChain: resource.nameChain }).map(
            ({ scopingCfLogicalNameOfSecurityGroup }) => ({
              SourceSecurityGroupId: ref(scopingCfLogicalNameOfSecurityGroup),
              FromPort: 443,
              ToPort: 443,
              IpProtocol: 'tcp'
            })
          ) || []
        : [];
  return cfnResource('AWS::EC2::SecurityGroup', {
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.dbSecurityGroup(resource.name, calculatedStackOverviewManager.context.stackName),
    GroupDescription: `Stacktape generated security group for database ${resource.name} in stack ${calculatedStackOverviewManager.context.stackName}`,
    SecurityGroupIngress: basicIngressRules
  });
};
