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
  'redis-cluster',
  'remix-web',
  'sns-topic',
  'solidstart-web',
  'sqs-queue',
  'state-machine',
  'sveltekit-web',
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

export const getPrettyResourceName = (resourceName: string) => {
  return splitWords(resourceName)
    .replaceAll(' Db', 'Db')
    .replace('Agentcore', 'AgentCore')
    .replace('Appsync', 'AppSync')
    .replace('Websocket', 'WebSocket')
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
    .replace('Application Load', 'Load');
};
