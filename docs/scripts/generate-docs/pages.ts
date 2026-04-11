import { join } from 'node:path';
import { cliCommands } from '../../../src/config/cli/commands';
import type { PageDefinition } from './types';

const docsRoot = join(import.meta.dir, '..', '..');
const stacktapeRoot = join(docsRoot, '..');
const consoleRoot = join(stacktapeRoot, '..', 'console-app');

const resourceInfo: Record<
  string,
  {
    title: string;
    category: string;
    fileName: string;
    typeName: string;
    description: string;
  }
> = {
  'lambda-function': { title: 'Lambda Function', category: 'compute', fileName: 'functions.d.ts', typeName: 'LambdaFunctionConfig', description: 'Serverless event-driven compute.' },
  'web-service': { title: 'Web Service', category: 'compute', fileName: 'web-services.d.ts', typeName: 'WebServiceConfig', description: 'Always-on container with a public HTTPS URL.' },
  'private-service': { title: 'Private Service', category: 'compute', fileName: 'private-services.d.ts', typeName: 'PrivateServiceConfig', description: 'Always-on container reachable only inside your stack or VPC.' },
  'worker-service': { title: 'Worker Service', category: 'compute', fileName: 'worker-services.d.ts', typeName: 'WorkerServiceConfig', description: 'Always-on background worker without a public endpoint.' },
  'multi-container-workload': { title: 'Multi-Container Workload', category: 'compute', fileName: 'multi-container-workloads.d.ts', typeName: 'ContainerWorkloadConfig', description: 'Run multiple containers together.' },
  'batch-job': { title: 'Batch Job', category: 'compute', fileName: 'batch-jobs.d.ts', typeName: 'BatchJobConfig', description: 'Run compute-heavy or long-running jobs to completion.' },
  'edge-function': { title: 'Edge Function', category: 'compute', fileName: 'edge-lambda-functions.d.ts', typeName: 'EdgeLambdaFunctionConfig', description: 'Run Lambda code at CloudFront edge locations.' },
  'static-hosting': { title: 'Static Hosting', category: 'frontend', fileName: 'hosting-buckets.d.ts', typeName: 'HostingBucketConfig', description: 'Static sites on S3 and CloudFront.' },
  nextjs: { title: 'Next.js', category: 'frontend', fileName: 'nextjs-web.d.ts', typeName: 'NextjsWebConfig', description: 'Deploy a Next.js app on AWS.' },
  astro: { title: 'Astro', category: 'frontend', fileName: 'astro-web.d.ts', typeName: 'AstroWebConfig', description: 'Deploy an Astro SSR app on AWS.' },
  nuxt: { title: 'Nuxt', category: 'frontend', fileName: 'nuxt-web.d.ts', typeName: 'NuxtWebConfig', description: 'Deploy a Nuxt SSR app on AWS.' },
  sveltekit: { title: 'SvelteKit', category: 'frontend', fileName: 'sveltekit-web.d.ts', typeName: 'SvelteKitWebConfig', description: 'Deploy a SvelteKit app on AWS.' },
  solidstart: { title: 'SolidStart', category: 'frontend', fileName: 'solidstart-web.d.ts', typeName: 'SolidStartWebConfig', description: 'Deploy a SolidStart app on AWS.' },
  tanstack: { title: 'TanStack Start', category: 'frontend', fileName: 'tanstack-web.d.ts', typeName: 'TanStackWebConfig', description: 'Deploy a TanStack Start app on AWS.' },
  remix: { title: 'Remix', category: 'frontend', fileName: 'remix-web.d.ts', typeName: 'RemixWebConfig', description: 'Deploy a Remix app on AWS.' },
  'relational-database': { title: 'Relational Database', category: 'databases', fileName: 'relational-databases.d.ts', typeName: 'RelationalDatabaseConfig', description: 'Managed SQL databases on AWS.' },
  dynamodb: { title: 'DynamoDB', category: 'databases', fileName: 'dynamo-db-tables.d.ts', typeName: 'DynamoDbTableConfig', description: 'Serverless key-value and document database.' },
  redis: { title: 'Redis', category: 'databases', fileName: 'redis-cluster.d.ts', typeName: 'RedisClusterConfig', description: 'Managed Redis for caching, sessions, and queues.' },
  mongodb: { title: 'MongoDB Atlas', category: 'databases', fileName: 'mongo-db-atlas-clusters.d.ts', typeName: 'MongoDbAtlasClusterConfig', description: 'Provision MongoDB Atlas clusters from Stacktape.' },
  upstash: { title: 'Upstash Redis', category: 'databases', fileName: 'upstash-redis.d.ts', typeName: 'UpstashRedisConfig', description: 'Serverless Redis by Upstash.' },
  opensearch: { title: 'OpenSearch', category: 'databases', fileName: 'open-search.d.ts', typeName: 'OpenSearchDomainConfig', description: 'Managed OpenSearch for search and analytics.' },
  bucket: { title: 'S3 Bucket', category: 'storage', fileName: 'buckets.d.ts', typeName: 'BucketConfig', description: 'S3 object storage.' },
  efs: { title: 'EFS Filesystem', category: 'storage', fileName: 'efs-filesystem.d.ts', typeName: 'EfsFilesystemConfig', description: 'Elastic shared file storage.' },
  'http-api-gateway': { title: 'HTTP API Gateway', category: 'networking', fileName: 'http-api-gateways.d.ts', typeName: 'HttpApiGatewayConfig', description: 'Serverless HTTP APIs on AWS API Gateway.' },
  alb: { title: 'Application Load Balancer', category: 'networking', fileName: 'application-load-balancers.d.ts', typeName: 'ApplicationLoadBalancerConfig', description: 'HTTP/HTTPS load balancing.' },
  nlb: { title: 'Network Load Balancer', category: 'networking', fileName: 'network-load-balancers.d.ts', typeName: 'NetworkLoadBalancerConfig', description: 'TCP/TLS load balancing.' },
  cdn: { title: 'CDN', category: 'networking', fileName: 'cdn.d.ts', typeName: 'CdnConfig', description: 'CloudFront-based content delivery and edge routing.' },
  'custom-domains': { title: 'Custom Domains', category: 'networking', fileName: 'domains.d.ts', typeName: 'DomainConfiguration', description: 'Attach your own domains to Stacktape resources.' },
  'event-bus': { title: 'Event Bus', category: 'messaging', fileName: 'event-buses.d.ts', typeName: 'EventBusConfig', description: 'EventBridge event buses.' },
  'sqs-queue': { title: 'SQS Queue', category: 'messaging', fileName: 'sqs-queues.d.ts', typeName: 'SqsQueueConfig', description: 'Serverless message queues.' },
  'sns-topic': { title: 'SNS Topic', category: 'messaging', fileName: 'sns-topics.d.ts', typeName: 'SnsTopicConfig', description: 'Pub/sub fanout via SNS.' },
  'kinesis-stream': { title: 'Kinesis Stream', category: 'messaging', fileName: 'kinesis-streams.d.ts', typeName: 'KinesisStreamConfig', description: 'Real-time data streams.' },
  'state-machine': { title: 'State Machine', category: 'orchestration', fileName: 'state-machines.d.ts', typeName: 'StateMachineConfig', description: 'Step Functions workflows.' },
  'user-auth-pool': { title: 'User Authentication Pool', category: 'security', fileName: 'user-pools.d.ts', typeName: 'UserAuthPoolConfig', description: 'Cognito-based authentication.' },
  waf: { title: 'Web Application Firewall', category: 'security', fileName: 'web-app-firewall.d.ts', typeName: 'WebAppFirewallConfig', description: 'AWS WAF for APIs, ALBs, CDNs, and auth.' },
  bastion: { title: 'Bastion Host', category: 'security', fileName: 'bastion.d.ts', typeName: 'BastionConfig', description: 'Secure access to private resources.' },
  'custom-resources': { title: 'Custom Resources', category: 'advanced', fileName: 'custom-resources.d.ts', typeName: 'CustomResourceDefinitionConfig', description: 'Lambda-backed provisioning logic.' },
  'deployment-scripts': { title: 'Deployment Scripts', category: 'advanced', fileName: 'deployment-script.d.ts', typeName: 'DeploymentScriptConfig', description: 'Run scripts during deploy or delete.' },
  'aws-cdk-constructs': { title: 'AWS CDK Constructs', category: 'advanced', fileName: 'aws-cdk-construct.d.ts', typeName: 'AwsCdkConstructConfig', description: 'Embed CDK constructs in Stacktape.' },
  'raw-cloudformation': { title: 'Raw CloudFormation Resources', category: 'advanced', fileName: '_root.d.ts', typeName: 'StacktapeConfig', description: 'Use raw CloudFormation as an escape hatch.' }
};

const sharedTypeFiles = [
  '__helpers.d.ts',
  '_root.d.ts',
  'events.d.ts',
  'deployment-artifacts.d.ts',
  'alarms.d.ts'
].map((f) => join(stacktapeRoot, 'types', 'stacktape-config', f));

const resourcePage = ({
  slug,
  route,
  order,
  title,
  description,
  extraSourceFiles = []
}: {
  slug: string;
  route: string;
  order: number;
  title?: string;
  description?: string;
  extraSourceFiles?: string[];
}): PageDefinition => {
  const info = resourceInfo[slug];
  return {
    id: route.replaceAll('/', '__'),
    title: title || info.title,
    route,
    outputPath: join(docsRoot, '_new-docs', `${route}.mdx`),
    order,
    kind: 'resource',
    template: 'resource',
    category: info.category,
    shortDescription: description || info.description,
    sourceFiles: [
      join(stacktapeRoot, 'types', 'stacktape-config', info.fileName),
      ...sharedTypeFiles,
      ...extraSourceFiles
    ],
    typeName: info.typeName
  };
};

const choosingPage = ({
  category,
  route,
  order,
  title,
  description,
  slugs
}: {
  category: string;
  route: string;
  order: number;
  title: string;
  description: string;
  slugs: string[];
}): PageDefinition => {
  const sourceFiles = [
    ...new Set(
      slugs.flatMap((slug) => {
        const info = resourceInfo[slug];
        return info ? [join(stacktapeRoot, 'types', 'stacktape-config', info.fileName)] : [];
      })
    ),
    join(stacktapeRoot, 'types', 'stacktape-config', '__helpers.d.ts'),
    join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts')
  ];
  return {
    id: route.replaceAll('/', '__'),
    title,
    route,
    outputPath: join(docsRoot, '_new-docs', `${route}.mdx`),
    order,
    kind: 'choosing',
    template: 'choosing',
    category,
    shortDescription: description,
    sourceFiles,
    notes: ['This is a comparison and decision-support page, not a deep API reference page. Include all resources in this category.']
  };
};

const generalPage = ({
  route,
  title,
  order,
  kind,
  template = 'general',
  description,
  sourceFiles = [],
  sourceGlobs = [],
  notes = []
}: Omit<PageDefinition, 'id' | 'outputPath' | 'category'> & { category?: string }): PageDefinition => ({
  id: route.replaceAll('/', '__'),
  title,
  route,
  outputPath: join(docsRoot, '_new-docs', `${route}.mdx`),
  order,
  kind,
  template,
  category: route.split('/')[0] || 'root',
  shortDescription: description,
  sourceFiles,
  sourceGlobs,
  notes
});

const cliPage = ({ command, order }: { command: string; order: number }): PageDefinition => ({
  id: `cli__${command.replaceAll(':', '__')}`,
  title: command,
  route: `reference/cli/${command.replaceAll(':', '-')}`,
  outputPath: join(docsRoot, '_new-docs', 'reference', 'cli', `${command.replaceAll(':', '-')}.mdx`),
  order,
  kind: 'cli',
  template: 'cli',
  category: 'reference',
  shortDescription: `CLI reference page for \`${command}\`.`,
  cliCommand: command,
  sourceFiles: [
    join(stacktapeRoot, 'src', 'config', 'cli', 'commands.ts'),
    join(stacktapeRoot, 'src', 'config', 'cli', 'utils.ts'),
    join(stacktapeRoot, 'src', 'commands', `${command.replaceAll(':', '-')}`, 'index.ts')
  ],
  notes: ['This page should document exactly one command.']
});

export const pageDefinitions: PageDefinition[] = [
  generalPage({
    route: 'index',
    title: 'Introduction',
    order: 0,
    kind: 'introduction',
    template: 'general',
    description: 'Top-level introduction to Stacktape.',
    sourceFiles: [join(stacktapeRoot, 'README.md'), join(consoleRoot, 'AGENTS_ABOUT_STACKTAPE.md')],
    notes: ['This is a framing page before Getting Started.']
  }),

  generalPage({ route: 'getting-started/what-is-stacktape', title: 'What Stacktape Is', order: 1, kind: 'getting-started', template: 'general', description: 'Explain what Stacktape is and why it exists.', sourceFiles: [join(stacktapeRoot, 'README.md')] }),
  generalPage({ route: 'getting-started/why-teams-use-stacktape', title: 'Why Teams Use Stacktape', order: 2, kind: 'getting-started', template: 'general', description: 'Explain the value proposition and common use cases.', sourceFiles: [join(stacktapeRoot, 'README.md'), join(consoleRoot, 'AGENTS_ABOUT_STACKTAPE.md')] }),
  generalPage({ route: 'getting-started/install-and-login', title: 'Install and Login', order: 3, kind: 'getting-started', template: 'general', description: 'Install Stacktape and log in.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'login', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'init', 'index.ts')] }),
  generalPage({ route: 'getting-started/create-your-first-project', title: 'Create Your First Project', order: 4, kind: 'getting-started', template: 'general', description: 'Create the first Stacktape project.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'init', 'index.ts'), join(consoleRoot, 'src', 'components', 'GettingStarted', 'GettingStarted.tsx')] }),
  generalPage({ route: 'getting-started/deploy-your-first-stage', title: 'Deploy Your First Stage', order: 5, kind: 'getting-started', template: 'general', description: 'Deploy the first environment to AWS.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'deploy', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'preview-changes', 'index.ts')] }),
  generalPage({ route: 'getting-started/make-a-change-and-redeploy', title: 'Make a Change and Redeploy', order: 6, kind: 'getting-started', template: 'general', description: 'Show the change-deploy loop.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'deploy', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'rollback', 'index.ts')] }),
  generalPage({ route: 'getting-started/use-the-console', title: 'Use the Console', order: 7, kind: 'getting-started', template: 'general', description: 'Orient the reader in Stacktape Console.', sourceFiles: [join(consoleRoot, 'src', 'Explanations.tsx'), join(consoleRoot, 'src', 'components', 'Navigation', 'Navigation.tsx')] }),
  generalPage({ route: 'getting-started/next-steps', title: 'Next Steps', order: 8, kind: 'getting-started', template: 'general', description: 'Guide the reader to the most relevant next docs.', sourceFiles: [join(docsRoot, 'DOCS_STRUCTURE_PLAN.md')] }),

  generalPage({ route: 'core-concepts/configuration-file', title: 'Configuration File', order: 1, kind: 'concept', description: 'YAML vs TypeScript configuration.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts'), join(docsRoot, '_curated-docs', 'concepts', 'yaml-config.mdx'), join(docsRoot, '_curated-docs', 'concepts', 'typescript-config.mdx')] }),
  generalPage({ route: 'core-concepts/resources', title: 'Resources', order: 2, kind: 'concept', description: 'Explain Stacktape resources and how they map to AWS.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '__helpers.d.ts')] }),
  generalPage({ route: 'core-concepts/stages-and-environments', title: 'Stages and Environments', order: 3, kind: 'concept', description: 'Explain stage-based deployments.', sourceFiles: [join(docsRoot, '_curated-docs', 'concepts', 'stages-and-environments.mdx'), join(stacktapeRoot, 'src', 'commands', 'deploy', 'index.ts')] }),
  generalPage({ route: 'core-concepts/connecting-resources', title: 'Connecting Resources', order: 4, kind: 'concept', description: 'Explain connectTo.', sourceFiles: [join(docsRoot, '_curated-docs', 'concepts', 'connecting-resources.mdx'), join(stacktapeRoot, 'types', 'stacktape-config', '__helpers.d.ts')] }),
  generalPage({ route: 'core-concepts/directives', title: 'Directives', order: 5, kind: 'concept', description: 'Explain built-in and custom directives.', sourceFiles: [join(docsRoot, '_curated-docs', 'concepts', 'directives.mdx'), join(stacktapeRoot, 'src', 'domain', 'config-manager', 'built-in-directives.ts')] }),
  generalPage({ route: 'core-concepts/variables-and-reuse', title: 'Variables and Reuse', order: 6, kind: 'concept', description: 'Reuse values and reduce duplication.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts')] }),
  generalPage({ route: 'core-concepts/hooks-and-scripts', title: 'Hooks and Scripts', order: 7, kind: 'concept', description: 'Lifecycle hooks and scripts.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts'), join(stacktapeRoot, 'types', 'scripts.d.ts')] }),
  generalPage({ route: 'core-concepts/overrides-and-escape-hatches', title: 'Overrides and Escape Hatches', order: 8, kind: 'concept', description: 'Overrides, CDK, and raw CloudFormation.', sourceFiles: [join(docsRoot, '_curated-docs', 'concepts', 'overrides-and-transforms.mdx'), join(docsRoot, '_curated-docs', 'concepts', 'extending-cloudformation.mdx')] }),

  choosingPage({ category: 'compute', route: 'resources/compute/choosing-compute', order: 1, title: 'Choosing Compute', description: 'Help users choose between the available compute resources.', slugs: ['lambda-function', 'web-service', 'private-service', 'worker-service', 'multi-container-workload', 'batch-job', 'edge-function'] }),
  resourcePage({ slug: 'lambda-function', route: 'resources/compute/lambda-function', order: 2 }),
  resourcePage({ slug: 'web-service', route: 'resources/compute/web-service', order: 3 }),
  resourcePage({ slug: 'private-service', route: 'resources/compute/private-service', order: 4 }),
  resourcePage({ slug: 'worker-service', route: 'resources/compute/worker-service', order: 5 }),
  resourcePage({ slug: 'multi-container-workload', route: 'resources/compute/multi-container-workload', order: 6 }),
  resourcePage({ slug: 'batch-job', route: 'resources/compute/batch-job', order: 7 }),
  resourcePage({ slug: 'edge-function', route: 'resources/compute/edge-function', order: 8 }),

  choosingPage({ category: 'frontend', route: 'resources/frontend/choosing-a-frontend-resource', order: 1, title: 'Choosing a Frontend Resource', description: 'Help users choose between static hosting and the SSR frameworks.', slugs: ['static-hosting', 'nextjs', 'astro', 'nuxt', 'sveltekit', 'solidstart', 'tanstack', 'remix'] }),
  resourcePage({ slug: 'static-hosting', route: 'resources/frontend/static-hosting', order: 2 }),
  resourcePage({ slug: 'nextjs', route: 'resources/frontend/nextjs', order: 3 }),
  resourcePage({ slug: 'astro', route: 'resources/frontend/astro', order: 4 }),
  resourcePage({ slug: 'nuxt', route: 'resources/frontend/nuxt', order: 5 }),
  resourcePage({ slug: 'sveltekit', route: 'resources/frontend/sveltekit', order: 6 }),
  resourcePage({ slug: 'solidstart', route: 'resources/frontend/solidstart', order: 7 }),
  resourcePage({ slug: 'tanstack', route: 'resources/frontend/tanstack-start', order: 8 }),
  resourcePage({ slug: 'remix', route: 'resources/frontend/remix', order: 9 }),

  choosingPage({ category: 'databases', route: 'resources/databases/choosing-a-database', order: 1, title: 'Choosing a Database', description: 'Help users choose the right data store.', slugs: ['relational-database', 'dynamodb', 'redis', 'mongodb', 'upstash', 'opensearch'] }),
  resourcePage({ slug: 'relational-database', route: 'resources/databases/relational-database', order: 2 }),
  resourcePage({ slug: 'dynamodb', route: 'resources/databases/dynamodb', order: 3 }),
  resourcePage({ slug: 'redis', route: 'resources/databases/redis', order: 4 }),
  resourcePage({ slug: 'mongodb', route: 'resources/databases/mongodb-atlas', order: 5 }),
  resourcePage({ slug: 'upstash', route: 'resources/databases/upstash-redis', order: 6 }),
  resourcePage({ slug: 'opensearch', route: 'resources/databases/opensearch', order: 7 }),

  resourcePage({ slug: 'bucket', route: 'resources/storage/s3-bucket', order: 1 }),
  resourcePage({ slug: 'efs', route: 'resources/storage/efs-filesystem', order: 2 }),

  resourcePage({ slug: 'http-api-gateway', route: 'resources/networking/http-api-gateway', order: 1 }),
  resourcePage({ slug: 'alb', route: 'resources/networking/application-load-balancer', order: 2 }),
  resourcePage({ slug: 'nlb', route: 'resources/networking/network-load-balancer', order: 3 }),
  resourcePage({ slug: 'cdn', route: 'resources/networking/cdn', order: 4 }),
  resourcePage({ slug: 'custom-domains', route: 'resources/networking/custom-domains', order: 5 }),

  resourcePage({ slug: 'event-bus', route: 'resources/messaging/event-bus', order: 1 }),
  resourcePage({ slug: 'sqs-queue', route: 'resources/messaging/sqs-queue', order: 2 }),
  resourcePage({ slug: 'sns-topic', route: 'resources/messaging/sns-topic', order: 3 }),
  resourcePage({ slug: 'kinesis-stream', route: 'resources/messaging/kinesis-stream', order: 4 }),

  resourcePage({ slug: 'state-machine', route: 'resources/orchestration/state-machine', order: 1 }),

  resourcePage({ slug: 'user-auth-pool', route: 'resources/security/user-auth-pool', order: 1 }),
  resourcePage({ slug: 'waf', route: 'resources/security/web-application-firewall', order: 2 }),
  resourcePage({ slug: 'bastion', route: 'resources/security/bastion-host', order: 3 }),

  resourcePage({ slug: 'custom-resources', route: 'resources/advanced/custom-resources', order: 1 }),
  resourcePage({ slug: 'deployment-scripts', route: 'resources/advanced/deployment-scripts', order: 2 }),
  resourcePage({ slug: 'aws-cdk-constructs', route: 'resources/advanced/aws-cdk-constructs', order: 3 }),
  resourcePage({ slug: 'raw-cloudformation', route: 'resources/advanced/raw-cloudformation-resources', order: 4 }),

  generalPage({ route: 'packaging/overview', title: 'Packaging Overview', order: 1, kind: 'packaging', description: 'Overview of Stacktape packaging options.', sourceFiles: [join(stacktapeRoot, 'types', 'packaging.d.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),
  generalPage({ route: 'packaging/stacktape-buildpack-lambda', title: 'Stacktape Buildpack for Lambda', order: 2, kind: 'packaging', description: 'Zero-config Lambda packaging.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts'), join(stacktapeRoot, 'types', 'packaging.d.ts')] }),
  generalPage({ route: 'packaging/stacktape-buildpack-containers', title: 'Stacktape Buildpack for Containers', order: 3, kind: 'packaging', description: 'Zero-config container image packaging.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts'), join(stacktapeRoot, 'types', 'packaging.d.ts')] }),
  generalPage({ route: 'packaging/custom-dockerfile', title: 'Custom Dockerfile', order: 4, kind: 'packaging', description: 'Use your own Dockerfile.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),
  generalPage({ route: 'packaging/prebuilt-image', title: 'Prebuilt Image', order: 5, kind: 'packaging', description: 'Use an existing container image.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),
  generalPage({ route: 'packaging/nixpacks', title: 'Nixpacks', order: 6, kind: 'packaging', description: 'Use Nixpacks packaging.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),
  generalPage({ route: 'packaging/external-buildpack', title: 'External Buildpack', order: 7, kind: 'packaging', description: 'Use external Cloud Native Buildpacks.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),
  generalPage({ route: 'packaging/custom-artifact', title: 'Custom Artifact', order: 8, kind: 'packaging', description: 'Use a pre-built deployment artifact.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),
  generalPage({ route: 'packaging/language-specific-config', title: 'Language-Specific Config', order: 9, kind: 'packaging', description: 'Language-specific packaging options.', sourceFiles: [join(stacktapeRoot, 'types', 'packaging.d.ts')] }),

  generalPage({ route: 'events-and-triggers/overview', title: 'Events and Triggers Overview', order: 1, kind: 'events', description: 'Overview of event sources and triggers.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'events-and-triggers/http-triggers', title: 'HTTP Triggers', order: 2, kind: 'events', description: 'HTTP integrations and triggers.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'events-and-triggers/schedule-triggers', title: 'Schedule Triggers', order: 3, kind: 'events', description: 'Cron and schedule-based execution.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'events-and-triggers/s3-events', title: 'S3 Events', order: 4, kind: 'events', description: 'Trigger on S3 object events.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'events-and-triggers/sqs-events', title: 'SQS Events', order: 5, kind: 'events', description: 'Trigger on SQS queue messages.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'events-and-triggers/sns-events', title: 'SNS Events', order: 6, kind: 'events', description: 'Trigger on SNS deliveries.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'events-and-triggers/dynamodb-streams', title: 'DynamoDB Streams', order: 7, kind: 'events', description: 'Trigger on DynamoDB changes.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'events-and-triggers/kinesis-events', title: 'Kinesis Events', order: 8, kind: 'events', description: 'Trigger on Kinesis streams.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'events-and-triggers/event-bus-events', title: 'Event Bus Events', order: 9, kind: 'events', description: 'Trigger on EventBridge events.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'events-and-triggers/cloudwatch-logs', title: 'CloudWatch Logs', order: 10, kind: 'events', description: 'Trigger on CloudWatch log events.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'events-and-triggers/alarms-as-triggers', title: 'Alarms as Triggers', order: 11, kind: 'events', description: 'Use alarms as event sources.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'alarms.d.ts')] }),
  generalPage({ route: 'events-and-triggers/kafka-topics', title: 'Kafka Topics', order: 12, kind: 'events', description: 'Trigger on Kafka topics.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),

  generalPage({ route: 'deployment-and-lifecycle/deploying-stacks', title: 'Deploying Stacks', order: 1, kind: 'deployment', description: 'How deployment works in Stacktape.', sourceFiles: [join(docsRoot, '_curated-docs', 'getting-started', 'deployment.mdx'), join(stacktapeRoot, 'src', 'commands', 'deploy', 'index.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/previewing-changes', title: 'Previewing Changes', order: 2, kind: 'deployment', description: 'Preview what a deployment would change.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'preview-changes', 'index.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/gradual-deployments', title: 'Gradual Deployments', order: 3, kind: 'deployment', description: 'Canary and linear deployment strategies.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'functions.d.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'web-services.d.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/rollbacks', title: 'Rollbacks', order: 4, kind: 'deployment', description: 'Rollback a deployment safely.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'rollback', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'cf-rollback', 'index.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/destroying-stacks', title: 'Destroying Stacks', order: 5, kind: 'deployment', description: 'Delete deployed stacks.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'delete', 'index.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/deployment-scripts-and-hooks', title: 'Deployment Scripts and Hooks', order: 6, kind: 'deployment', description: 'Automate work before and after deployments.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-script.d.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/multi-region-deployments', title: 'Multi-Region Deployments', order: 7, kind: 'deployment', description: 'Run stages in more than one region.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'deploy', 'index.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/deploy-time-parameters', title: 'Deploy-Time Parameters', order: 8, kind: 'deployment', description: 'Use runtime directives and CLI arguments at deploy time.', sourceFiles: [join(stacktapeRoot, 'src', 'domain', 'config-manager', 'built-in-directives.ts')] }),

  generalPage({ route: 'local-development/dev-mode-overview', title: 'Dev Mode Overview', order: 1, kind: 'local-development', description: 'How stacktape dev works.', sourceFiles: [join(docsRoot, '_curated-docs', 'getting-started', 'dev-mode.mdx'), join(stacktapeRoot, 'src', 'commands', 'dev', 'index.ts')] }),
  generalPage({ route: 'local-development/local-databases', title: 'Local Databases', order: 2, kind: 'local-development', description: 'Which databases can run locally and how.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'dev', 'local-resources', 'dynamodb.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'relational-databases.d.ts')] }),
  generalPage({ route: 'local-development/debugging-lambda-functions', title: 'Debugging Lambda Functions', order: 3, kind: 'local-development', description: 'Debug Lambda functions in dev mode.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'debug-logs', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'dev', 'index.ts')] }),
  generalPage({ route: 'local-development/debugging-containers', title: 'Debugging Containers', order: 4, kind: 'local-development', description: 'Debug container workloads and sessions.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'debug-container-exec', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'container-session', 'index.ts')] }),
  generalPage({ route: 'local-development/dev-mode-with-ai', title: 'Dev Mode with AI', order: 5, kind: 'local-development', description: 'Use dev mode with agent workflows.', sourceFiles: [join(docsRoot, '_curated-docs', 'getting-started', 'using-with-ai.mdx'), join(stacktapeRoot, 'src', 'commands', 'dev', 'agent-server.ts')] }),
  generalPage({ route: 'local-development/debug-commands-reference', title: 'Debug Commands Reference', order: 6, kind: 'local-development', description: 'Reference for debugging commands.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'debug-logs', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'debug-metrics', 'index.ts')] }),

  generalPage({ route: 'stacktape-console/console-overview', title: 'Console Overview', order: 1, kind: 'console', template: 'console', description: 'Overview of Stacktape Console.', sourceFiles: [join(consoleRoot, 'src', 'components', 'Navigation', 'Navigation.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/connecting-your-aws-account', title: 'Connecting Your AWS Account', order: 2, kind: 'console', template: 'console', description: 'Connect AWS accounts to Stacktape.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'AwsAccountsPage', 'AwsAccountsPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/organizations-projects-and-stages', title: 'Organizations, Projects, and Stages', order: 3, kind: 'console', template: 'console', description: 'How the Console organizes work.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'ProjectsList.tsx'), join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'ProjectOverview', 'ProjectOverview.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/visual-config-editor', title: 'Visual Config Editor', order: 4, kind: 'console', template: 'console', description: 'Use the Monaco-based config editor.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ConfigEditorPage', 'ConfigEditorPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/ai-config-generation', title: 'AI Config Generation', order: 5, kind: 'console', template: 'console', description: 'Generate Stacktape configs from repositories.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'CreateNewStagePage', 'CreateNewStagePage.tsx'), join(consoleRoot, 'src', 'pages', 'ConfigEditorPage', 'ConfigEditorPage.tsx')] }),
  generalPage({ route: 'stacktape-console/api-keys', title: 'API Keys', order: 6, kind: 'console', template: 'console', description: 'Manage Stacktape API keys.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ApiKeysPage', 'ApiKeysPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/team-and-access-control', title: 'Team and Access Control', order: 7, kind: 'console', template: 'console', description: 'Invite users and manage permissions.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'UsersPage', 'UsersPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/billing-and-subscription', title: 'Billing and Subscription', order: 8, kind: 'console', template: 'console', description: 'Subscription plans, billing, and invoices.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'BillingPage', 'BillingPage.tsx'), join(consoleRoot, 'src', 'pages', 'SubscriptionPlansPage', 'SubscriptionPlansPage.tsx')] }),

  generalPage({ route: 'ci-cd-and-gitops/overview', title: 'CI/CD and GitOps Overview', order: 1, kind: 'cicd', description: 'Overview of deployment automation options.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'GitOps', 'GitOps.tsx'), join(stacktapeRoot, 'src', 'commands', 'codebuild-deploy', 'index.ts')] }),
  generalPage({ route: 'ci-cd-and-gitops/gitops-with-console', title: 'GitOps with Console', order: 2, kind: 'cicd', description: 'Auto-deploy on push and PR workflows.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'GitOps', 'GitOps.tsx'), join(consoleRoot, 'server', 'lambdas', 'github-app', 'index.ts')] }),
  generalPage({ route: 'ci-cd-and-gitops/build-runners', title: 'Build Runners', order: 3, kind: 'cicd', description: 'EC2 runners vs CodeBuild.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'ProjectOverview', 'RunnerConfigModal.tsx'), join(consoleRoot, 'src', 'pages', 'DeployNewProject', 'Git', 'DeployNewProjectFromGit.tsx')] }),
  generalPage({ route: 'ci-cd-and-gitops/self-hosted-github-actions-runners', title: 'Self-Hosted GitHub Actions Runners', order: 4, kind: 'cicd', description: 'Use Stacktape-managed GitHub Actions runners.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'ProjectOverview', 'GithubRunnerConfigModal.tsx'), join(consoleRoot, 'server', 'lambdas', 'github-app', 'github-actions-handler.ts')] }),
  generalPage({ route: 'ci-cd-and-gitops/custom-ci-cd', title: 'Custom CI/CD', order: 5, kind: 'cicd', description: 'Integrate Stacktape into your own pipelines.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'deploy', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'login', 'index.ts')] }),
  generalPage({ route: 'ci-cd-and-gitops/stacks-per-git-branch-pattern', title: 'Stacks per Git Branch Pattern', order: 6, kind: 'cicd', description: 'Map branches and PRs to stages.', sourceFiles: [join(consoleRoot, 'server', 'lambdas', 'github-app', 'utils.ts'), join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'GitOps', 'GitOps.tsx')] }),

  generalPage({ route: 'monitoring-and-observability/overview', title: 'Monitoring and Observability Overview', order: 1, kind: 'monitoring', description: 'Overview of logs, metrics, issues, alarms, and notifications.', sourceFiles: [join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'monitoring-and-observability/logs', title: 'Logs', order: 2, kind: 'monitoring', description: 'View logs and live tail.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'StageDetails', 'Logs', 'LogsView.tsx'), join(stacktapeRoot, 'src', 'commands', 'debug-logs', 'index.ts')] }),
  generalPage({ route: 'monitoring-and-observability/metrics', title: 'Metrics', order: 3, kind: 'monitoring', description: 'View CloudWatch metrics.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'StageDetails', 'Metrics', 'CombinedMetricsGrid.tsx'), join(stacktapeRoot, 'src', 'commands', 'debug-metrics', 'index.ts')] }),
  generalPage({ route: 'monitoring-and-observability/alarms', title: 'Alarms', order: 4, kind: 'monitoring', description: 'Create and use alarm rules.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'AlarmsPage', 'AlarmsRulesPage.tsx'), join(stacktapeRoot, 'types', 'stacktape-config', 'alarms.d.ts')] }),
  generalPage({ route: 'monitoring-and-observability/issues', title: 'Issues', order: 5, kind: 'monitoring', description: 'Track and resolve runtime issues.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'IssuesPage', 'IssuesPage.tsx'), join(stacktapeRoot, 'src', 'commands', 'issues-list', 'index.ts')] }),
  generalPage({ route: 'monitoring-and-observability/alert-channels', title: 'Alert Channels', order: 6, kind: 'monitoring', description: 'Configure Slack, Teams, Email, Discord, and Webhook targets.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'AlertChannels', 'Index.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'monitoring-and-observability/notifications', title: 'Notifications', order: 7, kind: 'monitoring', description: 'Send alerts for deployment and org events.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'Notifications', 'NotificationsPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'monitoring-and-observability/alert-history', title: 'Alert History', order: 8, kind: 'monitoring', description: 'Unified history of alerts.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'AlertHistoryPage', 'AlertHistoryPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'monitoring-and-observability/log-forwarding', title: 'Log Forwarding', order: 9, kind: 'monitoring', description: 'Forward logs to external services.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'log-forwarding.d.ts')] }),

  generalPage({ route: 'cost-management/cost-dashboards', title: 'Cost Dashboards', order: 1, kind: 'cost', description: 'Understand AWS spend in Stacktape Console.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'OverviewPage', 'OverviewPage.tsx'), join(consoleRoot, 'src', 'pages', 'CostsAndUsagePage', 'CostsAndUsagePage.tsx')] }),
  generalPage({ route: 'cost-management/budgets', title: 'Budgets', order: 2, kind: 'cost', description: 'Set up budget alerts.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'BudgetsPage', 'BudgetsPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'cost-management/cost-per-project-stage-and-resource', title: 'Cost per Project, Stage, and Resource', order: 3, kind: 'cost', description: 'Break down cost attribution.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'CostsAndUsagePage', 'CostsAndUsagePage.tsx'), join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'StageDetails', 'Costs.tsx')] }),
  generalPage({ route: 'cost-management/cost-optimization-tips', title: 'Cost Optimization Tips', order: 4, kind: 'cost', description: 'Practical ways to reduce cost.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'web-services.d.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'batch-jobs.d.ts')] }),

  generalPage({ route: 'governance/guardrails-overview', title: 'Guardrails Overview', order: 1, kind: 'governance', description: 'Overview of organization-wide guardrails.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'GuardrailsPage', 'GuardrailsPage.tsx'), join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts')] }),
  generalPage({ route: 'governance/deployment-guardrails', title: 'Deployment Guardrails', order: 2, kind: 'governance', description: 'Restrict stages, regions, and commands.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts')] }),
  generalPage({ route: 'governance/security-and-data-protection-guardrails', title: 'Security and Data Protection Guardrails', order: 3, kind: 'governance', description: 'Require secure defaults.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts')] }),
  generalPage({ route: 'governance/resource-limit-guardrails', title: 'Resource Limit Guardrails', order: 4, kind: 'governance', description: 'Limit function and container sizes.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts')] }),
  generalPage({ route: 'governance/database-guardrails', title: 'Database Guardrails', order: 5, kind: 'governance', description: 'Restrict database engines and shapes.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts')] }),

  generalPage({ route: 'using-with-ai/overview', title: 'Using Stacktape with AI', order: 1, kind: 'ai', description: 'Overview of AI-related workflows.', sourceFiles: [join(docsRoot, '_curated-docs', 'getting-started', 'using-with-ai.mdx'), join(stacktapeRoot, 'src', 'commands', 'mcp', 'index.ts')] }),
  generalPage({ route: 'using-with-ai/mcp-server-setup', title: 'MCP Server Setup', order: 2, kind: 'ai', description: 'Set up the Stacktape MCP server.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'mcp', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'mcp-add', 'index.ts')] }),
  generalPage({ route: 'using-with-ai/agent-mode-in-dev', title: 'Agent Mode in Dev', order: 3, kind: 'ai', description: 'Use dev mode with agents and coding assistants.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'dev', 'agent-server.ts'), join(docsRoot, '_curated-docs', 'getting-started', 'using-with-ai.mdx')] }),
  generalPage({ route: 'using-with-ai/config-generation-from-repository', title: 'Config Generation from Repository', order: 4, kind: 'ai', description: 'Generate a Stacktape config from a repository.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ConfigEditorPage', 'ConfigEditorPage.tsx')] }),
  generalPage({ route: 'using-with-ai/ai-coding-assistant-integrations', title: 'AI Coding Assistant Integrations', order: 5, kind: 'ai', description: 'Use Stacktape with coding assistants.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'mcp-add', 'index.ts'), join(consoleRoot, 'server', 'lambdas', 'mcp-server', 'index.ts')] }),

  generalPage({ route: 'recipes/rest-api-database', title: 'REST API + Database', order: 1, kind: 'recipe', template: 'recipe', description: 'Build a REST API with a database.', sourceFiles: [join(docsRoot, '_curated-docs', 'recipes', 'rest-api-with-database.mdx')] }),
  generalPage({ route: 'recipes/graphql-api', title: 'GraphQL API', order: 2, kind: 'recipe', template: 'recipe', description: 'Build a GraphQL API.', sourceFiles: [join(docsRoot, '_curated-docs', 'recipes', 'graphql-api.mdx')] }),
  generalPage({ route: 'recipes/nextjs-full-stack-app', title: 'Next.js Full-Stack App', order: 3, kind: 'recipe', template: 'recipe', description: 'Build a full-stack Next.js app.', sourceFiles: [join(docsRoot, '_curated-docs', 'recipes', 'nextjs-full-stack.mdx')] }),
  generalPage({ route: 'recipes/background-job-processing', title: 'Background Job Processing', order: 4, kind: 'recipe', template: 'recipe', description: 'Run asynchronous jobs.', sourceFiles: [join(docsRoot, '_curated-docs', 'recipes', 'background-jobs.mdx')] }),
  generalPage({ route: 'recipes/scheduled-tasks', title: 'Scheduled Tasks', order: 5, kind: 'recipe', template: 'recipe', description: 'Run cron-like tasks.', sourceFiles: [join(docsRoot, '_curated-docs', 'recipes', 'scheduled-tasks.mdx')] }),
  generalPage({ route: 'recipes/static-website', title: 'Static Website', order: 6, kind: 'recipe', template: 'recipe', description: 'Host a static website.', sourceFiles: [join(docsRoot, '_curated-docs', 'recipes', 'static-website.mdx')] }),
  generalPage({ route: 'recipes/monorepo-setup', title: 'Monorepo Setup', order: 7, kind: 'recipe', template: 'recipe', description: 'Set up Stacktape in a monorepo.', sourceFiles: [join(docsRoot, '_curated-docs', 'recipes', 'monorepo-setup.mdx')] }),
  generalPage({ route: 'recipes/database-migrations', title: 'Database Migrations', order: 8, kind: 'recipe', template: 'recipe', description: 'Run migrations safely.', sourceFiles: [join(docsRoot, '_curated-docs', 'recipes', 'database-migrations.mdx')] }),
  generalPage({ route: 'recipes/multi-tenant-setup', title: 'Multi-Tenant Setup', order: 9, kind: 'recipe', template: 'recipe', description: 'Model a multi-tenant app with Stacktape.', sourceFiles: [join(stacktapeRoot, 'README.md')], notes: ['There is no curated recipe yet. Ground this page carefully in supported features.'] }),
  generalPage({ route: 'recipes/pr-preview-environments', title: 'PR Preview Environments', order: 10, kind: 'recipe', template: 'recipe', description: 'Use pull requests to create preview stages.', sourceFiles: [join(consoleRoot, 'server', 'lambdas', 'github-app', 'index.ts'), join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'GitOps', 'GitOps.tsx')] }),

  generalPage({ route: 'troubleshooting/common-deployment-errors', title: 'Common Deployment Errors', order: 1, kind: 'troubleshooting', description: 'Diagnose common deployment failures.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'deploy', 'index.ts'), join(stacktapeRoot, 'src', 'config', 'error-messages.ts')] }),
  generalPage({ route: 'troubleshooting/cloudformation-stack-states', title: 'CloudFormation Stack States', order: 2, kind: 'troubleshooting', description: 'Understand CloudFormation stack states.', sourceFiles: [join(docsRoot, '_curated-docs', 'troubleshooting', 'cloudformation-stack-states.mdx')] }),
  generalPage({ route: 'troubleshooting/dev-mode-issues', title: 'Dev Mode Issues', order: 3, kind: 'troubleshooting', description: 'Debug dev mode issues.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'dev', 'index.ts')] }),
  generalPage({ route: 'troubleshooting/permission-errors', title: 'Permission Errors', order: 4, kind: 'troubleshooting', description: 'Diagnose permission and AWS auth problems.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', '_utils', 'permission-guards.ts'), join(stacktapeRoot, 'src', 'commands', 'login', 'index.ts')] }),
  generalPage({ route: 'troubleshooting/getting-help', title: 'Getting Help', order: 5, kind: 'troubleshooting', description: 'Where to get help.', sourceFiles: [join(stacktapeRoot, 'README.md'), join(consoleRoot, 'src', 'components', 'Header', 'HelpMenu.tsx')] }),

  generalPage({ route: 'reference/configuration-schema', title: 'Configuration Schema', order: 1, kind: 'reference', description: 'Reference entry point for Stacktape config schema.', sourceFiles: [join(stacktapeRoot, '@generated', 'schemas', 'config-schema.json'), join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts')] }),
  generalPage({ route: 'reference/directives-reference', title: 'Directives Reference', order: 2, kind: 'reference', description: 'Reference for built-in directives.', sourceFiles: [join(stacktapeRoot, 'src', 'domain', 'config-manager', 'built-in-directives.ts')] }),
  generalPage({ route: 'reference/referenceable-parameters', title: 'Referenceable Parameters', order: 3, kind: 'reference', description: 'Parameters available via $ResourceParam.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '__helpers.d.ts')] }),
  generalPage({ route: 'reference/environment-variables-injected-by-connectto', title: 'Environment Variables Injected by connectTo', order: 4, kind: 'reference', description: 'Environment variables created by connectTo.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '__helpers.d.ts')] }),
  generalPage({ route: 'reference/aws-permissions-needed', title: 'AWS Permissions Needed', order: 5, kind: 'reference', description: 'What AWS permissions Stacktape requires.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'AwsAccountsPage', 'AwsAccountsPage.tsx'), join(stacktapeRoot, 'README.md')] }),

  ...cliCommands.map((command, index) => cliPage({ command, order: index + 10 }))
];

export const getPageByRoute = (route: string) => pageDefinitions.find((page) => page.route === route || page.outputPath.endsWith(`${route}.mdx`));
