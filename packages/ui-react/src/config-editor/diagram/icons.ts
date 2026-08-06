import awsIsopack from '@isoflow/isopacks/dist/aws';
import isoflowIsopack from '@isoflow/isopacks/dist/isoflow';

/**
 * Resource type → AWS/Isoflow icon URL.
 *
 * The isopacks are by far the heaviest thing the diagram pulls in: several hundred inlined data-URL
 * icons. They are reachable only from the `config-editor/diagram` subpath, never from the button
 * modules, so a consumer that imports `@stacktape/ui-react/button` never pays for them.
 *
 * The host should lazy-load the diagram entry point. Once that chunk loads, this module creates one
 * lookup table for the icon collections; repeated scene builds reuse it.
 */

const ICON_ID_BY_RESOURCE_TYPE: Record<string, string> = {
  function: 'aws-lambda',
  'web-service': 'aws-fargate',
  'private-service': 'aws-fargate',
  'worker-service': 'aws-fargate',
  'multi-container-workload': 'aws-elastic-container-service',
  'batch-job': 'aws-batch',
  'relational-database': 'aws-rds',
  'dynamo-db-table': 'aws-dynamodb',
  'redis-cluster': 'aws-elasticache',
  'mongo-db-atlas-cluster': 'aws-documentdb',
  'upstash-redis': 'aws-elasticache',
  'open-search-domain': 'aws-opensearch-service',
  'http-api-gateway': 'aws-api-gateway',
  'application-load-balancer': 'aws-elastic-load-balancing',
  'network-load-balancer': 'aws-elastic-load-balancing',
  'sqs-queue': 'aws-simple-queue-service',
  'sns-topic': 'aws-simple-notification-service',
  'event-bus': 'aws-eventbridge',
  'kinesis-stream': 'aws-kinesis',
  bucket: 'aws-simple-storage-service',
  'hosting-bucket': 'aws-cloudfront',
  'efs-filesystem': 'aws-efs',
  'user-auth-pool': 'aws-cognito',
  'web-app-firewall': 'aws-waf',
  'state-machine': 'aws-step-functions',
  'deployment-script': 'aws-lambda',
  bastion: 'aws-ec2',
  'edge-lambda-function': 'aws-cloudfront',
  'nextjs-web': 'aws-cloudfront',
  'astro-web': 'aws-cloudfront',
  'nuxt-web': 'aws-cloudfront',
  'sveltekit-web': 'aws-cloudfront',
  'solidstart-web': 'aws-cloudfront',
  'tanstack-web': 'aws-cloudfront',
  'remix-web': 'aws-cloudfront',
  'nat-gateway': 'aws-transit-gateway',
  cloudfront: 'aws-cloudfront',
  schedule: 'aws-eventbridge',
  user: 'user'
};

const urlByIconId = new Map([...awsIsopack.icons, ...isoflowIsopack.icons].map((icon) => [icon.id, icon.url] as const));

export const getResourceIconUrl = (resourceType: string): string | undefined => {
  const iconId = ICON_ID_BY_RESOURCE_TYPE[resourceType];
  return iconId === undefined ? undefined : urlByIconId.get(iconId);
};
