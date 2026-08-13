import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import type { StpKafkaCluster } from '@domain-services/config-manager/resolved-types/kafka-clusters';
import { vpcManager } from '@domain-services/vpc-manager';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { MSK_SERVERLESS_REGIONS } from '@stacktape/config/kafka-clusters';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { consoleLinks } from '@stacktape/naming/console-links';
import { CliError } from '@utils/errors';
import { getConnectToReferencesForResource } from '@domain-services/config-manager/utils/resource-references';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';
import { shouldExcludeResourceInDevMode } from '../../../../commands/dev/dev-resource-filter';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const getKafkaCluster = ({ resource }: { resource: StpKafkaCluster }) =>
  cfnResource('AWS::MSK::ServerlessCluster', {
    ClusterName: awsResourceNames.kafkaServerlessCluster(
      resource.name,
      calculatedStackOverviewManager.context.stackName
    ),
    ClientAuthentication: { Sasl: { Iam: { Enabled: true } } },
    VpcConfigs: [
      {
        SubnetIds: vpcManager.getKafkaSubnetIds(),
        SecurityGroups: [ref(cfLogicalNames.kafkaClusterSecurityGroup(resource.name))]
      }
    ]
  });

export const getKafkaClusterSecurityGroup = ({
  resource,
  connectToReferences = getConnectToReferencesForResource({ nameChain: resource.nameChain })
}: {
  resource: StpKafkaCluster;
  connectToReferences?: ReturnType<typeof getConnectToReferencesForResource>;
}) => {
  return cfnResource('AWS::EC2::SecurityGroup', {
    VpcId: vpcManager.getVpcId(),
    GroupDescription: awsResourceNames.kafkaClusterSecurityGroupDescription(
      resource.name,
      calculatedStackOverviewManager.context.stackName
    ),
    SecurityGroupIngress: [
      ...connectToReferences
        .filter(({ scopingResource }) => !shouldExcludeResourceInDevMode(scopingResource.name, scopingResource.type))
        .filter(({ scopingCfLogicalNameOfSecurityGroup }) => scopingCfLogicalNameOfSecurityGroup)
        .map(({ scopingCfLogicalNameOfSecurityGroup }) => ({
          SourceSecurityGroupId: ref(scopingCfLogicalNameOfSecurityGroup!),
          FromPort: 9098,
          ToPort: 9098,
          IpProtocol: 'tcp'
        }))
    ]
  });
};

export const getKafkaClusterSelfIngress = ({ resource }: { resource: StpKafkaCluster }) => {
  const groupId = ref(cfLogicalNames.kafkaClusterSecurityGroup(resource.name));
  return cfnResource('AWS::EC2::SecurityGroupIngress', {
    GroupId: groupId,
    SourceSecurityGroupId: groupId,
    FromPort: 9098,
    ToPort: 9098,
    IpProtocol: 'tcp'
  });
};

export const resolveKafkaCluster = ({ resource }: { resource: StpKafkaCluster }) => {
  const clusterLogicalName = cfLogicalNames.kafkaServerlessCluster(resource.name);
  const securityGroupLogicalName = cfLogicalNames.kafkaClusterSecurityGroup(resource.name);
  const brokersLogicalName = cfLogicalNames.kafkaBootstrapBrokers(resource.name);
  const clusterArn = ref(clusterLogicalName);

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: resource.nameChain,
    cfLogicalName: securityGroupLogicalName,
    resource: getKafkaClusterSecurityGroup({ resource })
  });
  calculatedStackOverviewManager.addCfChildResource({
    nameChain: resource.nameChain,
    cfLogicalName: cfLogicalNames.kafkaClusterSelfIngress(resource.name),
    resource: getKafkaClusterSelfIngress({ resource })
  });
  calculatedStackOverviewManager.addCfChildResource({
    nameChain: resource.nameChain,
    cfLogicalName: clusterLogicalName,
    resource: getKafkaCluster({ resource })
  });
  calculatedStackOverviewManager.addCfChildResource({
    nameChain: resource.nameChain,
    cfLogicalName: brokersLogicalName,
    resource: getStpServiceCustomResource({ kafkaBootstrapBrokers: { clusterArn } })
  });

  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain: resource.nameChain,
    paramName: 'arn',
    paramValue: clusterArn
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain: resource.nameChain,
    paramName: 'name',
    paramValue: awsResourceNames.kafkaServerlessCluster(resource.name, calculatedStackOverviewManager.context.stackName)
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain: resource.nameChain,
    paramName: 'bootstrapServers',
    paramValue: getAtt(brokersLogicalName, 'BootstrapServers')
  });
  calculatedStackOverviewManager.addStacktapeResourceLink({
    nameChain: resource.nameChain,
    linkName: 'console',
    linkValue: consoleLinks.mskClusters(calculatedStackOverviewManager.context.region)
  });
};

export const resolveKafkaClusters = () => {
  const clusters = filterResourcesForDevMode(configManager.kafkaClusters);
  if (clusters.length && !MSK_SERVERLESS_REGIONS.includes(calculatedStackOverviewManager.context.region as never)) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_KAFKA_SERVERLESS_REGION_UNSUPPORTED',
      message: `Amazon MSK Serverless is not available in region \`${calculatedStackOverviewManager.context.region}\`.`,
      hints: `Choose one of: ${MSK_SERVERLESS_REGIONS.join(', ')}.`
    });
  }
  if (
    clusters.length &&
    calculatedStackOverviewManager.context.region === 'us-east-1' &&
    !configManager.reuseVpcConfig
  ) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_KAFKA_US_EAST_1_VPC_REQUIRED',
      message: 'Kafka clusters in `us-east-1` require a reused VPC in this version.',
      hints:
        "Amazon MSK cannot use the physical zone use1-az3, while CloudFormation cannot safely select account-specific zone IDs for Stacktape's generated VPC. Configure stackConfig.vpc.reuseVpc with public subnets in at least two supported zones, or choose another supported region."
    });
  }
  clusters.forEach((resource) => resolveKafkaCluster({ resource }));
};
