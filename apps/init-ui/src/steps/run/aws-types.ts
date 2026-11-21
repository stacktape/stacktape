/**
 * CloudFormation types as a row of the deploy shows them: the name AWS uses for the thing, short enough for a column
 * ("RDS DB instance", not `AWS::RDS::DBInstance`), and for the common ones what it is for, in a tooltip.
 */

const NAMES: Readonly<Record<string, string>> = {
  'AWS::RDS::DBInstance': 'RDS DB instance',
  'AWS::RDS::DBCluster': 'Aurora cluster',
  'AWS::RDS::DBSubnetGroup': 'DB subnet group',
  'AWS::RDS::DBParameterGroup': 'DB parameter group',
  'AWS::RDS::DBClusterParameterGroup': 'DB parameter group',
  'AWS::EC2::VPC': 'VPC',
  'AWS::EC2::Subnet': 'Subnet',
  'AWS::EC2::InternetGateway': 'Internet gateway',
  'AWS::EC2::VPCGatewayAttachment': 'Gateway attachment',
  'AWS::EC2::RouteTable': 'Route table',
  'AWS::EC2::Route': 'Route',
  'AWS::EC2::SubnetRouteTableAssociation': 'Route table association',
  'AWS::EC2::SecurityGroup': 'Security group',
  'AWS::EC2::LaunchTemplate': 'Launch template',
  'AWS::EC2::Instance': 'EC2 instance',
  'AWS::EC2::NatGateway': 'NAT gateway',
  'AWS::EC2::EIP': 'Elastic IP',
  'AWS::EC2::VPCEndpoint': 'VPC endpoint',
  'AWS::IAM::Role': 'IAM role',
  'AWS::IAM::Policy': 'IAM policy',
  'AWS::IAM::InstanceProfile': 'Instance profile',
  'AWS::Logs::LogGroup': 'Log group',
  'AWS::Lambda::Function': 'Lambda function',
  'AWS::Lambda::Url': 'Function URL',
  'AWS::Lambda::Permission': 'Lambda permission',
  'AWS::Lambda::EventSourceMapping': 'Event source mapping',
  'AWS::Lambda::LayerVersion': 'Lambda layer',
  'AWS::CloudFront::Distribution': 'CloudFront distribution',
  'AWS::CloudFront::CachePolicy': 'Cache policy',
  'AWS::CloudFront::OriginRequestPolicy': 'Origin request policy',
  'AWS::CloudFront::CloudFrontOriginAccessIdentity': 'Origin access identity',
  'AWS::CloudFront::Function': 'CloudFront function',
  'AWS::S3::Bucket': 'S3 bucket',
  'AWS::S3::BucketPolicy': 'Bucket policy',
  'AWS::SQS::Queue': 'SQS queue',
  'AWS::SNS::Topic': 'SNS topic',
  'AWS::DynamoDB::Table': 'DynamoDB table',
  'AWS::DynamoDB::GlobalTable': 'DynamoDB table',
  'AWS::CloudFormation::CustomResource': 'Custom resource',
  'AWS::Events::Rule': 'EventBridge rule',
  'AWS::CloudWatch::Alarm': 'CloudWatch alarm',
  'AWS::ECS::Cluster': 'ECS cluster',
  'AWS::ECS::Service': 'ECS service',
  'AWS::ECS::TaskDefinition': 'Task definition',
  'AWS::ApiGatewayV2::Api': 'HTTP API',
  'AWS::ApiGatewayV2::Stage': 'API stage',
  'AWS::ApiGatewayV2::Route': 'API route',
  'AWS::ApiGatewayV2::Integration': 'API integration',
  'AWS::ApiGatewayV2::VpcLink': 'VPC link',
  'AWS::ApiGatewayV2::DomainName': 'API domain name',
  'AWS::ApiGatewayV2::ApiMapping': 'API mapping',
  'AWS::ElasticLoadBalancingV2::LoadBalancer': 'Load balancer',
  'AWS::ElasticLoadBalancingV2::Listener': 'Listener',
  'AWS::ElasticLoadBalancingV2::ListenerRule': 'Listener rule',
  'AWS::ElasticLoadBalancingV2::TargetGroup': 'Target group',
  'AWS::ServiceDiscovery::PrivateDnsNamespace': 'Private DNS namespace',
  'AWS::ServiceDiscovery::Service': 'Service discovery',
  'AWS::ApplicationAutoScaling::ScalableTarget': 'Scaling target',
  'AWS::ApplicationAutoScaling::ScalingPolicy': 'Scaling policy',
  'AWS::AutoScaling::AutoScalingGroup': 'Auto Scaling group',
  'AWS::SSM::Document': 'SSM document',
  'AWS::SSM::Association': 'SSM association',
  'AWS::EFS::FileSystem': 'EFS file system',
  'AWS::EFS::MountTarget': 'Mount target',
  'AWS::EFS::AccessPoint': 'Access point',
  'AWS::SecretsManager::Secret': 'Secret',
  'AWS::Route53::RecordSet': 'DNS record',
  'AWS::CertificateManager::Certificate': 'TLS certificate',
  'AWS::KMS::Key': 'KMS key',
  'AWS::ElastiCache::ReplicationGroup': 'ElastiCache cluster',
  'AWS::ElastiCache::SubnetGroup': 'Cache subnet group'
};

/** What the most common ones do, said plainly, for the tooltip. */
const PURPOSES: Readonly<Record<string, string>> = {
  'AWS::RDS::DBInstance': 'The database server itself.',
  'AWS::RDS::DBSubnetGroup': 'Which parts of the network the database runs in.',
  'AWS::RDS::DBParameterGroup': 'The database engine’s settings.',
  'AWS::EC2::VPC': 'The private network your app runs in.',
  'AWS::EC2::Subnet': 'One part of the private network, in one availability zone.',
  'AWS::EC2::InternetGateway': 'The network’s way out to the internet.',
  'AWS::EC2::SecurityGroup': 'Firewall rules: who may connect, on which ports.',
  'AWS::IAM::Role': 'Permissions: what this part may do in your AWS account.',
  'AWS::IAM::Policy': 'Permissions attached to a role.',
  'AWS::Logs::LogGroup': 'Where this part’s logs are kept.',
  'AWS::Lambda::Function': 'Code that runs on demand.',
  'AWS::Lambda::Url': 'The address the function answers on.',
  'AWS::CloudFront::Distribution': 'The CDN in front of your site: HTTPS, caching, the public address.',
  'AWS::CloudFront::CachePolicy': 'What the CDN caches, and for how long.',
  'AWS::S3::Bucket': 'File storage.',
  'AWS::SQS::Queue': 'A queue of jobs to process.',
  'AWS::DynamoDB::GlobalTable': 'A key-value table.',
  'AWS::DynamoDB::Table': 'A key-value table.',
  'AWS::CloudFormation::CustomResource': 'A setup step Stacktape runs during the deploy.',
  'AWS::Events::Rule': 'A rule that reacts to an event or runs on a schedule.',
  'AWS::CloudWatch::Alarm': 'An alarm that watches a metric.',
  'AWS::ECS::Service': 'Keeps your containers running.',
  'AWS::ECS::TaskDefinition': 'How to run your container: image, memory, environment.',
  'AWS::ApiGatewayV2::Api': 'The public HTTPS entry point.',
  'AWS::AutoScaling::AutoScalingGroup': 'Keeps the server running, and replaces it if it fails.'
};

/** "VPCGatewayAttachment" as words: "VPC gateway attachment". */
const words = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\b([A-Z])([a-z]+)/g, (_, first: string, rest: string) => `${first.toLowerCase()}${rest}`)
    .replace(/^./, (first) => first.toUpperCase());

/** The short name for a CloudFormation type, or "AWS resource" while the stream has not named it. */
export const awsTypeName = (type: string | undefined): string => {
  if (type === undefined) return 'AWS resource';
  return NAMES[type] ?? words(type.split('::').at(-1) ?? type);
};

/** The tooltip: what it is for, when known, and the exact type. */
export const awsTypeDescription = (type: string | undefined): string | undefined =>
  type === undefined ? undefined : PURPOSES[type] === undefined ? type : `${PURPOSES[type]} ${type}`;
