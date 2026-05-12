import { join } from 'node:path';
import { createRequire } from 'node:module';
import type { PageDefinition } from './types';

const require = createRequire(import.meta.url);
const { cliCommands } = require('../../../src/config/cli/commands.ts') as { cliCommands: string[] };

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
    resourceType?: string;
    description: string;
  }
> = {
  'lambda-function': { title: 'Lambda Function', category: 'compute', fileName: 'functions.d.ts', typeName: 'LambdaFunctionProps', resourceType: 'function', description: 'Serverless event-driven compute.' },
  'web-service': { title: 'Web Service', category: 'compute', fileName: 'web-services.d.ts', typeName: 'WebServiceProps', resourceType: 'web-service', description: 'Always-on container with a public HTTPS URL.' },
  'private-service': { title: 'Private Service', category: 'compute', fileName: 'private-services.d.ts', typeName: 'PrivateServiceProps', resourceType: 'private-service', description: 'Always-on container reachable only inside your stack or VPC.' },
  'worker-service': { title: 'Worker Service', category: 'compute', fileName: 'worker-services.d.ts', typeName: 'WorkerServiceProps', resourceType: 'worker-service', description: 'Always-on background worker without a public endpoint.' },
  'multi-container-workload': { title: 'Multi-Container Workload', category: 'compute', fileName: 'multi-container-workloads.d.ts', typeName: 'ContainerWorkloadProps', resourceType: 'multi-container-workload', description: 'Run multiple containers together.' },
  'batch-job': { title: 'Batch Job', category: 'compute', fileName: 'batch-jobs.d.ts', typeName: 'BatchJobProps', resourceType: 'batch-job', description: 'Run compute-heavy or long-running jobs to completion.' },
  'edge-function': { title: 'Edge Function', category: 'compute', fileName: 'edge-lambda-functions.d.ts', typeName: 'EdgeLambdaFunctionProps', resourceType: 'edge-lambda-function', description: 'Run Lambda code at CloudFront edge locations.' },
  'static-hosting': { title: 'Static Hosting', category: 'frontend', fileName: 'hosting-buckets.d.ts', typeName: 'HostingBucketProps', resourceType: 'hosting-bucket', description: 'Static sites on S3 and CloudFront.' },
  nextjs: { title: 'Next.js', category: 'frontend', fileName: 'nextjs-web.d.ts', typeName: 'NextjsWebProps', resourceType: 'nextjs-web', description: 'Deploy a Next.js app on AWS.' },
  astro: { title: 'Astro', category: 'frontend', fileName: 'astro-web.d.ts', typeName: 'AstroWebProps', description: 'Deploy an Astro SSR app on AWS.' },
  nuxt: { title: 'Nuxt', category: 'frontend', fileName: 'nuxt-web.d.ts', typeName: 'NuxtWebProps', description: 'Deploy a Nuxt SSR app on AWS.' },
  sveltekit: { title: 'SvelteKit', category: 'frontend', fileName: 'sveltekit-web.d.ts', typeName: 'SvelteKitWebProps', description: 'Deploy a SvelteKit app on AWS.' },
  solidstart: { title: 'SolidStart', category: 'frontend', fileName: 'solidstart-web.d.ts', typeName: 'SolidStartWebProps', description: 'Deploy a SolidStart app on AWS.' },
  tanstack: { title: 'TanStack Start', category: 'frontend', fileName: 'tanstack-web.d.ts', typeName: 'TanStackWebProps', description: 'Deploy a TanStack Start app on AWS.' },
  remix: { title: 'Remix', category: 'frontend', fileName: 'remix-web.d.ts', typeName: 'RemixWebProps', description: 'Deploy a Remix app on AWS.' },
  'relational-database': { title: 'Relational Database', category: 'databases', fileName: 'relational-databases.d.ts', typeName: 'RelationalDatabaseProps', resourceType: 'relational-database', description: 'Managed SQL databases on AWS.' },
  dynamodb: { title: 'DynamoDB', category: 'databases', fileName: 'dynamo-db-tables.d.ts', typeName: 'DynamoDbTableProps', resourceType: 'dynamo-db-table', description: 'Serverless key-value and document database.' },
  redis: { title: 'Redis', category: 'databases', fileName: 'redis-cluster.d.ts', typeName: 'RedisClusterProps', resourceType: 'redis-cluster', description: 'Managed Redis for caching, sessions, and queues.' },
  mongodb: { title: 'MongoDB Atlas', category: 'databases', fileName: 'mongo-db-atlas-clusters.d.ts', typeName: 'MongoDbAtlasClusterProps', resourceType: 'mongo-db-atlas-cluster', description: 'Provision MongoDB Atlas clusters from Stacktape.' },
  upstash: { title: 'Upstash Redis', category: 'databases', fileName: 'upstash-redis.d.ts', typeName: 'UpstashRedisProps', resourceType: 'upstash-redis', description: 'Serverless Redis by Upstash.' },
  opensearch: { title: 'OpenSearch', category: 'databases', fileName: 'open-search.d.ts', typeName: 'OpenSearchDomainProps', resourceType: 'open-search-domain', description: 'Managed OpenSearch for search and analytics.' },
  bucket: { title: 'S3 Bucket', category: 'storage', fileName: 'buckets.d.ts', typeName: 'BucketProps', resourceType: 'bucket', description: 'S3 object storage.' },
  efs: { title: 'EFS Filesystem', category: 'storage', fileName: 'efs-filesystem.d.ts', typeName: 'EfsFilesystemProps', description: 'Elastic shared file storage.' },
  'http-api-gateway': { title: 'HTTP API Gateway', category: 'networking', fileName: 'http-api-gateways.d.ts', typeName: 'HttpApiGatewayProps', resourceType: 'http-api-gateway', description: 'Serverless HTTP APIs on AWS API Gateway.' },
  alb: { title: 'Application Load Balancer', category: 'networking', fileName: 'application-load-balancers.d.ts', typeName: 'ApplicationLoadBalancerProps', resourceType: 'application-load-balancer', description: 'HTTP/HTTPS load balancing.' },
  nlb: { title: 'Network Load Balancer', category: 'networking', fileName: 'network-load-balancer.d.ts', typeName: 'NetworkLoadBalancerProps', resourceType: 'network-load-balancer', description: 'TCP/TLS load balancing.' },
  cdn: { title: 'CDN', category: 'networking', fileName: 'cdn.d.ts', typeName: 'CdnConfiguration', description: 'CloudFront-based content delivery and edge routing.' },
  'custom-domains': { title: 'Custom Domains', category: 'networking', fileName: '__helpers.d.ts', typeName: 'DomainConfiguration', description: 'Attach your own domains to Stacktape resources.' },
  'event-bus': { title: 'Event Bus', category: 'messaging', fileName: 'event-buses.d.ts', typeName: 'EventBusProps', resourceType: 'event-bus', description: 'EventBridge event buses.' },
  'sqs-queue': { title: 'SQS Queue', category: 'messaging', fileName: 'sqs-queues.d.ts', typeName: 'SqsQueueProps', resourceType: 'sqs-queue', description: 'Serverless message queues.' },
  'sns-topic': { title: 'SNS Topic', category: 'messaging', fileName: 'sns-topic.d.ts', typeName: 'SnsTopicProps', resourceType: 'sns-topic', description: 'Pub/sub fanout via SNS.' },
  'kinesis-stream': { title: 'Kinesis Stream', category: 'messaging', fileName: 'kinesis-streams.d.ts', typeName: 'KinesisStreamProps', description: 'Real-time data streams.' },
  'state-machine': { title: 'State Machine', category: 'orchestration', fileName: 'state-machines.d.ts', typeName: 'StateMachineProps', resourceType: 'state-machine', description: 'Step Functions workflows.' },
  'user-auth-pool': { title: 'User Authentication Pool', category: 'security', fileName: 'user-pools.d.ts', typeName: 'UserAuthPoolProps', resourceType: 'user-auth-pool', description: 'Cognito-based authentication.' },
  waf: { title: 'Web Application Firewall', category: 'security', fileName: 'web-app-firewall.d.ts', typeName: 'WebAppFirewallProps', resourceType: 'web-app-firewall', description: 'AWS WAF for APIs, ALBs, CDNs, and auth.' },
  bastion: { title: 'Bastion Host', category: 'security', fileName: 'bastion.d.ts', typeName: 'BastionProps', resourceType: 'bastion', description: 'Secure access to private resources.' },
  'custom-resources': { title: 'Custom Resources', category: 'advanced', fileName: 'custom-resources.d.ts', typeName: 'CustomResourceDefinitionProps', resourceType: 'custom-resource-definition', description: 'Lambda-backed provisioning logic.' },
  'deployment-scripts': { title: 'Deployment Scripts', category: 'advanced', fileName: 'deployment-script.d.ts', typeName: 'DeploymentScriptProps', resourceType: 'deployment-script', description: 'Run scripts during deploy or delete.' },
  'aws-cdk-constructs': { title: 'AWS CDK Constructs', category: 'advanced', fileName: 'aws-cdk-construct.d.ts', typeName: 'AwsCdkConstructProps', resourceType: 'aws-cdk-construct', description: 'Embed CDK constructs in Stacktape.' },
  'raw-cloudformation': { title: 'Raw CloudFormation Resources', category: 'advanced', fileName: '_root.d.ts', typeName: 'ConfigRoot', description: 'Use raw CloudFormation as an escape hatch.' }
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
    outputPath: join(docsRoot, 'docs', `${route}.mdx`),
    order,
    kind: 'resource',
    template: 'resource',
    category: info.category,
    shortDescription: description || info.description,
    sourceFiles: [
      join(stacktapeRoot, 'types', 'stacktape-config', info.fileName),
      ...sharedTypeFiles,
      ...extraSourceFiles
    ].filter((filePath, index, allFiles) => allFiles.indexOf(filePath) === index),
    typeName: info.typeName,
    referenceableResourceType: info.resourceType
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
    outputPath: join(docsRoot, 'docs', `${route}.mdx`),
    order,
    kind: 'choosing',
    template: 'choosing',
    category,
    shortDescription: description,
    sourceFiles,
    notes: ['This is a comparison and decision-support page, not a deep API reference page. Include all resources in this category.']
  };
};

type GeneralPageInput = {
  route: string;
  title: string;
  order: number;
  kind: PageDefinition['kind'];
  template?: PageDefinition['template'];
  category?: string;
  description: string;
  sourceFiles?: string[];
  sourceGlobs?: string[];
  notes?: string[];
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
}: GeneralPageInput): PageDefinition => ({
  id: route.replaceAll('/', '__'),
  title,
  route,
  outputPath: join(docsRoot, 'docs', `${route}.mdx`),
  order,
  kind,
  template,
  category: route.split('/')[0] || 'root',
  shortDescription: description,
  sourceFiles,
  sourceGlobs,
  notes
});

const commandSourceFileOverrides: Record<string, string> = {
  'projects:list': 'info-projects'
};

const cliPage = ({ command, order }: { command: string; order: number }): PageDefinition => ({
  id: `cli__${command.replaceAll(':', '__')}`,
  title: command,
  route: `cli/${command.replaceAll(':', '-')}`,
  outputPath: join(docsRoot, 'docs', 'cli', `${command.replaceAll(':', '-')}.mdx`),
  order,
  kind: 'cli',
  template: 'cli',
  category: 'cli',
  shortDescription: `CLI reference page for \`${command}\`.`,
  cliCommand: command,
  sourceFiles: [
    join(stacktapeRoot, 'src', 'config', 'cli', 'commands.ts'),
    join(stacktapeRoot, 'src', 'config', 'cli', 'utils.ts'),
    join(stacktapeRoot, 'src', 'commands', commandSourceFileOverrides[command] || `${command.replaceAll(':', '-')}`, 'index.ts')
  ],
  notes: ['This page should document exactly one command.']
});

// Convenience source bundles, used in multiple Getting Started pages.
const consoleNav = [
  join(consoleRoot, 'src', 'components', 'Navigation', 'Navigation.tsx'),
  join(consoleRoot, 'src', 'Explanations.tsx')
];
const cliDeploy = [join(stacktapeRoot, 'src', 'commands', 'deploy', 'index.ts')];
const cliInit = [join(stacktapeRoot, 'src', 'commands', 'init', 'index.ts')];
const cliLogin = [join(stacktapeRoot, 'src', 'commands', 'login', 'index.ts')];
const cliDev = [join(stacktapeRoot, 'src', 'commands', 'dev', 'index.ts')];

// The raw page definitions, ordered by IA section. Each section's pages restart their `order` field
// at 1 — that's fine for human readability of this file, but the navigation needs a monotonic global
// order so virtual subcategory nodes (e.g. Resources → Compute) can be sorted relative to peers.
// We post-process below to overwrite `order` with the array index.
const rawPageDefinitions: PageDefinition[] = [
  // 0. Introduction
  generalPage({
    route: 'index',
    title: 'Introduction',
    order: 0,
    kind: 'introduction',
    description: 'Top-level introduction to Stacktape.',
    sourceFiles: [join(stacktapeRoot, 'README.md'), join(consoleRoot, 'AGENTS_ABOUT_STACKTAPE.md')],
    notes: ['Single positioning page that sets up Getting Started. Explains what Stacktape is, who it\'s for, and the value vs raw AWS / IaC / PaaS. Under ~400 words. Ends with a "next →" link to /getting-started/configure-your-stack.']
  }),

  // 1. Getting started
  // Linear, hands-on. The reader is already sold on Stacktape — this section gets them building.
  // Every page ends with a "next →" link to the next step. Each step also showcases the relevant
  // best parts of Stacktape contextually (visual editor, dev mode, console, GitOps).
  generalPage({
    route: 'getting-started/configure-your-stack',
    title: 'Configure Your Stack',
    order: 1,
    kind: 'getting-started',
    description: 'Write your stacktape.ts. Pick a starter, generate config from a repo, or use the visual editor.',
    sourceFiles: [
      join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts'),
      join(stacktapeRoot, 'types', 'stacktape-config', '__helpers.d.ts'),
      join(docsRoot, '_curated-docs', 'concepts', 'typescript-config.mdx'),
      join(consoleRoot, 'src', 'pages', 'ConfigEditorPage', 'ConfigEditorPage.tsx'),
      join(consoleRoot, 'src', 'pages', 'DeployNewProject', 'StarterProject', 'StarterProjectSelect.tsx'),
      join(consoleRoot, 'src', 'pages', 'DeployNewProject', 'Git', 'DeployNewProjectFromGit.tsx')
    ],
    notes: [
      'Step 1 of Getting Started. Hands-on. Show three paths: (a) `stacktape init` to bootstrap from a starter, (b) the Console\'s AI config generation from a Git repo, (c) the visual config editor with IntelliSense and live price estimation.',
      'Lead with TypeScript class-based config (defineConfig + class resources). Show a concrete ~20-line example.',
      'Briefly mention the visual editor + AI config generation as alternatives — link to the Console pages, do not deep-dive here.',
      'End with "next → Use the dev mode".'
    ]
  }),
  generalPage({
    route: 'getting-started/use-the-dev-mode',
    title: 'Use the Dev Mode',
    order: 2,
    kind: 'getting-started',
    description: 'Run `stacktape dev` once, then iterate locally without redeploys. The wow moment.',
    sourceFiles: [
      ...cliDev,
      join(stacktapeRoot, 'src', 'commands', 'dev', 'agent-server.ts'),
      join(docsRoot, '_curated-docs', 'getting-started', 'dev-mode.mdx')
    ],
    notes: [
      'Step 2 of Getting Started. The wow moment. Show how `stacktape dev` runs Lambda + container code locally with live AWS resources, no redeploy needed.',
      'Concretely: code change → save → see the result. Mention which resources can run locally and which proxy to AWS.',
      'Touch on debugging (debug-logs, debug-metrics) only briefly — link to /local-development for depth.',
      'End with "next → Deploy your first stage".'
    ]
  }),
  generalPage({
    route: 'getting-started/deploy-your-first-stage',
    title: 'Deploy Your First Stage',
    order: 3,
    kind: 'getting-started',
    description: 'Login, connect AWS, run `stacktape deploy`. Watch a real stack come up in your AWS account.',
    sourceFiles: [
      ...cliInit,
      ...cliLogin,
      ...cliDeploy,
      join(consoleRoot, 'src', 'pages', 'AwsAccountsPage', 'AwsAccountsPage.tsx')
    ],
    notes: [
      'Step 3 of Getting Started. Hands-on. Show CLI login, AWS account connection, `stacktape deploy --stage <name> --region <region>`.',
      'Document what gets created on AWS at deploy time (CloudFormation stack, resources, deployment artifacts).',
      'Show both CLI and Console deploy paths — link to /stacktape-console/connecting-your-aws-account for the Console-side AWS setup.',
      'End with "next → Manage your app in the Console".'
    ]
  }),
  generalPage({
    route: 'getting-started/using-console-ui',
    title: 'Using Console UI',
    order: 4,
    kind: 'getting-started',
    description: 'After deploying, the Console gives you logs, metrics, alarms, issues, secrets, and cost — for free.',
    sourceFiles: [
      ...consoleNav,
      join(consoleRoot, 'src', 'pages', 'OverviewPage', 'OverviewPage.tsx'),
      join(consoleRoot, 'src', 'pages', 'IssuesPage', 'IssuesPage.tsx'),
      join(consoleRoot, 'src', 'pages', 'AlarmsPage', 'AlarmsRulesPage.tsx'),
      join(consoleRoot, 'src', 'pages', 'CostsAndUsagePage', 'CostsAndUsagePage.tsx'),
      join(consoleRoot, 'src', 'pages', 'SecretsPage', 'SecretsPage.tsx')
    ],
    notes: [
      'Step 4 of Getting Started. Walk the reader through the Console after deploying. Sell the "you got all of this for free" angle.',
      'Cover: project/stage overview, logs (live tail), metrics, alarms, issues (auto error tracking), cost dashboards, secrets management.',
      'Each subsection should be 2-3 sentences and link to /operations/<page> for the deep dive.',
      'End with "next → CI/CD".'
    ]
  }),
  generalPage({
    route: 'getting-started/ci-cd',
    title: 'CI/CD',
    order: 5,
    kind: 'getting-started',
    description: 'Wire up auto-deploy on push and PR previews via GitOps. Or integrate with your own CI.',
    sourceFiles: [
      join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'GitOps', 'GitOps.tsx'),
      join(consoleRoot, 'server', 'lambdas', 'github-app', 'index.ts'),
      join(stacktapeRoot, 'src', 'commands', 'codebuild-deploy', 'index.ts'),
      ...cliDeploy
    ],
    notes: [
      'Step 5 of Getting Started. Set up automated deploys.',
      'Show two paths: (a) GitOps via Console (push-to-deploy, PR preview environments) — the recommended path; (b) custom CI integration (GitHub Actions, CircleCI, etc.) using the CLI.',
      'Brief — link to /ci-cd-and-gitops/* for depth.',
      'End with "next → Going to production".'
    ]
  }),
  generalPage({
    route: 'getting-started/going-to-production',
    title: 'Going to Production',
    order: 6,
    kind: 'getting-started',
    description: 'Production-readiness checklist: alarms, budgets, custom domains, multi-region, gradual deployments, guardrails.',
    sourceFiles: [
      join(stacktapeRoot, 'types', 'stacktape-config', 'alarms.d.ts'),
      join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts'),
      join(consoleRoot, 'src', 'pages', 'BudgetsPage', 'BudgetsPage.tsx'),
      join(stacktapeRoot, 'types', 'stacktape-config', 'web-services.d.ts'),
      join(stacktapeRoot, 'types', 'stacktape-config', 'functions.d.ts')
    ],
    notes: [
      'Step 6 of Getting Started (final). The production checklist.',
      'Cover: alarms, budgets, custom domains, multi-region, gradual deployments (canary/linear), guardrails. Brief — each item gets 2-4 sentences and a link to its full page.',
      'End with branching cards: "Build with Recipes", "Customize Resources", "Operations deep-dive".'
    ]
  }),

  // 2. Configuration
  generalPage({ route: 'configuration/configuration-files', title: 'Configuration Files', order: 1, kind: 'concept', description: 'YAML vs TypeScript configuration.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts'), join(docsRoot, '_curated-docs', 'concepts', 'yaml-config.mdx'), join(docsRoot, '_curated-docs', 'concepts', 'typescript-config.mdx')] }),
  generalPage({ route: 'configuration/resources', title: 'Resources', order: 2, kind: 'concept', description: 'Explain Stacktape resources and how they map to AWS.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '__helpers.d.ts')] }),
  generalPage({ route: 'configuration/stages-and-environments', title: 'Stages and Environments', order: 3, kind: 'concept', description: 'Explain stage-based deployments.', sourceFiles: [join(docsRoot, '_curated-docs', 'concepts', 'stages-and-environments.mdx'), ...cliDeploy] }),
  generalPage({ route: 'configuration/connecting-resources', title: 'Connecting Resources', order: 4, kind: 'concept', description: 'Explain connectTo.', sourceFiles: [join(docsRoot, '_curated-docs', 'concepts', 'connecting-resources.mdx'), join(stacktapeRoot, 'types', 'stacktape-config', '__helpers.d.ts')] }),
  generalPage({ route: 'configuration/directives', title: 'Directives', order: 5, kind: 'concept', description: 'Explain built-in and custom directives.', sourceFiles: [join(docsRoot, '_curated-docs', 'concepts', 'directives.mdx'), join(stacktapeRoot, 'src', 'domain', 'config-manager', 'built-in-directives.ts')] }),
  generalPage({ route: 'configuration/variables-and-reuse', title: 'Variables and Reuse', order: 6, kind: 'concept', description: 'Reuse values and reduce duplication.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts')] }),
  generalPage({ route: 'configuration/hooks-and-scripts', title: 'Hooks and Scripts', order: 7, kind: 'concept', description: 'Lifecycle hooks and scripts.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts'), join(stacktapeRoot, 'types', 'scripts.d.ts')] }),
  generalPage({ route: 'configuration/overrides-and-escape-hatches', title: 'Overrides and Escape Hatches', order: 8, kind: 'concept', description: 'Overrides, CDK, and raw CloudFormation.', sourceFiles: [join(docsRoot, '_curated-docs', 'concepts', 'overrides-and-transforms.mdx'), join(docsRoot, '_curated-docs', 'concepts', 'extending-cloudformation.mdx')] }),
  generalPage({ route: 'configuration/secrets', title: 'Secrets', order: 9, kind: 'concept', description: 'Manage secrets with the Stacktape Console and reference them in your config via $Secret().', sourceFiles: [join(consoleRoot, 'src', 'pages', 'SecretsPage', 'SecretsPage.tsx'), join(stacktapeRoot, 'src', 'domain', 'config-manager', 'built-in-directives.ts')], notes: ['Show how to create secrets in the Console, reference them via $Secret(name) in stacktape.ts, and inject them into Lambda/container env vars.'] }),

  // 2.x Triggers (sub-section of Configuration)
  generalPage({ route: 'configuration/triggers/overview', title: 'Triggers Overview', order: 10, kind: 'events', description: 'Overview of event sources and triggers.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'configuration/triggers/http-triggers', title: 'HTTP Triggers', order: 11, kind: 'events', description: 'HTTP integrations and triggers.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'configuration/triggers/schedule-triggers', title: 'Schedule Triggers', order: 12, kind: 'events', description: 'Cron and schedule-based execution.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'configuration/triggers/s3-events', title: 'S3 Events', order: 13, kind: 'events', description: 'Trigger on S3 object events.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'configuration/triggers/sqs-events', title: 'SQS Events', order: 14, kind: 'events', description: 'Trigger on SQS queue messages.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'configuration/triggers/sns-events', title: 'SNS Events', order: 15, kind: 'events', description: 'Trigger on SNS deliveries.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'configuration/triggers/dynamodb-streams', title: 'DynamoDB Streams', order: 16, kind: 'events', description: 'Trigger on DynamoDB changes.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'configuration/triggers/kinesis-events', title: 'Kinesis Events', order: 17, kind: 'events', description: 'Trigger on Kinesis streams.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'configuration/triggers/event-bus-events', title: 'Event Bus Events', order: 18, kind: 'events', description: 'Trigger on EventBridge events.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'configuration/triggers/cloudwatch-logs', title: 'CloudWatch Logs', order: 19, kind: 'events', description: 'Trigger on CloudWatch log events.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),
  generalPage({ route: 'configuration/triggers/alarms-as-triggers', title: 'Alarms as Triggers', order: 20, kind: 'events', description: 'Use alarms as event sources.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'alarms.d.ts')] }),
  generalPage({ route: 'configuration/triggers/kafka-topics', title: 'Kafka Topics', order: 21, kind: 'events', description: 'Trigger on Kafka topics.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'events.d.ts')] }),

  // 3. Resources catalogue
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

  // 4. Packaging
  // Hub overview + two sub-sections (function for Lambda, containers for ECS/Fargate).
  generalPage({ route: 'packaging/overview', title: 'Packaging Overview', order: 1, kind: 'packaging', description: 'How Stacktape builds and uploads your code. Decide between function packaging and container packaging.', sourceFiles: [join(stacktapeRoot, 'types', 'packaging.d.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')], notes: ['Hub page. Explain the split: Lambda packaging vs container packaging. Decision-oriented — when to pick each.'] }),

  // 4.1 packaging/function — Lambda packaging modes
  generalPage({ route: 'packaging/function/stacktape-buildpack', title: 'Stacktape Buildpack for Lambda', order: 2, kind: 'packaging', description: 'Zero-config Lambda packaging. Point to a source file; Stacktape bundles, uploads, and configures the function.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts'), join(stacktapeRoot, 'types', 'packaging.d.ts')] }),
  generalPage({ route: 'packaging/function/custom-artifact', title: 'Custom Artifact', order: 3, kind: 'packaging', description: 'Provide a pre-built Lambda zip. Stacktape uploads it as-is.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),
  generalPage({ route: 'packaging/function/language-specific-config', title: 'Language-Specific Config', order: 4, kind: 'packaging', description: 'Tune Node, Python, Java, Go, Ruby, PHP, and .NET packaging — runtime versions, bundling, and module format.', sourceFiles: [join(stacktapeRoot, 'types', 'packaging.d.ts')] }),

  // 4.2 packaging/containers — ECS/Fargate packaging modes
  generalPage({ route: 'packaging/containers/stacktape-buildpack', title: 'Stacktape Buildpack for Containers', order: 5, kind: 'packaging', description: 'Zero-config container image build. Stacktape produces an OCI image from your source.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts'), join(stacktapeRoot, 'types', 'packaging.d.ts')] }),
  generalPage({ route: 'packaging/containers/custom-dockerfile', title: 'Custom Dockerfile', order: 6, kind: 'packaging', description: 'Build a container image from your own Dockerfile.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),
  generalPage({ route: 'packaging/containers/prebuilt-image', title: 'Prebuilt Image', order: 7, kind: 'packaging', description: 'Reference an existing image from a registry — Stacktape skips the build step.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),
  generalPage({ route: 'packaging/containers/nixpacks', title: 'Nixpacks', order: 8, kind: 'packaging', description: 'Build a container image with Nixpacks.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),
  generalPage({ route: 'packaging/containers/external-buildpack', title: 'External Buildpack', order: 9, kind: 'packaging', description: 'Use an external Cloud Native Buildpack to build a container image.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-artifacts.d.ts')] }),

  // 6. Deploying & lifecycle
  generalPage({ route: 'deployment-and-lifecycle/deploying-stacks', title: 'Deploying Stacks', order: 1, kind: 'deployment', description: 'How deployment works in Stacktape.', sourceFiles: [join(docsRoot, '_curated-docs', 'getting-started', 'deployment.mdx'), ...cliDeploy] }),
  generalPage({ route: 'deployment-and-lifecycle/previewing-changes', title: 'Previewing Changes', order: 2, kind: 'deployment', description: 'Preview what a deployment would change.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'preview-changes', 'index.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/gradual-deployments', title: 'Gradual Deployments', order: 3, kind: 'deployment', description: 'Canary and linear deployment strategies.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'functions.d.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'web-services.d.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/rollbacks', title: 'Rollbacks', order: 4, kind: 'deployment', description: 'Rollback a deployment safely.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'rollback', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'cf-rollback', 'index.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/destroying-stacks', title: 'Destroying Stacks', order: 5, kind: 'deployment', description: 'Delete deployed stacks.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'delete', 'index.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/deployment-scripts-and-hooks', title: 'Deployment Scripts and Hooks', order: 6, kind: 'deployment', description: 'Automate work before and after deployments.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'deployment-script.d.ts')] }),
  generalPage({ route: 'deployment-and-lifecycle/multi-region-deployments', title: 'Multi-Region Deployments', order: 7, kind: 'deployment', description: 'Run stages in more than one region.', sourceFiles: cliDeploy }),
  generalPage({ route: 'deployment-and-lifecycle/deploy-time-parameters', title: 'Deploy-Time Parameters', order: 8, kind: 'deployment', description: 'Use runtime directives and CLI arguments at deploy time.', sourceFiles: [join(stacktapeRoot, 'src', 'domain', 'config-manager', 'built-in-directives.ts')] }),

  // 7. Operations (merged from monitoring-and-observability + cost-management + governance)
  generalPage({ route: 'operations/overview', title: 'Operations Overview', order: 1, kind: 'monitoring', description: 'Logs, metrics, alarms, issues, alert channels, costs, budgets, and guardrails — all in one place.', sourceFiles: [join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'operations/logs', title: 'Logs', order: 2, kind: 'monitoring', description: 'View logs and live tail.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'StageDetails', 'Logs', 'LogsView.tsx'), join(stacktapeRoot, 'src', 'commands', 'debug-logs', 'index.ts')] }),
  generalPage({ route: 'operations/metrics', title: 'Metrics', order: 3, kind: 'monitoring', description: 'View CloudWatch metrics.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'StageDetails', 'Metrics', 'CombinedMetricsGrid.tsx'), join(stacktapeRoot, 'src', 'commands', 'debug-metrics', 'index.ts')] }),
  generalPage({ route: 'operations/alarms', title: 'Alarms', order: 4, kind: 'monitoring', description: 'Create and use alarm rules.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'AlarmsPage', 'AlarmsRulesPage.tsx'), join(stacktapeRoot, 'types', 'stacktape-config', 'alarms.d.ts')] }),
  generalPage({ route: 'operations/issues', title: 'Issues', order: 5, kind: 'monitoring', description: 'Track and resolve runtime issues.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'IssuesPage', 'IssuesPage.tsx'), join(stacktapeRoot, 'src', 'commands', 'issues-list', 'index.ts')] }),
  generalPage({ route: 'operations/alert-channels', title: 'Alert Channels', order: 6, kind: 'monitoring', description: 'Configure Slack, Teams, Email, Discord, and Webhook targets.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'AlertChannels', 'AlertChannelsPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'operations/notifications', title: 'Notifications', order: 7, kind: 'monitoring', description: 'Send alerts for deployment and org events.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'Notifications', 'NotificationsPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'operations/alert-history', title: 'Alert History', order: 8, kind: 'monitoring', description: 'Unified history of alerts.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'AlertHistoryPage', 'AlertHistoryPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'operations/log-forwarding', title: 'Log Forwarding', order: 9, kind: 'monitoring', description: 'Forward logs to external services.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'log-forwarding.d.ts')] }),
  generalPage({ route: 'operations/cost-dashboards', title: 'Cost Dashboards', order: 10, kind: 'cost', description: 'Understand AWS spend in Stacktape Console.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'OverviewPage', 'OverviewPage.tsx'), join(consoleRoot, 'src', 'pages', 'CostsAndUsagePage', 'CostsAndUsagePage.tsx')] }),
  generalPage({ route: 'operations/budgets', title: 'Budgets', order: 11, kind: 'cost', description: 'Set up budget alerts.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'BudgetsPage', 'BudgetsPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'operations/cost-per-project-stage-and-resource', title: 'Cost per Project, Stage, and Resource', order: 12, kind: 'cost', description: 'Break down cost attribution.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'CostsAndUsagePage', 'CostsAndUsagePage.tsx'), join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'StageDetails', 'Costs.tsx')] }),
  generalPage({ route: 'operations/cost-optimization-tips', title: 'Cost Optimization Tips', order: 13, kind: 'cost', description: 'Practical ways to reduce cost.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'web-services.d.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'batch-jobs.d.ts')] }),
  generalPage({ route: 'operations/guardrails-overview', title: 'Guardrails Overview', order: 14, kind: 'governance', description: 'Overview of organization-wide guardrails.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'GuardrailsPage', 'GuardrailsPage.tsx'), join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts')] }),
  generalPage({ route: 'operations/deployment-guardrails', title: 'Deployment Guardrails', order: 15, kind: 'governance', description: 'Restrict stages, regions, and commands.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts')] }),
  generalPage({ route: 'operations/security-and-data-protection-guardrails', title: 'Security and Data Protection Guardrails', order: 16, kind: 'governance', description: 'Require secure defaults.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts')] }),
  generalPage({ route: 'operations/resource-limit-guardrails', title: 'Resource Limit Guardrails', order: 17, kind: 'governance', description: 'Limit function and container sizes.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts')] }),
  generalPage({ route: 'operations/database-guardrails', title: 'Database Guardrails', order: 18, kind: 'governance', description: 'Restrict database engines and shapes.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', 'guardrails.d.ts')] }),

  // 8. CI/CD & GitOps
  generalPage({ route: 'ci-cd-and-gitops/overview', title: 'CI/CD and GitOps Overview', order: 1, kind: 'cicd', description: 'Overview of deployment automation options.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'GitOps', 'GitOps.tsx'), join(stacktapeRoot, 'src', 'commands', 'codebuild-deploy', 'index.ts')] }),
  generalPage({ route: 'ci-cd-and-gitops/gitops-with-console', title: 'GitOps with Console', order: 2, kind: 'cicd', description: 'Auto-deploy on push and PR workflows.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'GitOps', 'GitOps.tsx'), join(consoleRoot, 'server', 'lambdas', 'github-app', 'index.ts')] }),
  generalPage({ route: 'ci-cd-and-gitops/build-runners', title: 'Build Runners', order: 3, kind: 'cicd', description: 'EC2 runners vs CodeBuild.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'ProjectOverview', 'RunnerConfigModal.tsx'), join(consoleRoot, 'src', 'pages', 'DeployNewProject', 'Git', 'DeployNewProjectFromGit.tsx')] }),
  generalPage({ route: 'ci-cd-and-gitops/self-hosted-github-actions-runners', title: 'Self-Hosted GitHub Actions Runners', order: 4, kind: 'cicd', description: 'Use Stacktape-managed GitHub Actions runners.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'ProjectOverview', 'GithubRunnerConfigModal.tsx'), join(consoleRoot, 'server', 'lambdas', 'github-app', 'github-actions-handler.ts')] }),
  generalPage({ route: 'ci-cd-and-gitops/custom-ci-cd', title: 'Custom CI/CD', order: 5, kind: 'cicd', description: 'Integrate Stacktape into your own pipelines.', sourceFiles: [...cliDeploy, ...cliLogin] }),
  generalPage({ route: 'ci-cd-and-gitops/stacks-per-git-branch-pattern', title: 'Stacks per Git Branch Pattern', order: 6, kind: 'cicd', description: 'Map branches and PRs to stages.', sourceFiles: [join(consoleRoot, 'server', 'lambdas', 'github-app', 'utils.ts'), join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'GitOps', 'GitOps.tsx')] }),

  // 9. Local development
  generalPage({ route: 'local-development/dev-mode-overview', title: 'Dev Mode Overview', order: 1, kind: 'local-development', description: 'How stacktape dev works.', sourceFiles: [join(docsRoot, '_curated-docs', 'getting-started', 'dev-mode.mdx'), ...cliDev] }),
  generalPage({ route: 'local-development/local-databases', title: 'Local Databases', order: 2, kind: 'local-development', description: 'Which databases can run locally and how.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'dev', 'local-resources', 'dynamodb.ts'), join(stacktapeRoot, 'types', 'stacktape-config', 'relational-databases.d.ts')] }),
  generalPage({ route: 'local-development/debugging-lambda-functions', title: 'Debugging Lambda Functions', order: 3, kind: 'local-development', description: 'Debug Lambda functions in dev mode.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'debug-logs', 'index.ts'), ...cliDev] }),
  generalPage({ route: 'local-development/debugging-containers', title: 'Debugging Containers', order: 4, kind: 'local-development', description: 'Debug container workloads and sessions.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'debug-container-exec', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'container-session', 'index.ts')] }),
  generalPage({ route: 'local-development/debug-commands-reference', title: 'Debug Commands Reference', order: 5, kind: 'local-development', description: 'Reference for debugging commands.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'debug-logs', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'debug-metrics', 'index.ts')] }),

  // 10. Using with AI (separate top-level section)
  // The MCP server isn't in production yet — pages are generated as placeholders that we revisit when it ships.
  generalPage({ route: 'using-with-ai/overview', title: 'Using Stacktape with AI', order: 1, kind: 'ai', description: 'Overview of AI-related workflows: agent mode, MCP server, AI config generation, coding-assistant integrations.', sourceFiles: [join(docsRoot, '_curated-docs', 'getting-started', 'using-with-ai.mdx'), join(stacktapeRoot, 'src', 'commands', 'mcp', 'index.ts')] }),
  generalPage({ route: 'using-with-ai/agent-mode-in-dev', title: 'Agent Mode in Dev', order: 2, kind: 'ai', description: 'Use dev mode with agents and coding assistants.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'dev', 'agent-server.ts'), join(docsRoot, '_curated-docs', 'getting-started', 'using-with-ai.mdx')] }),
  generalPage({ route: 'using-with-ai/config-generation-from-repository', title: 'AI Config Generation', order: 3, kind: 'ai', description: 'Generate a Stacktape config from a repository, in the Console.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ConfigEditorPage', 'ConfigEditorPage.tsx')] }),
  generalPage({ route: 'using-with-ai/ai-coding-assistant-integrations', title: 'AI Coding Assistant Integrations', order: 4, kind: 'ai', description: 'Use Stacktape with Claude Code, Cursor, Windsurf, and other coding assistants.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'mcp-add', 'index.ts'), join(consoleRoot, 'server', 'lambdas', 'mcp-server', 'index.ts')] }),
  generalPage({ route: 'using-with-ai/mcp-server-setup', title: 'MCP Server Setup', order: 5, kind: 'ai', description: 'Set up the Stacktape MCP server. Currently in preview — not yet production-ready.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', 'mcp', 'index.ts'), join(stacktapeRoot, 'src', 'commands', 'mcp-add', 'index.ts')], notes: ['MCP server is not yet working end-to-end. This page should be a setup guide tagged as "preview" with a clear "this is in active development" callout at the top. Avoid promising functionality that does not yet ship.'] }),

  // 11. Stacktape Console
  generalPage({ route: 'stacktape-console/console-overview', title: 'Console Overview', order: 1, kind: 'console', template: 'console', description: 'Overview of Stacktape Console.', sourceFiles: consoleNav }),
  generalPage({ route: 'stacktape-console/connecting-your-aws-account', title: 'Connecting Your AWS Account', order: 2, kind: 'console', template: 'console', description: 'Connect AWS accounts to Stacktape.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'AwsAccountsPage', 'AwsAccountsPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/organizations-projects-and-stages', title: 'Organizations, Projects, and Stages', order: 3, kind: 'console', template: 'console', description: 'How the Console organizes work.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'ProjectsList.tsx'), join(consoleRoot, 'src', 'pages', 'ProjectsPage', 'ProjectOverview', 'ProjectOverview.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/visual-config-editor', title: 'Visual Config Editor', order: 4, kind: 'console', template: 'console', description: 'Use the Monaco-based config editor.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ConfigEditorPage', 'ConfigEditorPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/api-keys', title: 'API Keys', order: 5, kind: 'console', template: 'console', description: 'Manage Stacktape API keys.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'ApiKeysPage', 'ApiKeysPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/team-and-access-control', title: 'Team and Access Control', order: 6, kind: 'console', template: 'console', description: 'Invite users and manage permissions.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'UsersPage', 'UsersPage.tsx'), join(consoleRoot, 'src', 'Explanations.tsx')] }),
  generalPage({ route: 'stacktape-console/billing-and-subscription', title: 'Billing and Subscription', order: 7, kind: 'console', template: 'console', description: 'Subscription plans, billing, and invoices.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'BillingPage', 'BillingPage.tsx'), join(consoleRoot, 'src', 'pages', 'SubscriptionPlansPage', 'SubscriptionPlansPage.tsx')] }),

  // 12. Recipes
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

  // 13. Reference (with troubleshooting moved here)
  generalPage({ route: 'reference/configuration-schema', title: 'Configuration Schema', order: 1, kind: 'reference', description: 'Reference entry point for Stacktape config schema.', sourceFiles: [join(stacktapeRoot, '@generated', 'schemas', 'config-schema.json'), join(stacktapeRoot, 'types', 'stacktape-config', '_root.d.ts')] }),
  generalPage({ route: 'reference/directives-reference', title: 'Directives Reference', order: 2, kind: 'reference', description: 'Reference for built-in directives.', sourceFiles: [join(stacktapeRoot, 'src', 'domain', 'config-manager', 'built-in-directives.ts')] }),
  generalPage({ route: 'reference/referenceable-parameters', title: 'Referenceable Parameters', order: 3, kind: 'reference', description: 'Parameters available via $ResourceParam.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '__helpers.d.ts')] }),
  generalPage({ route: 'reference/environment-variables-injected-by-connectto', title: 'Environment Variables Injected by connectTo', order: 4, kind: 'reference', description: 'Environment variables created by connectTo.', sourceFiles: [join(stacktapeRoot, 'types', 'stacktape-config', '__helpers.d.ts')] }),
  generalPage({ route: 'reference/aws-permissions-needed', title: 'AWS Permissions Needed', order: 5, kind: 'reference', description: 'What AWS permissions Stacktape requires.', sourceFiles: [join(consoleRoot, 'src', 'pages', 'AwsAccountsPage', 'AwsAccountsPage.tsx'), join(stacktapeRoot, 'README.md')] }),
  generalPage({ route: 'reference/troubleshooting/common-deployment-errors', title: 'Common Deployment Errors', order: 6, kind: 'troubleshooting', description: 'Diagnose common deployment failures.', sourceFiles: [...cliDeploy, join(stacktapeRoot, 'src', 'config', 'error-messages.ts')] }),
  generalPage({ route: 'reference/troubleshooting/cloudformation-stack-states', title: 'CloudFormation Stack States', order: 7, kind: 'troubleshooting', description: 'Understand CloudFormation stack states.', sourceFiles: [join(docsRoot, '_curated-docs', 'troubleshooting', 'cloudformation-stack-states.mdx')] }),
  generalPage({ route: 'reference/troubleshooting/dev-mode-issues', title: 'Dev Mode Issues', order: 8, kind: 'troubleshooting', description: 'Debug dev mode issues.', sourceFiles: cliDev }),
  generalPage({ route: 'reference/troubleshooting/permission-errors', title: 'Permission Errors', order: 9, kind: 'troubleshooting', description: 'Diagnose permission and AWS auth problems.', sourceFiles: [join(stacktapeRoot, 'src', 'commands', '_utils', 'permission-guards.ts'), ...cliLogin] }),
  generalPage({ route: 'reference/troubleshooting/getting-help', title: 'Getting Help', order: 10, kind: 'troubleshooting', description: 'Where to get help.', sourceFiles: [join(stacktapeRoot, 'README.md'), join(consoleRoot, 'src', 'components', 'Header', 'HelpMenu.tsx')] }),

  // CLI reference (auto-generated). Top-level section at /cli/* — separate from the conceptual
  // Reference section so the long per-command list doesn't dilute the lookup-only Reference group.
  ...cliCommands.map((command, index) => cliPage({ command, order: index + 100 }))
];

// Monotonic global order: makes virtual subcategory nodes sortable in the sidebar without per-page
// renumbering above. The agent and the placeholder generator pick up these final orders.
export const pageDefinitions: PageDefinition[] = rawPageDefinitions.map((page, idx) => ({
  ...page,
  order: idx + 1
}));

export const getPageByRoute = (route: string) => pageDefinitions.find((page) => page.route === route || page.outputPath.endsWith(`${route}.mdx`));
