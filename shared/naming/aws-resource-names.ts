import { pascalCase } from 'change-case';
import { shortHash } from '../utils/short-hash';
import { buildResourceName, getLogGroupBaseName } from './utils';

const codebuildDeploymentBucketResourceName = (region: string, accountId: string) => {
  return `stp-codebuild-deployment-${region}-${shortHash(accountId)}`;
};

export const awsResourceNames = {
  // maximum 63 characters
  // https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
  bucket(stpBucketName: string, stackName: string, globallyUniqueStackHash: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpBucketName.toLowerCase()}-${globallyUniqueStackHash}`,
      lengthLimit: 63
    });
  },
  // max 64 chars
  // https://docs.atlas.mongodb.com/reference/atlas-limits/#label-limits
  atlasMongoProject(stackName: string, globallyUniqueStackHash: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${globallyUniqueStackHash}`,
      lengthLimit: 64
    });
  },
  // max 64 chars
  // https://docs.atlas.mongodb.com/reference/atlas-limits/#label-limits
  atlasMongoCluster(stpMongoAtlasClusterName: string) {
    return buildResourceName({
      proposedResourceName: `${stpMongoAtlasClusterName.toLowerCase()}`,
      lengthLimit: 64
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
  dynamoGlobalTable(stpResourceName: string, globallyUniqueStackHash: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}-${globallyUniqueStackHash}`,
      lengthLimit: 255
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
  dynamoRegionalTable(stpResourceName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}`,
      lengthLimit: 255
    });
  },
  // max 40 chars
  // https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
  redisReplicationGroupId(stpResourceName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName.toLowerCase()}`,
      lengthLimit: 40
    });
  },
  redisReplicationGroupDescription(stpResourceName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}`
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/ec2/create-security-group.html#:~:text=The%20name%20of%20the%20security,Cannot%20start%20with%20sg%2D%20.&text=%5BEC2%2DVPC%5D%20The%20ID%20of%20the%20VPC.
  redisClusterSecurityGroup(stpResourceName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}-sg`,
      lengthLimit: 255
    });
  },
  // max 512 chars
  // https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateLogGroup.html
  redisLogGroup(stpResourceName: string, stackName: string) {
    // we have to use /aws/vendedlogs prefix (read up here https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AWS-logs-and-resource-policy.html#AWS-logs-infrastructure-CWL)
    return buildResourceName({
      proposedResourceName: `/aws/vendedlogs/${stackName}/redis/${stpResourceName}/slow-log`,
      lengthLimit: 512
    });
  },
  // limits not found anywhere
  cloudfrontCachePolicy(stpResourceName: string, stackName: string, policyHash: string) {
    return pascalCase(`${stackName}-${stpResourceName}CachePolicy${policyHash}`);
  },
  // limits not found anywhere
  cloudfrontDefaultCachePolicy(type: 'DefDynamic' | 'DefStatic', stackName: string) {
    return pascalCase(`${stackName}-${type}-CachePolicy`);
  },
  // limits not found anywhere
  cloudfrontDefaultOriginRequestPolicy(type: 'DefDynamic' | 'DefStatic', stackName: string) {
    return pascalCase(`${stackName}-${type}-OriginRequestPolicy`);
  },
  // limits not found anywhere
  cloudfrontOriginRequestPolicy(stpResourceName: string, stackName: string, policyHash: string) {
    return pascalCase(`${stackName}-${stpResourceName}OriginRequestPolicy${policyHash}`);
  },
  // as originIdentifier ATM we are using stpResourceName(or domain name if it is custom-origin) of origin
  cloudfrontOriginId(originIdentifier: string, cacheBehaviourIndex: number) {
    return `${originIdentifier}${cacheBehaviourIndex}`;
  },
  openNextHostHeaderRewriteFunction(stpResourceName: string, stackName: string, region: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}-${region}`
    });
  },
  // max 64 chars
  // OK as it stands
  lambdaRole(
    stackName: string,
    region: string,
    functionName: string,
    configParentResourceType: StpLambdaFunction['configParentResourceType']
  ) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${functionName}${
        configParentResourceType === 'batch-job' ? '-TRIGGER' : ''
      }-${region}`,
      lengthLimit: 64
    });
  },
  // max 64 chars
  // OK as it stands
  lambdaDefaultRole(stackName: string, region: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-stpDefLambda-${region}`,
      lengthLimit: 64
    });
  },
  // max 128 chars
  lambdaStpAlias() {
    return buildResourceName({
      proposedResourceName: 'stp-live',
      lengthLimit: 128
    });
  },
  // max 64 chars
  // OK as it stands
  batchJobRole(stackName: string, region: string, batchJobName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${batchJobName}-${region}`,
      lengthLimit: 64
    });
  },
  // max 64 chars
  // OK as it stands
  containerWorkloadRole(stackName: string, region: string, workloadName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}-${region}`,
      lengthLimit: 64
    });
  },
  // max 256 chars
  // https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_CreateEventBus.html
  eventBus(stackName: string, stpResourceName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}`,
      lengthLimit: 256
    });
  },
  // max 63 chars
  // !!! should not be changed - breaking change
  deploymentBucket(globallyUniqueStackHash: string) {
    return buildResourceName({
      proposedResourceName: `stp-deployment-bucket-${globallyUniqueStackHash}`,
      lengthLimit: 63
    });
  },
  // max 256 chars
  // https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_Repository.html
  // !!! should not be changed - breaking change
  deploymentEcrRepo(globallyUniqueStackHash: string) {
    return buildResourceName({
      proposedResourceName: `${globallyUniqueStackHash}-stp-multi-container-workload-repo`,
      lengthLimit: 256
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
  // !!! should not be changed - breaking change
  stpServiceDynamoTable(region: string) {
    return buildResourceName({
      proposedResourceName: `stp-service-${region}`,
      lengthLimit: 255
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/ec2/create-security-group.html#:~:text=The%20name%20of%20the%20security,Cannot%20start%20with%20sg%2D%20.&text=%5BEC2%2DVPC%5D%20The%20ID%20of%20the%20VPC.
  batchInstanceDefaultSecurityGroup(stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-batch-instance-sg`,
      lengthLimit: 255
    });
  },
  // max 128 chars
  // https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateLaunchTemplate.html
  batchInstanceLaunchTemplate(stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-batch-instance-launch-template`,
      lengthLimit: 128
    });
  },
  // max 128 chars
  // https://docs.aws.amazon.com/cli/latest/reference/batch/create-compute-environment.html
  batchComputeEnvironment(stackName: string, spot: boolean, gpu: boolean) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${`batch-${spot ? 'spot' : 'onDemand'}-${
        gpu ? 'gpu' : ''
      }-compute-environment`}`,
      lengthLimit: 128
    });
  },
  // max 128 chars
  // https://docs.aws.amazon.com/cli/latest/reference/batch/create-job-queue.html
  batchJobQueue(stackName: string, spot: boolean, gpu: boolean) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${`batch-${spot ? 'spot' : 'onDemand'}-${gpu ? 'gpu' : ''}-job-queue`}`,
      lengthLimit: 128
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-subnet-group.html
  dbSubnetGroup(stackName: string, resourceName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${resourceName.toLowerCase()}-subnet-group`,
      lengthLimit: 255
    });
  },
  // max 63 chars
  // https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
  dbCluster(stackName: string, resourceName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${resourceName.toLowerCase()}`,
      lengthLimit: 63
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/ec2/create-security-group.html#:~:text=The%20name%20of%20the%20security,Cannot%20start%20with%20sg%2D%20.&text=%5BEC2%2DVPC%5D%20The%20ID%20of%20the%20VPC.
  dbSecurityGroup(workloadName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}-sg`,
      lengthLimit: 255
    });
  },
  // max 63 chars
  // https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
  dbInstance(resourceName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${resourceName.toLowerCase()}`,
      lengthLimit: 63
    });
  },
  // max 63 chars
  // https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
  dbReplicaInstance(workloadName: string, stackName: string, replicaNum: number) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName.toLowerCase()}-rep${replicaNum}`,
      lengthLimit: 63
    });
  },
  // max 512 chars
  // https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateLogGroup.html
  dbLogGroup(awsDatabaseIdentifier: string, isAuroraCluster: boolean, logGroupType: string) {
    // we do not use "buildResourceName" function here. This name is not determined by us but rather by AWS, therefore truncating makes no sense
    return `/aws/rds/${isAuroraCluster ? 'cluster' : 'instance'}/${awsDatabaseIdentifier}/${logGroupType}`;
  },
  // max 63 chars
  // https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
  auroraDbInstance(workloadName: string, stackName: string, instanceNum: number) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName.toLowerCase()}-${instanceNum}`,
      lengthLimit: 63
    });
  },
  // max 64 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-events-rule-target.html#cfn-events-rule-target-id
  eventBusRuleTargetId(workloadName: string, index: number) {
    return buildResourceName({
      proposedResourceName: `${workloadName}-event-${index}-event-rule`,
      lengthLimit: 64
    });
  },
  sqsQueueEventBusRuleTargetId(queueName: string, eventIndex: number) {
    return buildResourceName({
      proposedResourceName: `${queueName}-event-bus-target-${eventIndex}`,
      lengthLimit: 64
    });
  },
  // max 128 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kinesis-streamconsumer.html#cfn-kinesis-streamconsumer-consumername
  kinesisEventConsumer(stackName: string, workloadName: string, index: number) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}-event${index}-kinesis-consumer`,
      lengthLimit: 128
    });
  },
  // max 80 chars
  // https://docs.aws.amazon.com/step-functions/latest/dg/limits-overview.html
  batchStateMachine(workloadName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}-batch-state-machine`,
      lengthLimit: 80
    });
  },
  // max 128 chars
  // https://docs.aws.amazon.com/cli/latest/reference/batch/register-job-definition.html
  batchJobDefinition(workloadName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}-job-definition`,
      lengthLimit: 128
    });
  },
  // max 80 chars
  // must be unique in account !
  // https://docs.aws.amazon.com/step-functions/latest/dg/limits-overview.html
  stateMachine(stateMachineName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stateMachineName}`,
      lengthLimit: 80
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/ecs/create-cluster.html
  ecsCluster(workloadName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}-cluster`,
      lengthLimit: 255
    });
  },
  // max 126 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-as-group.html#cfn-autoscaling-autoscalinggroup-autoscalinggroupname
  ecsEc2AutoscalingGroup(workloadName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}-asg`,
      lengthLimit: 126
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
  ecsService(workloadName: string, stackName: string, blueGreen: boolean) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}${blueGreen ? '-bg' : ''}-service`,
      lengthLimit: 255
    });
  },
  // max 127 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ecs-service-serviceconnectclientalias.html
  ecsServiceConnectDefaultDnsName(workloadName: string, containerName: string) {
    return buildResourceName({
      proposedResourceName: `${workloadName}-${containerName}`.toLowerCase(),
      lengthLimit: 127
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/ecs/register-task-definition.html
  ecsTaskDefinitionFamily(workloadName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}-task-definition`,
      lengthLimit: 255
    });
  },
  // max 126 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-as-group.html#cfn-autoscaling-autoscalinggroup-autoscalinggroupname
  bastionEc2AutoscalingGroup(stpResourceName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}-asg`,
      lengthLimit: 126
    });
  },
  // max 512 chars
  // https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateLogGroup.html
  bastionLogGroup({
    stackName,
    stpResourceName,
    logType
  }: {
    stackName: string;
    stpResourceName: string;
    logType: 'messages' | 'secure' | 'audit';
  }) {
    return buildResourceName({
      proposedResourceName: getLogGroupBaseName({
        resourceType: 'bastion',
        stackName,
        resourceNamespace: logType,
        stpResourceName
      }),
      lengthLimit: 512
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/ec2/create-security-group.html#:~:text=The%20name%20of%20the%20security,Cannot%20start%20with%20sg%2D%20.&text=%5BEC2%2DVPC%5D%20The%20ID%20of%20the%20VPC.
  bastionSecurityGroup(bastionStpName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${bastionStpName}-bastion-sg`,
      lengthLimit: 255
    });
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/ec2/create-security-group.html#:~:text=The%20name%20of%20the%20security,Cannot%20start%20with%20sg%2D%20.&text=%5BEC2%2DVPC%5D%20The%20ID%20of%20the%20VPC.
  workloadSecurityGroup(workloadName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}-sg`,
      lengthLimit: 255
    });
  },
  workloadSecurityGroupGroupDescription(workloadName: string, stackName: string) {
    return `Security group associated with ${workloadName} in stack ${stackName}`;
  },
  // length - no limits found
  httpApiAuthorizer({
    stackName,
    workloadName,
    method,
    path,
    stpResourceName
  }: {
    stackName: string;
    workloadName: string;
    method: HttpMethod;
    path: string;
    stpResourceName: string;
  }) {
    return pascalCase(`${stackName}-${workloadName}-${method}-${path}-${stpResourceName}-Authorizer`);
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/ec2/create-security-group.html#:~:text=The%20name%20of%20the%20security,Cannot%20start%20with%20sg%2D%20.&text=%5BEC2%2DVPC%5D%20The%20ID%20of%20the%20VPC.
  loadBalancerSecurityGroup(loadBalancerName: string, stackName: string, networkLoadBalancer?: boolean) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${loadBalancerName}-${networkLoadBalancer ? 'nlb' : 'lb'}-sg`,
      lengthLimit: 255
    });
  },
  // max 64 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html
  lambda(
    workloadName: string,
    stackName: string
    // configParentResourceType: StpLambdaFunction['configParentResourceType']
  ) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}`,
      // ${
      //   configParentResourceType === 'batch-job'
      //     ? '-TRIGGER'
      //     : configParentResourceType === 'custom-resource-definition'
      //     ? '-CR'
      //     : configParentResourceType === 'deployment-script'
      //     ? '-SCRIPT'
      //     : ''
      // }`,
      lengthLimit: 64
    });
  },
  stpServiceLambda(stackName: string) {
    return `${stackName}-stpService-CR`.length <= 64
      ? `${stackName}-stpService-CR`
      : buildResourceName({
          proposedResourceName: `${stackName}-stpService-CR`,
          lengthLimit: 64
        });
  },
  // max 64 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html
  // we are treating cdn lambda name separately as CDN lambda name must include region
  edgeLambda(workloadName: string, stackName: string, region: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${region}-${workloadName}`,
      lengthLimit: 64
    });
  },
  // max 32 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-targetgroup.html#cfn-elasticloadbalancingv2-targetgroup-name
  lambdaTargetGroup(stackName: string, workloadName: string, loadBalancerName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${loadBalancerName}-${workloadName}`,
      lengthLimit: 32
    });
  },
  // max 256 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-applicationautoscaling-scalingpolicy.html#cfn-applicationautoscaling-scalingpolicy-policyname
  autoScalingPolicy(workloadName: string, stackName: string, metric: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${workloadName}-${metric}`,
      lengthLimit: 256
    });
  },
  // length limits not found
  httpApi(stackName: string) {
    return `${stackName}-http-api`;
  },
  // length limits not found
  httpApiVpcLink({ stackName, stpResourceName }: { stackName: string; stpResourceName: string }) {
    return `${stackName}-${stpResourceName}-vpc-link`;
  },
  // max 255 chars
  // https://docs.aws.amazon.com/cli/latest/reference/ec2/create-security-group.html#:~:text=The%20name%20of%20the%20security,Cannot%20start%20with%20sg%2D%20.&text=%5BEC2%2DVPC%5D%20The%20ID%20of%20the%20VPC.
  httpApiVpcLinkSecurityGroup({ stackName, stpResourceName }: { stackName: string; stpResourceName: string }) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}-vpc-link-sg`,
      lengthLimit: 255
    });
  },
  // max 128 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpoolclient.html
  userPool(userPoolName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${userPoolName}-user-pool`,
      lengthLimit: 128
    });
  },
  // max 128 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpoolclient.html#cfn-cognito-userpoolclient-clientname
  userPoolClient(userPoolName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${userPoolName}-user-pool-client`,
      lengthLimit: 128
    });
  },
  // max 63 chars
  // limit is imposed from Route53 where on the background label limit is 63
  serviceDiscoveryPrivateNamespace(stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-private-namespace`,
      lengthLimit: 63
    });
  },
  // max 100 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-codedeploy-application.html
  lambdaCodeDeployApp(stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-lambda-code-deploy`,
      lengthLimit: 100
    });
  },
  // max 100 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-codedeploy-application.html
  ecsCodeDeployApp(stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-ecs-code-deploy`,
      lengthLimit: 100
    });
  },
  // max 100 chars
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-codedeploy-deploymentgroup.html#cfn-codedeploy-deploymentgroup-deploymentgroupname
  codeDeployDeploymentGroup({ stackName, stpResourceName }: { stackName: string; stpResourceName: string }) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}`,
      lengthLimit: 100
    });
  },
  // max 512 chars
  // https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateLogGroup.html
  httpApiLogGroup(props: { stackName: string; stpResourceName: string }) {
    // we have to use /aws/vendedlogs prefix (read up here https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AWS-logs-and-resource-policy.html#AWS-logs-infrastructure-CWL)
    return buildResourceName({
      proposedResourceName: `/aws/vendedlogs/${props.stackName}/api-gateway/${props.stpResourceName}/access-logs`,
      lengthLimit: 512
    });
  },
  // max 512 chars
  // https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateLogGroup.html
  containerLogGroup({
    stackName,
    stpResourceName,
    containerName = 'default'
  }: {
    stackName: string;
    stpResourceName: string;
    containerName?: string;
  }) {
    return buildResourceName({
      proposedResourceName: getLogGroupBaseName({
        resourceType: 'ecs',
        stackName,
        resourceNamespace: `${containerName}/process-logs`,
        stpResourceName
      }),
      lengthLimit: 512
    });
  },
  // max 512 chars
  // https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateLogGroup.html
  batchJobLogGroup({ stackName, stpResourceName }: { stackName: string; stpResourceName: string }) {
    return buildResourceName({
      proposedResourceName: getLogGroupBaseName({
        resourceType: 'batch',
        stackName,
        resourceNamespace: 'process-logs',
        stpResourceName
      }),
      lengthLimit: 512
    });
  },
  // max 512 chars
  // https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateLogGroup.html
  lambdaLogGroup({ lambdaAwsResourceName, edgeLambda }: { lambdaAwsResourceName: string; edgeLambda?: boolean }) {
    // This is determined by AWS, makes no sense to truncate
    return `/aws/lambda/${edgeLambda ? 'us-east-1.' : ''}${lambdaAwsResourceName}`;
  },
  // no limitations for budget name found
  // https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
  stackBudget(stackName: string, globallyUniqueStackHash: string) {
    return `${stackName}-${globallyUniqueStackHash}`;
  },
  // no limitations for upstash redis database name found
  upstashRedisDatabase({
    stackName,
    globallyUniqueStackHash,
    stpResourceName
  }: {
    stackName: string;
    globallyUniqueStackHash: string;
    stpResourceName: string;
  }) {
    return `${stackName}-${globallyUniqueStackHash}-${stpResourceName}`;
  },
  edgeLambdaRole(stackName: string, region: string, functionName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${functionName}-${region}`,
      lengthLimit: 64
    });
  },
  // limit 255 https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cw-alarm.html#cfn-cloudwatch-alarms-alarmname
  cloudwatchAlarm(stackName: string, alarmName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${alarmName}`,
      lengthLimit: 255
    });
  },
  codebuildProject(region: string) {
    return `stacktape-deployment-${region}`;
  },
  codebuildServiceRole() {
    return 'stacktape-codebuild-role';
  },
  stackOperationsLogGroup() {
    return '/stp/stack-operations';
  },
  codebuildDeploymentBucket: codebuildDeploymentBucketResourceName,
  // limit 80 https://docs.aws.amazon.com/cli/latest/reference/sqs/create-queue.html
  sqsQueue(stpResourceName: string, stackName: string, isFifo: boolean) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}${isFifo ? '.fifo' : ''}`,
      lengthLimit: 80
    });
  },
  // limit 256 https://docs.aws.amazon.com/cli/latest/reference/sns/create-topic.html
  snsTopic(stpResourceName: string, stackName: string, isFifo: boolean) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}${isFifo ? '.fifo' : ''}`,
      lengthLimit: 256
    });
  },
  wafWebACLName(stpResourceName: string, stackName: string, globallyUniqueStackHash: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${globallyUniqueStackHash}-${stpResourceName}-acl`,
      lengthLimit: 128
    });
  },
  openSearchDomainName(stpResourceName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName.toLowerCase()}`,
      lengthLimit: 28
    });
  },
  openSearchLogGroup(stpResourceName: string, logGroupType: string, region: string, stackName: string) {
    return getLogGroupBaseName({
      resourceType: 'open-search',
      stackName,
      resourceNamespace: logGroupType,
      stpResourceName
    });
  },
  logForwardingFailedEventsBucket(stpResourceName: string, stackName: string, globallyUniqueStackHash: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName.toLowerCase()}-logs-${globallyUniqueStackHash}`,
      lengthLimit: 63
    });
  },
  efsSecurityGroup(stpResourceName: string, stackName: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-${stpResourceName}-efs-sg`,
      lengthLimit: 255
    });
  }
};
