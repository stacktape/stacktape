import type { StacktapeResourceType } from '@stacktape/config/resource-types';

export type ResourceVisualCategory = 'compute' | 'database' | 'integration' | 'network' | 'security' | 'storage';

export type AwsResourceIconName =
  | 'api-gateway'
  | 'batch'
  | 'bedrock'
  | 'cloudfront'
  | 'cognito'
  | 'document-db'
  | 'dynamo-db'
  | 'ec2'
  | 'efs'
  | 'elasticache'
  | 'elastic-load-balancing'
  | 'eventbridge'
  | 'fargate'
  | 'kinesis'
  | 'lambda'
  | 'open-search'
  | 'rds'
  | 's3'
  | 'sns'
  | 'sqs'
  | 'step-functions'
  | 'waf';

export type FrameworkIconName =
  | 'astro'
  | 'gatsby'
  | 'laravel'
  | 'mongodb'
  | 'nextjs'
  | 'nuxt'
  | 'remix'
  | 'solidstart'
  | 'sveltekit'
  | 'tanstack-start'
  | 'upstash'
  | 'vite';

export type ResourceVisual = {
  category: ResourceVisualCategory;
  diagramIconId: string;
  icon: { kind: 'aws'; name: AwsResourceIconName } | { kind: 'framework'; name: FrameworkIconName };
};

type DiagramOnlyResourceType = 'cloudfront' | 'nat-gateway' | 'schedule' | 'user';

/**
 * The product-wide meaning of a resource icon.
 *
 * Renderers deliberately stay elsewhere: Console and other ordinary React surfaces render the
 * component named by `icon`; the isometric diagram resolves `diagramIconId` from its large isopack
 * catalogue. This catalog is small, has no React or icon-pack dependency, and is the only place
 * where a Stacktape resource type is assigned an icon and AWS category.
 */
export const RESOURCE_VISUALS = {
  function: visual('compute', 'lambda', 'aws-lambda'),
  'web-service': visual('compute', 'fargate', 'aws-fargate'),
  'private-service': visual('compute', 'fargate', 'aws-fargate'),
  'worker-service': visual('compute', 'fargate', 'aws-fargate'),
  'multi-container-workload': visual('compute', 'fargate', 'aws-elastic-container-service'),
  'batch-job': visual('compute', 'batch', 'aws-batch'),
  'deployment-script': visual('compute', 'lambda', 'aws-lambda'),
  'edge-lambda-function': visual('compute', 'cloudfront', 'aws-cloudfront'),
  bastion: visual('compute', 'ec2', 'aws-ec2'),
  'relational-database': visual('database', 'rds', 'aws-rds'),
  'dynamo-db-table': visual('database', 'dynamo-db', 'aws-dynamodb'),
  'redis-cluster': visual('database', 'elasticache', 'aws-elasticache'),
  'mongo-db-atlas-cluster': frameworkVisual('database', 'mongodb', 'aws-documentdb'),
  'upstash-redis': frameworkVisual('database', 'upstash', 'aws-elasticache'),
  'open-search-domain': visual('database', 'open-search', 'aws-opensearch-service'),
  'http-api-gateway': visual('network', 'api-gateway', 'aws-api-gateway'),
  'application-load-balancer': visual('network', 'elastic-load-balancing', 'aws-elastic-load-balancing'),
  'network-load-balancer': visual('network', 'elastic-load-balancing', 'aws-elastic-load-balancing'),
  'sqs-queue': visual('integration', 'sqs', 'aws-simple-queue-service'),
  'sns-topic': visual('integration', 'sns', 'aws-simple-notification-service'),
  'event-bus': visual('integration', 'eventbridge', 'aws-eventbridge'),
  'kinesis-stream': visual('integration', 'kinesis', 'aws-kinesis'),
  bucket: visual('storage', 's3', 'aws-simple-storage-service'),
  'hosting-bucket': visual('network', 'cloudfront', 'aws-cloudfront'),
  'efs-filesystem': visual('storage', 'efs', 'aws-efs'),
  'user-auth-pool': visual('security', 'cognito', 'aws-cognito'),
  'web-app-firewall': visual('security', 'waf', 'aws-waf'),
  'state-machine': visual('integration', 'step-functions', 'aws-step-functions'),
  'nextjs-web': frameworkVisual('network', 'nextjs', 'aws-cloudfront'),
  'astro-web': frameworkVisual('network', 'astro', 'aws-cloudfront'),
  'nuxt-web': frameworkVisual('network', 'nuxt', 'aws-cloudfront'),
  'sveltekit-web': frameworkVisual('network', 'sveltekit', 'aws-cloudfront'),
  'solidstart-web': frameworkVisual('network', 'solidstart', 'aws-cloudfront'),
  'tanstack-web': frameworkVisual('network', 'tanstack-start', 'aws-cloudfront'),
  'remix-web': frameworkVisual('network', 'remix', 'aws-cloudfront'),
  'agentcore-runtime': visual('compute', 'bedrock', 'aws-lambda'),
  'agentcore-memory': visual('database', 'bedrock', 'aws-memorydb-for-redis'),
  'agentcore-gateway': visual('network', 'bedrock', 'aws-api-gateway'),
  'agentcore-browser': visual('compute', 'bedrock', 'aws-lambda'),
  'agentcore-code-interpreter': visual('compute', 'bedrock', 'aws-lambda'),
  'nat-gateway': visual('network', 'elastic-load-balancing', 'aws-transit-gateway'),
  cloudfront: visual('network', 'cloudfront', 'aws-cloudfront'),
  schedule: visual('integration', 'eventbridge', 'aws-eventbridge'),
  user: visual('security', 'cognito', 'user')
} as const satisfies Partial<Record<StacktapeResourceType | DiagramOnlyResourceType, ResourceVisual>>;

export const getResourceVisual = (resourceType: string): ResourceVisual | undefined =>
  RESOURCE_VISUALS[resourceType as keyof typeof RESOURCE_VISUALS];

function visual(category: ResourceVisualCategory, name: AwsResourceIconName, diagramIconId: string): ResourceVisual {
  return { category, diagramIconId, icon: { kind: 'aws', name } };
}

function frameworkVisual(
  category: ResourceVisualCategory,
  name: FrameworkIconName,
  diagramIconId: string
): ResourceVisual {
  return { category, diagramIconId, icon: { kind: 'framework', name } };
}
