/**
 * Single source of truth for the plain-English explanations shown in diagram tooltips.
 *
 * Written for users WITHOUT infrastructure experience: every entry explains what the
 * component is, how it communicates (sync/async, push/pull), and how it scales or is
 * billed when that helps understanding. Facts about networking behavior were verified
 * against the CLI synthesizer (apps/cli resource resolvers).
 *
 * This module is deliberately self-contained and presentation-free so it can later be
 * consumed by the website's diagram, or swapped for a richer source (docs, config
 * schema, AI-generated per-stack texts) without touching the renderer.
 */

export type DiagramExplanation = {
  /** Friendly display name, e.g. "HTTP API Gateway" for resource type http-api-gateway. */
  name: string;
  /** One sentence: what this is. */
  summary: string;
  /** 2-4 sentences: behavior, communication style, scaling/billing where relevant. */
  details: string;
};

const SSR_WEB_EXPLANATION = (framework: string): DiagramExplanation => ({
  name: `${framework} Web`,
  summary: `Your ${framework} app deployed serverlessly with a global CDN.`,
  details:
    'Static assets are served from CloudFront edge locations near your users; dynamic pages and API routes run in Lambda functions on demand. Scales automatically with traffic and costs nothing while idle.'
});

export const RESOURCE_EXPLANATIONS: Record<string, DiagramExplanation> = {
  function: {
    name: 'Lambda Function',
    summary: 'A serverless function that runs your code on demand.',
    details:
      'AWS runs it only when something invokes it and scales it automatically — from zero to thousands of parallel executions. Invocations are synchronous (the caller waits for the response, e.g. API requests) or asynchronous (fire-and-forget, e.g. queue and event triggers) depending on the trigger. You pay per invocation and per millisecond of runtime.'
  },
  'web-service': {
    name: 'Web Service',
    summary: 'A publicly reachable containerized service.',
    details:
      'Your code runs in containers that Stacktape builds, deploys and monitors. Traffic reaches it synchronously through its own dedicated gateway or load balancer, and the number of running instances scales automatically with load. Best for APIs and web apps that need to be always on.'
  },
  'private-service': {
    name: 'Private Service',
    summary: 'A containerized service reachable only from inside your stack.',
    details:
      'Other services call it synchronously through private DNS (Service Connect) or an internal load balancer — the internet cannot reach it. Ideal for internal APIs that only your own services consume.'
  },
  'worker-service': {
    name: 'Worker Service',
    summary: 'A container that continuously processes background work.',
    details:
      'It has no inbound endpoint at all. It pulls work itself from inside your application code — typically by polling queues or consuming streams — which makes all of its communication asynchronous.'
  },
  'multi-container-workload': {
    name: 'Multi-Container Workload',
    summary: 'A group of containers deployed and scaled together as one unit.',
    details:
      'The containers share networking and lifecycle. Individual containers can attach to load balancers or API gateways to receive synchronous traffic.'
  },
  'batch-job': {
    name: 'Batch Job',
    summary: 'A container that starts on demand, processes one job, then shuts down.',
    details:
      'Jobs queue in AWS Batch and get compute allocated when scheduled; failed jobs can retry automatically. You pay only for the duration of each run — ideal for heavy processing that would outgrow a function.'
  },
  'deployment-script': {
    name: 'Deployment Script',
    summary: 'A script that runs during stack deployment.',
    details:
      'Typically used for database migrations, seeding or smoke tests. It runs as a Lambda function during the deploy and can block the deployment if it fails.'
  },
  bastion: {
    name: 'Bastion Host',
    summary: 'A small server used as a secure entry point into your VPC.',
    details:
      'Lets you tunnel into the private network — for example to reach a database from your laptop — without exposing anything else to the internet.'
  },
  'relational-database': {
    name: 'Relational Database (RDS)',
    summary: 'A managed SQL database — PostgreSQL, MySQL and other engines.',
    details:
      'AWS handles backups, patching and failover; Aurora engines replicate across availability zones. Clients talk to it synchronously over standard SQL connections — Stacktape injects the connection details into connected services as environment variables.'
  },
  'dynamo-db-table': {
    name: 'DynamoDB Table',
    summary: 'A serverless NoSQL key-value table.',
    details:
      'Single-digit-millisecond reads and writes at virtually any scale, billed per request, with no servers or connections to manage — access is synchronous HTTPS calls authorized by IAM. It can also stream every data change to consumers for event-driven processing.'
  },
  'redis-cluster': {
    name: 'Redis Cluster (ElastiCache)',
    summary: 'An in-memory cache for sub-millisecond data access.',
    details:
      'Used for caching, sessions, rate limiting and pub/sub. Runs on dedicated instances inside your VPC; clients keep an open connection and query it synchronously.'
  },
  'upstash-redis': {
    name: 'Upstash Redis',
    summary: 'A serverless Redis database billed per request.',
    details:
      'Hosted by Upstash outside your AWS account and reached over the internet (HTTPS or Redis protocol). A good fit for Lambda-heavy apps where an always-on cache would mostly sit idle.'
  },
  'mongo-db-atlas-cluster': {
    name: 'MongoDB Atlas Cluster',
    summary: 'A managed MongoDB database hosted by MongoDB Atlas.',
    details:
      'Runs in Atlas’s own cloud account and connects to your VPC through private network peering, so database traffic never crosses the public internet.'
  },
  'open-search-domain': {
    name: 'OpenSearch Domain',
    summary: 'A managed search and analytics engine.',
    details: 'Powers full-text search, log analytics and vector search. Clients query it synchronously over HTTPS.'
  },
  bucket: {
    name: 'S3 Bucket',
    summary: 'Object storage for files of any size.',
    details:
      'Stores and serves files over HTTPS with practically unlimited capacity and extreme durability. It can emit events when objects are uploaded or deleted, which makes it a common start of asynchronous processing pipelines.'
  },
  'hosting-bucket': {
    name: 'Hosting Bucket',
    summary: 'Static website hosting with a global CDN.',
    details:
      'Your files are stored in S3 and served worldwide through CloudFront edge locations, so users download them from a location near them.'
  },
  'efs-filesystem': {
    name: 'EFS Filesystem',
    summary: 'A shared network drive your containers can mount.',
    details:
      'Multiple services can read and write the same files simultaneously; capacity grows and shrinks automatically.'
  },
  'http-api-gateway': {
    name: 'HTTP API Gateway',
    summary: 'The front door for HTTPS requests from the internet.',
    details:
      'It receives each request, routes it by path and method, and synchronously forwards it to the target — a Lambda function directly, or a container service inside the VPC through a VPC Link. Fully managed, scales automatically, billed per request.'
  },
  'application-load-balancer': {
    name: 'Application Load Balancer',
    summary: 'Distributes HTTP(S) traffic across running instances.',
    details:
      'Works at the HTTP layer — it understands paths, hosts and headers — and synchronously spreads each request across all healthy instances of the target. Always on with an hourly price, which makes it economical at sustained traffic.'
  },
  'network-load-balancer': {
    name: 'Network Load Balancer',
    summary: 'Distributes raw TCP/TLS connections at very high throughput.',
    details:
      'Works at the connection level without inspecting HTTP — suitable for non-HTTP protocols, extreme throughput and static IP requirements.'
  },
  'sqs-queue': {
    name: 'SQS Queue',
    summary: 'A message queue that decouples producers from consumers.',
    details:
      'Producers drop messages and move on; consumers pull them in batches at their own pace — fully asynchronous. If processing fails, messages return to the queue and are retried, so traffic spikes become a backlog instead of an outage.'
  },
  'sns-topic': {
    name: 'SNS Topic',
    summary: 'A publish/subscribe topic for fan-out notifications.',
    details:
      'Each published message is pushed asynchronously to every subscriber — functions, queues, emails, webhooks. Publishers never wait for, or even know about, the subscribers.'
  },
  'event-bus': {
    name: 'EventBridge Bus',
    summary: 'An event router connecting services through rules.',
    details:
      'Services publish events describing what happened; rules match them by pattern and deliver them asynchronously to interested targets. Publishers stay fully decoupled from consumers.'
  },
  'kinesis-stream': {
    name: 'Kinesis Stream',
    summary: 'A real-time data stream for high-volume event ingestion.',
    details:
      'Producers append records; consumers read them asynchronously in order and in batches, each tracking its own position. Records are retained so consumers can replay history.'
  },
  'state-machine': {
    name: 'Step Functions State Machine',
    summary: 'A managed workflow that orchestrates multiple steps.',
    details:
      'Defines a sequence or branching graph of steps with automatic retries, error handling and waits. AWS stores the state between steps, so long-running workflows survive restarts without any server.'
  },
  'user-auth-pool': {
    name: 'Cognito User Pool',
    summary: 'Managed user sign-up, sign-in and authentication.',
    details:
      'Handles registration, login, MFA and social identity providers, and issues JWT tokens that your services verify on each request.'
  },
  'web-app-firewall': {
    name: 'Web App Firewall (WAF)',
    summary: 'Filters malicious traffic before it reaches your app.',
    details:
      'Blocks common attacks (SQL injection, XSS), bad bots and unwanted IP ranges using managed and custom rules.'
  },
  'edge-lambda-function': {
    name: 'Edge Function',
    summary: 'A function running at CDN edge locations.',
    details:
      'Runs close to your users to rewrite requests and responses — redirects, auth checks, A/B routing — with minimal latency.'
  },
  'nextjs-web': SSR_WEB_EXPLANATION('Next.js'),
  'astro-web': SSR_WEB_EXPLANATION('Astro'),
  'nuxt-web': SSR_WEB_EXPLANATION('Nuxt'),
  'sveltekit-web': SSR_WEB_EXPLANATION('SvelteKit'),
  'solidstart-web': SSR_WEB_EXPLANATION('SolidStart'),
  'tanstack-web': SSR_WEB_EXPLANATION('TanStack'),
  'remix-web': SSR_WEB_EXPLANATION('Remix'),
  cloudfront: {
    name: 'CloudFront CDN',
    summary: 'A content delivery network that serves content from locations near your users.',
    details:
      'Requests hit the nearest of hundreds of edge locations worldwide; cached responses are served instantly and everything else is fetched from your origin and can be cached on the way back. Cuts both latency and load on your services.'
  },
  'nat-gateway': {
    name: 'NAT Gateway',
    summary: 'A one-way door to the internet for private workloads.',
    details:
      'Resources in private subnets send outbound traffic (API calls, updates) through it while remaining unreachable from outside. Each NAT gateway has a static public IP, which third parties can allow-list.'
  },
  schedule: {
    name: 'Schedule (EventBridge)',
    summary: 'A time-based trigger.',
    details:
      'Starts its target on a fixed rate or cron expression — serverless cron. Invocations are asynchronous; nothing waits for the run to finish.'
  },
  user: {
    name: 'Users',
    summary: 'People using your application over the internet.',
    details: ''
  }
};

export const ZONE_EXPLANATIONS: Record<string, DiagramExplanation> = {
  vpc: {
    name: 'VPC',
    summary: 'Your own private network inside AWS.',
    details:
      'Stacktape creates one per stack, with subnets spread across 3 availability zones for resilience. Resources inside communicate over private IPs without touching the public internet, and security groups control exactly which resource may talk to which.'
  },
  'subnet-public': {
    name: 'Public Subnets',
    summary: 'The internet-routable part of the VPC.',
    details:
      'Resources here can have public IP addresses and receive traffic from the internet. That alone does not expose them: each resource’s security group still decides what inbound traffic is allowed.'
  },
  'subnet-private': {
    name: 'Private Subnets',
    summary: 'The isolated part of the VPC.',
    details:
      'Workloads here have no public IPs and cannot be reached from the internet at all. Their outbound traffic leaves through the NAT gateway.'
  },
  'zone-edge': {
    name: 'Edge',
    summary: 'Globally distributed delivery close to your users.',
    details:
      'CloudFront edge locations around the world terminate user connections nearby and cache your content, so most requests never travel to your origin infrastructure.'
  }
};

/** Friendly label for each edge semantic, shown as the tooltip subtitle on pipes. */
export const EDGE_SEMANTIC_LABELS: Record<string, string> = {
  request: 'Synchronous request flow',
  event: 'Asynchronous event delivery',
  dependency: 'Connection & permissions (connectTo)',
  egress: 'Outbound internet traffic'
};
