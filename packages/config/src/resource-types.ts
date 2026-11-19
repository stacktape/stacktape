import type { StacktapeResourceDefinition } from './shared';

export type StacktapeResourceType = StacktapeResourceDefinition['type'];

/**
 * Lightweight runtime catalog for consumers that only need authored resource discriminators. Keep the large generated
 * JSON schema in `schema-inspection`; importing this list must not pull that schema into browser bundles.
 */
export const STACKTAPE_RESOURCE_TYPES = [
  'function',
  'hosting-bucket',
  'web-service',
  'application-load-balancer',
  'appsync-api',
  'bucket',
  'user-auth-pool',
  'http-api-gateway',
  'websocket-api-gateway',
  'astro-web',
  'aws-cdk-construct',
  'bastion',
  'batch-job',
  'multi-container-workload',
  'relational-database',
  'convex',
  'custom-resource-definition',
  'custom-resource-instance',
  'deployment-script',
  'dynamo-db-table',
  'dsql-database',
  'email-sender',
  'edge-lambda-function',
  'efs-filesystem',
  'event-bus',
  'kinesis-stream',
  'kafka-cluster',
  'mongo-db-atlas-cluster',
  'network-load-balancer',
  'nextjs-web',
  'nuxt-web',
  'open-search-domain',
  'private-service',
  'redis',
  'remix-web',
  'sns-topic',
  'solidstart-web',
  'sqs-queue',
  'state-machine',
  'sveltekit-web',
  'synthetic-test',
  'tanstack-web',
  'upstash-redis',
  'uptime-check',
  'web-app-firewall',
  'worker-service',
  'agentcore-runtime',
  'agentcore-memory',
  'agentcore-gateway',
  'agentcore-browser',
  'agentcore-code-interpreter'
] as const satisfies readonly StacktapeResourceType[];

const splitWords = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * What each resource type is called wherever it is listed: short, in sentence case, in the words a developer uses rather
 * than the AWS service behind it, so labels side by side read as one set.
 */
const RESOURCE_TYPE_NAMES: Record<(typeof STACKTAPE_RESOURCE_TYPES)[number], string> = {
  function: 'Function',
  'hosting-bucket': 'Website',
  'web-service': 'Web service',
  'application-load-balancer': 'Load balancer',
  'appsync-api': 'AppSync API',
  bucket: 'Bucket',
  'user-auth-pool': 'User pool',
  'http-api-gateway': 'HTTP API',
  'websocket-api-gateway': 'WebSocket API',
  'astro-web': 'Astro app',
  'aws-cdk-construct': 'AWS CDK construct',
  bastion: 'Bastion (jump host)',
  'batch-job': 'Batch job',
  'multi-container-workload': 'Multi-container service',
  'relational-database': 'SQL database',
  convex: 'Convex',
  'custom-resource-definition': 'Custom resource definition',
  'custom-resource-instance': 'Custom resource',
  'deployment-script': 'Deployment script',
  'dynamo-db-table': 'DynamoDB table',
  'dsql-database': 'DSQL database',
  'email-sender': 'Email sender',
  'edge-lambda-function': 'Edge function',
  'efs-filesystem': 'EFS file system',
  'event-bus': 'Event bus',
  'kinesis-stream': 'Kinesis stream',
  'kafka-cluster': 'Kafka cluster',
  'mongo-db-atlas-cluster': 'MongoDB Atlas cluster',
  'network-load-balancer': 'Network load balancer',
  'nextjs-web': 'Next.js app',
  'nuxt-web': 'Nuxt app',
  'open-search-domain': 'OpenSearch (Elastic)',
  'private-service': 'Private service',
  redis: 'Redis',
  'remix-web': 'Remix app',
  'sns-topic': 'SNS topic',
  'solidstart-web': 'SolidStart app',
  'sqs-queue': 'SQS queue',
  'state-machine': 'State machine',
  'sveltekit-web': 'SvelteKit app',
  'synthetic-test': 'Synthetic test',
  'tanstack-web': 'TanStack app',
  'upstash-redis': 'Upstash Redis',
  'uptime-check': 'Uptime check',
  'web-app-firewall': 'Web app firewall',
  'worker-service': 'Worker service',
  'agentcore-runtime': 'AgentCore runtime',
  'agentcore-memory': 'AgentCore memory',
  'agentcore-gateway': 'AgentCore gateway',
  'agentcore-browser': 'AgentCore browser',
  'agentcore-code-interpreter': 'AgentCore code interpreter'
};

export const getPrettyResourceName = (resourceName: string) => {
  const named = RESOURCE_TYPE_NAMES[resourceName as keyof typeof RESOURCE_TYPE_NAMES];
  if (named) return named;
  return splitWords(resourceName)
    .replaceAll(' Db', 'Db')
    .replace('Agentcore', 'AgentCore')
    .replace('Appsync', 'AppSync')
    .replace('Websocket', 'WebSocket')
    .replace('DynamoDb Table', 'DynamoDB table')
    .replace('Dsql Database', 'DSQL database')
    .replace('Email Sender', 'Email sender')
    .replace('Kafka Cluster', 'Kafka cluster')
    .replace('Efs', 'EFS')
    .replace('Sqs', 'SQS')
    .replace('Sns', 'SNS')
    .replace('Aws Cdk', 'AWS CDK')
    .replace('Relational Database', 'SQL database')
    .replace('Open Search Domain', 'OpenSearch (Elastic)')
    .replace('Bastion', 'Bastion (Jump Host)')
    .replace('Event Bus', 'Event Bus (EventBridge)')
    .replace('State Machine', 'State Machine')
    .replace('Application Load', 'Load')
    .replace(/\bApi\b/g, 'API')
    .replace('Http API', 'HTTP API')
    .replace('Nextjs', 'Next.js')
    .replace('Sveltekit', 'SvelteKit')
    .replace('Solidstart', 'SolidStart')
    .replace('Tanstack', 'TanStack');
};
