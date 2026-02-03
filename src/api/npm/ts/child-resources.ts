import { cfLogicalNames } from '../../../../shared/naming/logical-names';

export const CHILD_RESOURCES: Record<
  StpResourceType,
  Array<{ logicalName: (...args: any[]) => string; resourceType: string; conditional?: true; unresolvable?: true }>
> = {
  // ===== BUCKET =====
  bucket: [
    { logicalName: cfLogicalNames.bucket, resourceType: 'AWS::S3::Bucket' },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: 'AWS::S3::BucketPolicy', conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: 'AWS::CloudFront::Distribution',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: 'AWS::Route53::RecordSet', conditional: true }
  ],

  // ===== FUNCTION =====
  function: [
    { logicalName: cfLogicalNames.lambdaRole, resourceType: 'AWS::IAM::Role' },
    { logicalName: cfLogicalNames.lambda, resourceType: 'AWS::Lambda::Function' },
    { logicalName: cfLogicalNames.efsAccessPoint, resourceType: 'AWS::EFS::AccessPoint', conditional: true },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup', conditional: true },
    { logicalName: cfLogicalNames.lambdaUrl, resourceType: 'AWS::Lambda::Url', conditional: true },
    {
      logicalName: cfLogicalNames.lambdaPublicUrlPermission,
      resourceType: 'AWS::Lambda::Permission',
      conditional: true
    },
    { logicalName: cfLogicalNames.lambdaLogGroup, resourceType: 'AWS::Logs::LogGroup', conditional: true },
    {
      logicalName: cfLogicalNames.lambdaInvokeConfig,
      resourceType: 'AWS::Lambda::EventInvokeConfig',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.lambdaCodeDeployApp,
      resourceType: 'AWS::CodeDeploy::Application',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.lambdaVersionPublisherCustomResource,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.codeDeployDeploymentGroup,
      resourceType: 'AWS::CodeDeploy::DeploymentGroup',
      conditional: true
    },
    { logicalName: cfLogicalNames.lambdaStpAlias, resourceType: 'AWS::Lambda::Alias', conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: 'AWS::CloudFront::Distribution',
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: 'AWS::Route53::RecordSet', conditional: true },
    {
      logicalName: cfLogicalNames.lambdaPermission,
      resourceType: 'AWS::Lambda::Permission',
      conditional: true,
      unresolvable: true
    }
  ],

  // ===== RELATIONAL DATABASE =====
  'relational-database': [
    { logicalName: cfLogicalNames.dbSubnetGroup, resourceType: 'AWS::RDS::DBSubnetGroup' },
    { logicalName: cfLogicalNames.dbSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup' },
    {
      logicalName: cfLogicalNames.customResourceDatabaseDeletionProtection,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.auroraDbCluster, resourceType: 'AWS::RDS::DBCluster', conditional: true },
    {
      logicalName: cfLogicalNames.auroraDbClusterParameterGroup,
      resourceType: 'AWS::RDS::DBClusterParameterGroup',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.auroraDbClusterLogGroup,
      resourceType: 'AWS::Logs::LogGroup',
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.auroraDbInstance,
      resourceType: 'AWS::RDS::DBInstance',
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.auroraDbInstanceParameterGroup,
      resourceType: 'AWS::RDS::DBParameterGroup',
      conditional: true
    },
    { logicalName: cfLogicalNames.dbInstance, resourceType: 'AWS::RDS::DBInstance', conditional: true },
    {
      logicalName: cfLogicalNames.dbInstanceLogGroup,
      resourceType: 'AWS::Logs::LogGroup',
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.dbOptionGroup, resourceType: 'AWS::RDS::OptionGroup', conditional: true },
    {
      logicalName: cfLogicalNames.dbInstanceParameterGroup,
      resourceType: 'AWS::RDS::DBParameterGroup',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.dbReplica,
      resourceType: 'AWS::RDS::DBInstance',
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.dbReplicaLogGroup,
      resourceType: 'AWS::Logs::LogGroup',
      conditional: true,
      unresolvable: true
    }
  ],

  // ===== DYNAMO DB TABLE =====
  'dynamo-db-table': [{ logicalName: cfLogicalNames.dynamoGlobalTable, resourceType: 'AWS::DynamoDB::GlobalTable' }],

  // ===== HTTP API GATEWAY =====
  'http-api-gateway': [
    { logicalName: cfLogicalNames.httpApi, resourceType: 'AWS::ApiGatewayV2::Api' },
    { logicalName: cfLogicalNames.httpApiStage, resourceType: 'AWS::ApiGatewayV2::Stage' },
    { logicalName: cfLogicalNames.httpApiLogGroup, resourceType: 'AWS::Logs::LogGroup', conditional: true },
    {
      logicalName: cfLogicalNames.httpApiVpcLinkSecurityGroup,
      resourceType: 'AWS::EC2::SecurityGroup',
      conditional: true
    },
    { logicalName: cfLogicalNames.httpApiVpcLink, resourceType: 'AWS::ApiGatewayV2::VpcLink', conditional: true },
    { logicalName: cfLogicalNames.httpApiDomain, resourceType: 'AWS::ApiGatewayV2::DomainName', conditional: true },
    {
      logicalName: cfLogicalNames.httpApiDomainMapping,
      resourceType: 'AWS::ApiGatewayV2::ApiMapping',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.httpApiDefaultDomain,
      resourceType: 'AWS::ApiGatewayV2::DomainName',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.httpApiDefaultDomainMapping,
      resourceType: 'AWS::ApiGatewayV2::ApiMapping',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: 'AWS::Route53::RecordSet', conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: 'AWS::CloudFront::Distribution',
      conditional: true
    }
  ],

  // ===== BATCH JOB =====
  'batch-job': [
    { logicalName: cfLogicalNames.batchServiceRole, resourceType: 'AWS::IAM::Role', conditional: true },
    { logicalName: cfLogicalNames.batchSpotFleetRole, resourceType: 'AWS::IAM::Role', conditional: true },
    { logicalName: cfLogicalNames.batchInstanceRole, resourceType: 'AWS::IAM::Role', conditional: true },
    { logicalName: cfLogicalNames.batchInstanceProfile, resourceType: 'AWS::IAM::InstanceProfile', conditional: true },
    { logicalName: cfLogicalNames.batchStateMachineExecutionRole, resourceType: 'AWS::IAM::Role', conditional: true },
    {
      logicalName: cfLogicalNames.batchInstanceLaunchTemplate,
      resourceType: 'AWS::EC2::LaunchTemplate',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.batchInstanceDefaultSecurityGroup,
      resourceType: 'AWS::EC2::SecurityGroup',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.batchComputeEnvironment,
      resourceType: 'AWS::Batch::ComputeEnvironment',
      conditional: true
    },
    { logicalName: cfLogicalNames.batchJobQueue, resourceType: 'AWS::Batch::JobQueue', conditional: true },
    { logicalName: cfLogicalNames.batchJobDefinition, resourceType: 'AWS::Batch::JobDefinition' },
    { logicalName: cfLogicalNames.batchStateMachine, resourceType: 'AWS::StepFunctions::StateMachine' },
    { logicalName: cfLogicalNames.batchJobLogGroup, resourceType: 'AWS::Logs::LogGroup', conditional: true },
    { logicalName: cfLogicalNames.batchJobExecutionRole, resourceType: 'AWS::IAM::Role' },
    {
      logicalName: cfLogicalNames.atlasMongoUserAssociatedWithRole,
      resourceType: 'MongoDB::StpAtlasV1::DatabaseUser',
      conditional: true
    }
  ],

  // ===== EVENT BUS =====
  'event-bus': [
    { logicalName: cfLogicalNames.eventBus, resourceType: 'AWS::Events::EventBus' },
    { logicalName: cfLogicalNames.eventBusArchive, resourceType: 'AWS::Events::Archive', conditional: true }
  ],

  // ===== STATE MACHINE =====
  'state-machine': [
    { logicalName: cfLogicalNames.globalStateMachinesRole, resourceType: 'AWS::IAM::Role', conditional: true },
    { logicalName: cfLogicalNames.stateMachine, resourceType: 'AWS::StepFunctions::StateMachine' }
  ],

  // ===== REDIS CLUSTER =====
  'redis-cluster': [
    { logicalName: cfLogicalNames.redisParameterGroup, resourceType: 'AWS::ElastiCache::ParameterGroup' },
    { logicalName: cfLogicalNames.redisSubnetGroup, resourceType: 'AWS::ElastiCache::SubnetGroup' },
    { logicalName: cfLogicalNames.redisSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup' },
    { logicalName: cfLogicalNames.redisLogGroup, resourceType: 'AWS::Logs::LogGroup', conditional: true },
    { logicalName: cfLogicalNames.redisReplicationGroup, resourceType: 'AWS::ElastiCache::ReplicationGroup' }
  ],

  // ===== MONGO DB ATLAS CLUSTER =====
  'mongo-db-atlas-cluster': [
    {
      logicalName: cfLogicalNames.atlasMongoCredentialsProvider,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.atlasMongoProject, resourceType: 'MongoDB::StpAtlasV1::Project', conditional: true },
    {
      logicalName: cfLogicalNames.atlasMongoProjectIpAccessList,
      resourceType: 'MongoDB::StpAtlasV1::ProjectIpAccessList',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.atlasMongoProjectVpcNetworkContainer,
      resourceType: 'MongoDB::StpAtlasV1::NetworkContainer',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.atlasMongoProjectVpcNetworkPeering,
      resourceType: 'MongoDB::StpAtlasV1::NetworkPeering',
      conditional: true
    },
    { logicalName: cfLogicalNames.atlasMongoVpcRoute, resourceType: 'AWS::EC2::Route', conditional: true },
    { logicalName: cfLogicalNames.atlasMongoCluster, resourceType: 'MongoDB::StpAtlasV1::Cluster' },
    {
      logicalName: cfLogicalNames.atlasMongoClusterMasterUser,
      resourceType: 'MongoDB::StpAtlasV1::DatabaseUser',
      conditional: true
    }
  ],

  // ===== USER AUTH POOL =====
  'user-auth-pool': [
    { logicalName: cfLogicalNames.userPool, resourceType: 'AWS::Cognito::UserPool' },
    { logicalName: cfLogicalNames.snsRoleSendSmsFromCognito, resourceType: 'AWS::IAM::Role' },
    { logicalName: cfLogicalNames.userPoolClient, resourceType: 'AWS::Cognito::UserPoolClient' },
    { logicalName: cfLogicalNames.userPoolDomain, resourceType: 'AWS::Cognito::UserPoolDomain' },
    {
      logicalName: cfLogicalNames.cognitoUserPoolDetailsCustomResource,
      resourceType: 'AWS::CloudFormation::CustomResource'
    },
    {
      logicalName: cfLogicalNames.identityProvider,
      resourceType: 'AWS::Cognito::UserPoolIdentityProvider',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cognitoLambdaHookPermission,
      resourceType: 'AWS::Lambda::Permission',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.userPoolUiCustomizationAttachment,
      resourceType: 'AWS::Cognito::UserPoolUICustomizationAttachment',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.webAppFirewallAssociation,
      resourceType: 'AWS::WAFv2::WebACLAssociation',
      conditional: true
    }
  ],

  // ===== UPSTASH REDIS =====
  'upstash-redis': [
    {
      logicalName: cfLogicalNames.upstashCredentialsProvider,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.upstashRedisDatabase, resourceType: 'Upstash::Redis::Database' }
  ],

  // ===== APPLICATION LOAD BALANCER =====
  'application-load-balancer': [
    { logicalName: cfLogicalNames.loadBalancer, resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer' },
    { logicalName: cfLogicalNames.loadBalancerSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup' },
    {
      logicalName: cfLogicalNames.webAppFirewallAssociation,
      resourceType: 'AWS::WAFv2::WebACLAssociation',
      conditional: true
    },
    { logicalName: cfLogicalNames.listener, resourceType: 'AWS::ElasticLoadBalancingV2::Listener', conditional: true },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: 'AWS::Route53::RecordSet', conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: 'AWS::CloudFront::Distribution',
      conditional: true
    }
  ],

  // ===== NETWORK LOAD BALANCER =====
  'network-load-balancer': [
    { logicalName: cfLogicalNames.loadBalancer, resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer' },
    { logicalName: cfLogicalNames.loadBalancerSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup' },
    { logicalName: cfLogicalNames.listener, resourceType: 'AWS::ElasticLoadBalancingV2::Listener', conditional: true },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: 'AWS::Route53::RecordSet', conditional: true }
  ],

  // ===== HOSTING BUCKET =====
  // Hosting bucket delegates to a bucket resource, so it includes all bucket child resources
  'hosting-bucket': [
    { logicalName: cfLogicalNames.bucket, resourceType: 'AWS::S3::Bucket' },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: 'AWS::S3::BucketPolicy', conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: 'AWS::CloudFront::Distribution',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: 'AWS::Route53::RecordSet', conditional: true }
  ],

  // ===== WEB APP FIREWALL =====
  'web-app-firewall': [
    { logicalName: cfLogicalNames.webAppFirewallCustomResource, resourceType: 'AWS::CloudFormation::CustomResource' }
  ],

  // ===== OPEN SEARCH DOMAIN =====
  'open-search-domain': [
    { logicalName: cfLogicalNames.openSearchDomain, resourceType: 'AWS::OpenSearchService::Domain' },
    { logicalName: cfLogicalNames.openSearchSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup', conditional: true },
    {
      logicalName: cfLogicalNames.openSearchDomainLogGroup,
      resourceType: 'AWS::Logs::LogGroup',
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.openSearchCustomResource,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    }
  ],

  // ===== EFS FILESYSTEM =====
  'efs-filesystem': [
    { logicalName: cfLogicalNames.efsFilesystem, resourceType: 'AWS::EFS::FileSystem' },
    { logicalName: cfLogicalNames.efsSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup' },
    {
      logicalName: cfLogicalNames.efsMountTarget,
      resourceType: 'AWS::EFS::MountTarget',
      unresolvable: true
    }
  ],

  // ===== NEXTJS WEB =====
  // NextJS web delegates to: bucket, imageFunction, revalidationFunction, revalidationQueue,
  // revalidationTable, revalidationInsertFunction, and optionally serverEdgeFunction or serverFunction
  'nextjs-web': [
    // NextJS-specific resources
    {
      logicalName: cfLogicalNames.openNextHostHeaderRewriteFunction,
      resourceType: 'AWS::CloudFront::Function'
    },
    {
      logicalName: cfLogicalNames.openNextAssetReplacerCustomResource,
      resourceType: 'AWS::CloudFormation::CustomResource'
    },
    {
      logicalName: cfLogicalNames.openNextDynamoInsertCustomResource,
      resourceType: 'AWS::CloudFormation::CustomResource'
    },
    // From bucket
    { logicalName: cfLogicalNames.bucket, resourceType: 'AWS::S3::Bucket' },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: 'AWS::S3::BucketPolicy', conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: 'AWS::CloudFront::Distribution',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: 'AWS::Route53::RecordSet', conditional: true },
    // From functions (imageFunction, revalidationFunction, serverFunction, warmerFunction, revalidationInsertFunction)
    { logicalName: cfLogicalNames.lambdaRole, resourceType: 'AWS::IAM::Role' },
    { logicalName: cfLogicalNames.lambda, resourceType: 'AWS::Lambda::Function' },
    { logicalName: cfLogicalNames.lambdaLogGroup, resourceType: 'AWS::Logs::LogGroup', conditional: true },
    { logicalName: cfLogicalNames.lambdaUrl, resourceType: 'AWS::Lambda::Url', conditional: true },
    // From edge function (serverEdgeFunction)
    {
      logicalName: cfLogicalNames.customResourceEdgeLambda,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    // From revalidationQueue
    { logicalName: cfLogicalNames.sqsQueue, resourceType: 'AWS::SQS::Queue' },
    { logicalName: cfLogicalNames.sqsQueuePolicy, resourceType: 'AWS::SQS::QueuePolicy', conditional: true },
    // From revalidationTable
    { logicalName: cfLogicalNames.dynamoGlobalTable, resourceType: 'AWS::DynamoDB::GlobalTable' }
  ],

  // ===== MULTI-CONTAINER WORKLOAD =====
  'multi-container-workload': [
    // Shared global resources (conditional - created only once if not exists)
    { logicalName: cfLogicalNames.ecsExecutionRole, resourceType: 'AWS::IAM::Role', conditional: true },
    { logicalName: cfLogicalNames.ecsAutoScalingRole, resourceType: 'AWS::IAM::Role', conditional: true },
    // Scaling resources (conditional - only if scaling is configured)
    {
      logicalName: cfLogicalNames.autoScalingTarget,
      resourceType: 'AWS::ApplicationAutoScaling::ScalableTarget',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.autoScalingPolicy,
      resourceType: 'AWS::ApplicationAutoScaling::ScalingPolicy',
      conditional: true,
      unresolvable: true
    },
    // EC2-based resources (conditional - only if instanceTypes are configured)
    { logicalName: cfLogicalNames.ecsEc2InstanceRole, resourceType: 'AWS::IAM::Role', conditional: true },
    {
      logicalName: cfLogicalNames.eventBusRoleForScheduledInstanceRefresh,
      resourceType: 'AWS::IAM::Role',
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceProfile, resourceType: 'AWS::IAM::InstanceProfile', conditional: true },
    {
      logicalName: cfLogicalNames.ecsEc2InstanceLaunchTemplate,
      resourceType: 'AWS::EC2::LaunchTemplate',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroup,
      resourceType: 'AWS::AutoScaling::AutoScalingGroup',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProvider,
      resourceType: 'AWS::ECS::CapacityProvider',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProviderAssociation,
      resourceType: 'AWS::ECS::ClusterCapacityProviderAssociations',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.schedulerRuleForScheduledInstanceRefresh,
      resourceType: 'AWS::Scheduler::Schedule',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroupWarmPool,
      resourceType: 'AWS::AutoScaling::WarmPool',
      conditional: true
    },
    // Deployment resources (conditional - only if deployment is configured)
    { logicalName: cfLogicalNames.ecsCodeDeployApp, resourceType: 'AWS::CodeDeploy::Application', conditional: true },
    {
      logicalName: cfLogicalNames.codeDeployDeploymentGroup,
      resourceType: 'AWS::CodeDeploy::DeploymentGroup',
      conditional: true
    },
    // Core resources (always present)
    { logicalName: cfLogicalNames.ecsCluster, resourceType: 'AWS::ECS::Cluster' },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup' },
    {
      logicalName: cfLogicalNames.ecsService,
      resourceType: 'AWS::ECS::Service',
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsTaskRole, resourceType: 'AWS::IAM::Role' },
    { logicalName: cfLogicalNames.ecsTaskDefinition, resourceType: 'AWS::ECS::TaskDefinition' },
    // Conditional resources
    {
      logicalName: cfLogicalNames.ecsLogGroup,
      resourceType: 'AWS::Logs::LogGroup',
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.efsAccessPoint, resourceType: 'AWS::EFS::AccessPoint', conditional: true },
    {
      logicalName: cfLogicalNames.atlasMongoUserAssociatedWithRole,
      resourceType: 'MongoDB::StpAtlasV1::DatabaseUser',
      conditional: true
    }
  ],

  // ===== SQS QUEUE =====
  'sqs-queue': [
    { logicalName: cfLogicalNames.sqsQueue, resourceType: 'AWS::SQS::Queue' },
    { logicalName: cfLogicalNames.sqsQueuePolicy, resourceType: 'AWS::SQS::QueuePolicy', conditional: true }
  ],

  // ===== SNS TOPIC =====
  'sns-topic': [{ logicalName: cfLogicalNames.snsTopic, resourceType: 'AWS::SNS::Topic' }],

  // ===== KINESIS STREAM =====
  'kinesis-stream': [{ logicalName: cfLogicalNames.kinesisStream, resourceType: 'AWS::Kinesis::Stream' }],

  // ===== BASTION =====
  bastion: [
    {
      logicalName: cfLogicalNames.bastionCloudwatchSsmDocument,
      resourceType: 'AWS::SSM::Document',
      conditional: true
    },
    { logicalName: cfLogicalNames.bastionEc2AutoscalingGroup, resourceType: 'AWS::AutoScaling::AutoScalingGroup' },
    { logicalName: cfLogicalNames.bastionSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup' },
    { logicalName: cfLogicalNames.bastionEc2LaunchTemplate, resourceType: 'AWS::EC2::LaunchTemplate' },
    { logicalName: cfLogicalNames.bastionRole, resourceType: 'AWS::IAM::Role' },
    { logicalName: cfLogicalNames.bastionEc2InstanceProfile, resourceType: 'AWS::IAM::InstanceProfile' },
    { logicalName: cfLogicalNames.bastionCwAgentSsmAssociation, resourceType: 'AWS::SSM::Association' },
    { logicalName: cfLogicalNames.bastionSsmAgentSsmAssociation, resourceType: 'AWS::SSM::Association' },
    {
      logicalName: cfLogicalNames.bastionLogGroup,
      resourceType: 'AWS::Logs::LogGroup',
      conditional: true,
      unresolvable: true
    }
  ],

  // ===== EDGE LAMBDA FUNCTION =====
  'edge-lambda-function': [
    { logicalName: cfLogicalNames.customResourceEdgeLambda, resourceType: 'AWS::CloudFormation::CustomResource' }
  ],

  // ===== WEB SERVICE =====
  // Web service delegates to: containerWorkload + optionally (httpApiGateway OR loadBalancer OR networkLoadBalancer)
  'web-service': [
    // From multi-container-workload - core resources (always present)
    { logicalName: cfLogicalNames.ecsCluster, resourceType: 'AWS::ECS::Cluster' },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup' },
    {
      logicalName: cfLogicalNames.ecsService,
      resourceType: 'AWS::ECS::Service',
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsTaskRole, resourceType: 'AWS::IAM::Role' },
    { logicalName: cfLogicalNames.ecsTaskDefinition, resourceType: 'AWS::ECS::TaskDefinition' },
    // From multi-container-workload - conditional resources
    { logicalName: cfLogicalNames.ecsExecutionRole, resourceType: 'AWS::IAM::Role', conditional: true },
    { logicalName: cfLogicalNames.ecsAutoScalingRole, resourceType: 'AWS::IAM::Role', conditional: true },
    {
      logicalName: cfLogicalNames.autoScalingTarget,
      resourceType: 'AWS::ApplicationAutoScaling::ScalableTarget',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.autoScalingPolicy,
      resourceType: 'AWS::ApplicationAutoScaling::ScalingPolicy',
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceRole, resourceType: 'AWS::IAM::Role', conditional: true },
    {
      logicalName: cfLogicalNames.eventBusRoleForScheduledInstanceRefresh,
      resourceType: 'AWS::IAM::Role',
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceProfile, resourceType: 'AWS::IAM::InstanceProfile', conditional: true },
    {
      logicalName: cfLogicalNames.ecsEc2InstanceLaunchTemplate,
      resourceType: 'AWS::EC2::LaunchTemplate',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroup,
      resourceType: 'AWS::AutoScaling::AutoScalingGroup',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProvider,
      resourceType: 'AWS::ECS::CapacityProvider',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProviderAssociation,
      resourceType: 'AWS::ECS::ClusterCapacityProviderAssociations',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.schedulerRuleForScheduledInstanceRefresh,
      resourceType: 'AWS::Scheduler::Schedule',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroupWarmPool,
      resourceType: 'AWS::AutoScaling::WarmPool',
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsCodeDeployApp, resourceType: 'AWS::CodeDeploy::Application', conditional: true },
    {
      logicalName: cfLogicalNames.codeDeployDeploymentGroup,
      resourceType: 'AWS::CodeDeploy::DeploymentGroup',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsLogGroup,
      resourceType: 'AWS::Logs::LogGroup',
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.efsAccessPoint, resourceType: 'AWS::EFS::AccessPoint', conditional: true },
    // From application-load-balancer (conditional - only if ALB is used)
    {
      logicalName: cfLogicalNames.loadBalancer,
      resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.loadBalancerSecurityGroup,
      resourceType: 'AWS::EC2::SecurityGroup',
      conditional: true
    },
    { logicalName: cfLogicalNames.listener, resourceType: 'AWS::ElasticLoadBalancingV2::Listener', conditional: true },
    {
      logicalName: cfLogicalNames.webAppFirewallAssociation,
      resourceType: 'AWS::WAFv2::WebACLAssociation',
      conditional: true
    },
    // From http-api-gateway (conditional - only if HTTP API Gateway is used, alternative to ALB/NLB)
    { logicalName: cfLogicalNames.httpApi, resourceType: 'AWS::ApiGatewayV2::Api', conditional: true },
    { logicalName: cfLogicalNames.httpApiStage, resourceType: 'AWS::ApiGatewayV2::Stage', conditional: true },
    { logicalName: cfLogicalNames.httpApiLogGroup, resourceType: 'AWS::Logs::LogGroup', conditional: true },
    {
      logicalName: cfLogicalNames.httpApiVpcLinkSecurityGroup,
      resourceType: 'AWS::EC2::SecurityGroup',
      conditional: true
    },
    { logicalName: cfLogicalNames.httpApiVpcLink, resourceType: 'AWS::ApiGatewayV2::VpcLink', conditional: true },
    { logicalName: cfLogicalNames.httpApiDomain, resourceType: 'AWS::ApiGatewayV2::DomainName', conditional: true },
    {
      logicalName: cfLogicalNames.httpApiDomainMapping,
      resourceType: 'AWS::ApiGatewayV2::ApiMapping',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.httpApiDefaultDomain,
      resourceType: 'AWS::ApiGatewayV2::DomainName',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.httpApiDefaultDomainMapping,
      resourceType: 'AWS::ApiGatewayV2::ApiMapping',
      conditional: true
    },
    // Common resources (domains, CDN - all conditional)
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: 'AWS::Route53::RecordSet', conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: 'AWS::CloudFront::CachePolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: 'AWS::CloudFront::OriginRequestPolicy',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: 'AWS::CloudFront::Distribution',
      conditional: true
    }
  ],

  // ===== PRIVATE SERVICE =====
  // Private service delegates to: containerWorkload + optionally loadBalancer
  'private-service': [
    // From multi-container-workload - core resources (always present)
    { logicalName: cfLogicalNames.ecsCluster, resourceType: 'AWS::ECS::Cluster' },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup' },
    {
      logicalName: cfLogicalNames.ecsService,
      resourceType: 'AWS::ECS::Service',
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsTaskRole, resourceType: 'AWS::IAM::Role' },
    { logicalName: cfLogicalNames.ecsTaskDefinition, resourceType: 'AWS::ECS::TaskDefinition' },
    // From multi-container-workload - conditional resources
    { logicalName: cfLogicalNames.ecsExecutionRole, resourceType: 'AWS::IAM::Role', conditional: true },
    { logicalName: cfLogicalNames.ecsAutoScalingRole, resourceType: 'AWS::IAM::Role', conditional: true },
    {
      logicalName: cfLogicalNames.autoScalingTarget,
      resourceType: 'AWS::ApplicationAutoScaling::ScalableTarget',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.autoScalingPolicy,
      resourceType: 'AWS::ApplicationAutoScaling::ScalingPolicy',
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceRole, resourceType: 'AWS::IAM::Role', conditional: true },
    {
      logicalName: cfLogicalNames.eventBusRoleForScheduledInstanceRefresh,
      resourceType: 'AWS::IAM::Role',
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceProfile, resourceType: 'AWS::IAM::InstanceProfile', conditional: true },
    {
      logicalName: cfLogicalNames.ecsEc2InstanceLaunchTemplate,
      resourceType: 'AWS::EC2::LaunchTemplate',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroup,
      resourceType: 'AWS::AutoScaling::AutoScalingGroup',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProvider,
      resourceType: 'AWS::ECS::CapacityProvider',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProviderAssociation,
      resourceType: 'AWS::ECS::ClusterCapacityProviderAssociations',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.schedulerRuleForScheduledInstanceRefresh,
      resourceType: 'AWS::Scheduler::Schedule',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroupWarmPool,
      resourceType: 'AWS::AutoScaling::WarmPool',
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsCodeDeployApp, resourceType: 'AWS::CodeDeploy::Application', conditional: true },
    {
      logicalName: cfLogicalNames.codeDeployDeploymentGroup,
      resourceType: 'AWS::CodeDeploy::DeploymentGroup',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsLogGroup,
      resourceType: 'AWS::Logs::LogGroup',
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.efsAccessPoint, resourceType: 'AWS::EFS::AccessPoint', conditional: true },
    // From application-load-balancer (conditional - only if ALB is configured)
    {
      logicalName: cfLogicalNames.loadBalancer,
      resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.loadBalancerSecurityGroup,
      resourceType: 'AWS::EC2::SecurityGroup',
      conditional: true
    },
    { logicalName: cfLogicalNames.listener, resourceType: 'AWS::ElasticLoadBalancingV2::Listener', conditional: true },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: 'AWS::Route53::RecordSet', conditional: true }
  ],

  // ===== WORKER SERVICE =====
  // Worker service delegates to: containerWorkload only
  'worker-service': [
    // From multi-container-workload - core resources (always present)
    { logicalName: cfLogicalNames.ecsCluster, resourceType: 'AWS::ECS::Cluster' },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: 'AWS::EC2::SecurityGroup' },
    {
      logicalName: cfLogicalNames.ecsService,
      resourceType: 'AWS::ECS::Service',
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsTaskRole, resourceType: 'AWS::IAM::Role' },
    { logicalName: cfLogicalNames.ecsTaskDefinition, resourceType: 'AWS::ECS::TaskDefinition' },
    // From multi-container-workload - conditional resources
    { logicalName: cfLogicalNames.ecsExecutionRole, resourceType: 'AWS::IAM::Role', conditional: true },
    { logicalName: cfLogicalNames.ecsAutoScalingRole, resourceType: 'AWS::IAM::Role', conditional: true },
    {
      logicalName: cfLogicalNames.autoScalingTarget,
      resourceType: 'AWS::ApplicationAutoScaling::ScalableTarget',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.autoScalingPolicy,
      resourceType: 'AWS::ApplicationAutoScaling::ScalingPolicy',
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceRole, resourceType: 'AWS::IAM::Role', conditional: true },
    {
      logicalName: cfLogicalNames.eventBusRoleForScheduledInstanceRefresh,
      resourceType: 'AWS::IAM::Role',
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceProfile, resourceType: 'AWS::IAM::InstanceProfile', conditional: true },
    {
      logicalName: cfLogicalNames.ecsEc2InstanceLaunchTemplate,
      resourceType: 'AWS::EC2::LaunchTemplate',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroup,
      resourceType: 'AWS::AutoScaling::AutoScalingGroup',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource,
      resourceType: 'AWS::CloudFormation::CustomResource',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProvider,
      resourceType: 'AWS::ECS::CapacityProvider',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProviderAssociation,
      resourceType: 'AWS::ECS::ClusterCapacityProviderAssociations',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.schedulerRuleForScheduledInstanceRefresh,
      resourceType: 'AWS::Scheduler::Schedule',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroupWarmPool,
      resourceType: 'AWS::AutoScaling::WarmPool',
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsCodeDeployApp, resourceType: 'AWS::CodeDeploy::Application', conditional: true },
    {
      logicalName: cfLogicalNames.codeDeployDeploymentGroup,
      resourceType: 'AWS::CodeDeploy::DeploymentGroup',
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsLogGroup,
      resourceType: 'AWS::Logs::LogGroup',
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.efsAccessPoint, resourceType: 'AWS::EFS::AccessPoint', conditional: true },
    {
      logicalName: cfLogicalNames.atlasMongoUserAssociatedWithRole,
      resourceType: 'MongoDB::StpAtlasV1::DatabaseUser',
      conditional: true
    }
  ],

  // ===== OTHER RESOURCES =====
  'custom-resource-instance': [],
  'custom-resource-definition': [],
  'deployment-script': [],
  'aws-cdk-construct': []
};
