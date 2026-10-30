import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { runsUserCodeOnDelete } from './early-deletes';

/**
 * The last minutes of a stack delete are mostly AWS releasing things that no longer cost anything: a disabled CloudFront
 * distribution propagating its removal, an ECS service whose tasks have stopped waiting to become inactive, network
 * interfaces of VPC functions, and the empty network around them. `delete` returns once only such resources remain;
 * CloudFormation finishes them in the background. A deploy of the same stage waits until the delete has finished, and
 * a delete that later fails leaves the stack in DELETE_FAILED, which the next deploy reports and the next delete
 * retries.
 *
 * A remaining resource counts only when it neither costs money nor runs user code while CloudFormation deletes it:
 * - its type is in `COST_NOTHING_WHILE_DELETED`, or
 * - it is a Stacktape custom resource from `STACKTAPE_CUSTOM_RESOURCES_WITHOUT_COST`, or
 * - a live check proves it idle: every task of an ECS service has stopped, a distribution is disabled, a load balancer
 *   is gone (the CLI deletes load balancers early, see `early-deletes.ts`), a bucket is empty (`delete` empties the
 *   stack's buckets before CloudFormation starts), a function URL is gone (it runs the function for any caller;
 *   `delete` deletes URLs early), a database instance, DynamoDB table or cache is gone (they bill until then and hold
 *   data; `delete` deletes them early, see `early-deletes.ts`).
 * An ECS service counts once its tasks have stopped, and so does everything CloudFormation deletes only after it: its
 * task definition, cluster, target groups and service discovery are in the list above, and its load balancer, and the
 * databases and tables its task definition references, are deleted early.
 * Everything else (Aurora clusters, NAT gateways, topics, rules, user custom resources...) is waited for.
 */
export type PendingDelete = { logicalId: string; resourceType: string; physicalId?: string };

export type IdleCheck =
  | { kind: 'ecs-service-stopped'; serviceArn: string }
  | { kind: 'distribution-disabled'; distributionId: string }
  | { kind: 'load-balancer-gone'; loadBalancerArn: string }
  | { kind: 'bucket-empty'; bucketName: string }
  | { kind: 'function-url-gone'; functionArn: string }
  /** Billed until gone. CloudFormation notices that up to ~20 s late. */
  | { kind: 'db-instance-gone'; instanceId: string }
  | { kind: 'dynamodb-table-gone'; tableName: string }
  | { kind: 'replication-group-gone'; replicationGroupId: string }
  | { kind: 'serverless-cache-gone'; serverlessCacheName: string };

const COST_NOTHING_WHILE_DELETED = new Set([
  'AWS::EC2::VPC',
  'AWS::EC2::Subnet',
  'AWS::EC2::SecurityGroup',
  'AWS::EC2::SecurityGroupIngress',
  'AWS::EC2::SecurityGroupEgress',
  'AWS::EC2::RouteTable',
  'AWS::EC2::Route',
  'AWS::EC2::SubnetRouteTableAssociation',
  'AWS::EC2::InternetGateway',
  'AWS::EC2::VPCGatewayAttachment',
  'AWS::EC2::EgressOnlyInternetGateway',
  'AWS::EC2::VPCCidrBlock',
  'AWS::EC2::NetworkAcl',
  'AWS::EC2::NetworkAclEntry',
  'AWS::EC2::SubnetNetworkAclAssociation',
  'AWS::EC2::LaunchTemplate',
  'AWS::IAM::Role',
  'AWS::IAM::Policy',
  'AWS::IAM::ManagedPolicy',
  'AWS::IAM::InstanceProfile',
  // A function bills only when invoked. A VPC function waits here for its network interfaces. Whatever invokes it is
  // waited for: event source mappings, rules, topics, and its URL until it is gone (`delete` deletes URLs early).
  'AWS::Lambda::Function',
  'AWS::Lambda::Permission',
  'AWS::Lambda::Version',
  'AWS::Lambda::Alias',
  'AWS::Lambda::LayerVersion',
  'AWS::Lambda::LayerVersionPermission',
  'AWS::Lambda::EventInvokeConfig',
  'AWS::Logs::LogGroup',
  'AWS::Logs::SubscriptionFilter',
  'AWS::Logs::MetricFilter',
  'AWS::ECS::Cluster',
  'AWS::ECS::TaskDefinition',
  'AWS::ServiceDiscovery::Service',
  'AWS::ServiceDiscovery::PrivateDnsNamespace',
  'AWS::ServiceDiscovery::HttpNamespace',
  'AWS::ApiGatewayV2::VpcLink',
  'AWS::ElasticLoadBalancingV2::TargetGroup',
  'AWS::ElasticLoadBalancingV2::Listener',
  'AWS::ElasticLoadBalancingV2::ListenerRule',
  'AWS::ApplicationAutoScaling::ScalableTarget',
  'AWS::ApplicationAutoScaling::ScalingPolicy',
  'AWS::CertificateManager::Certificate',
  'AWS::CloudFront::OriginAccessControl',
  'AWS::CloudFront::CloudFrontOriginAccessIdentity',
  'AWS::CloudFront::CachePolicy',
  'AWS::CloudFront::OriginRequestPolicy',
  'AWS::CloudFront::ResponseHeadersPolicy',
  'AWS::CloudFront::Function',
  'AWS::RDS::DBSubnetGroup',
  'AWS::RDS::DBParameterGroup',
  'AWS::RDS::DBClusterParameterGroup',
  'AWS::ElastiCache::SubnetGroup',
  'AWS::ElastiCache::ParameterGroup',
  // Access control of a cache; CloudFormation deletes them, about a minute each, only once the cache is gone.
  'AWS::ElastiCache::User',
  'AWS::ElastiCache::UserGroup',
  'AWS::SSM::Parameter',
  'AWS::S3::BucketPolicy',
  // A queue bills per request and runs nothing; the event source mappings that poll it are waited for.
  'AWS::SQS::Queue',
  'AWS::SQS::QueuePolicy'
]);

/**
 * Stacktape custom resources whose delete only removes records, certificates, parameters or edge function copies, and
 * the queues and queue policies the service Lambda creates (`sqsQueue`, `sqsQueuePolicy`), which cost nothing like
 * `AWS::SQS::Queue`. CloudFormation deletes them before the service Lambda and its permission, which they depend on.
 * The rules it creates (`eventsRule`) are not listed: a rule can still invoke its targets.
 */
const STACKTAPE_CUSTOM_RESOURCES_WITHOUT_COST = new Set([
  'defaultDomain',
  'defaultDomainCert',
  'edgeLambda',
  'edgeFunctions',
  'edgeLambdaBucket',
  'sensitiveData',
  'deregisterTargets',
  'publishLambdaVersion',
  'sqsQueue',
  'sqsQueuePolicy'
]);

type TemplateResource = { Type?: string; Properties?: Record<string, unknown> };

const isCustomResource = (type: string) =>
  type === 'AWS::CloudFormation::CustomResource' || type.startsWith('Custom::');

/**
 * The live checks that must pass before `delete` can leave the pending resources to CloudFormation, or undefined when
 * one of them must be waited for regardless.
 */
export const planBackgroundDeleteChecks = ({
  pending,
  template
}: {
  pending: PendingDelete[];
  template: Pick<CloudFormationTemplate, 'Resources'> | undefined;
}): IdleCheck[] | undefined => {
  const templateResources = (template?.Resources || {}) as Record<string, TemplateResource>;
  const checks: IdleCheck[] = [];
  for (const { logicalId, resourceType, physicalId } of pending) {
    if (COST_NOTHING_WHILE_DELETED.has(resourceType)) continue;
    if (resourceType === 'AWS::EC2::VPCEndpoint') {
      // Gateway endpoints (S3, DynamoDB) are free; interface endpoints are billed per hour.
      const endpointType = templateResources[logicalId]?.Properties?.VpcEndpointType;
      if (endpointType === undefined || endpointType === 'Gateway') continue;
      return undefined;
    }
    if (isCustomResource(resourceType)) {
      const deployed = templateResources[logicalId];
      if (!deployed || runsUserCodeOnDelete(deployed)) return undefined;
      const resolvers = Object.keys(deployed.Properties || {}).filter((key) => key !== 'ServiceToken');
      if (!resolvers.length || !resolvers.every((key) => STACKTAPE_CUSTOM_RESOURCES_WITHOUT_COST.has(key))) {
        return undefined;
      }
      continue;
    }
    if (!physicalId) return undefined;
    if (resourceType === 'AWS::ECS::Service') checks.push({ kind: 'ecs-service-stopped', serviceArn: physicalId });
    else if (resourceType === 'AWS::CloudFront::Distribution') {
      checks.push({ kind: 'distribution-disabled', distributionId: physicalId });
    } else if (resourceType === 'AWS::ElasticLoadBalancingV2::LoadBalancer') {
      checks.push({ kind: 'load-balancer-gone', loadBalancerArn: physicalId });
    } else if (resourceType === 'AWS::S3::Bucket') checks.push({ kind: 'bucket-empty', bucketName: physicalId });
    else if (resourceType === 'AWS::Lambda::Url') checks.push({ kind: 'function-url-gone', functionArn: physicalId });
    else if (resourceType === 'AWS::RDS::DBInstance') checks.push({ kind: 'db-instance-gone', instanceId: physicalId });
    else if (resourceType === 'AWS::DynamoDB::Table' || resourceType === 'AWS::DynamoDB::GlobalTable') {
      // Replicas in other regions bill until CloudFormation has removed them; only this region's table is checked.
      const replicas = templateResources[logicalId]?.Properties?.Replicas;
      if (resourceType === 'AWS::DynamoDB::GlobalTable' && !(Array.isArray(replicas) && replicas.length === 1)) {
        return undefined;
      }
      checks.push({ kind: 'dynamodb-table-gone', tableName: physicalId });
    } else if (resourceType === 'AWS::ElastiCache::ReplicationGroup') {
      checks.push({ kind: 'replication-group-gone', replicationGroupId: physicalId });
    } else if (resourceType === 'AWS::ElastiCache::ServerlessCache') {
      checks.push({ kind: 'serverless-cache-gone', serverlessCacheName: physicalId });
    } else return undefined;
  }
  return checks;
};
