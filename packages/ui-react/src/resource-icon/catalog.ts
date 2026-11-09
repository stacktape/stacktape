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
  icon: { kind: 'aws'; name: AwsResourceIconName } | { kind: 'framework'; name: FrameworkIconName };
};

type DiagramOnlyResourceType = 'cloudfront' | 'nat-gateway' | 'schedule';

/**
 * The product-wide meaning of a resource icon.
 *
 * Renderers deliberately stay elsewhere: Console and other ordinary React surfaces render the
 * component named by `icon`; the isometric diagram draws its own shapes and colours them by
 * `category`. This catalog is small, has no React or icon-pack dependency, and is the only place
 * where a Stacktape resource type is assigned an icon and AWS category.
 */
export const RESOURCE_VISUALS = {
  function: visual('compute', 'lambda'),
  'web-service': visual('compute', 'fargate'),
  'private-service': visual('compute', 'fargate'),
  'worker-service': visual('compute', 'fargate'),
  'multi-container-workload': visual('compute', 'fargate'),
  'batch-job': visual('compute', 'batch'),
  'deployment-script': visual('compute', 'lambda'),
  // A custom-resource definition is the Lambda function CloudFormation calls for each of its instances.
  'custom-resource-definition': visual('compute', 'lambda'),
  // Convex runs as a Fargate container behind its own load balancer.
  convex: visual('compute', 'fargate'),
  'edge-lambda-function': visual('compute', 'cloudfront'),
  bastion: visual('compute', 'ec2'),
  'relational-database': visual('database', 'rds'),
  // Aurora DSQL has no icon of its own; it is Aurora, so it borrows RDS's.
  'dsql-database': visual('database', 'rds'),
  'dynamo-db-table': visual('database', 'dynamo-db'),
  redis: visual('database', 'elasticache'),
  'mongo-db-atlas-cluster': frameworkVisual('database', 'mongodb'),
  'upstash-redis': frameworkVisual('database', 'upstash'),
  'open-search-domain': visual('database', 'open-search'),
  'http-api-gateway': visual('network', 'api-gateway'),
  'websocket-api-gateway': visual('network', 'api-gateway'),
  'appsync-api': visual('network', 'api-gateway'),
  'application-load-balancer': visual('network', 'elastic-load-balancing'),
  'network-load-balancer': visual('network', 'elastic-load-balancing'),
  'sqs-queue': visual('integration', 'sqs'),
  'sns-topic': visual('integration', 'sns'),
  // SES has no icon in the set this component draws from; SNS is the nearest messaging mark.
  'email-sender': visual('integration', 'sns'),
  'event-bus': visual('integration', 'eventbridge'),
  'kinesis-stream': visual('integration', 'kinesis'),
  // MSK has no mark in the flat icon set this component draws from; Kinesis is the nearest streaming one.
  'kafka-cluster': visual('integration', 'kinesis'),
  bucket: visual('storage', 's3'),
  'hosting-bucket': visual('network', 'cloudfront'),
  'efs-filesystem': visual('storage', 'efs'),
  'user-auth-pool': visual('security', 'cognito'),
  'web-app-firewall': visual('security', 'waf'),
  'state-machine': visual('integration', 'step-functions'),
  'nextjs-web': frameworkVisual('network', 'nextjs'),
  'astro-web': frameworkVisual('network', 'astro'),
  'nuxt-web': frameworkVisual('network', 'nuxt'),
  'sveltekit-web': frameworkVisual('network', 'sveltekit'),
  'solidstart-web': frameworkVisual('network', 'solidstart'),
  'tanstack-web': frameworkVisual('network', 'tanstack-start'),
  'remix-web': frameworkVisual('network', 'remix'),
  'agentcore-runtime': visual('compute', 'bedrock'),
  'agentcore-memory': visual('database', 'bedrock'),
  'agentcore-gateway': visual('network', 'bedrock'),
  'agentcore-browser': visual('compute', 'bedrock'),
  'agentcore-code-interpreter': visual('compute', 'bedrock'),
  'nat-gateway': visual('network', 'elastic-load-balancing'),
  cloudfront: visual('network', 'cloudfront'),
  schedule: visual('integration', 'eventbridge')
} as const satisfies Partial<Record<StacktapeResourceType | DiagramOnlyResourceType, ResourceVisual>>;

/** Stacks deployed by Stacktape v3 still report Redis caches as `redis-cluster` until their next deployment. */
const LEGACY_RESOURCE_TYPES: Record<string, keyof typeof RESOURCE_VISUALS> = { 'redis-cluster': 'redis' };

export const getResourceVisual = (resourceType: string): ResourceVisual | undefined =>
  RESOURCE_VISUALS[(LEGACY_RESOURCE_TYPES[resourceType] ?? resourceType) as keyof typeof RESOURCE_VISUALS];

function visual(category: ResourceVisualCategory, name: AwsResourceIconName): ResourceVisual {
  return { category, icon: { kind: 'aws', name } };
}

function frameworkVisual(category: ResourceVisualCategory, name: FrameworkIconName): ResourceVisual {
  return { category, icon: { kind: 'framework', name } };
}
