import type { CloudformationResourceType } from '@cloudform/resource-types';
import { pascalCase } from 'change-case';

export const cfLogicalNames = {
  bucket(stpResourceName: string) {
    return pascalCase(`${stpResourceName}-bucket`);
  },
  atlasMongoProject() {
    return buildCfLogicalName({
      specifier: { type: 'AtlasMongo' },
      suffix: { cloudformationResourceType: 'MongoDB::StpAtlasV1::Project' }
    });
  },
  atlasMongoCredentialsProvider() {
    return buildCfLogicalName({
      specifier: { type: 'AtlasMongoCredentialsProvider' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  atlasMongoProjectVpcNetworkContainer() {
    return buildCfLogicalName({
      specifier: { type: 'AtlasMongo' },
      suffix: { cloudformationResourceType: 'MongoDB::StpAtlasV1::NetworkContainer' }
    });
  },
  atlasMongoProjectVpcNetworkPeering() {
    return buildCfLogicalName({
      specifier: { type: 'AtlasMongo' },
      suffix: { cloudformationResourceType: 'MongoDB::StpAtlasV1::NetworkPeering' }
    });
  },
  atlasMongoProjectIpAccessList() {
    return buildCfLogicalName({
      specifier: { type: 'AtlasMongo' },
      suffix: { cloudformationResourceType: 'MongoDB::StpAtlasV1::ProjectIpAccessList' }
    });
  },
  atlasMongoUserAssociatedWithRole(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'AtlasMongo' },
      suffix: { cloudformationResourceType: 'MongoDB::StpAtlasV1::DatabaseUser' }
    });
  },
  atlasMongoClusterMasterUser(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'MongoDB::StpAtlasV1::DatabaseUser' }
    });
  },
  atlasMongoCluster(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'MongoDB::StpAtlasV1::Cluster' }
    });
  },
  redisReplicationGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ElastiCache::ReplicationGroup' }
    });
  },
  redisLogGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Logs::LogGroup' }
    });
  },
  redisParameterGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ElastiCache::ParameterGroup' }
    });
  },
  redisSubnetGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ElastiCache::SubnetGroup' }
    });
  },
  redisSecurityGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::EC2::SecurityGroup' }
    });
  },
  efsFilesystem(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: {
        cloudformationResourceType: 'AWS::EFS::FileSystem'
      }
    });
  },
  efsAccessPoint({
    stpResourceName,
    efsFilesystemName,
    rootDirectory
  }: {
    stpResourceName: string;
    efsFilesystemName: string;
    rootDirectory?: string;
  }) {
    // Create a unique identifier based on the root directory
    const rootDirIdentifier = rootDirectory ? `${rootDirectory.replace(/\//g, '-').replace(/^-|-$/g, '')}` : 'Root';

    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: `${efsFilesystemName}-${rootDirIdentifier}`
      },
      suffix: {
        cloudformationResourceType: 'AWS::EFS::AccessPoint'
      }
    });
  },
  efsMountTarget(stpResourceName: string, mountTargetIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Subnet', typeIndex: mountTargetIndex },
      suffix: { cloudformationResourceType: 'AWS::EFS::MountTarget' }
    });
  },
  efsSecurityGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::EC2::SecurityGroup' }
    });
  },
  snsRoleSendSmsFromCognito(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'SendSms' },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  cloudfrontDistribution(stpResourceName: string, distributionIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'CDN' },
      suffix: { cloudformationResourceType: 'AWS::CloudFront::Distribution', index: distributionIndex }
    });
  },
  cloudfrontCustomCachePolicy(stpResourceName: string, cachingOptionsHash: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `CDNCacheBehavior${cachingOptionsHash}` },
      suffix: { cloudformationResourceType: 'AWS::CloudFront::CachePolicy' }
    });
  },
  cloudfrontDefaultCachePolicy(type: 'DefDynamic' | 'DefStatic') {
    return buildCfLogicalName({
      specifier: { type: `CDN${type}` },
      suffix: { cloudformationResourceType: 'AWS::CloudFront::CachePolicy' }
    });
  },
  cloudfrontCustomOriginRequestPolicy(stpResourceName: string, forwardingOptionsHash: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `CDNCacheBehavior${forwardingOptionsHash}` },
      suffix: { cloudformationResourceType: 'AWS::CloudFront::OriginRequestPolicy' }
    });
  },
  cloudfrontDefaultOriginRequestPolicy(type: 'DefDynamic' | 'DefStatic') {
    return buildCfLogicalName({
      specifier: { type: `CDN${type}` },
      suffix: { cloudformationResourceType: 'AWS::CloudFront::OriginRequestPolicy' }
    });
  },
  cloudfrontOriginAccessIdentity(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'CDN' },
      suffix: { cloudformationResourceType: 'AWS::CloudFront::CloudFrontOriginAccessIdentity' }
    });
  },
  openNextHostHeaderRewriteFunction(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'OpenNextHostHeaderRewrite' },
      suffix: { cloudformationResourceType: 'AWS::CloudFront::Function' }
    });
  },
  openNextAssetReplacerCustomResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'AssetReplacer' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  openNextDynamoInsertCustomResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'DynamoInsert' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  dnsRecord(fullyQualifiedDomainName: string) {
    // we do not build build the resource name conventionally through stpResourceName
    // this is due to update behaviors of Cloudformation
    return buildCfLogicalName({
      stpResourceName: '',
      specifier: { type: getSpecifierForDomainResource(fullyQualifiedDomainName) },
      suffix: { cloudformationResourceType: 'AWS::Route53::RecordSet' }
    });
  },
  dynamoGlobalTable(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::DynamoDB::GlobalTable' }
    });
  },
  dynamoRegionalTable(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::DynamoDB::Table' }
    });
  },
  bucketPolicy(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::S3::BucketPolicy' }
    });
  },
  lambdaLogGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Logs::LogGroup' }
    });
  },
  eventOnDeliveryFailureSqsQueuePolicy(stpResourceName: string, eventIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: 'Event',
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: 'AWS::SQS::QueuePolicy' }
    });
  },
  snsEventSubscription(stpResourceName: string, eventIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: 'Event',
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: 'AWS::SNS::Subscription' }
    });
  },
  snsEventPermission(stpResourceName: string, eventIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: 'Event',
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: 'AWS::Lambda::Permission' }
    });
  },
  ecrRepo() {
    return buildCfLogicalName({
      specifier: {
        type: 'Container'
      },
      suffix: { cloudformationResourceType: 'AWS::ECR::Repository' }
    });
  },
  deploymentBucket() {
    return buildCfLogicalName({
      specifier: {
        type: 'Deployment'
      },
      suffix: { cloudformationResourceType: 'AWS::S3::Bucket' }
    });
  },
  deploymentBucketPolicy() {
    return buildCfLogicalName({
      specifier: {
        type: 'Deployment'
      },
      suffix: { cloudformationResourceType: 'AWS::S3::BucketPolicy' }
    });
  },
  lambdaInvokeConfig(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Lambda::EventInvokeConfig' }
    });
  },
  lambdaVersionPublisherCustomResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Version' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  codeDeployServiceRole() {
    return buildCfLogicalName({
      specifier: {
        type: 'CodeDeploy'
      },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  batchInstanceRole() {
    return buildCfLogicalName({
      specifier: {
        type: 'BatchInstance'
      },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  batchInstanceDefaultSecurityGroup() {
    return buildCfLogicalName({
      specifier: {
        type: 'BatchInstance'
      },
      suffix: { cloudformationResourceType: 'AWS::EC2::SecurityGroup' }
    });
  },
  batchInstanceProfile() {
    return buildCfLogicalName({
      specifier: {
        type: 'BatchInstance'
      },
      suffix: { cloudformationResourceType: 'AWS::IAM::InstanceProfile' }
    });
  },
  batchInstanceLaunchTemplate() {
    return buildCfLogicalName({
      specifier: {
        type: 'BatchInstance'
      },
      suffix: { cloudformationResourceType: 'AWS::EC2::LaunchTemplate' }
    });
  },
  batchStateMachineExecutionRole() {
    return buildCfLogicalName({
      specifier: {
        type: 'BatchStateMachine'
      },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  batchSpotFleetRole() {
    return buildCfLogicalName({
      specifier: {
        type: 'BatchSpotFleet'
      },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  batchServiceRole() {
    return buildCfLogicalName({
      specifier: {
        type: 'BatchService'
      },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  batchJobExecutionRole(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  batchComputeEnvironment(spot: boolean, gpu: boolean) {
    return buildCfLogicalName({
      specifier: {
        type: `Batch-${spot ? 'spot' : 'onDemand'}-${gpu ? 'gpu' : ''}`
      },
      suffix: { cloudformationResourceType: 'AWS::Batch::ComputeEnvironment' }
    });
  },
  batchJobQueue(spot: boolean, gpu: boolean) {
    return buildCfLogicalName({
      specifier: {
        type: `Batch-${spot ? 'spot' : 'onDemand'}-${gpu ? 'gpu' : ''}`
      },
      suffix: { cloudformationResourceType: 'AWS::Batch::JobQueue' }
    });
  },
  subnet(publicSubnet: boolean, subnetIndex: number) {
    return buildCfLogicalName({
      specifier: {
        type: publicSubnet ? 'Public' : 'Private'
      },
      suffix: { cloudformationResourceType: 'AWS::EC2::Subnet', index: subnetIndex }
    });
  },
  vpc() {
    return buildCfLogicalName({
      suffix: { cloudformationResourceType: 'AWS::EC2::VPC' }
    });
  },
  vpcGatewayEndpoint(type: 's3' | 'dynamo-db') {
    return buildCfLogicalName({
      specifier: { type: `${type}-Gateway` },
      suffix: { cloudformationResourceType: 'AWS::EC2::VPCEndpoint' }
    });
  },
  dbSubnetGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::RDS::DBSubnetGroup' }
    });
  },
  auroraDbCluster(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::RDS::DBCluster' }
    });
  },
  auroraDbClusterParameterGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::RDS::DBClusterParameterGroup' }
    });
  },
  auroraDbClusterLogGroup(stpResourceName: string, logGroupType: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Cluster', subtype: logGroupType },
      suffix: { cloudformationResourceType: 'AWS::Logs::LogGroup' }
    });
  },
  dbSecurityGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::EC2::SecurityGroup' }
    });
  },
  dbInstance(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::RDS::DBInstance' }
    });
  },
  dbInstanceLogGroup(stpResourceName: string, logGroupType: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Instance', subtype: logGroupType },
      suffix: { cloudformationResourceType: 'AWS::Logs::LogGroup' }
    });
  },
  openSearchDomainLogGroup(stpResourceName: string, logGroupType: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Instance', subtype: logGroupType },
      suffix: { cloudformationResourceType: 'AWS::Logs::LogGroup' }
    });
  },
  dbOptionGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::RDS::OptionGroup' }
    });
  },
  dbInstanceParameterGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::RDS::DBParameterGroup' }
    });
  },
  dbReplica(stpResourceName: string, replicaNum: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Replica', typeIndex: replicaNum },
      suffix: { cloudformationResourceType: 'AWS::RDS::DBInstance' }
    });
  },
  dbReplicaLogGroup(stpResourceName: string, logGroupType: string, replicaNum: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Replica', typeIndex: replicaNum, subtype: logGroupType },
      suffix: { cloudformationResourceType: 'AWS::Logs::LogGroup' }
    });
  },
  dbReplicaParameterGroup(stpResourceName: string, replicaNum: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Replica', typeIndex: replicaNum },
      suffix: { cloudformationResourceType: 'AWS::RDS::DBParameterGroup' }
    });
  },
  auroraDbInstance(stpResourceName: string, instanceNum: number) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::RDS::DBInstance', index: instanceNum }
    });
  },
  auroraDbInstanceParameterGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Instance' },
      suffix: { cloudformationResourceType: 'AWS::RDS::DBParameterGroup' }
    });
  },
  eventBusRule(stpResourceName: string, eventIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: 'Event',
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: 'AWS::Events::Rule' }
    });
  },
  customTaggingScheduleRule() {
    return buildCfLogicalName({
      specifier: { type: 'StpCustomTaggingSchedule' },
      suffix: { cloudformationResourceType: 'AWS::Events::Rule' }
    });
  },
  customTaggingScheduleRulePermission() {
    return buildCfLogicalName({
      specifier: { type: 'StpCustomTaggingScheduleRule' },
      suffix: { cloudformationResourceType: 'AWS::Lambda::Permission' }
    });
  },
  cloudWatchLogEventSubscriptionFilter(stpResourceName: string, eventIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: 'Event',
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: 'AWS::Logs::SubscriptionFilter' }
    });
  },
  eventSourceMapping(stpResourceName: string, eventIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: 'Event',
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: 'AWS::Lambda::EventSourceMapping' }
    });
  },
  iotEventTopicRule(stpResourceName: string, eventIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: 'Event',
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: 'AWS::IoT::TopicRule' }
    });
  },
  kinesisEventConsumer(stpResourceName: string, eventIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: 'Event',
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: 'AWS::Kinesis::StreamConsumer' }
    });
  },
  lambda(stpResourceName: string, isStpServiceFunction?: boolean) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: isStpServiceFunction ? { type: 'CustomResource' } : undefined,
      suffix: { cloudformationResourceType: 'AWS::Lambda::Function' }
    });
  },
  lambdaStpAlias(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: 'Stp'
      },
      suffix: { cloudformationResourceType: 'AWS::Lambda::Alias' }
    });
  },
  lambdaUrl(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Lambda::Url' }
    });
  },
  codeDeployDeploymentGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::CodeDeploy::DeploymentGroup' }
    });
  },
  customResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  scriptCustomResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Script' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  batchStateMachine(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'JobExecution' },
      suffix: { cloudformationResourceType: 'AWS::StepFunctions::StateMachine' }
    });
  },
  batchJobDefinition(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Batch::JobDefinition' }
    });
  },
  batchJobLogGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Logs::LogGroup' }
    });
  },
  globalStateMachinesRole() {
    return buildCfLogicalName({
      specifier: {
        type: 'GlobalStateMachine'
      },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  stateMachine(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::StepFunctions::StateMachine' }
    });
  },
  internetGateway() {
    return buildCfLogicalName({
      suffix: { cloudformationResourceType: 'AWS::EC2::InternetGateway' }
    });
  },
  vpcGatewayAttachment() {
    return buildCfLogicalName({
      suffix: { cloudformationResourceType: 'AWS::EC2::VPCGatewayAttachment' }
    });
  },
  routeTable(publicSubnet: boolean, subnetIndex: number) {
    return buildCfLogicalName({
      specifier: { type: publicSubnet ? 'PublicSubnet' : 'PrivateSubnet', typeIndex: subnetIndex },
      suffix: { cloudformationResourceType: 'AWS::EC2::RouteTable' }
    });
  },
  internetGatewayRoute(subnetIndex: number) {
    return buildCfLogicalName({
      specifier: { type: 'InternetGateway' },
      suffix: { cloudformationResourceType: 'AWS::EC2::Route', index: subnetIndex }
    });
  },
  atlasMongoVpcRoute(publicSubnetTable: boolean, subnetIndex: number) {
    return buildCfLogicalName({
      specifier: { type: `AtlasMongo${publicSubnetTable ? 'PublicSubnet' : 'PrivateSubnet'}` },
      suffix: { cloudformationResourceType: 'AWS::EC2::Route', index: subnetIndex }
    });
  },
  routeTableToSubnetAssociation(publicSubnet: boolean, subnetIndex: number) {
    return buildCfLogicalName({
      specifier: { type: publicSubnet ? 'PublicSubnet' : 'PrivateSubnet', typeIndex: subnetIndex },
      suffix: { cloudformationResourceType: 'AWS::EC2::SubnetRouteTableAssociation' }
    });
  },
  natGateway(azIndex: number) {
    return buildCfLogicalName({
      suffix: { cloudformationResourceType: 'AWS::EC2::NatGateway', index: azIndex }
    });
  },
  natElasticIp(azIndex: number) {
    return buildCfLogicalName({
      specifier: { type: 'Nat' },
      suffix: { cloudformationResourceType: 'AWS::EC2::EIP', index: azIndex }
    });
  },
  natRoute(subnetIndex: number) {
    return buildCfLogicalName({
      specifier: { type: 'NatPrivateSubnet' },
      suffix: { cloudformationResourceType: 'AWS::EC2::Route', index: subnetIndex }
    });
  },
  eventBus(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Events::EventBus' }
    });
  },
  eventBusArchive(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Events::Archive' }
    });
  },
  ecsCluster(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ECS::Cluster' }
    });
  },
  ecsTaskDefinition(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ECS::TaskDefinition' }
    });
  },
  ecsService(stpResourceName: string, blueGreen: boolean) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: blueGreen ? { type: 'BlueGreen' } : undefined,
      suffix: { cloudformationResourceType: 'AWS::ECS::Service' }
    });
  },
  ecsExecutionRole() {
    return buildCfLogicalName({
      specifier: { type: 'EcsExecution' },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  ecsEc2InstanceRole() {
    return buildCfLogicalName({
      specifier: {
        type: 'EcsInstance'
      },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  ecsEc2AutoscalingGroupWarmPool(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::AutoScaling::WarmPool' }
    });
  },
  eventBusRoleForScheduledInstanceRefresh() {
    return buildCfLogicalName({
      specifier: { type: 'ScheduledInstanceRefresh' },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  schedulerRuleForScheduledInstanceRefresh(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'ScheduledInstanceRefresh' },
      suffix: { cloudformationResourceType: 'AWS::Events::Rule' }
    });
  },
  ecsEc2InstanceLaunchTemplate(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::EC2::LaunchTemplate' }
    });
  },
  ecsEc2AutoscalingGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::AutoScaling::AutoScalingGroup' }
    });
  },
  ecsEc2ForceDeleteAutoscalingGroupCustomResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'ForceDeleteAsg' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  ecsDisableManagedTerminationProtectionCustomResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'DisableManagedTerminationProtection' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  ecsDeregisterTargetsCustomResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'DeregisterTargets' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },

  ecsEc2CapacityProvider(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ECS::CapacityProvider' }
    });
  },
  ecsEc2CapacityProviderAssociation(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ECS::ClusterCapacityProviderAssociations' }
    });
  },
  ecsEc2InstanceProfile() {
    return buildCfLogicalName({
      specifier: {
        type: 'EcsInstance'
      },
      suffix: { cloudformationResourceType: 'AWS::IAM::InstanceProfile' }
    });
  },
  ecsTaskRole(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  ecsAutoScalingRole() {
    return buildCfLogicalName({
      specifier: { type: 'EcsAutoScale' },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  // ecsScheduledMaintenanceEventBusRule(stpResourceName: string) {
  //   return buildCfLogicalName({
  //     stpResourceName,
  //     specifier: { type: 'ScheduledMaintenance' },
  //     suffix: { cloudformationResourceType: 'AWS::Events::Rule' }
  //   }).replaceAll('_', '');
  // },
  ecsScheduledMaintenanceLambdaPermission(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'ScheduledMaintenance' },
      suffix: { cloudformationResourceType: 'AWS::Lambda::Permission' }
    }).replaceAll('_', '');
  },
  bastionEc2LaunchTemplate(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::EC2::LaunchTemplate' }
    });
  },
  bastionEc2InstanceProfile(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::IAM::InstanceProfile' }
    });
  },
  bastionEc2AutoscalingGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::AutoScaling::AutoScalingGroup' }
    });
  },
  bastionSecurityGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::EC2::SecurityGroup' }
    });
  },
  bastionCwAgentSsmAssociation(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'CwAgent' },
      suffix: { cloudformationResourceType: 'AWS::SSM::Association' }
    });
  },
  bastionSsmAgentSsmAssociation(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'SsmAgent' },
      suffix: { cloudformationResourceType: 'AWS::SSM::Association' }
    });
  },
  bastionRole(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  bastionLogGroup(stpResourceName: string, logType: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: pascalCase(logType) },
      suffix: { cloudformationResourceType: 'AWS::Logs::LogGroup' }
    });
  },
  bastionCloudwatchSsmDocument() {
    return buildCfLogicalName({
      specifier: { type: 'BastionCloudwatchAgent' },
      suffix: { cloudformationResourceType: 'AWS::SSM::Document' }
    });
  },
  serviceDiscoveryEcsService(stpResourceName: string, serviceTargetContainerPort: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `Port${serviceTargetContainerPort}Discovery` },
      suffix: { cloudformationResourceType: 'AWS::ServiceDiscovery::Service' }
    });
  },
  workloadSecurityGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::EC2::SecurityGroup' }
    });
  },
  loadBalancerSecurityGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Lb' },
      suffix: { cloudformationResourceType: 'AWS::EC2::SecurityGroup' }
    });
  },
  targetGroup({
    loadBalancerName,
    stpResourceName,
    targetContainerPort,
    blueGreen
  }: {
    stpResourceName: string;
    loadBalancerName: string;
    targetContainerPort?: number;
    blueGreen?: boolean;
  }) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: `${loadBalancerName}${targetContainerPort ? `ToPort${targetContainerPort}` : ''}${blueGreen ? 'BG' : ''}`
      },
      suffix: { cloudformationResourceType: 'AWS::ElasticLoadBalancingV2::TargetGroup' }
    });
  },
  lambdaRole(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  defaultLambdaFunctionRole() {
    return buildCfLogicalName({
      specifier: { type: 'Lambda' },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  lambdaPermission(stpResourceName: string, eventIndex: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'Event', typeIndex: eventIndex },
      suffix: { cloudformationResourceType: 'AWS::Lambda::Permission' }
    });
  },
  lambdaPublicUrlPermission(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'PublicUrl' },
      suffix: { cloudformationResourceType: 'AWS::Lambda::Permission' }
    });
  },
  lambdaIotEventPermission(workloadName: string, eventIndex: number) {
    return pascalCase(`${workloadName}-Event${eventIndex}-lambda-iotEventPermission`);
  },
  lambdaTargetGroupPermission(stpResourceName: string, loadBalancerName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `${loadBalancerName}TargetGroup` },
      suffix: { cloudformationResourceType: 'AWS::Lambda::Permission' }
    });
  },
  httpApi(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::Api' }
    });
  },
  httpApiLogGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Logs::LogGroup' }
    });
  },
  httpApiLambdaIntegration({
    stpResourceName,
    stpHttpApiGatewayName
  }: {
    stpResourceName: string;
    stpHttpApiGatewayName: string;
  }) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: stpHttpApiGatewayName },
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::Integration' }
    });
  },
  httpApiContainerWorkloadIntegration({
    stpResourceName,
    stpHttpApiGatewayName,
    targetContainerPort
  }: {
    stpResourceName: string;
    targetContainerPort: number;
    stpHttpApiGatewayName: string;
  }) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `${stpHttpApiGatewayName}ToPort${targetContainerPort}` },
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::Integration' }
    });
  },
  httpApiAuthorizer({ method, path, stpResourceName }: { method: HttpMethod; path: string; stpResourceName: string }) {
    return buildCfLogicalName({
      stpResourceName: '',
      specifier: {
        type: `${stpResourceName}-${method === '*' ? 'Any' : method}-${path === '*' ? 'Default' : path}`
      },
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::Authorizer' }
    });
  },
  httpApiRoute({ method, path, stpResourceName }: { method: HttpMethod; path: string; stpResourceName: string }) {
    return buildCfLogicalName({
      stpResourceName: '',
      specifier: {
        type: `${stpResourceName}-${method === '*' ? 'Any' : method}-${path === '*' ? 'Default' : path}`
      },
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::Route' }
    });
  },
  httpApiVpcLink(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::VpcLink' }
    });
  },
  httpApiVpcLinkSecurityGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'VpcLink' },
      suffix: { cloudformationResourceType: 'AWS::EC2::SecurityGroup' }
    });
  },
  httpApiLambdaPermission({
    stpResourceNameOfLambda,
    stpResourceNameOfHttpApiGateway
  }: {
    stpResourceNameOfLambda: string;
    stpResourceNameOfHttpApiGateway: string;
  }) {
    return buildCfLogicalName({
      stpResourceName: stpResourceNameOfLambda,
      specifier: { type: stpResourceNameOfHttpApiGateway },
      suffix: { cloudformationResourceType: 'AWS::Lambda::Permission' }
    });
  },
  httpApiStage(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::Stage' }
    });
  },
  httpApiDomain(fullyQualifiedDomainName: string) {
    // we do not build build the resource name conventionally through stpResourceName
    // this is due to update behaviors of Cloudformation
    return buildCfLogicalName({
      stpResourceName: '',
      specifier: { type: getSpecifierForDomainResource(fullyQualifiedDomainName) },
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::DomainName' }
    });
  },
  httpApiDefaultDomain(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::DomainName' }
    });
  },
  httpApiDomainMapping(fullyQualifiedDomainName: string) {
    // we do not build build the resource name conventionally through stpResourceName
    // this is due to update behaviors of Cloudformation
    return buildCfLogicalName({
      stpResourceName: '',
      specifier: { type: getSpecifierForDomainResource(fullyQualifiedDomainName) },
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::ApiMapping' }
    });
  },
  httpApiDefaultDomainMapping(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ApiGatewayV2::ApiMapping' }
    });
  },
  listener(exposurePort: number, stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `Port${exposurePort}` },
      suffix: { cloudformationResourceType: 'AWS::ElasticLoadBalancingV2::Listener' }
    });
  },
  listenerRule(exposurePort: number, stpResourceName: string, rulePriority: number) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `Port${exposurePort}Priority${rulePriority}` },
      suffix: { cloudformationResourceType: 'AWS::ElasticLoadBalancingV2::ListenerRule' }
    });
  },
  listenerCertificateList(exposurePort: number, stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `Port${exposurePort}` },
      suffix: { cloudformationResourceType: 'AWS::ElasticLoadBalancingV2::ListenerCertificate' }
    });
  },
  loadBalancer(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer' }
    });
  },
  ecsLogGroup(stpResourceName: string, containerName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: containerName },
      suffix: { cloudformationResourceType: 'AWS::Logs::LogGroup' }
    });
  },
  autoScalingTarget(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::ApplicationAutoScaling::ScalableTarget' }
    });
  },
  dynamoAutoScalingTarget(stpResourceName: string, metric: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: metric },
      suffix: { cloudformationResourceType: 'AWS::ApplicationAutoScaling::ScalableTarget' }
    });
  },
  autoScalingPolicy(stpResourceName: string, metric: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: metric },
      suffix: { cloudformationResourceType: 'AWS::ApplicationAutoScaling::ScalingPolicy' }
    });
  },
  customResourceS3Events() {
    return buildCfLogicalName({
      specifier: { type: 'Events' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  // @deprecated
  // stacktapeServiceCustomResourceEdgeFunctions() {
  //   return buildCfLogicalName({
  //     specifier: { type: 'EdgeFunctions' },
  //     suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
  //   });
  // },
  customResourceSensitiveData() {
    return buildCfLogicalName({
      specifier: { type: 'SensitiveData' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  customResourceAcceptVpcPeerings() {
    return buildCfLogicalName({
      specifier: { type: 'AcceptVpcPeerings' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  customResourceDefaultDomainCert() {
    return buildCfLogicalName({
      specifier: { type: 'DefaultDomainCert' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  customResourceEdgeLambdaBucket() {
    return buildCfLogicalName({
      specifier: { type: 'EdgeLambdaBucket' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  customResourceEdgeLambda(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'EdgeLambda' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  customResourceDefaultDomain(stpResourceName: string, cdn?: boolean) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `${cdn ? 'Cdn' : ''}DefaultDomain` },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  customResourceDatabaseDeletionProtection(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'DeletionProtection' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  userPool(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Cognito::UserPool' }
    });
  },
  userPoolClient(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Cognito::UserPoolClient' }
    });
  },
  userPoolDomain(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Cognito::UserPoolDomain' }
    });
  },
  identityProvider(stpResourceName: string, type: StpUserAuthPool['identityProviders'][number]['type']) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type },
      suffix: { cloudformationResourceType: 'AWS::Cognito::UserPoolIdentityProvider' }
    });
  },
  cognitoLambdaHookPermission(stpResourceName: string, hookName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: hookName },
      suffix: { cloudformationResourceType: 'AWS::Lambda::Permission' }
    });
  },
  cognitoUserPoolDetailsCustomResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'UserPoolDetails' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  userPoolUiCustomizationAttachment(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::Cognito::UserPoolUICustomizationAttachment' }
    });
  },
  serviceDiscoveryPrivateNamespace() {
    return buildCfLogicalName({
      specifier: { type: 'Discovery' },
      suffix: { cloudformationResourceType: 'AWS::ServiceDiscovery::Service' }
    });
  },
  lambdaCodeDeployApp() {
    return buildCfLogicalName({
      specifier: { type: 'LambdaCodeDeploy' },
      suffix: { cloudformationResourceType: 'AWS::CodeDeploy::Application' }
    });
  },
  sharedChunkLayer(layerNumber: number) {
    return buildCfLogicalName({
      specifier: { type: `SharedChunkLayer${layerNumber}` },
      suffix: { cloudformationResourceType: 'AWS::Lambda::LayerVersion' }
    });
  },
  ecsCodeDeployApp() {
    return buildCfLogicalName({
      specifier: { type: 'ECSCodeDeploy' },
      suffix: { cloudformationResourceType: 'AWS::CodeDeploy::Application' }
    });
  },
  stackBudget(stackName: string) {
    return buildCfLogicalName({
      specifier: { type: pascalCase(stackName).replaceAll('_', '') },
      suffix: { cloudformationResourceType: 'AWS::Budgets::Budget' }
    });
  },
  upstashRedisDatabase(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'Upstash::DatabasesV1::Database' }
    });
  },
  upstashCredentialsProvider() {
    return buildCfLogicalName({
      specifier: { type: 'UpstashCredentialsProvider' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  cloudwatchAlarm(stacktapeAlarmName: string) {
    return buildCfLogicalName({
      stpResourceName: stacktapeAlarmName,
      suffix: { cloudformationResourceType: 'AWS::CloudWatch::Alarm' }
    }).replaceAll('_', '');
  },
  cloudwatchAlarmEventBusNotificationRule(stacktapeAlarmName: string) {
    return buildCfLogicalName({
      stpResourceName: stacktapeAlarmName,
      specifier: { type: 'Notification' },
      suffix: { cloudformationResourceType: 'AWS::Events::Rule' }
    }).replaceAll('_', '');
  },
  cloudwatchAlarmEventBusNotificationRuleLambdaPermission(stacktapeAlarmName: string) {
    return buildCfLogicalName({
      stpResourceName: stacktapeAlarmName,
      specifier: { type: 'Notification' },
      suffix: { cloudformationResourceType: 'AWS::Lambda::Permission' }
    }).replaceAll('_', '');
  },
  sqsQueue(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::SQS::Queue' }
    }).replaceAll('_', '');
  },
  sqsQueuePolicy(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::SQS::QueuePolicy' }
    });
  },
  snsTopic(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::SNS::Topic' }
    }).replaceAll('_', '');
  },
  webAppFirewallCustomResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'WebAppFirewall' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  webAppFirewallAssociation(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::WAFv2::WebACLAssociation' }
    });
  },
  openSearchDomain(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::OpenSearchService::Domain' }
    });
  },
  openSearchCustomResource(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'OpenSearch' },
      suffix: { cloudformationResourceType: 'AWS::CloudFormation::CustomResource' }
    });
  },
  openSearchSecurityGroup(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: 'AWS::EC2::SecurityGroup' }
    });
  },
  logForwardingFirehoseToS3Role(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'LogForwardingS3' },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  logForwardingCwToFirehoseRole({ logGroupCfLogicalName }: { logGroupCfLogicalName: string }) {
    return buildCfLogicalName({
      stpResourceName: logGroupCfLogicalName,
      specifier: { type: 'CwToFirehose' },
      suffix: { cloudformationResourceType: 'AWS::IAM::Role' }
    });
  },
  logForwardingFailedEventsBucket(stpResourceName: string) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: 'LogForwardingFailedRecords' },
      suffix: { cloudformationResourceType: 'AWS::S3::Bucket' }
    });
  },
  logForwardingFirehoseDeliveryStream({ logGroupCfLogicalName }: { logGroupCfLogicalName: string }) {
    return buildCfLogicalName({
      stpResourceName: logGroupCfLogicalName,
      suffix: { cloudformationResourceType: 'AWS::KinesisFirehose::DeliveryStream' }
    });
  },
  logForwardingSubscriptionFilter({ logGroupCfLogicalName }: { logGroupCfLogicalName: string }) {
    return buildCfLogicalName({
      stpResourceName: logGroupCfLogicalName,
      suffix: { cloudformationResourceType: 'AWS::Logs::SubscriptionFilter' }
    });
  }
};

const buildCfLogicalName = ({
  stpResourceName,
  specifier,
  suffix
}: {
  stpResourceName?: string;
  specifier?: { type: string; typeIndex?: number; subtype?: string };
  suffix: {
    cloudformationResourceType: CloudformationResourceType | SupportedPrivateCfResourceType;
    index?: number;
  };
}) => {
  const splittedType = suffix.cloudformationResourceType.split(':');
  const resolvedParentName = stpResourceName || 'Stp';
  const resolvedSpecifier = specifier
    ? `${specifier.type}${specifier.typeIndex !== undefined ? specifier.typeIndex : ''}${
        specifier.subtype !== undefined ? `-${specifier.subtype}` : ''
      }`
    : '';
  const resolvedSuffix = `${splittedType[splittedType.length - 1]}${suffix.index !== undefined ? suffix.index : ''}`;
  return pascalCase(`${resolvedParentName}-${resolvedSpecifier}-${resolvedSuffix}`);
};

const getSpecifierForDomainResource = (fullyQualifiedDomainName) => {
  if (pascalCase(fullyQualifiedDomainName).replace('_', '').length < 85) {
    return pascalCase(fullyQualifiedDomainName).replace('_', '');
  }
  const splittedDomain = fullyQualifiedDomainName
    .split('.')
    .map((subdomain) => subdomain.split('-'))
    .flat();
  const maxCharactersPerWord = Math.floor(85 / splittedDomain.length);
  return splittedDomain.map((word) => pascalCase(word.slice(0, maxCharactersPerWord)).replace('_', '')).join('');
};
