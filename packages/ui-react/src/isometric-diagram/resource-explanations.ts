/**
 * The words the diagram's tooltips and side panel say about each kind of resource.
 *
 * The reader is a backend or full-stack developer with little infrastructure experience, who hovers a node to learn
 * what it is and what it means for their app. So each entry is:
 *
 * - `summary`: one sentence saying what the thing does, in words that developer would use. No AWS product name where a
 *   plain one exists ("the CDN", "a bucket"); the product is already in `name`.
 * - `facts`: at most three more sentences, one idea each, shown one per line. Keep the ones that change what the
 *   developer expects or does: how it is called, whether the caller waits, how it scales, what is billed, a limit.
 *
 * Write whole short sentences, and "the caller waits for the answer" instead of "synchronous". Do not join two ideas
 * with a dash or a semicolon. Facts about networking were checked against the CLI's resource resolvers (`apps/cli`).
 *
 * The module is self-contained and presentation-free, so another diagram (the website's) can use it.
 */

export type DiagramExplanation = {
  /** Friendly display name, e.g. "HTTP API Gateway" for resource type http-api-gateway. */
  name: string;
  /** One sentence: what this is. */
  summary: string;
  /** Up to three short sentences, one idea each, shown one per line. */
  facts: string[];
};

const SSR_WEB_EXPLANATION = (framework: string): DiagramExplanation => ({
  name: `${framework} Web`,
  summary: `Your ${framework} app, with no servers to manage.`,
  facts: [
    'Static files are served from a CDN location near each user.',
    'Pages and API routes run in functions, only when they are requested.',
    'It scales with traffic and costs nothing while idle.'
  ]
});

export const RESOURCE_EXPLANATIONS: Record<string, DiagramExplanation> = {
  function: {
    name: 'Lambda Function',
    summary: 'Runs your code when something calls it.',
    facts: [
      'Nothing runs while it is idle, and AWS adds copies as calls arrive.',
      'A caller such as an API waits for the result. A queue or an event does not.',
      'You pay per call and for the time each call runs.'
    ]
  },
  'web-service': {
    name: 'Web Service',
    summary: 'Your app in containers, reachable from the internet.',
    facts: [
      'Requests come in through its own gateway or load balancer.',
      'It runs all the time, and the number of containers can follow the load.',
      'Use it for an API or a web app that must always be up.'
    ]
  },
  'private-service': {
    name: 'Private Service',
    summary: 'Your app in containers, reachable only from inside the stack.',
    facts: [
      'Other services call it at a private address. The internet cannot reach it.',
      'Use it for an internal API that only your own services call.'
    ]
  },
  'worker-service': {
    name: 'Worker Service',
    summary: 'A container that works in the background all the time.',
    facts: ['Nothing can call it. Your code fetches its own work, for example from a queue or a stream.']
  },
  'multi-container-workload': {
    name: 'Multi-Container Workload',
    summary: 'Several containers that run and scale as one unit.',
    facts: [
      'They share one network address and start and stop together.',
      'Any of them can take requests from a load balancer or an API gateway.'
    ]
  },
  'batch-job': {
    name: 'Batch Job',
    summary: 'A container that starts for one job and stops when the job is done.',
    facts: [
      'A job waits in a queue until AWS has a machine for it, and can retry if it fails.',
      'You pay only while a job runs.',
      'Use it for work that is too long or too heavy for a function.'
    ]
  },
  'deployment-script': {
    name: 'Deployment Script',
    summary: 'A script that runs each time the stack deploys.',
    facts: [
      'Typical uses are database migrations, seed data and smoke tests.',
      'It runs as a function, and a failure can stop the deployment.'
    ]
  },
  bastion: {
    name: 'Bastion Host',
    summary: 'A small server that lets you into the private network.',
    facts: [
      'From your laptop you open a tunnel through it, for example to a private database.',
      'Nothing else has to be opened to the internet.'
    ]
  },
  'relational-database': {
    name: 'Relational Database (RDS)',
    summary: 'A SQL database that AWS runs for you.',
    facts: [
      'AWS takes the backups and applies updates.',
      'Resources that connect to it get its address and credentials as environment variables.'
    ]
  },
  'dynamo-db-table': {
    name: 'DynamoDB Table',
    summary: 'A key-value database with no servers to manage.',
    facts: [
      'Reads and writes stay fast at any size, and you pay per request.',
      'Your code calls it over HTTPS. AWS permissions decide who may.',
      'It can send every change to a function, so your code can react to it.'
    ]
  },
  redis: {
    name: 'Redis (ElastiCache)',
    summary: 'An in-memory store for data you need very fast.',
    facts: [
      'Typical uses are caching, sessions, rate limits, queues and pub/sub.',
      'It runs inside your VPC, and clients keep a connection open to it.'
    ]
  },
  'upstash-redis': {
    name: 'Upstash Redis',
    summary: 'A Redis database that Upstash hosts and bills per request.',
    facts: [
      'It runs outside your AWS account and is reached over the internet.',
      'It suits apps made of functions, where an always-on cache would sit idle.'
    ]
  },
  'mongo-db-atlas-cluster': {
    name: 'MongoDB Atlas Cluster',
    summary: 'A MongoDB database that MongoDB Atlas hosts.',
    facts: [
      'It runs in Atlas, outside your AWS account.',
      'Its accessibility mode decides who can connect: the internet, listed IP addresses, or only your VPC.'
    ]
  },
  'dsql-database': {
    name: 'Aurora DSQL',
    summary: 'A PostgreSQL-compatible database with no servers to size.',
    facts: [
      'It grows with the load, and you pay for what you use.',
      'Its address is public. Each connection signs in with a short-lived AWS token, not a password.'
    ]
  },
  'open-search-domain': {
    name: 'OpenSearch Domain',
    summary: 'A search engine that AWS runs for you.',
    facts: ['Use it for text search, log analysis and vector search.', 'Your code queries it over HTTPS.']
  },
  bucket: {
    name: 'S3 Bucket',
    summary: 'Storage for files of any size.',
    facts: [
      'Files are read and written over HTTPS, and there is no size limit to plan for.',
      'It can start a function when a file is uploaded or deleted.'
    ]
  },
  'hosting-bucket': {
    name: 'Hosting Bucket',
    summary: 'A static website, served from locations near your users.',
    facts: ['The files sit in a bucket, and a CDN delivers them worldwide.']
  },
  'efs-filesystem': {
    name: 'EFS Filesystem',
    summary: 'A shared disk that your containers can mount.',
    facts: ['Several services can read and write the same files at once.', 'It grows and shrinks with what you store.']
  },
  'websocket-api-gateway': {
    name: 'WebSocket API Gateway',
    summary: 'Keeps a two-way connection open with each client.',
    facts: [
      'Either side can send a message at any time.',
      'Each message goes to the function for its route, and your code can message any connected client.',
      'You pay per message and per minute of connection.'
    ]
  },
  'appsync-api': {
    name: 'AppSync GraphQL API',
    summary: 'A GraphQL endpoint that AWS runs for you.',
    facts: [
      'Each field of a query is answered by the function attached to it.',
      'Every request is checked first, by AWS permissions, an API key or a user pool.'
    ]
  },
  'http-api-gateway': {
    name: 'HTTP API Gateway',
    summary: 'Receives HTTPS requests from the internet and passes them to your code.',
    facts: [
      'It picks the target by path and method, waits for the answer and returns it.',
      'The target is a function, or a container service that it reaches over a private link.',
      'There is nothing to run or scale. You pay per request.'
    ]
  },
  'application-load-balancer': {
    name: 'Application Load Balancer',
    summary: 'Spreads HTTP requests across the running copies of a service.',
    facts: [
      'It can route by path, host and headers, and it skips copies that are unhealthy.',
      'It runs all the time at an hourly price, which pays off under steady traffic.'
    ]
  },
  'network-load-balancer': {
    name: 'Network Load Balancer',
    summary: 'Spreads TCP connections across the running copies of a service.',
    facts: [
      'It does not look inside the traffic, so any protocol works.',
      'Use it for protocols other than HTTP, very high traffic or a fixed IP address.'
    ]
  },
  'sqs-queue': {
    name: 'SQS Queue',
    summary: 'Holds messages until something processes them.',
    facts: [
      'The sender does not wait. The consumer takes messages in batches, at its own pace.',
      'A message that fails goes back to the queue and is tried again.',
      'A traffic spike becomes a backlog, not an outage.'
    ]
  },
  'sns-topic': {
    name: 'SNS Topic',
    summary: 'Sends each message to everything subscribed to it.',
    facts: [
      'Subscribers can be functions, queues, email addresses or webhooks.',
      'The sender does not wait, and does not know who is subscribed.'
    ]
  },
  'event-bus': {
    name: 'EventBridge Bus',
    summary: 'Routes events to whatever is interested in them.',
    facts: [
      'A service publishes what happened. Rules decide which targets receive it.',
      'The publisher does not wait, and does not know the targets.'
    ]
  },
  'kinesis-stream': {
    name: 'Kinesis Stream',
    summary: 'Takes in a large flow of records in real time.',
    facts: [
      'Consumers read the records in order, in batches, each from its own position.',
      'Records are kept for a while, so a consumer can read old ones again.'
    ]
  },
  'kafka-cluster': {
    name: 'Kafka Cluster (MSK Serverless)',
    summary: 'A Kafka cluster that AWS runs for you.',
    facts: [
      'Producers add records to topics. Consumers read them in order, at their own pace.',
      'It runs inside your VPC, and clients sign in with AWS permissions.',
      'A function can read a topic directly, and capacity follows the load.'
    ]
  },
  'email-sender': {
    name: 'Email Sender (SES)',
    summary: 'Sends email from your domain.',
    facts: [
      'Resources that connect to it get permission to send.',
      'Bounces and complaints are published to a topic.',
      'By default it lives in a shared stack, so several stacks can send from the same domain.'
    ]
  },
  'state-machine': {
    name: 'Step Functions State Machine',
    summary: 'A workflow that runs several steps in order.',
    facts: [
      'Steps can branch, wait, retry and handle errors.',
      'AWS keeps the state between steps, so a long workflow needs no server.'
    ]
  },
  'user-auth-pool': {
    name: 'Cognito User Pool',
    summary: 'Sign-up and sign-in for your users.',
    facts: [
      'It handles registration, login, multi-factor codes and sign-in with other providers.',
      'It issues tokens that your services check on each request.'
    ]
  },
  'web-app-firewall': {
    name: 'Web App Firewall (WAF)',
    summary: 'Blocks harmful requests before they reach your app.',
    facts: ['It stops common attacks, unwanted bots and IP ranges you list.']
  },
  'edge-lambda-function': {
    name: 'Edge Function',
    summary: 'A function that runs at the CDN, close to your users.',
    facts: ['It can change a request or a response on the way: redirect, check a sign-in, split traffic.']
  },
  'custom-resource-definition': {
    name: 'Custom Resource',
    summary: 'A function that manages something CloudFormation cannot manage itself.',
    facts: [
      'CloudFormation calls it during a deployment to create, update or delete that thing.',
      'It never runs for user traffic.'
    ]
  },
  'aws-cdk-construct': {
    name: 'AWS CDK Construct',
    summary: 'Infrastructure you define yourself with the AWS CDK.',
    facts: [
      'Stacktape deploys its resources as part of this stack.',
      'The diagram cannot see inside it. It shows a connection where another resource uses its outputs.'
    ]
  },
  convex: {
    name: 'Convex (self-hosted)',
    summary: 'A Convex backend that runs in your own AWS account.',
    facts: [
      'It is one container behind its own load balancer.',
      'Its data is in a Postgres database and its files are in buckets.',
      'Your app and the Convex dashboard reach it over HTTPS.'
    ]
  },
  'agentcore-runtime': {
    name: 'AgentCore Runtime',
    summary: 'Runs an AI agent from your container image.',
    facts: [
      'Each session gets its own isolated environment, and AWS adds more as sessions arrive.',
      'It joins the VPC only when it connects to something that lives there, such as a database.'
    ]
  },
  'agentcore-memory': {
    name: 'AgentCore Memory',
    summary: 'Stores what an agent remembers between conversations.',
    facts: [
      'It keeps recent conversation events.',
      'With memory strategies it also keeps facts, preferences and summaries for later.'
    ]
  },
  'agentcore-gateway': {
    name: 'AgentCore Gateway',
    summary: 'Offers your functions to agents as tools.',
    facts: [
      'An agent calls it over the Model Context Protocol (MCP).',
      'It checks the caller, runs the function behind the tool and returns the result.'
    ]
  },
  'agentcore-browser': {
    name: 'AgentCore Browser',
    summary: 'A web browser that an agent can drive.',
    facts: [
      'The agent can open pages, click and fill in forms in an isolated session.',
      'Sessions can be recorded to a bucket.'
    ]
  },
  'agentcore-code-interpreter': {
    name: 'AgentCore Code Interpreter',
    summary: 'A sandbox where an agent runs the code it writes.',
    facts: ['The code runs in isolation, and the output goes back to the agent.']
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
    summary: 'Serves your content from locations near your users.',
    facts: [
      'A response it has cached is served at once.',
      'Anything else is fetched from your origin, and can be cached on the way back.',
      'Users wait less, and your services see less traffic.'
    ]
  },
  'nat-gateway': {
    name: 'NAT Gateway',
    summary: 'Lets private resources call the internet, and never the other way round.',
    facts: [
      'Resources in private subnets send their outgoing traffic through it.',
      'It has a fixed public IP address, which a third party can put on an allow list.'
    ]
  },
  schedule: {
    name: 'Schedule (EventBridge)',
    summary: 'Starts its target at set times.',
    facts: ['The times are a fixed rate or a cron expression.', 'Nothing waits for the run to finish.']
  },
  user: {
    name: 'Users',
    summary: 'People who use your application over the internet.',
    facts: []
  }
};

export const ZONE_EXPLANATIONS: Record<string, DiagramExplanation> = {
  vpc: {
    name: 'VPC',
    summary: 'Your own private network inside AWS.',
    facts: [
      'Stacktape creates one per stack, spread over 3 availability zones.',
      'Resources inside talk to each other at private addresses, off the public internet.',
      'Security groups decide which resource may connect to which.'
    ]
  },
  'subnet-public': {
    name: 'Public Subnets',
    summary: 'The part of the VPC that the internet can route to.',
    facts: [
      'A resource here can have a public IP address.',
      'That alone exposes nothing. Its security group still decides what may connect.'
    ]
  },
  'subnet-private': {
    name: 'Private Subnets',
    summary: 'The part of the VPC that the internet cannot reach.',
    facts: ['A resource here has no public IP address.', 'Its outgoing traffic leaves through the NAT gateway.']
  },
  'zone-edge': {
    name: 'Edge',
    summary: 'AWS locations around the world, close to your users.',
    facts: [
      'They answer nearby users and keep copies of your content.',
      'Most requests never travel to your own infrastructure.'
    ]
  }
};

/** Role groups (see `grouping.ts`), by their members' resource type. */
export const GROUP_EXPLANATION: Record<string, DiagramExplanation> = {
  function: {
    name: 'Function group',
    summary: 'Functions that play the same role, drawn as one stack.',
    facts: [
      'The same things start them, and they sit in the same place on the network.',
      'Each one is still its own function, with its own code, permissions and scaling.',
      'Expand the stack to see them one by one.'
    ]
  },
  'batch-job': {
    name: 'Batch job group',
    summary: 'Batch jobs that play the same role, drawn as one stack.',
    facts: [
      'The same things start them, and they sit in the same place on the network.',
      'Each one is still its own job, with its own container and resources.',
      'Expand the stack to see them one by one.'
    ]
  }
};

/** What each kind of connector means, shown under the two names in a connector's tooltip. */
export const EDGE_SEMANTIC_LABELS: Record<string, string> = {
  request: 'Request · the caller waits for the answer',
  event: 'Event · the sender does not wait',
  dependency: 'Uses it (connectTo)',
  egress: 'Outgoing traffic to the internet',
  security: 'Security check (firewall or sign-in)'
};
